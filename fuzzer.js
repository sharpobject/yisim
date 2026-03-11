#!/usr/bin/env bun

import { preprocess_to_string } from './preprocess.js';
import { swogi, SECTS, format_card, CRASH_FIST_CARDS, ready as card_info_ready } from './card_info.js';
import { guess_character, ready as full_ready } from './gamestate_full.js';
import seedrandom from 'seedrandom';
import fs from 'fs';

await card_info_ready;
await full_ready;

const {
    GameState: FullGameState,
    Player: FullPlayer,
} = await import('./gamestate_full.js');

// 1. Build valid card ID list from swogi.json
const swogi_raw = JSON.parse(fs.readFileSync('swogi.json', 'utf8'));
const valid_ids = [];
for (let id in swogi_raw) {
    if (!swogi_raw[id].does_not_exist) {
        valid_ids.push(id);
    }
}
console.log(`Found ${valid_ids.length} valid card IDs`);

// 2. Build talent list from lanke/talents.json, expanding p{n} patterns
const talents_json = JSON.parse(fs.readFileSync('lanke/talents.json', 'utf8'));
const jscpp = fs.readFileSync('gamestate.jscpp', 'utf8');
const all_talent_stacks = []; // array of stack key strings

for (let name in talents_json) {
    const stacks_key = talents_json[name];
    if (stacks_key === null) {
        continue; // passive talent, no stack to set
    }
    if (stacks_key.includes('p{n}')) {
        // stacks_key is like "p{n}_divination_stacks"
        // Search for "p._divination_stacks" in gamestate.jscpp
        const suffix = stacks_key.slice(4); // remove "p{n}" prefix, get "_divination_stacks"
        const escaped_suffix = suffix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp('p\\d' + escaped_suffix, 'g');
        const matches = new Set();
        let match;
        while ((match = regex.exec(jscpp)) !== null) {
            matches.add(match[0]);
        }
        for (let m of matches) {
            all_talent_stacks.push(m);
        }
    } else {
        all_talent_stacks.push(stacks_key);
    }
}
console.log(`Found ${all_talent_stacks.length} talent stack keys`);

// 3. Random helpers
function random_int(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function random_choice(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

// 4. Generate a random riddle
function generate_riddle() {
    const players = [{}, {}];

    // Hard-coded values from riddle_data.json
    for (let i = 0; i < 2; i++) {
        players[i].hp = 124;
        players[i].max_hp = 124;
        players[i].cultivation = 103;
    }

    // Choose 8 random cards per player
    for (let i = 0; i < 2; i++) {
        const cards = [];
        for (let j = 0; j < 8; j++) {
            cards.push(random_choice(valid_ids));
        }
        players[i].cards = cards;
    }

    // Choose 1-20 random talents per player
    for (let i = 0; i < 2; i++) {
        const num_talents = random_int(1, 20);
        for (let j = 0; j < num_talents; j++) {
            const talent_key = random_choice(all_talent_stacks);
            players[i][talent_key] = 1;
        }
    }

    // Guess characters based on cards/talents
    for (let i = 0; i < 2; i++) {
        players[i].character = guess_character(players[i]);
    }

    return { players, my_idx: 0 };
}

// 5. Build preprocessor config (same logic as swogi.js)
function build_preprocessor_config(riddle) {
    const config = {};
    for (let player of riddle.players) {
        for (let key in player) {
            config[key] = true;
        }
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

// 6. Run full simulation (inline, using pre-loaded full gamestate)
function run_full_simulation(riddle, seed) {
    const a = new FullPlayer();
    const b = new FullPlayer();
    const game = new FullGameState(a, b, seed);
    for (let key in riddle.players[0]) {
        game.players[0][key] = riddle.players[0][key];
    }
    for (let key in riddle.players[1]) {
        game.players[1][key] = riddle.players[1][key];
    }
    game.sim_n_turns(64);
    return {
        output: game.output
    };
}

// 7. Transform preprocessed code into a new Function body (from edge_tester.js)
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

// 8. Run specialized simulation in-process using a factory
function run_specialized_simulation(factory, riddle, seed) {
    const { GameState, Player } = factory(swogi, SECTS, format_card, CRASH_FIST_CARDS, seedrandom);
    GameState.prototype.crash = function() {
        throw new Error("Simulation crashed");
    };
    const a = new Player();
    const b = new Player();
    const game = new GameState(a, b, seed);
    for (let key in riddle.players[0]) game.players[0][key] = riddle.players[0][key];
    for (let key in riddle.players[1]) game.players[1][key] = riddle.players[1][key];
    game.sim_n_turns(64);
    return {
        output: game.output
    };
}

// 9. Bit-reverse a 32-bit integer for seed diversity
function bit_reverse_32(n) {
    n = n >>> 0; // ensure unsigned 32-bit
    n = ((n & 0x55555555) << 1) | ((n >>> 1) & 0x55555555);
    n = ((n & 0x33333333) << 2) | ((n >>> 2) & 0x33333333);
    n = ((n & 0x0F0F0F0F) << 4) | ((n >>> 4) & 0x0F0F0F0F);
    n = ((n & 0x00FF00FF) << 8) | ((n >>> 8) & 0x00FF00FF);
    n = (n << 16) | (n >>> 16);
    return n >>> 0;
}

const base_seed = bit_reverse_32(Date.now() & 0xFFFFFFFF);
console.log(`Base seed: ${base_seed}`);

// 10. Main fuzzing loop
let iteration = 0;
while (true) {
    iteration++;
    const seed = ((base_seed + iteration) >>> 0).toString();
    const riddle = generate_riddle();

    // Preprocess for this riddle's cards/talents
    const config = build_preprocessor_config(riddle);
    const preprocessed = preprocess_to_string(config);
    let factory;
    try {
        factory = makeFactory(preprocessed);
    } catch (e) {
        orig_log(`\nBUG FOUND on iteration ${iteration}! Failed to compile specialized gamestate: ${e.message}`);
        fs.writeFileSync('fuzz_bug_riddle.json', JSON.stringify(riddle, null, 2));
        orig_log("Riddle saved to fuzz_bug_riddle.json");
        break;
    }

    // Run full simulation
    let full_result;
    try {
        full_result = run_full_simulation(riddle, seed);
    } catch (e) {
        console.log(`\nBUG FOUND on iteration ${iteration}! Full simulation crashed: ${e.message}`);
        console.log(e.stack);
        fs.writeFileSync('fuzz_bug_riddle.json', JSON.stringify(riddle, null, 2));
        console.log("Riddle saved to fuzz_bug_riddle.json");
        break;
    }

    // Run specialized simulation
    let specialized_result;
    try {
        specialized_result = run_specialized_simulation(factory, riddle, seed);
    } catch (e) {
        console.log(`\nBUG FOUND on iteration ${iteration}! Specialized crashed: ${e.message}`);
        console.log(e.stack);
        fs.writeFileSync('fuzz_bug_riddle.json', JSON.stringify(riddle, null, 2));
        console.log("Riddle saved to fuzz_bug_riddle.json");
        break;
    }

    // Compare logs
    const full_log = full_result.output.join("\n");
    const specialized_log = specialized_result.output.join("\n");

    if (full_log !== specialized_log) {
        console.log(`\nBUG FOUND on iteration ${iteration}!`);
        console.log("=".repeat(80));

        fs.writeFileSync('fuzz_bug_riddle.json', JSON.stringify(riddle, null, 2));
        console.log("Riddle saved to fuzz_bug_riddle.json");

        // Find and show first differing line
        const full_lines = full_result.output;
        const spec_lines = specialized_result.output;
        for (let i = 0; i < Math.max(full_lines.length, spec_lines.length); i++) {
            if (full_lines[i] !== spec_lines[i]) {
                console.log(`First difference at line ${i}:`);
                console.log(`  Full:        ${full_lines[i] ?? "(end of output)"}`);
                console.log(`  Specialized: ${spec_lines[i] ?? "(end of output)"}`);
                break;
            }
        }

        fs.writeFileSync('fuzz_full_log.txt', full_log);
        fs.writeFileSync('fuzz_specialized_log.txt', specialized_log);
        console.log("Logs saved to fuzz_full_log.txt and fuzz_specialized_log.txt");
        break;
    }

    console.log(`Iteration ${iteration}: OK (seed=${seed})`);
}
