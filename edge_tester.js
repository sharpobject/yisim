#!/usr/bin/env bun

import { deps, config_implies_config } from './deps.js';
import { preprocessJavaScript } from './preprocessor.js';
import { swogi, SECTS, format_card, CRASH_FIST_CARDS, ready as card_info_ready } from './card_info.js';
import { guess_character, ready as full_ready } from './gamestate_full.js';
import seedrandom from 'seedrandom';
import fs from 'fs';

await card_info_ready;
await full_ready;

const SIMS_PER_EDGE = parseInt(process.argv[2]) || 1000;
const STRUCTURAL_ONLY = process.argv.includes('--structural-only');

// ========== Graph Construction ==========

// Forward implication graph: implies[source] = [target1, target2, ...]
const implies = {};
for (let target in deps) {
    for (let source of deps[target]) {
        if (!implies[source]) implies[source] = [];
        implies[source].push(target);
    }
}

// Reverse config_implies_config: reverseConfigImplies[value] = [key1, key2, ...]
const reverseConfigImplies = {};
for (let key in config_implies_config) {
    for (let val of config_implies_config[key]) {
        if (!reverseConfigImplies[val]) reverseConfigImplies[val] = [];
        reverseConfigImplies[val].push(key);
    }
}

// ========== Helper Functions ==========

function isCardBase(s) {
    return /^\d{5}$/.test(s) || /^D\d{4,}$/.test(s);
}

// Compute card-wise preimage of a node via backward BFS
function computeCardPreimage(node) {
    const visited = new Set();
    const queue = [node];
    visited.add(node);
    const cardBases = new Set();

    while (queue.length > 0) {
        const current = queue.shift();
        if (isCardBase(current)) cardBases.add(current);

        if (deps[current]) {
            for (let pred of deps[current]) {
                if (!visited.has(pred)) {
                    visited.add(pred);
                    queue.push(pred);
                }
            }
        }

        if (reverseConfigImplies[current]) {
            for (let pred of reverseConfigImplies[current]) {
                if (!visited.has(pred)) {
                    visited.add(pred);
                    queue.push(pred);
                }
            }
        }
    }

    return cardBases;
}

// Check if target is reachable from source via forward edges, excluding one specific edge
function isReachableWithout(source, target, skipSource, skipTarget) {
    const visited = new Set();
    const queue = [source];
    visited.add(source);

    while (queue.length > 0) {
        const current = queue.shift();
        if (current === target) return true;

        if (implies[current]) {
            for (let next of implies[current]) {
                if (current === skipSource && next === skipTarget) continue;
                if (!visited.has(next)) {
                    visited.add(next);
                    queue.push(next);
                }
            }
        }

        if (config_implies_config[current]) {
            for (let next of config_implies_config[current]) {
                if (!visited.has(next)) {
                    visited.add(next);
                    queue.push(next);
                }
            }
        }
    }

    return false;
}

// Compute defines from config, optionally skipping one edge
function computeDefines(config, skipSource, skipTarget) {
    const defines = {};
    const visited = {};
    let go = true;
    while (go) {
        go = false;
        const new_defines = {};
        for (let xd of [config, defines]) {
            for (let key in xd) {
                if (visited[key]) continue;
                visited[key] = true;
                go = true;
                if (implies[key]) {
                    for (let target of implies[key]) {
                        if (key === skipSource && target === skipTarget) continue;
                        if (!defines[target]) new_defines[target] = true;
                    }
                }
                if (config_implies_config[key]) {
                    for (let ik of config_implies_config[key]) {
                        if (!defines[ik]) new_defines[ik] = true;
                    }
                }
            }
        }
        for (let key in new_defines) defines[key] = true;
    }
    return defines;
}

function definesEqual(d1, d2) {
    const keys1 = Object.keys(d1).sort();
    const keys2 = Object.keys(d2).sort();
    if (keys1.length !== keys2.length) return false;
    for (let i = 0; i < keys1.length; i++) {
        if (keys1[i] !== keys2[i]) return false;
    }
    return true;
}

// Build preprocessor config from riddle (same as fuzzer)
function build_preprocessor_config(riddle) {
    const config = {};
    for (let player of riddle.players) {
        for (let key in player) config[key] = true;
        for (let card_id of player.cards) {
            if (card_id[0] >= '0' && card_id[0] <= '9') {
                config[card_id.slice(0, 5)] = true;
            } else {
                config[card_id] = true;
                config[card_id.slice(0, 5)] = true;
            }
        }
    }
    return config;
}

// Transform preprocessed code into a new Function body (like preprocess_browser.js)
function makeFactory(code) {
    const lines = code.split('\n');
    const out = [];
    for (let line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('import ') && trimmed.includes('card_info')) {
            out.push('const NO_STANCE = 0;');
            out.push('const FIST_STANCE = 1;');
            out.push('const STICK_STANCE = -1;');
            continue;
        }
        if (trimmed.startsWith('import ') && trimmed.includes('seedrandom')) {
            continue;
        }
        if (trimmed === 'export { ready };') {
            continue;
        }
        if (trimmed.startsWith('export class ') ||
            trimmed.startsWith('export const ') ||
            trimmed.startsWith('export function ')) {
            out.push(line.replace('export ', ''));
            continue;
        }
        out.push(line);
    }
    out.push('return { Player, GameState };');
    return new Function('swogi', 'SECTS', 'format_card', 'CRASH_FIST_CARDS', 'seedrandom',
        out.join('\n'));
}

// Run simulation in-process using a factory
function runSimulation(factory, riddle, seed) {
    const { GameState, Player } = factory(swogi, SECTS, format_card, CRASH_FIST_CARDS, seedrandom);
    // Override crash() to throw instead of process.exit(1)
    GameState.prototype.crash = function() {
        throw new Error("Simulation crashed");
    };
    const a = new Player();
    const b = new Player();
    const game = new GameState(a, b, seed);
    for (let key in riddle.players[0]) game.players[0][key] = riddle.players[0][key];
    for (let key in riddle.players[1]) game.players[1][key] = riddle.players[1][key];
    game.sim_n_turns(64);
    return game.output;
}

// ========== Random helpers ==========

function random_int(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function random_choice(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

// ========== Load card/talent data ==========

const swogi_raw = JSON.parse(fs.readFileSync('swogi.json', 'utf8'));
const valid_ids = [];
for (let id in swogi_raw) {
    if (!swogi_raw[id].does_not_exist) valid_ids.push(id);
}

const talents_json = JSON.parse(fs.readFileSync('lanke/talents.json', 'utf8'));
const jscpp_source = fs.readFileSync('gamestate.jscpp', 'utf8');
const all_talent_stacks = [];
for (let name in talents_json) {
    const stacks_key = talents_json[name];
    if (stacks_key === null) continue;
    if (stacks_key.includes('p{n}')) {
        const suffix = stacks_key.slice(4);
        const escaped_suffix = suffix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp('p\\d' + escaped_suffix, 'g');
        let match;
        const matches = new Set();
        while ((match = regex.exec(jscpp_source)) !== null) {
            matches.add(match[0]);
        }
        for (let m of matches) all_talent_stacks.push(m);
    } else {
        all_talent_stacks.push(stacks_key);
    }
}

// Base-to-valid-IDs mapping
const baseToValidIds = {};
for (let id of valid_ids) {
    if (id[0] >= '0' && id[0] <= '9') {
        const base = id.slice(0, 5);
        if (!baseToValidIds[base]) baseToValidIds[base] = [];
        baseToValidIds[base].push(id);
    } else {
        const base5 = id.slice(0, 5);
        if (!baseToValidIds[base5]) baseToValidIds[base5] = [];
        baseToValidIds[base5].push(id);
        if (!baseToValidIds[id]) baseToValidIds[id] = [];
        baseToValidIds[id].push(id);
    }
}

// Generate a random riddle
function generate_riddle() {
    const players = [{}, {}];
    for (let i = 0; i < 2; i++) {
        players[i].hp = 124;
        players[i].max_hp = 124;
        players[i].cultivation = 103;
    }
    for (let i = 0; i < 2; i++) {
        const cards = [];
        for (let j = 0; j < 8; j++) cards.push(random_choice(valid_ids));
        players[i].cards = cards;
    }
    for (let i = 0; i < 2; i++) {
        const num_talents = random_int(1, 20);
        for (let j = 0; j < num_talents; j++) {
            players[i][random_choice(all_talent_stacks)] = 1;
        }
    }
    for (let i = 0; i < 2; i++) {
        players[i].character = guess_character(players[i]);
    }
    return { players, my_idx: 0 };
}

// Generate riddle with injected preimage cards
function generate_riddle_with_injection(injectableCards) {
    const riddle = generate_riddle();

    const num_replacements = random_int(1, 4);
    const all_positions = [];
    for (let p = 0; p < 2; p++) {
        for (let c = 0; c < riddle.players[p].cards.length; c++) {
            all_positions.push([p, c]);
        }
    }
    for (let i = all_positions.length - 1; i > 0; i--) {
        const j = random_int(0, i);
        [all_positions[i], all_positions[j]] = [all_positions[j], all_positions[i]];
    }

    for (let i = 0; i < num_replacements; i++) {
        const [p, c] = all_positions[i];
        const base = random_choice(injectableCards);
        const cards = baseToValidIds[base];
        if (cards && cards.length > 0) {
            riddle.players[p].cards[c] = random_choice(cards);
        }
    }

    for (let i = 0; i < 2; i++) {
        riddle.players[i].character = guess_character(riddle.players[i]);
    }

    return riddle;
}

// ========== Phase 1: Enumerate edges, compute preimages, check redundancy ==========

let testableEdges;

const CANDIDATES_FILE = 'edge_candidates.txt';
if (fs.existsSync(CANDIDATES_FILE) && !STRUCTURAL_ONLY) {
    // Resume from saved candidate list
    const lines = fs.readFileSync(CANDIDATES_FILE, 'utf8').trim().split('\n');
    const parsed = lines.map(line => {
        const m = line.match(/^(.+?) -> (.+)$/);
        return { source: m[1], target: m[2] };
    });
    // Compute card preimages and filter
    testableEdges = [];
    for (let edge of parsed) {
        const cardPreimage = [...computeCardPreimage(edge.source)].filter(b =>
            baseToValidIds[b] && baseToValidIds[b].length > 0
        );
        if (cardPreimage.length > 0) {
            testableEdges.push({ ...edge, cardPreimage });
        } else {
            testableEdges.push({ ...edge, cardPreimage: [] });
        }
    }
    console.log(`Loaded ${testableEdges.length} candidate edges from ${CANDIDATES_FILE}`);
} else {
    console.log("\n=== Phase 1: Analyzing edges ===\n");

    const edges = [];
    for (let target in deps) {
        for (let source of deps[target]) {
            edges.push({ source, target });
        }
    }
    console.log(`Total edges in deps: ${edges.length}`);

    const structurallyRedundant = [];
    const nonRedundantWithCards = [];
    const nonRedundantEmptyPreimage = [];

    for (let edge of edges) {
        const cardPreimage = [...computeCardPreimage(edge.source)];
        const redundant = isReachableWithout(edge.source, edge.target, edge.source, edge.target);

        if (redundant) {
            structurallyRedundant.push({ ...edge, cardPreimage });
        } else if (cardPreimage.length > 0) {
            nonRedundantWithCards.push({ ...edge, cardPreimage });
        } else {
            nonRedundantEmptyPreimage.push(edge);
        }
    }

    console.log(`Structurally redundant (target reachable via other paths): ${structurallyRedundant.length}`);
    console.log(`Non-redundant with card preimage (need simulation): ${nonRedundantWithCards.length}`);
    console.log(`Non-redundant with empty card preimage (can't test): ${nonRedundantEmptyPreimage.length}`);

    console.log("\n=== Structurally Redundant Edges ===");
    console.log("(removing these never changes the set of defines)\n");
    for (let e of structurallyRedundant) {
        const cards = e.cardPreimage.length > 0 ? e.cardPreimage.join(', ') : '(no cards)';
        console.log(`  ${e.source} -> ${e.target}  [cards: ${cards}]`);
    }

    console.log("\n=== Non-redundant Edges with Empty Card Preimage ===");
    console.log("(triggered only by talents/buffs, can't test via card injection)\n");
    for (let e of nonRedundantEmptyPreimage) {
        console.log(`  ${e.source} -> ${e.target}`);
    }

    if (STRUCTURAL_ONLY) {
        console.log("\n=== Non-redundant Edges with Card Preimage (would need simulation) ===\n");
        for (let e of nonRedundantWithCards) {
            console.log(`  ${e.source} -> ${e.target}  [cards: ${e.cardPreimage.join(', ')}]`);
        }
        process.exit(0);
    }

    // Filter card preimages to only injectable cards
    for (let edge of nonRedundantWithCards) {
        edge.cardPreimage = edge.cardPreimage.filter(b =>
            baseToValidIds[b] && baseToValidIds[b].length > 0
        );
    }
    testableEdges = nonRedundantWithCards.filter(e => e.cardPreimage.length > 0);
}

// ========== Phase 3: Round-robin simulation testing ==========

if (testableEdges.length === 0) {
    console.log("\nNo edges need simulation testing. Done!");
    process.exit(0);
}

console.log(`\n=== Phase 3: Round-robin simulation (${testableEdges.length} edges, up to ${SIMS_PER_EDGE} rounds) ===\n`);

// Track per-edge state
let candidates = testableEdges.map(edge => ({
    ...edge,
    defsChangedCount: 0,
    simsDone: 0,
}));

const eliminated = []; // edges where output differed
const crashed = [];    // edges where unchanged version crashed

const MAX_ATTEMPTS = 10; // tries per edge per round to find a config where defines differ

for (let round = 0; round < SIMS_PER_EDGE; round++) {
    const stillCandidates = [];

    for (let edge of candidates) {
        // Try up to MAX_ATTEMPTS times to find a riddle where defines actually differ
        let found = false;
        for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
            const riddle = generate_riddle_with_injection(edge.cardPreimage);
            const config = build_preprocessor_config(riddle);

            const defsWith = computeDefines(config, null, null);
            const defsWithout = computeDefines(config, edge.source, edge.target);

            edge.simsDone++;

            if (definesEqual(defsWith, defsWithout)) continue;

            // Defines differ - run the sim
            found = true;
            edge.defsChangedCount++;
            const seed = String(round);

            // Run A (unchanged)
            const codeA = preprocessJavaScript(jscpp_source, defsWith);
            const factoryA = makeFactory(codeA);
            let outputA;
            try {
                outputA = runSimulation(factoryA, riddle, seed);
            } catch (e) {
                console.log(`BUG: unchanged version crashed for ${edge.source} -> ${edge.target}: ${e.message}`);
                const crashFile = `edge_crash_${seed}_${edge.source}_${edge.target}.json`;
                fs.writeFileSync(crashFile, JSON.stringify(riddle, null, 2));
                console.log(`  Riddle saved to ${crashFile}`);
                crashed.push({ ...edge, error: e.message });
                stillCandidates.push(edge); // keep testing, crash is a separate bug
                break;
            }

            // Run B (edge removed)
            const codeB = preprocessJavaScript(jscpp_source, defsWithout);
            const factoryB = makeFactory(codeB);
            let outputB;
            try {
                outputB = runSimulation(factoryB, riddle, seed);
            } catch (e) {
                const elimFile = `edge_elim_${seed}_${edge.source}_${edge.target}.json`;
                fs.writeFileSync(elimFile, JSON.stringify({ riddle, reason: 'edge-removed crashed', error: e.message }, null, 2));
                eliminated.push({ ...edge, reason: 'edge-removed crashed' });
                break;
            }

            if (outputA.join('\n') !== outputB.join('\n')) {
                const elimFile = `edge_elim_${seed}_${edge.source}_${edge.target}.json`;
                fs.writeFileSync(elimFile, JSON.stringify({ riddle, reason: 'output differs' }, null, 2));
                eliminated.push({ ...edge, reason: 'output differs' });
            } else {
                stillCandidates.push(edge);
            }
            break;
        }

        // All attempts had equal defines - keep as candidate
        if (!found) {
            stillCandidates.push(edge);
        }
    }

    candidates = stillCandidates;

    console.log(`Round ${round + 1}: ${candidates.length} candidates remaining (${eliminated.length} eliminated)`);
    if (candidates.length === 0) break;

    if ((round + 1) % 10 === 0) {
        for (let e of candidates) {
            console.log(`  ${e.source} -> ${e.target} (defs changed ${e.defsChangedCount}/${e.simsDone})`);
        }
    }
}

// ========== Phase 4: Final Summary ==========

console.log("\n" + "=".repeat(80));
console.log("=== FINAL SUMMARY ===");
console.log("=".repeat(80));

if (typeof structurallyRedundant !== 'undefined') {
    console.log(`\n--- Structurally Redundant (${structurallyRedundant.length} edges) ---`);
    console.log("These never change the defines set. Safe to remove.\n");
    for (let e of structurallyRedundant) {
        console.log(`  ${e.source} -> ${e.target}`);
    }
}

console.log(`\n--- Simulation: Candidates for Removal (${candidates.length} edges) ---`);
console.log(`Survived ${SIMS_PER_EDGE} rounds with no output differences.\n`);
for (let e of candidates) {
    console.log(`  ${e.source} -> ${e.target}  (defs changed ${e.defsChangedCount}/${e.simsDone})`);
}

console.log(`\n--- Simulation: Eliminated (${eliminated.length} edges) ---`);
console.log("These edges affect simulation output. NOT safe to remove.\n");
for (let e of eliminated) {
    console.log(`  ${e.source} -> ${e.target}  (${e.reason})`);
}

if (crashed.length > 0) {
    console.log(`\n--- Bugs: Unchanged Version Crashed (${crashed.length}) ---\n`);
    for (let e of crashed) {
        console.log(`  ${e.source} -> ${e.target}: ${e.error}`);
    }
}

if (typeof nonRedundantEmptyPreimage !== 'undefined') {
    console.log(`\n--- Non-redundant with Empty Card Preimage (${nonRedundantEmptyPreimage.length} edges) ---`);
    console.log("Triggered only by talents/buffs, not testable via card injection.\n");
    for (let e of nonRedundantEmptyPreimage) {
        console.log(`  ${e.source} -> ${e.target}`);
    }
}
