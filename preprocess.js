#!/usr/bin/env bun

import { preprocessJavaScript } from './preprocessor.js';
import fs from 'fs';

// Define the features we want to enable
const defines = {
  HAS_GUARD_UP: true,
  HAS_COVERT_SHIFT: true,
  HAS_METAL_SPIRIT_GIANT_TRIPOD: true,
  HAS_FIRE_FLAME_BLADE: true,
  HAS_PENETRATE: true,
  HAS_WATER_SPIRIT_SPRING: true,
  HAS_WOUND: true,
};

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