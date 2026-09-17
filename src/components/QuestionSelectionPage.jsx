import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { collection, doc, getDoc, updateDoc, onSnapshot, query, where, getDocs } from 'firebase/firestore';
import LoadingOverlay from './LoadingOverlay';
import PopupMessage from './PopupMessage';
import { Code } from 'lucide-react';
import { clearAllLocalDrafts } from '../utils/drafts';
import { getNow, syncClock } from '../utils/timeSync';

const QuestionSelectionPage = () => {
  const [loading, setLoading] = useState(true);

  const [questions, setQuestions] = useState({ c: [], cpp: [] });
  const [selectedPhase, setSelectedPhase] = useState('c');
  const [popup, setPopup] = useState(null);
  
  const navigate = useNavigate();
  const userId = localStorage.getItem('debugEventUserId');

  useEffect(() => {
    if (!userId) {
      navigate('/');
      return;
    }

    syncClock();

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
            updateDoc(doc(db, 'users', userId), { isFinished: true, selectedQuestionId: null }).catch(() => {});
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
      if (eventSnap.exists()) {
        const evData = eventSnap.data();
        if (evData.status !== 'active') {
          navigate('/waiting');
          return;
        }
        if (evData.endTime) {
          const end = new Date(evData.endTime).getTime();
          if (!isNaN(end) && end > 0 && end - getNow() <= 0) {
            isTimeExpired = true;
            updateDoc(doc(db, 'users', userId), { isFinished: true, selectedQuestionId: null }).catch(() => {});
            navigate('/timer-finished');
            return;
          }
        }
      }

      // Check User's existing selection and assigned questions
      const userSnap = await getDoc(doc(db, 'users', userId));
      let completedQs = [];
      let assignedQuestions = null;
      let userDocData = null;

      if (userSnap.exists()) {
        userDocData = userSnap.data();
        if (userDocData.selectedQuestionId) {
          navigate(`/editor/${userDocData.selectedQuestionId}`);
          return;
        }
        completedQs = userDocData.completedQuestions || [];
        assignedQuestions = userDocData.assignedQuestions || null;
      }

      // Fetch all questions from pool
      const qSnap = await getDocs(collection(db, 'questions'));
      const phaseMap = { easy: 'c', medium: 'cpp', hard: 'cpp', c: 'c', cpp: 'cpp' };
      const allPool = { c: [], cpp: [] };
      
      qSnap.forEach(docSnap => {
        const data = docSnap.data();
        const p = phaseMap[data.phase] || data.phase || 'c';
        if (allPool[p]) {
          allPool[p].push({ id: docSnap.id, ...data, phase: p });
        }
      });

      // Deterministic Random Assignment: assign 1 C question and 1 C++ question (2 questions total per student)
      let currentAssigned = assignedQuestions ? { ...assignedQuestions } : {};
      let needsSave = false;

      // Assign random C question if not yet assigned
      if (!currentAssigned.c && allPool.c.length > 0) {
        const randomC = allPool.c[Math.floor(Math.random() * allPool.c.length)];
        currentAssigned.c = randomC.id;
        needsSave = true;
      }

      // Assign random C++ question if not yet assigned
      if (!currentAssigned.cpp && allPool.cpp.length > 0) {
        const randomCpp = allPool.cpp[Math.floor(Math.random() * allPool.cpp.length)];
        currentAssigned.cpp = randomCpp.id;
        needsSave = true;
      }

      if (needsSave && userSnap.exists()) {
        const assignedIds = [currentAssigned.c, currentAssigned.cpp].filter(Boolean);
        await updateDoc(doc(db, 'users', userId), {
          assignedQuestions: currentAssigned,
          assignedQuestionIds: assignedIds
        }).catch(err => console.error("Error saving assigned questions:", err));
      }

      // Prepare assigned questions for display
      const qData = { c: [], cpp: [] };
      if (currentAssigned.c) {
        const foundC = allPool.c.find(q => q.id === currentAssigned.c);
        if (foundC) {
          qData.c.push({ ...foundC, isCompleted: completedQs.includes(foundC.id) });
        }
      }
      if (currentAssigned.cpp) {
        const foundCpp = allPool.cpp.find(q => q.id === currentAssigned.cpp);
        if (foundCpp) {
          qData.cpp.push({ ...foundCpp, isCompleted: completedQs.includes(foundCpp.id) });
        }
      }

      const totalAssignedCount = (qData.c.length > 0 ? 1 : 0) + (qData.cpp.length > 0 ? 1 : 0);
      const isAllAssignedDone = totalAssignedCount > 0 && 
        (qData.c.length === 0 || qData.c.every(q => q.isCompleted)) &&
        (qData.cpp.length === 0 || qData.cpp.every(q => q.isCompleted));

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
        // User has completed all their assigned questions (both rounds)
        await updateDoc(doc(db, 'users', userId), { isFinished: true });
        navigate('/all-completed');
        return;
      }

      setQuestions(qData);
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
      message: "Are you sure you want to select this question? You CANNOT change it later!",
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

  const isPhaseUnlocked = (phase) => {
    if (phase === 'c') return true;
    if (phase === 'cpp') {
      return questions.c.some(q => q.isCompleted) || questions.c.length === 0;
    }
    return false;
  };

  if (loading) return <LoadingOverlay isLoading={true} />;

  return (
    <>
    {popup && <PopupMessage message={popup.message} type={popup.type} onClose={() => setPopup(null)} onConfirm={popup.onConfirm} />}
    <div style={{ minHeight: '100vh', background: 'transparent', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      
      <div style={{ width: '100%', maxWidth: '1000px' }}>
          <h1 className="gradient-title" style={{ textAlign: 'center', marginBottom: '2rem', fontSize: '2.5rem' }}>SELECT YOUR MISSION</h1>
          
          <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '2rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            {[
              { id: 'c', label: 'ROUND 1: C LANGUAGE' },
              { id: 'cpp', label: 'ROUND 2: C++ LANGUAGE' }
            ].map(({ id: phase, label }) => {
              const unlocked = isPhaseUnlocked(phase);
              return (
              <button 
                key={phase}
                onClick={() => {
                  if (!unlocked) {
                    setPopup({ message: `🔒 Round 2 Locked! Complete a mission in Round 1 (C Language) first to unlock Round 2.`, type: "warning" });
                    return;
                  }
                  setSelectedPhase(phase);
                }}
                style={{
                  padding: '1.2rem 2.8rem',
                  background: selectedPhase === phase ? 'rgba(255, 0, 60, 0.2)' : unlocked ? 'rgba(22, 22, 30, 0.85)' : 'rgba(15, 15, 20, 0.4)',
                  border: `2px solid ${selectedPhase === phase ? '#ff003c' : unlocked ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255,255,255,0.08)'}`,
                  color: selectedPhase === phase ? '#ffffff' : unlocked ? 'var(--text-primary)' : 'var(--text-muted)',
                  borderRadius: 'var(--radius-md)',
                  fontFamily: 'var(--font-heading)',
                  fontSize: '1.15rem',
                  textTransform: 'uppercase',
                  letterSpacing: '1.5px',
                  boxShadow: selectedPhase === phase ? '0 0 25px rgba(255, 0, 60, 0.5)' : 'none',
                  transition: 'all 0.3s ease',
                  cursor: unlocked ? 'pointer' : 'not-allowed',
                  opacity: unlocked ? 1 : 0.6
                }}
              >
                {!unlocked && <span style={{ marginRight: '8px' }}>🔒</span>}
                {label}
              </button>
              );
            })}
          </div>

          {selectedPhase && (
            <div className="glass-panel" style={{ padding: '2rem', animation: 'slideUpFade 0.4s ease forwards' }}>
              <h2 style={{ color: 'var(--accent-cyan)', marginBottom: '1.5rem', textTransform: 'uppercase' }}>
                {selectedPhase === 'c' ? 'ROUND 1: C MISSIONS' : 'ROUND 2: C++ MISSIONS'}
              </h2>
              
              {questions[selectedPhase].length === 0 ? (
                <p style={{ color: 'var(--text-secondary)' }}>No missions available in this sector.</p>
              ) : (
                <div style={{ display: 'grid', gap: '1rem' }}>
                  {questions[selectedPhase].map(q => (
                    <div key={q.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.5rem', border: '1px solid var(--border-subtle)', background: 'var(--bg-deep-navy)', borderRadius: 'var(--radius-sm)', opacity: q.isCompleted ? 0.6 : 1, transition: 'opacity 0.3s' }}>
                      <div>
                        <h3 style={{ color: 'var(--text-primary)', marginBottom: '0.5rem', fontFamily: 'var(--font-heading)', textDecoration: q.isCompleted ? 'line-through' : 'none' }}>{q.title}</h3>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', maxWidth: '600px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{q.description}</p>
                        <span style={{ display: 'inline-block', marginTop: '0.5rem', fontSize: '0.8rem', color: q.isCompleted ? 'var(--text-secondary)' : 'var(--accent-magenta)', border: `1px solid ${q.isCompleted ? 'var(--text-secondary)' : 'var(--accent-magenta)'}`, padding: '2px 8px', borderRadius: '12px' }}>{q.points} POINTS</span>
                      </div>
                      <button 
                        onClick={() => !q.isCompleted && handleSelectQuestion(q.id)} 
                        className={q.isCompleted ? "btn-secondary" : "btn-primary"} 
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: q.isCompleted ? 'not-allowed' : 'pointer' }}
                        disabled={q.isCompleted}
                      >
                        {q.isCompleted ? <span style={{ color: 'var(--text-secondary)' }}>COMPLETED</span> : <><Code size={18} /> CODE NOW</>}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
    </div>
    </>
  );
};

export default QuestionSelectionPage;
