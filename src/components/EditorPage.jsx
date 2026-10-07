import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Editor from "@monaco-editor/react";
import axios from 'axios';
import { supabase } from '../supabase';
import LoadingOverlay from './LoadingOverlay';
import PopupMessage from './PopupMessage';
import { syncClock, getNow } from '../utils/timeSync';

const EditorPage = () => {
  const { questionId } = useParams();
  const navigate = useNavigate();
  
  const [question, setQuestion] = useState(null);
  const [code, setCode] = useState('// Loading...');
  const [output, setOutput] = useState('');
  const [isCompiling, setIsCompiling] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState(null);
  const [popup, setPopup] = useState(null);

  const userId = localStorage.getItem('debugEventUserId');
  const userName = localStorage.getItem('debugEventUserName');
  const activeLanguage = 'cpp';

  const [onlineCompilerKeys, setOnlineCompilerKeys] = useState([]);

  const cheatingRef = useRef({ tabSwitches: 0, copyPasteCount: 0 });
  const editorContainerRef = useRef(null);
  const codeRef = useRef(code);
  const questionRef = useRef(question);
  const handleSubmitRef = useRef(null);
  const errorStatsRef = useRef({ total: 0, cleared: 0, remaining: 0, currentLines: 0, targetLines: 0 });
  const ignoreCheatRef = useRef(false);
  const eventStartTimeRef = useRef(null);
  const questionStartTimeRef = useRef(null);
  const hasSubmittedRef = useRef(false);
  const timerIntervalRef = useRef(null);

  // Sync state to refs for auto-save and submission closures
  useEffect(() => {
    codeRef.current = code;
  }, [code]);

  useEffect(() => {
    questionRef.current = question;
  }, [question]);

  useEffect(() => {
    if (!userId) {
      navigate('/');
      return;
    }

    // 1. Fetch Question from Supabase
    const fetchQuestion = async () => {
      try {
        let targetQuestion = null;
        if (questionId && questionId !== 'default_question') {
          const { data: qData } = await supabase
            .from('questions')
            .select('*')
            .eq('id', questionId)
            .single();

          if (qData) {
            targetQuestion = {
              id: qData.id,
              title: qData.title,
              description: qData.description,
              category: qData.category,
              phase: qData.phase || 'cpp',
              points: qData.points || 10,
              expectedOutput: qData.expected_output || qData.expectedOutput,
              initialCode: qData.initial_code || qData.initialCode,
              correctCode: qData.correct_code || qData.correctCode,
              errorLines: qData.error_lines || qData.errorLines,
              variants: qData.variants || {}
            };
          }
        } else {
          const { data: qList } = await supabase
            .from('questions')
            .select('*')
            .limit(1);

          if (qList && qList.length > 0) {
            const qData = qList[0];
            targetQuestion = {
              id: qData.id,
              title: qData.title,
              description: qData.description,
              category: qData.category,
              phase: qData.phase || 'cpp',
              points: qData.points || 10,
              expectedOutput: qData.expected_output || qData.expectedOutput,
              initialCode: qData.initial_code || qData.initialCode,
              correctCode: qData.correct_code || qData.correctCode,
              errorLines: qData.error_lines || qData.errorLines,
              variants: qData.variants || {}
            };
          }
        }

        if (targetQuestion) {
          const pMap = { easy: 'c', medium: 'cpp', hard: 'cpp', c: 'c', cpp: 'cpp' };
          const phaseLang = pMap[targetQuestion.phase] || targetQuestion.phase || 'c';
          setQuestion(targetQuestion);
          questionRef.current = targetQuestion;

          // Record or retrieve start time for this question
          try {
            const { data: uData } = await supabase
              .from('users')
              .select('question_start_times')
              .eq('id', userId)
              .single();

            let qStartTime = null;
            if (uData) {
              const startTimes = uData.question_start_times || {};
              qStartTime = startTimes[targetQuestion.id];
              if (!qStartTime) {
                qStartTime = new Date().toISOString();
                startTimes[targetQuestion.id] = qStartTime;
                await supabase.from('users').update({ question_start_times: startTimes }).eq('id', userId);
              }
            }
            questionStartTimeRef.current = qStartTime || new Date().toISOString();
          } catch (e) {
            questionStartTimeRef.current = new Date().toISOString();
          }

          const initialCode = targetQuestion.variants?.[phaseLang]?.initialCode ||
                              targetQuestion.variants?.c?.initialCode ||
                              targetQuestion.variants?.cpp?.initialCode ||
                              targetQuestion.initialCode ||
                              '// No code provided.';

          // Check local storage draft first
          let localDraft = localStorage.getItem(`codathan_draft_${userId}_${targetQuestion.id}`);
          if (localDraft === '// Loading...' || localDraft === '// Mission not found.') localDraft = null;

          // Also check Supabase user draft
          let remoteDraft = null;
          try {
            const { data: uData } = await supabase
              .from('users')
              .select('drafts, current_code, is_finished')
              .eq('id', userId)
              .single();

            if (uData) {
              if (uData.drafts && uData.drafts[targetQuestion.id]) {
                remoteDraft = uData.drafts[targetQuestion.id];
              } else if (uData.current_code && uData.current_code !== initialCode && !uData.is_finished) {
                remoteDraft = uData.current_code;
              }
            }
          } catch (e) {
            console.warn("Could not load remote draft:", e);
          }
          if (remoteDraft === '// Loading...' || remoteDraft === '// Mission not found.') remoteDraft = null;

          setCode(localDraft || remoteDraft || initialCode);
        } else {
          setCode('// Mission not found.');
        }
      } catch (err) {
        console.error("Error fetching question:", err);
      }
    };
    fetchQuestion();

    // Synchronize client clock with server
    syncClock();

    // 2. Listen to Event Timer from Supabase
    const fetchInitialSettings = async () => {
      const { data: eventRow } = await supabase
        .from('settings')
        .select('data')
        .eq('id', 'event')
        .single();

      if (eventRow?.data) {
        const data = eventRow.data;
        if (data.status === 'active' && data.endTime) {
          if (data.startTime) eventStartTimeRef.current = data.startTime;
          const end = new Date(data.endTime).getTime();
          if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
          const updateTimer = () => {
            if (isNaN(end) || end <= 0) return;
            const distance = end - getNow();
            if (distance <= 0) {
              setTimeLeft("00:00");
              if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
              if (!hasSubmittedRef.current && handleSubmitRef.current) {
                handleSubmitRef.current(true, '/timer-finished');
              }
            } else {
              const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
              const seconds = Math.floor((distance % (1000 * 60)) / 1000);
              setTimeLeft(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
            }
          };
          updateTimer();
          timerIntervalRef.current = setInterval(updateTimer, 1000);
        }
      }

      // Fetch custom compiler keys
      const { data: compRow } = await supabase
        .from('settings')
        .select('data')
        .eq('id', 'onlinecompiler')
        .single();
      if (compRow?.data?.keys && Array.isArray(compRow.data.keys)) {
        setOnlineCompilerKeys(compRow.data.keys);
      }
    };
    fetchInitialSettings();

    // Realtime subscription on settings table
    const settingsChannel = supabase
      .channel('editor:settings')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'settings' },
        (payload) => {
          const row = payload.new;
          if (!row) return;
          const data = row.data || {};

          if (row.id === 'event') {
            if (data.status === 'ended' || data.status === 'stopped') {
              if (!hasSubmittedRef.current && handleSubmitRef.current) {
                handleSubmitRef.current(true, '/thank-you');
              }
            } else if (data.status === 'active' && data.endTime) {
              if (data.startTime) eventStartTimeRef.current = data.startTime;
              const end = new Date(data.endTime).getTime();
              if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
              const updateTimer = () => {
                if (isNaN(end) || end <= 0) return;
                const distance = end - getNow();
                if (distance <= 0) {
                  setTimeLeft("00:00");
                  if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
                  if (!hasSubmittedRef.current && handleSubmitRef.current) {
                    handleSubmitRef.current(true, '/timer-finished');
                  }
                } else {
                  const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
                  const seconds = Math.floor((distance % (1000 * 60)) / 1000);
                  setTimeLeft(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
                }
              };
              updateTimer();
              timerIntervalRef.current = setInterval(updateTimer, 1000);
            }
          } else if (row.id === 'onlinecompiler') {
            if (Array.isArray(data.keys)) {
              setOnlineCompilerKeys(data.keys);
            }
          }
        }
      )
      .subscribe();

    // 3. Anti-cheating & Fullscreen Listeners
    const handleVisibilityChange = async () => {
      if (document.hidden) {
        cheatingRef.current.tabSwitches += 1;
        setPopup({ message: "WARNING: Tab switching detected! Please stay on the test window.", type: "warning" });
        if (userId) {
          try {
            const { data: uData } = await supabase.from('users').select('tab_switches').eq('id', userId).single();
            if (uData) {
              await supabase.from('users').update({
                tab_switches: (uData.tab_switches || 0) + 1
              }).eq('id', userId);
            }
          } catch (e) {
            console.error("Error updating tab switches:", e);
          }
        }
      }
    };

    const handleCopyPaste = async (e) => {
      cheatingRef.current.copyPasteCount += 1;
      setPopup({ message: "WARNING: Copy/Pasting is strictly prohibited!", type: "warning" });
      e.preventDefault();
      if (userId) {
        try {
          const { data: uData } = await supabase.from('users').select('copy_paste_count').eq('id', userId).single();
          if (uData) {
            await supabase.from('users').update({
              copy_paste_count: (uData.copy_paste_count || 0) + 1
            }).eq('id', userId);
          }
        } catch (e) {
          console.error("Error updating copy paste count:", e);
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    document.addEventListener("paste", handleCopyPaste);
    document.addEventListener("copy", handleCopyPaste);

    return () => {
      supabase.removeChannel(settingsChannel);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      document.removeEventListener("paste", handleCopyPaste);
      document.removeEventListener("copy", handleCopyPaste);
    };
  }, [userId, navigate, activeLanguage]);

  const handleResetCode = () => {
    if (!question) return;
    setPopup({
      message: "Are you sure you want to reset your code back to the original buggy template? Any unsaved edits will be discarded.",
      type: "warning",
      onConfirm: () => {
        const initialCode = question.variants?.[activeLanguage]?.initialCode ||
                           question.variants?.c?.initialCode ||
                           question.variants?.cpp?.initialCode ||
                           question.initialCode ||
                           '';
        setCode(initialCode);
        if (userId && question.id) {
          localStorage.removeItem(`codathan_draft_${userId}_${question.id}`);
        }
        setPopup({ message: "Code reset to original buggy template.", type: "info" });
      }
    });
  };

  const compileCode = async () => {
    setIsCompiling(true);
    setOutput('Compiling code...');
    
    const candidateKeys = [
      ...onlineCompilerKeys,
      'a6ed2c1539a350079a242c2c2deecc36',
      'ccb79ad09699924cb025d0ba0b6690ed',
      '8471946023c357608b7666f763b66d9e',
      '00f2e3686a1712e01b8fa42d4ff76635',
      '31f89d72d1ae6013e4925c06bac75502'
    ].filter(Boolean);

    try {
      // Direct call to Backend Compiler endpoint (handles multi-key pool rotation & Piston failover without browser CORS errors)
      const response = await axios.post(`/api/compile`, {
        code: codeRef.current,
        compiler: activeLanguage,
        onlineCompilerKeys: candidateKeys
      }, { timeout: 20000 });

      const result = response.data?.program_message || response.data?.compiler_error || "No output";
      setOutput(result);
      return result;
    } catch (backendErr) {
      console.error("Backend compiler error:", backendErr?.message);
      let errorMsg = "";
      if (backendErr.code === 'ECONNABORTED' || backendErr.message?.includes('timeout')) {
        errorMsg = "Execution Timed Out / Infinite Loop Detected: Execution took too long and was stopped. Please check your loop termination conditions.";
      } else {
        errorMsg = backendErr?.response?.data?.detail || backendErr?.response?.data?.error || backendErr?.response?.data?.message || "Compilation Notice: Unable to connect to compiler engine. Please check your network connection.";
      }
      setOutput(errorMsg);
      return null;
    } finally {
      setIsCompiling(false);
    }
  };

  const handleSubmit = async (isAutoSubmit = false, customRedirect = null) => {
    const targetUrl = customRedirect || (isAutoSubmit ? '/timer-finished' : null);

    if (hasSubmittedRef.current || isSubmitting) return;
    hasSubmittedRef.current = true;
    setIsSubmitting(true);

    if (targetUrl) {
      ignoreCheatRef.current = true;
      setPopup({
        message: targetUrl === '/thank-you'
          ? "Event Ended! Saving your code and calculating points..."
          : "TIME IS UP! Saving your code and calculating error split points...",
        type: "warning"
      });
    }

    // Always ensure current target question is resolved
    let targetQuestion = questionRef.current || question;
    const targetQId = questionId || targetQuestion?.id;

    if (!targetQuestion && targetQId) {
      try {
        const { data: qDoc } = await supabase.from('questions').select('*').eq('id', targetQId).single();
        if (qDoc) {
          targetQuestion = {
            id: qDoc.id,
            title: qDoc.title,
            description: qDoc.description,
            category: qDoc.category,
            phase: qDoc.phase || 'cpp',
            points: qDoc.points || 10,
            expectedOutput: qDoc.expected_output || qDoc.expectedOutput,
            initialCode: qDoc.initial_code || qDoc.initialCode,
            correctCode: qDoc.correct_code || qDoc.correctCode,
            errorLines: qDoc.error_lines || qDoc.errorLines,
            variants: qDoc.variants || {}
          };
          questionRef.current = targetQuestion;
        }
      } catch (e) {
        console.warn("Could not fetch targetQuestion in handleSubmit:", e);
      }
    }

    let userOutput = '';
    if (!targetUrl) {
      userOutput = await compileCode();
    }

    // Determine language-specific correct code
    let langCorrectCode = '';
    if (targetQuestion?.variants && targetQuestion.variants[activeLanguage]) {
      langCorrectCode = targetQuestion.variants[activeLanguage].correctCode || '';
    } else {
      langCorrectCode = targetQuestion?.correctCode || targetQuestion?.correct_code || '';
    }

    const correctLines = langCorrectCode.split('\n').filter(line => line.trim() !== '').length;

    // Resolve current user code
    let currentCodeValue = codeRef.current || code || '';
    if ((!currentCodeValue || currentCodeValue === '// Loading...' || currentCodeValue === '// Mission not found.') && userId && targetQId) {
      const draft = localStorage.getItem(`codathan_draft_${userId}_${targetQId}`);
      if (draft && draft !== '// Loading...' && draft !== '// Mission not found.') {
        currentCodeValue = draft;
      }
    }
    if (!currentCodeValue || currentCodeValue === '// Loading...' || currentCodeValue === '// Mission not found.') {
      currentCodeValue = targetQuestion?.variants?.[activeLanguage]?.initialCode || targetQuestion?.initialCode || targetQuestion?.initial_code || '';
    }

    const userLines = currentCodeValue.split('\n').filter(line => line.trim() !== '').length;
    
    const normalizedUserOutput = (userOutput || '').trim();
    const normalizedExpected = (targetQuestion?.expectedOutput || targetQuestion?.expected_output || '').trim();
    const isOutputCorrect = normalizedExpected.length > 0 && normalizedUserOutput === normalizedExpected;

    if (!targetUrl && !isOutputCorrect) {
      setPopup({ message: 'Output did not match expected output. Keep trying!', type: 'error' });
      setIsSubmitting(false);
      hasSubmittedRef.current = false;
      return;
    }

    // Dynamic error calculation scaled to question points (default 10)
    const calcErrorsForCode = (targetQ, userCode, lang = 'cpp') => {
      const qPts = parseInt(targetQ?.points) || 10;
      if (!targetQ) return { total: 1, cleared: 0, ptsPerErr: qPts, qPts };
      const v = targetQ.variants?.[lang] || targetQ.variants?.cpp || targetQ.variants?.c || {};
      const rawErrorStr = String(v.errorLines || targetQ.error_lines || targetQ.errorLines || '');
      const groups = rawErrorStr
        .split(',')
        .map(g => g.split('|').map(n => parseInt(n.trim())).filter(n => !isNaN(n)))
        .filter(g => g.length > 0);
      
      const total = Math.max(1, groups.length || (v.errorLinesArray?.length || 1));
      const ptsPerErr = +(qPts / total).toFixed(2);
      const initialCode = v.initialCode || targetQ.initial_code || targetQ.initialCode || '';
      const initialLines = initialCode.split('\n');
      const userLinesArr = (userCode || '').split('\n');
      
      let cleared = 0;
      if (total > 0 && initialLines.length > 0) {
        groups.forEach(group => {
          const isGroupCleared = group.some(lineNum => {
            const idx = lineNum - 1;
            if (initialLines[idx] !== undefined && userLinesArr[idx] !== undefined) {
              return initialLines[idx].trim() !== userLinesArr[idx].trim();
            }
            return userLinesArr.length !== initialLines.length;
          });
          if (isGroupCleared) {
            cleared++;
          }
        });
      }

      if (cleared === 0 && userCode && userCode.trim() !== initialCode.trim()) {
        cleared = Math.min(total, 1);
      }

      return { total, cleared: Math.min(total, cleared), ptsPerErr, qPts };
    };

    const { total: evalTotal, cleared: evalCleared, ptsPerErr: evalPtsPer, qPts: targetPts } = calcErrorsForCode(targetQuestion, currentCodeValue, activeLanguage);
    const maxQuestionPoints = targetPts || parseInt(targetQuestion?.points) || 10;
    
    let score = 0;
    if (isOutputCorrect || evalCleared === evalTotal) {
      score = maxQuestionPoints;
    } else {
      score = Math.min(maxQuestionPoints, Math.round(evalCleared * evalPtsPer));
    }

    const endTime = new Date().toISOString();
    const startTime = questionStartTimeRef.current || eventStartTimeRef.current || endTime;
    const takenTimeMs = Math.max(0, new Date(endTime).getTime() - new Date(startTime).getTime());

    const formatLocalTimeStr = (ts) => {
      if (!ts) return 'N/A';
      const d = new Date(ts);
      if (isNaN(d.getTime())) return 'N/A';
      return d.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      });
    };

    try {
      const { data: userDocData } = await supabase.from('users').select('*').eq('id', userId).single();
      const userData = userDocData || {};

      const completedQs = userData.completed_questions || userData.completedQuestions || [];
      const newCompletedQs = completedQs.includes(targetQId) ? completedQs : [...completedQs, targetQId];
      
      const prevFinalCode = userData.final_code || userData.finalCode || '';
      const newFinalCode = prevFinalCode + `\n\n// ====== MISSION: ${targetQuestion?.title || targetQId} ======\n` + currentCodeValue;
      
      const finalClearedErrors = (isOutputCorrect || evalCleared === evalTotal) ? evalTotal : evalCleared;
      const finalTotalErrors = evalTotal;

      const newCumulCleared = (userData.cumulative_cleared_errors || 0) + finalClearedErrors;
      const newCumulTotal = (userData.cumulative_total_errors || 0) + finalTotalErrors;

      const prevSubmissions = userData.submissions || {};
      const submissionData = {
        score: score || 0,
        clearedErrors: finalClearedErrors || 0,
        totalErrors: finalTotalErrors || 1,
        pointsPerError: evalPtsPer || 10,
        pointFormula: `${finalClearedErrors}/${finalTotalErrors} errors × ${evalPtsPer} pts = ${score} pts`,
        codeLines: userLines || 0,
        targetLines: correctLines || 0,
        phase: targetQuestion?.phase || 'cpp',
        title: targetQuestion?.title || (targetQId ? `Question ${targetQId}` : 'C++ Mission'),
        submittedCode: currentCodeValue || '',
        startTime: startTime,
        endTime: endTime,
        startTimeStr: formatLocalTimeStr(startTime),
        endTimeStr: formatLocalTimeStr(endTime),
        takenTimeMs: takenTimeMs || 0,
        submittedAt: endTime,
        isAutoSubmitted: Boolean(targetUrl)
      };

      const prevElapsed = userData.elapsed_time_ms || userData.elapsedTimeMs || 0;
      const newElapsed = prevElapsed + takenTimeMs;
      const prevSubmissionsCount = userData.total_submissions_count || userData.totalSubmissionsCount || 0;
      const prevLangSubmissions = userData.lang_submissions_count || userData.langSubmissionsCount || { c: 0, cpp: 0 };
      const currentPhase = targetQuestion?.phase || 'cpp';

      const updatePayload = {
        score: (userData.score || 0) + score,
        final_code: newFinalCode,
        elapsed_time_ms: newElapsed,
        completed_questions: newCompletedQs,
        cumulative_cleared_errors: newCumulCleared,
        cumulative_total_errors: newCumulTotal,
        total_submissions_count: prevSubmissionsCount + 1,
        lang_submissions_count: {
          ...prevLangSubmissions,
          [currentPhase]: (prevLangSubmissions[currentPhase] || 0) + 1
        },
        submissions: {
          ...prevSubmissions,
          [targetQId]: submissionData
        },
        current_code: '',
        selected_question_id: null
      };

      if (targetUrl) {
        updatePayload.is_finished = true;
      }

      await supabase.from('users').update(updatePayload).eq('id', userId);

      if (userId && targetQId) {
        localStorage.removeItem(`codathan_draft_${userId}_${targetQId}`);
      }

      if (targetUrl) {
        setTimeout(() => navigate(targetUrl), 800);
      } else {
        setPopup({ message: `Success! Output matched. Score awarded: ${score}`, type: 'success' });
        ignoreCheatRef.current = true;
        setTimeout(() => navigate('/selection'), 2000);
      }
    } catch (err) {
      console.error("Error submitting:", err);
      if (targetUrl) {
        setTimeout(() => navigate(targetUrl), 800);
      } else {
        setPopup({ message: "Submission failed.", type: "error" });
        setIsSubmitting(false);
        hasSubmittedRef.current = false;
      }
    }
  };

  handleSubmitRef.current = handleSubmit;

  // Parse error groups (supports Solution A: "2, 5|14, 20")
  let errorGroups = [];
  if (question && question.variants && question.variants[activeLanguage]) {
    const v = question.variants[activeLanguage];
    if (Array.isArray(v.errorLineGroups) && v.errorLineGroups.length > 0) {
      errorGroups = v.errorLineGroups;
    } else if (v.errorLines) {
      errorGroups = String(v.errorLines)
        .split(',')
        .map(group => group.split('|').map(n => parseInt(n.trim())).filter(n => !isNaN(n)))
        .filter(group => group.length > 0);
    } else if (Array.isArray(v.errorLinesArray)) {
      errorGroups = v.errorLinesArray.map(n => [n]);
    }
  } else if (question && (question.error_lines || question.errorLines)) {
    errorGroups = String(question.error_lines || question.errorLines)
      .split(',')
      .map(group => group.split('|').map(n => parseInt(n.trim())).filter(n => !isNaN(n)))
      .filter(group => group.length > 0);
  }

  // Calculate Error Stats based on OR groups
  let totalErrors = errorGroups.length;
  let clearedErrors = 0;

  if (question && totalErrors > 0) {
    let initialCode = '';
    if (question.variants && question.variants[activeLanguage]) {
      initialCode = question.variants[activeLanguage].initialCode || '';
    } else {
      initialCode = question.initial_code || question.initialCode || '';
    }
    const initialLines = initialCode.split('\n');
    const currentLines = code.split('\n');

    errorGroups.forEach(group => {
      const isGroupCleared = group.some(lineNum => {
        const idx = lineNum - 1;
        if (initialLines[idx] !== undefined && currentLines[idx] !== undefined) {
          return initialLines[idx].trim() !== currentLines[idx].trim();
        }
        return currentLines.length !== initialLines.length;
      });

      if (isGroupCleared) {
        clearedErrors++;
      }
    });
  }
  let remainingErrors = Math.max(0, totalErrors - clearedErrors);

  // Calculate Line Counts
  let targetLinesCount = 0;
  if (question) {
    let correctCode = '';
    if (question.variants && question.variants[activeLanguage]) {
      correctCode = question.variants[activeLanguage].correctCode || '';
    } else {
      correctCode = question.correct_code || question.correctCode || '';
    }
    targetLinesCount = correctCode.split('\n').filter(line => line.trim() !== '').length;
  }
  const currentLinesCount = code.split('\n').filter(line => line.trim() !== '').length;

  errorStatsRef.current = {
    totalErrors,
    clearedErrors,
    remainingErrors,
    currentLinesCount,
    targetLinesCount
  };

  // Live real-time sync of error fixing and drafts to Supabase for Admin Dashboard
  useEffect(() => {
    if (!userId || !question?.id || isSubmitting) return;

    const timer = setTimeout(async () => {
      try {
        await supabase.from('users').update({
          selected_question_id: question.id,
          current_code: code
        }).eq('id', userId);
      } catch (e) {}
    }, 450);

    return () => clearTimeout(timer);
  }, [userId, question?.id, clearedErrors, totalErrors, code, isSubmitting]);

  return (
    <>
      <LoadingOverlay isLoading={!question || isSubmitting} />
      {popup && <PopupMessage message={popup.message} type={popup.type} onClose={() => setPopup(null)} onConfirm={popup.onConfirm} />}
      <div ref={editorContainerRef} style={{ display: 'flex', flexDirection: 'column', height: '90vh' }}>
      

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', borderBottom: '1px solid var(--border-subtle)' }}>
        <h2 className="glow-text-red" style={{ margin: 0 }}>DEBUGGING ARENA</h2>
        
        {timeLeft && (
          <div style={{ background: 'linear-gradient(135deg, #de0606 0%, #ac0202 100%)', color: '#ffffff', padding: '5px 15px', borderRadius: '4px', fontWeight: 'bold', fontSize: '1.2rem', fontFamily: 'var(--font-mono)', boxShadow: '0 0 15px rgba(222, 6, 6, 0.55)' }}>
            TIME REMAINING: {timeLeft}
          </div>
        )}

        <div style={{ color: '#ffffff', fontFamily: 'var(--font-heading)', fontSize: '0.9rem' }}>PARTICIPANT: <span style={{ color: '#de0606', fontWeight: 'bold' }}>{userName}</span></div>
      </div>

      <div style={{ display: 'flex', gap: '1rem', flex: 1, padding: '1rem', overflow: 'hidden' }}>
        {/* Left Panel: Question Info */}
        <div className="glass-panel" style={{ flex: '0 0 35%', padding: '1.5rem', display: 'flex', flexDirection: 'column', overflowY: 'auto', border: '1px solid #3f3f3f' }}>
          <h3 style={{ color: 'var(--text-primary)', marginBottom: '0.5rem', fontFamily: 'var(--font-heading)', fontSize: '1.5rem' }}>{question?.title || 'Loading...'}</h3>
          <span style={{ display: 'inline-block', marginBottom: '1.5rem', fontSize: '0.8rem', color: '#007fd7', border: '1px solid #007fd7', background: 'rgba(0, 127, 215, 0.1)', padding: '2px 8px', borderRadius: '12px', textTransform: 'uppercase', alignSelf: 'flex-start' }}>
            STAGE: C++ DEBUGGING MISSION
          </span>
          
          {question?.description ? (
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '1.05rem', lineHeight: '1.6' }}>{question.description}</p>
          ) : null}
          
          <div style={{ marginTop: 'auto' }}>
            <h4 style={{ color: '#de0606', marginBottom: '0.5rem', fontFamily: 'var(--font-heading)' }}>EXPECTED OUTPUT</h4>
            <pre style={{ background: 'var(--bg-deep-navy)', padding: '1rem', borderRadius: '4px', color: 'var(--text-secondary)', border: '1px solid #3f3f3f' }}>
              {question?.expectedOutput || question?.expected_output}
            </pre>
          </div>
        </div>

        {/* Right Panel: Editor & Console Stack */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem', overflow: 'hidden' }}>
          
          {/* Top: Editor */}
          <div className="glass-panel" style={{ flex: 2, display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid #3f3f3f' }}>
            <div style={{ padding: '0.5rem 1rem', background: 'var(--bg-panel-hover)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)' }}>
              
              <div style={{ color: '#ffffff', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px', fontFamily: 'var(--font-heading)', fontSize: '0.9rem' }}>
                <span style={{ color: '#de0606', marginRight: '6px' }}>●</span>
                C++ CODE ENVIRONMENT
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button onClick={handleResetCode} className="btn-secondary" style={{ padding: '5px 12px', fontSize: '0.8rem', color: '#e2e2e2', borderColor: '#3f3f3f' }} title="Reset to original buggy code">
                  RESET CODE
                </button>
                <button onClick={compileCode} disabled={isCompiling} className="btn-secondary" style={{ padding: '5px 15px', fontSize: '0.8rem', color: '#007fd7', borderColor: 'rgba(0, 127, 215, 0.4)' }}>
                  {isCompiling ? 'RUNNING...' : 'RUN CODE'}
                </button>
                <button onClick={() => handleSubmit(false)} disabled={isSubmitting || !question} className="btn-primary" style={{ padding: '5px 15px', fontSize: '0.8rem' }}>
                  {isSubmitting ? 'SUBMIT...' : 'SUBMIT'}
                </button>
              </div>
            </div>
            
            <div style={{ flex: 1 }}>
              <Editor
                height="100%"
                theme="vs-dark"
                language="cpp"
                value={code}
                onChange={(value) => {
                  setCode(value);
                  if (userId && question?.id && value && value !== '// Loading...') {
                    localStorage.setItem(`codathan_draft_${userId}_${question.id}`, value);
                  }
                }}
                options={{ minimap: { enabled: false }, fontSize: 16 }}
              />
            </div>
          </div>

          {/* Bottom: Console Output */}
          <div className="glass-panel" style={{ flex: 1, padding: '1rem', display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0, border: '1px solid #3f3f3f' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', flexShrink: 0 }}>
              <h4 style={{ color: '#de0606', margin: 0, fontFamily: 'var(--font-heading)' }}>CONSOLE OUTPUT</h4>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>[ SCROLLABLE ]</span>
            </div>
            <pre style={{ 
              flex: 1, 
              background: 'var(--bg-deep-navy)', 
              padding: '1rem', 
              borderRadius: '4px', 
              color: (output && (output.toLowerCase().includes('error') || output.toLowerCase().includes('exception'))) ? 'var(--accent-magenta)' : 'var(--text-primary)',
              overflowY: 'auto',
              overflowX: 'auto',
              minHeight: 0,
              maxHeight: '100%',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              border: '1px solid var(--border-subtle)',
              margin: 0,
              fontFamily: 'var(--font-mono)'
            }}>
              {output}
            </pre>
          </div>

        </div>
      </div>
    </div>
    </>
  );
};

export default EditorPage;
