#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { decodeDataFrame } from "../proxy/colyseus.mjs";
import { decodeFields } from "../proxy/protocol.mjs";

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
const cliArgs = isMain ? process.argv.slice(2) : [];
const roomCaptureMode = cliArgs[0] === "--room-capture";
const [journalPath, targetUid, outputPath] = roomCaptureMode ? [] : cliArgs;
if (isMain && !roomCaptureMode && (!journalPath || !targetUid)) {
  throw new Error("usage: decode_live_observation.mjs JOURNAL TARGET_UID [OUTPUT.md]");
}

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
function latestSteamDump() {
  const roots = [root, path.join(root, "extracted_assets"), path.join(root, "scrape", "extracted_assets")];
  return roots.flatMap((candidateRoot) => {
    if (!fs.existsSync(candidateRoot)) return [];
    return fs.readdirSync(candidateRoot, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && entry.name.startsWith("steam_"))
      .map((entry) => path.join(candidateRoot, entry.name))
      .filter((candidate) => fs.existsSync(path.join(candidate, "protobuf", "CardConfig.json")));
  }).sort((first, second) => path.basename(first).localeCompare(path.basename(second))).at(-1);
}

export const steamDumpPath = process.env.YXP_STEAM_DUMP
  ? path.resolve(process.env.YXP_STEAM_DUMP)
  : latestSteamDump() ?? path.join(root, "steam_20260716_build_24217566_depot_2190558891733490589");
const dump = steamDumpPath;
const cards = new Map(JSON.parse(fs.readFileSync(path.join(dump, "protobuf/CardConfig.json"), "utf8"))
  .map((card) => [card.id, card]));
const localization = JSON.parse(fs.readFileSync(path.join(dump, "localization.json"), "utf8"));
const englishByChinese = new Map(Object.values(localization.terms)
  .filter((term) => term && typeof term === "object" && term["zh-CN"])
  .map((term) => [term["zh-CN"], term.en]));

function rawConfigMap(filename, { idField = 1, nameField = 3 } = {}) {
  const rows = JSON.parse(fs.readFileSync(path.join(dump, "protobuf_raw_json", filename), "utf8"));
  const result = new Map();
  for (const outer of rows) {
    if (outer.field !== 2 || !Array.isArray(outer.value)) continue;
    const id = outer.value.find((field) => field.field === idField)?.value;
    const name = outer.value.find((field) => field.field === nameField)?.value;
    if (Number.isInteger(id) && typeof name === "string") result.set(id, name);
  }
  return result;
}

const talents = rawConfigMap("TalentConfig.raw.json");
const characters = rawConfigMap("CharacterConfig.raw.json", { idField: 1, nameField: 2 });

export function characterInfo(id) {
  const nameChinese = characters.get(Number(id)) ?? "";
  return {
    id: Number(id),
    nameChinese,
    nameEnglish: englishByChinese.get(nameChinese) ?? nameChinese,
  };
}

function rawConfigRows(filename) {
  return JSON.parse(fs.readFileSync(path.join(dump, "protobuf_raw_json", filename), "utf8"))
    .filter((outer) => outer.field === 2 && Array.isArray(outer.value));
}

function rawFieldBytes(field) {
  if (!field) return Buffer.alloc(0);
  if (field.value_base64ish_hex) return Buffer.from(field.value_base64ish_hex, "hex");
  if (typeof field.value === "string") return Buffer.from(field.value, "latin1");
  if (!Array.isArray(field.value)) return Buffer.alloc(0);
  const bytes = [];
  const writeVarint = (input) => {
    let value = Number(input) >>> 0;
    while (value >= 0x80) {
      bytes.push((value & 0x7f) | 0x80);
      value >>>= 7;
    }
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

const talentConfigs = new Map(rawConfigRows("TalentConfig.raw.json").map((outer) => {
  const get = (field, fallback = 0) => outer.value.find((entry) => entry.field === field)?.value ?? fallback;
  const id = get(1);
  const paramsField = outer.value.find((entry) => entry.field === 100);
  return [id, {
    id,
    iconId: get(2) || id,
    level: get(6),
    otherParams: packedRawField(paramsField),
  }];
}));

const keYinCardConfigs = new Map(rawConfigRows("KeYinCardConfig.raw.json").map((outer) => {
  const get = (field, fallback = 0) => outer.value.find((entry) => entry.field === field)?.value ?? fallback;
  const id = get(1);
  const paramsField = outer.value.find((entry) => entry.field === 100);
  return [id, { id, otherParams: packedRawField(paramsField) }];
}));

const fateStrategyCategories = [
  "normal", "counted active", "cooldown active", "fusion", "fate", "round card",
  "card-pool addition", "dao rhyme", "Ji card", "switch", "multi card-pool addition",
];
const fateStrategyConfigs = new Map(rawConfigRows("FateStrategyConfig.raw.json").map((outer) => {
  const get = (field, fallback = 0) => outer.value.find((entry) => entry.field === field)?.value ?? fallback;
  const id = get(1);
  return [id, { id, category: get(2), countParam: get(8) }];
}));

export function fateStrategyInfo(id, round = 0, counters = {}, tempData = {}) {
  const config = fateStrategyConfigs.get(id) ?? { id, category: 0, countParam: 0 };
  const term = localization.terms[`FateStrategyName_${id}`] ?? {};
  const info = {
    id,
    nameEnglish: term.en || `Fate Strategy ${id}`,
    nameChinese: term["zh-CN"] || "",
    category: fateStrategyCategories[config.category] ?? `category ${config.category}`,
  };
  const usedOrLastRound = Number(counters[id] ?? 0);
  if (config.category === 1) {
    info.runtime = { kind: "charges", value: Math.max(0, config.countParam - usedOrLastRound) };
  } else if ([2, 8, 9].includes(config.category)) {
    const readyRound = usedOrLastRound > 0 ? usedOrLastRound + config.countParam : 0;
    info.runtime = { kind: "cooldown", value: Math.max(0, readyRound - round) };
    if (config.category === 9) info.locked = Number(tempData[id] ?? 0) === 1;
  }
  return info;
}

function signed32(value) {
  return Number(BigInt.asIntN(32, BigInt(value ?? 0)));
}

function value(fields, number) {
  return fields.find((field) => field.number === number)?.value;
}

function values(fields, number) {
  return fields.filter((field) => field.number === number).map((field) => field.value);
}

function textValue(fields, number) {
  return value(fields, number)?.toString("utf8") ?? "";
}

function intValue(fields, number) {
  return signed32(value(fields, number));
}

function readPackedInt32(bytes) {
  const result = [];
  let offset = 0;
  while (offset < bytes.length) {
    let number = 0n;
    let shift = 0n;
    for (;;) {
      if (offset >= bytes.length) throw new Error("truncated packed varint");
      const byte = bytes[offset++];
      number |= BigInt(byte & 0x7f) << shift;
      if ((byte & 0x80) === 0) break;
      shift += 7n;
    }
    result.push(Number(BigInt.asIntN(32, number)));
  }
  return result;
}

function packed(fields, number) {
  const bytes = value(fields, number);
  return bytes ? readPackedInt32(bytes) : [];
}

function cardRank(id) {
  return Math.floor((Math.abs(id) % 100000) / 10000) + 1;
}

export function cardLabel(id) {
  const card = cards.get(id);
  if (!card) return `${id} (unknown card)`;
  const term = localization.terms[`CardName_${id}`] ?? {};
  const chinese = String(term["zh-CN"] || card.name).trim();
  const english = String(term.en || englishByChinese.get(card.name) || "").trim();
  const names = english && english !== chinese ? `${english} / ${chinese}` : chinese;
  return `${id} (${names}, upgrade ${cardRank(id)}, phase ${card.level})`;
}

export function cardConfigInfo(id) {
  return cards.get(Number(id)) ?? null;
}

export function switchCardForHand(id) {
  const config = cardConfigInfo(id);
  return config?.subcategory === 7 && Number(config.linkageId) > 0 ? Number(config.linkageId) : Number(id);
}

export function cardCanUpgrade(id) {
  return cards.get(id)?.noUpgrade !== true;
}

export function talentInfo(id) {
  const chinese = talents.get(id);
  const config = talentConfigs.get(id) ?? { iconId: id, level: 0, otherParams: [] };
  const iconId = config.iconId;
  const descriptionTerm = localization.terms[`TalentDesc_${id}`] ?? {};
  const fill = (text = "") => text.replace(/\{otherParams\[(\d+)\]\}/g, (_match, index) => config.otherParams[Number(index)] ?? "?");
  const descriptions = {
    descriptionEnglish: fill(descriptionTerm.en),
    descriptionChinese: fill(descriptionTerm["zh-CN"]),
  };
  if (!chinese) return { id, iconId, level: config.level, otherParams: config.otherParams, nameEnglish: `Fate ${id}`, nameChinese: "", ...descriptions };
  const english = englishByChinese.get(chinese);
  return { id, iconId, level: config.level, otherParams: config.otherParams, nameEnglish: english || chinese, nameChinese: chinese, ...descriptions };
}

export function keYinCardInfo(id) {
  return keYinCardConfigs.get(Number(id)) ?? { id: Number(id), otherParams: [] };
}

export function talentLabel(id) {
  const info = talentInfo(id);
  return `${id} (${info.nameEnglish}${info.nameChinese && info.nameChinese !== info.nameEnglish ? ` / ${info.nameChinese}` : ""})`;
}

function mapIntInt(bytes) {
  const fields = decodeFields(bytes);
  return [intValue(fields, 1), intValue(fields, 2)];
}

function decodeBattleTalentData(bytes) {
  const fields = decodeFields(bytes);
  return { commonParams: packed(fields, 1) };
}

function mapIntBattleTalentData(bytes) {
  const fields = decodeFields(bytes);
  return [intValue(fields, 1), value(fields, 2) ? decodeBattleTalentData(value(fields, 2)) : { commonParams: [] }];
}

function decodeSelection(bytes) {
  const fields = decodeFields(bytes);
  return {
    id: intValue(fields, 1),
    pending: packed(fields, 2),
    selected: intValue(fields, 3),
  };
}

function decodeCardSelectionGroup(bytes) {
  const fields = decodeFields(bytes);
  return {
    cardIds: packed(fields, 1),
    type: intValue(fields, 2),
  };
}

function decodeCardSelectionData(bytes) {
  const fields = decodeFields(bytes);
  return {
    selected: intValue(fields, 2),
    group: value(fields, 4) ? decodeCardSelectionGroup(value(fields, 4)) : null,
    pendingGroups: values(fields, 5).map(decodeCardSelectionGroup),
  };
}

function decodeFateStrategyData(bytes) {
  const fields = decodeFields(bytes);
  return {
    strategies: values(fields, 1).map(decodeSelection),
    counters: Object.fromEntries(values(fields, 2).map(mapIntInt)),
    tempData: Object.fromEntries(values(fields, 3).map(mapIntInt)),
    banned: packed(fields, 4),
  };
}

function decodePrivateData(bytes) {
  const fields = decodeFields(bytes);
  return {
    uid: textValue(fields, 200),
    hand: packed(fields, 1),
    deck: packed(fields, 2),
    unlockedDeckSlots: intValue(fields, 3),
    exchangesRemaining: intValue(fields, 4),
    exchangeLimit: intValue(fields, 5),
    qiYun: intValue(fields, 6),
    fateBranchRawHex: value(fields, 8)?.toString("hex") ?? "",
    talentData: Object.fromEntries(values(fields, 10).map(mapIntBattleTalentData)),
    cardSelectionData: value(fields, 17) ? decodeCardSelectionData(value(fields, 17)) : null,
    fateStrategies: value(fields, 19) ? decodeFateStrategyData(value(fields, 19)) : null,
    field100: value(fields, 100) === undefined ? null : intValue(fields, 100),
    talentSelections: values(fields, 101).map(decodeSelection),
    daoYunSelections: values(fields, 102).map(decodeSelection),
    unknownLengthDelimitedFields: fields
      .filter((field) => field.wire === 2 && ![1, 2, 8, 17, 19, 101, 102, 200].includes(field.number))
      .map((field) => ({ field: field.number, hex: field.value.toString("hex") })),
  };
}

const levels = ["invalid", "Qi Refining", "Foundation", "Virtuoso", "Immortality", "Incarnation", "Void Return"];
const sects = ["invalid", "Cloud Spirit Sword Sect", "Heptastar Pavilion", "Five Elements Alliance", "Duan Xuan Sect"];
const careers = ["none", "Elixirist", "Fuluist", "Musician", "Painter", "Formation Master", "Plant Master", "Fortune Teller"];

function decodePublicData(bytes) {
  const fields = decodeFields(bytes);
  const characterId = intValue(fields, 12);
  const publicData = {
    uid: textValue(fields, 1),
    username: textValue(fields, 2),
    life: intValue(fields, 3),
    extraMaxHp: intValue(fields, 4),
    cultivation: intValue(fields, 5),
    phase: `${intValue(fields, 6)} (${levels[intValue(fields, 6)] ?? "unknown"})`,
    sect: `${intValue(fields, 7)} (${sects[intValue(fields, 7)] ?? "unknown"})`,
    career: `${intValue(fields, 8)} (${careers[intValue(fields, 8)] ?? "unknown"})`,
    nextOpponent: textValue(fields, 9),
    previousOpponent: textValue(fields, 10),
    mirror: Boolean(intValue(fields, 11)),
    characterId,
    character: characters.get(characterId) ?? "unknown",
    talents: packed(fields, 13),
    talentCounters: Object.fromEntries(values(fields, 14).map(mapIntInt)),
    rank: intValue(fields, 15),
    ai: Boolean(intValue(fields, 16)),
    exchangesRemainingPublic: intValue(fields, 18),
    wins: intValue(fields, 19),
    losses: intValue(fields, 20),
    realtimeSpectatorUids: values(fields, 23).map((bytes2) => bytes2.toString("utf8")),
    skinNumber: intValue(fields, 101),
    skinColor: intValue(fields, 108),
    settled: Boolean(intValue(fields, 1001)),
  };
  const lastRound = value(fields, 200);
  if (lastRound) {
    const lastFields = decodeFields(lastRound);
    publicData.lastRound = {
      life: intValue(lastFields, 1),
      extraMaxHp: intValue(lastFields, 2),
      cultivation: intValue(lastFields, 3),
      phase: intValue(lastFields, 4),
      talents: packed(lastFields, 5),
      deck: packed(lastFields, 6),
      hand: packed(lastFields, 7),
      talentCounters: Object.fromEntries(values(lastFields, 8).map(mapIntInt)),
      permanentBuffCounters: Object.fromEntries(values(lastFields, 9).map(mapIntInt)),
      unlockedDeckSlots: intValue(lastFields, 10),
      usedKeYinCards: packed(lastFields, 15),
      fateStrategies: packed(lastFields, 16),
    };
  }
  return publicData;
}

function decodePlayerData(bytes) {
  const fields = decodeFields(bytes);
  return {
    public: value(fields, 1) ? decodePublicData(value(fields, 1)) : null,
    private: value(fields, 2) ? decodePrivateData(value(fields, 2)) : null,
  };
}

function decodeGameStatus(bytes) {
  const fields = decodeFields(bytes);
  return {
    round: intValue(fields, 1),
    timer: intValue(fields, 2),
    ended: Boolean(intValue(fields, 3)),
    gameMode: intValue(fields, 4),
    publicPlayers: values(fields, 5).map(decodePublicData),
    observedPrivatePlayer: value(fields, 6) ? decodePrivateData(value(fields, 6)) : null,
    mainViewUid: textValue(fields, 9),
    subMode: intValue(fields, 11),
    seasonMechanic: intValue(fields, 16),
    beginTs: Number(value(fields, 100) ?? 0),
    endTs: Number(value(fields, 101) ?? 0),
    codeId: Number(value(fields, 102) ?? 0),
  };
}

function decodeBattleResult(bytes) {
  const fields = decodeFields(bytes);
  return {
    p1: value(fields, 1) ? decodePlayerData(value(fields, 1)) : null,
    p2: value(fields, 2) ? decodePlayerData(value(fields, 2)) : null,
    battleParams: packed(fields, 3),
    actionCount: intValue(fields, 4),
    hpDelta: intValue(fields, 5),
    destinyDamage: intValue(fields, 6),
    round: intValue(fields, 7),
    firstPlayerUid: textValue(fields, 8),
    winnerUid: textValue(fields, 9),
    battleTime: intValue(fields, 10),
    homePlayerUid: textValue(fields, 11),
    battleScene: intValue(fields, 12),
    battleSubScene: intValue(fields, 13),
    battleScroller: intValue(fields, 14),
    scrollerOrnament: intValue(fields, 15),
    gameMode: intValue(fields, 16),
    subMode: intValue(fields, 17),
    seasonMechanic: intValue(fields, 18),
    mainViewUid: textValue(fields, 20),
    logs: values(fields, 24).map((entry) => entry.toString("utf8")),
  };
}

function decodeLifeRank(bytes) {
  const fields = decodeFields(bytes);
  return {
    players: values(fields, 1).map((entry) => {
      const item = decodeFields(entry);
      return { uid: textValue(item, 1), life: intValue(item, 2), rank: intValue(item, 3) };
    }),
    settledUid: textValue(fields, 2),
    effectId: intValue(fields, 3),
  };
}

export function decodeMessage(type, bytes) {
  const fields = bytes.length ? decodeFields(bytes) : [];
  if (type === "GameStatus") return decodeGameStatus(bytes);
  if (type === "PlayerData") return decodePlayerData(bytes);
  if (type === "BattleResult") return decodeBattleResult(bytes);
  if (type === "LifeRankStatus") return decodeLifeRank(bytes);
  if (type === "CardSelectedReq") return { id: intValue(fields, 1) };
  if (type === "MoveCardReq") return {
    sourcePosition: intValue(fields, 1),
    sourceIndex: intValue(fields, 2),
    destinationPosition: intValue(fields, 3),
    destinationIndex: intValue(fields, 4),
  };
  if (type === "InsertCardReq") return {
    sourcePosition: intValue(fields, 1),
    sourceIndex: intValue(fields, 2),
    destinationIndex: intValue(fields, 3),
    insertionDirection: intValue(fields, 4),
  };
  if (type === "ReplaceCardResp") {
    const results = ["ClientFailed", "Succeed", "NoCard", "ChanceShortage", "CardOrderError"];
    const result = intValue(fields, 1);
    return {
      result: `${result} (${results[result] ?? "unknown"})`,
      newCard: value(fields, 2) ? decodeCardInfoHuman(value(fields, 2)) : null,
      targetCard: value(fields, 3) ? decodeCardInfoHuman(value(fields, 3)) : null,
    };
  }
  if (type === "RefineCardResp") return {
    result: Boolean(intValue(fields, 1)),
    resultingCards: values(fields, 2).map((entry) => {
      const card = decodeCardInfoHuman(entry);
      if (String(card.id).startsWith("0 ")) card.id = "0 (omitted; upgrade the card currently at this position)";
      return card;
    }),
    targetCard: value(fields, 3) ? decodeCardInfoHuman(value(fields, 3)) : null,
  };
  if (type === "SimpleClientPact") {
    const names = [
      "GiveUpReq", "QueryGameOverReq", "PendingTalentReq", "GameStatusReq",
      "SettleResultReq", "SelectTalentReq", "SelfInfoReq", "PlayerPreReadyReq",
      "SaveGuideStepReq", "SelectDaoYunReq", "PendingDaoYunReq", "RogueOptionReq",
      "BattleResultReq", "BattleRecoveryReq", "ReviewCanJuReq", "VersusFoldReq",
      "VersusBetReq", "SwapOpponentReq", "BuyXXMFProductReq", "TowerRecvCardReq",
      "ArchiveReq", "CanJuLikeReq", "LanKeAnswerReq", "LanKeDePuzzleReq",
      "ReviewSwitchReq", "ReviewDealCardReq", "SelectFateBranchReq",
      "FuZhiJianXiuSelectCareer", "LanKeUsePropReq", "LanKeSettleReq",
      "TA13StartReq", "TA13EndReq", "GameDataProjectionReq",
      "SelectResonanceTalentReq", "RefreshResonanceTalentReq", "TA18BuyProductReq",
      "TA18LockProductReq", "TA18RefreshProductReq", "RefreshSingleResonanceTalentReq",
      "TA21RecvCardReq", "SwitchLevelReq", "SelectNoviceCharacter", "TA27ShootReq",
      "DelayedSpectatingDataReq", "DreamFusionReq", "LanKeRetryReq",
      "SelectFateStrategyReq", "UseFateStrategyReq", "RefreshSingleFateStrategyReq",
    ];
    names[100] = "StartGameReq";
    names[101] = "MatchPlayerInfosReq";
    const pactType = intValue(fields, 1);
    return {
      type: `${pactType} (${names[pactType] ?? "unknown"})`,
      param: intValue(fields, 2),
      otherParams: packed(fields, 3),
    };
  }
  if (type === "SpectateReq") return { targetUid: textValue(fields, 1) };
  if (type === "BattleEmojiResp") return {
    emojiId: intValue(fields, 1),
    isReady: Boolean(intValue(fields, 2)),
    fromPlayerUid: textValue(fields, 3),
  };
  if (type === "PlayerPreReadyResp") return { acknowledged: true };
  if (type === "RealtimeSpectateReq") return {
    senderUid: textValue(fields, 1), targetUid: textValue(fields, 2), senderUsername: textValue(fields, 3),
  };
  if (type === "RealtimeSpectateResp") return {
    senderUid: textValue(fields, 1), targetUid: textValue(fields, 2), result: intValue(fields, 3),
  };
  return { fields: fields.map((field) => field.wire === 0
    ? { field: field.number, integer: signed32(field.value) }
    : { field: field.number, bytes: field.value.length, hex: field.value.toString("hex") }) };
}

function decodeCardInfoHuman(bytes) {
  const fields = decodeFields(bytes);
  const positions = ["hand", "used/deck", "relic 1", "relic 2", "relic 3", "relic 5", "talent 199", "YuanGu furnace", "YuanGu star map", "Dream cultivation store"];
  const position = intValue(fields, 1);
  const id = intValue(fields, 3);
  return {
    position: `${position} (${positions[position] ?? "unknown"})`,
    index: intValue(fields, 2),
    id: cardLabel(id),
  };
}

export function decorateCards(value2, key = "") {
  if (Array.isArray(value2)) {
    if (key === "deck") return value2.map((id) => id === 0 ? "0 (empty slot)" : cardLabel(id));
    if (key === "hand") return value2.map(cardLabel);
    if (key === "talents") return value2.map(talentLabel);
    return value2.map((item) => decorateCards(item));
  }
  if (!value2 || typeof value2 !== "object") return value2;
  return Object.fromEntries(Object.entries(value2).map(([childKey, child]) => [childKey, decorateCards(child, childKey)]));
}

function decodeProxyJournal(journalPath2, targetUid2, outputPath2) {
const allEvents = fs.readFileSync(journalPath2, "utf8").trim().split("\n").map(JSON.parse)
  .filter((event) => event.event === "websocket_message" && event.payloadBase64);
const starts = [];
const lastRequestedTarget = new Map();
for (let index = 0; index < allEvents.length; index += 1) {
  const event = allEvents[index];
  if (event.leg !== "client->proxy") continue;
  try {
    const frame = decodeDataFrame(Buffer.from(event.payloadBase64, "base64"));
    if (frame?.type !== "RealtimeSpectateReq") continue;
    const decoded = decodeMessage(frame.type, frame.protobuf);
    const previous = lastRequestedTarget.get(event.logicalConnectionId);
    if (decoded.targetUid === targetUid2 && previous !== targetUid2) {
      starts.push({ index, logicalConnectionId: event.logicalConnectionId });
    }
    lastRequestedTarget.set(event.logicalConnectionId, decoded.targetUid);
  } catch {}
}
if (starts.length === 0) throw new Error(`no RealtimeSpectateReq found for ${targetUid2}`);

const intervals = starts.map(({ index: startIndex, logicalConnectionId }) => {
  const selected = [];
  for (let index = startIndex; index < allEvents.length; index += 1) {
    const event = allEvents[index];
    if (event.logicalConnectionId !== logicalConnectionId) continue;
    let frame;
    try {
      frame = decodeDataFrame(Buffer.from(event.payloadBase64, "base64"));
    } catch {
      continue;
    }
    if (!frame) continue;
    if (index > startIndex && event.leg === "client->proxy" && frame.type === "RealtimeSpectateReq") {
      const next = decodeMessage(frame.type, frame.protobuf);
      if (next.targetUid !== targetUid2) break;
    }
    if (!["client->proxy", "server->proxy"].includes(event.leg)) continue;
    selected.push({ event, frame, decoded: decorateCards(decodeMessage(frame.type, frame.protobuf)) });
  }
  return { logicalConnectionId, selected };
});

const lines = [];
const push = (...parts) => lines.push(...parts);
const selectedCount = intervals.reduce((sum, interval) => sum + interval.selected.length, 0);
push("# Live observation transcript", "",
  `- Target UID: \`${targetUid2}\``,
  `- Journal: \`${path.basename(journalPath2)}\``,
  `- Observation intervals: ${intervals.length}`,
  `- Messages shown: ${selectedCount} (one copy per network direction; proxy-forwarding duplicates omitted)`,
  "- Every entry includes the complete original protobuf payload as hexadecimal, so fields not understood by this client schema remain recoverable.", "");

for (let intervalIndex = 0; intervalIndex < intervals.length; intervalIndex += 1) {
  const { logicalConnectionId, selected } = intervals[intervalIndex];
  const start = selected[0];
  const end = selected.at(-1);
  push(`## Observation interval ${intervalIndex + 1}`, "",
    `- Logical room connection: \`${logicalConnectionId}\``,
    `- Time: ${start.event.observedAt} through ${end.event.observedAt}`,
    `- Messages: ${selected.length}`, "");
  for (const { event, frame, decoded } of selected) {
    const direction = event.leg === "client->proxy" ? "client → server" : "server → client";
    push(`### ${event.observedAt} — ${direction} — ${frame.type}`, "", "```json",
      JSON.stringify(decoded, null, 2), "```", "", `Raw protobuf (${frame.protobuf.length} bytes):`, "", "```text",
      frame.protobuf.toString("hex") || "(empty)", "```", "");
  }
}

const report = `${lines.join("\n")}\n`;
if (outputPath2) fs.writeFileSync(outputPath2, report);
else process.stdout.write(report);
}

function colyseusOpcode(frame) {
  const names = {
    10: "JOIN_ROOM", 11: "ERROR", 12: "LEAVE_ROOM", 13: "ROOM_DATA",
    14: "ROOM_STATE", 15: "ROOM_STATE_PATCH", 16: "ROOM_DATA_SCHEMA",
  };
  return frame.length ? `${frame[0]} (${names[frame[0]] ?? "unknown"})` : "empty frame";
}

function decodeRoomCapture(inputPath, roomOutputPath) {
  const events = fs.readFileSync(inputPath, "utf8").trim().split("\n").filter(Boolean).map(JSON.parse);
  const messageCounts = new Map();
  for (const event of events) {
    if (event.messageType) messageCounts.set(event.messageType, (messageCounts.get(event.messageType) ?? 0) + 1);
  }
  const lines = [
    "# Live room capture transcript", "",
    `- Source: \`${path.basename(inputPath)}\``,
    `- Events: ${events.length}`,
    `- Sequence: ${events[0]?.sequence ?? "?"} through ${events.at(-1)?.sequence ?? "?"}`,
    `- Time: ${events[0]?.observedAt ?? "?"} through ${events.at(-1)?.observedAt ?? "?"}`,
    `- Message counts: ${[...messageCounts].map(([name, count]) => `${name}=${count}`).join(", ")}`,
    "- Events are in capture order. Decoded objects are followed by the complete original bytes, so unrecognized fields remain recoverable.", "",
  ];
  for (const event of events) {
    const titleParts = [`#${event.sequence}`, event.observedAt, event.event];
    if (event.direction) titleParts.push(event.direction);
    if (event.messageType) titleParts.push(event.messageType);
    lines.push(`## ${titleParts.join(" — ")}`, "");
    if (event.event !== "websocket_frame") {
      const metadata = { ...event };
      delete metadata.sequence;
      delete metadata.observedAt;
      delete metadata.monotonicNs;
      delete metadata.event;
      lines.push("```json", JSON.stringify(metadata, null, 2), "```", "");
      continue;
    }
    const frame = Buffer.from(event.rawBase64 ?? "", "base64");
    lines.push(`- Frame length: ${event.bytes ?? frame.length} bytes`);
    if (!event.messageType) {
      lines.push(`- Colyseus opcode: ${colyseusOpcode(frame)}`, "");
    } else {
      const protobuf = Buffer.from(event.protobufBase64 ?? "", "base64");
      let decoded;
      try {
        decoded = decorateCards(decodeMessage(event.messageType, protobuf));
      } catch (error) {
        decoded = { decodeError: String(error) };
      }
      lines.push("", "Decoded protobuf:", "", "```json", JSON.stringify(decoded, null, 2), "```", "",
        `Raw protobuf (${protobuf.length} bytes, hex):`, "", "```text", protobuf.toString("hex") || "(empty)", "```", "");
    }
    lines.push("Raw WebSocket frame (base64):", "", "```text", event.rawBase64 ?? "", "```", "");
  }
  fs.writeFileSync(roomOutputPath, `${lines.join("\n")}\n`);
}

if (isMain && roomCaptureMode) {
  const [, inputPath, roomOutputPath] = cliArgs;
  if (!inputPath || !roomOutputPath) {
    throw new Error("usage: decode_live_observation.mjs --room-capture INPUT.jsonl OUTPUT.md");
  }
  decodeRoomCapture(inputPath, roomOutputPath);
} else if (isMain) {
  decodeProxyJournal(journalPath, targetUid, outputPath);
}
