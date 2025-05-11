import { card_name_to_id_fuzzy, guess_character } from './gamestate_full_ui.js';
import example from './example.json';

export default function(json) {

  let jsonData = json;
  // if (/^\s*\{/.test(dataString)) {
  //   jsonData = JSON.parse(dataString);
  // } else {
  //   jsonData = {
  //     a: { physique: 0, max_physique: 0, cards: [] },
  //     b: { physique: 0, max_physique: 0, cards: [] },
  //   };
  //   const lines = dataString.split(/\r\n|\r|\n/).map((s) => s.trim()).filter((s) => s.length);
  //   let section = 0;
  //   for (let line of lines) {
  //     const comment = line.indexOf('#');
  //     if (comment !== -1) {
  //       line = line.substring(0, comment).trimEnd();
  //       if (!line.length) {
  //         continue;
  //       }
  //     }
  //     if (line === 'a:') {
  //       section = 1;
  //       continue;
  //     }
  //     if (line === 'b:') {
  //       section = 2;
  //       continue;
  //     }
  //     const colon = line.indexOf(':');
  //     if (colon === -1) {
  //       (section === 1 ? jsonData.a : jsonData.b).cards.push(line);
  //     } else {
  //       const leftSide = line.substring(0, colon).trimEnd().replaceAll(' ', '_');
  //       let rightSide = line.substring(colon + 1).trimStart();
  //       switch (rightSide) {
  //         case 'true':
  //         case 'yes':
  //           rightSide = true;
  //           break;
  //         case 'false':
  //         case 'no':
  //           rightSide = false;
  //           break;
  //         default:
  //           if (!isNaN(rightSide)) {
  //             rightSide = +rightSide;
  //           }
  //       }
  //       if (section === 0) {
  //         if (leftSide === 'permute') {
  //           if (rightSide === 'a') {
  //             jsonData.permute_a = true;
  //           } else if (rightSide === 'b') {
  //             jsonData.permute_b = true;
  //           }
  //         } else {
  //           jsonData[leftSide] = rightSide;
  //         }
  //       } else {
  //         (section === 1 ? jsonData.a : jsonData.b)[leftSide] = rightSide;
  //       }
  //     }
  //   }
  // }

  if (jsonData.permute_a && jsonData.permute_b) {
    console.error('Permuting both players not supported.');
    process.exit(1);
  }

  if (jsonData.players) {
    jsonData.a = jsonData.players[0];
    jsonData.b = jsonData.players[1];
    delete jsonData.players;
  }

  jsonData.a.max_hp = jsonData.a.hp + jsonData.a.physique;
  jsonData.b.max_hp = jsonData.b.hp + jsonData.b.physique;

  const deck_slots = jsonData.deck_slots || 8;
  while (jsonData.a.cards.length < deck_slots) {
    jsonData.a.cards.push('normal attack');
  }
  while (jsonData.b.cards.length < deck_slots) {
    jsonData.b.cards.push('normal attack');
  }

  jsonData.a.cards = jsonData.a.cards.map(card_name_to_id_fuzzy);
  jsonData.b.cards = jsonData.b.cards.map(card_name_to_id_fuzzy);

  if (!jsonData.a.character) {
    jsonData.a.character = guess_character(jsonData.a);
  }
  if (!jsonData.b.character) {
    jsonData.b.character = guess_character(jsonData.b);
  }

  return jsonData;
}
