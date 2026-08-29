(function installRecordingCodec(root, factory) {
  const codec = factory();
  if (typeof module === "object" && module.exports) module.exports = codec;
  if (root) root.RECORDING_CODEC = codec;
}(typeof globalThis === "object" ? globalThis : this, () => {
  "use strict";

  const FORMAT_VERSION = 1;
  const CATALOG_KINDS = ["cards", "talents", "fateStrategies", "characters"];
  const CATALOG_ITEM_KEYS = new Set([
    "id", "file", "targetUid", "targetUsername", "targetCharacterId",
    "startingRating", "career", "rounds", "capturedThrough", "linCareer",
    "linFates", "linUnchosenFates", "humanOpponentCharacters", "label",
  ]);

  const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
  const byteLength = (value) => new TextEncoder().encode(JSON.stringify(value)).length;

  function collectValueMetadata(value) {
    const shapeCounts = new Map();
    const shapeKeys = new Map();
    const stringCounts = new Map();
    const visit = (current) => {
      if (isObject(current)) {
        const keys = Object.keys(current);
        const signature = JSON.stringify(keys);
        shapeCounts.set(signature, (shapeCounts.get(signature) ?? 0) + 1);
        shapeKeys.set(signature, keys);
        for (const child of Object.values(current)) visit(child);
      } else if (Array.isArray(current)) {
        for (const child of current) visit(child);
      } else if (typeof current === "string") {
        stringCounts.set(current, (stringCounts.get(current) ?? 0) + 1);
      }
    };
    visit(value);
    const shapes = [...shapeCounts]
      .sort((first, second) => second[1] - first[1] || first[0].localeCompare(second[0]))
      .map(([signature]) => shapeKeys.get(signature));
    const strings = [...stringCounts]
      .filter(([text, count]) => {
        if (count < 2) return false;
        const literalBytes = byteLength(text);
        return literalBytes * (count - 1) > 6 * count + 2;
      })
      .sort((first, second) => second[1] - first[1]
        || byteLength(second[0]) - byteLength(first[0])
        || first[0].localeCompare(second[0]))
      .map(([text]) => text);
    return { shapes, strings };
  }

  function packValue(value, options = {}) {
    const metadata = collectValueMetadata(value);
    const stringLimit = options.stringLimit === undefined
      ? metadata.strings.length : Math.max(0, Number(options.stringLimit) || 0);
    const strings = metadata.strings.slice(0, stringLimit);
    const shapeIndex = new Map(metadata.shapes.map((keys, index) => [JSON.stringify(keys), index]));
    const stringIndex = new Map(strings.map((text, index) => [text, index]));
    const encode = (current) => {
      if (isObject(current)) {
        const keys = Object.keys(current);
        return [0, shapeIndex.get(JSON.stringify(keys)), ...keys.map((key) => encode(current[key]))];
      }
      if (Array.isArray(current)) return [1, ...current.map(encode)];
      if (typeof current === "string" && stringIndex.has(current)) return [2, stringIndex.get(current)];
      return current;
    };
    return [metadata.shapes, strings, encode(value)];
  }

  function unpackValue(packed) {
    if (!Array.isArray(packed) || packed.length !== 3) throw new Error("invalid packed value");
    const [shapes, strings, encoded] = packed;
    const decode = (current) => {
      if (!Array.isArray(current)) return current;
      const tag = current[0];
      if (tag === 0) {
        const keys = shapes[current[1]];
        if (!keys) throw new Error(`unknown recording object schema ${current[1]}`);
        if (current.length !== keys.length + 2) throw new Error("recording object schema length mismatch");
        return Object.fromEntries(keys.map((key, index) => [key, decode(current[index + 2])]));
      }
      if (tag === 1) return current.slice(1).map(decode);
      if (tag === 2) {
        if (typeof strings[current[1]] !== "string") throw new Error(`unknown recording string ${current[1]}`);
        return strings[current[1]];
      }
      throw new Error(`unknown packed recording tag ${tag}`);
    };
    return decode(encoded);
  }

  function packSharedCatalog(catalog) {
    return CATALOG_KINDS.map((kind) => {
      const entries = catalog[kind] ?? {};
      const groups = new Map();
      for (const [mapKey, entry] of Object.entries(entries)) {
        const keys = Object.keys(entry);
        const signature = JSON.stringify(keys);
        if (!groups.has(signature)) groups.set(signature, { keys, rows: [] });
        groups.get(signature).rows.push([mapKey, ...keys.map((key) => entry[key])]);
      }
      return [...groups.values()].map(({ keys, rows }) => [keys, rows]);
    });
  }

  function unpackSharedCatalog(packed) {
    if (!Array.isArray(packed) || packed.length !== CATALOG_KINDS.length) {
      throw new Error("invalid shared recording catalog");
    }
    return Object.fromEntries(CATALOG_KINDS.map((kind, kindIndex) => {
      const entries = {};
      for (const [keys, rows] of packed[kindIndex]) {
        for (const row of rows) {
          if (row.length !== keys.length + 1) throw new Error(`invalid ${kind} catalog row`);
          entries[row[0]] = Object.fromEntries(keys.map((key, index) => [key, row[index + 1]]));
        }
      }
      return [kind, entries];
    }));
  }

  function catalogReferences(catalog) {
    return CATALOG_KINDS.map((kind) => Object.keys(catalog[kind] ?? {}));
  }

  function catalogFromReferences(references, sharedCatalog) {
    if (!Array.isArray(references) || references.length !== CATALOG_KINDS.length) {
      throw new Error("invalid recording catalog references");
    }
    return Object.fromEntries(CATALOG_KINDS.map((kind, kindIndex) => {
      const sharedEntries = sharedCatalog[kind] ?? {};
      const entries = {};
      for (const id of references[kindIndex]) {
        if (!(id in sharedEntries)) throw new Error(`recording references missing ${kind} ${id}`);
        entries[id] = sharedEntries[id];
      }
      return [kind, entries];
    }));
  }

  function packRecording(recording, options = {}) {
    const { catalog, ...withoutCatalog } = recording;
    return [FORMAT_VERSION, catalogReferences(catalog), packValue(withoutCatalog, options)];
  }

  function unpackRecording(packed, sharedCatalog) {
    if (!Array.isArray(packed) || packed[0] !== FORMAT_VERSION || packed.length !== 3) {
      throw new Error("unsupported packed recording format");
    }
    const recording = unpackValue(packed[2]);
    const catalog = catalogFromReferences(packed[1], sharedCatalog);
    return {
      id: recording.id,
      targetUid: recording.targetUid,
      targetUsername: recording.targetUsername,
      catalog,
      steps: recording.steps,
    };
  }

  function compactFate(id, sharedCatalog) {
    const info = sharedCatalog.fateStrategies[id];
    if (!info) throw new Error(`catalog references missing fate strategy ${id}`);
    return { id: Number(id), nameEnglish: info.nameEnglish, nameChinese: info.nameChinese };
  }

  function compactCharacter(id, sharedCatalog) {
    const info = sharedCatalog.characters[id];
    if (!info) throw new Error(`catalog references missing character ${id}`);
    return { id: Number(id), nameChinese: info.nameChinese, nameEnglish: info.nameEnglish };
  }

  function packCatalog(sharedCatalog, items) {
    const groups = new Map();
    for (const item of items) {
      for (const key of Object.keys(item)) {
        if (!CATALOG_ITEM_KEYS.has(key)) throw new Error(`unencoded recording catalog field ${key}`);
      }
      const groupKey = JSON.stringify([item.targetUid, item.targetUsername, item.targetCharacterId]);
      if (!groups.has(groupKey)) groups.set(groupKey, [item.targetUid, item.targetUsername, item.targetCharacterId, []]);
      groups.get(groupKey)[3].push([
        item.id,
        item.startingRating,
        item.career,
        item.rounds,
        item.capturedThrough,
        item.linCareer,
        (item.linFates ?? []).map(({ id }) => id),
        (item.linUnchosenFates ?? []).map(({ id }) => id),
        (item.humanOpponentCharacters ?? []).map(({ id }) => id),
      ]);
    }
    return [FORMAT_VERSION, packSharedCatalog(sharedCatalog), [...groups.values()]];
  }

  function unpackCatalog(packed) {
    if (!Array.isArray(packed) || packed[0] !== FORMAT_VERSION || packed.length !== 3) {
      throw new Error("unsupported packed recording catalog format");
    }
    const sharedCatalog = unpackSharedCatalog(packed[1]);
    const catalog = [];
    for (const [targetUid, targetUsername, targetCharacterId, games] of packed[2]) {
      for (const game of games) {
        const [id, startingRating, career, rounds, capturedThrough, linCareer,
          fateIds, unchosenFateIds, opponentIds] = game;
        catalog.push({
          id,
          file: `${id}.compact.json.gz`,
          targetUid,
          targetUsername,
          targetCharacterId,
          startingRating,
          career,
          rounds,
          capturedThrough,
          linCareer,
          linFates: fateIds.map((fateId) => compactFate(fateId, sharedCatalog)),
          linUnchosenFates: unchosenFateIds.map((fateId) => compactFate(fateId, sharedCatalog)),
          humanOpponentCharacters: opponentIds.map((characterId) => compactCharacter(characterId, sharedCatalog)),
          label: `${targetUsername} · ${rounds} rounds`,
        });
      }
    }
    return { sharedCatalog, catalog };
  }

  return {
    FORMAT_VERSION,
    CATALOG_KINDS,
    packValue,
    unpackValue,
    packSharedCatalog,
    unpackSharedCatalog,
    packRecording,
    unpackRecording,
    packCatalog,
    unpackCatalog,
  };
}));
