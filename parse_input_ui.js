import { card_name_to_id_fuzzy, ready } from './card_name_to_id_fuzzy.js';

function parse_input(json) {
  let jsonData = json;

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

  // jsonData.a.cards = jsonData.a.cards.map(card_name_to_id_fuzzy);
  // jsonData.b.cards = jsonData.b.cards.map(card_name_to_id_fuzzy);

  return jsonData;
}

export { parse_input, ready };