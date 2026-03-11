#!/usr/bin/env bun

import { preprocessJavaScript } from './preprocessor.js';
import fs from 'fs';
import { execSync } from 'child_process';
import { deps, config_implies_config } from './deps.js';

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

const sourceCode = fs.readFileSync("gamestate.jscpp", 'utf8');

export function resolve_defines(config) {
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
                if (config_implies_config[key] !== undefined) {
                    for (let implied_key of config_implies_config[key]) {
                        if (defines[implied_key] === undefined) {
                            new_defines[implied_key] = true;
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

export function preprocess_to_string(config) {
    const defines = resolve_defines(config);
    return preprocessJavaScript(sourceCode, defines);
}

export function preprocess_plz(config) {
    const defines = resolve_defines(config);
    console.log(defines);
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
    const processedCode = preprocessJavaScript(sourceCode, defines);
    fs.writeFileSync("gamestate_full.js", processedCode);
}

make_full_gamestate();
