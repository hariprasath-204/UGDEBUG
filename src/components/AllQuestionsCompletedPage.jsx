import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { clearFullUserSession } from '../utils/drafts';

const AllQuestionsCompletedPage = () => {
  const navigate = useNavigate();
  const userId = localStorage.getItem('debugEventUserId');

  useEffect(() => {
    // Clear user session from browser storage once completed
    clearFullUserSession();

    // 1. Initial check
    const checkInitialStatus = async () => {
      try {
        const { data } = await supabase
          .from('settings')
          .select('data')
          .eq('id', 'event')
          .single();

        if (data?.data) {
          const status = data.data.status;
          if (status === 'ended' || status === 'stopped') {
            navigate('/thank-you');
          } else if (status === 'waiting') {
            navigate('/waiting');
          }
        }
      } catch (err) {
        console.error('Error fetching event in AllQuestionsCompletedPage:', err);
      }
    };
    checkInitialStatus();

    // 2. Realtime listener for event
    const eventChannel = supabase
      .channel('all_completed:event')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'settings', filter: 'id=eq.event' },
        (payload) => {
          const ev = payload.new?.data;
          if (ev) {
            const status = ev.status;
            if (status === 'ended' || status === 'stopped') {
              navigate('/thank-you');
            } else if (status === 'waiting') {
              navigate('/waiting');
            }
          }
        }
      )
      .subscribe();

    // 3. Realtime listener for user
    let userChannel = null;
    if (userId) {
      userChannel = supabase
        .channel(`all_completed:user:${userId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'users', filter: `id=eq.${userId}` },
          (payload) => {
            const userData = payload.new;
            if (userData && !userData.is_finished) {
              navigate('/selection');
            }
          }
        )
        .subscribe();
    }

    return () => {
      supabase.removeChannel(eventChannel);
      if (userChannel) supabase.removeChannel(userChannel);
    };
  }, [navigate, userId]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', textAlign: 'center' }}>
      <div className="glass-panel" style={{ padding: '3rem', maxWidth: '600px' }}>
        <h2 className="glow-text-red" style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>ALL MISSIONS ACCOMPLISHED!</h2>
        <h3 style={{ color: 'var(--text-primary)', marginBottom: '2rem', fontSize: '1.2rem', fontFamily: 'var(--font-heading)' }}>YOU HAVE SUCCESSFULLY COMPLETED ALL TASKS</h3>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
          Please wait for the admin to officially end the event and announce the final results.
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginBottom: '2rem' }}>
          <div style={{ width: '15px', height: '15px', borderRadius: '50%', background: '#de0606', animation: 'pulse 1.5s infinite', boxShadow: '0 0 12px rgba(222, 6, 6, 0.6)' }}></div>
          <div style={{ width: '15px', height: '15px', borderRadius: '50%', background: '#007fd7', animation: 'pulse 1.5s infinite 0.5s', boxShadow: '0 0 12px rgba(0, 127, 215, 0.6)' }}></div>
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

export default AllQuestionsCompletedPage;
