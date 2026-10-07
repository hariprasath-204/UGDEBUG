/**
 * Authoritative global sorting logic for CODATHAN Leaderboard, Report Generation, and Winner Showcase.
 * 
 * Sorting Criteria (in exact priority order):
 * 1. Score / Points: Higher score / points ranks above lower score (top to bottom).
 * 2. Errors Cleared / Fixed: More errors cleared ranks higher.
 * 3. Number of Executions: Fewer submissions / executions (totalSubmissionsCount) ranks higher.
 * 4. Total Timing Consumed: Faster total time taken (elapsedTimeMs) ranks higher.
 * 5. Tab Switches (Tie-breaker only): Fewer tab switches as final tie-breaker.
 */
export function sortParticipants(users) {
  return [...users].sort((a, b) => {
    // 1. Higher score first (Top to Bottom point-based decision)
    const aScore = a.score || 0;
    const bScore = b.score || 0;
    if (bScore !== aScore) {
      return bScore - aScore;
    }

    // 2. Cumulative Cleared Errors (More errors fixed comes first)
    const aCleared = (a.cumulative_cleared_errors ?? a.cumulativeClearedErrors ?? a.clearedErrors ?? 0);
    const bCleared = (b.cumulative_cleared_errors ?? b.cumulativeClearedErrors ?? b.clearedErrors ?? 0);
    if (bCleared !== aCleared) {
      return bCleared - aCleared;
    }

    // 3. Number of executions (fewer executions / submissions comes first)
    const aSubs = a.total_submissions_count ?? a.totalSubmissionsCount ?? 0;
    const bSubs = b.total_submissions_count ?? b.totalSubmissionsCount ?? 0;
    if (aSubs !== bSubs) {
      return aSubs - bSubs;
    }

    // 4. Total timing consumed (faster time taken comes first)
    const aTime = a.elapsed_time_ms ?? a.elapsedTimeMs ?? Infinity;
    const bTime = b.elapsed_time_ms ?? b.elapsedTimeMs ?? Infinity;
    if (aTime !== bTime) {
      return aTime - bTime;
    }

    // 5. Tab switches (tie-breaker only)
    const aTabs = a.tab_switches ?? a.tabSwitches ?? 0;
    const bTabs = b.tab_switches ?? b.tabSwitches ?? 0;
    return aTabs - bTabs;
  });
}

/**
 * Detects whether a participant belongs to Section A (100 series, e.g. 26PCA101) or Section B (200 series, e.g. 26PCA201).
 */
export function getParticipantSection(rollNo) {
  const str = String(rollNo || '').trim().toUpperCase();
  if (!str) return 'A';

  // Explicit Section markers
  if (str.includes('SEC A') || str.includes('SECTION A') || str.endsWith('-A') || str.endsWith(' A')) return 'A';
  if (str.includes('SEC B') || str.includes('SECTION B') || str.endsWith('-B') || str.endsWith(' B')) return 'B';

  // 100-series (Section A) vs 200-series (Section B) lot numbers e.g. 26PCA101, 26PCA201
  const match = str.match(/([12])\d{2}/);
  if (match) {
    if (match[1] === '1') return 'A';
    if (match[1] === '2') return 'B';
  }

  if (str.includes('101') || str.includes('102') || str.includes('PCA1')) return 'A';
  if (str.includes('201') || str.includes('202') || str.includes('PCA2')) return 'B';

  return 'A';
}

/**
 * Determines the student category ('UG') for all participants.
 */
export function getStudentCategory(rollNo) {
  return 'UG';
}

/**
 * Filters participants by Section ('ALL', 'A', 'B') and sorts them using sortParticipants.
 */
export function getSortedParticipantsByCategory(users, filter = 'ALL') {
  const sorted = sortParticipants(users);
  const normalizedFilter = String(filter || 'ALL').toUpperCase();

  if (normalizedFilter === 'ALL' || normalizedFilter === 'FULL' || normalizedFilter === 'UG') {
    return sorted;
  }

  if (normalizedFilter === 'A' || normalizedFilter === 'SECTION A' || normalizedFilter === 'SECTION_A') {
    return sorted.filter(u => getParticipantSection(u.rollNo || u.roll_no || u.regNo) === 'A');
  }

  if (normalizedFilter === 'B' || normalizedFilter === 'SECTION B' || normalizedFilter === 'SECTION_B') {
    return sorted.filter(u => getParticipantSection(u.rollNo || u.roll_no || u.regNo) === 'B');
  }

  return sorted;
}
