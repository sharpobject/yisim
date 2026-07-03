// Browser-compatible specialization of the gamestate engine.
// Imports deps from deps.js (single source of truth, shared with CLI preprocess.js).

import { deps } from './deps.js';
import { preprocessJavaScript } from './preprocessor.js';

const implies = {};
for (let x in deps) {
    let ys = deps[x];
    for (let y of ys) {
        if (implies[y] === undefined) {
            implies[y] = [];
        }
        implies[y].push(x);
    }
}

function resolveDefines(config) {
    const defines = {};
    const visited = {};
    let go = true;
    while (go) {
        go = false;
        const new_defines = {};
        for (let xd of [config, defines]) {
            for (let key in xd) {
                if (visited[key]) {
                    continue;
                }
                visited[key] = true;
                go = true;
                if (implies[key] !== undefined) {
                    for (let implies_key of implies[key]) {
                        if (defines[implies_key] === undefined) {
                            new_defines[implies_key] = true;
                        }
                    }
                }
            }
        }
        for (let new_key in new_defines) {
            defines[new_key] = true;
        }
    }
    return defines;
}

// Take the raw gamestate.jscpp source and a preprocessor config,
// and return a code string suitable for new Function() injection.
// The result has no import/export statements, no this.log() calls,
// and returns { Player, GameState } when called.
export function specializeGamestate(gamestateSource, config) {
    const defines = resolveDefines(config);

    // Run the C-preprocessor-style preprocessing
    let code = preprocessJavaScript(gamestateSource, defines);

    // Transform from ES module to injectable function body:
    const lines = code.split('\n');
    const out = [];
    for (let line of lines) {
        const trimmed = line.trim();
        // Replace the import line with stance constants (other imports are passed as function args)
        if (trimmed.startsWith('import ') && trimmed.includes('card_info')) {
            out.push('const NO_STANCE = 0;');
            out.push('const FIST_STANCE = 1;');
            out.push('const STICK_STANCE = -1;');
            continue;
        }
        // Remove export { ready };
        if (trimmed === 'export { ready };') {
            continue;
        }
        // Strip this.log(...) calls for nolog
        if (/^\s*this\.log\(/.test(line)) {
            continue;
        }
        // Remove 'export' keyword from declarations
        if (trimmed.startsWith('export class ') ||
            trimmed.startsWith('export const ') ||
            trimmed.startsWith('export function ')) {
            out.push(line.replace('export ', ''));
            continue;
        }
        out.push(line);
    }

    out.push('return { Player, GameState };');
    return out.join('\n');
}
