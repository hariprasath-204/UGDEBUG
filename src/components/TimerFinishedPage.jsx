import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { clearFullUserSession } from '../utils/drafts';
import { getNow, syncClock } from '../utils/timeSync';

const TimerFinishedPage = () => {
  const navigate = useNavigate();
  const userId = localStorage.getItem('debugEventUserId');

  useEffect(() => {
    syncClock();

    // 1. Initial Check on Event Status
    const checkInitialEvent = async () => {
      try {
        const { data } = await supabase
          .from('settings')
          .select('data')
          .eq('id', 'event')
          .single();

        if (data?.data) {
          const ev = data.data;
          if (ev.status === 'ended' || ev.status === 'stopped') {
            clearFullUserSession();
            navigate('/thank-you');
          } else if (ev.status === 'waiting') {
            clearFullUserSession();
            navigate('/waiting');
          }
        }
      } catch (err) {
        console.error('Error fetching event in TimerFinishedPage:', err);
      }
    };
    checkInitialEvent();

    // 2. Realtime Subscription to settings table
    const settingsChannel = supabase
      .channel('timer_finished:settings')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'settings', filter: 'id=eq.event' },
        async (payload) => {
          const ev = payload.new?.data;
          if (ev) {
            const status = ev.status;
            if (status === 'ended' || status === 'stopped') {
              clearFullUserSession();
              navigate('/thank-you');
            } else if (status === 'waiting') {
              clearFullUserSession();
              navigate('/waiting');
            } else if (status === 'active') {
              await syncClock();
              const end = ev.endTime ? new Date(ev.endTime).getTime() : 0;
              if (ev.endTime && !isNaN(end) && end > 0 && end - getNow() > 0) {
                const currentUserId = localStorage.getItem('debugEventUserId');
                if (currentUserId) {
                  const { data: uData } = await supabase
                    .from('users')
                    .select('is_finished')
                    .eq('id', currentUserId)
                    .single();
                  if (uData && !uData.is_finished) {
                    navigate('/selection');
                  }
                }
              }
            }
          }
        }
      )
      .subscribe();

    // 3. Realtime Subscription to current user
    let userChannel = null;
    const currentUserId = localStorage.getItem('debugEventUserId');
    if (currentUserId) {
      userChannel = supabase
        .channel(`timer_finished:user:${currentUserId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'users', filter: `id=eq.${currentUserId}` },
          async (payload) => {
            const userData = payload.new;
            if (userData && !userData.is_finished) {
              const { data: eventSnap } = await supabase
                .from('settings')
                .select('data')
                .eq('id', 'event')
                .single();
              if (eventSnap?.data) {
                const ev = eventSnap.data;
                await syncClock();
                const end = ev.endTime ? new Date(ev.endTime).getTime() : 0;
                if (ev.endTime && !isNaN(end) && end > 0 && end - getNow() <= 0) {
                  await supabase
                    .from('users')
                    .update({ is_finished: true, selected_question_id: null })
                    .eq('id', currentUserId);
                  return;
                }
              }
              navigate('/selection');
            }
          }
        )
        .subscribe();
    }

    return () => {
      supabase.removeChannel(settingsChannel);
      if (userChannel) supabase.removeChannel(userChannel);
    };
  }, [navigate, userId]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', textAlign: 'center' }}>
      <div className="glass-panel" style={{ padding: '3rem', maxWidth: '600px' }}>
        <h2 className="glow-text-red" style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>TIME IS UP!</h2>
        <h3 style={{ color: 'var(--text-primary)', marginBottom: '2rem', fontSize: '1.2rem', fontFamily: 'var(--font-heading)' }}>YOUR CODE HAS BEEN AUTO-SUBMITTED</h3>
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

export default TimerFinishedPage;
