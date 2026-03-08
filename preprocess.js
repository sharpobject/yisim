#!/usr/bin/env bun

import { preprocessJavaScript } from './preprocessor.js';
import fs from 'fs';
import { execSync } from 'child_process';
import { deps } from './deps.js';

// HAS_SHADOW_OWL_REISHI -> HAS_FLYING_BRUSH

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


// Define the features we want to enable
// const defines = {};
// for (let x in deps) {
//     defines[x] = true;
// }

// Get the input file from command line arguments
// const args = process.argv.slice(2);
// if (args.length !== 1) {
//     console.error('Usage: node preprocess.js <input-file>');
//     process.exit(1);
// }

export function preprocess_plz(config) {
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
                console.log("I'm visiting " + key);
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
    console.log(defines);
    // for (let key in deps) {
    //     defines[key] = true;
    // }
    const sourceCode = fs.readFileSync("gamestate.jscpp", 'utf8');
    const processedCode = preprocessJavaScript(sourceCode, defines);
    fs.writeFileSync("gamestate.js", processedCode);
    execSync("make clean");
    execSync("make");
}

export function make_full_gamestate() {
    const defines = {};
    for (let key in deps) {
        defines[key] = true;
    }
    const sourceCode = fs.readFileSync("gamestate.jscpp", 'utf8');
    const processedCode = preprocessJavaScript(sourceCode, defines);
    fs.writeFileSync("gamestate_full.js", processedCode);
}

make_full_gamestate();
