import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp, doc, getDoc, setDoc, updateDoc, onSnapshot, deleteDoc, getDocs, writeBatch } from 'firebase/firestore';
import { Link } from 'react-router-dom';
import LoadingOverlay from './LoadingOverlay';
import PopupMessage from './PopupMessage';
import { syncClock, getNow } from '../utils/timeSync';
import { sortParticipants, getStudentCategory, getSortedParticipantsByCategory } from '../utils/ranking';
import { Trophy, Clock, FileText, Users, Activity, FileDown, Code, MonitorPlay, Sliders, Trash2, RefreshCw, Edit, Award, Sparkles, GraduationCap, PenTool, Upload, CheckCircle, Image, X, Calculator, Search, Check, AlertCircle, Percent, BarChart3, Layers } from 'lucide-react';
import html2pdf from 'html2pdf.js';


const SignatureDrawingPad = ({ sigTitle, onClose, onSave }) => {
  const canvasRef = React.useRef(null);
  const [isDrawing, setIsDrawing] = React.useState(false);

  const startDrawing = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || (e.touches && e.touches[0].clientX)) - rect.left;
    const y = (e.clientY || (e.touches && e.touches[0].clientY)) - rect.top;
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || (e.touches && e.touches[0].clientX)) - rect.left;
    const y = (e.clientY || (e.touches && e.touches[0].clientY)) - rect.top;
    ctx.lineTo(x, y);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    onSave(sigTitle, dataUrl);
  };

  return (
    <div className="no-print" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999 }}>
      <div style={{ background: 'var(--bg-deep-navy)', border: '2px solid var(--accent-cyan)', borderRadius: 'var(--radius-sm)', padding: '1.5rem', width: '90%', maxWidth: '500px', boxShadow: '0 0 30px rgba(0, 240, 255, 0.3)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 className="glow-text-cyan" style={{ margin: 0, fontSize: '1.1rem' }}>✍️ Draw Signature: {sigTitle}</h3>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}><X size={20} /></button>
        </div>
        <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '0.8rem' }}>
          Use mouse or finger to draw your digital signature inside the white box below:
        </p>
        <div style={{ background: 'white', borderRadius: '4px', border: '2px dashed #999', overflow: 'hidden', marginBottom: '1rem' }}>
          <canvas
            ref={canvasRef}
            width={450}
            height={180}
            style={{ display: 'block', width: '100%', height: '180px', cursor: 'crosshair', touchAction: 'none' }}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
          <button onClick={clearCanvas} className="btn-secondary" style={{ flex: 1, padding: '10px' }}>
            Clear Pad
          </button>
          <button onClick={handleSave} className="btn-primary" style={{ flex: 1, padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
            <CheckCircle size={16} /> Save & Apply E-Sign
          </button>
        </div>
      </div>
    </div>
  );
};

const DEFAULT_BRANDING = {
  collegeName: 'Ayya Nadar Janaki Ammal College',
  departmentName: 'Department of Computer Applications',
  mainTitle: 'SOFTTECH',
  associationTitle: 'ASSOCIATION',
  tagline: 'THE ULTIMATE DEBUGGING CHALLENGE',
  buttonText: 'START_SYSTEM',
  footerText: '© 2026 Ayya Nadar Janaki Ammal College. Dept. of Computer Applications. All rights reserved.',
  roundsText: 'C++ DEBUGGING (5 MISSIONS)',
  modalTitle: 'SYSTEM ACCESS'
};

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('questions');
  const [isLoading, setIsLoading] = useState(false);
  const [popup, setPopup] = useState(null);
  const [selectedConclusionUser, setSelectedConclusionUser] = useState(null);
  const [selectedSubUserId, setSelectedSubUserId] = useState(null);
  const [selectedSubPhase, setSelectedSubPhase] = useState('cpp');
  const [adminCategoryFilter, setAdminCategoryFilter] = useState('UG');
  const [reportType, setReportType] = useState('scoresheet'); // 'scoresheet' or 'winners'
  const [reportEventName, setReportEventName] = useState('CODATHAN - DEBUGGING EVENT');
  const [judgeSignatures, setJudgeSignatures] = useState(['Staff Signature']);
  const [newSigTitle, setNewSigTitle] = useState('');
  const [esignMap, setEsignMap] = useState({}); // { [sigTitle]: 'data:image/png;base64,...' }
  const [drawingSigTitle, setDrawingSigTitle] = useState(null);
  const [brandingData, setBrandingData] = useState(DEFAULT_BRANDING);
  const [pointSubTab, setPointSubTab] = useState('students'); // 'students' or 'bank'
  const [pointSearchQuery, setPointSearchQuery] = useState('');
  const [pointCategoryFilter, setPointCategoryFilter] = useState('ALL'); // 'ALL', 'Easy', 'Medium', 'Hard'
  const [selectedPointInspectStudent, setSelectedPointInspectStudent] = useState(null);
  const [questionSearchQuery, setQuestionSearchQuery] = useState('');

  const handleFileUpload = (sigTitle, e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setEsignMap(prev => ({ ...prev, [sigTitle]: event.target.result }));
    };
    reader.readAsDataURL(file);
  };
  
  
  const showPopup = (message, type = 'info') => setPopup({ message, type });

  // Question Form State
  const [formData, setFormData] = useState({
    title: '', description: '', expectedOutput: '', points: 100, phase: 'cpp', category: 'Easy',
    variants: {
      c: { initialCode: '', correctCode: '', errorLines: '' },
      cpp: { initialCode: '', correctCode: '', errorLines: '' }
    }
  });
  const [status, setStatus] = useState('');
  const [variantTab, setVariantTab] = useState('cpp');
  const [questionsList, setQuestionsList] = useState([]);
  const [editingQuestionId, setEditingQuestionId] = useState(null);
  const [questionCategoryFilter, setQuestionCategoryFilter] = useState('ALL');

  // Bulk Question Import State
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkJsonInput, setBulkJsonInput] = useState('');
  const [bulkImportProgress, setBulkImportProgress] = useState('');
  const [loadedFileName, setLoadedFileName] = useState('');

  const handleDownloadSampleTemplate = () => {
    const sampleData = [
      {
        title: "C Bug: Pointer Dereference Fix",
        phase: "c",
        description: "Identify and resolve the uninitialized pointer write error in C.",
        points: 100,
        expectedOutput: "Value is: 100\nCompleted successfully",
        variants: {
          c: {
            initialCode: "#include <stdio.h>\n\nint main() {\n    int *ptr;\n    *ptr = 100;\n    printf(\"Value is: %d\\n\", *ptr);\n    printf(\"Completed successfully\\n\");\n    return 0;\n}",
            correctCode: "#include <stdio.h>\n\nint main() {\n    int num = 100;\n    int *ptr = &num;\n    printf(\"Value is: %d\\n\", *ptr);\n    printf(\"Completed successfully\\n\");\n    return 0;\n}",
            errorLines: "4, 5|6"
          }
        }
      },
      {
        title: "C++ Bug: Vector Out of Bounds",
        phase: "cpp",
        description: "Fix the off-by-one loop index boundary condition in C++ vector iteration.",
        points: 100,
        expectedOutput: "Sum: 15",
        variants: {
          cpp: {
            initialCode: "#include <iostream>\n#include <vector>\nusing namespace std;\n\nint main() {\n    vector<int> nums = {1, 2, 3, 4, 5};\n    int sum = 0;\n    for(size_t i = 0; i <= nums.size(); i++) {\n        sum += nums[i];\n    }\n    cout << \"Sum: \" << sum << endl;\n    return 0;\n}",
            correctCode: "#include <iostream>\n#include <vector>\nusing namespace std;\n\nint main() {\n    vector<int> nums = {1, 2, 3, 4, 5};\n    int sum = 0;\n    for(size_t i = 0; i < nums.size(); i++) {\n        sum += nums[i];\n    }\n    cout << \"Sum: \" << sum << endl;\n    return 0;\n}",
            errorLines: "8"
          }
        }
      }
    ];

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(sampleData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", "codathan_150_questions_template.json");
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleBulkImportQuestions = async (jsonString) => {
    try {
      setIsLoading(true);
      setBulkImportProgress('Validating JSON format...');
      const parsed = JSON.parse(jsonString);
      const questionArray = Array.isArray(parsed) ? parsed : [parsed];

      if (questionArray.length === 0) {
        showPopup('JSON array is empty.', 'error');
        setIsLoading(false);
        return;
      }

      setBulkImportProgress(`Preparing ${questionArray.length} questions for upload...`);

      const processedQuestions = questionArray.map((q, idx) => {
        const rawPhase = String(q.phase || 'c').toLowerCase();
        const phase = (rawPhase === 'cpp' || rawPhase === 'medium' || rawPhase === 'hard') ? 'cpp' : 'c';
        
        let variants = q.variants || {};
        if (!variants.c && !variants.cpp) {
          variants[phase] = {
            initialCode: q.initialCode || '',
            correctCode: q.correctCode || '',
            errorLines: q.errorLines || ''
          };
        }

        const processedVariants = {};
        for (const lang of ['c', 'cpp']) {
          const v = variants[lang] || { initialCode: '', correctCode: '', errorLines: '' };
          const rawErrorStr = String(v.errorLines || '');
          const errorGroups = rawErrorStr
            .split(',')
            .map(g => g.split('|').map(n => parseInt(n.trim())).filter(n => !isNaN(n)))
            .filter(g => g.length > 0);

          processedVariants[lang] = {
            initialCode: v.initialCode || '',
            correctCode: v.correctCode || '',
            errorLines: rawErrorStr,
            errorLinesArray: errorGroups.flat()
          };
        }

        return {
          title: q.title || `Question #${idx + 1}`,
          description: q.description || '',
          expectedOutput: q.expectedOutput || '',
          points: parseInt(q.points) || 100,
          phase: phase,
          category: (q.category && ['Easy', 'Medium', 'Hard'].includes(q.category)) ? q.category : 'Easy',
          variants: processedVariants
        };
      });

      // Write in batches of 400
      const BATCH_SIZE = 400;
      for (let i = 0; i < processedQuestions.length; i += BATCH_SIZE) {
        const chunk = processedQuestions.slice(i, i + BATCH_SIZE);
        setBulkImportProgress(`Writing questions ${i + 1} to ${Math.min(i + BATCH_SIZE, processedQuestions.length)}...`);
        const batch = writeBatch(db);
        chunk.forEach(qItem => {
          const newDocRef = doc(collection(db, 'questions'));
          batch.set(newDocRef, {
            ...qItem,
            createdAt: serverTimestamp()
          });
        });
        await batch.commit();
      }

      showPopup(`Successfully uploaded ${processedQuestions.length} questions into the question pool!`, 'success');
      setIsBulkModalOpen(false);
      setBulkJsonInput('');
      setBulkImportProgress('');
    } catch (err) {
      console.error("Error in bulk import:", err);
      showPopup(`Bulk import failed: ${err.message}`, 'error');
    } finally {
      setIsLoading(false);
      setBulkImportProgress('');
    }
  };

  const handleDeleteAllQuestions = async () => {
    if (window.confirm(`WARNING: Are you sure you want to DELETE ALL ${questionsList.length} QUESTIONS from the database? This cannot be undone!`)) {
      setIsLoading(true);
      try {
        const snap = await getDocs(collection(db, 'questions'));
        const BATCH_SIZE = 400;
        const docIds = snap.docs.map(d => d.id);
        for (let i = 0; i < docIds.length; i += BATCH_SIZE) {
          const chunk = docIds.slice(i, i + BATCH_SIZE);
          const batch = writeBatch(db);
          chunk.forEach(id => {
            batch.delete(doc(db, 'questions', id));
          });
          await batch.commit();
        }
        showPopup(`Deleted all questions. Question bank is now empty.`, 'warning');
      } catch (err) {
        console.error(err);
        showPopup("Failed to delete questions.", "error");
      } finally {
        setIsLoading(false);
      }
    }
  };

  // User Form State
  const [userForm, setUserForm] = useState({ name: '', rollNo: '', category: 'Easy' });
  const [userStatus, setUserStatus] = useState('');
  const [editingUserId, setEditingUserId] = useState(null);

  // Event State
  const [eventStatus, setEventStatus] = useState('waiting');
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [questionsPerStudent, setQuestionsPerStudent] = useState(2);
  const [timeLeft, setTimeLeft] = useState('');
  const [eventEndTime, setEventEndTime] = useState(null);

  useEffect(() => {
    syncClock();
    if (eventStatus === 'active' && eventEndTime) {
      const end = new Date(eventEndTime).getTime();
      const updateAdminTimer = () => {
        const now = getNow();
        const distance = end - now;
        if (distance < 0) {
          setTimeLeft("00:00");
        } else {
          const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
          const seconds = Math.floor((distance % (1000 * 60)) / 1000);
          setTimeLeft(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
        }
      };
      updateAdminTimer();
      const interval = setInterval(updateAdminTimer, 1000);
      return () => clearInterval(interval);
    } else {
      setTimeLeft('');
    }
  }, [eventStatus, eventEndTime]);

  // Settings State
  const [langSettings, setLangSettings] = useState({ c: true, cpp: true });
  const [phaseLangs, setPhaseLangs] = useState({ easy: 'c', medium: 'cpp', c: 'c', cpp: 'cpp', apiKey: 'ccb79ad09699924cb025d0ba0b6690ed' });
  
  // OnlineCompiler.io API Keys Management State
  const [onlineCompilerKeys, setOnlineCompilerKeys] = useState([]);
  const [compilerStatusList, setCompilerStatusList] = useState({ active: [], exhausted: [], all: [], totalCount: 0 });
  const [isCheckingCompiler, setIsCheckingCompiler] = useState(false);
  const [newCompilerKey, setNewCompilerKey] = useState('');

  // Live Data
  const [liveUsers, setLiveUsers] = useState([]);

  useEffect(() => {
    // Listen to Event State
    const eventDocRef = doc(db, 'settings', 'event');
    const unsubEvent = onSnapshot(eventDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setEventStatus(data.status);
        if (data.durationMinutes !== undefined && data.durationMinutes !== null && !isNaN(parseFloat(data.durationMinutes)) && parseFloat(data.durationMinutes) > 0) {
          setDurationMinutes(data.durationMinutes);
        } else if (!durationMinutes || parseFloat(durationMinutes) <= 0) {
          setDurationMinutes(60);
        }
        if (data.questionsPerStudent !== undefined && data.questionsPerStudent !== null && !isNaN(parseInt(data.questionsPerStudent))) {
          setQuestionsPerStudent(parseInt(data.questionsPerStudent));
        } else {
          setQuestionsPerStudent(2);
        }
        setEventEndTime(data.endTime || null);
      } else {
        setDoc(eventDocRef, { status: 'waiting', endTime: null, durationMinutes: 60, questionsPerStudent: 2 });
      }
    });

    // Listen to Language Settings
    const langDocRef = doc(db, 'settings', 'language');
    const unsubLang = onSnapshot(langDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const d = docSnap.data();
        setLangSettings(d);
        setPhaseLangs({
          easy: d.easy || 'c',
          medium: d.medium || 'cpp',
          hard: d.hard || 'cpp',
          apiKey: d.apiKey || 'ccb79ad09699924cb025d0ba0b6690ed'
        });
      } else {
        setDoc(langDocRef, { easy: 'c', medium: 'cpp', hard: 'cpp', apiKey: 'ccb79ad09699924cb025d0ba0b6690ed', c: true, cpp: true });
      }
    });

    // Listen to Live Users
    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      const users = [];
      snapshot.forEach(doc => {
        users.push({ id: doc.id, ...doc.data() });
      });
      users.sort((a, b) => (a.rollNo > b.rollNo ? 1 : -1));
      setLiveUsers(users);
    });

    // Listen to Questions
    const unsubQuestions = onSnapshot(collection(db, 'questions'), (snapshot) => {
      const qs = [];
      snapshot.forEach(doc => qs.push({ id: doc.id, ...doc.data() }));
      setQuestionsList(qs);
    });

    // Listen to OnlineCompiler.io API Keys
    const compilerDocRef = doc(db, 'settings', 'onlinecompiler');
    const unsubCompiler = onSnapshot(compilerDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const keys = Array.isArray(data.keys) ? data.keys : [];
        setOnlineCompilerKeys(keys);
        fetchInstantCompilerStatus(keys);
        fetchCompilerStatus(keys);
      } else {
        setDoc(compilerDocRef, { keys: [] });
      }
    });

    // Listen to Site Branding Settings
    const brandingDocRef = doc(db, 'settings', 'branding');
    const unsubBranding = onSnapshot(brandingDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const d = docSnap.data();
        setBrandingData(prev => ({
          collegeName: d.collegeName !== undefined ? d.collegeName : prev.collegeName,
          departmentName: d.departmentName !== undefined ? d.departmentName : prev.departmentName,
          mainTitle: d.mainTitle !== undefined ? d.mainTitle : prev.mainTitle,
          associationTitle: d.associationTitle !== undefined ? d.associationTitle : prev.associationTitle,
          tagline: d.tagline !== undefined ? d.tagline : prev.tagline,
          buttonText: d.buttonText !== undefined ? d.buttonText : prev.buttonText,
          footerText: d.footerText !== undefined ? d.footerText : prev.footerText,
          roundsText: d.roundsText !== undefined ? d.roundsText : prev.roundsText,
          modalTitle: d.modalTitle !== undefined ? d.modalTitle : prev.modalTitle
        }));
      } else {
        setDoc(brandingDocRef, DEFAULT_BRANDING);
      }
    });

    return () => {
      unsubEvent();
      unsubLang();
      unsubUsers();
      unsubQuestions();
      unsubCompiler();
      unsubBranding();
    };
  }, []);

  const fetchInstantCompilerStatus = async (keysToTest = onlineCompilerKeys) => {
    try {
      const res = await axios.post('/api/onlinecompiler/count', { keys: keysToTest });
      if (res.data) {
        setCompilerStatusList(prev => ({
          ...prev,
          totalCount: res.data.totalCount || (res.data.all ? res.data.all.length : 0),
          all: res.data.all || prev.all || [],
          active: res.data.active || prev.active || [],
          exhausted: res.data.exhausted || prev.exhausted || []
        }));
      }
    } catch (err) {
      console.error('Failed to fetch instant OnlineCompiler status:', err);
    }
  };

  const fetchCompilerStatus = async (keysToTest = onlineCompilerKeys) => {
    setIsCheckingCompiler(true);
    await fetchInstantCompilerStatus(keysToTest);
    try {
      const res = await axios.post('/api/onlinecompiler/status', { keys: keysToTest });
      if (res.data) {
        setCompilerStatusList({
          active: res.data.active || [],
          exhausted: res.data.exhausted || [],
          all: res.data.all || [],
          totalCount: res.data.totalCount || (res.data.all ? res.data.all.length : 0)
        });
      }
    } catch (err) {
      console.error('Failed to fetch OnlineCompiler status:', err);
    } finally {
      setIsCheckingCompiler(false);
    }
  };

  const handleAddCompilerKey = async (e) => {
    e.preventDefault();
    const cleanKey = newCompilerKey.trim();
    if (!cleanKey) return;
    setIsLoading(true);
    try {
      const updatedKeys = [...new Set([...onlineCompilerKeys, cleanKey])];
      await setDoc(doc(db, 'settings', 'onlinecompiler'), { keys: updatedKeys }, { merge: true });
      await axios.post('/api/onlinecompiler/add', { apiKey: cleanKey });
      setNewCompilerKey('');
      showPopup('New OnlineCompiler.io API key added successfully!', 'success');
      await fetchInstantCompilerStatus(updatedKeys);
      fetchCompilerStatus(updatedKeys);
    } catch (err) {
      showPopup('Failed to add OnlineCompiler API key', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteCompilerKey = async (keyToRemove) => {
    if (window.confirm('Remove this custom OnlineCompiler.io API key from settings?')) {
      setIsLoading(true);
      const updatedKeys = onlineCompilerKeys.filter(k => k !== keyToRemove);
      await setDoc(doc(db, 'settings', 'onlinecompiler'), { keys: updatedKeys }, { merge: true });
      showPopup('OnlineCompiler.io API key removed', 'success');
      await fetchInstantCompilerStatus(updatedKeys);
      fetchCompilerStatus(updatedKeys);
      setIsLoading(false);
    }
  };

  const handleQuestionChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (e.target.name === 'phase') {
      const phaseLangMap = { easy: 'c', medium: 'cpp', hard: 'cpp', c: 'c', cpp: 'cpp' };
      if (phaseLangMap[e.target.value]) {
        setVariantTab(phaseLangMap[e.target.value]);
      }
    }
  };

  const handleVariantChange = (e, lang) => {
    setFormData({ ...formData, variants: { ...formData.variants, [lang]: { ...formData.variants[lang], [e.target.name]: e.target.value } } });
  };

  const handleAddQuestion = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setStatus('Saving...');
    try {
      const phaseLangMap = { easy: 'c', medium: 'cpp', hard: 'cpp', c: 'c', cpp: 'cpp' };
      const targetLang = phaseLangMap[formData.phase] || 'c';
      const fallbackVariant = formData.variants[targetLang]?.initialCode ? formData.variants[targetLang] :
                              (formData.variants.c?.initialCode ? formData.variants.c : formData.variants.cpp);

      const processedVariants = { ...formData.variants };
      for (const lang in processedVariants) {
        if (!processedVariants[lang].initialCode && fallbackVariant) {
          processedVariants[lang] = { ...fallbackVariant };
        }
        const rawErrorStr = String(processedVariants[lang].errorLines || '');
        const errorGroups = rawErrorStr
          .split(',')
          .map(g => g.split('|').map(n => parseInt(n.trim())).filter(n => !isNaN(n)))
          .filter(g => g.length > 0);

        processedVariants[lang].errorLines = rawErrorStr;
        processedVariants[lang].errorLinesArray = errorGroups.flat();
      }
      
      if (editingQuestionId) {
        await updateDoc(doc(db, 'questions', editingQuestionId), {
          title: formData.title, description: formData.description, expectedOutput: formData.expectedOutput,
          points: parseInt(formData.points), phase: formData.phase, category: formData.category || 'Easy', variants: processedVariants
        });
        showPopup('Question updated successfully!', 'success');
        setStatus('Question updated successfully!');
        setEditingQuestionId(null);
      } else {
        await addDoc(collection(db, 'questions'), {
          title: formData.title, description: formData.description, expectedOutput: formData.expectedOutput,
          points: parseInt(formData.points), phase: formData.phase, category: formData.category || 'Easy', variants: processedVariants, createdAt: serverTimestamp()
        });
        showPopup('Question added successfully!', 'success');
        setStatus('Question added successfully!');
      }

      setFormData({
        title: '', description: '', expectedOutput: '', points: 100, phase: 'cpp', category: 'Easy',
        variants: { c: { initialCode: '', correctCode: '', errorLines: '' }, cpp: { initialCode: '', correctCode: '', errorLines: '' } }
      });
    } catch (error) {
      console.error(error);
      showPopup(editingQuestionId ? 'Error updating question.' : 'Error adding question.', 'error');
      setStatus(editingQuestionId ? 'Error updating question.' : 'Error adding question.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditQuestion = (q) => {
    const pMap = { easy: 'c', medium: 'cpp', hard: 'cpp', c: 'c', cpp: 'cpp' };
    const p = pMap[q.phase] || q.phase || 'cpp';
    setFormData({
      title: q.title || '',
      description: q.description || '',
      expectedOutput: q.expectedOutput || '',
      points: q.points || 100,
      phase: p,
      category: q.category || 'Easy',
      variants: {
        c: { initialCode: q.variants?.c?.initialCode || '', correctCode: q.variants?.c?.correctCode || '', errorLines: q.variants?.c?.errorLines || '' },
        cpp: { initialCode: q.variants?.cpp?.initialCode || '', correctCode: q.variants?.cpp?.correctCode || '', errorLines: q.variants?.cpp?.errorLines || '' }
      }
    });
    setEditingQuestionId(q.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setUserStatus('Saving user...');
    try {
      if (editingUserId) {
        await updateDoc(doc(db, 'users', editingUserId), {
          name: userForm.name, rollNo: userForm.rollNo, category: userForm.category || 'Easy'
        });
        showPopup('User updated successfully!', 'success');
        setUserStatus('User updated successfully!');
        setEditingUserId(null);
      } else {
        await addDoc(collection(db, 'users'), {
          name: userForm.name, rollNo: userForm.rollNo, category: userForm.category || 'Easy',
          selectedLanguage: null, tabSwitches: 0, copyPasteCount: 0, score: 0, currentCode: '', isFinished: false, joinedAt: serverTimestamp()
        });
        showPopup('User added successfully!', 'success');
        setUserStatus('User added successfully!');
      }
      setUserForm({ name: '', rollNo: '', category: 'Easy' });
    } catch (err) {
      showPopup(editingUserId ? 'Failed to update user.' : 'Failed to add user.', 'error');
      setUserStatus(editingUserId ? 'Failed to update user.' : 'Failed to add user.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditUser = (u) => {
    setUserForm({ name: u.name || '', rollNo: u.rollNo || '', category: u.category || 'Easy' });
    setEditingUserId(u.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleUpdateQuestionsPerStudent = async (newCount) => {
    const parsed = parseInt(newCount, 10);
    if (isNaN(parsed) || parsed <= 0) {
      showPopup("Please enter a valid question count (1 or more).", "error");
      return;
    }
    setIsLoading(true);
    try {
      await updateDoc(doc(db, 'settings', 'event'), { questionsPerStudent: parsed });
      await setDoc(doc(db, 'settings', 'branding'), { roundsText: `C++ DEBUGGING (${parsed} MISSIONS)` }, { merge: true });
      setQuestionsPerStudent(parsed);
      showPopup(`Saved random questions allocation to ${parsed} questions per student!`, 'success');
    } catch (err) {
      console.error(err);
      showPopup("Failed to update question count.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartEvent = async () => {
    const mins = parseFloat(durationMinutes);
    if (!mins || isNaN(mins) || mins <= 0) {
      showPopup("Please enter a valid duration in minutes greater than 0.", "error");
      return;
    }
    if (window.confirm(`Start event for ${mins} minutes? All users in waiting room will enter the IDE.`)) {
      setIsLoading(true);
      await syncClock();
      const now = getNow();
      const endTime = new Date(now + mins * 60000);
      try {
        const usersSnap = await getDocs(collection(db, 'users'));
        const updatePromises = [];
        usersSnap.forEach(docSnap => {
          updatePromises.push(updateDoc(doc(db, 'users', docSnap.id), {
            isFinished: false,
            selectedQuestionId: null
          }));
        });
        await Promise.all(updatePromises);
      } catch (err) {
        console.warn('Error resetting users for start event:', err);
      }
      await updateDoc(doc(db, 'settings', 'event'), { 
        status: 'active', 
        durationMinutes: mins, 
        questionsPerStudent: parseInt(questionsPerStudent, 10) || 2,
        startTime: now,
        endTime: endTime.toISOString(),
        roundId: now
      });
      setIsLoading(false);
    }
  };

  const handleUpdateTimer = async () => {
    const mins = parseFloat(durationMinutes);
    if (!mins || isNaN(mins) || mins <= 0) {
      showPopup("Please enter a valid duration in minutes greater than 0.", "error");
      return;
    }
    if (window.confirm(`Update remaining timer to ${mins} minutes for all active users?`)) {
      setIsLoading(true);
      await syncClock();
      const now = getNow();
      const endTime = new Date(now + mins * 60000);
      await updateDoc(doc(db, 'settings', 'event'), {
        durationMinutes: mins,
        endTime: endTime.toISOString()
      });
      setIsLoading(false);
      showPopup(`Timer updated to ${mins} minutes remaining!`, "success");
    }
  };

  const handleStopEvent = async () => {
    if (window.confirm("Are you sure you want to STOP the event? All active users will be auto-submitted.")) {
      setIsLoading(true);
      await updateDoc(doc(db, 'settings', 'event'), { status: 'ended' });
      setIsLoading(false);
    }
  };

  const handleResetRound = async () => {
    if (window.confirm("WARNING: Are you sure you want to RESET THE ROUND TIMER? This resets event status to WAITING and clears active editor sessions, while PRESERVING all participant scores, time taken, warnings, and submissions.")) {
      setIsLoading(true);
      try {
        const usersSnap = await getDocs(collection(db, 'users'));
        const updatePromises = [];
        usersSnap.forEach(docSnap => {
          updatePromises.push(updateDoc(doc(db, 'users', docSnap.id), {
            isFinished: false,
            currentCode: '',
            selectedQuestionId: null
          }));
        });
        await Promise.all(updatePromises);
        await updateDoc(doc(db, 'settings', 'event'), { status: 'waiting', startTime: null, endTime: null });
        showPopup("Round status reset to WAITING (Participant scores, warnings, time & submissions preserved).", "success");
      } catch (err) {
        console.error(err);
        showPopup("Failed to reset round.", "error");
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleLanguageToggle = async (lang) => {
    setIsLoading(true);
    const updated = { ...langSettings, [lang]: !langSettings[lang] };
    await setDoc(doc(db, 'settings', 'language'), updated, { merge: true });
    setIsLoading(false);
  };

  const handleSavePhaseLanguages = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    await setDoc(doc(db, 'settings', 'language'), {
      ...langSettings,
      easy: phaseLangs.easy,
      medium: phaseLangs.medium,
      hard: phaseLangs.hard,
      apiKey: phaseLangs.apiKey
    }, { merge: true });
    setIsLoading(false);
    showPopup('Round languages & API Key saved successfully!', 'success');
  };

  const handleResetData = async () => {
    if (window.confirm("WARNING: This will delete ALL users and their submissions. This action CANNOT be undone! Are you sure?")) {
      setIsLoading(true);
      try {
        const usersSnap = await getDocs(collection(db, 'users'));
        const deletePromises = [];
        usersSnap.forEach(docSnap => deletePromises.push(deleteDoc(doc(db, 'users', docSnap.id))));
        await Promise.all(deletePromises);
        await setDoc(doc(db, 'settings', 'event'), { status: 'waiting', endTime: null, durationMinutes: 60 });
        showPopup("All user data has been wiped.", "warning");
      } catch (err) {
        console.error(err);
        showPopup("Failed to reset data.", "error");
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleSaveBranding = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await setDoc(doc(db, 'settings', 'branding'), brandingData, { merge: true });
      showPopup('Landing Page content & branding updated successfully!', 'success');
    } catch (err) {
      console.error(err);
      showPopup('Failed to save branding content.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetBrandingDefaults = async () => {
    if (window.confirm("Reset all landing page text and headers back to default?")) {
      setIsLoading(true);
      try {
        setBrandingData(DEFAULT_BRANDING);
        await setDoc(doc(db, 'settings', 'branding'), DEFAULT_BRANDING);
        showPopup('Branding reset to default templates.', 'success');
      } catch (err) {
        console.error(err);
        showPopup('Failed to reset branding.', 'error');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'branding':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div className="glass-panel" style={{ padding: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <h2 className="glow-text-cyan" style={{ margin: 0, fontSize: '1.6rem' }}>🎨 LANDING PAGE CONTENT & BRANDING</h2>
                  <p style={{ color: 'var(--text-secondary)', margin: '4px 0 0 0', fontSize: '0.85rem' }}>
                    Customize all landing page text, institution headers, tournament branding & event subtitles live.
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '0.8rem' }}>
                  <a href="/" target="_blank" rel="noreferrer" className="btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', textDecoration: 'none' }}>
                    🔗 Open Landing Page Live
                  </a>
                  <button type="button" onClick={handleResetBrandingDefaults} className="btn-secondary" style={{ color: 'var(--accent-magenta)', borderColor: 'rgba(255, 0, 60, 0.4)', fontSize: '0.85rem' }}>
                    ↺ Reset To Defaults
                  </button>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '2rem' }}>
                {/* Form Controls */}
                <form onSubmit={handleSaveBranding} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.4rem', color: 'var(--accent-cyan)', fontSize: '0.78rem', letterSpacing: '1px', fontFamily: 'var(--font-heading)' }}>
                      COLLEGE / INSTITUTION NAME
                    </label>
                    <input
                      type="text"
                      className="input-field"
                      value={brandingData.collegeName}
                      onChange={e => setBrandingData({ ...brandingData, collegeName: e.target.value })}
                      placeholder="e.g. Ayya Nadar Janaki Ammal College"
                      required
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '0.4rem', color: 'var(--accent-cyan)', fontSize: '0.78rem', letterSpacing: '1px', fontFamily: 'var(--font-heading)' }}>
                      DEPARTMENT NAME
                    </label>
                    <input
                      type="text"
                      className="input-field"
                      value={brandingData.departmentName}
                      onChange={e => setBrandingData({ ...brandingData, departmentName: e.target.value })}
                      placeholder="e.g. Department of Computer Applications"
                      required
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.4rem', color: 'var(--accent-cyan)', fontSize: '0.78rem', letterSpacing: '1px', fontFamily: 'var(--font-heading)' }}>
                        MAIN TITLE (HERO 1)
                      </label>
                      <input
                        type="text"
                        className="input-field"
                        value={brandingData.mainTitle}
                        onChange={e => setBrandingData({ ...brandingData, mainTitle: e.target.value })}
                        placeholder="e.g. SOFTTECH"
                        required
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', marginBottom: '0.4rem', color: 'var(--accent-cyan)', fontSize: '0.78rem', letterSpacing: '1px', fontFamily: 'var(--font-heading)' }}>
                        SUB-TITLE (HERO 2)
                      </label>
                      <input
                        type="text"
                        className="input-field"
                        value={brandingData.associationTitle}
                        onChange={e => setBrandingData({ ...brandingData, associationTitle: e.target.value })}
                        placeholder="e.g. ASSOCIATION"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '0.4rem', color: 'var(--accent-cyan)', fontSize: '0.78rem', letterSpacing: '1px', fontFamily: 'var(--font-heading)' }}>
                      EVENT TAGLINE / SUBTITLE
                    </label>
                    <input
                      type="text"
                      className="input-field"
                      value={brandingData.tagline}
                      onChange={e => setBrandingData({ ...brandingData, tagline: e.target.value })}
                      placeholder="e.g. THE ULTIMATE DEBUGGING CHALLENGE"
                      required
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.4rem', color: 'var(--accent-cyan)', fontSize: '0.78rem', letterSpacing: '1px', fontFamily: 'var(--font-heading)' }}>
                        START BUTTON TEXT
                      </label>
                      <input
                        type="text"
                        className="input-field"
                        value={brandingData.buttonText}
                        onChange={e => setBrandingData({ ...brandingData, buttonText: e.target.value })}
                        placeholder="e.g. START_SYSTEM"
                        required
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', marginBottom: '0.4rem', color: 'var(--accent-cyan)', fontSize: '0.78rem', letterSpacing: '1px', fontFamily: 'var(--font-heading)' }}>
                        LOGIN MODAL TITLE
                      </label>
                      <input
                        type="text"
                        className="input-field"
                        value={brandingData.modalTitle}
                        onChange={e => setBrandingData({ ...brandingData, modalTitle: e.target.value })}
                        placeholder="e.g. SYSTEM ACCESS"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '0.4rem', color: 'var(--accent-cyan)', fontSize: '0.78rem', letterSpacing: '1px', fontFamily: 'var(--font-heading)' }}>
                      EVENT ROUNDS BADGE TEXT
                    </label>
                    <input
                      type="text"
                      className="input-field"
                      value={brandingData.roundsText}
                      onChange={e => setBrandingData({ ...brandingData, roundsText: e.target.value })}
                      placeholder="e.g. ROUND 1: C ➔ ROUND 2: C++"
                      required
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '0.4rem', color: 'var(--accent-cyan)', fontSize: '0.78rem', letterSpacing: '1px', fontFamily: 'var(--font-heading)' }}>
                      FOOTER COPYRIGHT TEXT
                    </label>
                    <input
                      type="text"
                      className="input-field"
                      value={brandingData.footerText}
                      onChange={e => setBrandingData({ ...brandingData, footerText: e.target.value })}
                      placeholder="e.g. © 2026 Ayya Nadar Janaki Ammal College..."
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={isLoading}
                    style={{ marginTop: '0.5rem', padding: '14px', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                  >
                    💾 SAVE & APPLY BRANDING LIVE
                  </button>
                </form>

                {/* Live Realtime Visual Preview */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                  <label style={{ color: 'var(--accent-cyan)', fontSize: '0.85rem', letterSpacing: '1px', fontFamily: 'var(--font-heading)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Sparkles size={16} /> LIVE REAL-TIME VISUAL PREVIEW
                  </label>
                  <div style={{
                    background: 'radial-gradient(ellipse at 15% 25%, #220309 0%, transparent 55%), radial-gradient(ellipse at 85% 30%, #150206 0%, transparent 55%), linear-gradient(135deg, #0c0205 0%, #060608 50%, #0a0204 100%)',
                    border: '1px solid rgba(255, 0, 60, 0.4)',
                    borderRadius: '12px',
                    padding: '2.5rem 1.5rem',
                    textAlign: 'center',
                    boxShadow: '0 0 30px rgba(0, 0, 0, 0.8), inset 0 0 20px rgba(255, 0, 60, 0.1)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: '380px',
                    position: 'relative',
                    overflow: 'hidden'
                  }}>
                    {/* College Banner Preview */}
                    <div style={{
                      border: '1px solid rgba(255, 0, 60, 0.55)',
                      padding: '0.5rem 1.5rem',
                      marginBottom: '1.2rem',
                      background: 'rgba(15, 10, 14, 0.8)',
                      borderRadius: '4px',
                      boxShadow: '0 0 15px rgba(255, 0, 60, 0.2)'
                    }}>
                      <div style={{ fontSize: '0.78rem', color: '#ffffff', fontWeight: 'bold', letterSpacing: '2px', textTransform: 'uppercase' }}>
                        {brandingData.collegeName || 'COLLEGE NAME'}
                      </div>
                      <div style={{ fontSize: '0.68rem', color: '#ff003c', marginTop: '2px', letterSpacing: '1.5px', textTransform: 'uppercase' }}>
                        {brandingData.departmentName || 'DEPARTMENT NAME'}
                      </div>
                    </div>

                    {/* Main Title Preview */}
                    <div style={{
                      fontSize: '2.4rem',
                      color: '#ffffff',
                      fontFamily: 'var(--font-orbitron)',
                      fontWeight: '900',
                      letterSpacing: '6px',
                      lineHeight: 1.1,
                      textShadow: '0 0 15px rgba(255, 255, 255, 0.6), 0 0 30px rgba(255, 0, 60, 0.8)'
                    }}>
                      {brandingData.mainTitle || 'MAIN TITLE'}
                    </div>

                    {/* Association Title Preview */}
                    <div style={{
                      fontSize: '1.3rem',
                      color: '#ff003c',
                      fontFamily: 'var(--font-orbitron)',
                      fontWeight: '800',
                      letterSpacing: '8px',
                      marginBottom: '1rem',
                      textShadow: '0 0 20px rgba(255, 0, 60, 0.9)'
                    }}>
                      {brandingData.associationTitle || 'ASSOCIATION'}
                    </div>

                    {/* Tagline Preview */}
                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '4px 12px',
                      background: 'rgba(255, 0, 60, 0.08)',
                      border: '1px solid rgba(255, 0, 60, 0.25)',
                      borderRadius: '16px',
                      marginBottom: '1.4rem'
                    }}>
                      <span style={{ color: '#ff003c', fontSize: '0.7rem' }}>✦</span>
                      <span style={{ color: '#e2e8f0', fontSize: '0.68rem', letterSpacing: '2px', textTransform: 'uppercase' }}>
                        {brandingData.tagline || 'EVENT TAGLINE'}
                      </span>
                      <span style={{ color: '#ff003c', fontSize: '0.7rem' }}>✦</span>
                    </div>

                    {/* Button Preview */}
                    <button
                      type="button"
                      className="btn-primary"
                      style={{ padding: '8px 24px', fontSize: '0.8rem', pointerEvents: 'none', letterSpacing: '2px' }}
                    >
                      &gt; {brandingData.buttonText || 'START_SYSTEM'}
                    </button>

                    {/* Footer Preview */}
                    <div style={{ marginTop: '1.5rem', fontSize: '0.6rem', color: 'var(--text-secondary)' }}>
                      {brandingData.footerText}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'questions':
        return (
          <div className="glass-panel" style={{ padding: '2rem' }}>
            <h2 className="glow-text-cyan" style={{ marginBottom: '1.5rem' }}>{editingQuestionId ? 'EDIT QUESTION' : 'ADD NEW QUESTION'}</h2>
            <form onSubmit={handleAddQuestion} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <div style={{ flex: 2, minWidth: '220px' }}>
                  <label>TITLE</label>
                  <input type="text" name="title" className="input-field" value={formData.title} onChange={handleQuestionChange} required />
                </div>
                <div style={{ flex: 1, minWidth: '140px' }}>
                  <label>MISSION STAGE (LANGUAGE)</label>
                  <select name="phase" className="input-field" value={formData.phase} onChange={handleQuestionChange} required>
                    <option value="cpp">C++ LANGUAGE</option>
                  </select>
                </div>
                <div style={{ flex: 1, minWidth: '140px' }}>
                  <label>CATEGORY (DIFFICULTY)</label>
                  <select name="category" className="input-field" value={formData.category || 'Easy'} onChange={handleQuestionChange} required>
                    <option value="Easy">Easy</option>
                    <option value="Medium">Medium</option>
                    <option value="Hard">Hard</option>
                  </select>
                </div>
              </div>
              <div><label>DESCRIPTION</label><textarea name="description" className="input-field" value={formData.description} onChange={handleQuestionChange} rows="2" required /></div>
              
              <div style={{ border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '1rem', marginTop: '1rem' }}>
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                  {['cpp'].map(lang => (
                    <button key={lang} type="button" onClick={() => setVariantTab(lang)}
                      style={{ padding: '5px 15px', background: variantTab === lang ? 'var(--accent-cyan)' : 'transparent', color: variantTab === lang ? 'var(--bg-deep-navy)' : 'var(--text-primary)', border: '1px solid var(--accent-cyan)', cursor: 'pointer', textTransform: 'uppercase' }}>
                      C++ CODE VARIANT
                    </button>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <div style={{ flex: 1 }}><label>BUGGY CODE (INITIAL)</label><textarea name="initialCode" className="input-field" value={formData.variants[variantTab]?.initialCode || ''} onChange={(e) => handleVariantChange(e, variantTab)} rows="6" required wrap="off" style={{ fontFamily: 'var(--font-mono)', whiteSpace: 'pre', overflow: 'scroll', overflowX: 'scroll', overflowY: 'scroll' }} /></div>
                  <div style={{ flex: 1 }}><label>CORRECT CODE (For Logic)</label><textarea name="correctCode" className="input-field" value={formData.variants[variantTab]?.correctCode || ''} onChange={(e) => handleVariantChange(e, variantTab)} rows="6" required wrap="off" style={{ fontFamily: 'var(--font-mono)', whiteSpace: 'pre', overflow: 'scroll', overflowX: 'scroll', overflowY: 'scroll' }} /></div>
                </div>
                <div style={{ marginTop: '1rem' }}>
                  <label>ERROR LINES (Comma-separated, use "|" for alternative fix lines e.g. 2, 5|14, 20)</label>
                  <input type="text" name="errorLines" className="input-field" value={formData.variants[variantTab]?.errorLines || ''} onChange={(e) => handleVariantChange(e, variantTab)} required placeholder="e.g. 2, 5|14, 20" />
                </div>
              </div>

              <div><label>EXPECTED OUTPUT</label><textarea name="expectedOutput" className="input-field" value={formData.expectedOutput} onChange={handleQuestionChange} rows="2" required style={{ fontFamily: 'var(--font-mono)' }} /></div>
              <div><label>POINTS</label><input type="number" name="points" className="input-field" value={formData.points} onChange={handleQuestionChange} required /></div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button type="submit" className="btn-primary">{editingQuestionId ? 'UPDATE QUESTION' : 'ADD QUESTION'}</button>
                {editingQuestionId && (
                  <button type="button" className="btn-secondary" onClick={() => {
                    setEditingQuestionId(null);
                    setFormData({ title: '', description: '', expectedOutput: '', points: 100, phase: 'cpp', category: 'Easy', variants: { c: { initialCode: '', correctCode: '', errorLines: '' }, cpp: { initialCode: '', correctCode: '', errorLines: '' } } });
                  }}>CANCEL</button>
                )}
              </div>
              {status && <p style={{ color: 'var(--accent-cyan)', marginTop: '1rem' }}>{status}</p>}
            </form>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '3rem 0 1.5rem 0', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h2 className="glow-text-cyan" style={{ margin: 0 }}>
                  QUESTION BANK ({questionsList.length} TOTAL)
                </h2>
                <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                  Total: <strong style={{ color: 'var(--accent-cyan)' }}>{questionsList.length}</strong> | 
                  Easy: <strong style={{ color: '#10B981' }}>{questionsList.filter(q => (q.category || 'Easy') === 'Easy').length}</strong> | 
                  Medium: <strong style={{ color: '#F59E0B' }}>{questionsList.filter(q => q.category === 'Medium').length}</strong> | 
                  Hard: <strong style={{ color: '#FF003C' }}>{questionsList.filter(q => q.category === 'Hard').length}</strong> | 
                  Random Assignment: <strong style={{ color: '#00F0FF' }}>{questionsPerStudent} per student</strong>
                </p>
              </div>

              <div style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => setIsBulkModalOpen(true)}
                  className="btn-primary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 16px', fontSize: '0.85rem' }}
                >
                  <Upload size={15} /> 📥 BULK IMPORT JSON
                </button>
                <button
                  type="button"
                  onClick={handleDownloadSampleTemplate}
                  className="btn-secondary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 16px', fontSize: '0.85rem' }}
                >
                  <FileDown size={15} /> 📄 JSON TEMPLATE
                </button>
                {questionsList.length > 0 && (
                  <button
                    type="button"
                    onClick={handleDeleteAllQuestions}
                    className="btn-secondary"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 16px', fontSize: '0.85rem', borderColor: 'var(--accent-magenta)', color: 'var(--accent-magenta)' }}
                  >
                    <Trash2 size={15} /> 🗑️ DELETE ALL ({questionsList.length})
                  </button>
                )}
              </div>
            </div>

            {/* Question Search & Number Filter Bar */}
            {(() => {
              const filteredQuestionsList = questionsList.filter(q => {
                const qCat = q.category || 'Easy';
                if (questionCategoryFilter !== 'ALL' && qCat.toLowerCase() !== questionCategoryFilter.toLowerCase()) {
                  return false;
                }

                if (!questionSearchQuery.trim()) return true;
                const qLower = questionSearchQuery.toLowerCase().trim();
                
                // Range check e.g. "1-20", "21-40"
                if (/^\d+\s*-\s*\d+$/.test(qLower)) {
                  const [min, max] = qLower.split('-').map(n => parseInt(n.trim()));
                  const titleMatch = (q.title || '').match(/Question\s+(\d+)/i);
                  if (titleMatch) {
                    const qNum = parseInt(titleMatch[1]);
                    return qNum >= min && qNum <= max;
                  }
                }
                
                const titleLower = (q.title || '').toLowerCase();
                const descLower = (q.description || '').toLowerCase();
                
                // Match single number e.g. "25", "69", "Question 69"
                const numOnly = qLower.replace(/[^0-9]/g, '');
                if (numOnly && (titleLower.includes(`question ${numOnly}:`) || titleLower.includes(`q${numOnly}:`) || titleLower.startsWith(`question ${numOnly} `))) {
                  return true;
                }
                
                return titleLower.includes(qLower) || descLower.includes(qLower);
              });

              return (
                <>
                  <div style={{ background: 'var(--bg-deep-navy)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '1rem', marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                      <div style={{ flex: '1 1 320px', position: 'relative' }}>
                        <input
                          type="text"
                          className="input-field"
                          placeholder="🔍 Search by Question Number (e.g. 25, 69, 82) or Title / Topic..."
                          value={questionSearchQuery}
                          onChange={e => setQuestionSearchQuery(e.target.value)}
                          style={{ paddingLeft: '2.5rem', width: '100%' }}
                        />
                        <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                      </div>

                      {/* Quick Question Number Jump Input */}
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <input
                          type="number"
                          min="1"
                          max="194"
                          placeholder="Q #"
                          className="input-field"
                          style={{ width: '80px', textAlign: 'center' }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && e.target.value) {
                              setQuestionSearchQuery(`Question ${e.target.value}`);
                            }
                          }}
                          id="quickQNumInput"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const val = document.getElementById('quickQNumInput')?.value;
                            if (val) setQuestionSearchQuery(`Question ${val}`);
                          }}
                          className="btn-secondary"
                          style={{ padding: '8px 14px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--accent-cyan)', borderColor: 'var(--accent-cyan)' }}
                        >
                          <Search size={15} /> SEARCH Q#
                        </button>
                      </div>

                      {questionSearchQuery && (
                        <button
                          type="button"
                          onClick={() => {
                            setQuestionSearchQuery('');
                            const el = document.getElementById('quickQNumInput');
                            if (el) el.value = '';
                          }}
                          className="btn-secondary"
                          style={{ padding: '8px 14px', fontSize: '0.85rem' }}
                        >
                          Clear
                        </button>
                      )}
                    </div>

                    {/* Category Filter Tabs & Quick Jump Range Tags */}
                    <div style={{ display: 'flex', gap: '0.6rem', marginTop: '1rem', alignItems: 'center', flexWrap: 'wrap', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '0.8rem' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>Category:</span>
                      {[
                        { label: 'ALL', count: questionsList.length, color: '#00f0ff' },
                        { label: 'Easy', count: questionsList.filter(q => (q.category || 'Easy') === 'Easy').length, color: '#10B981' },
                        { label: 'Medium', count: questionsList.filter(q => q.category === 'Medium').length, color: '#F59E0B' },
                        { label: 'Hard', count: questionsList.filter(q => q.category === 'Hard').length, color: '#FF003C' }
                      ].map(cat => (
                        <button
                          key={cat.label}
                          type="button"
                          onClick={() => setQuestionCategoryFilter(cat.label)}
                          style={{
                            padding: '4px 12px',
                            borderRadius: '12px',
                            border: `1px solid ${questionCategoryFilter === cat.label ? cat.color : 'var(--border-subtle)'}`,
                            background: questionCategoryFilter === cat.label ? `${cat.color}22` : 'rgba(255,255,255,0.05)',
                            color: questionCategoryFilter === cat.label ? cat.color : 'var(--text-secondary)',
                            fontSize: '0.78rem',
                            cursor: 'pointer',
                            fontWeight: 'bold'
                          }}
                        >
                          {cat.label} ({cat.count})
                        </button>
                      ))}
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.8rem', alignItems: 'center', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>Quick Filter:</span>
                      {[
                        { label: 'All Ranges', query: '' },
                        { label: 'Q1 – Q50', query: '1-50' },
                        { label: 'Q51 – Q100', query: '51-100' },
                        { label: 'Q101 – Q150', query: '101-150' },
                        { label: 'Q151 – Q194', query: '151-194' }
                      ].map(tag => (
                        <button
                          key={tag.label}
                          type="button"
                          onClick={() => setQuestionSearchQuery(tag.query)}
                          style={{
                            padding: '3px 10px',
                            borderRadius: '12px',
                            border: '1px solid var(--border-subtle)',
                            background: questionSearchQuery === tag.query ? 'var(--accent-cyan)' : 'rgba(255,255,255,0.05)',
                            color: questionSearchQuery === tag.query ? '#000000' : 'var(--text-secondary)',
                            fontSize: '0.75rem',
                            cursor: 'pointer',
                            fontWeight: 'bold'
                          }}
                        >
                          {tag.label}
                        </button>
                      ))}

                      <div style={{ marginLeft: 'auto', fontSize: '0.82rem', color: 'var(--accent-cyan)', fontWeight: 'bold' }}>
                        Showing {filteredQuestionsList.length} of {questionsList.length} Questions
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gap: '1rem' }}>
                    {filteredQuestionsList.map(q => {
                      const cat = q.category || 'Easy';
                      const badgeColor = cat === 'Hard' ? '#FF003C' : cat === 'Medium' ? '#F59E0B' : '#10B981';
                      const badgeBg = cat === 'Hard' ? 'rgba(255, 0, 60, 0.15)' : cat === 'Medium' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.15)';
                      return (
                        <div key={q.id} style={{ padding: '1rem', border: '1px solid var(--border-subtle)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <h4 style={{ color: 'var(--text-primary)', marginBottom: '0.5rem' }}>{q.title}</h4>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                              <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '12px', background: 'var(--bg-deep-navy)', border: '1px solid var(--accent-magenta)', color: 'var(--accent-magenta)', textTransform: 'uppercase' }}>
                                C++ MISSION
                              </span>
                              <span style={{ fontSize: '0.75rem', fontWeight: 'bold', padding: '2px 8px', borderRadius: '12px', background: badgeBg, border: `1px solid ${badgeColor}`, color: badgeColor, textTransform: 'uppercase' }}>
                                {cat}
                              </span>
                              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{q.points || 100} PTS</span>
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button onClick={() => handleEditQuestion(q)} className="btn-secondary" style={{ padding: '5px 10px', fontSize: '0.8rem', color: 'var(--accent-cyan)', border: '1px solid var(--accent-cyan)' }}><Edit size={16} /></button>
                            <button onClick={async () => { if(window.confirm('Delete question?')) await deleteDoc(doc(db, 'questions', q.id)) }} className="btn-secondary" style={{ padding: '5px 10px', fontSize: '0.8rem', color: 'var(--accent-magenta)', border: '1px solid var(--accent-magenta)' }}><Trash2 size={16} /></button>
                          </div>
                        </div>
                      );
                    })}
                    {filteredQuestionsList.length === 0 && (
                      <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '2rem' }}>
                        No questions matching "{questionSearchQuery}".
                      </p>
                    )}
                  </div>
                </>
              );
            })()}
          </div>
        );

      case 'users':
        return (
          <div className="glass-panel" style={{ padding: '2rem' }}>
              <h2 className="glow-text-cyan" style={{ marginBottom: '1.5rem' }}>{editingUserId ? 'EDIT USER' : 'MANUAL USER REGISTRATION'}</h2>
              <form onSubmit={handleAddUser} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '500px' }}>
                <div><label>PARTICIPANT NAME</label><input type="text" className="input-field" value={userForm.name} onChange={(e) => setUserForm({ ...userForm, name: e.target.value })} required /></div>
                <div><label>TEAM IDENTIFIER (LOT #)</label><input type="text" className="input-field" value={userForm.rollNo} onChange={(e) => setUserForm({ ...userForm, rollNo: e.target.value })} required /></div>
                <div>
                  <label>CATEGORY (QUESTION DIFFICULTY)</label>
                  <select
                    className="input-field"
                    value={userForm.category || 'Easy'}
                    onChange={(e) => setUserForm({ ...userForm, category: e.target.value })}
                    required
                  >
                    <option value="Easy">Easy (Gets Random Easy Questions)</option>
                    <option value="Medium">Medium (Gets Random Medium Questions)</option>
                    <option value="Hard">Hard (Gets Random Hard Questions)</option>
                  </select>
                </div>
                
                <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                  <button type="submit" className="btn-primary">{editingUserId ? 'UPDATE USER' : 'ADD USER'}</button>
                  {editingUserId && (
                    <button type="button" className="btn-secondary" onClick={() => {
                      setEditingUserId(null);
                      setUserForm({ name: '', rollNo: '', category: 'Easy' });
                    }}>CANCEL</button>
                  )}
                </div>
                {userStatus && <p style={{ color: 'var(--accent-cyan)', marginTop: '1rem' }}>{userStatus}</p>}
              </form>

              <h2 className="glow-text-cyan" style={{ margin: '3rem 0 1.5rem 0' }}>REGISTERED USERS</h2>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--accent-cyan)' }}>
                      <th style={{ padding: '1rem' }}>LOT #</th>
                      <th style={{ padding: '1rem' }}>NAME</th>
                      <th style={{ padding: '1rem' }}>CATEGORY</th>
                      <th style={{ padding: '1rem' }}>LANGUAGE</th>
                      <th style={{ padding: '1rem' }}>PROGRESS</th>
                      <th style={{ padding: '1rem' }}>ACTION</th>
                    </tr>
                  </thead>
                  <tbody>
                    {liveUsers.map(u => {
                      const userCat = u.category || 'Easy';
                      const badgeColor = userCat === 'Hard' ? '#FF003C' : userCat === 'Medium' ? '#F59E0B' : '#10B981';
                      const badgeBg = userCat === 'Hard' ? 'rgba(255, 0, 60, 0.15)' : userCat === 'Medium' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.15)';
                      return (
                      <tr key={u.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span>{u.rollNo}</span>
                          <span style={{ padding: '1px 6px', borderRadius: '10px', fontSize: '0.7rem', background: 'rgba(0, 240, 255, 0.15)', color: '#00f0ff', border: '1px solid #00f0ff' }}>UG</span>
                        </td>
                        <td style={{ padding: '1rem' }}>{u.name}</td>
                        <td style={{ padding: '1rem' }}>
                          <span style={{
                            padding: '3px 10px',
                            borderRadius: '12px',
                            fontSize: '0.75rem',
                            fontWeight: 'bold',
                            background: badgeBg,
                            color: badgeColor,
                            border: `1px solid ${badgeColor}`,
                            textTransform: 'uppercase'
                          }}>
                            {userCat}
                          </span>
                        </td>
                        <td style={{ padding: '1rem', textTransform: 'uppercase' }}>{u.selectedLanguage || 'PENDING'}</td>
                        <td style={{ padding: '1rem' }}>
                            {(u.cumulativeClearedErrors || 0) + (u.clearedErrors || 0)} / {(u.cumulativeTotalErrors || 0) + (u.totalErrors || 0)}
                        </td>
                        <td style={{ padding: '1rem', display: 'flex', gap: '0.5rem' }}>
                          <button onClick={() => handleEditUser(u)} style={{ background: 'transparent', border: 'none', color: 'var(--accent-cyan)', cursor: 'pointer' }}><Edit size={18} /></button>
                          <button onClick={async () => { if(window.confirm('Delete user?')) await deleteDoc(doc(db, 'users', u.id)) }} style={{ background: 'transparent', border: 'none', color: 'var(--accent-magenta)', cursor: 'pointer' }}><Trash2 size={18} /></button>
                        </td>
                      </tr>
                    );
                  })}
                  </tbody>
                </table>
              </div>
          </div>
        );

      case 'event':
        return (
          <div className="glass-panel" style={{ padding: '2rem' }}>
            <h2 className="glow-text-cyan" style={{ marginBottom: '1.5rem' }}>ROUND SETTING & EVENT CONTROLS</h2>
            <h3 style={{ marginBottom: '2rem' }}>
              STATUS: <span className={eventStatus === 'active' ? 'glow-text-cyan' : 'glow-text-magenta'}>{eventStatus.toUpperCase()}</span>
              {timeLeft && <span style={{ marginLeft: '2rem', color: 'var(--accent-pink)' }}>TIME REMAINING: {timeLeft}</span>}
            </h3>

            {/* Random Question Count Setting */}
            <div style={{ background: 'rgba(0, 240, 255, 0.05)', border: '1px solid var(--accent-cyan)', borderRadius: '8px', padding: '1.2rem', marginBottom: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h4 className="glow-text-cyan" style={{ margin: '0 0 4px 0', fontSize: '1rem' }}>🎯 RANDOM QUESTIONS PER STUDENT (CATEGORY-WISE)</h4>
                <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  Each student will receive this exact number of randomly generated questions from their assigned category (Easy / Medium / Hard).
                </p>
              </div>
              <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
                <input
                  type="number"
                  min="1"
                  max="20"
                  className="input-field"
                  value={questionsPerStudent}
                  onChange={(e) => setQuestionsPerStudent(e.target.value)}
                  style={{ width: '90px', textAlign: 'center', fontWeight: 'bold', fontSize: '1.1rem', color: 'var(--accent-cyan)' }}
                />
                <button
                  type="button"
                  onClick={() => handleUpdateQuestionsPerStudent(questionsPerStudent)}
                  className="btn-primary"
                  style={{ padding: '10px 18px', fontSize: '0.85rem' }}
                >
                  SAVE QUESTION COUNT
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', marginBottom: '2rem', flexWrap: 'wrap' }}>
              <div><label>DURATION (MINUTES)</label><input type="number" className="input-field" value={durationMinutes} onChange={(e) => setDurationMinutes(e.target.value)} /></div>
              <button onClick={handleStartEvent} disabled={eventStatus === 'active'} className="btn-primary">START EVENT</button>
              {eventStatus === 'active' && (
                <button onClick={handleUpdateTimer} className="btn-primary" style={{ background: 'var(--accent-cyan)', color: 'var(--bg-deep-navy)' }}>UPDATE TIMER</button>
              )}
              <button onClick={handleStopEvent} disabled={eventStatus !== 'active'} className="btn-secondary" style={{ background: 'var(--accent-magenta)', color: 'var(--bg-deep-navy)' }}>STOP EVENT</button>
            </div>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', marginTop: '2rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '2rem' }}>
              <button onClick={handleResetRound} className="sidebar-btn" style={{ color: 'var(--accent-pink)', border: '1px solid var(--accent-pink)', maxWidth: '250px', justifyContent: 'center' }}><RefreshCw size={18} style={{ marginRight: '8px' }}/> RESET ROUND</button>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>Resets round status to WAITING and clears active editor sessions while PRESERVING all participant scores, warnings, time taken, and submissions.</p>
            </div>
          </div>
        );

      case 'languages':
        return (
          <div className="glass-panel" style={{ padding: '2rem' }}>
            <h2 className="glow-text-cyan" style={{ marginBottom: '1.5rem' }}>C++ LANGUAGE & COMPILER CONFIGURATION</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>The debugging competition consists of <strong>C++ Language</strong> (5 questions per participant). Configure the Online Compiler API below.</p>
            
            <form onSubmit={handleSavePhaseLanguages} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '600px', marginBottom: '3rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '2.5rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', alignItems: 'center' }}>
                <label style={{ color: 'var(--accent-cyan)', fontWeight: 'bold' }}>ACTIVE LANGUAGE</label>
                <div style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>C++ Language (g++-15)</div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', alignItems: 'center' }}>
                <label style={{ color: 'var(--accent-cyan)', fontWeight: 'bold' }}>ONLINE COMPILER API KEY</label>
                <input type="text" className="input-field" value={phaseLangs.apiKey} onChange={e => setPhaseLangs({ ...phaseLangs, apiKey: e.target.value })} placeholder="ccb79ad09699924cb025d0ba0b6690ed" />
              </div>

              <div>
                <button type="submit" className="btn-primary">SAVE API CONFIGURATION</button>
              </div>
            </form>

            <h3 className="glow-text-cyan" style={{ marginBottom: '1rem' }}>COMPILER AVAILABILITY</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {[
                { id: 'cpp', name: 'C++ Language (g++-15)' }
              ].map(({ id: lang, name }) => (
                <div key={lang} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <button onClick={() => handleLanguageToggle(lang)} className={langSettings[lang] !== false ? 'btn-primary' : 'btn-secondary'} style={{ width: '150px' }}>
                    {langSettings[lang] !== false ? 'ENABLED' : 'DISABLED'}
                  </button>
                  <span style={{ fontSize: '1.1rem', color: 'var(--text-primary)' }}>{name}</span>
                </div>
              ))}
            </div>

            <h3 className="glow-text-cyan" style={{ marginTop: '3rem', marginBottom: '1rem' }}>ONLINECOMPILER.IO API KEY MANAGEMENT & LIVE FAILOVER POOL</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              C & C++ compilation uses the OnlineCompiler.io execution engine with automatic key rotation and instant failover across the entire key pool whenever a key finishes its quota.
            </p>

            <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'center', background: 'var(--bg-deep-navy)', padding: '1rem 1.5rem', borderRadius: '8px', border: '1px solid var(--accent-cyan)', marginBottom: '1.5rem', boxShadow: '0 0 15px rgba(0, 240, 255, 0.1)' }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', textTransform: 'uppercase', letterSpacing: '1px' }}>Total Failover Pool</span>
                <span style={{ color: 'var(--accent-cyan)', fontWeight: 'bold', fontSize: '1.4rem' }}>
                  {compilerStatusList.totalCount || compilerStatusList.all?.length || 0} Keys
                </span>
              </div>
              <div style={{ height: '30px', width: '1px', background: 'var(--border-subtle)' }}></div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', textTransform: 'uppercase', letterSpacing: '1px' }}>Active & Ready</span>
                <span style={{ color: '#00f59b', fontWeight: 'bold', fontSize: '1.4rem' }}>
                  {compilerStatusList.active.length} Keys
                </span>
              </div>
              <div style={{ height: '30px', width: '1px', background: 'var(--border-subtle)' }}></div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', textTransform: 'uppercase', letterSpacing: '1px' }}>Exhausted Today</span>
                <span style={{ color: 'var(--accent-magenta)', fontWeight: 'bold', fontSize: '1.4rem' }}>
                  {compilerStatusList.exhausted.length} Keys
                </span>
              </div>
            </div>

            <form onSubmit={handleAddCompilerKey} style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end', background: 'var(--bg-deep-navy)', padding: '1.5rem', borderRadius: '8px', border: '1px solid var(--border-subtle)', marginBottom: '2rem' }}>
              <div style={{ flex: '1 1 320px' }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--accent-cyan)' }}>NEW ONLINECOMPILER.IO API KEY</label>
                <input
                  type="text"
                  className="input-field"
                  value={newCompilerKey}
                  onChange={e => setNewCompilerKey(e.target.value)}
                  placeholder="e.g. ccb79ad09699924cb025d0ba0b6690ed..."
                  required
                />
              </div>
              <button type="submit" className="btn-primary" style={{ padding: '0.7rem 1.5rem' }}>ADD COMPILER API KEY</button>
              <button type="button" onClick={() => fetchCompilerStatus()} disabled={isCheckingCompiler} className="btn-secondary" style={{ padding: '0.7rem 1.5rem', border: '1px solid var(--accent-cyan)', color: 'var(--accent-cyan)' }}>
                {isCheckingCompiler ? 'TESTING KEYS...' : 'REFRESH & TEST STATUS'}
              </button>
            </form>

            <div style={{ background: 'var(--bg-deep-navy)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '1.5rem', marginBottom: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.8rem', marginBottom: '1rem' }}>
                <h4 style={{ color: 'var(--accent-cyan)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', background: 'var(--accent-cyan)' }}></span>
                  COMPLETE ONLINECOMPILER API KEY POOL ({compilerStatusList.totalCount || compilerStatusList.all?.length || 0} REGISTERED KEYS)
                </h4>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>All built-in + custom keys available in automatic failover chain</span>
              </div>
              {(!compilerStatusList.all || compilerStatusList.all.length === 0) ? (
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontStyle: 'italic' }}>Loading registered compiler keys from pool...</p>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '0.8rem', maxHeight: '380px', overflowY: 'auto' }}>
                  {compilerStatusList.all.map((item, idx) => (
                    <div key={idx} style={{ background: '#0a0e1a', padding: '0.8rem 1rem', borderRadius: '6px', border: item.status === 'exhausted' ? '1px solid rgba(255, 0, 85, 0.3)' : '1px solid rgba(0, 245, 155, 0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color: 'var(--text-primary)' }}>
                          <strong>#{idx + 1}</strong> KEY: {item.apiKey ? `${item.apiKey.slice(0, 10)}...${item.apiKey.slice(-6)}` : 'N/A'}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: item.status === 'exhausted' ? 'var(--accent-magenta)' : '#00f59b', marginTop: '4px' }}>
                          {item.status === 'exhausted' ? (item.errorReason || 'LIMIT FINISHED / EXHAUSTED') : `ACTIVE & READY | Successful Runs: ${item.used || 0}`}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', background: item.status === 'exhausted' ? 'rgba(255, 0, 85, 0.15)' : 'rgba(0, 245, 155, 0.15)', color: item.status === 'exhausted' ? 'var(--accent-magenta)' : '#00f59b' }}>
                          {item.status === 'exhausted' ? 'EXHAUSTED' : 'ACTIVE'}
                        </span>
                        {onlineCompilerKeys.includes(item.apiKey) && (
                          <button onClick={() => handleDeleteCompilerKey(item.apiKey)} style={{ background: 'transparent', border: 'none', color: 'var(--accent-magenta)', cursor: 'pointer' }} title="Remove custom key"><Trash2 size={16} /></button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
              {/* Active & Ready APIs */}
              <div style={{ background: 'rgba(0, 245, 155, 0.04)', border: '1px solid rgba(0, 245, 155, 0.3)', borderRadius: '8px', padding: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(0, 245, 155, 0.2)', paddingBottom: '0.8rem', marginBottom: '1rem' }}>
                  <h4 style={{ color: '#00f59b', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', background: '#00f59b' }}></span>
                    ACTIVE ONLINECOMPILER KEYS (READY)
                  </h4>
                  <span style={{ fontWeight: 'bold', background: 'rgba(0, 245, 155, 0.15)', color: '#00f59b', padding: '2px 10px', borderRadius: '12px', fontSize: '0.85rem' }}>
                    {compilerStatusList.active.length} Keys Active
                  </span>
                </div>
                {compilerStatusList.active.length === 0 ? (
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontStyle: 'italic' }}>No active keys verified right now. Click Refresh & Test Status.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', maxHeight: '350px', overflowY: 'auto' }}>
                    {compilerStatusList.active.map((item, idx) => (
                      <div key={idx} style={{ background: 'var(--bg-deep-navy)', padding: '0.8rem 1rem', borderRadius: '6px', border: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--text-primary)' }}>KEY: {item.apiKey.slice(0, 12)}...{item.apiKey.slice(-6)}</div>
                          <div style={{ fontSize: '0.75rem', color: '#00f59b', marginTop: '4px' }}>Status: <strong>Active & Verified</strong> (Runs: {item.used || 0})</div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontSize: '0.75rem', padding: '3px 8px', borderRadius: '4px', background: 'rgba(0, 245, 155, 0.1)', color: '#00f59b', border: '1px solid rgba(0, 245, 155, 0.3)' }}>ACTIVE</span>
                          {onlineCompilerKeys.includes(item.apiKey) && (
                            <button onClick={() => handleDeleteCompilerKey(item.apiKey)} style={{ background: 'transparent', border: 'none', color: 'var(--accent-magenta)', cursor: 'pointer' }} title="Remove custom key"><Trash2 size={16} /></button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Exhausted / Limit Finished APIs */}
              <div style={{ background: 'rgba(255, 0, 85, 0.04)', border: '1px solid rgba(255, 0, 85, 0.3)', borderRadius: '8px', padding: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255, 0, 85, 0.2)', paddingBottom: '0.8rem', marginBottom: '1rem' }}>
                  <h4 style={{ color: 'var(--accent-magenta)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', background: 'var(--accent-magenta)' }}></span>
                    EXHAUSTED / LIMIT FINISHED KEYS
                  </h4>
                  <span style={{ fontWeight: 'bold', background: 'rgba(255, 0, 85, 0.15)', color: 'var(--accent-magenta)', padding: '2px 10px', borderRadius: '12px', fontSize: '0.85rem' }}>
                    {compilerStatusList.exhausted.length} Keys Finished
                  </span>
                </div>
                {compilerStatusList.exhausted.length === 0 ? (
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontStyle: 'italic' }}>All OnlineCompiler keys have quota available right now (0 exhausted).</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', maxHeight: '350px', overflowY: 'auto' }}>
                    {compilerStatusList.exhausted.map((item, idx) => (
                      <div key={idx} style={{ background: 'var(--bg-deep-navy)', padding: '0.8rem 1rem', borderRadius: '6px', border: '1px solid rgba(255, 0, 85, 0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--text-primary)' }}>KEY: {item.apiKey.slice(0, 12)}...{item.apiKey.slice(-6)}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--accent-magenta)', marginTop: '4px' }}>Status: <strong>{item.errorReason || 'Quota limit reached (Finished)'}</strong></div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontSize: '0.75rem', padding: '3px 8px', borderRadius: '4px', background: 'rgba(255, 0, 85, 0.1)', color: 'var(--accent-magenta)', border: '1px solid rgba(255, 0, 85, 0.3)' }}>EXHAUSTED</span>
                          {onlineCompilerKeys.includes(item.apiKey) && (
                            <button onClick={() => handleDeleteCompilerKey(item.apiKey)} style={{ background: 'transparent', border: 'none', color: 'var(--accent-magenta)', cursor: 'pointer' }} title="Remove custom key"><Trash2 size={16} /></button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      case 'points': {
        const parseQuestionErrors = (q) => {
          const v = q?.variants?.cpp || q?.variants?.c || {};
          const errStr = String(v.errorLines || q.errorLines || '');
          const groups = errStr
            .split(',')
            .map(g => g.split('|').map(n => parseInt(n.trim())).filter(n => !isNaN(n)))
            .filter(g => g.length > 0);
          const totalErr = Math.max(1, groups.length || (v.errorLinesArray?.length || 1));
          const basePts = parseInt(q.points) || 100;
          const ptsPerErr = +(basePts / totalErr).toFixed(2);
          return {
            totalErrors: totalErr,
            pointsPerError: ptsPerErr,
            errorLinesStr: errStr || 'Line specified in source',
            basePoints: basePts
          };
        };

        const filteredStudents = liveUsers.filter(u => {
          const q = pointSearchQuery.toLowerCase();
          return (
            (u.name || '').toLowerCase().includes(q) ||
            (u.regNo || '').toLowerCase().includes(q) ||
            (u.department || '').toLowerCase().includes(q)
          );
        });

        const filteredQuestions = questionsList.filter(q => {
          const query = pointSearchQuery.toLowerCase();
          const matchesSearch = !query || 
            (q.title || '').toLowerCase().includes(query) ||
            (q.description || '').toLowerCase().includes(query) ||
            (q.category || '').toLowerCase().includes(query);
          const meta = parseQuestionErrors(q);
          const cat = q.category || (meta.totalErrors === 1 ? 'Easy' : meta.totalErrors === 2 ? 'Medium' : 'Hard');
          const matchesCategory = pointCategoryFilter === 'ALL' || cat === pointCategoryFilter;
          return matchesSearch && matchesCategory;
        });

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Header & Stats Banner */}
            <div className="glass-panel" style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.2rem' }}>
                <div>
                  <h2 className="glow-text-cyan" style={{ margin: 0, fontSize: '1.6rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Calculator size={26} style={{ color: 'var(--accent-cyan)' }} />
                    POINT DISTRIBUTION & ERROR SPLIT ANALYTICS
                  </h2>
                  <p style={{ color: 'var(--text-secondary)', margin: '6px 0 0 0', fontSize: '0.88rem' }}>
                    Standard 100-point base score divided equally across question bugs (<strong>100 ÷ N errors = Points per fixed error</strong>). Live student tracking and question bank distribution.
                  </p>
                </div>
                
                {/* Switcher Between Live Students & Question Bank */}
                <div style={{ display: 'flex', gap: '0.5rem', background: 'var(--bg-deep-navy)', padding: '4px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                  <button
                    onClick={() => setPointSubTab('students')}
                    style={{
                      padding: '8px 16px',
                      background: pointSubTab === 'students' ? 'var(--accent-cyan)' : 'transparent',
                      color: pointSubTab === 'students' ? '#000000' : 'var(--text-secondary)',
                      fontWeight: 'bold',
                      borderRadius: '6px',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <Users size={16} /> Live Student Error Split ({liveUsers.length})
                  </button>
                  <button
                    onClick={() => setPointSubTab('bank')}
                    style={{
                      padding: '8px 16px',
                      background: pointSubTab === 'bank' ? 'var(--accent-cyan)' : 'transparent',
                      color: pointSubTab === 'bank' ? '#000000' : 'var(--text-secondary)',
                      fontWeight: 'bold',
                      borderRadius: '6px',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <FileText size={16} /> Question Bank Matrix ({questionsList.length})
                  </button>
                </div>
              </div>

              {/* Metric Quick Stats */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                <div style={{ background: 'var(--bg-deep-navy)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>BASE MISSION VALUE</div>
                  <div style={{ fontSize: '1.4rem', color: 'var(--accent-cyan)', fontWeight: 'bold', marginTop: '4px' }}>100 Points</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>Standard across all questions</div>
                </div>

                <div style={{ background: 'var(--bg-deep-navy)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(0, 245, 155, 0.3)' }}>
                  <div style={{ fontSize: '0.75rem', color: '#00f59b', textTransform: 'uppercase', letterSpacing: '1px' }}>SPLIT FORMULA RULE</div>
                  <div style={{ fontSize: '1.4rem', color: '#00f59b', fontWeight: 'bold', marginTop: '4px' }}>100 ÷ N Errors</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>1 Err = 100 | 2 Err = 50 | 3 Err = 33.33</div>
                </div>

                <div style={{ background: 'var(--bg-deep-navy)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>ACTIVE STUDENTS</div>
                  <div style={{ fontSize: '1.4rem', color: '#ffffff', fontWeight: 'bold', marginTop: '4px' }}>{liveUsers.length} Tracked</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>Assigned category missions</div>
                </div>

                <div style={{ background: 'var(--bg-deep-navy)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>TOTAL QUESTION POOL</div>
                  <div style={{ fontSize: '1.4rem', color: 'var(--accent-magenta)', fontWeight: 'bold', marginTop: '4px' }}>{questionsList.length} C++ Missions</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>Easy (1 err) • Medium (2 err) • Hard (3 err)</div>
                </div>
              </div>
            </div>

            {/* Search Bar & Category Tabs */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: '280px', position: 'relative' }}>
                <input
                  type="text"
                  className="input-field"
                  placeholder={pointSubTab === 'students' ? "Search students by Name, Reg No, or Department..." : "Search questions by Title, Question #, Category or Keyword..."}
                  value={pointSearchQuery}
                  onChange={e => setPointSearchQuery(e.target.value)}
                  style={{ paddingLeft: '2.5rem' }}
                />
                <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
              </div>

              {pointSubTab === 'bank' && (
                <div style={{ display: 'flex', gap: '6px', background: 'var(--bg-deep-navy)', padding: '4px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                  {['ALL', 'Easy', 'Medium', 'Hard'].map(cat => {
                    const count = cat === 'ALL'
                      ? questionsList.length
                      : questionsList.filter(q => (q.category || (parseQuestionErrors(q).totalErrors === 1 ? 'Easy' : parseQuestionErrors(q).totalErrors === 2 ? 'Medium' : 'Hard')) === cat).length;
                    const isActive = pointCategoryFilter === cat;
                    const catColor = cat === 'Easy' ? '#00f59b' : cat === 'Medium' ? '#f59e0b' : cat === 'Hard' ? '#ff003c' : 'var(--accent-cyan)';
                    return (
                      <button
                        key={cat}
                        onClick={() => setPointCategoryFilter(cat)}
                        style={{
                          padding: '6px 14px',
                          borderRadius: '6px',
                          border: isActive ? `1px solid ${catColor}` : '1px solid transparent',
                          background: isActive ? (cat === 'ALL' ? 'var(--accent-cyan)' : cat === 'Easy' ? 'rgba(0, 245, 155, 0.2)' : cat === 'Medium' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(255, 0, 60, 0.2)') : 'transparent',
                          color: isActive ? (cat === 'ALL' ? '#000000' : catColor) : 'var(--text-secondary)',
                          fontWeight: 'bold',
                          fontSize: '0.82rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        {cat} <span style={{ opacity: 0.8, fontSize: '0.75rem', fontFamily: 'var(--font-mono)' }}>({count})</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {pointSearchQuery && (
                <button onClick={() => setPointSearchQuery('')} className="btn-secondary" style={{ padding: '8px 14px', fontSize: '0.85rem' }}>
                  Clear
                </button>
              )}
            </div>

            {/* VIEW 1: LIVE STUDENTS POINT DISTRIBUTION BREAKDOWN */}
            {pointSubTab === 'students' && (
              <div className="glass-panel" style={{ padding: '1.5rem', overflowX: 'auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1.1rem' }}>
                    👨‍🎓 Live Participant Error Clearance & Partial Point Earnings ({filteredStudents.length})
                  </h3>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    Real-time monitoring of each student's error fixes & awarded score
                  </span>
                </div>

                {filteredStudents.length === 0 ? (
                  <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '2rem' }}>No participants matching search criteria.</p>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--accent-cyan)', fontFamily: 'var(--font-heading)', fontSize: '0.78rem', letterSpacing: '1px' }}>
                        <th style={{ padding: '12px 10px' }}>STUDENT INFO</th>
                        <th style={{ padding: '12px 10px' }}>DEPT & CAT</th>
                        <th style={{ padding: '12px 10px' }}>TOTAL SCORE</th>
                        <th style={{ padding: '12px 10px' }}>COMPLETED MISSIONS (WITH ERROR SPLIT)</th>
                        <th style={{ padding: '12px 10px' }}>LIVE WORKING MISSION</th>
                        <th style={{ padding: '12px 10px', textAlign: 'center' }}>ACTION</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredStudents.map((u, idx) => {
                        const subs = u.submissions || {};
                        const subEntries = Object.entries(subs);
                        const isWorking = u.selectedQuestionId && !u.isFinished;

                        return (
                          <tr key={u.id || idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: idx % 2 === 0 ? 'rgba(0,0,0,0.1)' : 'transparent' }}>
                            <td style={{ padding: '12px 10px' }}>
                              <div style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>{u.name || 'Anonymous'}</div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)' }}>{u.regNo || 'No Reg #'}</div>
                            </td>
                            <td style={{ padding: '12px 10px' }}>
                              <div style={{ color: 'var(--text-secondary)' }}>{u.department || 'N/A'}</div>
                              {u.category ? (
                                <span style={{
                                  fontSize: '0.7rem',
                                  padding: '2px 8px',
                                  borderRadius: '4px',
                                  fontWeight: 'bold',
                                  textTransform: 'uppercase',
                                  display: 'inline-block',
                                  marginTop: '3px',
                                  background: u.category === 'Easy' ? 'rgba(0, 245, 155, 0.15)' : u.category === 'Medium' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(255, 0, 60, 0.15)',
                                  color: u.category === 'Easy' ? '#00f59b' : u.category === 'Medium' ? '#f59e0b' : '#ff003c',
                                  border: `1px solid ${u.category === 'Easy' ? 'rgba(0, 245, 155, 0.3)' : u.category === 'Medium' ? 'rgba(245, 158, 11, 0.3)' : 'rgba(255, 0, 60, 0.3)'}`
                                }}>
                                  {u.category}
                                </span>
                              ) : (
                                <span style={{ fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', background: 'rgba(255, 0, 60, 0.1)', color: '#ff4d6d', border: '1px solid rgba(255, 0, 60, 0.3)' }}>
                                  {u.degreeCategory || 'UG'}
                                </span>
                              )}
                            </td>
                            <td style={{ padding: '12px 10px' }}>
                              <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#00f59b', fontFamily: 'var(--font-mono)' }}>
                                {u.score || 0} PTS
                              </div>
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                                {(u.completedQuestions || []).length} / {(u.assignedQuestions && u.assignedQuestions.length) ? u.assignedQuestions.length : questionsPerStudent} Completed
                              </div>
                              {u.tabSwitches > 0 && (
                                <div style={{ fontSize: '0.7rem', color: '#ff4d6d', marginTop: '2px', fontFamily: 'var(--font-mono)' }}>
                                  ⚠️ -{u.tabSwitches * 2} pts ({u.tabSwitches} tab {u.tabSwitches === 1 ? 'switch' : 'switches'})
                                </div>
                              )}
                            </td>
                            <td style={{ padding: '12px 10px', maxWidth: '380px' }}>
                              {subEntries.length === 0 ? (
                                <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', fontStyle: 'italic' }}>No submissions yet</span>
                              ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                  {subEntries.map(([qId, s], sIdx) => {
                                    const totalErr = s.totalErrors || 1;
                                    const clearedErr = s.clearedErrors !== undefined ? s.clearedErrors : (s.score === 100 ? totalErr : Math.round(s.score / (100 / totalErr)));
                                    const ptsPerErr = s.pointsPerError || +(100 / totalErr).toFixed(1);
                                    const isFull = s.score >= 100 || clearedErr === totalErr;

                                    return (
                                      <div key={sIdx} style={{ background: 'var(--bg-deep-navy)', padding: '6px 10px', borderRadius: '6px', border: isFull ? '1px solid rgba(0, 245, 155, 0.3)' : '1px solid rgba(255, 204, 0, 0.3)', fontSize: '0.78rem' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                          <strong style={{ color: 'var(--text-primary)' }}>{s.title || `Mission ${sIdx + 1}`}</strong>
                                          <span style={{ fontWeight: 'bold', color: isFull ? '#00f59b' : '#ffcc00' }}>
                                            +{s.score} PTS
                                          </span>
                                        </div>
                                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.72rem', marginTop: '2px' }}>
                                          Split: <strong>{clearedErr}/{totalErr} errors</strong> × {ptsPerErr} pts = <strong>{s.score} pts</strong>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </td>
                            <td style={{ padding: '12px 10px' }}>
                              {isWorking ? (
                                <div style={{ background: 'rgba(0, 240, 255, 0.06)', border: '1px solid rgba(0, 240, 255, 0.3)', padding: '8px 10px', borderRadius: '6px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--accent-cyan)', fontSize: '0.78rem', fontWeight: 'bold' }}>
                                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-cyan)', display: 'inline-block' }}></span>
                                    CURRENTLY EDITING
                                  </div>
                                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '3px' }}>
                                    Errors Fixed: <strong style={{ color: '#00f59b' }}>{u.clearedErrors || 0} / {u.totalErrors || 1}</strong>
                                  </div>
                                  <div style={{ fontSize: '0.72rem', color: 'var(--accent-cyan)', marginTop: '2px' }}>
                                    Est. Score: +{Math.min(100, Math.round((u.clearedErrors || 0) * (100 / Math.max(1, u.totalErrors || 1))))} pts
                                  </div>
                                </div>
                              ) : u.isFinished ? (
                                <span style={{ color: '#00f59b', fontSize: '0.8rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <CheckCircle size={14} /> FINISHED
                                </span>
                              ) : (
                                <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Idle / Selecting</span>
                              )}
                            </td>
                            <td style={{ padding: '12px 10px', textAlign: 'center' }}>
                              <button
                                onClick={() => setSelectedPointInspectStudent(u)}
                                className="btn-secondary"
                                style={{ padding: '6px 12px', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                              >
                                <Code size={14} /> Inspect Code & Diffs
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* VIEW 2: 194-QUESTION BANK POINT DISTRIBUTION MATRIX */}
            {pointSubTab === 'bank' && (
              <div className="glass-panel" style={{ padding: '1.5rem', overflowX: 'auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1.1rem' }}>
                    📚 Complete Question Bank Error Split Matrix ({filteredQuestions.length} Questions)
                  </h3>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    Displays exact category, error count (N), and split weight (100/N) for every question
                  </span>
                </div>

                {filteredQuestions.length === 0 ? (
                  <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '2rem' }}>No questions found matching criteria.</p>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--accent-cyan)', fontFamily: 'var(--font-heading)', fontSize: '0.78rem', letterSpacing: '1px' }}>
                        <th style={{ padding: '12px 10px', width: '50px' }}>#</th>
                        <th style={{ padding: '12px 10px' }}>QUESTION TITLE & TOPIC</th>
                        <th style={{ padding: '12px 10px' }}>CATEGORY</th>
                        <th style={{ padding: '12px 10px' }}>ERROR COUNT (N)</th>
                        <th style={{ padding: '12px 10px' }}>SPLIT VALUE PER ERROR</th>
                        <th style={{ padding: '12px 10px' }}>BUGGY LINE NUMBERS</th>
                        <th style={{ padding: '12px 10px' }}>MAX POINTS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredQuestions.map((q, idx) => {
                        const meta = parseQuestionErrors(q);
                        const cat = q.category || (meta.totalErrors === 1 ? 'Easy' : meta.totalErrors === 2 ? 'Medium' : 'Hard');
                        const isEasy = cat === 'Easy';
                        const isMed = cat === 'Medium';
                        const isHard = cat === 'Hard';
                        const color = isEasy ? '#00f59b' : isMed ? '#f59e0b' : '#ff003c';
                        const bg = isEasy ? 'rgba(0, 245, 155, 0.15)' : isMed ? 'rgba(245, 158, 11, 0.15)' : 'rgba(255, 0, 60, 0.15)';
                        const border = isEasy ? 'rgba(0, 245, 155, 0.35)' : isMed ? 'rgba(245, 158, 11, 0.35)' : 'rgba(255, 0, 60, 0.35)';

                        return (
                          <tr key={q.id || idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: idx % 2 === 0 ? 'rgba(0,0,0,0.1)' : 'transparent' }}>
                            <td style={{ padding: '12px 10px', color: 'var(--accent-cyan)', fontWeight: 'bold', fontFamily: 'var(--font-mono)' }}>
                              #{idx + 1}
                            </td>
                            <td style={{ padding: '12px 10px' }}>
                              <div style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>{q.title}</div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px', maxWidth: '340px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {q.description}
                              </div>
                            </td>
                            <td style={{ padding: '12px 10px' }}>
                              <span style={{
                                padding: '4px 10px',
                                borderRadius: '12px',
                                fontWeight: 'bold',
                                fontSize: '0.8rem',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                background: bg,
                                color: color,
                                border: `1px solid ${border}`
                              }}>
                                ● {cat}
                              </span>
                            </td>
                            <td style={{ padding: '12px 10px' }}>
                              <span style={{ 
                                padding: '4px 10px', 
                                borderRadius: '12px', 
                                background: meta.totalErrors === 1 ? 'rgba(0, 245, 155, 0.15)' : meta.totalErrors === 2 ? 'rgba(0, 240, 255, 0.15)' : 'rgba(255, 0, 60, 0.15)',
                                color: meta.totalErrors === 1 ? '#00f59b' : meta.totalErrors === 2 ? 'var(--accent-cyan)' : '#ff4d6d',
                                fontWeight: 'bold',
                                fontSize: '0.82rem'
                              }}>
                                {meta.totalErrors} {meta.totalErrors === 1 ? 'Error' : 'Errors'}
                              </span>
                            </td>
                            <td style={{ padding: '12px 10px' }}>
                              <div style={{ color: '#00f59b', fontWeight: 'bold', fontFamily: 'var(--font-mono)' }}>
                                {meta.pointsPerError} PTS / Error
                              </div>
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                                100 ÷ {meta.totalErrors}
                              </div>
                            </td>
                            <td style={{ padding: '12px 10px', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--accent-magenta)' }}>
                              {meta.errorLinesStr}
                            </td>
                            <td style={{ padding: '12px 10px', color: 'var(--text-primary)', fontWeight: 'bold' }}>
                              100 PTS
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* Inspect Student Error Code Modal */}
            {selectedPointInspectStudent && (
              <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999, padding: '1.5rem' }}>
                <div className="glass-panel" style={{ width: '95%', maxWidth: '900px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: '1.5rem', border: '2px solid var(--accent-cyan)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '1rem', marginBottom: '1rem' }}>
                    <div>
                      <h3 style={{ margin: 0, color: 'var(--accent-cyan)', fontSize: '1.2rem' }}>
                        🔍 ERROR SPLIT & CODE INSPECTION: {selectedPointInspectStudent.name}
                      </h3>
                      <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                        Reg No: <strong>{selectedPointInspectStudent.regNo}</strong> | Department: <strong>{selectedPointInspectStudent.department}</strong> | Score: <strong style={{ color: '#00f59b' }}>{selectedPointInspectStudent.score || 0} PTS</strong>
                      </p>
                    </div>
                    <button onClick={() => setSelectedPointInspectStudent(null)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                      <X size={24} />
                    </button>
                  </div>

                  <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                    {Object.keys(selectedPointInspectStudent.submissions || {}).length === 0 ? (
                      <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic', textAlign: 'center', padding: '2rem' }}>No submitted missions found for this participant yet.</p>
                    ) : (
                      Object.entries(selectedPointInspectStudent.submissions || {}).map(([qId, sub], sIdx) => {
                        const totalErr = sub.totalErrors || 1;
                        const clearedErr = sub.clearedErrors !== undefined ? sub.clearedErrors : (sub.score === 100 ? totalErr : Math.round(sub.score / (100 / totalErr)));
                        const ptsPerErr = sub.pointsPerError || +(100 / totalErr).toFixed(1);

                        return (
                          <div key={sIdx} style={{ background: 'var(--bg-deep-navy)', borderRadius: '8px', border: '1px solid var(--border-subtle)', padding: '1.2rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                              <div>
                                <h4 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1rem' }}>
                                  #{sIdx + 1} {sub.title || qId}
                                </h4>
                                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                  Submitted at: {sub.submittedAt || sub.endTimeStr || 'N/A'}
                                </div>
                              </div>
                              <div style={{ textAlign: 'right' }}>
                                <span style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#00f59b', background: 'rgba(0, 245, 155, 0.12)', padding: '4px 12px', borderRadius: '6px' }}>
                                  {sub.score} / 100 PTS
                                </span>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                                  {clearedErr}/{totalErr} errors fixed × {ptsPerErr} pts
                                </div>
                              </div>
                            </div>

                            <div style={{ marginTop: '0.8rem' }}>
                              <label style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)', textTransform: 'uppercase', letterSpacing: '1px', display: 'block', marginBottom: '4px' }}>
                                SUBMITTED C++ SOURCE CODE:
                              </label>
                              <pre style={{ 
                                background: '#05070e', 
                                padding: '1rem', 
                                borderRadius: '6px', 
                                border: '1px solid var(--border-subtle)', 
                                color: '#e0e0e0', 
                                fontFamily: 'var(--font-mono)', 
                                fontSize: '0.85rem', 
                                overflowX: 'auto', 
                                maxHeight: '220px',
                                margin: 0
                              }}>
                                {sub.submittedCode || '// No code recorded'}
                              </pre>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem', marginTop: '1rem', textAlign: 'right' }}>
                    <button onClick={() => setSelectedPointInspectStudent(null)} className="btn-secondary" style={{ padding: '8px 20px' }}>
                      Close Window
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      }

      case 'submissions':
        const submittedUsers = liveUsers.filter(u => 
          Object.keys(u.submissions || {}).length > 0 || u.isFinished || (u.completedQuestions || []).length > 0 || (u.totalSubmissionsCount || 0) > 0
        );
        const totalSubs = submittedUsers.reduce((acc, u) => acc + (u.totalSubmissionsCount || Object.keys(u.submissions || {}).length || 0), 0);

        const selectedUser = liveUsers.find(u => u.id === selectedSubUserId);
        const userSubsEntries = selectedUser ? Object.entries(selectedUser.submissions || {}) : [];
        const activeSubData = selectedUser ? (
          (selectedSubPhase && selectedUser.submissions?.[selectedSubPhase]) ||
          userSubsEntries.find(([k, v]) => k === selectedSubPhase || v.phase === selectedSubPhase)?.[1] ||
          userSubsEntries[0]?.[1]
        ) : null;

        return (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 className="glow-text-cyan" style={{ margin: 0 }}>USER SUBMISSIONS & CODE REVIEW</h2>
              <div style={{ display: 'flex', gap: '1rem', background: 'var(--bg-deep-navy)', padding: '0.6rem 1.2rem', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                <span style={{ color: 'var(--accent-cyan)', fontWeight: 'bold' }}>Total Submissions: {totalSubs}</span>
                <span style={{ color: 'var(--text-secondary)' }}>|</span>
                <span>Language: <strong>C++ (5 Missions)</strong></span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1.5rem', alignItems: 'start' }}>
              {/* Left Panel: Participant List */}
              <div className="glass-panel" style={{ padding: '1rem', maxHeight: '75vh', overflowY: 'auto' }}>
                <h3 style={{ color: 'var(--text-primary)', fontSize: '1rem', marginBottom: '1rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem' }}>
                  Participants ({submittedUsers.length})
                </h3>
                {submittedUsers.length === 0 ? (
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>No submissions recorded yet.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                    {submittedUsers.map(user => {
                      const isSel = user.id === selectedSubUserId;
                      const uSubsCount = user.totalSubmissionsCount || Object.keys(user.submissions || {}).length || 0;
                      return (
                        <div
                          key={user.id}
                          onClick={() => {
                            setSelectedSubUserId(user.id);
                            const firstSubKey = Object.keys(user.submissions || {})[0] || 'cpp';
                            setSelectedSubPhase(firstSubKey);
                          }}
                          style={{
                            padding: '1rem',
                            borderRadius: '8px',
                            background: isSel ? 'rgba(0, 240, 255, 0.12)' : 'var(--bg-deep-navy)',
                            border: isSel ? '1px solid var(--accent-cyan)' : '1px solid var(--border-subtle)',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                            <strong style={{ color: isSel ? 'var(--accent-cyan)' : 'var(--text-primary)' }}>
                              {user.rollNo} - {user.name}
                            </strong>
                            <span style={{ fontWeight: 'bold', color: user.score < 0 ? 'var(--accent-magenta)' : '#00f59b' }}>
                              {user.score} pts
                            </span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                            <span>Time: {user.elapsedTimeMs ? `${Math.floor(user.elapsedTimeMs / 60000)}m ${Math.floor((user.elapsedTimeMs % 60000) / 1000)}s` : 'N/A'}</span>
                            <span>Missions Solved: <strong>{uSubsCount}/5</strong></span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Right Panel: Selected Participant Code & Metrics */}
              <div className="glass-panel" style={{ padding: '1.5rem', minHeight: '60vh' }}>
                {!selectedUser ? (
                  <div style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--text-secondary)' }}>
                    <p style={{ fontSize: '1.1rem' }}>Select a participant from the left list to view their submitted code, timing, and evaluation metrics.</p>
                  </div>
                ) : (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '1rem', marginBottom: '1.2rem' }}>
                      <div>
                        <h3 style={{ color: 'var(--accent-cyan)', fontSize: '1.4rem', margin: 0 }}>
                          {selectedUser.name} <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>(Roll: {selectedUser.rollNo})</span>
                        </h3>
                        <div style={{ marginTop: '0.4rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                          Total Score: <strong style={{ color: '#00f59b' }}>{selectedUser.score} pts</strong> | Total Active Time: <strong>{selectedUser.elapsedTimeMs ? `${Math.floor(selectedUser.elapsedTimeMs / 60000)}m ${Math.floor((selectedUser.elapsedTimeMs % 60000) / 1000)}s` : 'N/A'}</strong> | Tab Switches: <strong style={{ color: selectedUser.tabSwitches > 0 ? 'var(--accent-pink)' : 'inherit' }}>{selectedUser.tabSwitches || 0} (-{(selectedUser.tabSwitches || 0) * 2} pts)</strong>
                        </div>
                      </div>
                    </div>

                    {/* Mission Submissions Tabs */}
                    <div style={{ display: 'flex', gap: '0.6rem', marginBottom: '1.2rem', flexWrap: 'wrap' }}>
                      {userSubsEntries.length === 0 ? (
                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>No individual missions submitted yet.</span>
                      ) : (
                        userSubsEntries.map(([subKey, subData], idx) => {
                          const isTabSel = selectedSubPhase === subKey || (!selectedSubPhase && idx === 0);
                          return (
                            <button
                              key={subKey}
                              onClick={() => setSelectedSubPhase(subKey)}
                              className={isTabSel ? 'btn-primary' : 'btn-secondary'}
                              style={{
                                padding: '0.5rem 1.2rem',
                                fontSize: '0.85rem',
                                position: 'relative'
                              }}
                            >
                              MISSION {idx + 1}: {subData.title ? (subData.title.length > 20 ? subData.title.slice(0, 20) + '...' : subData.title) : 'C++'}
                              <span style={{ marginLeft: '6px', color: '#00f59b' }}>✓</span>
                            </button>
                          );
                        })
                      )}
                    </div>

                    {/* Selected Phase Details */}
                    {!activeSubData ? (
                      <div style={{ background: 'var(--bg-deep-navy)', padding: '2rem', borderRadius: '8px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                        <p>No submission recorded yet for this participant.</p>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {/* Timing & Metrics Grid */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.8rem', background: 'var(--bg-deep-navy)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-subtle)', fontSize: '0.85rem' }}>
                          <div>
                            <span style={{ color: 'var(--text-secondary)', display: 'block', marginBottom: '2px' }}>Start Time</span>
                            <strong>{activeSubData.startTimeStr || (activeSubData.startTime ? new Date(activeSubData.startTime).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }) : 'N/A')}</strong>
                          </div>
                          <div>
                            <span style={{ color: 'var(--text-secondary)', display: 'block', marginBottom: '2px' }}>End Time</span>
                            <strong>{activeSubData.endTimeStr || (activeSubData.endTime ? new Date(activeSubData.endTime).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }) : 'N/A')}</strong>
                          </div>
                          <div>
                            <span style={{ color: 'var(--text-secondary)', display: 'block', marginBottom: '2px' }}>Taken Time</span>
                            <strong style={{ color: 'var(--accent-cyan)' }}>
                              {activeSubData.takenTimeMs ? `${Math.floor(activeSubData.takenTimeMs / 60000)}m ${Math.floor((activeSubData.takenTimeMs % 60000) / 1000)}s` : 'N/A'}
                            </strong>
                          </div>
                          <div>
                            <span style={{ color: 'var(--text-secondary)', display: 'block', marginBottom: '2px' }}>Score Awarded</span>
                            <strong style={{ color: '#00f59b' }}>+{activeSubData.score || 0} pts</strong>
                          </div>
                        </div>

                        {/* Code Header & Box */}
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                            <span>Submitted Code ({activeSubData.title || selectedSubPhase.toUpperCase()})</span>
                            <span>Lines: {activeSubData.codeLines || 0} (Target: {activeSubData.targetLines || 0}) | Errors Fixed: {activeSubData.clearedErrors || 0}/{activeSubData.totalErrors || 0}</span>
                          </div>
                          <pre style={{
                            background: '#0a0e1a',
                            padding: '1.2rem',
                            borderRadius: '8px',
                            border: '1px solid var(--border-subtle)',
                            color: '#e2e8f0',
                            fontFamily: 'monospace',
                            fontSize: '0.9rem',
                            overflowX: 'auto',
                            maxHeight: '50vh',
                            whiteSpace: 'pre-wrap'
                          }}>
                            {activeSubData.submittedCode || activeSubData.code || '// No code content found'}
                          </pre>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      case 'results':
      case 'esign':
        const filteredUsers = getSortedParticipantsByCategory(liveUsers, adminCategoryFilter);
        const displayUsers = reportType === 'winners' ? filteredUsers.slice(0, 3) : filteredUsers;
        const ugCount = getSortedParticipantsByCategory(liveUsers, 'UG').length;
        const pgCount = getSortedParticipantsByCategory(liveUsers, 'PG').length;
        const allCount = getSortedParticipantsByCategory(liveUsers, 'ALL').length;

        const handleAddJudgeSig = () => {
          if (newSigTitle.trim()) {
            setJudgeSignatures([...judgeSignatures, newSigTitle.trim()]);
            setNewSigTitle('');
          }
        };

        const handleRemoveJudgeSig = (idxToRemove) => {
          setJudgeSignatures(judgeSignatures.filter((_, idx) => idx !== idxToRemove));
        };

        const handleDownloadPdf = () => {
          const element = document.getElementById('print-area');
          if (!element) return;
          const cleanEventName = (reportEventName || 'CODATHAN').replace(/[^a-zA-Z0-9]/g, '_');
          const cleanReportType = reportType === 'scoresheet' ? 'ScoreSheet' : 'Winners';
          const filename = `${cleanEventName}_${cleanReportType}_${adminCategoryFilter}.pdf`;
          
          const opt = {
            margin:       [12, 10, 12, 10],
            filename:     filename,
            image:        { type: 'jpeg', quality: 0.98 },
            html2canvas:  { scale: 2, useCORS: true, letterRendering: true, scrollY: 0 },
            jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' },
            pagebreak:    { mode: ['css'], before: '.html2pdf__page-break' }
          };
          
          html2pdf().set(opt).from(element).save();
        };

        const renderSharedPrintableSection = () => {
          const PAGE_1_ROWS = 18;
          const PAGE_N_ROWS = 24;
          const tableChunks = [];
          
          if (displayUsers.length === 0) {
            tableChunks.push({ rows: [], startIndex: 0, pageNum: 1, isFirstPage: true });
          } else {
            let idx = 0;
            let pageNum = 1;
            while (idx < displayUsers.length) {
              const limit = pageNum === 1 ? PAGE_1_ROWS : PAGE_N_ROWS;
              const chunkRows = displayUsers.slice(idx, idx + limit);
              tableChunks.push({ rows: chunkRows, startIndex: idx, pageNum, isFirstPage: pageNum === 1 });
              idx += limit;
              pageNum++;
            }
          }

          const lastChunk = tableChunks[tableChunks.length - 1];
          const putSignaturesOnNewPage = false;

          const renderTableHeader = () => (
            <thead style={{ display: 'table-header-group' }}>
              <tr style={{ borderBottom: '2px solid black', background: '#f8fafc', color: 'black', pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                <th style={{ width: '10%', padding: '8px 5px', color: 'black', border: '1.5px solid black', textAlign: 'center', fontWeight: 'bold', fontSize: '10pt', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>Rank</th>
                <th style={{ width: '32%', padding: '8px 8px', color: 'black', border: '1.5px solid black', textAlign: 'left', fontWeight: 'bold', fontSize: '10pt', verticalAlign: 'middle' }}>Student Name</th>
                <th style={{ width: '21%', padding: '8px 5px', color: 'black', border: '1.5px solid black', textAlign: 'center', fontWeight: 'bold', fontSize: '10pt', verticalAlign: 'middle' }}>Roll No</th>
                <th style={{ width: '13%', padding: '8px 5px', color: 'black', border: '1.5px solid black', textAlign: 'center', fontWeight: 'bold', fontSize: '10pt', verticalAlign: 'middle' }}>Errors Fixed</th>
                <th style={{ width: '12%', padding: '8px 5px', color: 'black', border: '1.5px solid black', textAlign: 'center', fontWeight: 'bold', fontSize: '10pt', verticalAlign: 'middle' }}>Time Taken</th>
                <th style={{ width: '12%', padding: '8px 5px', color: 'black', border: '1.5px solid black', textAlign: 'center', fontWeight: 'bold', fontSize: '10pt', verticalAlign: 'middle' }}>Total Score</th>
              </tr>
            </thead>
          );

          const renderSignatures = () => (
            <div className="avoid-break signatures-container" style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'flex-end', marginTop: '2.5rem', paddingBottom: '0.6rem', flexWrap: 'wrap', gap: '3rem', pageBreakInside: 'avoid', breakInside: 'avoid', color: 'black', width: '100%' }}>
              {judgeSignatures.map((sigTitle, i) => (
                <div key={i} className="avoid-break" style={{ textAlign: 'center', minWidth: '190px', pageBreakInside: 'avoid', breakInside: 'avoid', margin: '0 10px' }}>
                  {esignMap[sigTitle] ? (
                    <img src={esignMap[sigTitle]} alt={sigTitle} style={{ height: '70px', maxWidth: '210px', objectFit: 'contain', margin: '0 auto', display: 'block', marginBottom: '5px' }} />
                  ) : (
                    <>
                      <div style={{ height: '55px' }}></div>
                      <div style={{ borderBottom: '1.5px solid black', width: '85%', margin: '0 auto 5px auto' }}></div>
                    </>
                  )}
                  <div style={{ fontWeight: 'bold', fontSize: '10pt', color: 'black' }}>{sigTitle}</div>
                </div>
              ))}
            </div>
          );

          return (
            <div id="print-area" style={{ background: 'white', color: 'black', padding: '1.2rem', fontFamily: '"Times New Roman", Times, serif', boxSizing: 'border-box' }}>
              {tableChunks.map((chunk, cIdx) => (
                <React.Fragment key={chunk.pageNum}>
                  {chunk.isFirstPage && (
                    <>
                      {/* College Header with Logos matching official PDF */}
                      <div className="avoid-break" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '2.5px solid black', paddingBottom: '1.2rem', marginBottom: '1.5rem', color: 'black', pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                        <img src="/college-logo.png" alt="College Logo" style={{ width: '90px', height: '90px', objectFit: 'contain' }} />
                        <div style={{ textAlign: 'center', flex: 1, padding: '0 1rem', color: 'black' }}>
                          <div style={{ fontWeight: '900', fontSize: '1.38rem', margin: '0 0 4px 0', letterSpacing: '0.5px' }}>AYYA NADAR JANAKI AMMAL COLLEGE</div>
                          <div style={{ fontSize: '0.68rem', lineHeight: '1.35', fontWeight: '500', maxWidth: '680px', margin: '0 auto' }}>
                            (Autonomous, Affiliated to Madurai Kamaraj University, Madurai, Re-accredited (4th Cycle) with 'A+' Grade
                            (CGPA 3.48 out of 4) by NAAC, Recognized as College of Excellence and Mentor Institution by UGC, STAR College by DBT
                            and Ranked 72nd at National Level in NIRF 2025 and DST-FIST (2023) Supported & An ISO 9001:2015 & ISO 21001:2018 Certified Institution)
                          </div>
                          <div style={{ fontWeight: '800', fontSize: '0.88rem', marginTop: '4px' }}>SIVAKASI - 626 124.</div>
                        </div>
                        <img src="/dept-logo.png" alt="Dept Logo" style={{ width: '90px', height: '90px', objectFit: 'contain' }} />
                      </div>

                      {/* Department, Event & Sheet Title Subheading */}
                      <div className="avoid-break" style={{ textAlign: 'center', marginBottom: '1.6rem', color: 'black', pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                        <div style={{ fontWeight: '800', fontSize: '1.12rem', margin: '0 0 0.35rem 0', color: 'black', letterSpacing: '0.5px' }}>
                          DEPARTMENT OF COMPUTER APPLICATIONS
                        </div>
                        <h2 style={{ fontSize: '1.35rem', fontWeight: 'bold', margin: '0 0 0.4rem 0', color: 'black', textTransform: 'uppercase' }}>
                          {reportEventName}
                        </h2>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: 0, color: 'black', textDecoration: 'underline' }}>
                          {reportType === 'scoresheet' ? 'UG ScoreSheet' : 'Top 3 UG Winners'}
                        </h3>
                      </div>
                    </>
                  )}

                  {/* Table Chunk for this Page */}
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', color: 'black', pageBreakInside: 'auto', breakInside: 'auto', tableLayout: 'fixed' }}>
                    {renderTableHeader()}
                    <tbody>
                      {chunk.rows.length === 0 ? (
                        <tr className="avoid-break" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                          <td colSpan="6" style={{ padding: '2rem', textAlign: 'center', color: 'black', border: '1px solid black', fontSize: '10pt' }}>
                            No participants found for this report criteria.
                          </td>
                        </tr>
                      ) : (
                        chunk.rows.map((user, rIdx) => {
                          const globalIndex = chunk.startIndex + rIdx;
                          return (
                            <tr key={user.id} className="avoid-break" style={{ borderBottom: '1px solid black', color: 'black', pageBreakInside: 'avoid', breakInside: 'avoid', pageBreakAfter: 'auto' }}>
                              <td style={{ width: '10%', padding: '6px 5px', fontWeight: 'bold', color: 'black', border: '1px solid black', textAlign: 'center', verticalAlign: 'middle', fontSize: '10pt' }}>
                                {reportType === 'scoresheet' ? `#${globalIndex + 1}` : (globalIndex === 0 ? '1' : globalIndex === 1 ? '2' : '3')}
                              </td>
                              <td style={{ width: '32%', padding: '6px 8px', fontWeight: 'bold', color: 'black', border: '1px solid black', textAlign: 'left', wordBreak: 'normal', overflowWrap: 'break-word', verticalAlign: 'middle', fontSize: '10pt', lineHeight: '1.25' }}>
                                {user.name || 'Anonymous'}
                              </td>
                              <td style={{ width: '21%', padding: '6px 5px', color: 'black', border: '1px solid black', textAlign: 'center', verticalAlign: 'middle', fontSize: '10pt' }}>
                                {user.rollNo || user.regNo || 'N/A'}
                              </td>
                              <td style={{ width: '13%', padding: '6px 5px', color: 'black', border: '1px solid black', textAlign: 'center', verticalAlign: 'middle', fontSize: '10pt' }}>
                                {(user.cumulativeClearedErrors || 0) + (user.clearedErrors || 0)} / {(user.cumulativeTotalErrors || 0) + (user.totalErrors || 0)}
                              </td>
                              <td style={{ width: '12%', padding: '6px 5px', color: 'black', border: '1px solid black', textAlign: 'center', verticalAlign: 'middle', fontSize: '10pt' }}>
                                {user.elapsedTimeMs ? `${Math.floor(user.elapsedTimeMs / 60000)}m ${Math.floor((user.elapsedTimeMs % 60000) / 1000)}s` : 'N/A'}
                              </td>
                              <td style={{ width: '12%', padding: '6px 5px', fontWeight: 'bold', color: 'black', border: '1px solid black', textAlign: 'center', verticalAlign: 'middle', fontSize: '10.5pt' }}>
                                {user.score !== undefined ? user.score : 0}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>

                  {/* Render signatures below table if on last chunk and fits on page */}
                  {cIdx === tableChunks.length - 1 && !putSignaturesOnNewPage && renderSignatures()}

                  {/* Page break after chunk if not the last chunk */}
                  {cIdx < tableChunks.length - 1 && <div className="html2pdf__page-break"></div>}
                </React.Fragment>
              ))}

              {/* If signatures need a separate page due to table filling up the final page */}
              {putSignaturesOnNewPage && (
                <>
                  <div className="html2pdf__page-break"></div>
                  {renderSignatures()}
                </>
              )}
            </div>
          );
        };

        return (
          <div className="glass-panel" style={{ padding: '2rem' }}>
            {drawingSigTitle && (
              <SignatureDrawingPad
                sigTitle={drawingSigTitle}
                onClose={() => setDrawingSigTitle(null)}
                onSave={(title, dataUrl) => {
                  setEsignMap(prev => ({ ...prev, [title]: dataUrl }));
                  setDrawingSigTitle(null);
                }}
              />
            )}

            {/* ── Screen Control Panel (no-print) ───────────────────────── */}
            <div className="no-print" style={{ marginBottom: '2rem', paddingBottom: '1.5rem', borderBottom: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <h2 className="glow-text-cyan" style={{ margin: 0, fontSize: '1.6rem' }}>
                    {activeTab === 'esign' ? '✍️ STAFF E-SIGN & OFFICIAL PDF STUDIO' : 'OFFICIAL PDF REPORT GENERATOR'}
                  </h2>
                  <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
                    {activeTab === 'esign'
                      ? 'Upload image signatures or draw digital e-signatures for judges and staff, then download clean college PDF reports.'
                      : 'Generate college-formatted ScoreSheets and Top 3 Winner lists without blue criteria box or extra columns.'}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap' }}>
                  <button onClick={handleDownloadPdf} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px' }}>
                    <FileDown size={19} /> DOWNLOAD OFFICIAL PDF (.PDF)
                  </button>
                </div>
              </div>

              {/* Controls Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', background: 'var(--bg-deep-navy)', padding: '1.2rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                {/* 1. Report Type Selector */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--accent-cyan)', fontWeight: 'bold', marginBottom: '8px', letterSpacing: '1px' }}>
                    1. REPORT FORMAT TYPE
                  </label>
                  <div style={{ display: 'flex', gap: '0.6rem' }}>
                    <button
                      onClick={() => setReportType('scoresheet')}
                      className={reportType === 'scoresheet' ? 'btn-primary' : 'btn-secondary'}
                      style={{ flex: 1, padding: '8px 12px', fontSize: '0.85rem' }}
                    >
                      📊 Full ScoreSheet
                    </button>
                    <button
                      onClick={() => setReportType('winners')}
                      className={reportType === 'winners' ? 'btn-primary' : 'btn-secondary'}
                      style={{ flex: 1, padding: '8px 12px', fontSize: '0.85rem', background: reportType === 'winners' ? 'linear-gradient(135deg, #ffd700, #ff8800)' : 'transparent', color: reportType === 'winners' ? '#000' : 'var(--text-primary)', borderColor: reportType === 'winners' ? '#ffd700' : 'var(--border-subtle)' }}
                    >
                      🏆 Top 3 Winners Sheet
                    </button>
                  </div>
                </div>

                {/* 2. Category Filter */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--accent-cyan)', fontWeight: 'bold', marginBottom: '8px', letterSpacing: '1px' }}>
                    2. STUDENT CATEGORY
                  </label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <div
                      className="btn-primary"
                      style={{ flex: 1, padding: '8px 10px', fontSize: '0.82rem', borderColor: '#00f0ff', color: '#040711', background: '#00f0ff', textAlign: 'center', fontWeight: 'bold' }}
                    >
                      UG (UNDERGRADUATE) — {ugCount} PARTICIPANTS
                    </div>
                  </div>
                </div>

                {/* 3. Event Title Input */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--accent-cyan)', fontWeight: 'bold', marginBottom: '8px', letterSpacing: '1px' }}>
                    3. EVENT TITLE HEADER
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    value={reportEventName}
                    onChange={(e) => setReportEventName(e.target.value)}
                    placeholder="e.g. CODATHAN - DEBUGGING EVENT"
                    style={{ padding: '8px 12px', fontSize: '0.9rem' }}
                  />
                </div>

                {/* 4. Judge & Staff E-Signature Upload Studio */}
                <div style={{ gridColumn: '1 / -1', borderTop: '1px dashed rgba(255,255,255,0.1)', paddingTop: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--accent-cyan)', fontWeight: 'bold', marginBottom: '10px', letterSpacing: '1px' }}>
                    4. STAFF & JUDGE E-SIGNATURES (RIGHT-ALIGNED AT BOTTOM OF PDF)
                  </label>

                  {/* Grid of signature cards for each title */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginBottom: '1.2rem' }}>
                    {judgeSignatures.map((sig, i) => (
                      <div key={i} style={{ background: 'rgba(0, 240, 255, 0.05)', border: '1px solid rgba(0, 240, 255, 0.2)', borderRadius: '8px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <strong style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>✍️ {sig}</strong>
                          <button onClick={() => handleRemoveJudgeSig(i)} style={{ background: 'transparent', border: 'none', color: 'var(--accent-pink)', cursor: 'pointer', padding: 0 }} title="Remove this signature box">
                            <Trash2 size={16} />
                          </button>
                        </div>

                        {/* Preview of E-Sign if exists */}
                        {esignMap[sig] ? (
                          <div style={{ background: 'white', padding: '10px', borderRadius: '4px', textAlign: 'center', position: 'relative' }}>
                            <img src={esignMap[sig]} alt={sig} style={{ height: '80px', maxWidth: '100%', objectFit: 'contain', margin: '0 auto', display: 'block' }} />
                            <button
                              onClick={() => setEsignMap(prev => { const copy = { ...prev }; delete copy[sig]; return copy; })}
                              style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(255,0,0,0.8)', color: 'white', border: 'none', borderRadius: '4px', fontSize: '0.7rem', padding: '2px 6px', cursor: 'pointer' }}
                            >
                              Clear
                            </button>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', gap: '0.5rem', marginTop: 'auto' }}>
                            <label className="btn-secondary" style={{ flex: 1, padding: '6px 8px', fontSize: '0.8rem', textAlign: 'center', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', margin: 0 }}>
                              <Upload size={14} /> Upload Image
                              <input type="file" accept="image/*" onChange={(e) => handleFileUpload(sig, e)} style={{ display: 'none' }} />
                            </label>
                            <button onClick={() => setDrawingSigTitle(sig)} className="btn-secondary" style={{ flex: 1, padding: '6px 8px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', borderColor: 'var(--accent-cyan)', color: 'var(--accent-cyan)' }}>
                              <PenTool size={14} /> Draw Pad
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <div style={{ display: 'flex', gap: '0.6rem', maxWidth: '500px' }}>
                    <input
                      type="text"
                      className="input-field"
                      value={newSigTitle}
                      onChange={(e) => setNewSigTitle(e.target.value)}
                      placeholder="Add another judge/staff title (e.g. Dr. A. Sharma - Judge 1)"
                      style={{ padding: '8px 12px', fontSize: '0.88rem' }}
                    />
                    <button onClick={handleAddJudgeSig} className="btn-secondary" style={{ padding: '8px 16px', whiteSpace: 'nowrap' }}>
                      + Add Signature Box
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Printable Area (#print-area) exact to @pdf format ─────── */}
            {renderSharedPrintableSection()}
          </div>
        );
      
      default: return null;
    }
  };

  return (
    <>
      <LoadingOverlay isLoading={isLoading} />
      {popup && <PopupMessage message={popup.message} type={popup.type} onClose={() => setPopup(null)} />}

      {/* ── TOP-LEVEL BULK UPLOAD MODAL (FULL VIEWPORT CENTERED) ── */}
      {isBulkModalOpen && (
        <div 
          style={{ 
            position: 'fixed', 
            inset: 0, 
            width: '100vw', 
            height: '100vh', 
            background: 'rgba(3, 7, 20, 0.88)', 
            backdropFilter: 'blur(16px)', 
            zIndex: 999999, 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            padding: '1.5rem',
            boxSizing: 'border-box'
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsBulkModalOpen(false);
            }
          }}
        >
          <div 
            style={{ 
              width: '100%', 
              maxWidth: '820px', 
              maxHeight: '90vh', 
              background: '#070f24', 
              border: '2px solid var(--accent-cyan)', 
              borderRadius: '16px', 
              boxShadow: '0 0 50px rgba(0, 240, 255, 0.4), inset 0 0 20px rgba(0, 240, 255, 0.05)', 
              display: 'flex', 
              flexDirection: 'column', 
              overflow: 'hidden',
              animation: 'slideUpFade 0.25s ease-out'
            }}
          >
            {/* Modal Header */}
            <div style={{ padding: '1.2rem 1.8rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(0, 240, 255, 0.2)', background: 'rgba(0, 240, 255, 0.04)' }}>
              <div>
                <h3 className="glow-text-cyan" style={{ margin: 0, fontSize: '1.35rem', letterSpacing: '1px' }}>
                  📥 BULK UPLOAD QUESTIONS (JSON)
                </h3>
                <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
                  Upload C++ questions in one quick step
                </p>
              </div>
              <button 
                onClick={() => { setIsBulkModalOpen(false); setBulkJsonInput(''); setBulkImportProgress(''); setLoadedFileName(''); }} 
                style={{ background: 'rgba(255, 255, 255, 0.06)', border: '1px solid rgba(255, 255, 255, 0.15)', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', cursor: 'pointer', transition: 'all 0.2s' }}
                onMouseEnter={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = 'var(--accent-cyan)'; }}
                onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)'; }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '1.5rem 1.8rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
              
              {/* Action Toolbar */}
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
                <label 
                  className="btn-primary" 
                  style={{ 
                    display: 'inline-flex', 
                    alignItems: 'center', 
                    gap: '8px', 
                    cursor: 'pointer', 
                    padding: '10px 20px', 
                    fontSize: '0.88rem',
                    fontWeight: 'bold'
                  }}
                >
                  <Upload size={16} /> Choose .JSON File from Computer
                  <input
                    type="file"
                    accept=".json"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (!file) return;
                      setLoadedFileName(file.name);
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        setBulkJsonInput(event.target.result);
                      };
                      reader.readAsText(file);
                    }}
                  />
                </label>

                <button
                  type="button"
                  onClick={handleDownloadSampleTemplate}
                  className="btn-secondary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 18px', fontSize: '0.88rem' }}
                >
                  <FileDown size={16} /> Download Sample Template
                </button>

                {loadedFileName && (
                  <span style={{ fontSize: '0.82rem', padding: '4px 12px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.15)', color: '#10B981', border: '1px solid #10B981', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <CheckCircle size={14} /> {loadedFileName}
                  </span>
                )}
              </div>

              {/* JSON Editor Box */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.82rem', color: 'var(--accent-cyan)', fontWeight: 'bold', letterSpacing: '0.5px' }}>
                  OR PASTE / EDIT JSON ARRAY DIRECTLY:
                </label>
                <textarea
                  className="input-field"
                  rows="11"
                  value={bulkJsonInput}
                  onChange={(e) => setBulkJsonInput(e.target.value)}
                  placeholder='[&#10;  {&#10;    "title": "Bug Title",&#10;    "phase": "c",&#10;    "description": "Bug description...",&#10;    "expectedOutput": "Expected console output",&#10;    "points": 100,&#10;    "variants": {&#10;      "c": {&#10;        "initialCode": "...",&#10;        "correctCode": "...",&#10;        "errorLines": "2, 5|14"&#10;      }&#10;    }&#10;  }&#10;]'
                  style={{ 
                    fontFamily: 'Consolas, Monaco, "Courier New", monospace', 
                    fontSize: '0.84rem', 
                    background: '#030816',
                    border: '1px solid rgba(0, 240, 255, 0.3)',
                    color: '#00f0ff',
                    lineHeight: '1.5',
                    borderRadius: '8px',
                    padding: '12px',
                    whiteSpace: 'pre',
                    resize: 'vertical'
                  }}
                />
              </div>

              {bulkImportProgress && (
                <div style={{ padding: '10px 14px', background: 'rgba(0, 240, 255, 0.1)', border: '1px solid var(--accent-cyan)', borderRadius: '8px', color: 'var(--accent-cyan)', fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} />
                  <span>{bulkImportProgress}</span>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div style={{ padding: '1rem 1.8rem', borderTop: '1px solid rgba(0, 240, 255, 0.2)', background: 'rgba(3, 7, 20, 0.95)', display: 'flex', justifyContent: 'flex-end', gap: '1rem', alignItems: 'center' }}>
              <button
                type="button"
                onClick={() => { setIsBulkModalOpen(false); setBulkJsonInput(''); setBulkImportProgress(''); setLoadedFileName(''); }}
                className="btn-secondary"
                style={{ padding: '10px 20px', fontSize: '0.9rem' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleBulkImportQuestions(bulkJsonInput)}
                className="btn-primary"
                disabled={!bulkJsonInput.trim() || isLoading}
                style={{ 
                  padding: '10px 26px', 
                  fontSize: '0.92rem', 
                  fontWeight: 'bold',
                  boxShadow: '0 0 20px rgba(0, 240, 255, 0.4)',
                  cursor: (!bulkJsonInput.trim() || isLoading) ? 'not-allowed' : 'pointer'
                }}
              >
                🚀 Import & Save to Firestore
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden' }}>
        
        {/* Sidebar Navigation with Scrollbar */}
        <div className="no-print" style={{ width: '260px', background: 'var(--bg-panel)', borderRight: '1px solid var(--border-subtle)', padding: '1.5rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', zIndex: 10, overflowY: 'auto', flexShrink: 0 }}>
          <div style={{ textAlign: 'center', marginBottom: '1.5rem', flexShrink: 0 }}>
            <h2 className="glow-text-cyan" style={{ fontSize: '1.2rem', margin: 0 }}>ADMIN CONSOLE</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>SYSTEM V2.0</p>
          </div>
          
          <a href="/leaderboard" target="_blank" rel="noreferrer" className="sidebar-btn"><Trophy size={18} /> Leaderboard</a>
          <button onClick={() => setActiveTab('branding')} className={`sidebar-btn ${activeTab === 'branding' ? 'active' : ''}`}><Sparkles size={18} /> Page Content & Branding</button>
          <button onClick={() => setActiveTab('event')} className={`sidebar-btn ${activeTab === 'event' ? 'active' : ''}`}><Clock size={18} /> Round Setting</button>
          <button onClick={() => setActiveTab('questions')} className={`sidebar-btn ${activeTab === 'questions' ? 'active' : ''}`}><FileText size={18} /> Questions</button>
          <button onClick={() => setActiveTab('users')} className={`sidebar-btn ${activeTab === 'users' ? 'active' : ''}`}><Users size={18} /> User Management</button>
          <button onClick={() => setActiveTab('results')} className={`sidebar-btn ${activeTab === 'results' ? 'active' : ''}`}><FileDown size={18} /> Results & PDF</button>
          <button onClick={() => setActiveTab('esign')} className={`sidebar-btn ${activeTab === 'esign' ? 'active' : ''}`}><PenTool size={18} /> Staff E-Sign & PDF</button>
          <button onClick={() => setActiveTab('submissions')} className={`sidebar-btn ${activeTab === 'submissions' ? 'active' : ''}`}><Code size={18} /> Submissions</button>
          <button onClick={() => setActiveTab('points')} className={`sidebar-btn ${activeTab === 'points' ? 'active' : ''}`}><Calculator size={18} /> Point Distribution</button>
          <button onClick={() => setActiveTab('languages')} className={`sidebar-btn ${activeTab === 'languages' ? 'active' : ''}`}><Sliders size={18} /> Language Settings</button>
          
          <div style={{ marginTop: 'auto' }}>
            <button onClick={handleResetData} className="sidebar-btn" style={{ color: 'var(--accent-magenta)' }}><Trash2 size={18} /> Reset Data</button>
          </div>
        </div>

        {/* Main Content Area */}
        <div style={{ flex: 1, padding: '2rem', overflowY: 'auto' }}>
          {renderContent()}
        </div>
      </div>
    </>
  );
};

export default AdminDashboard;
