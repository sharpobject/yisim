import assert from "node:assert/strict";

export const CardPosition = Object.freeze({ Hand: 0, Used: 1 });
export const ReplaceCardResult = Object.freeze({
  ClientFailed: 0,
  Succeed: 1,
  NoCard: 2,
  ChanceShortage: 3,
  CardOrderError: 4,
});
export const CLEAR_HEART_SWORD_EMBRYO = 19;
export const BN_UPGRADE_CARDS = 101;
export const BN_GOT_CARDS = 102;
export const BN_SYNC_GAME_STATUS = 103;
export const BN_CHANGE_CARDS = 104;
export const BN_REPLACE_CARD_CHANCE = 6;

function varint(value) {
  assert(Number.isSafeInteger(value) && value >= 0, "non-negative safe integer required");
  const bytes = [];
  do {
    let byte = value & 0x7f;
    value = Math.floor(value / 128);
    if (value) byte |= 0x80;
    bytes.push(byte);
  } while (value);
  return Buffer.from(bytes);
}

function fieldVarint(number, value, { omitZero = true } = {}) {
  if (omitZero && value === 0) return Buffer.alloc(0);
  return Buffer.concat([varint(number << 3), varint(value)]);
}

function fieldBytes(number, bytes) {
  return Buffer.concat([varint((number << 3) | 2), varint(bytes.length), bytes]);
}

function concat(parts) {
  return Buffer.concat(parts.filter((part) => part.length));
}

export function encodeSimpleClientPact({
  type = 0,
  param = 0,
  otherParams = [],
} = {}) {
  const packedOtherParams = concat(otherParams.map((value) => varint(value)));
  return concat([
    fieldVarint(1, type),
    param < 0
      ? Buffer.concat([varint(2 << 3), int32Varint(param)])
      : fieldVarint(2, param),
    packedOtherParams.length
      ? fieldBytes(3, packedOtherParams)
      : Buffer.alloc(0),
  ]);
}

export function encodeModifyJudgeReq({ uid = "", isJudge = false } = {}) {
  return concat([
    uid ? fieldBytes(1, Buffer.from(uid, "utf8")) : Buffer.alloc(0),
    fieldVarint(2, isJudge ? 1 : 0),
  ]);
}

export function encodeRealtimeSpectateReq({
  senderUid = "",
  targetUid = "",
  senderUsername = "",
} = {}) {
  return concat([
    senderUid
      ? fieldBytes(1, Buffer.from(senderUid, "utf8"))
      : Buffer.alloc(0),
    targetUid
      ? fieldBytes(2, Buffer.from(targetUid, "utf8"))
      : Buffer.alloc(0),
    senderUsername
      ? fieldBytes(3, Buffer.from(senderUsername, "utf8"))
      : Buffer.alloc(0),
  ]);
}

export function decodeRealtimeSpectateResp(buffer) {
  const response = { senderUid: "", targetUid: "", result: 0 };
  for (const field of decodeFields(buffer)) {
    if (field.number === 1 && field.wire === 2) {
      response.senderUid = field.value.toString("utf8");
    } else if (field.number === 2 && field.wire === 2) {
      response.targetUid = field.value.toString("utf8");
    } else if (field.number === 3 && field.wire === 0) {
      response.result = Number(field.value);
    }
  }
  return response;
}

export function encodeCardSelectedReq({ id = 0 } = {}) {
  return fieldVarint(1, id);
}

function readVarint(buffer, cursor) {
  let value = 0n;
  let shift = 0n;
  for (let i = 0; i < 10; i += 1) {
    assert(cursor.offset < buffer.length, "truncated varint");
    const byte = buffer[cursor.offset++];
    value |= BigInt(byte & 0x7f) << shift;
    if ((byte & 0x80) === 0) {
      return value <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(value) : value;
    }
    shift += 7n;
  }
  throw new Error("oversized varint");
}

export function decodeFields(buffer) {
  const result = [];
  const cursor = { offset: 0 };
  while (cursor.offset < buffer.length) {
    const tag = readVarint(buffer, cursor);
    assert(typeof tag === "number", "protobuf tag exceeds safe integer range");
    const number = tag >> 3;
    const wire = tag & 7;
    if (wire === 0) {
      result.push({ number, wire, value: readVarint(buffer, cursor) });
    } else if (wire === 2) {
      const length = readVarint(buffer, cursor);
      assert(cursor.offset + length <= buffer.length, "truncated length-delimited field");
      result.push({
        number,
        wire,
        value: buffer.subarray(cursor.offset, cursor.offset + length),
      });
      cursor.offset += length;
    } else {
      throw new Error(`unsupported protobuf wire type ${wire}`);
    }
  }
  return result;
}

export function encodeCardInfo({ position = 0, index = 0, id = 0 }) {
  return concat([
    fieldVarint(1, position),
    fieldVarint(2, index),
    fieldVarint(3, id),
  ]);
}

export function decodeCardInfo(buffer) {
  const card = { position: 0, index: 0, id: 0 };
  for (const field of decodeFields(buffer)) {
    if (field.wire !== 0) continue;
    if (field.number === 1) card.position = field.value;
    if (field.number === 2) card.index = field.value;
    if (field.number === 3) card.id = field.value;
  }
  return card;
}

export function encodeReplaceCardReq({ targetCard, cardPool = 0 }) {
  return concat([
    fieldBytes(1, encodeCardInfo(targetCard)),
    fieldVarint(2, cardPool),
  ]);
}

export function decodeReplaceCardReq(buffer) {
  const request = { targetCard: { position: 0, index: 0, id: 0 }, cardPool: 0 };
  for (const field of decodeFields(buffer)) {
    if (field.number === 1 && field.wire === 2) {
      request.targetCard = decodeCardInfo(field.value);
    } else if (field.number === 2 && field.wire === 0) {
      request.cardPool = field.value;
    }
  }
  return request;
}

function signedInt32(value) {
  return Number(BigInt.asIntN(32, typeof value === "bigint" ? value : BigInt(value)));
}

export function decodeMoveCardReq(buffer) {
  const request = {
    srcPos: CardPosition.Hand,
    srcIndex: 0,
    dstPos: CardPosition.Hand,
    dstIndex: 0,
  };
  for (const field of decodeFields(buffer)) {
    if (field.wire !== 0) continue;
    if (field.number === 1) request.srcPos = Number(field.value);
    if (field.number === 2) request.srcIndex = signedInt32(field.value);
    if (field.number === 3) request.dstPos = Number(field.value);
    if (field.number === 4) request.dstIndex = signedInt32(field.value);
  }
  return request;
}

function int32Varint(value) {
  if (value >= 0) return varint(value);
  let encoded = BigInt.asUintN(64, BigInt(value));
  const bytes = [];
  do {
    let byte = Number(encoded & 0x7fn);
    encoded >>= 7n;
    if (encoded) byte |= 0x80;
    bytes.push(byte);
  } while (encoded);
  return Buffer.from(bytes);
}

export function encodeMoveCardReq({
  srcPos = CardPosition.Hand,
  srcIndex = 0,
  dstPos = CardPosition.Hand,
  dstIndex = 0,
}) {
  const parts = [];
  for (const [number, value] of [
    [1, srcPos],
    [2, srcIndex],
    [3, dstPos],
    [4, dstIndex],
  ]) {
    if (value !== 0) parts.push(Buffer.concat([varint(number << 3), int32Varint(value)]));
  }
  return concat(parts);
}

export function decodeInsertCardReq(buffer) {
  const request = {
    srcPos: CardPosition.Hand,
    srcIndex: 0,
    dstIndex: 0,
    insertDir: 0,
  };
  for (const field of decodeFields(buffer)) {
    if (field.wire !== 0) continue;
    if (field.number === 1) request.srcPos = Number(field.value);
    if (field.number === 2) request.srcIndex = signedInt32(field.value);
    if (field.number === 3) request.dstIndex = signedInt32(field.value);
    if (field.number === 4) request.insertDir = signedInt32(field.value);
  }
  return request;
}

export function encodeInsertCardReq({
  srcPos = CardPosition.Hand,
  srcIndex = 0,
  dstIndex = 0,
  insertDir = 0,
}) {
  const parts = [];
  for (const [number, value] of [
    [1, srcPos],
    [2, srcIndex],
    [3, dstIndex],
    [4, insertDir],
  ]) {
    if (value !== 0) parts.push(Buffer.concat([varint(number << 3), int32Varint(value)]));
  }
  return concat(parts);
}

export function decodeRefineCardReq(buffer) {
  const request = { targetCard: { position: 0, index: 0, id: 0 } };
  for (const field of decodeFields(buffer)) {
    if (field.number === 1 && field.wire === 2) {
      request.targetCard = decodeCardInfo(field.value);
    }
  }
  return request;
}

export function encodeRefineCardReq({ targetCard }) {
  return fieldBytes(1, encodeCardInfo(targetCard));
}

export function encodeRefineCardResp({
  result = false,
  resultingCards = [],
  targetCard,
} = {}) {
  return concat([
    fieldVarint(1, result ? 1 : 0),
    ...resultingCards.map((card) => fieldBytes(2, encodeCardInfo(card))),
    targetCard ? fieldBytes(3, encodeCardInfo(targetCard)) : Buffer.alloc(0),
  ]);
}

export function decodeRefineCardResp(buffer) {
  const response = {
    result: false,
    resultingCards: [],
    targetCard: null,
  };
  for (const field of decodeFields(buffer)) {
    if (field.number === 1 && field.wire === 0) {
      response.result = field.value !== 0;
    } else if (field.number === 2 && field.wire === 2) {
      response.resultingCards.push(decodeCardInfo(field.value));
    } else if (field.number === 3 && field.wire === 2) {
      response.targetCard = decodeCardInfo(field.value);
    }
  }
  return response;
}

export function encodeReplaceCardResp({
  result = ReplaceCardResult.ClientFailed,
  newCard,
  targetCard,
}) {
  return concat([
    fieldVarint(1, result),
    fieldBytes(2, encodeCardInfo(newCard)),
    fieldBytes(3, encodeCardInfo(targetCard)),
  ]);
}

export function decodeReplaceCardResp(buffer) {
  const response = {
    result: ReplaceCardResult.ClientFailed,
    newCard: { position: 0, index: 0, id: 0 },
    targetCard: { position: 0, index: 0, id: 0 },
  };
  for (const field of decodeFields(buffer)) {
    if (field.number === 1 && field.wire === 0) response.result = field.value;
    if (field.number === 2 && field.wire === 2) response.newCard = decodeCardInfo(field.value);
    if (field.number === 3 && field.wire === 2) response.targetCard = decodeCardInfo(field.value);
  }
  return response;
}

export function encodeBattleNotify(infos) {
  return concat(infos.map(({ type, args = [], clientApply = false }) => {
    const packedArgs = concat(args.map((value) => int32Varint(value)));
    const info = concat([
      fieldVarint(1, type),
      ...(packedArgs.length ? [fieldBytes(2, packedArgs)] : []),
      fieldVarint(4, clientApply ? 1 : 0),
    ]);
    return fieldBytes(1, info);
  }));
}

export function decodeBattleNotify(buffer) {
  return decodeFields(buffer)
    .filter((field) => field.number === 1 && field.wire === 2)
    .map((outer) => {
      const info = { type: 0, args: [], clientApply: false };
      for (const field of decodeFields(outer.value)) {
        if (field.number === 1 && field.wire === 0) info.type = Number(field.value);
        if (field.number === 2 && field.wire === 2) {
          info.args.push(
            ...decodePackedVarints(field.value).map((value) => signedInt32(value)),
          );
        }
        if (field.number === 4 && field.wire === 0) {
          info.clientApply = Number(field.value) !== 0;
        }
      }
      return info;
    });
}

export function encodeChangeCardsNotify(position, index, actualId) {
  return encodeBattleNotify([{
    type: BN_CHANGE_CARDS,
    args: [position, index, CLEAR_HEART_SWORD_EMBRYO, actualId],
    clientApply: true,
  }]);
}

export function encodeSyncGameStatusNotify() {
  return encodeBattleNotify([{ type: BN_SYNC_GAME_STATUS }]);
}

function decodePackedVarints(buffer) {
  const values = [];
  const cursor = { offset: 0 };
  while (cursor.offset < buffer.length) values.push(readVarint(buffer, cursor));
  return values;
}

function decodeSelectedFateStrategyIds(buffer) {
  const selected = [];
  for (const field of decodeFields(buffer)) {
    if (field.number !== 1 || field.wire !== 2) continue;
    const selectedField = decodeFields(field.value).find(
      (candidate) => candidate.number === 3 && candidate.wire === 0,
    );
    if (selectedField && Number(selectedField.value) > 0) {
      selected.push(Number(selectedField.value));
    }
  }
  return selected;
}

function decodeBattlePlayerPrivateState(buffer) {
  const result = {
    handCards: [],
    usedCards: [],
    replaceCardChance: 0,
    selectedFateStrategyIds: [],
  };
  for (const field of decodeFields(buffer)) {
    if (field.number === 1 && field.wire === 2) {
      result.handCards.push(...decodePackedVarints(field.value));
    }
    if (field.number === 2 && field.wire === 2) {
      result.usedCards.push(...decodePackedVarints(field.value));
    }
    if (field.number === 4 && field.wire === 0) {
      result.replaceCardChance = Number(field.value);
    }
    if (field.number === 19 && field.wire === 2) {
      result.selectedFateStrategyIds = decodeSelectedFateStrategyIds(field.value);
    }
  }
  return result;
}

export function decodeGameStatusPrivateState(buffer) {
  const privateField = decodeFields(buffer).find(
    (field) => field.number === 6 && field.wire === 2,
  );
  return privateField ? decodeBattlePlayerPrivateState(privateField.value) : null;
}

export function decodeGameStatusCards(buffer) {
  const state = decodeGameStatusPrivateState(buffer);
  return state
    ? { handCards: state.handCards, usedCards: state.usedCards }
    : null;
}

export function decodePlayerDataPrivateState(buffer) {
  const privateField = decodeFields(buffer).find(
    (field) => field.number === 2 && field.wire === 2,
  );
  return privateField ? decodeBattlePlayerPrivateState(privateField.value) : null;
}

export function decodePlayerDataCards(buffer) {
  const state = decodePlayerDataPrivateState(buffer);
  return state
    ? { handCards: state.handCards, usedCards: state.usedCards }
    : null;
}

export function protobufEnvelope(type, bytes) {
  return { type, data: Buffer.from(bytes).toString("base64") };
}
