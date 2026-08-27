import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const defaultFilename = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "recording-regressions.json",
);

function sameValue(first, second) {
  return JSON.stringify(first) === JSON.stringify(second);
}

function pointerValue(root, pointer) {
  if (pointer === "" || pointer === "/") return root;
  if (typeof pointer !== "string" || !pointer.startsWith("/")) {
    throw new Error(`assertion path must be a JSON pointer, received ${JSON.stringify(pointer)}`);
  }
  return pointer.slice(1).split("/").reduce((value, component) => {
    const key = component.replace(/~1/g, "/").replace(/~0/g, "~");
    return value == null ? undefined : value[key];
  }, root);
}

function contains(container, expected) {
  if (typeof container === "string") return container.includes(String(expected));
  if (Array.isArray(container)) return container.some((value) => sameValue(value, expected));
  if (container && typeof container === "object" && typeof expected === "string") {
    return Object.prototype.hasOwnProperty.call(container, expected);
  }
  return false;
}

function matchesSubset(actual, expected) {
  if (expected == null || typeof expected !== "object" || Array.isArray(expected)) {
    return sameValue(actual, expected);
  }
  return actual != null && typeof actual === "object" && !Array.isArray(actual)
    && Object.entries(expected).every(([key, value]) => matchesSubset(actual[key], value));
}

function checkValue(root, check) {
  const actual = pointerValue(root, check.path);
  switch (check.op) {
    case "equals": return sameValue(actual, check.value);
    case "notEquals": return !sameValue(actual, check.value);
    case "exists": return check.value === false ? actual === undefined : actual !== undefined;
    case "includes": return contains(actual, check.value);
    case "excludes": return !contains(actual, check.value);
    case "includesMatch": return Array.isArray(actual)
      && actual.some((value) => matchesSubset(value, check.value));
    case "excludesMatch": return !Array.isArray(actual)
      || !actual.some((value) => matchesSubset(value, check.value));
    case "length": return Number(actual?.length) === Number(check.value);
    default: throw new Error(`unsupported recording assertion operation ${JSON.stringify(check.op)}`);
  }
}

function stepMatches(step, anchor) {
  if (anchor.sequence != null && Number(step.sequence) !== Number(anchor.sequence)) return false;
  if (anchor.type != null && step.type !== anchor.type) return false;
  if (anchor.direction != null && step.direction !== anchor.direction) return false;
  if (anchor.round != null && Number(step.state?.round) !== Number(anchor.round)) return false;
  if (anchor.battleRound != null && Number(step.battle?.round) !== Number(anchor.battleRound)) return false;
  if (anchor.actionKind != null && !(step.humanActions ?? []).some((action) =>
    action.kind === anchor.actionKind
      && (anchor.actorUid == null || action.actorUid === anchor.actorUid
        || (action.changes ?? []).some((change) => change.actorUid === anchor.actorUid)))) return false;
  for (const condition of anchor.where ?? []) {
    if (!checkValue(step, condition)) return false;
  }
  return true;
}

export function readRecordingRegressions(filename = defaultFilename) {
  const parsed = JSON.parse(fs.readFileSync(filename, "utf8"));
  if (parsed.version !== 1 || !parsed.recordings || typeof parsed.recordings !== "object") {
    throw new Error(`unsupported recording regression file ${filename}`);
  }
  return parsed;
}

export function recordingIdsWithAssertions(filename = defaultFilename) {
  return new Set(Object.entries(readRecordingRegressions(filename).recordings)
    .filter(([, assertions]) => Array.isArray(assertions) && assertions.length)
    .map(([recordingId]) => recordingId));
}

export function assertRecordingRegression(recordingId, steps, filename = defaultFilename) {
  const assertions = readRecordingRegressions(filename).recordings[recordingId] ?? [];
  for (const assertion of assertions) {
    const matches = steps
      .map((step, index) => ({ step, index }))
      .filter(({ step }) => stepMatches(step, assertion.anchor ?? {}));
    const occurrence = assertion.anchor?.occurrence;
    if (occurrence != null && (!Number.isInteger(occurrence) || occurrence < 1)) {
      throw new Error(`${recordingId} regression ${JSON.stringify(assertion.name)} has an invalid occurrence`);
    }
    if (occurrence == null && matches.length !== 1) {
      throw new Error(`${recordingId} regression ${JSON.stringify(assertion.name)} anchor matched ${matches.length} steps; make the semantic anchor unique or specify occurrence`);
    }
    const match = occurrence == null ? matches[0] : matches[occurrence - 1];
    if (!match) {
      throw new Error(`${recordingId} regression ${JSON.stringify(assertion.name)} could not find occurrence ${occurrence} among ${matches.length} matching steps`);
    }
    const context = {
      event: match.step,
      state: match.step.state,
      beforeState: steps[match.index - 1]?.state,
      nextState: steps[match.index + 1]?.state,
    };
    for (const check of assertion.checks ?? []) {
      if (checkValue(context, check)) continue;
      const actual = pointerValue(context, check.path);
      throw new Error(`${recordingId} regression ${JSON.stringify(assertion.name)} failed ${check.op} at ${check.path}: expected ${JSON.stringify(check.value)}, received ${JSON.stringify(actual)}`);
    }
  }
  return assertions.length;
}
