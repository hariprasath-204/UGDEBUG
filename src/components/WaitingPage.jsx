import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { clearAllLocalDrafts } from '../utils/drafts';
import { syncClock } from '../utils/timeSync';

const WaitingPage = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState('waiting');
  const userName = localStorage.getItem('debugEventUserName');

  useEffect(() => {
    if (!userName) {
      navigate('/');
      return;
    }

    syncClock();
    clearAllLocalDrafts();

    // 1. Fetch initial event status from Supabase
    const fetchInitialStatus = async () => {
      try {
        const { data } = await supabase
          .from('settings')
          .select('data')
          .eq('id', 'event')
          .single();

        if (data && data.data) {
          const eventData = data.data;
          setStatus(eventData.status);
          if (eventData.status === 'active') {
            navigate('/selection');
          } else if (eventData.status === 'ended') {
            navigate('/thank-you');
          } else if (eventData.status === 'waiting') {
            clearAllLocalDrafts();
          }
        }
      } catch (err) {
        console.error('Error fetching event status:', err);
      }
    };

    fetchInitialStatus();

    // 2. Realtime subscription for event status changes
    const channel = supabase
      .channel('waiting:event_status')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'settings', filter: 'id=eq.event' },
        (payload) => {
          const eventData = payload.new?.data;
          if (eventData) {
            setStatus(eventData.status);
            if (eventData.status === 'active') {
              navigate('/selection');
            } else if (eventData.status === 'ended') {
              navigate('/thank-you');
            } else if (eventData.status === 'waiting') {
              clearAllLocalDrafts();
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [navigate, userName]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', textAlign: 'center' }}>
      <h2 className="glow-text-red" style={{ fontSize: '2rem', marginBottom: '1rem' }}>WELCOME, {userName}</h2>
      
      <div className="glass-panel" style={{ padding: '3rem', maxWidth: '500px' }}>
        <h3 style={{ color: '#de0606', marginBottom: '2rem', fontSize: '1.5rem', fontFamily: 'var(--font-heading)' }}>WAITING FOR ADMIN...</h3>
        <p style={{ color: 'var(--text-primary)', marginBottom: '2rem' }}>
          Please hold on. The debugging event will commence shortly. You will be automatically redirected when the admin starts the timer.
        </p>
        
        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
          <div className="loader" style={{ 
            width: '20px', height: '20px', borderRadius: '50%', 
            background: 'linear-gradient(135deg, #de0606 0%, #ac0202 100%)', animation: 'pulse 1.5s infinite',
            boxShadow: '0 0 15px rgba(222, 6, 6, 0.65)'
          }}></div>
          <div className="loader" style={{ 
            width: '20px', height: '20px', borderRadius: '50%', 
            background: '#e2e2e2', animation: 'pulse 1.5s infinite 0.5s',
            boxShadow: '0 0 15px rgba(226, 226, 226, 0.6)'
          }}></div>
        </div>
      </div>
      
      <style>{`
        @keyframes pulse {
          0% { transform: scale(0.8); opacity: 0.5; }
          50% { transform: scale(1.2); opacity: 1; }
          100% { transform: scale(0.8); opacity: 0.5; }
        }
      `}</style>
    </div>
  );
};

export default WaitingPage;
