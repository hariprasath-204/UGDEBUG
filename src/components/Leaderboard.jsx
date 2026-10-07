import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabase';
import { getSortedParticipantsByCategory } from '../utils/ranking';
import { Sparkles } from 'lucide-react';

const MEDAL = ['🥇', '🥈', '🥉'];
const MEDAL_COLORS = ['#FFD700', '#C0C0C0', '#CD7F32'];

const Leaderboard = () => {
  const [allUsers, setAllUsers] = useState([]);
  const [questionsCount, setQuestionsCount] = useState(2);
  const [loading, setLoading] = useState(true);
  const [revealed, setRevealed] = useState(false);

  const fetchLeaderboard = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, roll_no, name, category, score, is_finished, total_submissions_count, elapsed_time_ms, completed_questions, cumulative_cleared_errors, cumulative_total_errors, penalty_points, tab_switches, copy_paste_count');

      if (error) {
        console.error('Error fetching leaderboard:', error);
        return;
      }

      setAllUsers(data || []);

      const { data: eventRow } = await supabase
        .from('settings')
        .select('data')
        .eq('id', 'event')
        .single();
      if (eventRow?.data?.questionsPerStudent) {
        setQuestionsCount(parseInt(eventRow.data.questionsPerStudent) || 2);
      }
    } catch (error) {
      console.error('Error fetching leaderboard: ', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  // Trigger reveal animation after data loads
  useEffect(() => {
    if (!loading && allUsers.length > 0) {
      setTimeout(() => setRevealed(true), 100);
    }
  }, [loading, allUsers]);

  const displayedUsers = getSortedParticipantsByCategory(allUsers, 'UG');
  const ugCount = displayedUsers.length;

  return (
    <div style={{ minHeight: '100vh', padding: '2rem', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
      <div style={{ maxWidth: '1150px', width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 className="glow-text-red" style={{ margin: 0, fontSize: '2.5rem', letterSpacing: '4px' }}>
              🎓 UG LEADERBOARD
            </h1>
            <p style={{ color: 'var(--text-secondary)', margin: '4px 0 0 0', fontSize: '0.95rem', letterSpacing: '1px' }}>
              Undergraduate Students Live Standings & Rankings ({ugCount} Participants)
            </p>
          </div>
          <Link to="/winners" className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 22px', fontSize: '0.95rem', textDecoration: 'none' }}>
            <Sparkles size={18} /> 🏆 TOP 3 WINNERS SHOWCASE
          </Link>
        </div>

        <style>{`
          /* Red/Black Custom Scrollbar */
          .table-scroll-container::-webkit-scrollbar {
            width: 10px;
            height: 10px;
          }
          .table-scroll-container::-webkit-scrollbar-track {
            background: rgba(10, 10, 14, 0.85);
            border-radius: 8px;
          }
          .table-scroll-container::-webkit-scrollbar-thumb {
            background: linear-gradient(180deg, #de0606, #ac0202);
            border-radius: 8px;
            border: 2px solid #3f3f3f;
          }
          .table-scroll-container::-webkit-scrollbar-thumb:hover {
            background: linear-gradient(180deg, #e2e2e2, #de0606);
            box-shadow: 0 0 12px #de0606;
          }

          @keyframes slideInFromBottom {
            from { opacity: 0; transform: translateY(25px); }
            to   { opacity: 1; transform: translateY(0); }
          }
          .lb-row {
            opacity: 0;
            transform: translateY(25px);
          }
          .lb-row.visible {
            animation: slideInFromBottom 0.45s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          }
          .rank-badge {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 38px; height: 38px;
            border-radius: 50%;
            font-weight: bold;
            font-size: 1rem;
          }
        `}</style>

        <div className="glass-panel table-scroll-container" style={{ overflowY: 'auto', overflowX: 'auto', maxHeight: 'calc(100vh - 220px)', borderRadius: '16px', border: '1px solid #3f3f3f' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--bg-panel-hover)', boxShadow: '0 2px 10px rgba(0, 0, 0, 0.5)' }}>
              <tr style={{ color: '#de0606', fontSize: '0.85rem', letterSpacing: '1px' }}>
                <th style={{ padding: '1rem' }}>RANK</th>
                <th style={{ padding: '1rem' }}>NAME</th>
                <th style={{ padding: '1rem' }}>ROLL NUMBER</th>
                <th style={{ padding: '1rem' }}>FINAL MARK (OUT OF 10)</th>
                <th style={{ padding: '1rem' }}>EXECS</th>
                <th style={{ padding: '1rem' }}>TIME TAKEN</th>
                <th style={{ padding: '1rem' }}>WARNINGS</th>
                <th style={{ padding: '1rem' }}>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="8" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading Data...</td></tr>
              ) : displayedUsers.length === 0 ? (
                <tr><td colSpan="8" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>No participants registered yet.</td></tr>
              ) : (
                displayedUsers.map((user, index) => {
                  const tabSwitches = user.tab_switches ?? user.tabSwitches ?? 0;
                  const copyPasteCount = user.copy_paste_count ?? user.copyPasteCount ?? 0;
                  const hasWarnings = tabSwitches > 0 || copyPasteCount > 0;
                  const isTop3 = index < 3;
                  const rank = index + 1;
                  const userRoll = user.roll_no ?? user.rollNo ?? 'N/A';
                  const userExecs = user.total_submissions_count ?? user.totalSubmissionsCount ?? 0;
                  const userElapsed = user.elapsed_time_ms ?? user.elapsedTimeMs ?? 0;
                  const userFinished = user.is_finished ?? user.isFinished ?? false;
                  const qCount = questionsCount || 2;
                  const scaledMark = Math.max(0, +((user.score || 0) / qCount).toFixed(1));

                  const delay = Math.min(index * 50, 1000);

                  let rowBg = 'transparent';
                  if (index === 0) rowBg = 'rgba(255, 215, 0, 0.08)';
                  else if (index === 1) rowBg = 'rgba(192, 192, 192, 0.06)';
                  else if (index === 2) rowBg = 'rgba(205, 127, 50, 0.06)';

                  return (
                    <tr
                      key={user.id || userRoll}
                      className={`lb-row${revealed ? ' visible' : ''}`}
                      style={{
                        borderBottom: '1px solid var(--border-subtle)',
                        background: rowBg,
                        animationDelay: `${delay}ms`,
                      }}
                    >
                      {/* RANK */}
                      <td style={{ padding: '1rem' }}>
                        {isTop3 ? (
                          <span className="rank-badge" style={{
                            background: `${MEDAL_COLORS[index]}22`,
                            border: `2px solid ${MEDAL_COLORS[index]}`,
                            color: MEDAL_COLORS[index],
                            fontSize: '1.2rem'
                          }}>
                            {MEDAL[index]}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-secondary)', fontWeight: 'bold' }}>#{rank}</span>
                        )}
                      </td>

                      {/* NAME */}
                      <td style={{ padding: '1rem', fontWeight: 'bold', color: isTop3 ? MEDAL_COLORS[index] : 'var(--text-primary)', fontSize: isTop3 ? '1.05rem' : '1rem' }}>
                        {user.name || 'Anonymous'}
                      </td>

                      {/* ROLL NO & CATEGORY BADGE */}
                      <td style={{ padding: '1rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontFamily: 'var(--font-mono)' }}>{userRoll}</span>
                        <span style={{ padding: '2px 8px', borderRadius: '12px', fontSize: '0.72rem', fontWeight: 'bold', background: 'rgba(222, 6, 6, 0.15)', color: '#ffffff', border: '1px solid #de0606' }}>
                          UG
                        </span>
                      </td>

                      {/* SCORE */}
                      <td style={{ padding: '1rem', fontWeight: 'bold' }}>
                        <span style={{ color: '#007fd7', fontSize: '1.1rem' }}>{scaledMark} / 10</span>
                        <span style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 'normal' }}>({Math.max(0, user.score || 0)} pts)</span>
                      </td>

                      {/* EXECS */}
                      <td style={{ padding: '1rem', color: '#de0606', fontWeight: 'bold' }}>
                        {userExecs}
                      </td>

                      {/* TIME TAKEN */}
                      <td style={{ padding: '1rem' }}>
                        {userElapsed ? (
                          <span style={{ color: 'var(--text-secondary)' }}>
                            {Math.floor(userElapsed / 60000)}m {Math.floor((userElapsed % 60000) / 1000)}s
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-secondary)' }}>N/A</span>
                        )}
                      </td>

                      {/* WARNINGS */}
                      <td style={{ padding: '1rem', fontSize: '0.85rem', color: hasWarnings ? '#ff4d6d' : 'var(--text-secondary)' }}>
                        Tabs: {tabSwitches} / Copy: {copyPasteCount}
                      </td>

                      {/* STATUS */}
                      <td style={{ padding: '1rem' }}>
                        {userFinished ? (
                          <span style={{ color: '#007fd7', fontSize: '0.8rem', fontWeight: 'bold' }}>✓ FINISHED</span>
                        ) : (
                          <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>ACTIVE</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Leaderboard;
