import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabase';
import { getSortedParticipantsByCategory } from '../utils/ranking';
import { Trophy, Award, Clock, Code, ShieldAlert, Sparkles, RefreshCw, ArrowLeft, GraduationCap } from 'lucide-react';

const MEDAL_INFO = [
  { rank: 1, medal: '🥇', title: 'CHAMPION (1ST PLACE)', color: '#FFD700', glow: 'rgba(255, 215, 0, 0.4)', height: '440px', order: 2 },
  { rank: 2, medal: '🥈', title: 'RUNNER UP (2ND PLACE)', color: '#C0C0C0', glow: 'rgba(192, 192, 192, 0.35)', height: '390px', order: 1 },
  { rank: 3, medal: '🥉', title: 'SECOND RUNNER UP (3RD PLACE)', color: '#CD7F32', glow: 'rgba(205, 127, 50, 0.35)', height: '360px', order: 3 }
];

const TopWinnersPage = () => {
  const [allUsers, setAllUsers] = useState([]);
  const [category] = useState('UG');
  const [loading, setLoading] = useState(true);
  const [revealedIndex, setRevealedIndex] = useState(-1);

  const fetchWinners = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*');

      if (error) {
        console.error('Error fetching winners:', error);
        return;
      }

      setAllUsers(data || []);
    } catch (err) {
      console.error("Error fetching top winners:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWinners();

    const channel = supabase
      .channel('winners:users')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'users' },
        () => fetchWinners()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const users = getSortedParticipantsByCategory(allUsers, 'UG').slice(0, 3);

  const triggerRevealSequence = () => {
    setRevealedIndex(-1);
    setTimeout(() => setRevealedIndex(3), 300); // Reveal 3rd
    setTimeout(() => setRevealedIndex(2), 1100); // Reveal 2nd
    setTimeout(() => setRevealedIndex(1), 2200); // Reveal 1st Champion!
  };

  useEffect(() => {
    if (!loading && users.length > 0) {
      triggerRevealSequence();
    }
  }, [loading, allUsers.length]);

  const formatTime = (ms) => {
    if (!ms) return 'N/A';
    const totalSecs = Math.floor(ms / 1000);
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins}m ${secs.toString().padStart(2, '0')}s`;
  };

  return (
    <div style={{
      minHeight: '100vh',
      padding: '2rem',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      background: 'radial-gradient(circle at 50% 20%, #20050c 0%, #080204 60%, #000000 100%)',
      color: '#fff',
      overflowX: 'hidden'
    }}>
      <style>{`
        @keyframes crownPulse {
          0%, 100% { transform: scale(1) rotate(0deg); filter: drop-shadow(0 0 15px rgba(255,215,0,0.8)); }
          50% { transform: scale(1.15) rotate(3deg); filter: drop-shadow(0 0 30px rgba(255,215,0,1)); }
        }
        @keyframes podiumRise {
          from { opacity: 0; transform: translateY(60px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes shine {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .podium-card {
          transition: all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        .podium-card:hover {
          transform: translateY(-8px) scale(1.02);
        }
        .crown-glow {
          animation: crownPulse 2.5s infinite ease-in-out;
        }
      `}</style>

      {/* Top Navigation Bar */}
      <div style={{ maxWidth: '1200px', width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <Link to="/leaderboard" style={{
          display: 'inline-flex', alignItems: 'center', gap: '8px',
          color: 'var(--text-secondary)', textDecoration: 'none',
          padding: '8px 16px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)',
          border: '1px solid var(--border-subtle)', transition: 'all 0.2s'
        }}>
          <ArrowLeft size={16} /> BACK TO FULL LEADERBOARD
        </Link>
        <button
          onClick={triggerRevealSequence}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            background: 'rgba(222, 6, 6, 0.15)', color: '#de0606',
            border: '1px solid #de0606', padding: '8px 16px',
            borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold'
          }}
        >
          <RefreshCw size={16} /> REPLAY CEREMONY
        </button>
      </div>

      {/* Main Showcase Header */}
      <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(255, 215, 0, 0.1)', border: '1px solid rgba(255, 215, 0, 0.3)', padding: '6px 16px', borderRadius: '20px', marginBottom: '1rem' }}>
          <Sparkles size={16} color="#FFD700" />
          <span style={{ color: '#FFD700', fontSize: '0.85rem', fontWeight: 'bold', letterSpacing: '2px' }}>OFFICIAL WINNERS PODIUM</span>
        </div>
        <h1 className="glow-text-red" style={{ fontSize: '3rem', margin: '0 0 0.5rem 0', letterSpacing: '3px' }}>
          🏆 CODATHAN TOP 3 CHAMPIONS
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem', margin: 0 }}>
          Undergraduate Stream (UG) Highest Scoring Finalists
        </p>
      </div>

      {/* Podium Grid */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-end',
        gap: '2rem',
        maxWidth: '1100px',
        width: '100%',
        margin: '0 auto',
        flexWrap: 'wrap',
        minHeight: '480px'
      }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-secondary)' }}>Calculating podium rankings...</div>
        ) : users.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-secondary)' }}>No participants scored yet.</div>
        ) : (
          [1, 0, 2].map((winnerIndex) => {
            const user = users[winnerIndex];
            const medal = MEDAL_INFO[winnerIndex];
            if (!user) return null;

            const isRevealed = (winnerIndex === 2 && revealedIndex >= 3) ||
                               (winnerIndex === 1 && revealedIndex >= 2) ||
                               (winnerIndex === 0 && revealedIndex >= 1);

            const userRoll = user.roll_no ?? user.rollNo ?? 'N/A';
            const userScore = user.score ?? 0;
            const userSubs = user.total_submissions_count ?? user.totalSubmissionsCount ?? 0;
            const userElapsed = user.elapsed_time_ms ?? user.elapsedTimeMs ?? 0;
            const tabSwitches = user.tab_switches ?? user.tabSwitches ?? 0;

            return (
              <div
                key={user.id || userRoll}
                className="podium-card"
                style={{
                  order: medal.order,
                  width: '320px',
                  minHeight: medal.height,
                  background: 'linear-gradient(180deg, rgba(25, 10, 16, 0.9) 0%, rgba(10, 4, 7, 0.95) 100%)',
                  borderRadius: '20px',
                  border: `2px solid ${medal.color}`,
                  boxShadow: `0 0 35px ${medal.glow}, inset 0 0 20px rgba(0,0,0,0.8)`,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  padding: '2rem 1.5rem',
                  position: 'relative',
                  opacity: isRevealed ? 1 : 0,
                  transform: isRevealed ? 'translateY(0)' : 'translateY(40px)',
                  transition: 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1)'
                }}
              >
                {winnerIndex === 0 && (
                  <div className="crown-glow" style={{ position: 'absolute', top: '-38px', fontSize: '2.5rem' }}>
                    👑
                  </div>
                )}

                {/* Medal Icon Badge */}
                <div style={{
                  width: '64px', height: '64px', borderRadius: '50%',
                  background: `radial-gradient(circle, ${medal.color}33 0%, rgba(0,0,0,0.6) 100%)`,
                  border: `2px solid ${medal.color}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '2rem', marginBottom: '1rem',
                  boxShadow: `0 0 20px ${medal.color}66`
                }}>
                  {medal.medal}
                </div>

                <span style={{ color: medal.color, fontSize: '0.8rem', fontWeight: 'bold', letterSpacing: '2px', marginBottom: '0.5rem' }}>
                  {medal.title}
                </span>

                <h2 style={{ fontSize: '1.4rem', margin: '0 0 0.5rem 0', textAlign: 'center', fontWeight: 'bold', color: '#fff' }}>
                  {user.name || 'Anonymous'}
                </h2>

                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.08)', padding: '4px 12px', borderRadius: '12px', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                  <span>LOT / ROLL:</span> <strong style={{ color: '#fff', fontFamily: 'var(--font-mono)' }}>{userRoll}</strong>
                </div>

                {/* Score Showcase */}
                <div style={{ width: '100%', background: 'rgba(0,0,0,0.4)', borderRadius: '12px', padding: '1rem', border: '1px solid rgba(255,255,255,0.06)', marginBottom: '1rem', textAlign: 'center' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', letterSpacing: '1px' }}>FINAL SCORE</span>
                  <div style={{ fontSize: '2.4rem', fontWeight: 'bold', color: medal.color, textShadow: `0 0 20px ${medal.color}88` }}>
                    {userScore} <span style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>PTS</span>
                  </div>
                </div>

                {/* Detailed Stats */}
                <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.85rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Code size={14} /> Total Executions:</span>
                    <strong style={{ color: '#fff' }}>{userSubs}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Clock size={14} /> Time Taken:</span>
                    <strong style={{ color: '#fff' }}>{formatTime(userElapsed)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><ShieldAlert size={14} /> Tab Violations:</span>
                    <strong style={{ color: tabSwitches > 0 ? '#ff4d6d' : '#007fd7' }}>{tabSwitches}</strong>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default TopWinnersPage;
