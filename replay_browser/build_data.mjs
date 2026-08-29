#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import {
  decodeMessage, decorateCards, cardLabel, cardCanUpgrade, cardConfigInfo, switchCardForHand, steamDumpPath,
  talentInfo, fateStrategyInfo, keYinCardInfo,
} from "../scripts/decode_live_observation.mjs";
import { assertRecordingRegression } from "./recording_regressions.mjs";

const [inputPath, outputPath = path.join(path.dirname(new URL(import.meta.url).pathname), "replay-data.js")] = process.argv.slice(2);
if (!inputPath) throw new Error("usage: build_data.mjs CAPTURE.jsonl [OUTPUT.js]");

const rawEvents = fs.readFileSync(inputPath, "utf8").trim().split("\n").filter(Boolean).map(JSON.parse);
const wikiRoot = process.env.YXP_WIKI_ROOT || "/private/tmp/yxp_wiki";
function extractedFateMetadata() {
  const filename = path.join(steamDumpPath, "heavenly_derivation_fates.json");
  if (!fs.existsSync(filename)) return new Map();
  return new Map(JSON.parse(fs.readFileSync(filename, "utf8")).map((entry) => [Number(entry.id), {
    id: Number(entry.id),
    nameEnglish: entry.name_en,
    nameChinese: entry.name_zh,
    descriptionEnglish: entry.description_en_html?.replace(/<[^>]+>/g, "") || entry.description_en,
    descriptionChinese: entry.description_zh_html?.replace(/<br\s*\/?\s*>/gi, "\n").replace(/<[^>]+>/g, "") || entry.description_zh,
    compositeCardIds: [3, 7].includes(Number(entry.category))
      ? entry.otherParams?.slice(0, 2).map(Number).filter((id) => id > 0)
      : null,
    fusionRecipe: Number(entry.category) === 3 && entry.otherParams?.length >= 3
      ? entry.otherParams.slice(0, 3).map(Number)
      : null,
    jiCardPair: Number(entry.category) === 8 && entry.otherParams?.length >= 2
      ? entry.otherParams.slice(0, 2).map(Number)
      : null,
  }]));
}

function wikiFateMetadata() {
  const byId = new Map();
  const cleanHtml = (value = "") => value
    .replace(/<br\s*\/?\s*>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/\s*\n\s*/g, "\n")
    .replace(/[ \t]+/g, " ")
    .trim();
  for (const language of ["en", "zh"]) {
    const filename = path.join(wikiRoot, language, "fates", "heavenly-derivation.html");
    if (!fs.existsSync(filename)) continue;
    const html = fs.readFileSync(filename, "utf8");
    for (const match of html.matchAll(/<article class="fate-card" id="fate-strategy-(\d+)">([\s\S]*?)<\/article>/g)) {
      const id = Number(match[1]);
      const body = match[2];
      const name = cleanHtml(body.match(/<h3>([\s\S]*?)<\/h3>/)?.[1]);
      const description = cleanHtml(body.match(/<p>([\s\S]*?)<\/p>/)?.[1]);
      const iconFile = body.match(/assets\/fates\/([^"']+)/)?.[1];
      const phase = cleanHtml(body.match(/<span\s+class="phase-chip">([\s\S]*?)<\/span>/)?.[1]);
      const cardIds = [...body.matchAll(/\/cards\/(\d+)\.html/g)].map((card) => Number(card[1]));
      const prior = byId.get(id) ?? { id };
      if (language === "en" && name) prior.nameEnglish = name;
      if (language === "en" && description) prior.descriptionEnglish = description;
      if (language === "zh" && name) prior.nameChinese = name;
      if (language === "zh" && description) prior.descriptionChinese = description;
      if (iconFile) prior.iconFile = iconFile;
      if ((phase === "Fusion" || phase === "Daoist Rhyme" || phase === "融汇" || phase === "道韵") && cardIds.length >= 2) {
        prior.compositeCardIds = cardIds.slice(0, 2);
      }
      byId.set(id, prior);
    }
  }
  return byId;
}
const extractedFates = extractedFateMetadata();
const wikiFates = wikiFateMetadata();
const fusionRecipes = new Map();
for (const [fateId, fate] of extractedFates) {
  const recipe = fate.fusionRecipe;
  if (!recipe) continue;
  const [first, second, result] = recipe;
  fusionRecipes.set(`${first}:${second}`, { fateId, result });
  fusionRecipes.set(`${second}:${first}`, { fateId, result });
}
const battleBuffIds = new Set([17, 10008, 10009, 10010, 10011, 10012, 10013, 10014, 10017, 10018, 10019, 10020, 10037, 10045, 10047]);
const profiles = new Map();
let targetUid = "";
for (const event of rawEvents) {
  if (event.event === "room_profiles_decoded") {
    for (const player of event.players ?? []) profiles.set(player.uid, player);
  }
  if (event.event === "observation_accepted") targetUid = event.target?.uid ?? targetUid;
}

const state = {
  round: 0,
  timer: 0,
  ended: false,
  gameMode: 0,
  codeId: 0,
  targetUid,
  players: {},
  privatePlayer: null,
};
const steps = [];
const catalog = { cards: {}, talents: {}, fateStrategies: {}, characters: {} };
const choiceHistories = {
  talents: new Map(),
  fateStrategies: new Map(),
  daoYun: new Map(),
  cardSelections: [],
};
const activeDaoYunHistoryKeys = new Map();
let nextDaoYunHistoryId = 0;
let activeCardSelectionHistory = null;
let recordedFateStrategyBans = [];
let pendingFateStrategyGenerated = [];
let pendingBattleRound = 0;
let postBattlePreparationRound = 0;
let pendingBattleCultivationDelta = 0;
let currentEventMeta = null;
const cardTransitionIssues = [];
let doubleDaoistRhymeSeen = false;
let doubleDaoistRhymePending = false;

function clone(value) { return JSON.parse(JSON.stringify(value)); }

function recordCardTransitionIssue(reason, action, extra = {}) {
  cardTransitionIssues.push({
    capture: path.basename(inputPath),
    sequence: Number(currentEventMeta?.sequence ?? 0),
    type: currentEventMeta?.type ?? "",
    round: Number(state.round) || 0,
    uid: state.privatePlayer?.uid ?? "",
    reason,
    action: clone(action),
    hand: clone(state.privatePlayer?.hand ?? []),
    deck: clone(state.privatePlayer?.deck ?? []),
    ...extra,
  });
}

function recordChoiceHistory(target, selections = [], rerollsRemaining = null) {
  selections.forEach((selection, index) => {
    const key = `${selection.id}:${index}`;
    const history = target.get(key) ?? { roundOrPhase: Number(selection.id), offers: [], selected: 0 };
    const offer = (selection.pending ?? []).map(Number).filter((id) => id > 0);
    if (offer.length && !sameValue(history.offers.at(-1), offer)) history.offers.push(offer);
    if (Number.isFinite(rerollsRemaining) && offer.length && !Number(selection.selected)) {
      history.rerollsRemainingAtStart ??= rerollsRemaining;
    }
    if (!history.complete && Number.isFinite(rerollsRemaining) && Number.isFinite(history.rerollsRemainingAtStart)) {
      history.rerollsUsed = Math.max(
        Number(history.rerollsUsed ?? 0),
        Math.max(0, history.rerollsRemainingAtStart - rerollsRemaining),
      );
    }
    if (Number.isFinite(rerollsRemaining)) history.rerollsRemaining = rerollsRemaining;
    if (Number(selection.selected) > 0) {
      history.selected = Number(selection.selected);
      history.complete = true;
    }
    target.set(key, history);
  });
}

function recordDaoYunChoiceHistory(selections = []) {
  const visibleSlots = new Set();
  selections.forEach((selection, index) => {
    const slot = `${selection.id}:${index}`;
    visibleSlots.add(slot);
    const offer = (selection.pending ?? []).map(Number).filter((id) => id > 0);
    const selected = Number(selection.selected) || 0;
    let historyKey = activeDaoYunHistoryKeys.get(slot);
    let history = historyKey == null ? null : choiceHistories.daoYun.get(historyKey);
    const repeatsCompletedChoice = history?.complete
      && selected === Number(history.selected)
      && (!offer.length || sameValue(history.offers.at(-1), offer));
    if (!history || (history.complete && !repeatsCompletedChoice)) {
      historyKey = `${slot}:${nextDaoYunHistoryId}`;
      nextDaoYunHistoryId += 1;
      history = { roundOrPhase: Number(selection.id), offers: [], selected: 0 };
      activeDaoYunHistoryKeys.set(slot, historyKey);
    }
    if (offer.length && !sameValue(history.offers.at(-1), offer)) history.offers.push(offer);
    if (selected > 0 && !history.complete) {
      history.selected = selected;
      history.complete = true;
      if (doubleDaoistRhymePending) {
        history.multiplier = 2;
        doubleDaoistRhymePending = false;
      }
    }
    choiceHistories.daoYun.set(historyKey, history);
  });
  for (const slot of activeDaoYunHistoryKeys.keys()) {
    if (!visibleSlots.has(slot)) activeDaoYunHistoryKeys.delete(slot);
  }
}

function recordCardSelectionHistory(selectionData) {
  const group = selectionData?.group;
  const offer = (group?.cardIds ?? []).map(Number).filter((id) => id > 0);
  if (!offer.length) return;
  const selected = Number(selectionData?.selected) || 0;
  const fingerprint = `${Number(group?.type) || 0}:${offer.join(",")}`;
  const startsAnotherIdenticalSelection = activeCardSelectionHistory?.complete && selected === 0;
  if (!activeCardSelectionHistory
    || activeCardSelectionHistory.fingerprint !== fingerprint
    || startsAnotherIdenticalSelection) {
    activeCardSelectionHistory = {
      fingerprint,
      roundOrPhase: Number(state.round) || 1,
      offers: [offer],
      selected: 0,
      selectionType: Number(group?.type) || 0,
    };
    choiceHistories.cardSelections.push(activeCardSelectionHistory);
  }
  if (selected > 0 && !activeCardSelectionHistory.complete) {
    activeCardSelectionHistory.selected = selected;
    activeCardSelectionHistory.complete = true;
  }
}

function multisetDifference(valuesToCheck, valuesToRemove) {
  const remaining = [...valuesToRemove];
  return valuesToCheck.filter((value) => {
    const index = remaining.indexOf(value);
    if (index < 0) return true;
    remaining.splice(index, 1);
    return false;
  });
}

function certainRerollTransitions(generated, finalOffer) {
  if (generated.length < 4 || finalOffer.length !== 4) return [];
  const replacements = generated.slice(4);
  const solutions = [];
  const visit = (offer, replacementIndex, transitions) => {
    if (solutions.length > 4096) return;
    if (replacementIndex === replacements.length) {
      if (sameValue(offer, finalOffer)) solutions.push(transitions);
      return;
    }
    const to = replacements[replacementIndex];
    for (let slot = 0; slot < offer.length; slot += 1) {
      const next = [...offer];
      const from = next[slot];
      next[slot] = to;
      visit(next, replacementIndex + 1, transitions.concat({ from, to }));
    }
  };
  visit(generated.slice(0, 4), 0, []);
  if (!solutions.length) return [];
  return replacements.map((_replacement, index) => {
    const possibleFrom = [...new Set(solutions.map((solution) => Number(solution[index].from)))];
    return {
      from: possibleFrom.length === 1 ? possibleFrom[0] : possibleFrom,
      to: replacements[index],
    };
  });
}

function recordFateStrategyBanHistory(selections = [], banned = [], rerollsRemaining = null) {
  if (!Array.isArray(banned)) return;
  const retainsPrefix = recordedFateStrategyBans.every((id, index) => Number(banned[index]) === Number(id));
  if (!retainsPrefix) {
    recordedFateStrategyBans = [];
    pendingFateStrategyGenerated = [];
  }
  const newlyGenerated = banned.slice(recordedFateStrategyBans.length).map(Number).filter((id) => id > 0);
  recordedFateStrategyBans = [...banned];
  pendingFateStrategyGenerated.push(...newlyGenerated);
  if (!pendingFateStrategyGenerated.length) return;

  // The server appends each phase's initial four options and every replacement
  // to this cumulative list. Full-game recordings observe each phase as it is
  // completed, so the newly appended segment belongs to the newly selected fate.
  const selection = [...selections].reverse().find((candidate, reverseIndex) => {
    if (!Number(candidate.selected)) return false;
    const index = selections.length - reverseIndex - 1;
    return !choiceHistories.fateStrategies.get(`${candidate.id}:${index}`)?.bannedHistoryRecorded;
  });
  if (!selection) return;
  const index = selections.indexOf(selection);
  const key = `${selection.id}:${index}`;
  const history = choiceHistories.fateStrategies.get(key)
    ?? { roundOrPhase: Number(selection.id), offers: [], selected: Number(selection.selected) };
  const finalOffer = (selection.pending ?? []).map(Number).filter((id) => id > 0);
  const generated = pendingFateStrategyGenerated;
  pendingFateStrategyGenerated = [];
  const rolledAway = multisetDifference(generated, finalOffer);
  const rerolls = certainRerollTransitions(generated, finalOffer);
  history.generated = generated;
  history.rolledAway = rolledAway;
  if (rerolls.length) history.rerolls = rerolls;
  history.rerollsUsed = Math.max(Number(history.rerollsUsed ?? 0), rolledAway.length);
  if (Number.isFinite(rerollsRemaining)) {
    history.rerollsRemaining = rerollsRemaining;
    history.rerollsRemainingAtStart = Math.max(
      Number(history.rerollsRemainingAtStart ?? 0),
      rerollsRemaining + rolledAway.length,
    );
  }
  history.bannedHistoryRecorded = true;
  choiceHistories.fateStrategies.set(key, history);
}

function updateChoiceHistories() {
  if (!state.privatePlayer) return;
  const talentSelections = state.privatePlayer.talentSelections ?? [];
  const fateSelections = state.privatePlayer.fateStrategies?.strategies ?? [];
  const daoYunSelections = state.privatePlayer.daoYunSelections ?? [];
  recordDaoYunChoiceHistory(daoYunSelections);
  if (!doubleDaoistRhymeSeen
    && fateSelections.some((selection) => Number(selection.selected) === 18)) {
    doubleDaoistRhymeSeen = true;
    const pendingReservations = daoYunSelections.map((selection, index) => {
      const historyKey = activeDaoYunHistoryKeys.get(`${selection.id}:${index}`);
      const history = historyKey == null ? null : choiceHistories.daoYun.get(historyKey);
      const cardId = Number(selection.selected);
      rememberCard(cardId);
      return { history, cardId, phase: Number(catalog.cards[cardId]?.phase) || Infinity, index };
    }).filter(({ history, cardId }) => history?.complete && cardId > 0 && cardId !== 27);
    pendingReservations.sort((first, second) => first.phase - second.phase || first.index - second.index);
    const pendingReservation = pendingReservations[0]?.history;
    if (pendingReservation) pendingReservation.multiplier = 2;
    else doubleDaoistRhymePending = true;
  }
  recordChoiceHistory(choiceHistories.talents, talentSelections);
  recordChoiceHistory(
    choiceHistories.fateStrategies,
    fateSelections,
    Number(state.privatePlayer.fateStrategies?.tempData?.[0]),
  );
  recordFateStrategyBanHistory(
    fateSelections,
    state.privatePlayer.fateStrategies?.banned,
    Number(state.privatePlayer.fateStrategies?.tempData?.[0]),
  );
  recordCardSelectionHistory(state.privatePlayer.cardSelectionData);
  talentSelections.flatMap((selection) => selection.pending ?? []).forEach(rememberTalent);
  fateSelections.flatMap((selection) => selection.pending ?? []).forEach((id) => rememberFateStrategy(
    id,
    state.round,
    state.privatePlayer.fateStrategies?.counters,
    state.privatePlayer.fateStrategies?.tempData,
  ));
  (state.privatePlayer.fateStrategies?.banned ?? []).forEach((id) => rememberFateStrategy(
    id,
    state.round,
    state.privatePlayer.fateStrategies?.counters,
    state.privatePlayer.fateStrategies?.tempData,
  ));
  daoYunSelections.flatMap((selection) => selection.pending ?? []).forEach(rememberCard);
  (state.privatePlayer.cardSelectionData?.group?.cardIds ?? []).forEach(rememberCard);
  (state.privatePlayer.cardSelectionData?.pendingGroups ?? [])
    .flatMap((group) => group.cardIds ?? [])
    .forEach(rememberCard);
}

function historyForSelected(target, selected) {
  const history = [...target.values()].findLast((candidate) => candidate.selected === Number(selected));
  if (!history) return null;
  const { bannedHistoryRecorded: _bannedHistoryRecorded, generated: _generated, ...visibleHistory } = history;
  return visibleHistory;
}

function numericCardId(value) {
  const match = /^(-?\d+)/.exec(String(value ?? 0));
  return match ? Number(match[1]) : 0;
}

function baseCardId(value) {
  const id = numericCardId(value);
  return id - (Math.floor(Math.abs(id) / 10000) % 100) * 10000;
}

function sameCardIdentity(firstValue, secondValue) {
  const first = numericCardId(firstValue);
  const second = numericCardId(secondValue);
  if (first === second) return true;
  if (!first || !second) return false;
  return Number(cardConfigInfo(first)?.linkageId) === second
    || Number(cardConfigInfo(second)?.linkageId) === first;
}

function cardConfig(value) {
  const id = numericCardId(value);
  return cardConfigInfo(id) ?? cardConfigInfo(baseCardId(id));
}

function exchangeGainFromCard(value, trigger) {
  const config = cardConfig(value);
  if (!config) return 0;
  const marker = trigger === "exchange" ? "[置换]" : "[炼化]";
  for (const line of String(config.desc ?? "").split(/\\n|\n/)) {
    if (!line.includes(marker)) continue;
    const match = /换牌机会\+\{otherParams\[(\d+)\]\}/.exec(line);
    if (match) return Number(config.otherParams?.[Number(match[1])] ?? 0);
  }
  return 0;
}

function isCuriosityResult(value) {
  const id = baseCardId(value);
  const config = cardConfig(value);
  // Curiosity's five character cards are 33–37. The remaining surprise pool
  // consists of talismans (subcategory 2) and spiritual pets (subcategory 3).
  return (id >= 33 && id <= 37) || [2, 3].includes(Number(config?.subcategory));
}

function hasExchangeAbility(value) {
  return String(cardConfig(value)?.desc ?? "").includes("[置换]");
}

function visibleTalentReference(replayState, talentId) {
  const privatePlayer = replayState?.privatePlayer;
  const uid = privatePlayer?.uid || replayState?.targetUid;
  return replayState?.players?.[uid]?.talents?.find((reference) => Number(reference.id) === Number(talentId)) ?? null;
}

function visibleExchangeStats(replayState) {
  const curiosity = visibleTalentReference(replayState, 129);
  const shiftAsCloud = visibleTalentReference(replayState, 18);
  return {
    remaining: Number(replayState?.privatePlayer?.exchangesRemaining ?? 0),
    curiosity: Number(curiosity?.runtime?.value ?? 0),
    shiftAsCloud: Number(shiftAsCloud?.runtime?.value ?? 0),
    hasCuriosity: Boolean(curiosity),
    hasShiftAsCloud: Boolean(shiftAsCloud),
    hasPerfectlyPlanned: Boolean(visibleTalentReference(replayState, 104)),
    hasTalentResonance: Boolean(visibleTalentReference(replayState, 121)),
  };
}

function writeVisibleExchangeStats(replayState, stats) {
  if (replayState?.privatePlayer) replayState.privatePlayer.exchangesRemaining = stats.remaining;
  for (const [talentId, value] of [[129, stats.curiosity], [18, stats.shiftAsCloud]]) {
    const reference = visibleTalentReference(replayState, talentId);
    if (!reference) continue;
    reference.runtime ??= { kind: "fate counter", value: 0 };
    reference.runtime.value = value;
  }
}

function nextExchangeStats(current, trigger, targetCardId, newCardId = 0) {
  const next = { ...current };
  if (trigger === "exchange") {
    const cardGain = exchangeGainFromCard(targetCardId, "exchange");
    const perfectlyPlannedGain = baseCardId(targetCardId) === 22 && next.hasPerfectlyPlanned
      ? next.hasTalentResonance ? 21 : 7
      : 0;
    const countWouldTriggerCuriosity = next.remaining === 1
      && next.curiosity > 0
      && !(next.hasShiftAsCloud && next.shiftAsCloud > 0)
      && cardGain === 0
      && perfectlyPlannedGain === 0;
    const exchangeAbility = hasExchangeAbility(targetCardId);
    const curiosityUsed = exchangeAbility
      // A pet/talisman voucher overlaps Curiosity's output pool. Curiosity has
      // priority when the last chance would trigger it; other exchange
      // abilities are likewise governed by the pre-exchange count.
      ? countWouldTriggerCuriosity
      // For an ordinary card, the returned pool is the independent oracle.
      : isCuriosityResult(newCardId);
    if (next.hasShiftAsCloud && next.shiftAsCloud > 0) next.shiftAsCloud -= 1;
    else if (next.remaining > 0) next.remaining -= 1;
    next.remaining += cardGain;
    // For ordinary cards the returned surprise card is an independent record
    // of whether Curiosity fired. This is more reliable than a possibly stale
    // locally reconstructed count between authoritative snapshots.
    if (curiosityUsed && next.hasCuriosity && next.curiosity > 0) {
      next.curiosity -= 1;
      next.remaining += 1;
    }
    // Perfectly Planned's generated card has a client-coded exchange bonus
    // which is not present in CardConfig. Talent Resonance triples it.
    next.remaining += perfectlyPlannedGain;
  } else if (trigger === "absorb") {
    next.remaining += exchangeGainFromCard(targetCardId, "absorb");
  }
  return next;
}

function exchangeStatsAfterStep(stats, step) {
  if (step.type === "ReplaceCardResp" && String(step.details?.result).startsWith("1 ")) {
    return nextExchangeStats(stats, "exchange", step.details?.targetCard?.id, step.details?.newCard?.id);
  }
  if (step.type === "RefineCardResp" && step.details?.result) {
    return nextExchangeStats(stats, "absorb", step.details?.targetCard?.id);
  }
  return stats;
}

function internalExchangeStats() {
  const privatePlayer = state.privatePlayer;
  const publicPlayer = state.players[privatePlayer?.uid || state.targetUid];
  const talentCounters = publicPlayer?.talentCounters ?? {};
  const talents = new Set((publicPlayer?.talents ?? []).map(Number));
  return {
    remaining: Number(privatePlayer?.exchangesRemaining ?? 0),
    curiosity: Number(talentCounters[129] ?? 0),
    shiftAsCloud: Number(talentCounters[18] ?? 0),
    hasCuriosity: talents.has(129),
    hasShiftAsCloud: talents.has(18),
    hasPerfectlyPlanned: talents.has(104),
    hasTalentResonance: talents.has(121),
  };
}

function writeInternalExchangeStats(stats) {
  if (state.privatePlayer) state.privatePlayer.exchangesRemaining = stats.remaining;
  const publicPlayer = state.players[state.privatePlayer?.uid || state.targetUid];
  if (!publicPlayer) return;
  publicPlayer.talentCounters ??= {};
  if (stats.hasCuriosity) publicPlayer.talentCounters[129] = stats.curiosity;
  if (stats.hasShiftAsCloud) publicPlayer.talentCounters[18] = stats.shiftAsCloud;
}

function rememberCard(value) {
  const id = numericCardId(value);
  if (!id || catalog.cards[id]) return id;
  const label = cardLabel(id);
  const match = /^(-?\d+) \((.*), upgrade (\d+), phase (\d+)\)$/.exec(label);
  const names = match?.[2] ?? label;
  const slash = names.indexOf(" / ");
  catalog.cards[id] = {
    id,
    nameEnglish: slash >= 0 ? names.slice(0, slash) : names,
    nameChinese: slash >= 0 ? names.slice(slash + 3) : "",
    upgrade: Number(match?.[3] ?? 1),
    phase: Number(match?.[4] ?? 0),
  };
  return id;
}

function rememberTalent(id) {
  const number = Number(id);
  if (!catalog.talents[number]) {
    const info = talentInfo(number);
    const resolveCardReferences = (text = "", language) => text.replace(/【(\d+)】/g, (_match, cardIdText) => {
      const cardId = rememberCard(Number(cardIdText));
      const cardInfo = catalog.cards[cardId];
      const name = language === "zh" ? cardInfo?.nameChinese : cardInfo?.nameEnglish;
      return `【${name || cardId}】`;
    });
    info.descriptionEnglish = resolveCardReferences(info.descriptionEnglish, "en");
    info.descriptionChinese = resolveCardReferences(info.descriptionChinese, "zh");
    catalog.talents[number] = { assetKind: "talent", ...info };
  }
  return number;
}

function rememberFateStrategy(id, round, counters = {}, tempData = {}) {
  const number = Number(id);
  const info = { assetKind: "fateStrategy", ...fateStrategyInfo(number, round, counters, tempData) };
  const metadata = { ...extractedFates.get(number), ...wikiFates.get(number) };
  if (metadata.id) {
    if (info.nameEnglish === `Fate Strategy ${number}` && metadata.nameEnglish) info.nameEnglish = metadata.nameEnglish;
    if (!info.nameChinese && metadata.nameChinese) info.nameChinese = metadata.nameChinese;
    if (metadata.descriptionEnglish) info.descriptionEnglish = metadata.descriptionEnglish;
    if (metadata.descriptionChinese) info.descriptionChinese = metadata.descriptionChinese;
    if (metadata.iconFile) info.iconFile = metadata.iconFile;
    if (metadata.compositeCardIds?.length === 2) {
      info.compositeCardIds = metadata.compositeCardIds.map(rememberCard);
    }
  }
  catalog.fateStrategies[number] = { ...info };
  delete catalog.fateStrategies[number].runtime;
  delete catalog.fateStrategies[number].locked;
  return info;
}

function wikiHeading(filename) {
  if (!fs.existsSync(filename)) return "";
  return fs.readFileSync(filename, "utf8").match(/<h1>([^<]+)<\/h1>/)?.[1]
    ?.replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/&quot;/g, '"') ?? "";
}

function rememberCharacter(player) {
  if (player?.characterId) catalog.characters[player.characterId] = {
    id: player.characterId,
    nameEnglish: wikiHeading(path.join(wikiRoot, "en", "characters", `${player.characterId}.html`)) || player.character || `Character ${player.characterId}`,
    nameChinese: wikiHeading(path.join(wikiRoot, "zh", "characters", `${player.characterId}.html`)) || player.character || "",
  };
}

function battleSpeed(lastRound = {}) {
  let speed = [10012, 10045, 369]
    .reduce((total, key) => total + Number(lastRound.permanentBuffCounters?.[key] ?? 0), 0);
  const elementNames = ["金灵", "木灵", "水灵", "火灵", "土灵"];
  let deckElement = "";
  let sameElement = true;
  for (const cardId of lastRound.deck ?? []) {
    const label = cardLabel(numericCardId(cardId));
    const element = elementNames.find((name) => label.includes(name));
    if (!element) continue;
    if (!deckElement) deckElement = element;
    else if (deckElement !== element) sameElement = false;
  }
  if (sameElement) {
    for (const talentId of lastRound.talents ?? []) {
      const numericTalentId = numericCardId(talentId);
      if (numericTalentId % 10000 === 128) speed += Number(talentInfo(numericTalentId).otherParams?.[0] ?? 0);
    }
  }
  for (const inscriptionId of lastRound.usedKeYinCards ?? []) {
    const numericInscriptionId = numericCardId(inscriptionId);
    if (numericInscriptionId % 10000 === 42) {
      speed += Number(keYinCardInfo(numericInscriptionId).otherParams?.[0] ?? 0);
    }
  }
  return speed;
}

function visibleBattleBuffs(lastRound = {}) {
  return Object.entries(lastRound.permanentBuffCounters ?? {})
    .map(([id, value]) => ({ id: Number(id), value: Number(value) }))
    .filter((entry) => battleBuffIds.has(entry.id) && entry.value > 0)
    // Ambush stores its temporary Speed bonus (+6 per use), not the number of
    // charges consumed.  The battle summary should report charges used.
    .map((entry) => entry.id === 10045 ? { ...entry, value: Math.ceil(entry.value / 6) } : entry)
    .sort((first, second) => first.id - second.id);
}

function arrayForPosition(position) {
  if (!state.privatePlayer) return null;
  if (position === 0) return state.privatePlayer.hand;
  if (position === 1) return state.privatePlayer.deck;
  return null;
}

function privatePlayerHasFate(privatePlayer, fateId) {
  const rawSelections = privatePlayer?.fateStrategies?.strategies ?? [];
  if (rawSelections.some((selection) => numericCardId(selection?.selected ?? selection) === fateId)) return true;
  return (privatePlayer?.selectedFateStrategies ?? [])
    .some((selection) => numericCardId(selection?.id ?? selection) === fateId);
}

function combinationResultId(firstValue, secondValue, privatePlayer = state.privatePlayer) {
  const first = numericCardId(firstValue);
  const second = numericCardId(secondValue);
  if (!first || !second) return 0;
  const fusion = fusionRecipes.get(`${baseCardId(first)}:${baseCardId(second)}`);
  if (fusion && privatePlayerHasFate(privatePlayer, fusion.fateId)) {
    const firstLevel = Math.floor((Math.abs(first) % 100000) / 10000) + 1;
    const secondLevel = Math.floor((Math.abs(second) % 100000) / 10000) + 1;
    const resultLevel = Math.floor((firstLevel + secondLevel) / 2);
    return fusion.result + (resultLevel - 1) * 10000;
  }
  if (baseCardId(first) === baseCardId(second) && cardCanUpgrade(first) && cardCanUpgrade(second)) {
    const firstTier = Math.floor((Math.abs(first) % 100000) / 10000);
    const secondTier = Math.floor((Math.abs(second) % 100000) / 10000);
    if (firstTier === secondTier && firstTier < 2) return upgradedCardId(first);
  }
  // Spring Course Tea combines with any level-1 upgradable card. The Tea is
  // consumed and the other card is the one that gains a level.
  if (first === 1 && cardCanUpgrade(second)
    && Math.floor((Math.abs(second) % 100000) / 10000) === 0) return upgradedCardId(second);
  if (second === 1 && cardCanUpgrade(first)
    && Math.floor((Math.abs(first) % 100000) / 10000) === 0) return upgradedCardId(first);
  return 0;
}

function canUpgradeTogether(first, second, privatePlayer = state.privatePlayer) {
  return combinationResultId(first, second, privatePlayer) > 0;
}

function upgradedCardId(cardId) {
  if (!cardId) return cardId;
  if (!cardCanUpgrade(cardId)) return cardId;
  const upgradeTier = Math.floor((Math.abs(cardId) % 100000) / 10000);
  return upgradeTier < 2 ? cardId + 10000 : cardId;
}

function addCultivation(delta) {
  const player = state.players?.[state.privatePlayer?.uid];
  if (player && Number.isFinite(Number(player.cultivation))) {
    player.cultivation = Number(player.cultivation) + Number(delta);
  }
}

function possibleBattleEndCultivationDraws(deck = [], phase = 0) {
  let count = 0;
  for (const value of deck) {
    const id = numericCardId(value);
    const baseId = baseCardId(id);
    const config = cardConfigInfo(id) ?? cardConfigInfo(baseId);
    if (baseId === 202 || baseId === 9000015) count += Number(config?.otherParams?.[0] ?? 0);
    else if (baseId === 350) count += 1;
    else if (baseId === 7000087 && Number(phase) >= 4) count += 1;
  }
  return count;
}

function explicitCultivationGain(info) {
  const description = `${info?.descriptionEnglish ?? ""}\n${info?.descriptionChinese ?? ""}`;
  const match = /Cultivation\s*\+\s*(\d+)/i.exec(description) ?? /修为\s*\+\s*(\d+)/.exec(description);
  return Number(match?.[1] ?? 0);
}

function choiceCultivationDelta(beforePlayer, afterPlayer, beforePrivate, afterPrivate) {
  const beforeTalents = new Set((beforePlayer?.talents ?? []).map((entry) => numericCardId(entry?.id ?? entry)));
  const talentGain = (afterPlayer?.talents ?? []).reduce((total, entry) => {
    const id = numericCardId(entry?.id ?? entry);
    return total + (beforeTalents.has(id) ? 0 : explicitCultivationGain(talentInfo(id)));
  }, 0);
  const beforeFates = new Set((beforePrivate?.selectedFateStrategies ?? []).map((entry) => numericCardId(entry?.id ?? entry)));
  const fateGain = (afterPrivate?.selectedFateStrategies ?? []).reduce((total, entry) => {
    const id = numericCardId(entry?.id ?? entry);
    const info = extractedFates.get(id) ?? wikiFates.get(id) ?? fateStrategyInfo(id);
    return total + (beforeFates.has(id) ? 0 : explicitCultivationGain(info));
  }, 0);
  return talentGain + fateGain;
}

function fateUseCultivationDelta(fateIds) {
  return fateIds.reduce((total, id) => {
    const info = extractedFates.get(Number(id)) ?? wikiFates.get(Number(id)) ?? fateStrategyInfo(Number(id));
    const english = String(info?.descriptionEnglish ?? "");
    const chinese = String(info?.descriptionChinese ?? "");
    const loss = /Lose\s+(\d+)\s+Cultivation/i.exec(english) ?? /修为\s*减\s*(\d+)/.exec(chinese);
    if (loss) return total - Number(loss[1]);
    const gain = /Cultivation\s*\+\s*(\d+)/i.exec(english) ?? /修为\s*\+\s*(\d+)/.exec(chinese);
    return total + Number(gain?.[1] ?? 0);
  }, 0);
}

function refineCultivationDelta(value) {
  const id = numericCardId(value);
  const baseId = baseCardId(id);
  const config = cardConfigInfo(id) ?? cardConfigInfo(baseId);
  let delta = 1;
  if (baseId === 2000012) delta += Number(config?.otherParams?.[0] ?? 0);
  if (baseId === 386) delta -= Number(config?.otherParams?.[0] ?? 4);
  return delta;
}

function isMysterySeed(value) {
  return baseCardId(value) === 9000006;
}

function roundStartCardId(value, { inHand = false } = {}) {
  const id = numericCardId(value);
  if (!inHand) return id;
  // Mystery Seed's Growth effect is a random plant transformation, not a
  // conventional level-up. Keep a symbolic slot until a later action or
  // authoritative snapshot identifies the resulting plant.
  if (isMysterySeed(id)) return null;
  // Growth cards that remain in hand upgrade once before the next round begins.
  if (String(cardConfigInfo(id)?.desc ?? "").includes("[成长]")) return upgradedCardId(id);
  return id;
}

function advanceSyntheticRoundForCardAction() {
  if (!state.privatePlayer || postBattlePreparationRound <= Number(state.round)) return;
  state.round = postBattlePreparationRound;
  addCultivation(2 + pendingBattleCultivationDelta);
  pendingBattleCultivationDelta = 0;
}

function moveCard(action) {
  const step = { type: "MoveCardReq", details: action };
  const cultivationDelta = recordedCultivationDelta(state.privatePlayer, step);
  if (applyRecordedCardStep(state.privatePlayer, step, (id) => id, recordCardTransitionIssue)) {
    addCultivation(cultivationDelta);
  }
}

function insertCard(action) {
  applyRecordedCardStep(
    state.privatePlayer,
    { type: "InsertCardReq", details: action },
    (id) => id,
    recordCardTransitionIssue,
  );
}

function replaceCard(action) {
  if (!String(action.result).startsWith("1 ")) return;
  const applied = applyRecordedCardStep(
    state.privatePlayer,
    { type: "ReplaceCardResp", details: action },
    (id) => id,
    recordCardTransitionIssue,
  );
  if (applied) writeInternalExchangeStats(nextExchangeStats(
    internalExchangeStats(), "exchange", action.targetCard?.id, action.newCard?.id,
  ));
}

function refineCard(action) {
  if (!action.result) return;
  const applied = applyRecordedCardStep(
    state.privatePlayer,
    { type: "RefineCardResp", details: action },
    (id) => id,
    recordCardTransitionIssue,
  );
  if (!applied) return;
  writeInternalExchangeStats(nextExchangeStats(internalExchangeStats(), "absorb", action.targetCard?.id));
  addCultivation(refineCultivationDelta(action.targetCard?.id));
}

function describe(type, decoded, direction) {
  const arrow = direction === "client->server" ? "request" : "notification";
  if (type === "MoveCardReq") return `Move ${position(decoded.sourcePosition)}[${decoded.sourceIndex}] → ${position(decoded.destinationPosition)}[${decoded.destinationIndex}]`;
  if (type === "InsertCardReq") return `Insert ${position(decoded.sourcePosition)}[${decoded.sourceIndex}] at deck[${decoded.destinationIndex}] (${decoded.insertionDirection < 0 ? "before" : "after"})`;
  if (type === "ReplaceCardResp") return `Exchange result: ${decoded.targetCard?.id ?? "?"} → ${decoded.newCard?.id ?? "?"}`;
  if (type === "RefineCardResp") {
    const upgrades = (decoded.resultingCards ?? []).map((card) => `${card.position}[${card.index}]`).join(", ");
    return `Refine result: ${decoded.result ? "success" : "failed"}${decoded.targetCard ? `; consume ${decoded.targetCard.id}` : ""}${upgrades ? `; upgrade ${upgrades}` : ""}`;
  }
  if (type === "GameStatus") return `Authoritative game snapshot — round ${decoded.round}`;
  if (type === "PlayerData") return `Observed-player state update`;
  if (type === "BattleResult") return `Round ${decoded.round} battle: ${decoded.p1?.public?.username ?? "?"} vs ${decoded.p2?.public?.username ?? "?"}; winner ${decoded.winnerUid || "unknown"}`;
  if (type === "LifeRankStatus") return `Destiny/rank update for ${decoded.players.length} players`;
  if (type === "SimpleClientPact") return `${decoded.type} (${arrow})`;
  if (type === "PlayerPreReadyResp") return "Player ready";
  if (type === "BattleEmojiResp") return `Emote ${decoded.emojiId} from ${decoded.fromPlayerUid}`;
  return `${type} (${arrow})`;
}

function position(number) { return number === 0 ? "hand" : number === 1 ? "deck" : `position ${number}`; }

function playerIdentity(uid = state.targetUid) {
  const player = state.players[uid];
  const profile = profiles.get(uid);
  rememberCharacter(player ?? profile);
  const username = player?.username || profile?.username || uid || "Unknown player";
  const names = catalog.characters[player?.characterId || profile?.characterId];
  const characterEnglish = names?.nameEnglish || player?.character || profile?.character || "unknown character";
  const characterChinese = names?.nameChinese || player?.character || profile?.character || characterEnglish;
  return { uid, username, characterEnglish, characterChinese };
}

function compactCardName(value, language = "en") {
  const id = numericCardId(value);
  rememberCard(id);
  const card = catalog.cards[id];
  if (!card) return language === "zh" ? `卡牌 ${id}` : `card ${id}`;
  const name = language === "zh" ? card.nameChinese || card.nameEnglish : card.nameEnglish || card.nameChinese;
  return language === "zh" ? `${name} ${card.upgrade}级` : `${name} Lv.${card.upgrade}`;
}

function compactTalentName(id, language = "en") {
  rememberTalent(id);
  const info = catalog.talents[Number(id)] ?? {};
  return language === "zh"
    ? info.nameChinese || info.nameEnglish || `仙命 ${id}`
    : info.nameEnglish || info.nameChinese || `Immortal Fate ${id}`;
}

function compactFateStrategyName(id, language = "en") {
  const info = rememberFateStrategy(id, state.round);
  return language === "zh"
    ? info.nameChinese || info.nameEnglish || `天衍仙命 ${id}`
    : info.nameEnglish || info.nameChinese || `Heavenly Derivation Fate ${id}`;
}

function cardUpgradeChanges(beforePrivate, afterPrivate) {
  const cards = (player) => [...(player?.hand ?? []), ...(player?.deck ?? [])]
    .map(numericCardId)
    .filter((id) => id > 0);
  const counts = (values) => values.reduce(
    (result, id) => result.set(id, (result.get(id) ?? 0) + 1),
    new Map(),
  );
  const beforeCounts = counts(cards(beforePrivate));
  const afterCounts = counts(cards(afterPrivate));
  const changes = [];
  for (const [oldId, oldCount] of beforeCounts) {
    const removed = oldCount - (afterCounts.get(oldId) ?? 0);
    if (removed <= 0) continue;
    const newId = upgradedCardId(oldId);
    if (newId === oldId) continue;
    const added = (afterCounts.get(newId) ?? 0) - (beforeCounts.get(newId) ?? 0);
    for (let index = 0; index < Math.min(removed, added); index += 1) changes.push({ oldId, newId });
  }
  return changes;
}

function inferredFateStrategyUses(before, after) {
  const beforeData = before.privatePlayer?.fateStrategies;
  const afterData = after.privatePlayer?.fateStrategies;
  if (!beforeData || !afterData) return [];
  const selected = new Set((afterData.strategies ?? [])
    .map((selection) => Number(selection.selected))
    .filter((id) => id > 0));
  return [...selected].flatMap((id) => {
    const oldInfo = fateStrategyInfo(id, before.round, beforeData.counters, beforeData.tempData);
    const newInfo = fateStrategyInfo(id, after.round, afterData.counters, afterData.tempData);
    if (!oldInfo.runtime || !newInfo.runtime || oldInfo.runtime.kind !== newInfo.runtime.kind) return [];
    const oldCounter = Number(beforeData.counters?.[id] ?? 0);
    const newCounter = Number(afterData.counters?.[id] ?? 0);
    const wasUsed = oldInfo.runtime.kind === "charges"
      ? Number(newInfo.runtime.value) < Number(oldInfo.runtime.value)
      : newCounter !== oldCounter && Number(newInfo.runtime.value) > Number(oldInfo.runtime.value);
    return wasUsed ? [{ id }] : [];
  });
}

function privateStateWithInferredRoundTransforms(beforePrivate, afterPrivate, beforePlayer, afterPlayer) {
  const reconciled = clone(beforePrivate);
  const beforePhase = phaseNumber(beforePlayer?.phase);
  const afterPhase = phaseNumber(afterPlayer?.phase);
  if (afterPhase > beforePhase) {
    for (const zone of ["hand", "deck"]) {
      const beforeCards = reconciled?.[zone] ?? [];
      const afterCards = afterPrivate?.[zone] ?? [];
      for (let index = 0; index < Math.min(beforeCards.length, afterCards.length); index += 1) {
        const oldId = numericCardId(beforeCards[index]);
        const newId = numericCardId(afterCards[index]);
        if (!oldId || oldId === newId || baseCardId(oldId) !== baseCardId(newId)) continue;
        const oldConfig = cardConfigInfo(oldId);
        const newConfig = cardConfigInfo(newId);
        if (!oldConfig?.noUpgrade || !newConfig?.noUpgrade) continue;
        if (Number(oldConfig.level) !== beforePhase || Number(newConfig.level) !== afterPhase) continue;
        beforeCards[index] = newId;
      }
    }
  }
  return reconciled;
}

function selectionChanges(previous = [], current = []) {
  const previousByKey = new Map(previous.map((selection, index) => [`${selection.id}:${index}`, selection]));
  return current.flatMap((selection, index) => {
    const prior = previousByKey.get(`${selection.id}:${index}`);
    if (!prior) return Number(selection.selected) > 0 ? [{ selection, prior: null, selected: true, rerolled: false }] : [];
    const selected = Number(selection.selected) > 0 && Number(selection.selected) !== Number(prior.selected);
    const rerolled = Number(prior.selected) <= 0 && !sameValue(prior.pending ?? [], selection.pending ?? []);
    return selected || rerolled ? [{ selection, prior, selected, rerolled }] : [];
  });
}

function phaseNumber(value) { return Number.parseInt(String(value ?? "0"), 10) || 0; }
const phaseNamesEnglish = ["Unknown phase", "Qi Refining", "Foundation", "Virtuoso", "Immortality", "Incarnation", "Void Return"];
const phaseNamesChinese = ["未知境界", "炼气期", "筑基期", "金丹期", "元婴期", "化神期", "返虚期"];

function actionFor(actor, kind, textEnglish, textChinese, extra = {}) {
  return {
    actorUid: actor.uid,
    actorUsername: actor.username,
    actorCharacterEnglish: actor.characterEnglish,
    actorCharacterChinese: actor.characterChinese,
    kind,
    text: textEnglish,
    textEnglish,
    textChinese,
    ...extra,
  };
}

function destinyAction(changes, round = 0) {
  const english = changes.map(({ actorUsername, delta }) => `${actorUsername} ${delta > 0 ? "gained" : "lost"} ${Math.abs(delta)} destiny`).join("; ");
  const chinese = changes.map(({ actorUsername, delta }) => `${actorUsername}${delta > 0 ? "获得" : "失去"}${Math.abs(delta)}命元`).join("；");
  return {
    kind: "destiny",
    text: english,
    textEnglish: english,
    textChinese: chinese,
    round: Number(round) || 0,
    changes,
  };
}

function visibleCardForServerIdentity(privatePlayer, card) {
  const reportedId = numericCardId(card?.id);
  const position = Number.parseInt(String(card?.position), 10);
  const list = position === 0 ? privatePlayer?.hand
    : position === 1 ? privatePlayer?.deck : null;
  if (!list) return reportedId;
  const reportedIndex = Number(card?.index);
  if (sameCardIdentity(list[reportedIndex], reportedId)) {
    return numericCardId(list[reportedIndex]);
  }
  const candidates = list.map((id, index) => sameCardIdentity(id, reportedId) ? index : -1)
    .filter((index) => index >= 0)
    .sort((first, second) => Math.abs(first - reportedIndex) - Math.abs(second - reportedIndex));
  return candidates.length ? numericCardId(list[candidates[0]]) : reportedId;
}

function humanAction(type, decoded, before) {
  const actor = playerIdentity(before.privatePlayer?.uid || state.privatePlayer?.uid || before.targetUid || state.targetUid);
  const priorPrivate = before.privatePlayer;
  const sourceList = decoded.sourcePosition === 0 ? priorPrivate?.hand : priorPrivate?.deck;
  const sourceCard = sourceList?.[decoded.sourceIndex];
  const destinationCard = decoded.destinationPosition === 0
    ? priorPrivate?.hand?.[decoded.destinationIndex]
    : priorPrivate?.deck?.[decoded.destinationIndex];
  if (type === "MoveCardReq") {
    if (!sourceCard) return null;
    const combined = combinationResultId(sourceCard, destinationCard, priorPrivate);
    if (combined) {
      return actionFor(actor, "upgrade",
        `${actor.username} combined ${compactCardName(sourceCard)} into ${compactCardName(combined)}`,
        `${actor.username}将${compactCardName(sourceCard, "zh")}合成为${compactCardName(combined, "zh")}`);
    }
    if (decoded.sourcePosition === 1 && decoded.destinationPosition === 1) {
      return actionFor(actor, "rearrange",
        `${actor.username} rearranged ${compactCardName(sourceCard)} from deck slot ${decoded.sourceIndex + 1} to ${decoded.destinationIndex + 1}`,
        `${actor.username}将${compactCardName(sourceCard, "zh")}从卡组第${decoded.sourceIndex + 1}位移至第${decoded.destinationIndex + 1}位`);
    }
    if (decoded.destinationPosition === 1) {
      return actionFor(actor, "move",
        `${actor.username} moved ${compactCardName(sourceCard)} into deck slot ${decoded.destinationIndex + 1}`,
        `${actor.username}将${compactCardName(sourceCard, "zh")}移入卡组第${decoded.destinationIndex + 1}位`);
    }
    const handCard = switchCardForHand(sourceCard);
    return actionFor(actor, "move",
      `${actor.username} returned ${compactCardName(handCard)} to hand`,
      `${actor.username}将${compactCardName(handCard, "zh")}移回手牌`);
  }
  if (type === "InsertCardReq") {
    if (!sourceCard) return null;
    return actionFor(actor, "rearrange",
      `${actor.username} inserted ${compactCardName(sourceCard)} at deck slot ${decoded.destinationIndex + 1}`,
      `${actor.username}将${compactCardName(sourceCard, "zh")}插入卡组第${decoded.destinationIndex + 1}位`);
  }
  if (type === "ReplaceCardResp" && String(decoded.result).startsWith("1 ")) {
    const oldId = visibleCardForServerIdentity(priorPrivate, decoded.targetCard);
    const newId = numericCardId(decoded.newCard?.id);
    return actionFor(actor, "exchange",
      `${actor.username} exchanged ${compactCardName(oldId)} for ${compactCardName(newId)}`,
      `${actor.username}将${compactCardName(oldId, "zh")}换成${compactCardName(newId, "zh")}`);
  }
  if (type === "RefineCardResp" && decoded.result) {
    const consumed = visibleCardForServerIdentity(priorPrivate, decoded.targetCard);
    const postConsumptionHand = [...(priorPrivate?.hand ?? [])];
    const postConsumptionDeck = [...(priorPrivate?.deck ?? [])];
    const consumedPosition = Number.parseInt(String(decoded.targetCard?.position), 10);
    const consumedIndex = Number(decoded.targetCard?.index);
    if (consumedPosition === 0 && consumedIndex >= 0 && consumedIndex < postConsumptionHand.length) {
      postConsumptionHand.splice(consumedIndex, 1);
    } else if (consumedPosition === 1 && consumedIndex >= 0 && consumedIndex < postConsumptionDeck.length) {
      postConsumptionDeck[consumedIndex] = 0;
    }
    const upgradedIds = (decoded.resultingCards ?? []).flatMap((card) => {
      const rawId = numericCardId(card.id);
      if (rawId) return [rawId];
      const cardPosition = Number.parseInt(String(card.position), 10);
      const list = cardPosition === 0 ? postConsumptionHand : postConsumptionDeck;
      const existing = numericCardId(list?.[card.index]);
      const next = upgradedCardId(existing);
      return existing && next !== existing ? [next] : [];
    });
    const upgraded = upgradedIds.map((id) => compactCardName(id));
    const upgradedChinese = upgradedIds.map((id) => compactCardName(id, "zh"));
    return actionFor(actor, "absorb",
      upgraded.length
        ? `${actor.username} absorbed ${compactCardName(consumed)} and upgraded ${upgraded.join(", ")}`
        : `${actor.username} absorbed ${compactCardName(consumed)}`,
      upgradedChinese.length
        ? `${actor.username}吸收${compactCardName(consumed, "zh")}并升级${upgradedChinese.join("、")}`
        : `${actor.username}吸收${compactCardName(consumed, "zh")}`);
  }
  if (["LifeRankStatus", "GameStatus", "PlayerData"].includes(type)) {
    const actions = [];
    const changes = [];
    const updates = type === "LifeRankStatus"
      ? decoded.players ?? []
      : type === "GameStatus"
        ? decoded.publicPlayers ?? []
        : decoded.public ? [decoded.public] : [];
    for (const update of updates) {
      const oldLife = before.players[update.uid]?.life;
      if (!Number.isFinite(oldLife) || !Number.isFinite(update.life) || update.life === oldLife) continue;
      const who = playerIdentity(update.uid);
      const delta = update.life - oldLife;
      changes.push({
        actorUid: update.uid,
        actorUsername: who.username,
        actorCharacterEnglish: who.characterEnglish,
        actorCharacterChinese: who.characterChinese,
        delta,
        sourceSequence: Number(currentEventMeta?.sequence) || 0,
      });
    }
    if (changes.length) actions.push(destinyAction(changes, pendingBattleRound));
    if (type === "LifeRankStatus" && decoded.settledUid) {
      const settledPlayer = playerIdentity(decoded.settledUid);
      actions.push(actionFor(settledPlayer, "leave",
        `${settledPlayer.username} left the game`,
        `${settledPlayer.username}离开了游戏`));
    }

    if (priorPrivate && state.privatePlayer) {
      const talentChanges = selectionChanges(priorPrivate.talentSelections, state.privatePlayer.talentSelections);
      const fateChanges = selectionChanges(priorPrivate.fateStrategies?.strategies, state.privatePlayer.fateStrategies?.strategies);
      for (const change of talentChanges.filter((entry) => entry.rerolled)) {
        actions.push(actionFor(actor, "reroll",
          `${actor.username} rerolled the Immortal Fate offer`,
          `${actor.username}刷新了仙命选项`));
      }
      const previousRerolls = Number(priorPrivate.fateStrategies?.tempData?.[0]);
      const currentRerolls = Number(state.privatePlayer.fateStrategies?.tempData?.[0]);
      let unreportedRerolls = Number.isFinite(previousRerolls) && Number.isFinite(currentRerolls)
        ? Math.max(0, previousRerolls - currentRerolls)
        : 0;
      for (const change of fateChanges.filter((entry) => entry.rerolled)) {
        const oldIds = change.prior?.pending ?? [];
        const newIds = change.selection.pending ?? [];
        const removed = oldIds.find((id) => !newIds.includes(id));
        const added = newIds.find((id) => !oldIds.includes(id));
        const rerollCount = Math.max(1, unreportedRerolls);
        unreportedRerolls = 0;
        actions.push(actionFor(actor, "reroll",
          rerollCount > 1
            ? `${actor.username} rerolled ${rerollCount} Heavenly Derivation Fate options`
            : removed && added
            ? `${actor.username} rerolled ${compactFateStrategyName(removed)} into ${compactFateStrategyName(added)}`
            : `${actor.username} rerolled a Heavenly Derivation Fate offer`,
          rerollCount > 1
            ? `${actor.username}刷新了${rerollCount}个天衍仙命选项`
            : removed && added
            ? `${actor.username}将天衍仙命${compactFateStrategyName(removed, "zh")}刷新为${compactFateStrategyName(added, "zh")}`
            : `${actor.username}刷新了一个天衍仙命选项`));
      }

      const oldPhase = phaseNumber(before.players[actor.uid]?.phase);
      const newPhase = phaseNumber(state.players[actor.uid]?.phase);
      const chosenTalent = talentChanges.find((entry) => entry.selected);
      if (newPhase > oldPhase) {
        actions.push(chosenTalent
          ? actionFor(actor, "breakthrough",
            `${actor.username} broke through to ${phaseNamesEnglish[newPhase] ?? `phase ${newPhase}`} and chose ${compactTalentName(chosenTalent.selection.selected)} as their Immortal Fate`,
            `${actor.username}突破至${phaseNamesChinese[newPhase] ?? `境界 ${newPhase}`}并选择${compactTalentName(chosenTalent.selection.selected, "zh")}作为仙命`)
          : actionFor(actor, "breakthrough",
            `${actor.username} broke through to ${phaseNamesEnglish[newPhase] ?? `phase ${newPhase}`}`,
            `${actor.username}突破至${phaseNamesChinese[newPhase] ?? `境界 ${newPhase}`}`));
      }
      for (const change of talentChanges.filter((entry) => entry.selected && entry !== chosenTalent)) {
        actions.push(actionFor(actor, "immortalFate",
          `${actor.username} chose ${compactTalentName(change.selection.selected)} as their Immortal Fate`,
          `${actor.username}选择${compactTalentName(change.selection.selected, "zh")}作为仙命`));
      }
      if (chosenTalent && newPhase <= oldPhase) {
        actions.push(actionFor(actor, "immortalFate",
          `${actor.username} chose ${compactTalentName(chosenTalent.selection.selected)} as their Immortal Fate`,
          `${actor.username}选择${compactTalentName(chosenTalent.selection.selected, "zh")}作为仙命`));
      }
      for (const change of fateChanges.filter((entry) => entry.selected)) {
        actions.push(actionFor(actor, "heavenlyFate",
          `${actor.username} chose ${compactFateStrategyName(change.selection.selected)} as a Heavenly Derivation Fate`,
          `${actor.username}选择${compactFateStrategyName(change.selection.selected, "zh")}作为天衍仙命`));
      }
      const fateUses = inferredFateStrategyUses(before, state);
      const upgrades = fateUses.length === 1 ? cardUpgradeChanges(priorPrivate, state.privatePlayer) : [];
      for (const use of fateUses) {
        const nameEnglish = compactFateStrategyName(use.id);
        const nameChinese = compactFateStrategyName(use.id, "zh");
        actions.push(actionFor(actor, "heavenlyFateUse",
          upgrades.length
            ? `${actor.username} used ${nameEnglish}, upgrading ${upgrades.map(({ oldId, newId }) => `${compactCardName(oldId)} to ${compactCardName(newId)}`).join(", ")}`
            : `${actor.username} used ${nameEnglish}`,
          upgrades.length
            ? `${actor.username}使用${nameChinese}，将${upgrades.map(({ oldId, newId }) => `${compactCardName(oldId, "zh")}升级为${compactCardName(newId, "zh")}`).join("、")}`
            : `${actor.username}使用${nameChinese}`));
      }
    }
    return actions.length ? actions : null;
  }
  if (type === "BattleEmojiResp") {
    const who = playerIdentity(decoded.fromPlayerUid);
    return {
      ...actionFor(who, "emote", `${who.username} used emote ${decoded.emojiId}`, `${who.username}使用表情 ${decoded.emojiId}`),
      emojiId: Number(decoded.emojiId),
    };
  }
  return null;
}

function apply(type, decoded) {
  if (type === "GameStatus") {
    state.round = decoded.round;
    if (postBattlePreparationRound && Number(decoded.round) >= postBattlePreparationRound) {
      postBattlePreparationRound = 0;
      pendingBattleCultivationDelta = 0;
    }
    state.timer = decoded.timer;
    state.ended = decoded.ended;
    state.gameMode = decoded.gameMode;
    state.codeId = decoded.codeId;
    state.targetUid = decoded.mainViewUid || state.targetUid;
    for (const player of decoded.publicPlayers) state.players[player.uid] = player;
    if (decoded.observedPrivatePlayer) state.privatePlayer = decoded.observedPrivatePlayer;
  } else if (type === "PlayerData") {
    // The server broadcasts the next preparation state's PlayerData before the
    // next periodic GameStatus.  This is where the normal three-card draw (and
    // round-start choices) first appears, so attribute it to the new round now
    // instead of leaving those cards displayed under the completed battle.
    if (postBattlePreparationRound > Number(state.round)) {
      state.round = postBattlePreparationRound;
      pendingBattleCultivationDelta = 0;
    }
    if (decoded.public) state.players[decoded.public.uid] = decoded.public;
    if (decoded.private) {
      state.privatePlayer = decoded.private;
      // Spectator PlayerData broadcasts can pair another player's public data
      // with the currently observed player's private snapshot.  An omitted
      // private uid must not make that public player the replay's viewpoint.
      state.targetUid = decoded.private.uid || state.targetUid;
    }
  } else if (type === "CardOperationResp") {
    const sourcePosition = Number(decoded.otherParams?.[0]);
    const destinationPosition = Number(decoded.otherParams?.[2]);
    const cultivationDelta = sourcePosition === 0 && destinationPosition === 6 ? 1
      : sourcePosition === 6 && destinationPosition === 0 ? -1 : 0;
    if (applyRecordedCardStep(state.privatePlayer, { type, details: decoded })) {
      addCultivation(cultivationDelta);
    }
  } else if (type === "LifeRankStatus") {
    for (const update of decoded.players) {
      if (!state.players[update.uid]) state.players[update.uid] = { uid: update.uid, username: profiles.get(update.uid)?.username ?? update.uid };
      state.players[update.uid].life = update.life;
      state.players[update.uid].rank = update.rank;
    }
  } else if (type === "MoveCardReq" && state.privatePlayer) {
    advanceSyntheticRoundForCardAction();
    moveCard(decoded);
  } else if (type === "InsertCardReq" && state.privatePlayer) {
    advanceSyntheticRoundForCardAction();
    insertCard(decoded);
  } else if (type === "ReplaceCardResp" && state.privatePlayer) {
    advanceSyntheticRoundForCardAction();
    replaceCard(decoded);
  } else if (type === "RefineCardResp" && state.privatePlayer) {
    advanceSyntheticRoundForCardAction();
    refineCard(decoded);
  }
}

function visibleState() {
  updateChoiceHistories();
  const privateOwnerUid = state.privatePlayer?.uid || state.targetUid;
  const visibleDeck = (deck, unlockedDeckSlots) => (deck ?? [])
    .slice(0, Math.max(0, unlockedDeckSlots ?? deck?.length ?? 0))
    .map((id) => rememberCard(id));
  const visibleTalent = (id, counters = {}, includeChoiceHistory = false) => {
    const reference = {
      id: rememberTalent(id),
      runtime: Object.prototype.hasOwnProperty.call(counters, id)
        ? { kind: "fate counter", value: Number(counters[id]) }
        : null,
    };
    const history = includeChoiceHistory ? historyForSelected(choiceHistories.talents, id) : null;
    if (history) reference.choiceHistory = clone(history);
    return reference;
  };
  const visibleFateStrategy = (id, round, counters = {}, tempData = {}, hasPrivateRuntime = false) => {
    const info = rememberFateStrategy(id, round, counters, tempData);
    if (!hasPrivateRuntime) {
      delete info.runtime;
      delete info.locked;
    }
    return { id: Number(id), runtime: info.runtime ?? null, locked: Boolean(info.locked) };
  };
  const players = Object.fromEntries(Object.values(state.players).map((player) => {
    rememberCharacter(player);
    const profile = profiles.get(player.uid);
    return [player.uid, {
    uid: player.uid,
    username: player.username,
    rating: Number(profile?.actualModeScore ?? profile?.daoXinRankScore ?? profile?.rankScore ?? 0),
    life: player.life,
    extraMaxHp: player.extraMaxHp,
    cultivation: player.cultivation,
    physique: Number(player.permanentBuffCounters?.[10023] ?? 0),
    maxPhysique: Number(player.permanentBuffCounters?.[10024] ?? 0),
    phase: player.phase,
    sect: player.sect,
    career: player.career,
    nextOpponent: player.nextOpponent,
    previousOpponent: player.previousOpponent,
    characterId: player.characterId,
    character: player.character,
    skinNumber: player.skinNumber,
    skinColor: player.skinColor,
    talents: (player.talents ?? []).map((id) => visibleTalent(id, player.talentCounters, player.uid === privateOwnerUid)),
    rank: player.rank,
    ai: player.ai,
    exchangesRemainingPublic: player.exchangesRemainingPublic,
    wins: player.wins,
    losses: player.losses,
    settled: player.settled,
    lastRound: player.lastRound ? {
      life: player.lastRound.life,
      extraMaxHp: player.lastRound.extraMaxHp,
      cultivation: player.lastRound.cultivation,
      physique: Number(player.lastRound.permanentBuffCounters?.[10023] ?? 0),
      maxPhysique: Number(player.lastRound.permanentBuffCounters?.[10024] ?? 0),
      phase: player.lastRound.phase,
      talents: (player.lastRound.talents ?? []).map((id) => visibleTalent(id, player.lastRound.talentCounters)),
      deck: visibleDeck(player.lastRound.deck, player.lastRound.unlockedDeckSlots),
      fateStrategies: (player.lastRound.fateStrategies ?? []).map((id) => visibleFateStrategy(id, state.round)),
      battleBuffs: visibleBattleBuffs(player.lastRound),
    } : null,
  }];
  }));
  const privatePlayer = state.privatePlayer ? {
    uid: state.privatePlayer.uid,
    hand: (state.privatePlayer.hand ?? []).map((id) => rememberCard(id)),
    deck: visibleDeck(state.privatePlayer.deck, state.privatePlayer.unlockedDeckSlots),
    unlockedDeckSlots: state.privatePlayer.unlockedDeckSlots,
    exchangesRemaining: state.privatePlayer.exchangesRemaining,
    exchangeLimit: state.privatePlayer.exchangeLimit,
    cardStorage: {
      199: (state.privatePlayer.cardStorage?.[199]
        ?? state.privatePlayer.talentData?.[199]?.commonParams ?? []).map((id) => rememberCard(id)),
    },
    selectedFateStrategies: (state.privatePlayer.fateStrategies?.strategies ?? [])
      .map((selection) => selection.selected)
      .filter((id) => id > 0)
      .map((id) => {
        const reference = visibleFateStrategy(
          id,
          state.round,
          state.privatePlayer.fateStrategies?.counters,
          state.privatePlayer.fateStrategies?.tempData,
          true,
        );
        const history = historyForSelected(choiceHistories.fateStrategies, id);
        if (history) reference.choiceHistory = clone(history);
        return reference;
      }),
    daoYunChoices: [...choiceHistories.daoYun.values()]
      .filter((history) => history.selected > 0)
      .map((history) => ({ ...clone(history), selected: rememberCard(history.selected) })),
    cardSelections: choiceHistories.cardSelections
      .filter((history) => history.selected > 0)
      .map((history) => {
        const { fingerprint: _fingerprint, ...visibleHistory } = history;
        return { ...clone(visibleHistory), selected: rememberCard(history.selected) };
      }),
  } : null;
  if (privatePlayer) {
    const activeHdf = (state.privatePlayer.fateStrategies?.strategies ?? []).find((selection) => selection.pending?.length && !selection.selected);
    const activeTalent = (state.privatePlayer.talentSelections ?? []).find((selection) => selection.pending?.length && !selection.selected);
    const activeDaoYun = (state.privatePlayer.daoYunSelections ?? []).find((selection) => selection.pending?.length && !selection.selected);
    const activeCardSelection = state.privatePlayer.cardSelectionData?.group?.cardIds?.length
      && !state.privatePlayer.cardSelectionData.selected
      ? state.privatePlayer.cardSelectionData
      : null;
    if (activeHdf) {
      privatePlayer.choiceOverlay = {
        kind: "heavenly-derivation",
        title: "Select a Heavenly Derivation Fate",
        roundOrPhase: activeHdf.id,
        rerollsRemaining: Number(state.privatePlayer.fateStrategies?.tempData?.[0] ?? 0),
        options: activeHdf.pending.map((id) => visibleFateStrategy(
          id,
          state.round,
          state.privatePlayer.fateStrategies?.counters,
          state.privatePlayer.fateStrategies?.tempData,
          true,
        )),
      };
    } else if (activeTalent) {
      privatePlayer.choiceOverlay = {
        kind: "immortal-fate",
        title: "Select an Immortal Fate",
        roundOrPhase: activeTalent.id,
        options: activeTalent.pending.map((id) => visibleTalent(id)),
      };
    } else if (activeDaoYun) {
      privatePlayer.choiceOverlay = {
        kind: "daoist-rhyme",
        title: "Select a Card",
        roundOrPhase: activeDaoYun.id,
        options: activeDaoYun.pending.map((id) => ({ assetKind: "card", id: rememberCard(id) })),
      };
    } else if (activeCardSelection) {
      privatePlayer.choiceOverlay = {
        kind: "card-selection",
        title: "Select a Card",
        roundOrPhase: Number(state.round) || 1,
        options: activeCardSelection.group.cardIds
          .map((id) => ({ assetKind: "card", id: rememberCard(id) })),
      };
    }
  }
  return { ...state, players, privatePlayer };
}

function sameValue(first, second) { return JSON.stringify(first) === JSON.stringify(second); }
function statePatch(before, after) {
  if (sameValue(before, after)) return undefined;
  if (!before || !after || typeof before !== "object" || typeof after !== "object" || Array.isArray(before) || Array.isArray(after)) return clone(after);
  const patch = {};
  for (const key of new Set([...Object.keys(before), ...Object.keys(after)])) {
    if (!Object.prototype.hasOwnProperty.call(after, key)) patch[key] = { $deleted: true };
    else {
      const child = statePatch(before[key], after[key]);
      if (child !== undefined) patch[key] = child;
    }
  }
  return Object.keys(patch).length ? patch : undefined;
}

for (const event of rawEvents) {
  if (event.event !== "websocket_frame" || !event.messageType) continue;
  let decoded;
  try { decoded = decodeMessage(event.messageType, Buffer.from(event.protobufBase64 ?? "", "base64")); }
  catch (error) { decoded = { decodeError: String(error) }; }
  if (event.messageType === "BattleResult") {
    pendingBattleRound = Number(decoded.round) || 0;
    postBattlePreparationRound = pendingBattleRound ? pendingBattleRound + 1 : 0;
    // Whether battle-end field passives fired (and Space Spiritual Field's
    // effective level) is not reliably implied by the locked battle deck.
    // Post-processing infers the exact cultivation from the next authoritative
    // snapshot; keep the streaming fallback neutral here.
    pendingBattleCultivationDelta = 0;
  }
  const before = clone(state);
  currentEventMeta = { sequence: event.sequence, type: event.messageType };
  apply(event.messageType, decoded);
  const currentVisibleState = visibleState();
  const action = humanAction(event.messageType, decoded, before);
  const humanActions = (Array.isArray(action) ? action : action ? [action] : []).filter(Boolean);
  if (pendingBattleRound && humanActions.some((entry) => entry.kind !== "destiny")) pendingBattleRound = 0;
  steps.push({
    sequence: event.sequence,
    observedAt: event.observedAt,
    direction: event.direction,
    type: event.messageType,
    description: describe(event.messageType, decorateCards(decoded), event.direction),
    details: decorateCards(decoded),
    humanActions,
    state: currentVisibleState,
  });
}
currentEventMeta = null;
// Raw actions can legitimately arrive before the next periodic private-state
// snapshot. Validate them after round-start reconstruction has inserted the
// one forward state that precedes each displayed action.
cardTransitionIssues.length = 0;

function pairGameStatusRequests(inputSteps) {
  for (let index = 0; index + 1 < inputSteps.length; index += 1) {
    const request = inputSteps[index];
    const response = inputSteps[index + 1];
    if (request.type !== "SimpleClientPact" || !String(request.details?.type).startsWith("3 (")) continue;
    if (response.type !== "GameStatus") continue;
    request.description = `Authoritative game snapshot — round ${response.state.round}`;
    request.humanActions = [...response.humanActions];
    request.state = response.state;
    response.humanActions = [];
  }
  return inputSteps;
}

function collapseBattleDestinyRuns(inputSteps) {
  const output = [];
  let pending = null;
  const flush = () => {
    if (!pending) return;
    const destinyActions = pending.humanActions;
    pending.humanActions = [destinyAction(
      destinyActions.flatMap((action) => action.changes ?? []),
      destinyActions.findLast((action) => action.round)?.round,
    )];
    output.push(pending);
    pending = null;
  };
  for (const step of inputSteps) {
    if (pending && Number(step.state?.round) !== Number(pending.state?.round)) flush();
    const actions = step.humanActions ?? [];
    // Only coalesce changes that have already been attributed to a concrete
    // battle.  Other destiny changes may come from cards, fates, or round
    // effects and must remain distinct timeline events.
    const destinyOnly = actions.length > 0 && actions.every((action) =>
      action.kind === "destiny" && Number(action.round) > 0);
    if (destinyOnly) {
      if (pending) {
        pending.humanActions.push(...actions);
        pending.sequence = step.sequence;
        pending.observedAt = step.observedAt;
        pending.state = step.state;
      } else {
        flush();
        pending = { ...step, humanActions: [...actions] };
      }
      continue;
    }
    // A BattleResult is a visible timeline boundary even when it has no action
    // text of its own.  LifeRankStatus can arrive before BattleResult; treating
    // the latter as another empty packet drops the entire battle-result view.
    const cardMutation = ["MoveCardReq", "InsertCardReq", "ReplaceCardResp", "RefineCardResp"].includes(step.type);
    if (pending && actions.length === 0 && step.type !== "BattleResult" && !cardMutation) {
      pending.sequence = step.sequence;
      pending.observedAt = step.observedAt;
      pending.state = step.state;
      continue;
    }
    flush();
    output.push(step);
  }
  flush();
  return output;
}

const logicalSteps = collapseBattleDestinyRuns(pairGameStatusRequests(steps));

function undoRecordedCardStep(privatePlayer, step) {
  if (step.type !== "ReplaceCardResp" || !String(step.details?.result).startsWith("1 ")) return false;
  const hand = privatePlayer?.hand;
  const deck = privatePlayer?.deck;
  if (!hand || !deck) return false;
  const listFor = (position) => Number.parseInt(String(position), 10) === 0
    ? hand
    : Number.parseInt(String(position), 10) === 1 ? deck : null;
  const oldCard = step.details.targetCard;
  const newCard = step.details.newCard;
  const oldList = listFor(oldCard?.position);
  const newList = listFor(newCard?.position);
  const oldId = numericCardId(oldCard?.id);
  const newId = numericCardId(newCard?.id);
  if (!oldList || !newList || !oldId || !newId) return false;
  let newIndex = Number(newCard.index);
  if (Number(newList[newIndex]) !== newId) newIndex = newList.findIndex((id) => Number(id) === newId);
  if (newIndex < 0) return false;
  newList.splice(newIndex, 1);
  oldList.splice(Math.max(0, Math.min(oldList.length, Number(oldCard.index))), 0, oldId);
  return true;
}

function inferredExchangeStatsBeforeSteps(authoritativeState, priorSteps) {
  const authoritative = visibleExchangeStats(authoritativeState);
  const exchangeActions = priorSteps.filter((step) =>
    step.type === "ReplaceCardResp" && String(step.details?.result).startsWith("1 ")).length;
  const approximateStart = Math.min(
    Number(authoritativeState.privatePlayer?.exchangeLimit) || Infinity,
    authoritative.remaining + exchangeActions,
  );
  const candidates = [];
  const maxStart = Math.max(100, approximateStart + 50);
  const maxCuriosity = authoritative.hasCuriosity ? Math.max(9, authoritative.curiosity + exchangeActions) : 0;
  const maxShift = authoritative.hasShiftAsCloud ? 1 : 0;
  for (let remaining = 0; remaining <= maxStart; remaining += 1) {
    for (let curiosity = authoritative.hasCuriosity ? authoritative.curiosity : 0; curiosity <= maxCuriosity; curiosity += 1) {
      for (let shiftAsCloud = authoritative.hasShiftAsCloud ? authoritative.shiftAsCloud : 0; shiftAsCloud <= maxShift; shiftAsCloud += 1) {
        let stats = { ...authoritative, remaining, curiosity, shiftAsCloud };
        for (const step of priorSteps) stats = exchangeStatsAfterStep(stats, step);
        if (stats.remaining === authoritative.remaining
          && stats.curiosity === authoritative.curiosity
          && stats.shiftAsCloud === authoritative.shiftAsCloud) {
          candidates.push({ remaining, curiosity, shiftAsCloud });
        }
      }
    }
  }
  candidates.sort((first, second) => Math.abs(first.remaining - approximateStart) - Math.abs(second.remaining - approximateStart)
    || first.curiosity - second.curiosity || first.shiftAsCloud - second.shiftAsCloud);
  return { ...authoritative, ...(candidates[0] ?? { remaining: approximateStart }) };
}

function normalizeInitialSteps(inputSteps) {
  const firstStateIndex = inputSteps.findIndex((step) => Number(step.state?.round) > 0
    && step.state?.privatePlayer && Object.keys(step.state?.players ?? {}).length > 0);
  if (firstStateIndex < 0) return inputSteps;
  const authoritative = inputSteps[firstStateIndex];
  const precedingActions = inputSteps.slice(0, firstStateIndex)
    .filter((step) => step.humanActions?.length);
  const initialState = clone(authoritative.state);
  for (const step of [...precedingActions].reverse()) undoRecordedCardStep(initialState.privatePlayer, step);
  let workingStats = inferredExchangeStatsBeforeSteps(authoritative.state, precedingActions);
  writeVisibleExchangeStats(initialState, workingStats);
  const normalized = [{
    sequence: authoritative.sequence,
    observedAt: authoritative.observedAt,
    direction: "synthetic",
    type: "InitialState",
    description: "Initial recorded game state",
    details: { round: Number(initialState.round) },
    humanActions: [],
    state: initialState,
  }];
  let workingState = clone(initialState);
  for (const step of precedingActions) {
    applyRecordedCardStep(workingState.privatePlayer, step);
    workingStats = exchangeStatsAfterStep(workingStats, step);
    writeVisibleExchangeStats(workingState, workingStats);
    const actor = workingState.players?.[workingState.privatePlayer?.uid];
    for (const action of step.humanActions) {
      if (!actor || action.actorUid !== actor.uid) continue;
      const names = catalog.characters[actor.characterId] ?? {};
      action.actorCharacterEnglish = names.nameEnglish || actor.character || action.actorCharacterEnglish;
      action.actorCharacterChinese = names.nameChinese || actor.character || action.actorCharacterChinese;
    }
    step.state = clone(workingState);
    normalized.push(step);
  }
  normalized.push(...inputSteps.slice(firstStateIndex + 1));
  inputSteps.splice(0, inputSteps.length, ...normalized);
  return inputSteps;
}

normalizeInitialSteps(logicalSteps);

const rawLifeRankEvents = steps.flatMap((step, rawIndex) => step.type === "LifeRankStatus"
  ? [{ step, rawIndex }]
  : []);

function rawExactLifeDeltaEvent(uid, postBattleLife, expectedDelta, priorStatus, nextStatus, battleStep) {
  return rawLifeRankEvents
    .filter(({ step }) => Number(step.sequence) > Number(priorStatus?.sequence ?? 0)
      && Number(step.sequence) < Number(nextStatus?.sequence ?? Infinity)
      && Number(step.state?.players?.[uid]?.life) === Number(postBattleLife))
    .filter(({ step, rawIndex }) => {
      const beforeLife = Number(steps[rawIndex - 1]?.state?.players?.[uid]?.life);
      return Number.isFinite(beforeLife)
        && Number(step.state.players[uid].life) - beforeLife === Number(expectedDelta);
    })
    .sort((first, second) =>
      Math.abs(Number(first.step.sequence) - Number(battleStep.sequence))
      - Math.abs(Number(second.step.sequence) - Number(battleStep.sequence)))[0] ?? null;
}

function rawPublicBattleLifeEvent(uid, result, deck, infuseGain, priorStatus, nextStatus, battleStep) {
  const maximumGain = maximumBattleDestinyGain(deck);
  return rawLifeRankEvents
    .filter(({ step }) => Number(step.sequence) > Number(priorStatus?.sequence ?? 0)
      && Number(step.sequence) < Number(nextStatus?.sequence ?? Infinity))
    .map(({ step, rawIndex }) => {
      const beforeLife = Number(steps[rawIndex - 1]?.state?.players?.[uid]?.life);
      const afterLife = Number(step.state?.players?.[uid]?.life);
      const delta = afterLife - beforeLife;
      const battleDelta = result === "loss" && infuseGain > 0 ? delta - infuseGain : delta;
      return { step, rawIndex, beforeLife, afterLife, delta, battleDelta };
    })
    .filter((entry) => Number.isFinite(entry.beforeLife) && Number.isFinite(entry.afterLife)
      && (result === "loss" ? entry.battleDelta < 0 : entry.delta > 0 && maximumGain > 0))
    .sort((first, second) =>
      Math.abs(Number(first.step.sequence) - Number(battleStep.sequence))
        - Math.abs(Number(second.step.sequence) - Number(battleStep.sequence))
      || Number(first.step.sequence) - Number(second.step.sequence))[0] ?? null;
}

function visibleTalentCounter(player, talentId) {
  const value = (player?.talents ?? [])
    .find((entry) => numericCardId(entry?.id ?? entry) === talentId)?.runtime?.value;
  return Number(value);
}

function fiveElementsInfuseGain(player) {
  const before = visibleTalentCounter(player?.lastRound, 133);
  const after = visibleTalentCounter(player, 133);
  return Number.isFinite(before) && Number.isFinite(after) && after > before ? after - before : 0;
}

function maximumBattleDestinyGain(deck = []) {
  // Dew Jade Vase can be reached repeatedly as the deck cycles, so its exact
  // gain requires the battle trace. Its presence permits a positive result;
  // without it, current-season battle rules do not increase the owner's
  // Destiny during battle.
  return deck.some((value) => [99000101, 99010101, 99020101].includes(numericCardId(value)))
    ? Infinity : 0;
}

function attachBattleRounds(inputSteps) {
  for (let battleIndex = 0; battleIndex < inputSteps.length; battleIndex += 1) {
    const battleStep = inputSteps[battleIndex];
    if (battleStep.type !== "BattleResult") continue;
    const round = Number(battleStep.details?.round ?? battleStep.state?.round) || 0;
    const followingStatuses = inputSteps.slice(battleIndex + 1)
      .filter((step) => step.type === "GameStatus");
    const nextStatus = followingStatuses.find((step) => Number(step.details?.round) > round)
      ?? followingStatuses.find((step) => Number(step.details?.round) === round && step.details?.ended)
      ?? followingStatuses.findLast((step) => Number(step.details?.round) === round);
    const rawPriorStatus = steps.findLast((step) => step.type === "GameStatus"
      && Number(step.sequence) < Number(battleStep.sequence)
      && Number(step.state?.round) === round);
    const rawNextStatus = steps.find((step) => step.type === "GameStatus"
      && Number(step.sequence) > Number(battleStep.sequence)
      && (Number(step.state?.round) > round || step.state?.ended));
    const beforePlayers = rawPriorStatus?.state?.players ?? battleStep.state?.players ?? {};
    const afterPlayers = rawNextStatus?.state?.players ?? nextStatus?.state?.players ?? {};
    const authoritativeWinner = battleStep.details?.winnerUid || "";
    const authoritativeFirst = battleStep.details?.firstPlayerUid || "";
    const reportedDestinyDamage = Math.abs(Number(battleStep.details?.destinyDamage ?? 0));
    const rows = {};
    for (const player of Object.values(afterPlayers)) {
      const lastRound = player.lastRound;
      const opponentUid = beforePlayers[player.uid]?.nextOpponent || "";
      if (!lastRound || !opponentUid || beforePlayers[opponentUid]?.nextOpponent !== player.uid || beforePlayers[player.uid]?.settled) continue;
      const oldWins = Number(beforePlayers[player.uid]?.wins ?? 0);
      const oldLosses = Number(beforePlayers[player.uid]?.losses ?? 0);
      let result = "draw";
      if (Number(player.wins ?? 0) > oldWins) result = "win";
      else if (Number(player.losses ?? 0) > oldLosses) result = "loss";
      const preBattleLife = Number(beforePlayers[player.uid]?.life ?? player.life ?? 0);
      const infuseGain = fiveElementsInfuseGain(player);
      let battleLifeEvent = rawPublicBattleLifeEvent(
        player.uid,
        result,
        lastRound.deck,
        infuseGain,
        rawPriorStatus,
        rawNextStatus,
        battleStep,
      );
      // Some server versions batch both the battle result and the next
      // round's Five Elements Infuse into the following GameStatus without an
      // intervening LifeRankStatus. Its public life delta is the net of those
      // two effects; the talent counter supplies the exact Infuse component.
      const nextStatusObservedDelta = Number(player.life) - preBattleLife;
      if (!battleLifeEvent && result === "loss" && infuseGain > 0
        && nextStatusObservedDelta - infuseGain < 0 && rawNextStatus) {
        battleLifeEvent = {
          step: rawNextStatus,
          beforeLife: preBattleLife,
          afterLife: Number(player.life),
          delta: nextStatusObservedDelta,
          battleDelta: nextStatusObservedDelta - infuseGain,
        };
      }
      const hasSettlementBoundary = Boolean(battleLifeEvent);
      const lifeBefore = hasSettlementBoundary ? battleLifeEvent.beforeLife : preBattleLife;
      const lastRoundLife = Number(lastRound.life);
      let lifeAfter = hasSettlementBoundary
        ? battleLifeEvent.beforeLife + battleLifeEvent.battleDelta
        : Number.isFinite(lastRoundLife) && lastRoundLife !== preBattleLife
          ? lastRoundLife : Number(player.life ?? preBattleLife);
      // A winner cannot lose Destiny as a consequence of the battle. Older
      // server builds could immediately apply an AI breakthrough/choice cost
      // (notably around Build Good Karma) while leaving lastRound.life at the
      // pre-battle value. Keep that post-battle cost out of the modal.
      if (!hasSettlementBoundary && result === "win" && lifeAfter < lifeBefore) lifeAfter = lifeBefore;
      const maximumGain = maximumBattleDestinyGain(lastRound.deck);
      if (lifeAfter - lifeBefore > maximumGain) lifeAfter = lifeBefore + maximumGain;
      if (result === "draw" && lifeAfter < lifeBefore) result = "loss";
      rows[player.uid] = {
        uid: player.uid,
        opponentUid,
        username: player.username,
        characterId: player.characterId,
        character: player.character,
        skinNumber: player.skinNumber,
        skinColor: player.skinColor,
        sect: player.sect,
        career: player.career,
        phase: lastRound.phase,
        cultivation: lastRound.cultivation,
        speed: Number(lastRound.speed ?? 0),
        physique: Number(lastRound.permanentBuffCounters?.[10023] ?? 0),
        maxPhysique: Number(lastRound.permanentBuffCounters?.[10024] ?? 0),
        lifeBefore,
        lifeDelta: lifeAfter - lifeBefore,
        lifeEventSequence: hasSettlementBoundary && lifeAfter !== lifeBefore
          ? Number(battleLifeEvent.step.sequence) || 0 : 0,
        lifeEventObservedDelta: hasSettlementBoundary ? battleLifeEvent.delta : 0,
        postBattleDestinyDelta: hasSettlementBoundary
          ? battleLifeEvent.delta - battleLifeEvent.battleDelta : 0,
        result,
        first: false,
        talents: lastRound.talents ?? [],
        fateStrategies: lastRound.fateStrategies ?? [],
        battleBuffs: lastRound.battleBuffs ?? [],
        deck: lastRound.deck ?? [],
      };
    }
    const publicMatchups = [];
    const pairedPublicUids = new Set();
    for (const [uid, row] of Object.entries(rows)) {
      const opponent = rows[row.opponentUid];
      if (!opponent || opponent.opponentUid !== uid || pairedPublicUids.has(uid) || pairedPublicUids.has(opponent.uid)) continue;
      pairedPublicUids.add(uid);
      pairedPublicUids.add(opponent.uid);
      publicMatchups.push({ players: { [uid]: row, [opponent.uid]: opponent } });
    }
    const recordedPlayers = [battleStep.details?.p1?.public, battleStep.details?.p2?.public].filter(Boolean);
    const recordedUids = new Set(recordedPlayers.map((player) => player.uid));
    const authoritativeRows = {};
    for (const player of recordedPlayers) {
      const opponent = recordedPlayers.find((candidate) => candidate.uid !== player.uid);
      const lastRound = player.lastRound;
      if (!opponent || !lastRound) continue;
      const postBattleLife = Number(player.life ?? lastRound.life ?? 0);
      const reportedDelta = postBattleLife - Number(lastRound.life ?? player.life ?? 0);
      const innerDemon = beforePlayers[player.uid]?.nextOpponent !== opponent.uid;
      const maximumGain = maximumBattleDestinyGain(lastRound.deck);
      let authoritativeDelta = reportedDelta;
      if (innerDemon) authoritativeDelta = 0;
      else if (player.uid === authoritativeWinner) {
        // BattleResult.public can already contain an immediately following
        // Destiny cost. Winners do not lose Destiny in battle; only Dew Jade
        // Vase can make their battle delta positive.
        authoritativeDelta = reportedDelta > 0 && maximumGain > 0 ? reportedDelta : 0;
      } else if (maximumGain === 0 && reportedDestinyDamage > 0) {
        // For an ordinary real loser, destinyDamage is the battle component
        // even if public.life has already incorporated a later effect.
        authoritativeDelta = -reportedDestinyDamage;
      }
      const exactLifeEvent = rawExactLifeDeltaEvent(
        player.uid,
        postBattleLife,
        authoritativeDelta,
        rawPriorStatus,
        rawNextStatus,
        battleStep,
      );
      const lifeEventSequence = Number(exactLifeEvent?.step.sequence) || 0;
      rememberCharacter(player);
      authoritativeRows[player.uid] = {
        uid: player.uid,
        opponentUid: opponent.uid,
        username: player.username,
        characterId: player.characterId,
        character: player.character,
        skinNumber: player.skinNumber,
        skinColor: player.skinColor,
        sect: player.sect,
        career: player.career,
        phase: lastRound.phase,
        cultivation: lastRound.cultivation,
        speed: battleSpeed(lastRound),
        physique: Number(lastRound.permanentBuffCounters?.[10023] ?? 0),
        maxPhysique: Number(lastRound.permanentBuffCounters?.[10024] ?? 0),
        lifeBefore: Number(lastRound.life ?? player.life ?? 0),
        lifeDelta: authoritativeDelta,
        lifeEventSequence,
        result: player.uid === authoritativeWinner ? "win" : "loss",
        ...(innerDemon ? { innerDemon: true } : {}),
        first: player.uid === authoritativeFirst,
        talents: (lastRound.talents ?? []).map((id) => ({ id: rememberTalent(numericCardId(id)), runtime: null })),
        fateStrategies: (lastRound.fateStrategies ?? []).map((id) => ({
          id: rememberFateStrategy(numericCardId(id), round).id,
          runtime: null,
          locked: false,
        })),
        battleBuffs: visibleBattleBuffs(lastRound),
        deck: (lastRound.deck ?? []).map(rememberCard),
      };
    }
    const matchups = [];
    if (Object.keys(authoritativeRows).length === 2) matchups.push({ authoritative: true, players: authoritativeRows });
    const authoritativePairKey = [...recordedUids].sort().join(":");
    for (const matchup of publicMatchups) {
      const publicUids = Object.keys(matchup.players);
      if (publicUids.slice().sort().join(":") === authoritativePairKey) continue;
      for (const uid of publicUids) {
        if (recordedUids.has(uid)) matchup.players[uid].innerDemon = true;
      }
      matchups.push(matchup);
    }
    for (const matchup of matchups) {
      for (const player of Object.values(matchup.players)) {
        const opponent = matchup.players[player.opponentUid];
        if (!opponent || player.first || opponent.first) continue;
        const playerInitiative = Number(player.cultivation) + Number(player.speed);
        const opponentInitiative = Number(opponent.cultivation) + Number(opponent.speed);
        if (playerInitiative !== opponentInitiative) player.first = playerInitiative > opponentInitiative;
      }
    }
    if (matchups.length) battleStep.battle = { round, matchups };
  }
  return inputSteps;
}

attachBattleRounds(logicalSteps);

function associateBattleDestinyActions(inputSteps) {
  const consumedLifeEvents = new Map();
  const replacementLifeEvents = new Map();
  const cleanChange = ({ sourceSequence: _sourceSequence, ...change }) => change;
  const consumeKey = (sequence, uid, delta) => `${Number(sequence)}:${uid}:${Number(delta)}`;

  for (const step of inputSteps.filter((candidate) => candidate.battle)) {
    const originalDestinyChanges = (step.humanActions ?? [])
      .filter((action) => action.kind === "destiny")
      .flatMap((action) => action.changes ?? []);
    const changesByUid = new Map();
    for (const matchup of step.battle.matchups ?? []) {
      for (const player of Object.values(matchup.players ?? {})) {
        const delta = Number(player.lifeDelta);
        const lifeEventSequence = Number(player.lifeEventSequence) || 0;
        const lifeEventObservedDelta = Number(player.lifeEventObservedDelta);
        const postBattleDestinyDelta = Number(player.postBattleDestinyDelta);
        delete player.lifeEventSequence;
        delete player.lifeEventObservedDelta;
        delete player.postBattleDestinyDelta;
        const statePlayer = step.state?.players?.[player.uid];
        const hasSeparateSameStepChange = originalDestinyChanges.some((change) =>
          change.actorUid === player.uid && Number(change.delta) !== delta);
        if (statePlayer && Number.isFinite(Number(player.lifeBefore)) && !hasSeparateSameStepChange) {
          statePlayer.life = Number(player.lifeBefore) + delta;
        }
        if (!delta || changesByUid.has(player.uid)) continue;
        changesByUid.set(player.uid, {
          actorUid: player.uid,
          actorUsername: player.username,
          actorCharacterEnglish: catalog.characters[player.characterId]?.nameEnglish || player.character,
          actorCharacterChinese: catalog.characters[player.characterId]?.nameChinese || player.character,
          delta,
        });
        if (lifeEventSequence > 0) {
          const observedDelta = Number.isFinite(lifeEventObservedDelta)
            ? lifeEventObservedDelta : delta;
          const key = consumeKey(lifeEventSequence, player.uid, observedDelta);
          consumedLifeEvents.set(key, (consumedLifeEvents.get(key) ?? 0) + 1);
          if (postBattleDestinyDelta) {
            const replacements = replacementLifeEvents.get(key) ?? [];
            replacements.push(postBattleDestinyDelta);
            replacementLifeEvents.set(key, replacements);
          }
        }
      }
    }
    const battleChanges = [...changesByUid.values()];
    const otherActions = (step.humanActions ?? []).filter((action) => action.kind !== "destiny");
    const unmatchedOriginal = [...originalDestinyChanges];
    for (const battleChange of battleChanges) {
      const matchIndex = unmatchedOriginal.findIndex((change) =>
        change.actorUid === battleChange.actorUid && Number(change.delta) === Number(battleChange.delta));
      if (matchIndex >= 0) unmatchedOriginal.splice(matchIndex, 1);
    }
    const separateSameStep = unmatchedOriginal.length
      ? destinyAction(unmatchedOriginal.map(cleanChange), 0) : null;
    step.humanActions = [
      ...otherActions,
      ...(battleChanges.length ? [destinyAction(battleChanges, step.battle.round)] : []),
      ...(separateSameStep ? [separateSameStep] : []),
    ];
  }

  for (const step of inputSteps.filter((candidate) => !candidate.battle)) {
    const rewrittenActions = [];
    for (const action of step.humanActions ?? []) {
      if (action.kind !== "destiny" || !(action.changes?.length)) {
        rewrittenActions.push(action);
        continue;
      }
      const remaining = [];
      for (const change of action.changes) {
        const key = consumeKey(change.sourceSequence, change.actorUid, change.delta);
        const count = consumedLifeEvents.get(key) ?? 0;
        if (count > 0) {
          if (count === 1) consumedLifeEvents.delete(key);
          else consumedLifeEvents.set(key, count - 1);
          const replacements = replacementLifeEvents.get(key) ?? [];
          const replacementDelta = replacements.shift();
          if (replacements.length) replacementLifeEvents.set(key, replacements);
          else replacementLifeEvents.delete(key);
          if (replacementDelta) remaining.push({ ...cleanChange(change), delta: replacementDelta });
        } else {
          remaining.push(cleanChange(change));
        }
      }
      if (remaining.length) rewrittenActions.push(destinyAction(remaining, 0));
    }
    step.humanActions = rewrittenActions;
  }
  return inputSteps;
}

associateBattleDestinyActions(logicalSteps);

function applyRecordedCardStep(privatePlayer, step, wrap = (id) => id, reportIssue = null) {
  const hand = privatePlayer?.hand;
  const deck = privatePlayer?.deck;
  const action = step.details ?? {};
  const issue = (reason, extra = {}) => {
    reportIssue?.(reason, action, extra);
    return false;
  };
  if (!hand || !deck) return issue("private hand or deck is unavailable");
  const idOf = (entry) => entry && typeof entry === "object" ? entry.id : entry;
  const isEmpty = (entry) => entry && typeof entry === "object"
    ? Number(entry.id) === 0 && entry.id != null
    : !Number(entry);
  const combinationResult = (first, second) => combinationResultId(
    Number(idOf(first)), Number(idOf(second)), privatePlayer,
  );
  const canCombine = (first, second) => combinationResult(first, second) > 0;
  const combinedEntry = (first, second) => {
    const resultId = combinationResult(first, second);
    const firstId = Number(idOf(first));
    const survivor = firstId === 1 ? second : first;
    if (survivor && typeof survivor === "object") {
      survivor.id = resultId;
      return survivor;
    }
    return resultId;
  };
  const upgraded = (entry) => {
    if (entry && typeof entry === "object") {
      entry.id = upgradedCardId(Number(entry.id));
      return entry;
    }
    return upgradedCardId(Number(entry));
  };
  const switchedForHand = (entry) => {
    if (entry && typeof entry === "object" && entry.id == null) return { ...entry, id: null };
    const switchedId = switchCardForHand(Number(idOf(entry)));
    if (entry && typeof entry === "object") return { ...entry, id: switchedId };
    return switchedId;
  };
  if (step.type === "CardOperationResp" && Number(action.operation) === 1 && Number(action.useCase) === 6) {
    privatePlayer.cardStorage ??= {};
    const storage = privatePlayer.cardStorage[199] ??= (
      privatePlayer.talentData?.[199]?.commonParams ?? [0, 0, 0]
    ).map((id) => wrap(id));
    while (storage.length < 3) storage.push(wrap(0));
    const sourcePosition = Number(action.otherParams?.[0]);
    const sourceIndex = Number(action.otherParams?.[1]);
    const destinationPosition = Number(action.otherParams?.[2]);
    const destinationIndex = Number(action.otherParams?.[3]);
    const source = sourcePosition === 0 ? hand : sourcePosition === 6 ? storage : null;
    if (!source || sourceIndex < 0 || sourceIndex >= source.length || isEmpty(source[sourceIndex])) {
      return issue("card-storage source is invalid");
    }
    const card = source[sourceIndex];
    if (sourcePosition === 0 && destinationPosition === 6) {
      if (destinationIndex < 0 || destinationIndex >= storage.length) return issue("card-storage destination is invalid");
      hand.splice(sourceIndex, 1);
      const displaced = storage[destinationIndex];
      storage[destinationIndex] = card;
      if (!isEmpty(displaced)) hand.push(displaced);
      return true;
    }
    if (sourcePosition === 6 && destinationPosition === 0) {
      storage[sourceIndex] = wrap(0);
      hand.push(card);
      return true;
    }
    if (sourcePosition === 6 && destinationPosition === 6) {
      if (destinationIndex < 0 || destinationIndex >= storage.length) return issue("card-storage destination is invalid");
      const displaced = storage[destinationIndex];
      storage[destinationIndex] = card;
      storage[sourceIndex] = displaced;
      return true;
    }
    return issue("card-storage positions are invalid");
  }
  const location = (card, matchIdentity = false) => {
    const position = Number.parseInt(String(card?.position), 10);
    const list = position === 0 ? hand : position === 1 ? deck : null;
    const reportedIndex = Number(card?.index);
    const id = numericCardId(card?.id);
    let index = reportedIndex;
    if (matchIdentity && list) {
      const currentId = index >= 0 && index < list.length ? idOf(list[index]) : undefined;
      if (currentId !== null && !sameCardIdentity(currentId, id)) {
        const candidates = list.map((entry, candidateIndex) => sameCardIdentity(idOf(entry), id) ? candidateIndex : -1)
          .filter((candidateIndex) => candidateIndex >= 0)
          .sort((first, second) => Math.abs(first - reportedIndex) - Math.abs(second - reportedIndex));
        if (candidates.length) index = candidates[0];
        else {
          const unresolved = list.map((entry, candidateIndex) =>
            entry && typeof entry === "object" && entry.id == null ? candidateIndex : -1)
            .filter((candidateIndex) => candidateIndex >= 0)
            .sort((first, second) => Math.abs(first - reportedIndex) - Math.abs(second - reportedIndex));
          index = unresolved[0] ?? -1;
        }
      }
    }
    return { list, index, id };
  };
  if (step.type === "ReplaceCardResp" && String(step.details?.result).startsWith("1 ")) {
    const old = location(step.details.targetCard, true);
    const next = location(step.details.newCard);
    if (!old.list || !next.list || old.index < 0 || old.index >= old.list.length) {
      return issue("exchange card location is invalid");
    }
    const removed = old.list[old.index];
    if (removed && typeof removed === "object" && removed.id == null) removed.id = old.id;
    old.list.splice(old.index, 1);
    next.list.splice(Math.max(0, Math.min(next.list.length, next.index)), 0, wrap(next.id));
    return true;
  }
  if (step.type === "RefineCardResp" && step.details?.result) {
    const target = location(step.details.targetCard, true);
    if (!target.list || target.index < 0 || target.index >= target.list.length) {
      return issue("refine target location is invalid");
    }
    const removed = target.list[target.index];
    if (removed && typeof removed === "object" && removed.id == null) removed.id = target.id;
    // Clicking Daoist Rhyme Aura opens the choice. The card is not consumed
    // until that choice resolves, and an intervening PlayerData snapshot still
    // contains it. Treating the click like an ordinary absorb makes the
    // start-of-round solver invent one additional draw.
    if (target.id === 46) return true;
    if (Number.parseInt(String(step.details.targetCard?.position), 10) === 0) target.list.splice(target.index, 1);
    else target.list[target.index] = wrap(0);
    for (const resultCard of step.details.resultingCards ?? []) {
      const result = location(resultCard);
      if (result.list && result.index >= 0 && result.index < result.list.length && Number(idOf(result.list[result.index])) > 0) {
        result.list[result.index] = upgraded(result.list[result.index]);
      }
    }
    return true;
  }
  if (step.type !== "MoveCardReq" && step.type !== "InsertCardReq") return false;
  const source = action.sourcePosition === 0 ? hand : action.sourcePosition === 1 ? deck : null;
  if (!source || action.sourceIndex < 0 || action.sourceIndex >= source.length) {
    return issue("source position or index is invalid");
  }
  const card = source[action.sourceIndex];
  if (isEmpty(card)) return issue("source slot is empty");
  if (step.type === "InsertCardReq") {
    const target = action.destinationIndex;
    const unlocked = privatePlayer.unlockedDeckSlots ?? deck.length;
    if (target < 0 || target >= unlocked) return issue("insert destination is outside the unlocked deck");
    if (action.sourcePosition === 0) hand.splice(action.sourceIndex, 1);
    else deck[action.sourceIndex] = wrap(0);
    if (action.insertionDirection === 1) {
      let gap = -1;
      for (let index = target; index >= 0; index -= 1) if (isEmpty(deck[index])) { gap = index; break; }
      for (let index = gap + 1; index <= target; index += 1) {
        if (index === 0) hand.push(switchedForHand(deck[index])); else deck[index - 1] = deck[index];
      }
    } else if (action.insertionDirection === 2) {
      let gap = unlocked;
      for (let index = target; index < unlocked; index += 1) if (isEmpty(deck[index])) { gap = index; break; }
      for (let index = gap - 1; index >= target; index -= 1) {
        if (index + 1 >= unlocked) hand.push(switchedForHand(deck[index])); else deck[index + 1] = deck[index];
      }
    }
    deck[target] = card;
    return true;
  }
  if (action.destinationPosition === 1) {
    if (action.destinationIndex < 0 || action.destinationIndex >= deck.length) {
      return issue("destination deck index is invalid");
    }
    if (action.sourcePosition === 0) {
      const displaced = deck[action.destinationIndex];
      if (canCombine(card, displaced)) {
        hand.splice(action.sourceIndex, 1);
        deck[action.destinationIndex] = combinedEntry(card, displaced);
      }
      else {
        deck[action.destinationIndex] = card;
        hand.splice(action.sourceIndex, 1);
        // SWITCH changes face when the player directly moves that deck card
        // into hand. A different hand card replacing it in an occupied deck
        // slot merely displaces it; the server preserves the current face.
        if (!isEmpty(displaced)) hand.push(displaced);
      }
    } else {
      const displaced = deck[action.destinationIndex];
      if (canCombine(card, displaced)) {
        deck[action.destinationIndex] = combinedEntry(card, displaced);
        deck[action.sourceIndex] = wrap(0);
      } else {
        deck[action.destinationIndex] = card;
        deck[action.sourceIndex] = displaced;
      }
    }
    return true;
  } else if (action.destinationPosition === 0) {
    if (action.sourcePosition === 1) {
      deck[action.sourceIndex] = wrap(0);
      const handCard = switchedForHand(card);
      if (action.destinationIndex < 0 || action.destinationIndex >= hand.length) hand.push(handCard);
      else hand.splice(action.destinationIndex, 0, handCard);
      return true;
    } else if (action.destinationIndex >= 0 && action.destinationIndex < hand.length && action.destinationIndex !== action.sourceIndex) {
      const destinationCard = hand[action.destinationIndex];
      // A same-zone drag onto another card is the client's combine gesture.
      // When this is one of the synthetic round-start draw tokens, the known
      // destination and the post-action visible slot identify the otherwise
      // unobserved drawn card. The latter matters when unequal levels combine:
      // the lower source copy is consumed while the higher destination keeps
      // its level.
      if (card && typeof card === "object" && card.id == null && Number(idOf(destinationCard)) > 0) {
        const visibleDestination = numericCardId(step.state?.privatePlayer?.hand?.[action.destinationIndex]);
        const destinationId = Number(idOf(destinationCard));
        const inferredId = visibleDestination > 0 && baseCardId(visibleDestination) === baseCardId(destinationId)
          ? visibleDestination : destinationId;
        card.id = inferredId;
        if (card.origin != null) card.drawnId = inferredId;
      }
      if (destinationCard && typeof destinationCard === "object" && destinationCard.id == null
        && Number(idOf(card)) > 0) {
        destinationCard.id = Number(idOf(card));
        if (destinationCard.origin != null) destinationCard.drawnId = Number(idOf(card));
      }
      if (card && destinationCard
        && typeof card === "object" && typeof destinationCard === "object"
        && card.id == null && destinationCard.id == null) {
        card.combinedOrigins = [card.origin, destinationCard.origin].filter((origin) => origin != null);
        hand[action.destinationIndex] = card;
        hand.splice(action.sourceIndex, 1);
        return true;
      }
      if (canCombine(card, destinationCard)) {
        hand[action.destinationIndex] = combinedEntry(card, destinationCard);
        hand.splice(action.sourceIndex, 1);
        return true;
      }
      return issue("hand-to-hand move is not a legal combination", {
        sourceCard: numericCardId(idOf(card)),
        destinationCard: numericCardId(idOf(destinationCard)),
      });
    }
    if (action.sourcePosition === 0 && action.destinationIndex !== action.sourceIndex) {
      return issue("destination hand index is invalid");
    }
    return true;
  }
  return issue("destination position is invalid");
}

function recordedCultivationDelta(privatePlayer, step) {
  if (step.type === "RefineCardResp" && step.details?.result) {
    return refineCultivationDelta(step.details.targetCard?.id);
  }
  if (step.type !== "MoveCardReq") return 0;
  const action = step.details ?? {};
  const source = Number(action.sourcePosition) === 0 ? privatePlayer?.hand
    : Number(action.sourcePosition) === 1 ? privatePlayer?.deck : null;
  const destination = Number(action.destinationPosition) === 0 ? privatePlayer?.hand
    : Number(action.destinationPosition) === 1 ? privatePlayer?.deck : null;
  const sourceId = Number(source?.[Number(action.sourceIndex)] ?? 0);
  const destinationId = Number(destination?.[Number(action.destinationIndex)] ?? 0);
  return canUpgradeTogether(sourceId, destinationId) ? 1 : 0;
}

function explicitChoiceCardCount(info) {
  const english = String(info?.descriptionEnglish ?? "");
  const chinese = String(info?.descriptionChinese ?? "");
  const counts = [
    ...english.matchAll(/(?:Deal|Draw)\s+(\d+)\s+[^.\n]*Card/gi),
    ...english.matchAll(/Gain\s+(\d+)\s+【/gi),
    ...chinese.matchAll(/抽\s*(\d+)\s*张/g),
    ...chinese.matchAll(/获得\s*(\d+)\s*张/g),
  ].map((match) => Number(match[1])).filter((count) => count > 0);
  return counts.length ? Math.max(...counts) : 0;
}

function ensureShopEntrySteps(inputSteps) {
  const cardMutationTypes = new Set(["MoveCardReq", "InsertCardReq", "ReplaceCardResp", "RefineCardResp", "CardOperationResp"]);
  const restorePlayerDataCards = (step, expectedRound) => {
    const disclosed = step.type === "PlayerData" ? step.details?.private : null;
    const visible = step.state?.privatePlayer;
    if (!disclosed || !visible || !Array.isArray(disclosed.hand) || !Array.isArray(disclosed.deck)) return;
    const disclosedUid = String(disclosed.uid || visible.uid || "");
    if (visible.uid && disclosedUid && disclosedUid !== visible.uid) return;
    // Some post-battle PlayerData packets arrive while the streaming fallback
    // has already inserted anonymous draw tokens. The packet itself is the
    // authoritative private shop snapshot, so do not discard its exact cards
    // and then attempt to infer them backward from later moves.
    const unlockedDeckSlots = Number(disclosed.unlockedDeckSlots ?? visible.unlockedDeckSlots);
    step.state.round = expectedRound;
    step.state.privatePlayer = {
      ...visible,
      hand: disclosed.hand.map(numericCardId),
      deck: disclosed.deck.map(numericCardId).slice(0, unlockedDeckSlots),
      unlockedDeckSlots,
      exchangesRemaining: Number(disclosed.exchangesRemaining ?? visible.exchangesRemaining),
      exchangeLimit: Number(disclosed.exchangeLimit ?? visible.exchangeLimit),
    };
  };
  for (let battleIndex = 0; battleIndex < inputSteps.length; battleIndex += 1) {
    const battleStep = inputSteps[battleIndex];
    if (!battleStep.battle) continue;
    const round = Number(battleStep.battle.round);
    const nextBattleIndex = inputSteps.findIndex((step, stepIndex) => stepIndex > battleIndex && step.battle);
    const preparationLimit = nextBattleIndex < 0 ? inputSteps.length : nextBattleIndex;
    const firstCardActionIndex = inputSteps.findIndex((step, stepIndex) =>
      stepIndex > battleIndex && stepIndex < preparationLimit && cardMutationTypes.has(step.type));
    const preActionLimit = firstCardActionIndex < 0 ? preparationLimit : firstCardActionIndex;
    const isAuthoritativeStateStep = (step) => ["GameStatus", "PlayerData"].includes(step.type)
      || (step.type === "SimpleClientPact" && step.description?.startsWith("Authoritative game snapshot"));
    for (let stepIndex = battleIndex + 1; stepIndex < preActionLimit; stepIndex += 1) {
      restorePlayerDataCards(inputSteps[stepIndex], round + 1);
    }
    const preBattlePrivate = battleStep.state?.privatePlayer
      ?? inputSteps[battleIndex - 1]?.state?.privatePlayer;
    const roundStartDeckSlots = Math.min(8, round + 3);
    const baseMinimumDrawCount = round + 1 >= 12 ? 4 : 3;
    // Five Elements Pure Vase removes cards from the visible hand without
    // increasing the next round's deal. Cards held in it therefore occupy
    // slots in the ordinary deal accounting.
    const storedCardCount = (preBattlePrivate?.cardStorage?.[199] ?? [])
      .filter((id) => numericCardId(id) > 0).length;
    const minimumDrawCount = Math.max(0, baseMinimumDrawCount - storedCardCount);
    let beforeHand = (preBattlePrivate?.hand ?? []).map((id) => roundStartCardId(id, { inHand: true }));
    const authoritativePreActionIndex = inputSteps.findIndex((step, stepIndex) =>
      stepIndex > battleIndex && stepIndex < preActionLimit
      && isAuthoritativeStateStep(step)
      && Number(step.state?.round) === round + 1
      && step.state?.privatePlayer
      && (!preBattlePrivate?.uid || step.state.privatePlayer.uid === preBattlePrivate.uid));
    const authoritativePreAction = inputSteps[authoritativePreActionIndex];
    if (authoritativePreActionIndex >= 0
      && Number(authoritativePreAction.state.privatePlayer.hand?.length ?? 0) < beforeHand.length + minimumDrawCount) {
      if (process.env.YXP_DRAW_AUDIT) console.log(`DRAW_AUDIT ${JSON.stringify({
        round: round + 1,
        count: null,
        source: "authoritative-pre-action",
        exact: true,
      })}`);
      continue;
    }
    const immediate = inputSteps[battleIndex + 1];
    if (Number(immediate?.state?.round) === round + 1
      && Number(immediate?.state?.privatePlayer?.hand?.length ?? 0) >= beforeHand.length + minimumDrawCount) {
      if (process.env.YXP_DRAW_AUDIT) console.log(`DRAW_AUDIT ${JSON.stringify({
        round: round + 1,
        count: immediate.state.privatePlayer.hand.length - beforeHand.length,
        source: "observed",
        exact: true,
      })}`);
      continue;
    }
    const completePreActionSnapshot = inputSteps.findIndex((step, stepIndex) =>
      stepIndex > battleIndex && stepIndex < preActionLimit
      && Number(step.state?.round) === round + 1
      && Number(step.state?.privatePlayer?.hand?.length ?? 0) >= beforeHand.length + minimumDrawCount);
    const authoritativeIndex = completePreActionSnapshot >= 0
      ? completePreActionSnapshot
      : inputSteps.findIndex((step, stepIndex) =>
        stepIndex > Math.max(battleIndex, firstCardActionIndex)
        && stepIndex < preparationLimit
        && isAuthoritativeStateStep(step)
        && Number(step.state?.round) === round + 1 && step.state?.privatePlayer);
    if (completePreActionSnapshot < 0 && firstCardActionIndex < 0) continue;
    if (authoritativeIndex < 0) continue;
    const authoritative = inputSteps[authoritativeIndex];
    const preparationSteps = inputSteps.slice(battleIndex + 1, authoritativeIndex);
    const authoritativeDeck = authoritative.state.privatePlayer.deck ?? [];
    const authoritativeHand = authoritative.state.privatePlayer.hand ?? [];
    const reconciledPrivate = privateStateWithInferredRoundTransforms(
      preBattlePrivate,
      authoritative.state.privatePlayer,
      battleStep.state?.players?.[preBattlePrivate?.uid],
      authoritative.state?.players?.[authoritative.state.privatePlayer.uid],
    );
    beforeHand = (reconciledPrivate?.hand ?? []).map((id) => roundStartCardId(id, { inHand: true }));
    const roundStartDeck = (reconciledPrivate?.deck ?? []).map(roundStartCardId);
    while (roundStartDeck.length < roundStartDeckSlots) roundStartDeck.push(0);
    let choiceGrantedCardCount = 0;
    const simulateDraws = (drawCount) => {
      const initial = (drawTiming) => {
        const drawnTokens = Array.from({ length: drawCount }, (_unused, origin) => ({ id: null, origin }));
        const retainedTokens = beforeHand.map((id, retainedIndex) => ({
          id: id == null ? null : Number(id),
          roundStartId: id == null ? null : Number(id),
          origin: null,
          retainedIndex,
        }));
        return { drawnTokens, retainedTokens, drawTiming, tokenPrivate: {
          hand: drawTiming === "before" ? retainedTokens.concat(drawnTokens) : retainedTokens,
          deck: roundStartDeck.map((id) => ({ id, origin: null })),
          cardStorage: Object.fromEntries(Object.entries(reconciledPrivate?.cardStorage ?? {}).map(([key, values]) => [
            key, values.map((id) => ({ id: Number(id), origin: null })),
          ])),
          unlockedDeckSlots: roundStartDeckSlots,
        }, trace: [] };
      };
      let variants = preparationSteps.length ? [initial("before"), initial("after")] : [initial("before")];
      for (const step of preparationSteps) {
        variants = variants.flatMap((variant) => {
          const action = step.details ?? {};
          if (["ReplaceCardResp", "RefineCardResp"].includes(step.type)) {
            const target = action.targetCard;
            const targetList = Number.parseInt(String(target?.position), 10) === 0
              ? variant.tokenPrivate.hand : Number.parseInt(String(target?.position), 10) === 1
                ? variant.tokenPrivate.deck : null;
            const reportedIndex = Number(target?.index);
            const targetId = numericCardId(target?.id);
            const reported = targetList?.[reportedIndex];
            const knownMatches = (targetList ?? []).map((entry, index) =>
              index !== reportedIndex && entry?.id != null && sameCardIdentity(entry.id, targetId)
                ? index : -1).filter((index) => index >= 0);
            if (reported && typeof reported === "object" && reported.id == null && knownMatches.length) {
              const alternatives = [];
              for (const targetIndex of [reportedIndex, ...knownMatches]) {
                const alternative = structuredClone(variant);
                const alternativeStep = structuredClone(step);
                alternativeStep.details.targetCard.index = targetIndex;
                if (applyRecordedCardStep(
                  alternative.tokenPrivate,
                  alternativeStep,
                  (id) => ({ id: Number(id), origin: null }),
                )) alternatives.push(alternative);
              }
              return alternatives;
            }
          }
          const source = Number(action.sourcePosition) === 0
            ? variant.tokenPrivate.hand?.[Number(action.sourceIndex)]
            : Number(action.sourcePosition) === 1
              ? variant.tokenPrivate.deck?.[Number(action.sourceIndex)] : null;
          const destination = Number(action.destinationPosition) === 1
            ? variant.tokenPrivate.deck?.[Number(action.destinationIndex)] : null;
          const sourceUnknown = source && typeof source === "object" && source.id == null;
          const destinationUnknown = destination && typeof destination === "object" && destination.id == null;
          const knownCombinationId = sourceUnknown && Number(destination?.id) > 0
            ? Number(destination.id)
            : destinationUnknown && Number(source?.id) > 0 ? Number(source.id) : 0;
          const canBeUnknownCombination = step.type === "MoveCardReq"
            && Boolean(sourceUnknown) !== Boolean(destinationUnknown)
            && knownCombinationId > 0 && cardCanUpgrade(knownCombinationId);
          if (!canBeUnknownCombination) {
            const applied = applyRecordedCardStep(
              variant.tokenPrivate,
              step,
              (id) => ({ id: Number(id), origin: null }),
            );
            return applied || !cardMutationTypes.has(step.type) ? [variant] : [];
          }
          const replacement = structuredClone(variant);
          const replacementApplied = applyRecordedCardStep(
            replacement.tokenPrivate,
            step,
            (id) => ({ id: Number(id), origin: null }),
          );
          const combination = structuredClone(variant);
          const combinedSource = Number(action.sourcePosition) === 0
            ? combination.tokenPrivate.hand[Number(action.sourceIndex)]
            : combination.tokenPrivate.deck[Number(action.sourceIndex)];
          const combinedDestination = combination.tokenPrivate.deck[Number(action.destinationIndex)];
          const unknownEntry = combinedSource.id == null ? combinedSource : combinedDestination;
          unknownEntry.id = knownCombinationId;
          if (unknownEntry.origin != null) unknownEntry.drawnId = knownCombinationId;
          const combinationApplied = applyRecordedCardStep(
            combination.tokenPrivate,
            step,
            (id) => ({ id: Number(id), origin: null }),
          );
          return [
            ...(replacementApplied ? [replacement] : []),
            ...(combinationApplied ? [combination] : []),
          ];
        });
        if (process.env.YXP_DRAW_AUDIT) {
          for (const variant of variants) variant.trace.push({
            type: step.type,
            details: step.details,
            hand: variant.tokenPrivate.hand.map((entry) => entry?.id),
            deck: variant.tokenPrivate.deck.map((entry) => entry?.id),
          });
        }
        if (variants.length > 4096) throw new Error(`too many round-start provenance branches in ${path.basename(inputPath)}`);
      }
      for (const variant of variants) {
        if (variant.drawTiming === "after") variant.tokenPrivate.hand.push(...variant.drawnTokens);
      }
      // A breakthrough/card choice can resolve after the player has already
      // manipulated the ordinary start-of-round draw. Its granted cards are
      // present in the authoritative snapshot, but the preceding operation
      // indices were produced before those cards existed. Add them only after
      // replaying those operations.
      for (const variant of variants) {
        variant.tokenPrivate.hand.push(...Array.from({ length: choiceGrantedCardCount }, () => ({
          id: null, origin: null, choiceGranted: true,
        })));
      }
      return variants;
    };
    const actualHand = authoritativeHand;
    const actualDeck = authoritativeDeck;
    const privateUid = authoritative.state.privatePlayer.uid;
    const beforePlayer = battleStep.state?.players?.[privateUid];
    const authoritativePlayer = authoritative.state?.players?.[privateUid];
    const selectedFateCount = (privatePlayer) => {
      if (Array.isArray(privatePlayer?.selectedFateStrategies)) {
        return privatePlayer.selectedFateStrategies
          .filter((selection) => numericCardId(selection?.id ?? selection) > 0).length;
      }
      return (privatePlayer?.fateStrategies?.strategies ?? [])
        .filter((selection) => numericCardId(selection?.selected ?? selection) > 0).length;
    };
    const choiceAdvanced = phaseNumber(authoritativePlayer?.phase) > phaseNumber(beforePlayer?.phase)
      || Number(authoritativePlayer?.talents?.length ?? 0) > Number(beforePlayer?.talents?.length ?? 0)
      || selectedFateCount(authoritative.state.privatePlayer) > selectedFateCount(preBattlePrivate)
      || Number(authoritative.state.privatePlayer.daoYunChoices?.length ?? 0) > Number(preBattlePrivate?.daoYunChoices?.length ?? 0);
    const beforeTalentIds = new Set((beforePlayer?.talents ?? []).map((entry) => numericCardId(entry?.id ?? entry)));
    const addedTalentIds = (authoritativePlayer?.talents ?? [])
      .map((entry) => numericCardId(entry?.id ?? entry)).filter((id) => id > 0 && !beforeTalentIds.has(id));
    const addedTalents = addedTalentIds.map((id) => {
      const info = talentInfo(id);
      return {
        id,
        phase: Number(info?.level ?? 0),
        nameEnglish: info?.nameEnglish ?? "",
        nameChinese: info?.nameChinese ?? "",
        cultivationGain: explicitCultivationGain(info),
      };
    });
    choiceGrantedCardCount = addedTalentIds.reduce(
      (total, id) => total + explicitChoiceCardCount(talentInfo(id)),
      0,
    );
    // A Daoist Rhyme card reserved for a later phase is delivered when that
    // phase is reached. Double Daoist Rhyme duplicates that delivery.
    choiceGrantedCardCount += (preBattlePrivate?.daoYunChoices ?? []).reduce((total, choice) => {
      const selected = numericCardId(choice?.selected);
      const selectedPhase = Number(cardConfigInfo(selected)?.level ?? 0);
      // At Own Pace (27) is an immediate draw option represented by a hidden
      // pseudo-card. It is never reserved and can never enter hand or deck.
      if (!selected || selected === 27 || selectedPhase <= phaseNumber(beforePlayer?.phase)
        || selectedPhase > phaseNumber(authoritativePlayer?.phase)) return total;
      return total + Math.max(1, Number(choice?.multiplier ?? 1));
    }, 0);
    const beforeFateIds = new Set((preBattlePrivate?.selectedFateStrategies ?? [])
      .map((entry) => numericCardId(entry?.id ?? entry)));
    const addedFateIds = (authoritative.state.privatePlayer.selectedFateStrategies ?? [])
      .map((entry) => numericCardId(entry?.id ?? entry)).filter((id) => id > 0 && !beforeFateIds.has(id));
    const choiceCultivationGain = choiceCultivationDelta(
      beforePlayer,
      authoritativePlayer,
      preBattlePrivate,
      authoritative.state.privatePlayer,
    );
    const beforeFates = new Map((preBattlePrivate?.selectedFateStrategies ?? [])
      .map((entry) => [numericCardId(entry?.id ?? entry), entry]));
    const usedFateEntries = (authoritative.state.privatePlayer.selectedFateStrategies ?? []).filter((entry) => {
      const id = numericCardId(entry?.id ?? entry);
      const beforeRuntime = beforeFates.get(id)?.runtime;
      const afterRuntime = entry?.runtime;
      if (!beforeRuntime || !afterRuntime || beforeRuntime.kind !== afterRuntime.kind) return false;
      return beforeRuntime.kind === "charges"
        ? Number(afterRuntime.value) < Number(beforeRuntime.value)
        : Number(afterRuntime.value) > Number(beforeRuntime.value);
    });
    const usedFateIds = usedFateEntries.map((entry) => numericCardId(entry?.id ?? entry));
    choiceGrantedCardCount += usedFateIds.reduce((total, id) => {
      const info = extractedFates.get(id) ?? wikiFates.get(id) ?? fateStrategyInfo(id);
      return total + explicitChoiceCardCount(info);
    }, 0);
    const visibleFateUses = usedFateIds.length;
    const transformsEntireHand = usedFateIds.includes(11); // Blaze a New Trail / 另辟蹊径
    const postUseCards = usedFateIds.includes(386) ? [33, 34, 35] : []; // Meow Meow Meow? / 喵喵喵？
    const hasPostUseSuffix = postUseCards.length > 0
      && postUseCards.every((id, offset) => Number(actualHand[actualHand.length - postUseCards.length + offset]) === id);
    const matchingHand = hasPostUseSuffix
      ? actualHand.slice(0, actualHand.length - postUseCards.length)
      : actualHand;
    const isOneLevelUpgrade = (oldId, newId) => Number(oldId) > 0
      && upgradedCardId(Number(oldId)) === Number(newId);
    const selectedFateIds = new Set((authoritative.state.privatePlayer.selectedFateStrategies ?? [])
      .map((entry) => numericCardId(entry?.id ?? entry)).filter((id) => id > 0));
    const jiCardPairs = [...selectedFateIds]
      .map((id) => extractedFates.get(id)?.jiCardPair)
      .filter((pair) => pair?.length === 2);
    const isJiCardTransform = (oldId, newId) => jiCardPairs.some(([first, second]) =>
      (Number(oldId) === first && Number(newId) === second)
      || (Number(oldId) === second && Number(newId) === first));
    const deckTokenMatch = (tokens, actual, upgradeBudget) => {
      if (tokens.length !== actual.length) return null;
      const upgrades = [];
      for (let position = 0; position < tokens.length; position += 1) {
        const tokenId = tokens[position]?.id;
        if (tokenId == null || Number(tokenId) === Number(actual[position])) continue;
        if (upgrades.length >= upgradeBudget || !isOneLevelUpgrade(tokenId, actual[position])) return null;
        upgrades.push({ tokenPosition: position, actualPosition: position });
      }
      return { upgrades, used: upgrades.length };
    };
    const tokenSequenceMatch = (tokens, actual, upgradeBudget) => {
      if (transformsEntireHand) {
        if (tokens.length !== actual.length) return null;
        return { mapping: tokens.map((_token, position) => position), upgrades: [], used: 0 };
      }
      if (tokens.length !== actual.length) return null;
      const mapping = Array(tokens.length).fill(-1);
      const upgrades = [];
      let actualPosition = 0;
      for (let tokenPosition = 0; tokenPosition < tokens.length; tokenPosition += 1) {
        const token = tokens[tokenPosition];
        if (token?.id == null) {
          continue;
        }
        let matchPosition = actual.findIndex((id, position) =>
          position >= actualPosition && Number(id) === Number(token.id));
        let upgraded = false;
        let fateTransformed = false;
        if (matchPosition < 0 && upgrades.length < upgradeBudget) {
          matchPosition = actual.findIndex((id, position) =>
            position >= actualPosition && isOneLevelUpgrade(token.id, id));
          upgraded = matchPosition >= 0;
        }
        if (matchPosition < 0) {
          matchPosition = actual.findIndex((id, position) =>
            position >= actualPosition && isJiCardTransform(token.id, id));
          fateTransformed = matchPosition >= 0;
        }
        if (matchPosition < 0) return null;
        mapping[tokenPosition] = matchPosition;
        if (upgraded) upgrades.push({ tokenPosition, actualPosition: matchPosition });
        if (fateTransformed) token.fateTransformedId = Number(actual[matchPosition]);
        actualPosition = matchPosition + 1;
      }
      const usedPositions = new Set(mapping.filter((position) => position >= 0));
      const remainingPositions = actual
        .map((_id, position) => usedPositions.has(position) ? -1 : position)
        .filter((position) => position >= 0);
      for (let tokenPosition = 0; tokenPosition < tokens.length; tokenPosition += 1) {
        if (mapping[tokenPosition] < 0) mapping[tokenPosition] = remainingPositions.shift() ?? -1;
      }
      if (mapping.some((position) => position < 0) || remainingPositions.length) return null;
      return { mapping, upgrades, used: upgrades.length };
    };
    // A player may postpone a pending breakthrough until the end of the next
    // preparation window. In that case the server can resolve the choice but
    // never deal that round's ordinary cards before the following battle.
    // Search zero only for an observed choice transition; the scheduled count
    // still wins whenever it is an exact reconstruction.
    const candidateMinimumDrawCount = choiceAdvanced ? 0 : minimumDrawCount;
    const maximumDrawCount = Math.max(20, actualHand.length + preparationSteps.length + 4, minimumDrawCount + 8);
    const drawCandidates = [];
    for (let drawCount = candidateMinimumDrawCount; drawCount <= maximumDrawCount; drawCount += 1) {
      for (const simulation of simulateDraws(drawCount)) {
        let matched = null;
        for (let upgradeBudget = 0; upgradeBudget <= visibleFateUses && !matched; upgradeBudget += 1) {
          const deckMatch = deckTokenMatch(simulation.tokenPrivate.deck, actualDeck, upgradeBudget);
          if (!deckMatch) continue;
          const handMatch = tokenSequenceMatch(
            simulation.tokenPrivate.hand,
            matchingHand,
            upgradeBudget - deckMatch.used,
          );
          if (!handMatch) continue;
          matched = { deckMatch, handMatch, inferredUpgrades: deckMatch.used + handMatch.used };
        }
        if (matched) {
          drawCandidates.push({
            drawCount,
            simulation,
            handMapping: matched.handMatch.mapping,
            handUpgrades: matched.handMatch.upgrades,
            deckUpgrades: matched.deckMatch.upgrades,
            inferredFateUpgrades: matched.inferredUpgrades,
          });
        }
      }
    }
    // Exchange responses identify both the removed and received cards even
    // when the live spectator still sees anonymous hand slots. If duplicate
    // cards make forward provenance ambiguous, this restricted action set can
    // be inverted exactly from the next authoritative private snapshot.
    if (!drawCandidates.length) {
      const reverseStates = Array(preparationSteps.length);
      const reversed = clone(authoritative.state.privatePlayer);
      const restoredDeckSlots = new Set();
      let reversible = true;
      const listAt = (privatePlayer, position) => Number.parseInt(String(position), 10) === 0
        ? privatePlayer.hand : Number.parseInt(String(position), 10) === 1 ? privatePlayer.deck : null;
      const closestIdentityIndex = (list, id, reportedIndex) => list
        .map((value, index) => Number(value) === Number(id) ? index : -1)
        .filter((index) => index >= 0)
        .sort((first, second) => Math.abs(first - reportedIndex) - Math.abs(second - reportedIndex))[0] ?? -1;
      for (let index = preparationSteps.length - 1; index >= 0 && reversible; index -= 1) {
        const step = preparationSteps[index];
        reverseStates[index] = clone(reversed);
        const action = step.details ?? {};
        if (step.type === "ReplaceCardResp" && String(action.result).startsWith("1 ")) {
          const nextList = listAt(reversed, action.newCard?.position);
          const oldList = listAt(reversed, action.targetCard?.position);
          if (!nextList || nextList !== oldList) {
            reversible = false;
            break;
          }
          const nextIndex = closestIdentityIndex(
            nextList,
            numericCardId(action.newCard?.id),
            Number(action.newCard?.index),
          );
          if (nextIndex < 0) {
            reversible = false;
            break;
          }
          nextList.splice(nextIndex, 1);
          const oldIndex = Math.max(0, Math.min(oldList.length, Number(action.targetCard?.index)));
          oldList.splice(oldIndex, 0, numericCardId(action.targetCard?.id));
        } else if (step.type === "MoveCardReq"
          && Number(action.sourcePosition) === 1 && Number(action.destinationPosition) === 0) {
          const sourceIndex = Number(action.sourceIndex);
          const movedDeckId = numericCardId(roundStartDeck[sourceIndex]);
          if (!movedDeckId || restoredDeckSlots.has(sourceIndex) || Number(reversed.deck[sourceIndex]) !== 0) {
            reversible = false;
            break;
          }
          restoredDeckSlots.add(sourceIndex);
          const handId = switchCardForHand(movedDeckId);
          const reportedDestination = Number(action.destinationIndex);
          const searchFrom = reportedDestination >= 0 ? reportedDestination : reversed.hand.length - 1;
          const handIndex = closestIdentityIndex(reversed.hand, handId, searchFrom);
          if (handIndex < 0) {
            reversible = false;
            break;
          }
          reversed.hand.splice(handIndex, 1);
          reversed.deck[sourceIndex] = movedDeckId;
        } else {
          reversible = false;
        }
      }
      const reversedHand = (reversed.hand ?? []).map(numericCardId);
      const reversedDeck = (reversed.deck ?? []).map(numericCardId);
      const reverseDrawCount = reversedHand.length - beforeHand.length;
      const prefixMatches = beforeHand.every((id, index) => Number(id) === Number(reversedHand[index]));
      const deckMatches = reversedDeck.length === roundStartDeck.length
        && reversedDeck.every((id, index) => Number(id) === Number(roundStartDeck[index]));
      if (reversible && prefixMatches && deckMatches && reverseDrawCount >= candidateMinimumDrawCount) {
        const retainedTokens = beforeHand.map((id, retainedIndex) => ({
          id: Number(id), roundStartId: Number(id), origin: null, retainedIndex,
        }));
        const drawnTokens = reversedHand.slice(beforeHand.length)
          .map((id, origin) => ({ id: Number(id), drawnId: Number(id), origin }));
        drawCandidates.push({
          drawCount: reverseDrawCount,
          simulation: {
            retainedTokens,
            drawnTokens,
            tokenPrivate: {
              hand: actualHand.map((id) => ({ id: Number(id), origin: null })),
              deck: actualDeck.map((id) => ({ id: Number(id), origin: null })),
            },
            reverseStates,
          },
          handMapping: actualHand.map((_id, index) => index),
          handUpgrades: [],
          deckUpgrades: [],
          inferredFateUpgrades: 0,
          reversedFromAuthoritative: true,
        });
      }
    }
    let possibleDrawCounts = [...new Set(drawCandidates.map((candidate) => candidate.drawCount))];
    // When the normal scheduled count itself is exact, a larger count can be
    // a false provenance solution: an extra anonymous token is allowed to be
    // consumed by a combine. Do not invent an extra draw without a surviving
    // observation that requires one. Real extra-draw effects still win because
    // the scheduled count then cannot match the authoritative state.
    const guaranteedExtraDraws = (preBattlePrivate?.deck ?? []).reduce((total, id) => {
      const config = cardConfigInfo(numericCardId(id));
      if (config?.name !== "锦毛鼠") return total;
      return total + Math.max(0, Number(config.otherParams?.[0] ?? 0));
    }, 0);
    const scheduledDrawCount = minimumDrawCount + guaranteedExtraDraws;
    if (possibleDrawCounts.length > 1 && possibleDrawCounts.includes(scheduledDrawCount)) {
      possibleDrawCounts = [scheduledDrawCount];
    }
    if (possibleDrawCounts.length !== 1) {
      if (process.env.YXP_DRAW_AUDIT) {
        const guess = Math.max(minimumDrawCount, actualHand.length - beforeHand.length);
        const attempted = simulateDraws(guess)[0];
        console.log(`DRAW_AUDIT_FAILURE ${JSON.stringify({
          round: round + 1, battleSequence: battleStep.sequence,
          authoritativeSequence: authoritative.sequence,
          completePreActionSnapshot, firstCardActionIndex, authoritativeIndex,
          choiceAdvanced,
          beforePhase: phaseNumber(beforePlayer?.phase),
          authoritativePhase: phaseNumber(authoritativePlayer?.phase),
          beforeTalentIds: [...beforeTalentIds],
          authoritativeTalentIds: (authoritativePlayer?.talents ?? []).map((entry) => numericCardId(entry?.id ?? entry)),
          choiceGrantedCardCount,
          addedTalentIds,
          usedFateIds,
          selectedFateIds: [...selectedFateIds],
          daoYunChoices: preBattlePrivate?.daoYunChoices ?? [],
          minimumDrawCount,
          guaranteedExtraDraws,
          scheduledDrawCount,
          possibleDrawCounts,
          beforeHand, actualHand, actualDeck, guess,
          simulatedHand: attempted.tokenPrivate.hand.map((entry) => entry?.id),
          simulatedDeck: attempted.tokenPrivate.deck.map((entry) => entry?.id),
          trace: attempted.trace,
          contextBeforeBattle: inputSteps
            .slice(Math.max(0, battleIndex - 12), battleIndex + 1)
            .map((step) => ({
              sequence: step.sequence,
              type: step.type,
              round: step.state?.round,
              hand: step.state?.privatePlayer?.hand,
              deck: step.state?.privatePlayer?.deck,
              details: ["GameStatus", "BattleResult"].includes(step.type) ? undefined : step.details,
              battleRound: step.battle?.round,
            })),
          preparationSteps: preparationSteps.map((step) => ({
            type: step.type,
            details: step.details,
            hand: step.state?.privatePlayer?.hand,
            deck: step.state?.privatePlayer?.deck,
            cardTransitionIssues: step.cardTransitionIssues,
          })),
        })}`);
        console.log(`DRAW_AUDIT_ATTEMPTS ${JSON.stringify(Array.from(
          { length: Math.min(8, maximumDrawCount - minimumDrawCount + 1) },
          (_unused, offset) => minimumDrawCount + offset,
        ).map((count) => ({ count, variants: simulateDraws(count).map((entry) => ({
          hand: entry.tokenPrivate.hand.map((token) => token?.id),
          deck: entry.tokenPrivate.deck.map((token) => token?.id),
        })) })))}`);
      }
      throw new Error(`round ${round + 1} draw count has ${possibleDrawCounts.length} exact candidates in ${path.basename(inputPath)}`);
    }
    const [selectedDrawCount] = possibleDrawCounts;
    const selectedCandidate = drawCandidates
      .filter((candidate) => candidate.drawCount === selectedDrawCount)
      .sort((first, second) => first.inferredFateUpgrades - second.inferredFateUpgrades)[0];
    const {
      drawCount, simulation, handMapping, handUpgrades, deckUpgrades,
      inferredFateUpgrades, reversedFromAuthoritative,
    } = selectedCandidate;
    const { drawnTokens, retainedTokens, tokenPrivate } = simulation;
    if (process.env.YXP_DRAW_AUDIT) console.log(`DRAW_AUDIT ${JSON.stringify({
      round: round + 1,
      count: drawCount,
      source: completePreActionSnapshot >= 0 ? "pre-action-snapshot" : "inferred",
      exact: true,
      ...(inferredFateUpgrades ? { inferredFateUpgrades } : {}),
      ...(transformsEntireHand ? { transformedEntireHand: true } : {}),
      ...(hasPostUseSuffix ? { postUseCards } : {}),
      ...(reversedFromAuthoritative ? { reversedFromAuthoritative: true } : {}),
      ...(possibleDrawCounts.length > 1 ? { candidateCounts: possibleDrawCounts } : {}),
    })}`);
    for (const { tokenPosition, actualPosition } of handUpgrades) {
      const token = tokenPrivate.hand[tokenPosition];
      token.id = Number(actualHand[actualPosition]);
      if (token.retainedIndex != null) token.roundStartId = token.id;
    }
    for (const { tokenPosition, actualPosition } of deckUpgrades) {
      const token = tokenPrivate.deck[tokenPosition];
      token.id = Number(actualDeck[actualPosition]);
    }
    tokenPrivate.hand.forEach((token, position) => {
      const actualPosition = handMapping[position];
      if (!transformsEntireHand && token?.id == null && actualPosition != null) {
        token.id = Number(actualHand[actualPosition]);
      }
    });
    tokenPrivate.deck.forEach((token, position) => {
      if (token?.id == null && actualDeck[position] != null) token.id = Number(actualDeck[position]);
    });
    for (const token of drawnTokens) {
      if (!token.combinedOrigins?.length || !Number(token.id)) continue;
      const originalId = baseCardId(token.id);
      for (const origin of token.combinedOrigins) drawnTokens[origin].drawnId = originalId;
    }
    const unknownDrawCardId = 399;
    if (drawnTokens.some((token) => !Number(token.id))) {
      rememberCard(unknownDrawCardId);
    }
    const drawnCards = drawnTokens.map((token) => Number(token.drawnId ?? token.id) || unknownDrawCardId);
    // The provenance simulation mutates token.id while replaying the actions
    // that follow the draw.  Preserve the identity the retained card had at
    // the start of the round instead of leaking a later upgrade backward into
    // the synthetic shop-entry step.  A null roundStartId is a transformed
    // Mystery Seed, whose first resolved identity is the best available value.
    const retainedCards = retainedTokens.map((token) =>
      Number(token.roundStartId ?? token.id) || unknownDrawCardId);
    const startingStats = inferredExchangeStatsBeforeSteps(authoritative.state, preparationSteps);
    const shopState = clone(battleStep.state);
    shopState.round = round + 1;
    shopState.privatePlayer = { ...shopState.privatePlayer, ...clone(preBattlePrivate) };
    shopState.privatePlayer.hand = [...retainedCards, ...drawnCards];
    shopState.privatePlayer.deck = [...roundStartDeck];
    shopState.privatePlayer.unlockedDeckSlots = roundStartDeckSlots;
    const targetPlayer = shopState.players?.[shopState.privatePlayer.uid];
    if (targetPlayer) {
      const battlePlayer = (battleStep.battle.matchups ?? [])
        .map((matchup) => matchup.players?.[shopState.privatePlayer.uid])
        .find(Boolean);
      const cultivationPrivate = clone(shopState.privatePlayer);
      let actionCultivationDelta = 0;
      for (const step of preparationSteps) {
        actionCultivationDelta += recordedCultivationDelta(cultivationPrivate, step);
        applyRecordedCardStep(cultivationPrivate, step);
      }
      const authoritativeCultivation = Number(authoritative.state.players?.[shopState.privatePlayer.uid]?.cultivation);
      if (Number.isFinite(authoritativeCultivation)) {
        targetPlayer.cultivation = authoritativeCultivation - actionCultivationDelta
          - choiceCultivationGain - fateUseCultivationDelta(usedFateIds);
      } else {
        const baseDrawCount = round + 1 >= 12 ? 4 : 3;
        const extraDraws = Math.max(0, drawCount - baseDrawCount);
        const possiblePaidDraws = battlePlayer
          ? possibleBattleEndCultivationDraws(battlePlayer.deck, battlePlayer.phase)
          : 0;
        targetPlayer.cultivation = Number(targetPlayer.cultivation ?? 0) + 2
          - Math.min(extraDraws, possiblePaidDraws);
      }
    }
    writeVisibleExchangeStats(shopState, startingStats);
    delete shopState.privatePlayer.choiceOverlay;
    const shopStep = {
      sequence: battleStep.sequence,
      observedAt: battleStep.observedAt,
      direction: "synthetic",
      type: "RoundShopStart",
      description: `Round ${round + 1} shop — draw ${drawnCards.join(", ")}`,
      details: { round: round + 1, drawnCards },
      humanActions: [],
      state: shopState,
    };
    inputSteps.splice(battleIndex + 1, 0, shopStep);
    const shiftedAuthoritativeIndex = authoritativeIndex + 1;
    let workingPrivate = clone(shopState.privatePlayer);
    let workingStats = { ...startingStats };
    let workingCultivation = Number(shopState.players?.[shopState.privatePlayer.uid]?.cultivation ?? 0);
    for (let stepIndex = battleIndex + 2; stepIndex < shiftedAuthoritativeIndex; stepIndex += 1) {
      const step = inputSteps[stepIndex];
      workingCultivation += recordedCultivationDelta(workingPrivate, step);
      applyRecordedCardStep(workingPrivate, step);
      const reverseState = simulation.reverseStates?.[stepIndex - (battleIndex + 2)];
      if (reverseState) workingPrivate = clone(reverseState);
      workingStats = exchangeStatsAfterStep(workingStats, step);
      step.state = { ...step.state, round: round + 1, privatePlayer: clone(workingPrivate) };
      step.state.players = clone(step.state.players ?? {});
      const workingPlayer = step.state.players[workingPrivate.uid];
      if (workingPlayer) workingPlayer.cultivation = workingCultivation;
      writeVisibleExchangeStats(step.state, workingStats);
    }
    if (process.env.YXP_DRAW_AUDIT) {
      const authoritativeCultivation = Number(authoritative.state.players?.[workingPrivate.uid]?.cultivation);
      const predictedCultivation = workingCultivation + fateUseCultivationDelta(usedFateIds);
      console.log(`CULTIVATION_AUDIT ${JSON.stringify({
        round: round + 1,
        predicted: predictedCultivation,
        authoritative: authoritativeCultivation,
        delta: authoritativeCultivation - predictedCultivation,
        choiceAdvanced,
        choiceCultivationGain,
        phaseBefore: phaseNumber(beforePlayer?.phase),
        phaseAfter: phaseNumber(authoritativePlayer?.phase),
        addedTalents,
        addedFateIds,
      })}`);
    }
    battleIndex += 1;
  }
  return inputSteps;
}

ensureShopEntrySteps(logicalSteps);

function completedChoicesForStep(previousState, currentState) {
  const previousPrivate = previousState?.privatePlayer;
  const currentPrivate = currentState?.privatePlayer;
  if (!previousPrivate || !currentPrivate || previousPrivate.uid !== currentPrivate.uid) return [];
  const choices = [];
  const previousPlayer = previousState?.players?.[previousPrivate.uid];
  const currentPlayer = currentState?.players?.[currentPrivate.uid];
  const previousTalentIds = new Set((previousPlayer?.talents ?? []).map((reference) => Number(reference.id)));
  for (const chosenTalent of (currentPlayer?.talents ?? []).filter((reference) => reference.choiceHistory?.selected
    && !previousTalentIds.has(Number(reference.id)))) {
    const history = chosenTalent.choiceHistory;
    choices.push({
      kind: "immortal-fate",
      title: "Select an Immortal Fate",
      roundOrPhase: history.roundOrPhase,
      options: (history.offers?.at(-1) ?? []).map((id) => ({ id: Number(id) })),
      family: "talent",
      reference: chosenTalent,
    });
  }
  const previousFateIds = new Set((previousPrivate.selectedFateStrategies ?? [])
    .map((reference) => Number(reference.id)));
  for (const chosenFate of (currentPrivate.selectedFateStrategies ?? []).filter((reference) => reference.choiceHistory?.selected
    && !previousFateIds.has(Number(reference.id)))) {
    const history = chosenFate.choiceHistory;
    choices.push({
      kind: "heavenly-derivation",
      title: "Select a Heavenly Derivation Fate",
      roundOrPhase: history.roundOrPhase,
      rerollsRemaining: Number(history.rerollsRemaining ?? 0),
      options: (history.offers?.at(-1) ?? []).map((id) => ({ id: Number(id) })),
      family: "fate",
      reference: chosenFate,
    });
  }
  const previousDaoYunCount = previousPrivate.daoYunChoices?.length ?? 0;
  for (const history of (currentPrivate.daoYunChoices ?? []).slice(previousDaoYunCount)) {
    choices.push({
      kind: "daoist-rhyme",
      title: "Select a Card",
      roundOrPhase: history.roundOrPhase,
      options: (history.offers?.at(-1) ?? []).map((id) => ({ id: Number(id) })),
      family: "daoYun",
      reference: history,
    });
  }
  const previousCardSelectionCount = previousPrivate.cardSelections?.length ?? 0;
  for (const history of (currentPrivate.cardSelections ?? []).slice(previousCardSelectionCount)) {
    choices.push({
      kind: "card-selection",
      title: "Select a Card",
      roundOrPhase: history.roundOrPhase,
      options: (history.offers?.at(-1) ?? []).map((id) => ({ id: Number(id) })),
      family: "cardSelection",
      reference: history,
    });
  }
  const activeKind = previousPrivate.choiceOverlay?.kind;
  const activeIndex = choices.findIndex((choice) => choice.kind === activeKind);
  if (activeIndex > 0) choices.unshift(...choices.splice(activeIndex, 1));
  return choices;
}

function stateAfterCompletedChoice(beforeState, choice) {
  const stateAfter = clone(beforeState);
  delete stateAfter.privatePlayer.choiceOverlay;
  if (choice.family === "talent") {
    const player = stateAfter.players?.[stateAfter.privatePlayer.uid];
    if (player) player.talents = [...(player.talents ?? []), clone(choice.reference)];
  } else if (choice.family === "fate") {
    stateAfter.privatePlayer.selectedFateStrategies = [
      ...(stateAfter.privatePlayer.selectedFateStrategies ?? []),
      clone(choice.reference),
    ];
  } else if (choice.family === "daoYun") {
    stateAfter.privatePlayer.daoYunChoices = [
      ...(stateAfter.privatePlayer.daoYunChoices ?? []),
      clone(choice.reference),
    ];
  } else if (choice.family === "cardSelection") {
    stateAfter.privatePlayer.cardSelections = [
      ...(stateAfter.privatePlayer.cardSelections ?? []),
      clone(choice.reference),
    ];
  }
  return stateAfter;
}

function ensureChoiceOfferSteps(inputSteps) {
  const normalized = inputSteps.length ? [inputSteps[0]] : [];
  for (const step of inputSteps.slice(1)) {
    let beforeState = normalized.at(-1).state;
    const choices = completedChoicesForStep(beforeState, step.state);
    if (!choices.length) {
      normalized.push(step);
      continue;
    }
    choices.forEach((choice, choiceIndex) => {
      if (!choice.options.length) throw new Error(`completed ${choice.kind} choice has no recorded offer at sequence ${step.sequence}`);
      if (beforeState.privatePlayer?.choiceOverlay?.kind !== choice.kind) {
        const offerState = clone(beforeState);
        offerState.privatePlayer.choiceOverlay = {
          kind: choice.kind,
          title: choice.title,
          roundOrPhase: choice.roundOrPhase,
          ...(choice.rerollsRemaining == null ? {} : { rerollsRemaining: choice.rerollsRemaining }),
          options: choice.options,
        };
        normalized.push({
          sequence: step.sequence,
          observedAt: step.observedAt,
          direction: "synthetic",
          type: "ChoiceOffer",
          description: `${choice.title} offer`,
          details: { kind: choice.kind },
          humanActions: [],
          state: offerState,
        });
        beforeState = offerState;
      }
      if (choiceIndex === choices.length - 1) {
        normalized.push(step);
        return;
      }
      const revealedState = stateAfterCompletedChoice(beforeState, choice);
      normalized.push({
        sequence: step.sequence,
        observedAt: step.observedAt,
        direction: "synthetic",
        type: "ChoiceRevealed",
        description: `${choice.title} selected`,
        details: { kind: choice.kind },
        humanActions: [],
        state: revealedState,
      });
      beforeState = revealedState;
    });
  }
  inputSteps.splice(0, inputSteps.length, ...normalized);
  return inputSteps;
}

ensureChoiceOfferSteps(logicalSteps);

function stabilizePreparationSnapshots(inputSteps) {
  const stabilizeSegment = (start, end) => {
    const latestPriorRoundByPlayer = new Map();
    const nextOpponentByPlayer = new Map();
    for (let index = start; index < end; index += 1) {
      for (const player of Object.values(inputSteps[index].state?.players ?? {})) {
        if (player.lastRound) latestPriorRoundByPlayer.set(player.uid, clone(player.lastRound));
        if (player.nextOpponent) nextOpponentByPlayer.set(player.uid, player.nextOpponent);
      }
    }
    if (!latestPriorRoundByPlayer.size && !nextOpponentByPlayer.size) return;
    for (let index = start; index < end; index += 1) {
      for (const player of Object.values(inputSteps[index].state?.players ?? {})) {
        const latestPriorRound = latestPriorRoundByPlayer.get(player.uid);
        if (latestPriorRound) player.lastRound = clone(latestPriorRound);
        const nextOpponent = nextOpponentByPlayer.get(player.uid);
        if (nextOpponent) player.nextOpponent = nextOpponent;
      }
    }
  };

  let segmentStart = 0;
  for (let index = 0; index <= inputSteps.length; index += 1) {
    if (index < inputSteps.length && !inputSteps[index].battle) continue;
    stabilizeSegment(segmentStart, index);
    segmentStart = index + 1;
  }
}

// Public prior-round information and the newly assigned opponent are immutable
// during a preparation phase, but the first complete GameStatus carrying them
// can arrive after private actions. Backfill them only within the current
// pre-battle segment: the battle summary keeps the old matchup, while the very
// next step shows the new opponent and a stable prior-round snapshot.
stabilizePreparationSnapshots(logicalSteps);

function removeEmptyTimelineSteps(inputSteps) {
  const retained = [];
  let previousState = {};
  for (const step of inputSteps) {
    const hasContent = Boolean(step.battle) || Boolean(step.humanActions?.length) || !sameValue(previousState, step.state);
    if (!hasContent) continue;
    retained.push(step);
    previousState = step.state;
  }
  inputSteps.splice(0, inputSteps.length, ...retained);
  return inputSteps;
}

removeEmptyTimelineSteps(logicalSteps);

function assertTimelinePresentation(inputSteps) {
  let previousState = {};
  for (const [index, step] of inputSteps.entries()) {
    if (!step.battle && !step.humanActions?.length && sameValue(previousState, step.state)) {
      throw new Error(`empty visible timeline step remained at index ${index}`);
    }
    if (index > 0) {
      const choices = completedChoicesForStep(previousState, step.state);
      if (choices.length > 1) {
        throw new Error(`multiple choices remained batched at sequence ${step.sequence}`);
      }
      if (choices.length === 1) {
        const priorOverlay = previousState.privatePlayer?.choiceOverlay;
        if (priorOverlay?.kind !== choices[0].kind || !priorOverlay.options?.length) {
          throw new Error(`completed ${choices[0].kind} choice lacks its immediately preceding offer at sequence ${step.sequence}`);
        }
      }
    }
    previousState = step.state;
  }
}

assertTimelinePresentation(logicalSteps);

function auditLogicalCardTransitions(inputSteps) {
  const issue = (step, priorPrivate, reason, extra = {}) => cardTransitionIssues.push({
    capture: path.basename(inputPath),
    sequence: Number(step.sequence) || 0,
    type: step.type,
    round: Number(step.state?.round) || 0,
    uid: priorPrivate?.uid ?? "",
    reason,
    action: clone(step.details ?? {}),
    hand: clone(priorPrivate?.hand ?? []),
    deck: clone(priorPrivate?.deck ?? []),
    ...extra,
  });
  for (let index = 1; index < inputSteps.length; index += 1) {
    const step = inputSteps[index];
    if (step.type !== "MoveCardReq" && step.type !== "InsertCardReq") continue;
    const priorPrivate = inputSteps[index - 1].state?.privatePlayer;
    const currentPrivate = step.state?.privatePlayer;
    if (!priorPrivate || !currentPrivate || priorPrivate.uid !== currentPrivate.uid) continue;
    const action = step.details ?? {};
    const source = Number(action.sourcePosition) === 0 ? priorPrivate.hand
      : Number(action.sourcePosition) === 1 ? priorPrivate.deck : null;
    const sourceIndex = Number(action.sourceIndex);
    if (!source || sourceIndex < 0 || sourceIndex >= source.length) {
      issue(step, priorPrivate, "source position or index is invalid in the reconstructed timeline");
      continue;
    }
    const sourceCard = numericCardId(source[sourceIndex]);
    if (sourceCard <= 0) {
      issue(step, priorPrivate, "source slot is empty or unresolved in the reconstructed timeline", { sourceCard });
      continue;
    }
    if (step.type === "InsertCardReq") {
      const target = Number(action.destinationIndex);
      const unlocked = Number(priorPrivate.unlockedDeckSlots ?? priorPrivate.deck?.length ?? 0);
      if (target < 0 || target >= unlocked) issue(step, priorPrivate, "insert destination is outside the unlocked deck");
      continue;
    }
    if (Number(action.destinationPosition) === 0 && Number(action.sourcePosition) === 0
      && Number(action.destinationIndex) !== sourceIndex) {
      const destinationCard = numericCardId(priorPrivate.hand?.[Number(action.destinationIndex)]);
      if (destinationCard <= 0 || !combinationResultId(sourceCard, destinationCard, priorPrivate)) {
        issue(step, priorPrivate, "hand-to-hand move is not a legal combination", { sourceCard, destinationCard });
      }
    } else if (Number(action.destinationPosition) === 1) {
      const target = Number(action.destinationIndex);
      if (target < 0 || target >= Number(priorPrivate.deck?.length ?? 0)) {
        issue(step, priorPrivate, "destination deck index is invalid in the reconstructed timeline");
      }
    } else if (Number(action.destinationPosition) !== 0) {
      issue(step, priorPrivate, "destination position is invalid in the reconstructed timeline");
    }
  }
}

auditLogicalCardTransitions(logicalSteps);
if (process.env.YXP_CARD_AUDIT) {
  for (const issue of cardTransitionIssues) console.log(`CARD_TRANSITION_ISSUE ${JSON.stringify(issue)}`);
}

const outputRecordingId = path.basename(outputPath).replace(/\.compact(?:\.json\.gz|\.json|\.js)$/, "");
const checkedRegressions = assertRecordingRegression(outputRecordingId, logicalSteps);
if (checkedRegressions) {
  console.log(`RECORDING_REGRESSIONS ${JSON.stringify({ recording: outputRecordingId, checked: checkedRegressions })}`);
}

let previousVisibleState = {};
for (const step of logicalSteps) {
  step.patch = statePatch(previousVisibleState, step.state) ?? {};
  previousVisibleState = step.state;
}

const payload = {
  source: path.basename(inputPath),
  capturedThrough: rawEvents.at(-1)?.observedAt ?? "",
  targetUid,
  targetUsername: profiles.get(targetUid)?.username ?? targetUid,
  profiles: Object.fromEntries(profiles),
  catalog,
  steps: logicalSteps,
};
const outputIsJson = path.extname(outputPath).toLowerCase() === ".json";
const outputIsCompactScript = path.basename(outputPath).includes(".compact.");
if (outputIsJson || outputIsCompactScript) {
  const compact = {
    id: outputRecordingId,
    targetUid: payload.targetUid,
    targetUsername: payload.targetUsername,
    catalog: payload.catalog,
    steps: payload.steps.map(({ humanActions, patch, battle }) => ({
      ...(humanActions.length ? { humanActions } : {}),
      ...(battle ? { battle } : {}),
      patch,
    })),
  };
  fs.writeFileSync(outputPath, outputIsJson
    ? `${JSON.stringify(compact)}\n`
    : `window.REPLAY_RECORDING = ${JSON.stringify(compact)};\n`);
} else {
  fs.writeFileSync(outputPath, `window.REPLAY_DATA = ${JSON.stringify(payload)};\n`);
}
console.log(`wrote ${steps.length} steps to ${outputPath}`);
