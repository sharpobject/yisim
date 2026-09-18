// Reconcile a partial first shop with the existing replay-summary estimates.
// Never reconstruct card identities, intermediate layouts, or action order.
export function openingShopResidual(aggregate, actions, targetUid) {
  if (!aggregate || aggregate.uncertain) return { usable: false, reason: 'uncertain-replay-summary' };
  const own = actions.filter(a => !a.actorUid || String(a.actorUid) === String(targetUid));
  const observed = {
    combined: own.filter(a => a.kind === 'upgrade').length,
    absorbed: own.filter(a => a.kind === 'absorb').length,
    exchanges: own.filter(a => a.kind === 'exchange').length,
  };
  const replay = {
    combined: Number(aggregate.combinedCardsEstimate) || 0,
    absorbed: Number(aggregate.absorbedCardsEstimate) || 0,
    exchanges: Number(aggregate.exchangesSpentEstimate) || 0,
  };
  // These are aggregate estimates. An underestimate cannot justify adding
  // invented activity or cancelling any of the authoritative live events.
  const undercounted = Object.keys(replay).filter(k => replay[k] < observed[k]);
  const processed = Math.max(0,
    Number(aggregate.processedCardsEstimate ?? replay.combined + replay.absorbed)
      - observed.combined - observed.absorbed);
  const combined = Math.min(processed, Math.max(0, replay.combined - observed.combined));
  // An upgraded card can later be absorbed, hiding that combine in the replay.
  // Count the total deficit first, rather than manufacturing an extra absorb.
  const ambiguousProcessing = replay.combined < observed.combined || replay.absorbed < observed.absorbed;
  const missing = { combined,
    absorbed: ambiguousProcessing ? 0 : processed - combined,
    processed: ambiguousProcessing ? processed - combined : 0,
    exchanges: Math.max(0, replay.exchanges - observed.exchanges) };
  return { usable: true, observed, replay, missing, undercounted };
}

export function replayInputFingerprint(replayPath, fingerprint, version = 1) {
  return JSON.stringify({ version, replayPath: replayPath || '', fingerprint: replayPath ? fingerprint : null });
}
