import assert from "node:assert/strict";

export const ColyseusOpcode = Object.freeze({
  JOIN_ROOM: 10,
  ERROR: 11,
  LEAVE_ROOM: 12,
  ROOM_DATA: 13,
  ROOM_STATE: 14,
  ROOM_STATE_PATCH: 15,
  ROOM_DATA_SCHEMA: 16,
});

function encodeLength(prefix, length, widths) {
  for (const [max, marker, bytes] of widths) {
    if (length <= max) {
      const output = Buffer.alloc(1 + bytes);
      output[0] = marker;
      if (bytes === 1) output.writeUInt8(length, 1);
      if (bytes === 2) output.writeUInt16BE(length, 1);
      if (bytes === 4) output.writeUInt32BE(length, 1);
      return output;
    }
  }
  throw new Error(`${prefix} is too large`);
}

export function encodeMsgPack(value) {
  if (value === null || value === undefined) return Buffer.from([0xc0]);
  if (value === false) return Buffer.from([0xc2]);
  if (value === true) return Buffer.from([0xc3]);

  if (typeof value === "number") {
    assert(Number.isSafeInteger(value), "MessagePack prototype only accepts safe integers");
    if (value >= 0 && value <= 0x7f) return Buffer.from([value]);
    if (value < 0 && value >= -32) return Buffer.from([0x100 + value]);
    if (value >= 0 && value <= 0xff) {
      const out = Buffer.alloc(2);
      out[0] = 0xcc;
      out.writeUInt8(value, 1);
      return out;
    }
    if (value >= 0 && value <= 0xffff) {
      const out = Buffer.alloc(3);
      out[0] = 0xcd;
      out.writeUInt16BE(value, 1);
      return out;
    }
    if (value >= 0 && value <= 0xffffffff) {
      const out = Buffer.alloc(5);
      out[0] = 0xce;
      out.writeUInt32BE(value, 1);
      return out;
    }
    if (value >= -0x80 && value < 0) {
      const out = Buffer.alloc(2);
      out[0] = 0xd0;
      out.writeInt8(value, 1);
      return out;
    }
    if (value >= -0x8000 && value < 0) {
      const out = Buffer.alloc(3);
      out[0] = 0xd1;
      out.writeInt16BE(value, 1);
      return out;
    }
    const out = Buffer.alloc(9);
    out[0] = value >= 0 ? 0xcf : 0xd3;
    if (value >= 0) out.writeBigUInt64BE(BigInt(value), 1);
    else out.writeBigInt64BE(BigInt(value), 1);
    return out;
  }

  if (typeof value === "string") {
    const bytes = Buffer.from(value, "utf8");
    let header;
    if (bytes.length <= 31) header = Buffer.from([0xa0 | bytes.length]);
    else {
      header = encodeLength("string", bytes.length, [
        [0xff, 0xd9, 1],
        [0xffff, 0xda, 2],
        [0xffffffff, 0xdb, 4],
      ]);
    }
    return Buffer.concat([header, bytes]);
  }

  if (Buffer.isBuffer(value) || value instanceof Uint8Array) {
    const bytes = Buffer.from(value);
    const header = encodeLength("binary value", bytes.length, [
      [0xff, 0xc4, 1],
      [0xffff, 0xc5, 2],
      [0xffffffff, 0xc6, 4],
    ]);
    return Buffer.concat([header, bytes]);
  }

  if (Array.isArray(value)) {
    const parts = value.map(encodeMsgPack);
    const header = value.length <= 15
      ? Buffer.from([0x90 | value.length])
      : encodeLength("array", value.length, [
        [0xffff, 0xdc, 2],
        [0xffffffff, 0xdd, 4],
      ]);
    return Buffer.concat([header, ...parts]);
  }

  if (typeof value === "object") {
    const entries = Object.entries(value);
    const header = entries.length <= 15
      ? Buffer.from([0x80 | entries.length])
      : encodeLength("map", entries.length, [
        [0xffff, 0xde, 2],
        [0xffffffff, 0xdf, 4],
      ]);
    const parts = [header];
    for (const [key, child] of entries) {
      parts.push(encodeMsgPack(key), encodeMsgPack(child));
    }
    return Buffer.concat(parts);
  }

  throw new Error(`unsupported MessagePack value: ${typeof value}`);
}

function need(buffer, offset, length) {
  assert(offset + length <= buffer.length, "truncated MessagePack value");
}

export function decodeMsgPack(buffer, startOffset = 0) {
  const source = Buffer.from(buffer);
  need(source, startOffset, 1);
  const marker = source[startOffset];
  let offset = startOffset + 1;

  if (marker <= 0x7f) return { value: marker, offset };
  if (marker >= 0xe0) return { value: marker - 0x100, offset };
  if ((marker & 0xe0) === 0xa0) {
    const length = marker & 0x1f;
    need(source, offset, length);
    return { value: source.toString("utf8", offset, offset + length), offset: offset + length };
  }
  if ((marker & 0xf0) === 0x90) {
    return decodeArray(source, offset, marker & 0x0f);
  }
  if ((marker & 0xf0) === 0x80) {
    return decodeMap(source, offset, marker & 0x0f);
  }

  if (marker === 0xc0) return { value: null, offset };
  if (marker === 0xc2) return { value: false, offset };
  if (marker === 0xc3) return { value: true, offset };
  if (marker === 0xcc) {
    need(source, offset, 1);
    return { value: source.readUInt8(offset), offset: offset + 1 };
  }
  if (marker === 0xcd) {
    need(source, offset, 2);
    return { value: source.readUInt16BE(offset), offset: offset + 2 };
  }
  if (marker === 0xce) {
    need(source, offset, 4);
    return { value: source.readUInt32BE(offset), offset: offset + 4 };
  }
  if (marker === 0xcf) {
    need(source, offset, 8);
    const value = source.readBigUInt64BE(offset);
    assert(value <= BigInt(Number.MAX_SAFE_INTEGER), "uint64 exceeds safe integer range");
    return { value: Number(value), offset: offset + 8 };
  }
  if (marker === 0xd0) {
    need(source, offset, 1);
    return { value: source.readInt8(offset), offset: offset + 1 };
  }
  if (marker === 0xd1) {
    need(source, offset, 2);
    return { value: source.readInt16BE(offset), offset: offset + 2 };
  }
  if (marker === 0xd2) {
    need(source, offset, 4);
    return { value: source.readInt32BE(offset), offset: offset + 4 };
  }
  if (marker === 0xd3) {
    need(source, offset, 8);
    const value = source.readBigInt64BE(offset);
    assert(value >= BigInt(Number.MIN_SAFE_INTEGER) && value <= BigInt(Number.MAX_SAFE_INTEGER),
      "int64 exceeds safe integer range");
    return { value: Number(value), offset: offset + 8 };
  }

  if (marker === 0xd9 || marker === 0xda || marker === 0xdb) {
    const width = marker === 0xd9 ? 1 : marker === 0xda ? 2 : 4;
    need(source, offset, width);
    const length = width === 1 ? source.readUInt8(offset)
      : width === 2 ? source.readUInt16BE(offset)
        : source.readUInt32BE(offset);
    offset += width;
    need(source, offset, length);
    return { value: source.toString("utf8", offset, offset + length), offset: offset + length };
  }
  if (marker === 0xc4 || marker === 0xc5 || marker === 0xc6) {
    const width = marker === 0xc4 ? 1 : marker === 0xc5 ? 2 : 4;
    need(source, offset, width);
    const length = width === 1 ? source.readUInt8(offset)
      : width === 2 ? source.readUInt16BE(offset)
        : source.readUInt32BE(offset);
    offset += width;
    need(source, offset, length);
    return { value: source.subarray(offset, offset + length), offset: offset + length };
  }
  if (marker === 0xdc || marker === 0xdd) {
    const width = marker === 0xdc ? 2 : 4;
    need(source, offset, width);
    const length = width === 2 ? source.readUInt16BE(offset) : source.readUInt32BE(offset);
    return decodeArray(source, offset + width, length);
  }
  if (marker === 0xde || marker === 0xdf) {
    const width = marker === 0xde ? 2 : 4;
    need(source, offset, width);
    const length = width === 2 ? source.readUInt16BE(offset) : source.readUInt32BE(offset);
    return decodeMap(source, offset + width, length);
  }
  throw new Error(`unsupported MessagePack marker 0x${marker.toString(16)}`);
}

function decodeArray(buffer, startOffset, length) {
  const value = [];
  let offset = startOffset;
  for (let i = 0; i < length; i += 1) {
    const decoded = decodeMsgPack(buffer, offset);
    value.push(decoded.value);
    offset = decoded.offset;
  }
  return { value, offset };
}

function decodeMap(buffer, startOffset, length) {
  const value = {};
  let offset = startOffset;
  for (let i = 0; i < length; i += 1) {
    const key = decodeMsgPack(buffer, offset);
    const child = decodeMsgPack(buffer, key.offset);
    value[String(key.value)] = child.value;
    offset = child.offset;
  }
  return { value, offset };
}

export function encodeDataFrame(type, protobufBytes) {
  const messageType = encodeMsgPack("data");
  const envelope = encodeMsgPack({
    __refId: 0,
    type,
    data: Buffer.from(protobufBytes).toString("base64"),
  });
  return Buffer.concat([
    Buffer.from([ColyseusOpcode.ROOM_DATA]),
    messageType,
    envelope,
  ]);
}

export function decodeDataFrame(frame) {
  const bytes = Buffer.from(frame);
  if (bytes.length === 0 || bytes[0] !== ColyseusOpcode.ROOM_DATA) return null;
  const messageType = decodeMsgPack(bytes, 1);
  if (messageType.value !== "data") return null;
  const envelope = decodeMsgPack(bytes, messageType.offset);
  if (
    envelope.offset !== bytes.length
    || envelope.value === null
    || typeof envelope.value !== "object"
    || typeof envelope.value.type !== "string"
    || typeof envelope.value.data !== "string"
  ) {
    throw new Error("invalid Colyseus ProtobufData envelope");
  }
  return {
    type: envelope.value.type,
    protobuf: Buffer.from(envelope.value.data, "base64"),
    envelope: envelope.value,
  };
}
