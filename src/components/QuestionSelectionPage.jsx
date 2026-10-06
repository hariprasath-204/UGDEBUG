import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import LoadingOverlay from './LoadingOverlay';
import PopupMessage from './PopupMessage';
import { Code, CheckCircle2, Terminal } from 'lucide-react';
import { clearAllLocalDrafts } from '../utils/drafts';
import { getNow, syncClock } from '../utils/timeSync';

const QuestionSelectionPage = () => {
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState([]);
  const [userCategory, setUserCategory] = useState('Easy');
  const [requiredCount, setRequiredCount] = useState(2);
  const [popup, setPopup] = useState(null);
  
  const navigate = useNavigate();
  const userId = localStorage.getItem('debugEventUserId');

  useEffect(() => {
    if (!userId) {
      navigate('/');
      return;
    }

    syncClock();

    const handleAutoSubmitDraftsAndFinish = async () => {
      try {
        const { data: uData } = await supabase
          .from('users')
          .select('*')
          .eq('id', userId)
          .single();

        if (!uData) return;

        const completedQs = uData.completed_questions || uData.completedQuestions || [];
        const assignedIds = uData.assigned_question_ids || (Array.isArray(uData.assigned_questions?.cpp) ? uData.assigned_questions.cpp : []);
        
        let additionalScore = 0;
        let newCompleted = [...completedQs];
        let newSubmissions = { ...(uData.submissions || {}) };
        let newFinalCode = uData.final_code || uData.finalCode || '';
        let additionalCleared = 0;
        let additionalTotal = 0;

        for (const qId of assignedIds) {
          if (!newCompleted.includes(qId)) {
            let draftCode = localStorage.getItem(`codathan_draft_${userId}_${qId}`);
            if (!draftCode || draftCode === '// Loading...' || draftCode === '// Mission not found.') {
              if (uData.drafts && uData.drafts[qId]) {
                draftCode = uData.drafts[qId];
              } else if (uData.selected_question_id === qId && uData.current_code) {
                draftCode = uData.current_code;
              }
            }

            if (draftCode && draftCode.trim().length > 0) {
              try {
                const { data: targetQ } = await supabase
                  .from('questions')
                  .select('*')
                  .eq('id', qId)
                  .single();

                if (targetQ) {
                  const v = targetQ.variants?.cpp || targetQ.variants?.c || {};
                  const initialCode = v.initialCode || targetQ.initial_code || targetQ.initialCode || '';
                  
                  if (draftCode.trim() !== initialCode.trim() && draftCode.trim().length > 10) {
                    const rawErrorStr = String(v.errorLines || targetQ.error_lines || targetQ.errorLines || '');
                    const groups = rawErrorStr
                      .split(',')
                      .map(g => g.split('|').map(n => parseInt(n.trim())).filter(n => !isNaN(n)))
                      .filter(g => g.length > 0);
                    
                    const total = Math.max(1, groups.length || (v.errorLinesArray?.length || 1));
                    const ptsPerErr = +(100 / total).toFixed(2);
                    const initialLines = initialCode.split('\n');
                    const userLines = draftCode.split('\n');

                    let cleared = 0;
                    groups.forEach(group => {
                      const isGroupCleared = group.some(lineNum => {
                        const idx = lineNum - 1;
                        if (initialLines[idx] !== undefined && userLines[idx] !== undefined) {
                          return initialLines[idx].trim() !== userLines[idx].trim();
                        }
                        return userLines.length !== initialLines.length;
                      });
                      if (isGroupCleared) cleared++;
                    });

                    if (cleared === 0) cleared = 1;
                    const qScore = Math.min(100, Math.round(cleared * ptsPerErr));

                    additionalScore += qScore;
                    newCompleted.push(qId);
                    additionalCleared += cleared;
                    additionalTotal += total;
                    newFinalCode += `\n\n// ====== MISSION (AUTO-SAVED): ${targetQ.title || qId} ======\n` + draftCode;
                    
                    newSubmissions[qId] = {
                      score: qScore,
                      clearedErrors: cleared,
                      totalErrors: total,
                      pointsPerError: ptsPerErr,
                      pointFormula: `${cleared}/${total} errors × ${ptsPerErr} pts = ${qScore} pts`,
                      codeLines: userLines.length,
                      targetLines: (v.correctCode || targetQ.correct_code || '').split('\n').length,
                      phase: targetQ.phase || 'cpp',
                      title: targetQ.title || `Question ${qId}`,
                      submittedCode: draftCode,
                      submittedAt: new Date().toISOString(),
                      isAutoSubmitted: true
                    };
                  }
                }
              } catch (e) {
                console.error("Error evaluating unsubmitted draft:", e);
              }
            }
          }
        }

        const currentScore = uData.score || 0;
        const updateObj = {
          is_finished: true,
          selected_question_id: null,
          current_code: '',
          score: currentScore + additionalScore,
          completed_questions: newCompleted,
          submissions: newSubmissions,
          final_code: newFinalCode,
          cumulative_cleared_errors: (uData.cumulative_cleared_errors || 0) + additionalCleared,
          cumulative_total_errors: (uData.cumulative_total_errors || 0) + additionalTotal
        };

        await supabase.from('users').update(updateObj).eq('id', userId);
      } catch (e) {
        console.error("Error in handleAutoSubmitDraftsAndFinish:", e);
        await supabase.from('users').update({ is_finished: true, selected_question_id: null }).eq('id', userId);
      }
    };

    // 1. Realtime listener on settings (event status)
    const eventChannel = supabase
      .channel('selection:settings')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'settings', filter: 'id=eq.event' },
        async (payload) => {
          const data = payload.new?.data;
          if (data) {
            if (data.status === 'waiting') {
              clearAllLocalDrafts();
              navigate('/waiting');
            } else if (data.status === 'ended' || data.status === 'stopped') {
              navigate('/thank-you');
            } else if (data.status === 'active' && data.endTime) {
              await syncClock();
              const end = new Date(data.endTime).getTime();
              if (!isNaN(end) && end > 0 && end - getNow() <= 0) {
                await handleAutoSubmitDraftsAndFinish();
                navigate('/timer-finished');
              }
            }
          }
        }
      )
      .subscribe();

    // 2. Realtime listener on user
    const userChannel = supabase
      .channel(`selection:user:${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'users', filter: `id=eq.${userId}` },
        (payload) => {
          const userData = payload.new;
          if (userData && (userData.selected_question_id || userData.selectedQuestionId)) {
            const qId = userData.selected_question_id || userData.selectedQuestionId;
            navigate(`/editor/${qId}`);
          }
        }
      )
      .subscribe();

    const checkState = async () => {
      await syncClock();
      
      // Check Event Status
      const { data: eventRow } = await supabase
        .from('settings')
        .select('data')
        .eq('id', 'event')
        .single();

      let isTimeExpired = false;
      let targetQuestionCount = 2;

      if (eventRow?.data) {
        const evData = eventRow.data;
        if (evData.status !== 'active') {
          navigate('/waiting');
          return;
        }
        if (evData.questionsPerStudent !== undefined && !isNaN(parseInt(evData.questionsPerStudent))) {
          targetQuestionCount = parseInt(evData.questionsPerStudent, 10);
        }
        setRequiredCount(targetQuestionCount);

        if (evData.endTime) {
          const end = new Date(evData.endTime).getTime();
          if (!isNaN(end) && end > 0 && end - getNow() <= 0) {
            isTimeExpired = true;
            await handleAutoSubmitDraftsAndFinish();
            navigate('/timer-finished');
            return;
          }
        }
      }

      // Check User's existing selection and assigned questions
      const { data: userDocData } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      let completedQs = [];
      let assignedQuestionIds = [];
      let currentCategory = 'Easy';

      if (userDocData) {
        currentCategory = (userDocData.category || 'Easy').trim();
        setUserCategory(currentCategory);

        const selQ = userDocData.selected_question_id || userDocData.selectedQuestionId;
        if (selQ) {
          navigate(`/editor/${selQ}`);
          return;
        }
        completedQs = userDocData.completed_questions || userDocData.completedQuestions || [];
        
        if (Array.isArray(userDocData.assigned_question_ids) && userDocData.assigned_question_ids.length > 0) {
          assignedQuestionIds = userDocData.assigned_question_ids;
        } else if (Array.isArray(userDocData.assignedQuestionIds) && userDocData.assignedQuestionIds.length > 0) {
          assignedQuestionIds = userDocData.assignedQuestionIds;
        } else if (userDocData.assigned_questions?.cpp) {
          assignedQuestionIds = userDocData.assigned_questions.cpp;
        }
      }

      // Fallback check from localStorage if Supabase field was not yet populated
      if (assignedQuestionIds.length === 0) {
        try {
          const cachedAssigned = localStorage.getItem(`codathan_assigned_questions_${userId}`);
          if (cachedAssigned) {
            const parsed = JSON.parse(cachedAssigned);
            if (Array.isArray(parsed) && parsed.length > 0) {
              assignedQuestionIds = parsed;
            }
          }
        } catch (e) {}
      }

      // Fetch all questions from pool
      const { data: allQuestionsData } = await supabase
        .from('questions')
        .select('*');

      const allQuestions = (allQuestionsData || []).map(q => ({
        id: q.id,
        title: q.title,
        description: q.description,
        category: q.category,
        phase: q.phase || 'cpp',
        points: q.points || 100,
        expectedOutput: q.expected_output || q.expectedOutput,
        initialCode: q.initial_code || q.initialCode,
        correctCode: q.correct_code || q.correctCode,
        errorLines: q.error_lines || q.errorLines,
        variants: q.variants || {}
      }));

      // Filter questions matching student's category strictly (e.g. 'Easy')
      const targetCategory = (currentCategory || 'Easy').trim().toLowerCase();
      const categoryQuestions = allQuestions.filter(q => (q.category || 'Easy').trim().toLowerCase() === targetCategory);
      const validPool = categoryQuestions.length > 0 ? categoryQuestions : allQuestions;

      // Deduplicate previously assigned IDs and ensure they belong strictly to the student's category pool
      const validPoolIdSet = new Set(validPool.map(q => q.id));
      let finalAssignedIds = Array.from(new Set(assignedQuestionIds.filter(id => validPoolIdSet.has(id))));
      let needsSave = false;

      if (finalAssignedIds.length < targetQuestionCount && validPool.length > 0) {
        // Exclude all already assigned IDs to prevent ANY duplicates
        const remainingPool = validPool.filter(q => !finalAssignedIds.includes(q.id));
        
        // Fisher-Yates shuffle for true random distribution
        const shuffled = [...remainingPool];
        for (let i = shuffled.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }

        const needed = Math.min(targetQuestionCount - finalAssignedIds.length, shuffled.length);
        const newlyAssigned = shuffled.slice(0, needed).map(q => q.id);
        
        // Strictly unique list
        finalAssignedIds = Array.from(new Set([...finalAssignedIds, ...newlyAssigned]));
        needsSave = true;
      } else if (finalAssignedIds.length > targetQuestionCount) {
        finalAssignedIds = finalAssignedIds.slice(0, targetQuestionCount);
        needsSave = true;
      }

      // Persist permanently both in Supabase and in browser localStorage
      localStorage.setItem(`codathan_assigned_questions_${userId}`, JSON.stringify(finalAssignedIds));

      if (needsSave && userDocData) {
        await supabase.from('users').update({
          assigned_question_ids: finalAssignedIds,
          assigned_questions: { cpp: finalAssignedIds }
        }).eq('id', userId);
      }

      // Prepare assigned questions for display
      const displayQuestions = finalAssignedIds
        .map(id => allQuestions.find(q => q.id === id))
        .filter(Boolean)
        .map(q => ({
          ...q,
          isCompleted: completedQs.includes(q.id)
        }));

      const totalAssignedCount = displayQuestions.length;
      const isAllAssignedDone = totalAssignedCount > 0 && displayQuestions.every(q => q.isCompleted);

      if (userDocData && (userDocData.is_finished || userDocData.isFinished)) {
        if (isAllAssignedDone) {
          navigate('/all-completed');
          return;
        } else if (isTimeExpired) {
          navigate('/timer-finished');
          return;
        } else {
          // Auto-heal stale isFinished flag
          await supabase.from('users').update({ is_finished: false }).eq('id', userId);
        }
      }

      if (isAllAssignedDone) {
        await supabase.from('users').update({ is_finished: true }).eq('id', userId);
        navigate('/all-completed');
        return;
      }

      setQuestions(displayQuestions);
      setLoading(false);
    };

    checkState();

    return () => {
      supabase.removeChannel(eventChannel);
      supabase.removeChannel(userChannel);
    };
  }, [navigate, userId]);

  const handleSelectQuestion = (questionId) => {
    setPopup({
      message: "Are you sure you want to select this mission? You CANNOT change it until submitted!",
      type: "warning",
      onConfirm: async () => {
        setLoading(true);
        try {
          await supabase.from('users').update({
            selected_question_id: questionId,
            current_code: ''
          }).eq('id', userId);
          navigate(`/editor/${questionId}`);
        } catch (err) {
          console.error(err);
          setPopup({ message: "Failed to lock in question.", type: "error" });
          setLoading(false);
        }
      }
    });
  };

  if (loading) return <LoadingOverlay isLoading={true} />;

  const completedCount = questions.filter(q => q.isCompleted).length;
  const totalCount = questions.length || requiredCount;
  const progressPercent = Math.round((completedCount / totalCount) * 100);

  const categoryColor = userCategory === 'Hard' ? '#de0606' : userCategory === 'Medium' ? '#F59E0B' : '#007fd7';
  const categoryBg = userCategory === 'Hard' ? 'rgba(222, 6, 6, 0.15)' : userCategory === 'Medium' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(0, 127, 215, 0.15)';

  return (
    <>
    {popup && <PopupMessage message={popup.message} type={popup.type} onClose={() => setPopup(null)} onConfirm={popup.onConfirm} />}
    <div style={{ width: '100%', minHeight: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', padding: '1.5rem 0 5rem 0', boxSizing: 'border-box' }}>
      
      <div style={{ width: '100%', maxWidth: '1050px', margin: '0 auto' }}>
          
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 16px', background: 'rgba(222, 6, 6, 0.15)', border: '1px solid #de0606', borderRadius: '20px', color: '#de0606', fontSize: '0.85rem', letterSpacing: '2px', fontFamily: 'var(--font-heading)', textTransform: 'uppercase', marginBottom: '1rem', fontWeight: 'bold' }}>
              <Terminal size={16} /> C++ DEBUGGING ROUND • {totalCount} MISSIONS
            </div>
            <h1 className="gradient-title" style={{ fontSize: '2.8rem', letterSpacing: '2px', marginBottom: '0.5rem' }}>SELECT YOUR MISSION</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1rem' }}>
              Solve all {totalCount} debugging missions in C++ to complete your challenge.
            </p>
          </div>

          {/* Progress Overview Bar */}
          <div className="glass-panel" style={{ padding: '1.2rem 2rem', marginBottom: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1.5rem', flexWrap: 'wrap', border: '1px solid #3f3f3f' }}>
            <div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>CHALLENGE PROGRESS</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#007fd7', fontFamily: 'var(--font-heading)' }}>
                {completedCount} OF {totalCount} MISSIONS SOLVED
              </div>
            </div>
            <div style={{ flex: '1', minWidth: '220px', maxWidth: '400px' }}>
              <div style={{ width: '100%', height: '10px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '6px', overflow: 'hidden' }}>
                <div style={{ width: `${progressPercent}%`, height: '100%', background: 'linear-gradient(90deg, #de0606, #007fd7)', transition: 'width 0.5s ease', boxShadow: '0 0 10px rgba(0, 127, 215, 0.5)' }}></div>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: completedCount === totalCount ? '#007fd7' : '#ffffff' }}>
                {progressPercent}%
              </span>
            </div>
          </div>

          {/* Missions List */}
          <div className="glass-panel" style={{ padding: '2rem', animation: 'slideUpFade 0.4s ease forwards', border: '1px solid #3f3f3f' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
              <h2 style={{ color: '#007fd7', margin: 0, textTransform: 'uppercase', fontSize: '1.3rem', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Code size={22} /> ASSIGNED C++ MISSIONS
              </h2>
            </div>
            
            {questions.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '2rem' }}>No missions assigned yet. Please contact the event administrator.</p>
            ) : (
              <div style={{ display: 'grid', gap: '1.2rem' }}>
                {questions.map((q, idx) => {
                  return (
                  <div 
                    key={q.id} 
                    style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center', 
                      padding: '1.6rem 2rem', 
                      border: q.isCompleted ? '1px solid rgba(0, 127, 215, 0.3)' : '1px solid #3f3f3f', 
                      background: q.isCompleted ? 'rgba(0, 127, 215, 0.04)' : 'var(--bg-deep-navy)', 
                      borderRadius: 'var(--radius-sm)', 
                      opacity: q.isCompleted ? 0.75 : 1, 
                      transition: 'all 0.3s ease',
                      gap: '1.5rem'
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '0.4rem', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 'bold', padding: '2px 8px', borderRadius: '4px', background: 'rgba(222, 6, 6, 0.15)', color: '#de0606', border: '1px solid rgba(222, 6, 6, 0.4)', letterSpacing: '1px' }}>
                          MISSION {idx + 1}
                        </span>
                        <span style={{ fontSize: '0.75rem', fontWeight: 'bold', padding: '2px 8px', borderRadius: '4px', background: 'rgba(0, 127, 215, 0.15)', color: '#007fd7', border: '1px solid rgba(0, 127, 215, 0.4)' }}>
                          C++
                        </span>
                        {q.isCompleted && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: '#007fd7', fontWeight: 'bold' }}>
                            <CheckCircle2 size={14} /> SOLVED
                          </span>
                        )}
                      </div>
                      <h3 style={{ color: 'var(--text-primary)', marginBottom: '0.5rem', fontFamily: 'var(--font-heading)', fontSize: '1.15rem', textDecoration: q.isCompleted ? 'line-through' : 'none' }}>
                        {q.title}
                      </h3>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', maxWidth: '650px', lineHeight: '1.4' }}>
                        {q.description}
                      </p>
                      <div style={{ marginTop: '0.6rem' }}>
                        <span style={{ display: 'inline-block', fontSize: '0.8rem', color: q.isCompleted ? 'var(--text-secondary)' : 'var(--accent-magenta)', border: `1px solid ${q.isCompleted ? 'var(--text-secondary)' : 'var(--accent-magenta)'}`, padding: '2px 10px', borderRadius: '12px', fontWeight: 'bold' }}>
                          {q.points || 100} POINTS
                        </span>
                      </div>
                    </div>
                    
                    <div>
                      <button 
                        onClick={() => !q.isCompleted && handleSelectQuestion(q.id)} 
                        className={q.isCompleted ? "btn-secondary" : "btn-primary"} 
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '8px', 
                          cursor: q.isCompleted ? 'not-allowed' : 'pointer',
                          padding: '0.9rem 1.8rem',
                          minWidth: '150px',
                          justifyContent: 'center'
                        }}
                        disabled={q.isCompleted}
                      >
                        {q.isCompleted ? (
                          <span style={{ color: '#007fd7', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 'bold' }}>
                            <CheckCircle2 size={16} /> COMPLETED
                          </span>
                        ) : (
                          <><Code size={18} /> CODE NOW</>
                        )}
                      </button>
                    </div>
                  </div>
                  );
                })}
              </div>
            )}
          </div>
      </div>
    </div>
    </>
  );
};

export default QuestionSelectionPage;
