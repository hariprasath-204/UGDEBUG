import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { collection, doc, getDoc, updateDoc, onSnapshot, getDocs } from 'firebase/firestore';
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
        const userSnap = await getDoc(doc(db, 'users', userId));
        if (!userSnap.exists()) return;
        const uData = userSnap.data();
        const completedQs = uData.completedQuestions || [];
        const assignedIds = uData.assignedQuestionIds || (Array.isArray(uData.assignedQuestions?.cpp) ? uData.assignedQuestions.cpp : []);
        
        let additionalScore = 0;
        let newCompleted = [...completedQs];
        let newSubmissions = { ...(uData.submissions || {}) };
        let newFinalCode = uData.finalCode || '';
        let additionalCleared = 0;
        let additionalTotal = 0;

        for (const qId of assignedIds) {
          if (!newCompleted.includes(qId)) {
            let draftCode = localStorage.getItem(`codathan_draft_${userId}_${qId}`);
            if (!draftCode || draftCode === '// Loading...' || draftCode === '// Mission not found.') {
              if (uData.drafts && uData.drafts[qId]) {
                draftCode = uData.drafts[qId];
              } else if (uData.selectedQuestionId === qId && uData.currentCode) {
                draftCode = uData.currentCode;
              }
            }

            if (draftCode && draftCode.trim().length > 0) {
              try {
                const qSnap = await getDoc(doc(db, 'questions', qId));
                if (qSnap.exists()) {
                  const targetQ = { id: qSnap.id, ...qSnap.data() };
                  const v = targetQ.variants?.cpp || targetQ.variants?.c || {};
                  const initialCode = v.initialCode || targetQ.initialCode || '';
                  
                  if (draftCode.trim() !== initialCode.trim() && draftCode.trim().length > 10) {
                    const rawErrorStr = String(v.errorLines || targetQ.errorLines || '');
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
                      targetLines: (v.correctCode || '').split('\n').length,
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

        const updateObj = {
          isFinished: true,
          selectedQuestionId: null,
          currentCode: '',
          clearedErrors: 0,
          totalErrors: 0,
          remainingErrors: 0
        };

        if (additionalScore > 0 || newCompleted.length > completedQs.length) {
          updateObj.score = increment(additionalScore);
          updateObj.completedQuestions = newCompleted;
          updateObj.submissions = newSubmissions;
          updateObj.finalCode = newFinalCode;
          updateObj.cumulativeClearedErrors = (uData.cumulativeClearedErrors || 0) + additionalCleared;
          updateObj.cumulativeTotalErrors = (uData.cumulativeTotalErrors || 0) + additionalTotal;
        }

        await updateDoc(doc(db, 'users', userId), updateObj);
      } catch (e) {
        console.error("Error in handleAutoSubmitDraftsAndFinish:", e);
        await updateDoc(doc(db, 'users', userId), { isFinished: true, selectedQuestionId: null }).catch(() => {});
      }
    };

    const unsubEvent = onSnapshot(doc(db, 'settings', 'event'), async (eventSnap) => {
      if (eventSnap.exists()) {
        const data = eventSnap.data();
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
    });

    const unsubUser = onSnapshot(doc(db, 'users', userId), (userSnap) => {
      if (userSnap.exists()) {
        const userData = userSnap.data();
        if (userData && userData.selectedQuestionId) {
          navigate(`/editor/${userData.selectedQuestionId}`);
        }
      }
    });

    const checkState = async () => {
      await syncClock();
      // Check Event Status
      const eventSnap = await getDoc(doc(db, 'settings', 'event'));
      let isTimeExpired = false;
      let targetQuestionCount = 2;

      if (eventSnap.exists()) {
        const evData = eventSnap.data();
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
      const userSnap = await getDoc(doc(db, 'users', userId));
      let completedQs = [];
      let assignedQuestionIds = [];
      let userDocData = null;
      let currentCategory = 'Easy';

      if (userSnap.exists()) {
        userDocData = userSnap.data();
        currentCategory = (userDocData.category || 'Easy').trim();
        setUserCategory(currentCategory);

        if (userDocData.selectedQuestionId) {
          navigate(`/editor/${userDocData.selectedQuestionId}`);
          return;
        }
        completedQs = userDocData.completedQuestions || [];
        
        // Handle both new array format and legacy object format
        if (Array.isArray(userDocData.assignedQuestionIds) && userDocData.assignedQuestionIds.length > 0) {
          assignedQuestionIds = userDocData.assignedQuestionIds;
        } else if (userDocData.assignedQuestions) {
          if (Array.isArray(userDocData.assignedQuestions.cpp) && userDocData.assignedQuestions.cpp.length > 0) {
            assignedQuestionIds = userDocData.assignedQuestions.cpp;
          } else if (typeof userDocData.assignedQuestions === 'object') {
            assignedQuestionIds = Object.values(userDocData.assignedQuestions).filter(Boolean);
          }
        }
      }

      // Fallback check from localStorage if Firestore field was not yet populated
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
      const qSnap = await getDocs(collection(db, 'questions'));
      const allQuestions = [];
      qSnap.forEach(docSnap => {
        allQuestions.push({ id: docSnap.id, ...docSnap.data(), phase: 'cpp' });
      });

      // Filter questions matching student's category strictly (e.g. "Hard" -> only "Hard" questions)
      const categoryQuestions = allQuestions.filter(q => (q.category || 'Easy').toLowerCase() === currentCategory.toLowerCase());
      const validPool = categoryQuestions.length > 0 ? categoryQuestions : allQuestions;

      // Deterministic Random Assignment: assign targetQuestionCount C++ questions from the student's category
      let finalAssignedIds = [...assignedQuestionIds].filter(id => validPool.some(q => q.id === id));
      let needsSave = false;

      // If user has fewer than targetQuestionCount assigned questions, assign random distinct ones from their category pool
      if (finalAssignedIds.length < targetQuestionCount && validPool.length > 0) {
        const remainingPool = validPool.filter(q => !finalAssignedIds.includes(q.id));
        const shuffled = [...remainingPool].sort(() => 0.5 - Math.random());
        const needed = Math.min(targetQuestionCount - finalAssignedIds.length, shuffled.length);
        const newlyAssigned = shuffled.slice(0, needed).map(q => q.id);
        finalAssignedIds = [...finalAssignedIds, ...newlyAssigned];
        needsSave = true;
      } else if (finalAssignedIds.length > targetQuestionCount) {
        // If admin lowered the question count, adjust to the target count
        finalAssignedIds = finalAssignedIds.slice(0, targetQuestionCount);
        needsSave = true;
      }

      // Persist permanently both in Firestore and in browser localStorage
      localStorage.setItem(`codathan_assigned_questions_${userId}`, JSON.stringify(finalAssignedIds));

      if (needsSave && userSnap.exists()) {
        await updateDoc(doc(db, 'users', userId), {
          assignedQuestionIds: finalAssignedIds,
          assignedQuestions: { cpp: finalAssignedIds }
        }).catch(err => console.error("Error saving assigned questions:", err));
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

      if (userSnap.exists() && userDocData?.isFinished) {
        if (isAllAssignedDone) {
          navigate('/all-completed');
          return;
        } else if (isTimeExpired) {
          navigate('/timer-finished');
          return;
        } else {
          // Auto-heal stale isFinished flag
          await updateDoc(doc(db, 'users', userId), { isFinished: false }).catch(() => {});
        }
      }

      if (isAllAssignedDone) {
        await updateDoc(doc(db, 'users', userId), { isFinished: true });
        navigate('/all-completed');
        return;
      }

      setQuestions(displayQuestions);
      setLoading(false);
    };

    checkState();

    return () => {
      if (unsubEvent) unsubEvent();
      if (unsubUser) unsubUser();
    };
  }, [navigate, userId]);

  const handleSelectQuestion = (questionId) => {
    setPopup({
      message: "Are you sure you want to select this mission? You CANNOT change it until submitted!",
      type: "warning",
      onConfirm: async () => {
        setLoading(true);
        try {
          await updateDoc(doc(db, 'users', userId), {
            selectedQuestionId: questionId,
            currentCode: '',
            clearedErrors: 0,
            totalErrors: 0,
            remainingErrors: 0,
            currentLinesCount: 0,
            targetLinesCount: 0
          });
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

  const categoryColor = userCategory === 'Hard' ? '#FF003C' : userCategory === 'Medium' ? '#F59E0B' : '#10B981';
  const categoryBg = userCategory === 'Hard' ? 'rgba(255, 0, 60, 0.15)' : userCategory === 'Medium' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.15)';

  return (
    <>
    {popup && <PopupMessage message={popup.message} type={popup.type} onClose={() => setPopup(null)} onConfirm={popup.onConfirm} />}
    <div style={{ width: '100%', minHeight: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', padding: '1.5rem 0 5rem 0', boxSizing: 'border-box' }}>
      
      <div style={{ width: '100%', maxWidth: '1050px', margin: '0 auto' }}>
          
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 16px', background: categoryBg, border: `1px solid ${categoryColor}`, borderRadius: '20px', color: categoryColor, fontSize: '0.85rem', letterSpacing: '2px', fontFamily: 'var(--font-heading)', textTransform: 'uppercase', marginBottom: '1rem', fontWeight: 'bold' }}>
              <Terminal size={16} /> C++ DEBUGGING ROUND • {totalCount} MISSIONS • {userCategory.toUpperCase()} CATEGORY
            </div>
            <h1 className="gradient-title" style={{ fontSize: '2.8rem', letterSpacing: '2px', marginBottom: '0.5rem' }}>SELECT YOUR MISSION</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1rem' }}>
              Solve all {totalCount} debugging missions ({userCategory} category) in C++ to complete your challenge.
            </p>
          </div>

          {/* Progress Overview Bar */}
          <div className="glass-panel" style={{ padding: '1.2rem 2rem', marginBottom: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1.5rem', flexWrap: 'wrap', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
            <div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>CHALLENGE PROGRESS</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: 'var(--accent-cyan)', fontFamily: 'var(--font-heading)' }}>
                {completedCount} OF {totalCount} MISSIONS SOLVED
              </div>
            </div>
            <div style={{ flex: '1', minWidth: '220px', maxWidth: '400px' }}>
              <div style={{ width: '100%', height: '10px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '6px', overflow: 'hidden' }}>
                <div style={{ width: `${progressPercent}%`, height: '100%', background: 'linear-gradient(90deg, #ff003c, var(--accent-cyan))', transition: 'width 0.5s ease', boxShadow: '0 0 10px rgba(0, 242, 254, 0.5)' }}></div>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: completedCount === totalCount ? '#10B981' : '#ffffff' }}>
                {progressPercent}%
              </span>
            </div>
          </div>

          {/* Missions List */}
          <div className="glass-panel" style={{ padding: '2rem', animation: 'slideUpFade 0.4s ease forwards' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
              <h2 style={{ color: 'var(--accent-cyan)', margin: 0, textTransform: 'uppercase', fontSize: '1.3rem', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Code size={22} /> ASSIGNED C++ MISSIONS
              </h2>
              <span style={{ fontSize: '0.8rem', fontWeight: 'bold', padding: '4px 12px', borderRadius: '12px', background: categoryBg, border: `1px solid ${categoryColor}`, color: categoryColor, textTransform: 'uppercase' }}>
                Category: {userCategory}
              </span>
            </div>
            
            {questions.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '2rem' }}>No missions assigned or available in this category. Please contact the event administrator.</p>
            ) : (
              <div style={{ display: 'grid', gap: '1.2rem' }}>
                {questions.map((q, idx) => {
                  const qCat = q.category || userCategory;
                  const qCatColor = qCat === 'Hard' ? '#FF003C' : qCat === 'Medium' ? '#F59E0B' : '#10B981';
                  const qCatBg = qCat === 'Hard' ? 'rgba(255, 0, 60, 0.15)' : qCat === 'Medium' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.15)';

                  return (
                  <div 
                    key={q.id} 
                    style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center', 
                      padding: '1.6rem 2rem', 
                      border: q.isCompleted ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid var(--border-subtle)', 
                      background: q.isCompleted ? 'rgba(16, 185, 129, 0.04)' : 'var(--bg-deep-navy)', 
                      borderRadius: 'var(--radius-sm)', 
                      opacity: q.isCompleted ? 0.75 : 1, 
                      transition: 'all 0.3s ease',
                      gap: '1.5rem'
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '0.4rem', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 'bold', padding: '2px 8px', borderRadius: '4px', background: 'rgba(255, 0, 60, 0.15)', color: '#ff003c', border: '1px solid rgba(255, 0, 60, 0.3)', letterSpacing: '1px' }}>
                          MISSION {idx + 1}
                        </span>
                        <span style={{ fontSize: '0.75rem', fontWeight: 'bold', padding: '2px 8px', borderRadius: '4px', background: 'rgba(0, 242, 254, 0.15)', color: 'var(--accent-cyan)', border: '1px solid rgba(0, 242, 254, 0.3)' }}>
                          C++
                        </span>
                        <span style={{ fontSize: '0.75rem', fontWeight: 'bold', padding: '2px 8px', borderRadius: '4px', background: qCatBg, color: qCatColor, border: `1px solid ${qCatColor}`, textTransform: 'uppercase' }}>
                          {qCat}
                        </span>
                        {q.isCompleted && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: '#10B981', fontWeight: 'bold' }}>
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
                          <span style={{ color: '#10B981', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 'bold' }}>
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
