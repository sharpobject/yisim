// Results describe the original recorded player, even after the observer switches POV.
export function finalPlacement(players, uid, cupFinal = false) {
  const player = players.find(p => p.uid === uid);
  if (!player || !Number.isInteger(player.rank) || player.rank < 0) return {};
  const tied = !cupFinal && player.eliminationRound != null
    ? players.filter(p => p.eliminationRound === player.eliminationRound) : [player];
  const ranks = tied.map(p => p.rank).filter(Number.isInteger);
  return { placementStart: Math.min(...ranks) + 1, placementEnd: Math.max(...ranks) + 1 };
}

export function replayRating(replay, uid, characterId) {
  const data = replay?.data ?? replay;
  // AI perspectives can inherit a human's top-level metadata. Check every battle.
  if (!data || data.uid !== uid || data.charId !== characterId
    || !data.roundStats?.length || !data.roundStats.every(round =>
      [round.p1, round.p2].some(side => side?.publicData?.uid === uid))) return {};
  if (data.gameMode !== 3) return {};
  const dao = data.isDaoXinRank === true;
  const start = dao ? data.beginDaoXinRankScore : data.beginRankScore;
  const change = dao ? data.diffDaoXinRankScore : data.diffRankScore;
  return {
    ...(Number.isFinite(start) ? { startingRating: start } : {}),
    ratingChange: Number.isFinite(change) ? change : null,
    ratingKind: dao ? 'dao' : 'rank',
  };
}

// Catalog labels stop at the recorded player’s elimination, not the lobby ending.
export function roundsPlayed(players, uid, finalRound) {
  return players.find(player => player.uid === uid)?.eliminationRound ?? finalRound;
}

export function eliminationRoundForStatus(status, previousStatus, lastBattleRound, uid) {
  const leftDuringShop = previousStatus?.round === status.round
    && (lastBattleRound ?? 0) < status.round
    && previousStatus.publicPlayers?.some(player => player.uid === uid && player.life > 0);
  return leftDuringShop || status.ended ? status.round
    : Math.max(1, lastBattleRound ?? 0, status.round - 1);
}

// Settled replay rounds resolve sparse status polling and preparation-phase exits.
export function replayPlayerResult(replay) {
  const data = replay?.data ?? replay;
  if (!data?.uid || !Number.isInteger(data.round) || data.round < 1
    || !Number.isInteger(data.battleRank) || !data.roundStats?.length
    || !data.roundStats.every(round => [round.p1, round.p2]
      .some(side => side?.publicData?.uid === data.uid))) return null;
  return {uid: data.uid, rank: data.battleRank, round: data.round};
}
export function settledResultPlayers(players, replayResults) {
  return players.map(player => {
    const replay = replayResults.find(result => result.uid === player.uid && result.rank === player.rank);
    return replay && player.eliminationRound != null
      ? {...player, eliminationRound: replay.round} : player;
  });
}
