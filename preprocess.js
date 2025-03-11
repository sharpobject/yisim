#!/usr/bin/env bun

import { preprocessJavaScript } from './preprocessor.js';
import fs from 'fs';

// HAS_SHADOW_OWL_REISHI -> HAS_FLYING_BRUSH

const deps = {
    HAS_BAD_OMEN: ["37204", "bad_omen_stacks"],
    HAS_BLOSSOM_DANCE: ["blossom_dance_stacks"],
    HAS_COURAGE_TO_FIGHT: ["courage_to_fight_stacks"],
    HAS_COVERT_SHIFT: ["22602", "covert_shift_stacks"],
    HAS_CRASH_FIST_ENTANGLE: ["14202", "crash_fist_entangle_stacks"],
    HAS_CYCLE_OF_FIVE_ELEMENTS_AND_FRIENDS: [
        "HAS_P2_CYCLE_OF_FIVE_ELEMENTS",
        "HAS_P3_CYCLE_OF_FIVE_ELEMENTS",
        "HAS_P4_CYCLE_OF_FIVE_ELEMENTS",
        "HAS_P5_CYCLE_OF_FIVE_ELEMENTS",
        "HAS_BLOSSOM_DANCE"],
    HAS_P2_CYCLE_OF_FIVE_ELEMENTS: ["p2_cycle_of_five_elements_stacks"],
    HAS_P3_CYCLE_OF_FIVE_ELEMENTS: ["p3_cycle_of_five_elements_stacks"],
    HAS_P4_CYCLE_OF_FIVE_ELEMENTS: ["p4_cycle_of_five_elements_stacks"],
    HAS_P5_CYCLE_OF_FIVE_ELEMENTS: ["p5_cycle_of_five_elements_stacks"],
    HAS_ENTANGLING_ANCIENT_VINE: ["36503", "entangling_ancient_vine_stacks"],
    HAS_FIRE_FLAME_BLADE: ["fire_flame_blade_stacks"],
    HAS_GUARD_UP: ["peach_branch_ruyi_stacks", "guard_up",
        "36403", "12409", "24302", "31501", "34402", "40501",
        "40502", "60509", "61502", "90403", "91503", "91601"],
    HAS_IGNORE_GUARD_UP: ["91601", "ignore_guard_up"],
    HAS_INTERNAL_INJURY: ["HAS_TOXIC_PURPLE_FERN",
        "HAS_MARK_OF_DARK_HEART",
        "HAS_HEARTBROKEN_TUNE",
        "HAS_MEDITATION_OF_XUAN",
        "HAS_CACOPOISONOUS_FORMATION",
        "HAS_ZONGZI_MODE",
        "internal_injury",
        "12210", "12307", "12410", "14108", "14308", "14505",
        "14506", "22401", "24401", "24501", "24502", "32202",
        "32303", "32503", "33403", "34301", "37303", "37501",
        "40301", "60301", "60507", "60601", "62303", "64301",
        "72502", "92401", "94402"],
    HAS_MARK_OF_DARK_HEART: ["HAS_P2_MARK_OF_DARK_HEART",
        "HAS_P2_MARK_OF_DARK_HEART",
        "HAS_P4_MARK_OF_DARK_HEART",
        "HAS_P5_MARK_OF_DARK_HEART"],
    HAS_P2_MARK_OF_DARK_HEART: ["p2_mark_of_dark_heart_stacks"],
    HAS_P3_MARK_OF_DARK_HEART: ["p3_mark_of_dark_heart_stacks"],
    HAS_P4_MARK_OF_DARK_HEART: ["p4_mark_of_dark_heart_stacks"],
    HAS_P5_MARK_OF_DARK_HEART: ["p5_mark_of_dark_heart_stacks"],
    HAS_METAL_SPIRIT_GIANT_TRIPOD: ["13504", "metal_spirit_giant_tripod_stacks"],
    HAS_PENETRATE: ["13108", "13207", 
        "13308", "13407", "23104", "63401", "73502", "13307",
        "p5_cycle_of_five_elements_stacks",
        "five_elements_anima_stacks",
        "penetrate"],
    HAS_TOXIC_PURPLE_FERN: ["toxic_purple_fern_stacks"],
    HAS_WATER_SPIRIT_SPRING: ["13310", "water_spirit_spring_stacks"],
    HAS_WOUND: ["wound", "HAS_CRASH_FIST_ENTANGLE",
        "HAS_ENTANGLING_ANCIENT_VINE",
        "HAS_BAD_OMEN",
        "HAS_COURAGE_TO_FIGHT",
        "14107", "14308", "14506", "22401", "24501", "24502",
        "32202", "33403", "34301", "60302", "60503", "60602",
        "61501", "64301"],
    HAS_DECREASE_ATK: ["HAS_ANTHOMANIA_FORMATION", "decrease_atk",
        "14407", "14506", "22401", "24501", "32202", "33403",
        "34301", "64301"],
    HAS_IGNORE_DECREASE_ATK: ["14506", "ignore_decrease_atk"],
    HAS_WEAKEN: ["weaken",
        "12208", "12402", "14207", "14506", "22102", "22401",
        "24501", "24502", "32202", "32403", "32503", "33403",
        "34301", "40401", "60504", "64301", "90403"],
    HAS_IGNORE_WEAKEN: ["14506", "21302", "ignore_weaken"],
    HAS_FLAW: ["flaw",
        "12304", "14206", "14506", "22102", "22401", "24501",
        "24502", "32202", "32402", "32503", "33403", "34301",
        "40402", "60509", "61101", "64301"],
    HAS_ENTANGLE: ["entangle",
        "14305", "14506", "22401", "24501", "24502", "32202",
        "33403", "34301", "36503", "40503", "60507", "64301",
        "90602"],
    HAS_STYX: ["styx", "HAS_ENTERING_STYX",
        "14506", "22401", "24501", "32202", "33403", "64301",
        "64401", "64501", "94401"],
    HAS_ENTERING_STYX: ["entering_styx_stacks"],
    HAS_PREVENT_ANTI_CHASE: ["prevent_anti_chase", "93601"],
    HAS_ACTIVATE_WOOD: ["activate_wood_spirit_stacks",
        "HAS_ACTIVATE_ANY",
        "13101", "23101", "63201", "63302", "93601"],
    HAS_ACTIVATE_FIRE: ["activate_fire_spirit_stacks",
        "HAS_ACTIVATE_ANY",
        "13103", "23102", "63302", "93301", "93401", "93601"],
    HAS_ACTIVATE_EARTH: ["activate_earth_spirit_stacks",
        "HAS_ACTIVATE_ANY",
        "13105", "23103", "63301", "63302", "93301", "93601"],
    HAS_ACTIVATE_METAL: ["activate_metal_spirit_stacks",
        "HAS_ACTIVATE_ANY",
        "13107", "23104", "63301", "63302", "93601"],
    HAS_ACTIVATE_WATER: ["activate_water_spirit_stacks",
        "HAS_ACTIVATE_ANY",
        "13109", "23105", "63302", "93401", "93601"],
    HAS_ACTIVATE_ANY: ["13311", "63402", "93502",
        "HAS_COSMOS_SEAL", "HAS_ACTIVATE_NEXT"],
    HAS_COSMOS_SEAL: ["HAS_MARK_OF_FIVE_ELEMENTS", "13211"],
    HAS_ACTIVATE_NEXT: ["93201"],
    HAS_MARK_OF_FIVE_ELEMENTS: ["mark_of_five_elements_stacks"],
    HAS_ZONGZI_MODE: [],

};


// Define the features we want to enable
const defines = {};
for (let x in deps) {
    defines[x] = true;
}

// Get the input file from command line arguments
const args = process.argv.slice(2);
if (args.length !== 1) {
    console.error('Usage: node preprocess.js <input-file>');
    process.exit(1);
}

const inputFile = args[0];

try {
    // Read the input file
    const sourceCode = fs.readFileSync(inputFile, 'utf8');
    
    // Process the code
    const processedCode = preprocessJavaScript(sourceCode, defines);
    
    // Output to stdout
    process.stdout.write(processedCode);
} catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
}