import fs from 'fs';

export const swogi = JSON.parse(fs.readFileSync('swogi.json', 'utf8'));
export const names_json = JSON.parse(fs.readFileSync('names.json', 'utf8'));