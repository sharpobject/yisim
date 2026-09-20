#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(scriptDirectory, "..");
const battleBuffIds = new Set([17, 10008, 10009, 10010, 10011, 10012, 10013, 10014, 10017, 10018, 10019, 10020, 10037, 10045, 10047]);

function usage() {
  return `usage: node replay_browser/generate_replay_summary_html.mjs REPLAY.json [OUTPUT.html]

Options:
  --localization FILE   extracted localization JSON
  --cards FILE          extracted CardConfig JSON
  --fates FILE          extracted heavenly_derivation_fates JSON
  --talents FILE        raw TalentConfig JSON (for filled descriptions)
  --language en|zh      initial interface language (default: en)
  --no-sibling-povs     do not load CODE_p*.json files beside the input

The result is one HTML file. UI code, CSS, and replay data are embedded; artwork
is loaded from sharpobject.github.io when the file is opened.`;
}

function parseArguments(argv) {
  const options = { language: "en", siblingPovs: true };
  const positional = [];
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--help" || argument === "-h") {
      console.log(usage());
      process.exit(0);
    }
    if (argument === "--no-sibling-povs") {
      options.siblingPovs = false;
      continue;
    }
    const names = new Map([
      ["--localization", "localization"], ["--cards", "cards"],
      ["--fates", "fates"], ["--talents", "talents"], ["--language", "language"],
    ]);
    if (names.has(argument)) {
      const value = argv[++index];
      if (!value) throw new Error(`${argument} requires a value`);
      options[names.get(argument)] = value;
      continue;
    }
    if (argument.startsWith("--")) throw new Error(`unknown option: ${argument}`);
    positional.push(argument);
  }
  if (!positional[0]) throw new Error(usage());
  if (!["en", "zh"].includes(options.language)) throw new Error("--language must be en or zh");
  options.input = path.resolve(positional[0]);
  options.output = path.resolve(positional[1] ?? positional[0].replace(/\.json$/i, "") + ".summary.html");
  return options;
}

function newestMatching(directory, expression) {
  if (!fs.existsSync(directory)) return null;
  return fs.readdirSync(directory)
    .filter((name) => expression.test(name))
    .sort((first, second) => first.localeCompare(second))
    .map((name) => path.join(directory, name))
    .at(-1) ?? null;
}

function firstExisting(candidates) {
  return candidates.find((candidate) => candidate && fs.existsSync(candidate)) ?? null;
}

export function resolveConfigPaths(options) {
  const inputDirectory = path.dirname(options.input);
  const steamDumps = fs.readdirSync(workspaceRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name.startsWith("steam_"))
    .map((entry) => path.join(workspaceRoot, entry.name))
    .sort();
  const steamDump = steamDumps.at(-1);
  return {
    localization: firstExisting([
      options.localization && path.resolve(options.localization),
      process.env.YXP_LOCALIZATION,
      newestMatching(inputDirectory, /localization.*\.json$/i),
      newestMatching("/private/tmp", /^yxp-localization-.*\.json$/i),
      steamDump && path.join(steamDump, "localization.json"),
    ]),
    cards: firstExisting([
      options.cards && path.resolve(options.cards),
      process.env.YXP_CARD_CONFIG,
      newestMatching(inputDirectory, /CardConfig.*\.json$/i),
      newestMatching("/private/tmp", /^yxp-CardConfig-.*\.json$/i),
      steamDump && path.join(steamDump, "protobuf", "CardConfig.json"),
    ]),
    fates: firstExisting([
      options.fates && path.resolve(options.fates),
      process.env.YXP_HDF_METADATA,
      newestMatching(inputDirectory, /heavenly.derivation.fates.*\.json$/i),
      newestMatching("/private/tmp", /^yxp-heavenly-derivation-fates-.*\.json$/i),
      steamDump && path.join(steamDump, "heavenly_derivation_fates.json"),
    ]),
    talents: firstExisting([
      options.talents && path.resolve(options.talents),
      process.env.YXP_TALENT_CONFIG,
      newestMatching(inputDirectory, /TalentConfig.*raw.*\.json$/i),
      newestMatching("/private/tmp", /^yxp-TalentConfig-.*raw.*\.json$/i),
      steamDump && path.join(steamDump, "protobuf_raw_json", "TalentConfig.raw.json"),
    ]),
  };
}

function readJson(filename, fallback) {
  return filename ? JSON.parse(fs.readFileSync(filename, "utf8")) : fallback;
}

export function replayData(filename) {
  const document = readJson(filename, null);
  const data = document?.data ?? document;
  if (!data?.uid || !Array.isArray(data.roundStats)) throw new Error(`${filename} is not a replay POV JSON file`);
  return { filename, data };
}

export function siblingReplayFiles(input) {
  const parsed = path.parse(input);
  const match = /^(.*)_p\d+$/.exec(parsed.name);
  if (!match) return [input];
  const prefix = `${match[1]}_p`;
  return fs.readdirSync(parsed.dir)
    .filter((name) => name.startsWith(prefix) && /^\d+\.json$/i.test(name.slice(prefix.length)))
    .sort((first, second) => Number(first.slice(prefix.length)) - Number(second.slice(prefix.length)))
    .map((name) => path.join(parsed.dir, name));
}

function sideForUid(roundStat, uid) {
  return [roundStat?.p1, roundStat?.p2].find((side) => side?.publicData?.uid === uid) ?? null;
}

function roundForView(view, round, exact = false) {
  const candidates = view.data.roundStats.filter((entry) => Number(entry.round) <= round);
  const result = candidates.at(-1) ?? null;
  return exact && Number(result?.round) !== round ? null : result;
}

function cleanHtml(value = "") {
  return String(value)
    .replace(/<br\s*\/?\s*>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">").replace(/&#39;/g, "'")
    .replace(/\\n/g, "\n").trim();
}

function rawFieldBytes(field) {
  if (!field) return Buffer.alloc(0);
  if (field.value_base64ish_hex) return Buffer.from(field.value_base64ish_hex, "hex");
  if (typeof field.value === "string") return Buffer.from(field.value, "latin1");
  if (!Array.isArray(field.value)) return Buffer.alloc(0);
  const bytes = [];
  const writeVarint = (input) => {
    let value = Number(input) >>> 0;
    while (value >= 0x80) { bytes.push((value & 0x7f) | 0x80); value >>>= 7; }
    bytes.push(value);
  };
  for (const entry of field.value) {
    if (entry.wire_type !== 0) continue;
    writeVarint((Number(entry.field) << 3) | entry.wire_type);
    writeVarint(entry.value);
  }
  return Buffer.from(bytes);
}

function packedRawField(field) {
  const bytes = rawFieldBytes(field);
  const result = [];
  let offset = 0;
  while (offset < bytes.length) {
    let number = 0;
    let shift = 0;
    for (;;) {
      const byte = bytes[offset++];
      number |= (byte & 0x7f) << shift;
      if ((byte & 0x80) === 0) break;
      shift += 7;
    }
    result.push(number);
  }
  return result;
}

function talentConfiguration(rawRows) {
  const result = new Map();
  for (const outer of rawRows ?? []) {
    if (outer.field !== 2 || !Array.isArray(outer.value)) continue;
    const get = (number, fallback = 0) => outer.value.find((entry) => entry.field === number)?.value ?? fallback;
    const id = Number(get(1));
    if (!id) continue;
    result.set(id, {
      id,
      iconId: Number(get(2)) || id,
      level: Number(get(6)) || 0,
      otherParams: packedRawField(outer.value.find((entry) => entry.field === 100)),
    });
  }
  return result;
}

export function createCatalogBuilder(configPaths) {
  const localizationDocument = readJson(configPaths.localization, { terms: {} });
  const terms = localizationDocument.terms ?? localizationDocument;
  const cardConfigs = new Map(readJson(configPaths.cards, []).map((entry) => [Number(entry.id), entry]));
  const fateConfigs = new Map(readJson(configPaths.fates, []).map((entry) => [Number(entry.id), entry]));
  const talentConfigs = talentConfiguration(readJson(configPaths.talents, []));
  const catalog = { cards: {}, talents: {}, fateStrategies: {}, characters: {} };

  const term = (key, language) => {
    const value = terms[key];
    if (typeof value === "string") return value;
    return String(value?.[language === "zh" ? "zh-CN" : "en"] ?? "");
  };
  const fill = (text, parameters = []) => cleanHtml(text).replace(/\{otherParams\[(\d+)\]\}/g,
    (_match, index) => parameters[Number(index)] ?? "?");
  const cardReference = (text, language) => String(text).replace(/【(\d+)】/g, (_match, rawId) => {
    const id = rememberCard(Number(rawId));
    const card = catalog.cards[id];
    return card?.[language === "zh" ? "nameChinese" : "nameEnglish"] ?? `【${rawId}】`;
  });

  function rememberCard(input) {
    const id = Number(input);
    if (!Number.isFinite(id) || catalog.cards[id]) return id;
    const config = cardConfigs.get(id) ?? {};
    catalog.cards[id] = {
      id,
      nameEnglish: term(`CardName_${id}`, "en") || `Card ${id}`,
      nameChinese: term(`CardName_${id}`, "zh") || config.name || `卡牌 ${id}`,
      upgrade: Number(config.level) > 0 && Number(config.level) <= 3
        ? Math.floor((Math.abs(id) % 100000) / 10000) + 1
        : Math.floor((Math.abs(id) % 100000) / 10000) + 1,
      phase: Number(config.level) || 0,
    };
    return id;
  }

  function rememberTalent(input) {
    const id = Number(input);
    if (!id || catalog.talents[id]) return id;
    const baseId = Math.abs(id) % 10000;
    const config = talentConfigs.get(id) ?? talentConfigs.get(baseId) ?? { iconId: baseId || id, level: 0, otherParams: [] };
    const nameEnglish = term(`Talent_${id}`, "en") || term(`Talent_${baseId}`, "en") || `Fate ${id}`;
    const nameChinese = term(`Talent_${id}`, "zh") || term(`Talent_${baseId}`, "zh") || `仙命 ${id}`;
    const rawDescriptionEnglish = fill(term(`TalentDesc_${id}`, "en") || term(`TalentDesc_${baseId}`, "en"), config.otherParams);
    const rawDescriptionChinese = fill(term(`TalentDesc_${id}`, "zh") || term(`TalentDesc_${baseId}`, "zh"), config.otherParams);
    const referencedCardIds = [...rawDescriptionEnglish.matchAll(/【(\d+)】/g)].map((match) => rememberCard(Number(match[1])));
    const descriptionEnglish = cardReference(rawDescriptionEnglish, "en");
    const descriptionChinese = cardReference(rawDescriptionChinese, "zh");
    const grantedCardCount = metric(rawDescriptionEnglish, /(?:Gain|Draw)\s+(\d+)\s+【/i);
    catalog.talents[id] = { id, iconId: config.iconId, level: config.level, nameEnglish, nameChinese, descriptionEnglish, descriptionChinese, referencedCardIds, grantedCardCount };
    for (const description of [descriptionEnglish, descriptionChinese]) {
      for (const match of description.matchAll(/【(\d+)】/g)) rememberCard(Number(match[1]));
    }
    return id;
  }

  function rememberFate(input) {
    const id = Number(input);
    if (!id || catalog.fateStrategies[id]) return id;
    const config = fateConfigs.get(id) ?? {};
    const category = Number(config.category) || 0;
    const otherParams = [...(config.otherParams ?? [])].map(Number);
    const firstCard = cardConfigs.get(otherParams[0]);
    const iconFile = config.overrideSpritePath
      ? `${config.overrideSpritePath}.png`
      : category === 4 && otherParams[0] > 0
        ? `Icon_Talent_${otherParams[0]}.png`
        : [3, 5, 6, 7, 8].includes(category) && firstCard
          ? `Card_${Number(firstCard.overrideSpriteId) || otherParams[0]}.png`
          : `Icon_FateStrategy_${id}.png`;
    const compositeCardIds = [3, 7].includes(category)
      ? otherParams.slice(0, 2).map(rememberCard).filter((value) => value > 0)
      : null;
    catalog.fateStrategies[id] = {
      id,
      nameEnglish: config.name_en || term(`FateStrategyName_${id}`, "en") || `Fate Strategy ${id}`,
      nameChinese: config.name_zh || term(`FateStrategyName_${id}`, "zh") || `天衍仙命 ${id}`,
      descriptionEnglish: cleanHtml(config.description_en_html || config.description_en || term(`FateStrategyDesc_${id}`, "en")),
      descriptionChinese: cleanHtml(config.description_zh_html || config.description_zh || term(`FateStrategyDesc_${id}`, "zh")),
      iconFile,
      category,
      countParam: Number(config.countParam) || 0,
      effectRound: Number(config.effectRound) || 0,
      otherParams,
      ...(compositeCardIds?.length === 2 ? { compositeCardIds } : {}),
    };
    return id;
  }

  function rememberCharacter(input) {
    const id = Number(input);
    if (!id || catalog.characters[id]) return id;
    catalog.characters[id] = {
      id,
      nameEnglish: term(`CharacterName_${id}`, "en") || `Character ${id}`,
      nameChinese: term(`CharacterName_${id}`, "zh") || `角色 ${id}`,
    };
    return id;
  }

  return { catalog, rememberCard, rememberTalent, rememberFate, rememberCharacter, fateConfigs, talentConfigs, cardConfigs, terms };
}

function selectionHistory(selection, rerollsKnown = false) {
  return {
    roundOrPhase: Number(selection.id),
    offers: [[...(selection.pendings ?? selection.pending ?? [])].map(Number)],
    selected: Number(selection.selected),
    rerollsRemaining: 0,
    rerollsUsed: 0,
    rerollsKnown,
    complete: Boolean(selection.selected),
  };
}

function mapSelections(privateData, key) {
  return (privateData?.[key] ?? []).filter((entry) => Number(entry.selected) > 0).map((entry) => selectionHistory(entry));
}

function hdfHistories(privateData) {
  return (privateData?.fateStrategyData?.strategies ?? [])
    .filter((entry) => Number(entry.selected) > 0)
    .map((entry) => selectionHistory(entry, false));
}

function physiqueFrom(source) {
  return Number(source?.permanentBuffTempDatas?.[10023] ?? 0);
}

function maxPhysiqueFrom(source) {
  return Number(source?.permanentBuffTempDatas?.[10024] ?? 0);
}

function fateRuntime(id, privateData, round, fateConfigs) {
  const config = fateConfigs.get(Number(id)) ?? {};
  const counter = Number(privateData?.fateStrategyData?.counters?.[id] ?? 0);
  if (Number(config.category) === 1) return { kind: "charges", value: Math.max(0, Number(config.countParam) - counter) };
  if ([2, 8, 9].includes(Number(config.category))) {
    const readyRound = counter > 0 ? counter + Number(config.countParam) : 0;
    const value = Math.max(0, readyRound - Number(round));
    return Number.isFinite(value) ? { kind: "cooldown", value } : null;
  }
  return null;
}

function selectedFateReferences(privateData, round, builder) {
  const histories = hdfHistories(privateData);
  return histories.map((history) => {
    builder.rememberFate(history.selected);
    history.offers.flat().forEach(builder.rememberFate);
    return { id: history.selected, runtime: fateRuntime(history.selected, privateData, round, builder.fateConfigs), locked: false, choiceHistory: history };
  });
}

function talentReferences(publicData, privateData, builder) {
  const histories = new Map(mapSelections(privateData, "talentSelectionDatas").map((history) => [history.selected, history]));
  return (publicData?.talents ?? []).map((id, index) => {
    builder.rememberTalent(id);
    const history = histories.get(Number(id));
    history?.offers.flat().forEach(builder.rememberTalent);
    const counter = publicData?.talentTempDatas?.[id];
    const additionalCareer = Number(privateData?.FZJXCareers?.[index + 1] ?? 0);
    return {
      id: Number(id),
      runtime: counter == null ? null : { kind: "fate counter", value: Number(counter) },
      ...(history ? { choiceHistory: history } : {}),
      ...(additionalCareer > 0 ? { additionalCareer } : {}),
    };
  });
}

function battleBuffs(source) {
  return Object.entries(source?.permanentBuffTempDatas ?? {})
    .filter(([id, value]) => battleBuffIds.has(Number(id)) && Number(value) !== 0)
    .map(([id, value]) => ({ id: Number(id), value: Number(value) }));
}

function previousRoundState(publicData, builder) {
  const prior = publicData?.lastRoundData;
  if (!prior) return null;
  (prior.usedCards ?? []).forEach(builder.rememberCard);
  (prior.talents ?? []).forEach(builder.rememberTalent);
  (prior.fateStrategies ?? []).forEach(builder.rememberFate);
  return {
    life: Number(prior.life ?? publicData.life ?? 0),
    extraMaxHp: Number(prior.extraMaxHp ?? 0), cultivation: Number(prior.exp ?? 0),
    physique: physiqueFrom(prior), maxPhysique: maxPhysiqueFrom(prior), phase: Number(prior.level ?? publicData.level ?? 0),
    talents: (prior.talents ?? []).map((id, index) => ({
      id: Number(id),
      runtime: prior.talentTempDatas?.[id] == null ? null : { kind: "fate counter", value: Number(prior.talentTempDatas[id]) },
      ...(Number(prior.FZJXCareers?.[index + 1]) > 0
        ? { additionalCareer: Number(prior.FZJXCareers[index + 1]) }
        : {}),
    })),
    fateStrategies: (prior.fateStrategies ?? []).map((id) => ({ id: Number(id), runtime: null, locked: false })),
    battleBuffs: battleBuffs(prior), deck: [...(prior.usedCards ?? [])].map(Number),
  };
}

function publicPlayer(view, round, builder, preBattle = true) {
  const roundStat = roundForView(view, round);
  const side = sideForUid(roundStat, view.data.uid);
  if (!side) return null;
  const publicData = side.publicData;
  const privateData = side.privateData ?? {};
  builder.rememberCharacter(publicData.characterId);
  const talents = talentReferences(publicData, privateData, builder);
  const prior = previousRoundState(publicData, builder);
  const rating = view.data.isDaoXinRank ? view.data.beginDaoXinRankScore : view.data.beginRankScore;
  const observedRound = Number(roundStat.round ?? 0);
  const isCurrentRound = observedRound === Number(round);
  return {
    uid: publicData.uid, username: publicData.username, rating: Number(rating) || 0,
    life: preBattle && prior && isCurrentRound ? prior.life : Number(publicData.life ?? 0),
    observedRound,
    extraMaxHp: Number(publicData.extraMaxHp ?? 0), cultivation: Number(publicData.exp ?? 0),
    physique: physiqueFrom(publicData), maxPhysique: maxPhysiqueFrom(publicData), phase: Number(publicData.level ?? 0),
    sect: Number(publicData.sect ?? 0), career: Number(publicData.career ?? 0),
    nextOpponent: publicData.nextOpponent ?? "", previousOpponent: publicData.previousOpponent ?? "",
    characterId: Number(publicData.characterId ?? 0), character: builder.catalog.characters[publicData.characterId]?.nameChinese ?? "",
    skinNumber: Number(publicData.skinNumber ?? 0), skinColor: Number(publicData.skinColor ?? 0),
    talents, rank: Number(publicData.rank ?? 0), ai: Boolean(publicData.isAI),
    exchangesRemainingPublic: Number(publicData.replaceCardChance ?? 0), wins: Number(publicData.winRoundCount ?? 0), losses: Number(publicData.loseRoundCount ?? 0),
    settled: Number(roundStat.round) < round || Number(publicData.life ?? 0) <= 0,
    lastRound: prior,
  };
}

function privatePlayerState(view, round, builder) {
  const roundStat = roundForView(view, round, true);
  const side = sideForUid(roundStat, view.data.uid);
  if (!side) return null;
  const privateData = side.privateData ?? {};
  [...(privateData.handCards ?? []), ...(privateData.usedCards ?? [])].forEach(builder.rememberCard);
  const vase = privateData.talentDatas?.[199]?.commonParams;
  if (vase) vase.forEach(builder.rememberCard);
  const daoYunChoices = mapSelections(privateData, "daoYunSelectionDatas");
  daoYunChoices.forEach((history) => history.offers.flat().concat(history.selected).forEach(builder.rememberCard));
  return {
    uid: view.data.uid,
    hand: [...(privateData.handCards ?? [])].map(Number), deck: [...(privateData.usedCards ?? [])].map(Number),
    unlockedDeckSlots: Number(privateData.unlockGrids ?? 0), exchangesRemaining: Number(privateData.replaceCardChance ?? 0),
    exchangeLimit: Number(privateData.replaceCardChanceLimit ?? 0),
    ...(vase ? { cardStorage: { 199: Array.from({length: 3}, (_, i) => Number(vase[i]) || 0) } } : {}),
    selectedFateStrategies: selectedFateReferences(privateData, round, builder), daoYunChoices, cardSelections: [],
    additionalCareers: Object.entries(privateData.FZJXCareers ?? {}).map(([slot, career]) => ({ slot: Number(slot), phase: Number(slot), career: Number(career) })),
    choiceOverlay: { $deleted: true },
  };
}

export function stateForRound(views, targetView, round, builder) {
  const players = {};
  for (const view of views) {
    const player = publicPlayer(view, round, builder, true);
    if (player) players[player.uid] = player;
  }
  return {
    round, timer: 0, ended: round === Number(targetView.data.roundStats.at(-1)?.round),
    gameMode: Number(targetView.data.gameMode ?? 0), codeId: Number(targetView.data.codeId ?? 0), targetUid: targetView.data.uid,
    players, privatePlayer: privatePlayerState(targetView, round, builder),
  };
}

function combatant(side, roundStat, builder) {
  const publicData = side.publicData;
  const privateData = side.privateData ?? {};
  const prior = publicData.lastRoundData ?? {};
  [...(privateData.usedCards ?? [])].forEach(builder.rememberCard);
  (publicData.talents ?? []).forEach(builder.rememberTalent);
  const fateIds = hdfHistories(privateData).map((history) => history.selected);
  fateIds.forEach(builder.rememberFate);
  const lifeBefore = Number(prior.life ?? publicData.life ?? 0);
  const winner = String(roundStat.winerId ?? "");
  const lost = Boolean(winner) && winner !== publicData.uid;
  const hasDewJadeVase = (prior.usedCards ?? []).some((id) => [99000101, 99010101, 99020101].includes(Number(id)));
  const observedDelta = Number(publicData.life ?? 0) - lifeBefore;
  const lifeDelta = lost
    ? -Math.abs(Number(roundStat.lifeDamage ?? 0))
    : winner === publicData.uid && hasDewJadeVase
      ? Math.max(0, observedDelta)
      : 0;
  return {
    uid: publicData.uid, opponentUid: "", username: publicData.username,
    characterId: Number(publicData.characterId ?? 0), character: builder.catalog.characters[publicData.characterId]?.nameChinese ?? "",
    skinNumber: Number(publicData.skinNumber ?? 0), skinColor: Number(publicData.skinColor ?? 0), sect: Number(publicData.sect ?? 0), career: Number(publicData.career ?? 0),
    phase: Number(publicData.level ?? 0), cultivation: Number(publicData.exp ?? 0), speed: 0,
    physique: physiqueFrom(prior), maxPhysique: maxPhysiqueFrom(prior), lifeBefore, lifeDelta,
    result: !winner ? "draw" : winner === publicData.uid ? "win" : "loss",
    first: String(roundStat.firstPlayerId ?? "") === publicData.uid,
    talents: talentReferences(publicData, privateData, builder),
    fateStrategies: fateIds.map((id) => ({ id, runtime: fateRuntime(id, privateData, roundStat.round, builder.fateConfigs), locked: false })),
    battleBuffs: battleBuffs(prior), deck: [...(privateData.usedCards ?? [])].map(Number),
  };
}

function destinyAction(changes, kind = "destiny", round = 0) {
  const english = changes.map(({ username, delta }) =>
    `${username} ${delta > 0 ? "gained" : "lost"} ${Math.abs(delta)} Destiny`).join("; ");
  const chinese = changes.map(({ username, delta }) =>
    `${username}${delta > 0 ? "获得" : "失去"}${Math.abs(delta)}命元`).join("；");
  return { kind, round, textEnglish: english, textChinese: chinese, changes };
}

function battleDestinyChanges(battle) {
  const byUid = new Map();
  for (const matchup of battle.matchups ?? []) {
    for (const player of Object.values(matchup.players ?? {})) {
      const delta = Number(player.lifeDelta ?? 0);
      if (delta && !byUid.has(player.uid)) byUid.set(player.uid, { uid: player.uid, username: player.username, delta });
    }
  }
  return [...byUid.values()];
}

function postBattleStateAndNonBattleChanges(views, round, state, builder) {
  const battleState = structuredClone(state);
  const finalState = structuredClone(state);
  const changes = [];
  for (const view of views) {
    const roundStat = roundForView(view, round, true);
    const side = sideForUid(roundStat, view.data.uid);
    if (!side?.publicData || !battleState.players?.[view.data.uid]) continue;
    const battlePlayer = combatant(side, roundStat, builder);
    const startLife = Number(battlePlayer.lifeBefore ?? 0);
    const endLife = Number(side.publicData.life ?? startLife);
    const battleLife = startLife + Number(battlePlayer.lifeDelta ?? 0);
    battleState.players[view.data.uid].life = battleLife;
    finalState.players[view.data.uid].life = endLife;
    const delta = endLife - battleLife;
    if (delta) changes.push({ uid: view.data.uid, username: side.publicData.username, delta });
  }
  return { battleState, finalState, changes };
}

function lifeChanges(before, after) {
  if (!before) return [];
  return Object.values(after.players ?? {}).flatMap((player) => {
    const prior = before.players?.[player.uid];
    if (!prior || Number(player.observedRound) !== Number(after.round)) return [];
    const delta = Number(player.life ?? 0) - Number(prior.life ?? 0);
    return delta ? [{ uid: player.uid, username: player.username, delta }] : [];
  });
}

export function battleForRound(views, round, builder) {
  const seenPairs = new Set();
  const matchups = [];
  for (const view of views) {
    const roundStat = roundForView(view, round, true);
    if (!roundStat?.p1?.publicData?.uid || !roundStat?.p2?.publicData?.uid) continue;
    const firstUid = roundStat.p1.publicData.uid;
    const secondUid = roundStat.p2.publicData.uid;
    const pair = [firstUid, secondUid].sort().join(":");
    if (seenPairs.has(pair)) continue;
    seenPairs.add(pair);
    const first = combatant(roundStat.p1, roundStat, builder);
    const second = combatant(roundStat.p2, roundStat, builder);
    first.opponentUid = second.uid;
    second.opponentUid = first.uid;
    matchups.push({ authoritative: true, players: { [first.uid]: first, [second.uid]: second } });
  }
  return { round, matchups };
}

function inventoryCount(privatePlayer) {
  return [...(privatePlayer?.hand ?? []), ...(privatePlayer?.deck ?? [])].filter((id) => Number(id) !== 0).length;
}

function inventoryCards(privatePlayer) {
  return [...(privatePlayer?.hand ?? []), ...(privatePlayer?.deck ?? [])].map(Number).filter(Boolean);
}

function cardLevel(id) {
  return Math.floor((Math.abs(Number(id)) % 100000) / 10000) + 1;
}

function baseCardId(id) {
  const numeric = Number(id);
  return numeric - Math.sign(numeric || 1) * (cardLevel(numeric) - 1) * 10000;
}

function cardMultiset(privatePlayer) {
  const result = new Map();
  for (const id of inventoryCards(privatePlayer)) {
    const base = baseCardId(id);
    const levels = result.get(base) ?? [0, 0, 0, 0];
    levels[Math.min(3, cardLevel(id))] += 1;
    result.set(base, levels);
  }
  return result;
}

function inferredCombines(previousPrivate, currentPrivate, upgradeEffects = 0) {
  const previous = cardMultiset(previousPrivate);
  const current = cardMultiset(currentPrivate);
  const details = [];
  let count = 0;
  for (const base of new Set([...previous.keys(), ...current.keys()])) {
    // Cat Paw and Spirit Cat Chaos Sword grow through their own mechanics often
    // enough that a level transition is not evidence of a normal combine.
    if ([8, 9].includes(Math.abs(base) % 100000)) continue;
    const before = previous.get(base) ?? [0, 0, 0, 0];
    const after = current.get(base) ?? [0, 0, 0, 0];
    const newLevelTwo = Math.max(0, after[2] - before[2]);
    const disappearedLevelOne = Math.max(0, before[1] - after[1]);
    const newLevelThree = Math.max(0, after[3] - before[3]);
    const disappearedCopies = disappearedLevelOne + 2 * Math.max(0, before[2] - after[2]);
    if (newLevelTwo > 0 && disappearedLevelOne <= 2 * newLevelTwo) {
      count += newLevelTwo;
      details.push({ base, toLevel: 2, count: newLevelTwo });
    }
    if (newLevelThree > 0 && disappearedCopies <= 4 * newLevelThree) {
      count += newLevelThree;
      details.push({ base, toLevel: 3, count: newLevelThree });
    }
  }
  const suppressed = Math.min(count, Math.max(0, upgradeEffects));
  return { count: count - suppressed, suppressed, details };
}

function normalDrawCount(round) {
  if (round <= 1) return 0;
  return round >= 12 ? 4 : 3;
}

function normalExchangeGrant(round) {
  if (round <= 1) return 3;
  if (round === 2) return 1;
  if (round <= 4) return 2;
  if (round <= 9) return 3;
  return 4;
}

function curiosityCount(state) {
  const own = state.players?.[state.privatePlayer?.uid];
  return Number((own?.talents ?? []).find((entry) => Math.abs(Number(entry.id)) % 10000 === 129)?.runtime?.value ?? 0);
}

function metric(text, expression) {
  const match = expression.exec(String(text).replaceAll("−", "-"));
  return match ? Number(match[1]) : 0;
}

function cultivationEffect(text) {
  return metric(text, /Cultivation\s*\+\s*(\d+)/i)
    - metric(text, /Cultivation\s*-\s*(\d+)/i)
    - metric(text, /-(\d+)\s+Cultivation/i)
    - metric(text, /Lose\s+(\d+)\s+Cultivation/i);
}

function cardGainEffect(text) {
  const value = String(text);
  const each = /gain\s+1\s+(?:copy\s+)?each\s+of\s+([^.;]+)/i.exec(value);
  if (each) return each[1].split(/\s*,\s*|\s+and\s+/i).filter(Boolean).length;
  return metric(value, /(?:Draw|Gain)\s+(\d+)\s+(?:copies?\s+of\s+|cards?\b|[^.;]*\scards?\b)/i)
    || (/Choose 1 .*card|Choose 1 .* obtain|gain a level 1 copy|gain 1 copy|choose and gain 1/i.test(value) ? 1 : 0);
}

function fixedEffects() {
  return { cards: 0, exchanges: 0, cultivation: 0, maxHp: 0, upgrades: 0, uncertain: false, reasons: [] };
}

function addEffects(target, source, multiplier = 1) {
  for (const key of ["cards", "exchanges", "cultivation", "maxHp", "upgrades"]) target[key] += Number(source[key] ?? 0) * multiplier;
  target.uncertain ||= Boolean(source.uncertain);
  if (source.reasons?.length) target.reasons.push(...source.reasons);
  return target;
}

function activeFateEffect(id, round, builder) {
  const fate = builder.catalog.fateStrategies[id] ?? {};
  const description = fate.descriptionEnglish ?? "";
  const useIndex = description.search(/\bUse\s*\(/i);
  const text = useIndex >= 0 ? description.slice(useIndex) : description;
  const effect = fixedEffects();
  if (Number(id) === 1) effect.maxHp = round;
  else if (Number(id) === 2) effect.exchanges = Math.max(0, round - 3);
  else if (Number(id) === 4) { effect.exchanges = 1; effect.cards = 1; }
  else if (Number(id) === 5) { effect.cultivation = 1; effect.maxHp = -2; }
  else if (Number(id) === 28 || Number(id) === 389) effect.upgrades = 1;
  else {
    effect.exchanges = metric(text, /(?:Exchange (?:Card )?Chance|exchanges?)\s*\+\s*(\d+)/i);
    effect.cultivation = cultivationEffect(text);
    effect.maxHp = metric(text, /Max HP\s*\+\s*(\d+)/i) - metric(text, /Max HP\s*-\s*(\d+)/i);
    effect.cards = cardGainEffect(text);
  }
  if (Number(id) === 105) effect.cards = 4;
  if (Number(id) === 107) effect.cards = 0; // Adds a comprehension option, not a card to hand.
  if (Number(id) === 386) effect.cards = 3;
  if (Number(id) === 356) {
    effect.cards = 1;
    effect.uncertain = true;
    effect.reasons.push("Treasure Chest");
  }
  if ([322, 389].includes(Number(id))) {
    effect.uncertain = true;
    effect.reasons.push(fate.nameEnglish ?? `Fate ${id}`);
  }
  if (Number(id) === 339) {
    effect.uncertain = true;
    effect.reasons.push("Cut Off Mundane");
  }
  return effect;
}

function selectedFateIds(state) {
  return new Set((state.privatePlayer?.selectedFateStrategies ?? []).map((entry) => Number(entry.id)));
}

function selectionAndScheduledEffects(state, newTalentHistories, newFateHistories, builder) {
  const result = fixedEffects();
  for (const history of newTalentHistories) {
    const talent = builder.catalog.talents[history.selected] ?? {};
    const firstClause = String(talent.descriptionEnglish ?? "").split(/\n|;(?=\s*(?:When|Each|At|After|If))/i)[0];
    result.exchanges += metric(firstClause, /Exchange (?:Card )?Chance\s*\+\s*(\d+)/i)
      - metric(firstClause, /Exchange (?:Card )?Chance\s+(?:decrease|-)\s*(\d+)/i);
    result.cultivation += cultivationEffect(firstClause);
    result.maxHp += metric(firstClause, /Max HP\s*\+\s*(\d+)/i)
      - metric(firstClause, /Max HP\s+(?:reduced by|-)\s*(\d+)/i);
    result.cards += Number(talent.grantedCardCount ?? 0) || cardGainEffect(firstClause);
  }
  for (const history of newFateHistories) {
    const id = Number(history.selected);
    const fate = builder.catalog.fateStrategies[id] ?? {};
    if (fate.category === 5 && (!fate.effectRound || state.round >= fate.effectRound)) {
      result.cards += fate.countParam;
      result.cultivation -= fate.countParam;
    } else if (fate.category === 8) {
      result.cards += 1;
      result.cultivation -= 1;
    }
    const immediate = {
      16: { cultivation: 1 }, 31: { exchanges: 12 }, 39: { maxHp: 2 }, 124: { exchanges: 3 },
      133: { exchanges: 5 }, 353: { exchanges: 2, maxHp: 2 },
      400: { cultivation: -1 }, 433: { exchanges: 4 },
    }[id];
    if (immediate) addEffects(result, immediate);
    if (![5, 8].includes(fate.category) && fate.effectRound > 0 && state.round >= fate.effectRound) {
      const rewardText = String(fate.descriptionEnglish ?? "").split(/\bUse\s*\(/i)[0];
      result.cards += cardGainEffect(rewardText);
      result.cultivation += cultivationEffect(rewardText);
    }
  }
  const selectedIds = selectedFateIds(state);
  const fatePathSelections = new Map([
    [69, 69], [70, 16], [71, 57], [75, 64], [77, 127], [79, 145], [80, 150],
  ]);
  for (const history of newTalentHistories) {
    const baseTalent = Math.abs(Number(history.selected)) % 10000;
    if ([...fatePathSelections].some(([fateId, talentId]) => selectedIds.has(fateId) && baseTalent === talentId)) {
      result.cards += 1;
      result.cultivation -= 1;
    }
  }
  for (const history of (state.privatePlayer?.selectedFateStrategies ?? []).map((entry) => entry.choiceHistory).filter(Boolean)) {
    const id = Number(history.selected);
    const fate = builder.catalog.fateStrategies[id] ?? {};
    if (fate.category === 5 && fate.effectRound === state.round && !newFateHistories.some((entry) => Number(entry.selected) === id)) {
      result.cards += fate.countParam;
      result.cultivation -= fate.countParam;
    }
    if (id === 400 && state.round === 11 && !newFateHistories.some((entry) => Number(entry.selected) === id)) {
      result.cards += 2;
      result.exchanges += 3;
    }
    const rewardText = String(fate.descriptionEnglish ?? "").split(/\bUse\s*\(/i)[0];
    if (![5, 8].includes(fate.category) && fate.effectRound === state.round && id !== 400
      && !newFateHistories.some((entry) => Number(entry.selected) === id)) {
      result.cards += cardGainEffect(rewardText);
      result.cultivation += cultivationEffect(rewardText);
      result.exchanges += metric(rewardText, /Exchange (?:Card )?Chance\s*\+\s*(\d+)/i)
        + metric(rewardText, /\+(\d+)\s+Exchange (?:Card )?Chance/i);
      result.maxHp += metric(rewardText, /Max HP\s*\+\s*(\d+)/i) + metric(rewardText, /\+(\d+)\s+Max HP/i);
    }
  }
  return result;
}

function previousBattleOutcome(targetView, round) {
  const battle = roundForView(targetView, round - 1, true);
  if (!battle) return null;
  const side = sideForUid(battle, targetView.data.uid);
  const opponent = [battle.p1, battle.p2].find((entry) => entry && entry !== side);
  return {
    won: String(battle.winerId ?? "") === targetView.data.uid,
    lost: Boolean(battle.winerId) && String(battle.winerId) !== targetView.data.uid,
    actedFirst: String(battle.firstPlayerId ?? "") === targetView.data.uid,
    opponentUid: opponent?.publicData?.uid ?? "",
  };
}

function countFiveElements(privatePlayer, builder) {
  const elements = new Set();
  for (const id of inventoryCards(privatePlayer)) {
    const name = builder.catalog.cards[id]?.nameEnglish ?? "";
    const match = /\b(Wood|Fire|Earth|Metal|Water) Spirit\b/i.exec(name);
    if (match) elements.add(match[1].toLowerCase());
  }
  return elements.size;
}

function conditionalExchangeGrant(previousState, state, previousSummary, outcome, builder, newFateHistories) {
  if (!previousState) return 0;
  const ids = selectedFateIds(state);
  const newlySelected = new Set(newFateHistories.map((history) => Number(history.selected)));
  const activeBeforeBattle = (id) => ids.has(id) && !newlySelected.has(id);
  const talentBases = new Set((state.players?.[state.privatePlayer.uid]?.talents ?? []).map((entry) => Math.abs(Number(entry.id)) % 10000));
  const previousSpent = Number(previousSummary?.aggregate?.exchangesSpentEstimate ?? 0);
  const previousExchanges = Number(previousState.privatePlayer?.exchangesRemaining ?? 0);
  let grant = 0;
  if (activeBeforeBattle(19) && previousSpent === 0) grant += 1;
  if (activeBeforeBattle(21) && outcome?.won) grant += 1;
  if (activeBeforeBattle(66)) grant += 1;
  if (activeBeforeBattle(85) && previousSpent === 0) grant += 2;
  if (activeBeforeBattle(329) && outcome?.actedFirst) grant += 1;
  if (activeBeforeBattle(343) && countFiveElements(previousState.privatePlayer, builder) >= 5) grant += 1;
  if (activeBeforeBattle(410)) grant += 1;
  if (activeBeforeBattle(420)) grant += Math.min(3, Math.floor(previousExchanges / 10));
  if (activeBeforeBattle(401) && previousExchanges === 0) grant += 1;
  if (talentBases.has(80) && outcome?.won) {
    const talent = (state.players[state.privatePlayer.uid].talents ?? []).find((entry) => Math.abs(Number(entry.id)) % 10000 === 80);
    grant += metric(builder.catalog.talents[talent?.id]?.descriptionEnglish, /Exchange (?:Card )?Chance\D*\+?\s*(\d+)/i);
  }
  return grant;
}

function disappearedCards(previousPrivate, currentPrivate) {
  const after = new Map();
  for (const id of inventoryCards(currentPrivate)) after.set(id, (after.get(id) ?? 0) + 1);
  const result = [];
  for (const id of inventoryCards(previousPrivate)) {
    const remaining = after.get(id) ?? 0;
    if (remaining > 0) after.set(id, remaining - 1);
    else result.push(id);
  }
  return result;
}

function specialCultivationBonus(previousPrivate, currentPrivate, builder) {
  let bonus = 0;
  for (const id of disappearedCards(previousPrivate, currentPrivate)) {
    const card = builder.catalog.cards[id] ?? {};
    const level = Math.min(3, cardLevel(id));
    const name = card.nameEnglish ?? "";
    if (/Talent Elixir/i.test(name)) bonus += [0, 1, 2, 4][level];
    else if (/Mysterious Dao Fruit/i.test(name) && level === 3) bonus += 1;
    else if (/Daoist Rhyme Aura/i.test(name)) bonus += 1;
    else if (/Demonic Dao Fruit/i.test(name)) bonus += 1;
  }
  return bonus;
}

function cardUpgradeEffects(previousPrivate, currentPrivate, builder) {
  return disappearedCards(previousPrivate, currentPrivate)
    .filter((id) => /Catnip/i.test(builder.catalog.cards[id]?.nameEnglish ?? "")).length;
}

function fishInference(previousState, state, knownEffects, context, builder) {
  if (!previousState || knownEffects.uncertain) return 0;
  const ownBefore = previousState.players?.[previousState.privatePlayer.uid];
  const ownAfter = state.players?.[state.privatePlayer.uid];
  const baseHp = { 1: 40, 2: 45, 3: 52, 4: 62, 5: 75, 6: 100 };
  const observed = (baseHp[ownAfter?.phase] ?? 0) + Number(ownAfter?.extraMaxHp ?? 0)
    - (baseHp[ownBefore?.phase] ?? 0) - Number(ownBefore?.extraMaxHp ?? 0);
  const breakthrough = (baseHp[ownAfter?.phase] ?? 0) - (baseHp[ownBefore?.phase] ?? 0);
  const unexplained = observed - breakthrough - 2 - knownEffects.maxHp;
  if (unexplained <= 0) return 0;
  const phase = Number(ownAfter?.phase ?? 0);
  const ids = selectedFateIds(state);
  const omni = ids.has(31);
  const heldBefore = (expression) => inventoryCards(previousState.privatePlayer)
    .some((id) => expression.test(builder.catalog.cards[id]?.nameEnglish ?? ""));
  const changedTo = (career, predicate = () => true) => context.careerChanges.some((entry) => entry.career === career && predicate(entry.phase));
  const added = (career, predicate = () => true) => context.additionalCareers.some((entry) => entry.career === career && predicate(entry.phase));
  const canBodybuilding = heldBefore(/^Bodybuilding Elixir$/i) || context.primaryCareer === 1
    || changedTo(1, (atPhase) => atPhase <= 3) || added(1, (atPhase) => atPhase === 2);
  const canGreatBodybuilding = heldBefore(/^Great Bodybuilding Elixir$/i) || (phase >= 5
    && (context.primaryCareer === 1 || changedTo(1) || added(1) || omni));
  const canReasonByAnalogy = heldBefore(/^Reason By Analogy$/i) || (phase >= 4
    && (context.primaryCareer === 4 || changedTo(4) || added(4, (atPhase) => atPhase !== 5) || omni || ids.has(37)));
  const canDaoFruit = heldBefore(/^Mysterious Dao Fruit$/i) || (phase >= 5
    && (context.primaryCareer === 6 || changedTo(6) || added(6) || omni));
  if (!canBodybuilding && !canGreatBodybuilding && !canReasonByAnalogy && !canDaoFruit) return unexplained;
  if (!canBodybuilding && canGreatBodybuilding && !canReasonByAnalogy && !canDaoFruit && unexplained % 2 === 1) return 1;
  return 0;
}

function shopSummary(previousState, state, newTalentHistories, newFateHistories, uses, context, builder, outcome) {
  const round = state.round;
  const priorInventory = inventoryCount(previousState?.privatePlayer);
  const currentInventory = inventoryCount(state.privatePlayer);
  const known = selectionAndScheduledEffects(state, newTalentHistories, newFateHistories, builder);
  for (const use of uses) addEffects(known, activeFateEffect(use.id, round, builder), use.count);
  const ids = selectedFateIds(state);
  const newlySelectedFates = new Set(newFateHistories.map((history) => Number(history.selected)));
  if (previousState && ids.has(343) && !newlySelectedFates.has(343) && countFiveElements(previousState.privatePlayer, builder) >= 3) known.maxHp += 1;
  if (previousState && ids.has(99) && !newlySelectedFates.has(99)) {
    const previousDeck = previousState.privatePlayer?.deck ?? [];
    const embryoIndex = previousDeck.findIndex((id) => /Clear Heart Sword Embryo/i.test(builder.catalog.cards[id]?.nameEnglish ?? ""));
    const adjacent = [previousDeck[embryoIndex - 1], previousDeck[embryoIndex + 1]]
      .some((id) => /(?:Cloud Sword|Unrestrained Sword)/i.test(builder.catalog.cards[id]?.nameEnglish ?? ""));
    if (embryoIndex >= 0 && adjacent) { known.cards += 1; known.cultivation -= 1; }
  }
  known.upgrades += previousState ? cardUpgradeEffects(previousState.privatePlayer, state.privatePlayer, builder) : 0;
  const combines = inferredCombines(previousState?.privatePlayer, state.privatePlayer, known.upgrades);
  const ownBefore = previousState?.players?.[previousState?.privatePlayer?.uid];
  const ownAfter = state.players?.[state.privatePlayer?.uid];
  const cultivationDelta = Number(ownAfter?.cultivation ?? 0) - Number(ownBefore?.cultivation ?? 0);
  const normalCultivation = previousState ? 2 : 0;
  const elixirBonus = previousState ? specialCultivationBonus(previousState.privatePlayer, state.privatePlayer, builder) : 0;
  const cultivationActions = Math.max(0, cultivationDelta - normalCultivation - known.cultivation - elixirBonus);
  const inventoryProcessed = round === 1 ? 0 : Math.max(0, priorInventory + normalDrawCount(round) + known.cards - currentInventory);
  const processed = Math.max(combines.count, known.uncertain ? inventoryProcessed : Math.max(inventoryProcessed, cultivationActions));
  const absorbed = Math.max(0, processed - combines.count);
  const startsWithCuriosity = (ownAfter?.talents ?? []).some(entry => Math.abs(Number(entry.id)) % 10000 === 129);
  const previousCuriosity = previousState ? curiosityCount(previousState)
    : startsWithCuriosity ? Number(builder.talentConfigs.get(129)?.otherParams?.[0] ?? 0) : 0;
  const currentCuriosity = curiosityCount(state);
  const curiosityRecharge = previousState && ids.has(95) && outcome?.lost
    && !newFateHistories.some((history) => Number(history.selected) === 95) ? 1 : 0;
  const curiositySpent = Math.max(0, previousCuriosity + curiosityRecharge - currentCuriosity);
  const previousExchanges = Number(previousState?.privatePlayer?.exchangesRemaining ?? 0);
  const currentExchanges = Number(state.privatePlayer?.exchangesRemaining ?? 0);
  const limit = Number(state.privatePlayer?.exchangeLimit ?? 0);
  const conditionalGrant = conditionalExchangeGrant(previousState, state, context.previousSummary, outcome, builder, newFateHistories);
  const rawStart = round === 1 ? normalExchangeGrant(round) + known.exchanges
    : previousExchanges + normalExchangeGrant(round) + known.exchanges + conditionalGrant;
  const start = limit > 0 ? Math.min(limit, rawStart) : rawStart;
  const hasExchangeClick = uses.some((use) => activeFateEffect(use.id, round, builder).exchanges > 0);
  const catTeaserExcluded = context.primaryCareer === 4 || ids.has(66) || ids.has(31) || ids.has(433) || ids.has(353) || hasExchangeClick;
  const catTeasers = curiositySpent > 0 && currentExchanges > 1 && !catTeaserExcluded ? currentExchanges - 1 : 0;
  const freeFirstExchange = (ownAfter?.talents ?? []).some((entry) => Math.abs(Number(entry.id)) % 10000 === 18);
  let exchangesSpent = Math.max(0, start + curiositySpent + catTeasers - currentExchanges);
  if (freeFirstExchange && exchangesSpent > 0) exchangesSpent += 1;
  const fish = fishInference(previousState, state, known, context, builder);
  const username = state.players?.[state.privatePlayer.uid]?.username ?? "Player";
  const caveatEnglish = known.uncertain ? ` Because ${[...new Set(known.reasons)].join(" and ")} was used, these totals are approximate.` : "";
  const caveatChinese = known.uncertain ? ` 因使用了${[...new Set(known.reasons)].join("、")}，以上数量为近似值。` : "";
  const extrasEnglish = `${catTeasers ? `, absorbed ${catTeasers} or more Cat Teasers` : ""}${fish ? `, absorbed ${fish} or more copies of Dried Small Fish` : ""}`;
  const extrasChinese = `${catTeasers ? `，至少吸收了${catTeasers}张逗猫棒` : ""}${fish ? `，至少吸收了${fish}张小鱼干` : ""}`;
  return {
    actorUid: state.privatePlayer.uid, actorUsername: username, kind: "shop",
    textEnglish: `${username} combined about ${combines.count} ${combines.count === 1 ? "time" : "times"}, absorbed about ${absorbed} ${absorbed === 1 ? "card" : "cards"}, spent about ${exchangesSpent} ${exchangesSpent === 1 ? "exchange" : "exchanges"}, and spent ${curiositySpent} Curiosity ${curiositySpent === 1 ? "charge" : "charges"}${extrasEnglish}.${caveatEnglish}`,
    textChinese: `${username}约合成了${combines.count}次，约吸收了${absorbed}张牌，约花费${exchangesSpent}次换牌机会，并花费${curiositySpent}次好奇心机会${extrasChinese}。${caveatChinese}`,
    aggregate: {
      combinedCardsEstimate: combines.count, absorbedCardsEstimate: absorbed, processedCardsEstimate: processed,
      exchangesSpentEstimate: exchangesSpent, curiosityChargesSpent: curiositySpent,
      catTeasersInferred: catTeasers, driedSmallFishInferred: fish, uncertain: known.uncertain,
    },
  };
}

function selectionAction(state, kind, selected, builder) {
  const username = state.players?.[state.privatePlayer.uid]?.username ?? "Player";
  const catalogName = kind === "immortal-fate" ? "talents" : kind === "heavenly-derivation" ? "fateStrategies" : "cards";
  const entry = builder.catalog[catalogName][selected] ?? {};
  const english = entry.nameEnglish || selected;
  const chinese = entry.nameChinese || selected;
  const actionKind = kind === "immortal-fate" ? "immortalFate" : kind === "heavenly-derivation" ? "heavenlyFate" : "daoistRhyme";
  return {
    actorUid: state.privatePlayer.uid, actorUsername: username, kind: actionKind,
    textEnglish: `${username} selected ${english}.`, textChinese: `${username}选择了${chinese}。`,
  };
}

function activeFateUses(previousPrivate, currentPrivate, round, builder) {
  const previousCounters = previousPrivate?.fateStrategyData?.counters ?? {};
  const currentCounters = currentPrivate?.fateStrategyData?.counters ?? {};
  const selected = new Set(hdfHistories(currentPrivate).map((history) => history.selected));
  return [...selected].flatMap((id) => {
    const config = builder.fateConfigs.get(Number(id)) ?? {};
    const prior = Number(previousCounters[id] ?? 0);
    const current = Number(currentCounters[id] ?? 0);
    if (Number(config.category) === 1 && current > prior) return [{ id: Number(id), count: current - prior }];
    if ([2, 8, 9].includes(Number(config.category)) && current === round && current !== prior) return [{ id: Number(id), count: 1 }];
    return [];
  });
}

export function makeTimeline(views, targetView, builder) {
  const steps = [];
  const rounds = targetView.data.roundStats.map((entry) => Number(entry.round));
  let previousState = null;
  let previousFinalState = null;
  let previousPrivateData = null;
  const context = { primaryCareer: 0, lastCareer: 0, careerChanges: [], additionalCareers: [], previousSummary: null };
  const seenTalents = new Set();
  const seenFates = new Set();
  const seenDao = new Set();
  for (const round of rounds) {
    const state = stateForRound(views, targetView, round, builder);
    if (!state.privatePlayer) continue;
    const targetRound = roundForView(targetView, round, true);
    const targetSide = sideForUid(targetRound, targetView.data.uid);
    const privateData = targetSide?.privateData ?? {};
    const currentCareer = Number(targetSide?.publicData?.career ?? 0);
    if (round === 2 && currentCareer) context.primaryCareer = currentCareer;
    if (context.lastCareer && currentCareer && currentCareer !== context.lastCareer) {
      context.careerChanges.push({ career: currentCareer, phase: Number(targetSide?.publicData?.level ?? 0) });
    }
    if (currentCareer) context.lastCareer = currentCareer;
    const talentHistories = mapSelections(privateData, "talentSelectionDatas");
    const fateHistories = hdfHistories(privateData);
    const daoHistories = mapSelections(privateData, "daoYunSelectionDatas");
    context.additionalCareers = [...(state.privatePlayer.additionalCareers ?? [])];
    const newTalents = talentHistories.filter((history) => !seenTalents.has(`${history.roundOrPhase}:${history.selected}`));
    const newFates = fateHistories.filter((history) => !seenFates.has(`${history.roundOrPhase}:${history.selected}`));
    const newDao = daoHistories.filter((history) => !seenDao.has(`${history.roundOrPhase}:${history.selected}`));

    for (const [kind, histories] of [["heavenly-derivation", newFates], ["immortal-fate", newTalents], ["daoist-rhyme", newDao]]) {
      for (const history of histories) {
        const catalogName = kind === "immortal-fate" ? "talents" : kind === "heavenly-derivation" ? "fateStrategies" : "cards";
        history.offers.flat().forEach((id) => builder[`remember${kind === "immortal-fate" ? "Talent" : kind === "heavenly-derivation" ? "Fate" : "Card"}`](id));
        // Selected talent IDs can carry an upgraded level absent from the offers.
        builder[`remember${kind === "immortal-fate" ? "Talent" : kind === "heavenly-derivation" ? "Fate" : "Card"}`](history.selected);
        const overlay = {
          kind, roundOrPhase: history.roundOrPhase,
          rerollsRemaining: 0, rerollsKnown: kind !== "heavenly-derivation",
          options: history.offers.at(-1).map((id) => ({ id })),
        };
        const offerState = structuredClone(state);
        if (kind === "immortal-fate" && Math.abs(Number(history.selected)) % 10000 === 188) {
          const selectedTalent = offerState.players?.[offerState.privatePlayer.uid]?.talents
            ?.find((reference) => Number(reference.id) === Number(history.selected));
          if (selectedTalent) delete selectedTalent.additionalCareer;
        }
        offerState.privatePlayer.choiceOverlay = { ...overlay, selected: null };
        steps.push({ patch: offerState, replaySource: { round, phase: "choice-offer", kind } });
        const choiceState = structuredClone(state);
        choiceState.privatePlayer.choiceOverlay = { ...overlay, selected: history.selected };
        steps.push({
          humanActions: [selectionAction(choiceState, kind, history.selected, builder)],
          patch: choiceState,
          replaySource: { round, phase: "choice-result", kind },
        });
        if (!builder.catalog[catalogName][history.selected]) throw new Error(`missing catalog entry for selection ${history.selected}`);
      }
    }

    const uses = activeFateUses(previousPrivateData, privateData, round, builder);
    for (const use of uses) {
      builder.rememberFate(use.id);
      const info = builder.catalog.fateStrategies[use.id];
      const username = state.players[state.privatePlayer.uid]?.username ?? "Player";
      steps.push({
        humanActions: [{ actorUid: state.privatePlayer.uid, actorUsername: username, kind: "heavenlyFateUse", textEnglish: `${username} used ${info.nameEnglish}${use.count > 1 ? ` ${use.count} times` : ""}.`, textChinese: `${username}使用了${info.nameChinese}${use.count > 1 ? `${use.count}次` : ""}。` }],
        patch: state,
        replaySource: { round, phase: "heavenly-fate-use" },
      });
    }

    const preBattleDestinyChanges = lifeChanges(previousFinalState, state);
    if (preBattleDestinyChanges.length) {
      steps.push({
        humanActions: [destinyAction(preBattleDestinyChanges, "nonBattleDestiny", round)],
        patch: state,
        replaySource: { round, phase: "pre-battle-destiny" },
      });
    }

    const outcome = previousBattleOutcome(targetView, round);
    const summary = shopSummary(previousState, state, newTalents, newFates, uses, context, builder, outcome);
    steps.push({ humanActions: [summary], patch: state, replaySource: { round, phase: "shop" } });
    const battle = battleForRound(views, round, builder);
    const battleChanges = battleDestinyChanges(battle);
    const postBattle = postBattleStateAndNonBattleChanges(views, round, state, builder);
    steps.push({
      humanActions: battleChanges.length ? [destinyAction(battleChanges, "destiny", round)] : [],
      patch: postBattle.battleState,
      battle,
      replaySource: { round, phase: "battle" },
    });
    if (postBattle.changes.length) {
      steps.push({
        humanActions: [destinyAction(postBattle.changes, "nonBattleDestiny", round)],
        patch: postBattle.finalState,
        replaySource: { round, phase: "post-battle-destiny" },
      });
    }
    newTalents.forEach((history) => seenTalents.add(`${history.roundOrPhase}:${history.selected}`));
    newFates.forEach((history) => seenFates.add(`${history.roundOrPhase}:${history.selected}`));
    newDao.forEach((history) => seenDao.add(`${history.roundOrPhase}:${history.selected}`));
    previousState = state;
    previousFinalState = postBattle.finalState;
    previousPrivateData = privateData;
    context.previousSummary = summary;
  }
  return steps;
}

export function selectReplayPerspectives(views, targetView) {
  // AI perspectives can retain a human UID in their top-level metadata.
  // Only use a view as that human's perspective when its battles include them;
  // otherwise a last-wins map can erase the real protagonist's state.
  const ownedRounds = view => (view.data.roundStats ?? []).filter(round =>
    Boolean(sideForUid(round, view.data.uid))).length;
  const targetOwned = ownedRounds(targetView);
  if (!targetOwned || targetOwned !== targetView.data.roundStats.length) {
    throw new Error("scraped replay POV has battle rounds that do not belong to its declared player");
  }
  const byUid = new Map();
  for (const view of views) {
    if (!ownedRounds(view)) continue;
    const prior = byUid.get(view.data.uid);
    if (!prior || ownedRounds(view) > ownedRounds(prior)) byUid.set(view.data.uid, view);
  }
  byUid.set(targetView.data.uid, targetView);
  return [...byUid.values()];
}

export function buildReplaySummaryData(input, options = {}) {
  const resolvedInput = path.resolve(input);
  const configPaths = options.configPaths ?? resolveConfigPaths({ ...options, input: resolvedInput });
  const targetView = replayData(resolvedInput);
  const replayFiles = options.siblingPovs === false ? [resolvedInput] : siblingReplayFiles(resolvedInput);
  const views = replayFiles.map(replayData);
  const uniqueViews = selectReplayPerspectives(views, targetView);
  const builder = createCatalogBuilder(configPaths);
  const targetFirstRound = roundForView(targetView, Number(targetView.data.roundStats[0]?.round), true);
  const targetFirstSide = sideForUid(targetFirstRound, targetView.data.uid);
  const targetUsername = targetFirstSide?.publicData?.username ?? targetView.data.uid;
  const steps = makeTimeline(uniqueViews, targetView, builder);
  const recordingId = `replay-${targetView.data.codeId || path.parse(resolvedInput).name}`;
  const recording = {
    id: recordingId,
    targetUid: targetView.data.uid,
    targetUsername,
    catalog: builder.catalog,
    steps,
  };
  const rating = targetView.data.isDaoXinRank ? targetView.data.beginDaoXinRankScore : targetView.data.beginRankScore;
  const catalogItem = {
    id: recordingId, file: "embedded", label: targetUsername,
    targetUid: targetView.data.uid, targetUsername,
    rounds: Number(targetView.data.roundStats.at(-1)?.round ?? 0),
    startingRating: Number(rating) || 0,
    career: Number(targetView.data.career ?? targetFirstSide?.publicData?.career ?? 0),
    capturedThrough: "",
  };
  return { recording, catalogItem, targetView, views: uniqueViews, builder, configPaths };
}

function inlineScriptJson(value) {
  return JSON.stringify(value).replace(/<\//g, "<\\/").replace(/<!--/g, "<\\!--");
}

function embeddedCareerAssets(recording) {
  const careers = new Set();
  const visit = (value) => {
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    if (!value || typeof value !== "object") return;
    if (Number(value.additionalCareer) > 0) careers.add(Number(value.additionalCareer));
    Object.values(value).forEach(visit);
  };
  visit(recording.steps);
  return Object.fromEntries([...careers].sort((first, second) => first - second).flatMap((career) => {
    const filename = path.join(scriptDirectory, "career-icons", `Icon_Career_${career}.webp`);
    return fs.existsSync(filename)
      ? [[career, `data:image/webp;base64,${fs.readFileSync(filename).toString("base64")}`]]
      : [];
  }));
}

function renderHtmlCore(recording, catalogItem, language) {
  let html = fs.readFileSync(path.join(scriptDirectory, "index.html"), "utf8");
  const wikiRoot = process.env.YXP_WIKI_ROOT || "/home/sharpobject/repos/yxp_wiki";
  const siteCss = firstExisting([
    path.join(scriptDirectory, "wiki-site.css"),
    path.join(wikiRoot, "assets", "site.css"),
  ]);
  const replayCss = firstExisting([
    path.join(scriptDirectory, "replay-browser.css"),
    path.join(wikiRoot, "assets", "recordings", "replay-browser.css"),
  ]);
  const replayJavascript = firstExisting([
    path.join(scriptDirectory, "replay-browser.js"),
    path.join(wikiRoot, "assets", "recordings", "replay-browser.js"),
  ]);
  if (!siteCss || !replayCss || !replayJavascript) throw new Error("recording viewer CSS/JavaScript assets were not found");
  const css = `${fs.readFileSync(siteCss, "utf8")}\n${fs.readFileSync(replayCss, "utf8")}`;
  const javascript = fs.readFileSync(replayJavascript, "utf8");
  html = html
    .replace('<html lang="en">', `<html lang="${language}">`)
    .replace(/<body data-asset-mode="local"(?: data-recording-base="data")?>/, '<body data-asset-mode="wiki">')
    .replace(/\s*<link rel="stylesheet" href="wiki-site\.css">\s*<link rel="stylesheet" href="replay-browser\.css">/, `\n  <base href="https://sharpobject.github.io/yxp_wiki/${language}/recordings/">\n  <style>${css}</style>`)
    .replaceAll("Match recording archive", "Replay summary")
    .replaceAll("Match recordings", "Replay summary")
    .replace("Browse a recorded player’s actions and the prior-round information available about the rest of the lobby.", "Important choices, per-round shop summaries, and battle results from one replay.")
    .replace(/\s*<script src="(?:data\/catalog\.js|recording-codec\.js)"><\/script>\s*<script src="replay-browser\.js"><\/script>/,
      `\n  <script>window.RECORDING_CATALOG=${inlineScriptJson([catalogItem])};window.RECORDING_CAREER_ASSETS=${inlineScriptJson(embeddedCareerAssets(recording))};window.EMBEDDED_REPLAY_RECORDING=${inlineScriptJson(recording)};</script>\n  <script>${javascript.replace(/<\//g, "<\\/")}</script>`);
  if (language === "zh") {
    for (const [english, chinese] of [
      ["Replay summary - Yi Xian Card Gallery", "回放摘要 - 弈仙牌卡牌图鉴"], [">Characters<", ">角色<"],
      [">Yi Xian Card Gallery</a>", ">弈仙牌卡牌图鉴</a>"], [">Cards<", ">卡牌<"], [">Sigils<", ">天机符<"], [">Fates<", ">仙命<"],
      [">Recordings<", ">录像<"], ["<p class=\"eyebrow\">Replay summary</p>", "<p class=\"eyebrow\">回放摘要</p>"],
      ["<h1>Replay summary</h1>", "<h1>回放摘要</h1>"],
      ["Important choices, per-round shop summaries, and battle results from one replay.", "单局回放中的重要选择、每轮商店摘要与战斗结果。"],
      [">Recording\n", ">录像\n"], ["aria-label=\"Choose a recording\"", "aria-label=\"选择录像\""],
      ["aria-label=\"Previous action\"", "aria-label=\"上一步\""], ["aria-label=\"Next action\"", "aria-label=\"下一步\""],
      ["aria-label=\"Recording timeline\"", "aria-label=\"录像时间线\""], ["aria-label=\"Jump to round\"", "aria-label=\"跳转到轮次\""],
      ["Loading recording…", "正在载入录像…"], [">At this point<", ">此时<"], [">Recent actions<", ">最近操作<"],
      ['<a class="lang" href="#">中文</a>', '<a class="lang" href="#">English</a>'],
    ]) html = html.replaceAll(english, chinese);
    html = html.replaceAll("https://sharpobject.github.io/yxp_wiki/en/", "https://sharpobject.github.io/yxp_wiki/zh/");
  }
  html = html.replace(/\s*<header>[\s\S]*?<\/header>/,
    `\n  <button id="standalone-language-switch" class="standalone-language-switch" type="button">${language === "zh" ? "English" : "中文"}</button>`);
  html = html.replace("</style>", `.standalone-language-switch{position:fixed;z-index:250;right:12px;top:10px;border:1px solid var(--line);border-radius:7px;background:#111713;color:var(--ink);padding:6px 9px;font:inherit;cursor:pointer}.standalone-language-switch:hover{border-color:var(--accent)}\n</style>`);
  return html;
}

function renderHtml(recording, catalogItem, language) {
  const storageKey = `yxp-replay-summary:${recording.id}:languages`;
  const bootstrap = `(()=>{const button=document.getElementById("standalone-language-switch");if(!button)return;button.addEventListener("click",()=>{const documents=JSON.parse(sessionStorage.getItem(${JSON.stringify(storageKey)})||"{}");const next=document.documentElement.lang.toLowerCase().startsWith("zh")?"en":"zh";if(!documents[next])return;document.open();document.write(documents[next]);document.close()})})()`;
  const documents = Object.fromEntries(["en", "zh"].map((documentLanguage) => {
    const core = renderHtmlCore(recording, catalogItem, documentLanguage);
    return [documentLanguage, core.replace("</body>", `<script>${bootstrap}<\/script>\n</body>`)];
  }));
  const setup = `<script>sessionStorage.setItem(${JSON.stringify(storageKey)},${inlineScriptJson(JSON.stringify(documents))});<\/script>`;
  return documents[language].replace("</body>", `${setup}\n</body>`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const options = parseArguments(process.argv.slice(2));
  const { recording, catalogItem, targetView, views, configPaths } = buildReplaySummaryData(options.input, options);
  fs.mkdirSync(path.dirname(options.output), { recursive: true });
  const html = renderHtml(recording, catalogItem, options.language);
  if (/<link[^>]+rel=["']?stylesheet|<script[^>]+src=/i.test(html)) {
    throw new Error("standalone summary unexpectedly references external CSS or JavaScript");
  }
  fs.writeFileSync(options.output, html);
  console.log(JSON.stringify({
    input: options.input, output: options.output, targetUid: targetView.data.uid,
    targetUsername: recording.targetUsername, povFiles: views.length,
    rounds: targetView.data.roundStats.length, steps: recording.steps.length, configs: configPaths,
  }, null, 2));
}
