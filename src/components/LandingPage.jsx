import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import LoadingOverlay from './LoadingOverlay';
import PopupMessage from './PopupMessage';
import { clearFullUserSession } from '../utils/drafts';

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

// ── Landing Page ─────────────────────────────────────────────────
const LandingPage = () => {
  const [showModal, setShowModal] = useState(false);
  const [rollNo, setRollNo] = useState('');
  const [language, setLanguage] = useState('cpp');
  const [loading, setLoading] = useState(false);
  const [langSettings, setLangSettings] = useState({ c: true, cpp: true });
  const [branding, setBranding] = useState(DEFAULT_BRANDING);
  const [usersList, setUsersList] = useState([]);
  const [questionsCount, setQuestionsCount] = useState(2);
  const [popup, setPopup] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Clear any previous participant's session from localStorage when visiting landing page
    clearFullUserSession();

    // 1. Fetch all settings and users initially from Supabase
    const fetchInitialData = async () => {
      try {
        // Fetch Settings
        const { data: settingsRows } = await supabase.from('settings').select('*');
        if (settingsRows) {
          settingsRows.forEach(row => {
            const data = row.data || {};
            if (row.id === 'event') {
              if (data.questionsPerStudent !== undefined && !isNaN(parseInt(data.questionsPerStudent))) {
                setQuestionsCount(parseInt(data.questionsPerStudent));
              }
            } else if (row.id === 'language') {
              setLangSettings(data);
              setLanguage('cpp');
            } else if (row.id === 'branding') {
              setBranding(prev => ({
                collegeName: data.collegeName !== undefined ? data.collegeName : prev.collegeName,
                departmentName: data.departmentName !== undefined ? data.departmentName : prev.departmentName,
                mainTitle: data.mainTitle !== undefined ? data.mainTitle : prev.mainTitle,
                associationTitle: data.associationTitle !== undefined ? data.associationTitle : prev.associationTitle,
                tagline: data.tagline !== undefined ? data.tagline : prev.tagline,
                buttonText: data.buttonText !== undefined ? data.buttonText : prev.buttonText,
                footerText: data.footerText !== undefined ? data.footerText : prev.footerText,
                roundsText: data.roundsText !== undefined ? data.roundsText : prev.roundsText,
                modalTitle: data.modalTitle !== undefined ? data.modalTitle : prev.modalTitle
              }));
            }
          });
        }

        // Fetch Users
        const { data: usersRows } = await supabase.from('users').select('*');
        if (usersRows) {
          const formatted = usersRows.map(u => ({
            id: u.id,
            rollNo: u.roll_no || u.rollNo,
            name: u.name,
            category: u.category,
            ...u
          }));
          setUsersList(formatted);
        }
      } catch (err) {
        console.error('Error fetching initial LandingPage data from Supabase:', err);
      }
    };

    fetchInitialData();

    // 2. Realtime Subscription for settings changes
    const settingsChannel = supabase
      .channel('landing:settings')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'settings' },
        (payload) => {
          const row = payload.new;
          if (!row) return;
          const data = row.data || {};

          if (row.id === 'event') {
            if (data.questionsPerStudent !== undefined && !isNaN(parseInt(data.questionsPerStudent))) {
              setQuestionsCount(parseInt(data.questionsPerStudent));
            }
          } else if (row.id === 'language') {
            setLangSettings(data);
          } else if (row.id === 'branding') {
            setBranding(prev => ({
              collegeName: data.collegeName !== undefined ? data.collegeName : prev.collegeName,
              departmentName: data.departmentName !== undefined ? data.departmentName : prev.departmentName,
              mainTitle: data.mainTitle !== undefined ? data.mainTitle : prev.mainTitle,
              associationTitle: data.associationTitle !== undefined ? data.associationTitle : prev.associationTitle,
              tagline: data.tagline !== undefined ? data.tagline : prev.tagline,
              buttonText: data.buttonText !== undefined ? data.buttonText : prev.buttonText,
              footerText: data.footerText !== undefined ? data.footerText : prev.footerText,
              roundsText: data.roundsText !== undefined ? data.roundsText : prev.roundsText,
              modalTitle: data.modalTitle !== undefined ? data.modalTitle : prev.modalTitle
            }));
          }
        }
      )
      .subscribe();

    // 3. Realtime Subscription for users table
    const usersChannel = supabase
      .channel('landing:users')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'users' },
        async () => {
          const { data: usersRows } = await supabase.from('users').select('*');
          if (usersRows) {
            const formatted = usersRows.map(u => ({
              id: u.id,
              rollNo: u.roll_no || u.rollNo,
              name: u.name,
              category: u.category,
              ...u
            }));
            setUsersList(formatted);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(settingsChannel);
      supabase.removeChannel(usersChannel);
    };
  }, [language]);

  const detectedUser = usersList.find(u => {
    const uRoll = u.rollNo || u.roll_no;
    if (!uRoll || !rollNo) return false;
    const dbRoll = String(uRoll).trim().toLowerCase();
    const inputRoll = String(rollNo).trim().toLowerCase();
    if (dbRoll === inputRoll) return true;
    const dbNum = dbRoll.replace(/[^0-9a-z]/g, '');
    const inputNum = inputRoll.replace(/[^0-9a-z]/g, '');
    return dbNum !== '' && dbNum === inputNum;
  });

  const handleInitiateSession = async (e) => {
    e.preventDefault();
    if (!rollNo) return;
    if (!detectedUser) {
      setPopup({ message: `Lot #${rollNo} not registered! Please ask the Admin to register your Lot number first.`, type: "error" });
      return;
    }
    setLoading(true);
    try {
      const userId = detectedUser.id;
      const userRoll = detectedUser.rollNo || detectedUser.roll_no;
      const userName = detectedUser.name || `Lot ${userRoll}`;
      localStorage.setItem('debugEventUserId', userId);
      localStorage.setItem('debugEventUserName', userName);

      const { data: eventRow } = await supabase
        .from('settings')
        .select('data')
        .eq('id', 'event')
        .single();

      if (!eventRow?.data) {
        await supabase.from('settings').upsert({
          id: 'event',
          data: { status: 'waiting', endTime: null, durationMinutes: 60 }
        });
        navigate('/waiting');
      } else {
        const eventData = eventRow.data;
        if (eventData.status === 'active') navigate('/selection');
        else if (eventData.status === 'ended') navigate('/thank-you');
        else navigate('/waiting');
      }
    } catch (error) {
      console.error("Error initiating session: ", error);
      setPopup({ message: "Failed to connect. Please try again.", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <LoadingOverlay isLoading={loading} />
      {popup && <PopupMessage message={popup.message} type={popup.type} onClose={() => setPopup(null)} onConfirm={popup.onConfirm} />}

      <div style={{
        position: 'fixed', top: 0, left: 0, zIndex: 10,
        height: '100vh', width: '100vw',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center',
        overflow: 'hidden',
        background: 'radial-gradient(ellipse at 15% 25%, #220309 0%, transparent 55%), radial-gradient(ellipse at 85% 30%, #150206 0%, transparent 55%), linear-gradient(135deg, #0c0205 0%, #060608 50%, #0a0204 100%)'
      }}>

        {/* ── STATIC & SCANNER EFFECT CYBER BACKGROUND ── */}
        <div style={{
          position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
          zIndex: 0, pointerEvents: 'none', overflow: 'hidden'
        }}>
          {/* Subtle Flat HUD Command Grid Overlay */}
          <div style={{
            position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
            background: 'linear-gradient(rgba(222, 6, 6, 0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(222, 6, 6, 0.08) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
            opacity: 0.15,
            maskImage: 'radial-gradient(circle at center, black 40%, transparent 95%)',
            WebkitMaskImage: 'radial-gradient(circle at center, black 40%, transparent 95%)'
          }} />

          {/* Scanner Effect: Laser Scan Beam */}
          <div style={{
            position: 'absolute', left: 0, width: '100%', height: '2px',
            background: 'linear-gradient(90deg, transparent, rgba(222, 6, 6, 0.5), rgba(226, 226, 226, 0.7), rgba(0, 127, 215, 0.5), transparent)',
            boxShadow: '0 0 15px rgba(222, 6, 6, 0.5)',
            animation: 'laserScan 8s ease-in-out infinite',
            opacity: 0.45,
            zIndex: 1
          }} />

          {/* Scanner Effect: Sweep Glow Trail */}
          <div style={{
            position: 'absolute', left: 0, width: '100%', height: '140px',
            background: 'linear-gradient(to bottom, transparent, rgba(222, 6, 6, 0.04), transparent)',
            animation: 'laserScan 8s ease-in-out infinite',
            opacity: 0.4,
            zIndex: 0
          }} />

          {/* Soft Ambient Aurora Gradient Waves */}
          <div style={{
            position: 'absolute', top: '-10%', left: '20%',
            width: '60vw', height: '60vh', borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(222, 6, 6, 0.12) 0%, transparent 70%)',
            filter: 'blur(90px)'
          }} />
          <div style={{
            position: 'absolute', bottom: '-15%', right: '15%',
            width: '65vw', height: '65vh', borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(0, 127, 215, 0.1) 0%, transparent 70%)',
            filter: 'blur(90px)'
          }} />
        </div>

        {/* ── HERO (flex:1 means it fills remaining height) ── */}
        <div style={{
          flex: 1,
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          paddingBottom: '30px',
          position: 'relative', zIndex: 2,
          transition: 'opacity 0.4s, filter 0.4s',
          opacity: showModal ? 0.07 : 1,
          filter: showModal ? 'blur(5px)' : 'none',
          pointerEvents: showModal ? 'none' : 'auto',
        }}>
          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

            {/* College panel */}
            <div style={{
              border: '1px solid rgba(222, 6, 6, 0.65)',
              padding: '0.8rem 3rem',
              marginBottom: '2rem',
              background: 'rgba(15, 10, 14, 0.85)',
              backdropFilter: 'blur(12px)',
              boxShadow: '0 0 25px rgba(222, 6, 6, 0.25), inset 0 0 15px rgba(222, 6, 6, 0.1)',
              borderRadius: '6px'
            }}>
              <p style={{
                fontSize: '1.05rem', color: '#e2e2e2', margin: 0,
                letterSpacing: '3.5px', fontFamily: 'var(--font-orbitron)',
                fontWeight: '700', textTransform: 'uppercase'
              }}>
                {branding.collegeName}
              </p>
              <p style={{
                fontSize: '0.85rem', color: '#de0606', margin: '5px 0 0 0',
                letterSpacing: '2.5px', fontFamily: 'var(--font-orbitron)',
                fontWeight: '600', textTransform: 'uppercase'
              }}>
                {branding.departmentName}
              </p>
            </div>

            {/* SOFTTECH / ANALYTICAL */}
            <h1 style={{
              fontSize: 'clamp(3.6rem, 8vw, 6.2rem)',
              margin: '0', lineHeight: 1.05,
              fontFamily: 'var(--font-orbitron)',
              color: '#FFFFFF',
              textShadow: '0 0 20px rgba(226, 226, 226, 0.6), 0 0 45px rgba(222, 6, 6, 0.85), 0 0 80px rgba(172, 2, 2, 0.5)',
              letterSpacing: '12px', fontWeight: '900',
              textTransform: 'uppercase'
            }}>{branding.mainTitle}</h1>

            {/* ASSESSMENT / ASSOCIATION */}
            <h2 style={{
              fontSize: 'clamp(1.8rem, 4.2vw, 3.2rem)',
              margin: '0.2rem 0 1.8rem 0',
              fontFamily: 'var(--font-orbitron)',
              color: '#de0606',
              textShadow: '0 0 25px rgba(222, 6, 6, 0.95), 0 0 50px rgba(172, 2, 2, 0.6)',
              letterSpacing: '16px', fontWeight: '800',
              textTransform: 'uppercase'
            }}>{branding.associationTitle}</h2>

            {/* Subtitle */}
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '12px',
              padding: '6px 20px',
              background: 'rgba(63, 63, 63, 0.35)',
              border: '1px solid #3f3f3f',
              borderRadius: '20px',
              marginBottom: '2.2rem'
            }}>
              <span style={{ color: '#007fd7', fontSize: '0.85rem' }}>✦</span>
              <span style={{
                color: '#e2e2e2', letterSpacing: '5px', fontSize: '0.85rem',
                textTransform: 'uppercase',
                fontFamily: 'var(--font-orbitron)', fontWeight: '600'
              }}>
                {branding.tagline}
              </span>
              <span style={{ color: '#007fd7', fontSize: '0.85rem' }}>✦</span>
            </div>

            {/* CTA */}
            <button
              className="btn-primary"
              style={{
                fontSize: '1.05rem', padding: '14px 50px', letterSpacing: '4px',
                fontFamily: 'var(--font-orbitron)', fontWeight: '800',
                color: '#ffffff', background: 'linear-gradient(135deg, #de0606 0%, #ac0202 100%)',
                border: '1px solid rgba(226, 226, 226, 0.45)', borderRadius: '6px',
                boxShadow: '0 0 30px rgba(222, 6, 6, 0.65), 0 0 10px rgba(0, 127, 215, 0.3)',
                textTransform: 'uppercase',
                cursor: 'pointer'
              }}
              onClick={() => setShowModal(true)}
            >
              &gt; {branding.buttonText}
            </button>

          </div>
        </div>
        {/* ── END HERO ── */}

        {/* ── COPYRIGHT ── */}
        <p style={{
          position: 'fixed',
          bottom: 0, left: 0, right: 0,
          textAlign: 'center',
          color: 'var(--text-secondary)',
          fontSize: '0.68rem',
          letterSpacing: '1px',
          fontFamily: 'var(--font-body)',
          padding: '6px 0 8px 0',
          margin: 0,
          zIndex: 5,
          background: 'transparent',
        }}>
          {branding.footerText}
        </p>

      </div>

      {/* Login Modal */}
      {showModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 20
        }}>
          <div className="glass-panel" style={{ padding: '2rem', width: '100%', maxWidth: '440px', textAlign: 'center', border: '1px solid #3f3f3f' }}>
            <h2 className="glow-text-red" style={{ fontSize: '1.4rem', marginBottom: '1.5rem' }}>{branding.modalTitle || 'SYSTEM ACCESS'}</h2>
            <form onSubmit={handleInitiateSession} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', textAlign: 'left' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.4rem', color: '#de0606', fontSize: '0.78rem', letterSpacing: '1.5px', fontFamily: 'var(--font-heading)' }}>TEAM IDENTIFIER (LOT #)</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Enter Lot # (e.g. 01)"
                  value={rollNo}
                  onChange={e => setRollNo(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              {/* Automatically Detected Participant Box */}
              {detectedUser ? (
                <div style={{
                  background: 'rgba(0, 127, 215, 0.1)',
                  border: '1px solid #007fd7',
                  padding: '0.85rem 1rem',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  boxShadow: '0 0 16px rgba(0, 127, 215, 0.25)'
                }}>
                  <div style={{ textAlign: 'left' }}>
                    <span style={{ fontSize: '0.7rem', color: '#007fd7', letterSpacing: '1.5px', fontWeight: 'bold', display: 'block', textTransform: 'uppercase' }}>
                      ✓ DETECTED PARTICIPANT
                    </span>
                    <strong style={{ fontSize: '1.08rem', color: '#e2e2e2' }}>
                      {detectedUser.name}
                    </strong>
                  </div>
                  <span style={{
                    fontSize: '0.8rem',
                    background: 'linear-gradient(135deg, #de0606 0%, #ac0202 100%)',
                    color: '#ffffff',
                    fontWeight: 'bold',
                    padding: '3px 10px',
                    borderRadius: '12px',
                    fontFamily: 'var(--font-mono)'
                  }}>
                    LOT {detectedUser.rollNo || detectedUser.roll_no}
                  </span>
                </div>
              ) : rollNo.trim() !== '' ? (
                <div style={{
                  background: 'rgba(222, 6, 6, 0.08)',
                  border: '1px solid rgba(222, 6, 6, 0.4)',
                  padding: '0.75rem 1rem',
                  borderRadius: '6px',
                  textAlign: 'center',
                  color: '#de0606',
                  fontSize: '0.82rem'
                }}>
                  Lot #{rollNo} not found in registry. Ask Admin to add your Lot number.
                </div>
              ) : null}

              <div style={{ background: 'rgba(63, 63, 63, 0.25)', border: '1px solid #3f3f3f', padding: '0.75rem', borderRadius: '4px', textAlign: 'center' }}>
                <div style={{ color: '#de0606', fontSize: '0.75rem', letterSpacing: '1px', fontFamily: 'var(--font-heading)', marginBottom: '4px' }}>EVENT ROUNDS</div>
                <div style={{ color: '#e2e2e2', fontSize: '0.9rem', fontFamily: 'var(--font-mono)', fontWeight: 'bold' }}>
                  {branding.roundsText && !branding.roundsText.includes('(5 MISSIONS)')
                    ? branding.roundsText
                    : `C++ DEBUGGING (${questionsCount} MISSIONS)`}
                </div>
              </div>
              <button
                type="submit"
                className="btn-primary"
                disabled={loading || !detectedUser}
                style={{
                  marginTop: '0.4rem',
                  background: detectedUser ? 'linear-gradient(135deg, #de0606 0%, #ac0202 100%)' : 'rgba(63, 63, 63, 0.3)',
                  borderColor: detectedUser ? 'rgba(226, 226, 226, 0.4)' : '#3f3f3f',
                  color: detectedUser ? '#ffffff' : '#9e9e9e'
                }}
              >
                {loading ? 'CONNECTING...' : 'INITIATE_SESSION'}
              </button>
            </form>
            <button onClick={() => setShowModal(false)}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', marginTop: '1rem', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>
              [ ESCAPE_SEQUENCE ]
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default LandingPage;
