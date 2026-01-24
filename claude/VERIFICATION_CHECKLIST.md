# Card Verification Checklist

Each card has 3 level variants. Verify each level separately.

- **Act 1/2/3**: card_actions.js matches CSV for that level
- **Cost 1/2/3**: swogi.json hp_cost OR qi_cost matches CSV
- **Open 1/2/3**: swogi.json opening effects match CSV

## How to Continue Verification

1. Use `verify_cards.py` to check batches of cards:
   ```bash
   python3 verify_cards.py 12101 12102 12103 12104 12105 12106
   ```

2. Manually verify each card's implementation matches CSV text

3. Update this file with [x] for verified items, [!] for issues

4. Get base IDs for a sect:
   ```bash
   python3 -c "
   import json
   with open('swogi.json') as f:
       swogi = json.load(f)
   bases = sorted(set(cid[:-1] for cid in swogi if cid.startswith('12') and len(cid)==6 and cid.endswith('1')))
   print(' '.join(bases))
   "
   ```

## Legend
- [x] = Verified, matches CSV
- [ ] = Not yet checked
- [!] = Issue found (see notes in row)

---

## Sect 1 (Cloud Sword) (52 cards) - VERIFIED

| Base ID | Name | Act 1 | Act 2 | Act 3 | Cost 1 | Cost 2 | Cost 3 | Open 1 | Open 2 | Open 3 |
|---------|------|-------|-------|-------|--------|--------|--------|--------|--------|--------|
| 11101 | Cloud Sword - Touch Sky | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 11102 | Cloud Sword - Fleche | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 11103 | Cloud Sword - Touch Earth | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 11104 | Light Sword | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 11105 | Guard Qi | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 11106 | Qi Perfusion | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 11107 | Giant Tiger Spirit Sword | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 11108 | Thunder Sword | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 11109 | Sword Slash | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 11110 | Sword Defence | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 11111 | Flying Fang Sword | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 11112 | Wind Sword | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 11201 | Cloud Sword - Reguard | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 11202 | Cloud Sword - Riddle | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 11203 | Cloud Sword - Conceal | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 11204 | Transforming Spirits Rhythm | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 11205 | Spiritage Sword | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 11206 | Giant Whale Spirit Sword | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 11207 | Contemplate Spirits Rhythm | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 11208 | Consonance Sword Formation | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 11209 | Earth Evil Sword | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 11210 | Form-Intention Sword | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 11211 | Unrestrained Sword - One | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 11301 | Cloud Sword - Softheart | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 11302 | Cloud Sword - Necessity | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 11303 | Cloud Sword - Pierce the Star | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 11304 | Cloud Sword - Spirit Coercion | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 11305 | Cloud Dance Rhythm | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 11306 | Raven Spirit Sword | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 11307 | Burst Sword | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 11308 | Giant Roc Spirit Sword | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 11309 | Reflexive Sword | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 11310 | Mirror Flower Sword Formation | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 11311 | Tri-Peak Sword | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 11401 | Cloud Sword - Flash Wind | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 11402 | Cloud Sword - Moon Shade | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 11403 | Spirit Gather Citta-Dharma | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 11404 | CentiBird Spirit Sword Rhythm | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 11405 | Egret Spirit Sword | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 11406 | Giant Kun Spirit Sword | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 11407 | Inspiration Sword | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 11408 | Flow Cloud Chaos Sword | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 11409 | Moon Water Sword Formation | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 11410 | Unrestrained Sword - Two | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 11501 | Cloud Sword - Dragon Roam | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 11502 | Cloud Sword - Step Lightly | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 11503 | Flying Spirit Shade Sword | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 11504 | Dharma Spirit Sword | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 11505 | Sword Intent Surge | [x] | [x] | [x] | [!] | [!] | [!] | [x] | [x] | [x] | COST MISMATCH: swogi qi=1, CSV qi=0
| 11506 | Rule Sky Sword Formation | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 11507 | Chain Sword Formation | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 11508 | Unrestrained Sword - Zero | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |

## Sect 2 (Star Palace) (52 cards) - VERIFIED

| Base ID | Name | Act 1 | Act 2 | Act 3 | Cost 1 | Cost 2 | Cost 3 | Open 1 | Open 2 | Open 3 |
|---------|------|-------|-------|-------|--------|--------|--------|--------|--------|--------|
| 12101 | Shifting Stars | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 12102 | Dotted Around | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 12103 | Astral Move - Block | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 12104 | Astral Move - Flank | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 12105 | Zhen Hexagram | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 12106 | Earth Hexagram | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 12107 | Wind Hexagram | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 12108 | Palm Thunder | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 12109 | White Crane Bright Wings | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 12110 | Sparrow's Tail | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 12111 | Striding Into the Wind | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 12112 | Incessant | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 12201 | Astral Fleche | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 12202 | Astral Move - Point | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 12203 | Astral Move - Stand | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 12204 | Mountain Hexagram | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 12205 | Water Hexagram | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 12206 | Falling Thunder | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 12207 | Cutting Weeds | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 12208 | Golden Rooster Independence | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 12209 | Stillness Citta-Dharma | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 12210 | Flower Sentient | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 12211 | Imposing | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 12301 | Starry Moon | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 12302 | Astral Move - Hit | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 12303 | Lake Hexagram | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 12304 | White Snake | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 12305 | Thunder Hexagram Rhythm | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 12306 | Yin Yang Formation | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 12307 | Ruthless Water | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 12308 | Qi Therapy | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 12309 | Revitalized | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 12310 | Hunter Becomes Preyer | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 12311 | Drag Moon In Sea | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 12401 | Astral Move - Fly | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 12402 | Astral Move - Tiger | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 12403 | Hexagram Formacide | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 12404 | Flame Hexagram | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 12405 | Star Trail Divination | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 12406 | Dance Of The Dragonfly | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 12407 | Thunder And Lighting | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 12408 | Repel Citta-Dharma | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 12409 | Escape Plan | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 12410 | Extremely Suspicious | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 12501 | Polaris Citta-Dharma | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 12502 | Astral Move - Cide | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 12503 | Heaven Hexagram | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 12504 | Five Thunders | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 12505 | Strike Twice | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 12506 | Great Spirit | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 12507 | Hunter Hunting Hunter | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 12508 | Propitious Omen | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |

## Sect 3 (Five Elements) (51 cards) - VERIFIED

| Base ID | Name | Act 1 | Act 2 | Act 3 | Cost 1 | Cost 2 | Cost 3 | Open 1 | Open 2 | Open 3 |
|---------|------|-------|-------|-------|--------|--------|--------|--------|--------|--------|
| 13101 | Wood Spirit Seal | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 13102 | Wood Spirit - Bud | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 13103 | Fire Spirit Seal | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 13104 | Fire Spirit - Rush | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 13105 | Earth Spirit Seal | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 13106 | Earth Spirit - Smash | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 13107 | Metal Spirit Seal | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 13108 | Metal Spirit - Needle | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 13109 | Water Spirit Seal | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 13110 | Water Spirit - Waves | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 13111 | Five Elements Fleche | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 13201 | Wood Spirit - Recovery | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 13202 | Wood Spirit - Sparse Shadow | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 13203 | Fire Spirit - Flame Eater | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 13204 | Fire Spirit - Scarlet Flame | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 13205 | Earth Spirit Formation | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 13206 | Earth Spirit - Mountains | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 13207 | Metal Spirit Formation | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 13208 | Metal Spirit - Heart Pierce | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 13209 | Water Spirit - Billows | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 13210 | Water Spirit - Turbulent | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 13211 | Cosmos Seal | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 13301 | Wood Spirit Formation | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 13302 | Wood Spirit - Forest Guard | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 13303 | Fire Spirit Formation | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 13304 | Fire Spirit - Blast | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 13305 | Earth Spirit - Dust | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 13306 | Earth Spirit - Cliff | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 13307 | Metal Spirit - Charge | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 13308 | Metal Spirit - Sharp | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 13309 | Water Spirit Formation | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 13310 | Water Spirit - Spring | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 13311 | Five Elements Circulation | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 13401 | Wood Spirit - Fragrant | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 13402 | Wood Spirit - Thorn | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 13403 | Fire Spirit - Flash Fire | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 13404 | Fire Spirit - Heart Fire | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 13405 | Earth Spirit - Steep | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 13406 | Earth Spirit - Quicksand | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 13407 | Metal Spirit - Shuttle | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 13408 | Metal Spirit - Iron Bone | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 13409 | Water Spirit - Great Waves | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 13410 | Water Spirit - Dive | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 13411 | World Smash | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 13501 | Wood Spirit - Willow Leaf | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 13502 | Fire Spirit - Blazing Prairie | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 13503 | Earth Spirit - Combine World | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 13504 | Metal Spirit - Giant Tripod | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 13505 | Water Spirit - Combine Rivers | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 13506 | Ultimate World Formation | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 13507 | Five Elements Heavenly Marrow Rhythm | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |

## Sect 4 (Heavenly Feather) (52 cards) - VERIFIED

| Base ID | Name | Act 1 | Act 2 | Act 3 | Cost 1 | Cost 2 | Cost 3 | Open 1 | Open 2 | Open 3 |
|---------|------|-------|-------|-------|--------|--------|--------|--------|--------|--------|
| 14101 | Crash Fist - Poke | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 14102 | Crash Fist - Block | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 14103 | Crash Fist - Bounce | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 14104 | Exercise Fist | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 14105 | Mountain-Cleaving Palms | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 14106 | Embracing Qi Technique | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 14107 | Rakshasa Pouncing | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 14108 | Sky-Piercing Claw | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 14109 | Mountain Falling | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 14110 | Gather Force | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 14111 | Vigorous Force | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 14112 | Youthful Vigor | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 14201 | Crash Fist - Shake | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 14202 | Crash Fist - Entangle | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 14203 | Crash Fist - Blitz | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 14204 | Exercise Tendons | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 14205 | Detect-Horse Palms | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 14206 | Gale Shadow Claw | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 14207 | Ghost Howling | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 14208 | Standing Firm | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 14209 | Strong Force | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 14210 | Sinking Qi | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 14211 | Magnanimous Righteousness | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 14301 | Crash Footwork | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 14302 | Crash Fist - Truncate | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 14303 | Crash Fist - Subdue Dragon | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 14304 | Exercise Bones | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 14305 | Bearing the Load | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 14306 | Windward Palms | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 14307 | Tiger Pouncing | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 14308 | Double Trouble | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 14309 | Majestic Qi | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 14310 | Sailing through Sky | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 14311 | Mighty Force | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 14401 | Crash Citta-Dharma | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 14402 | Crash Fist - Inch Force | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 14403 | Crash Fist - Continue | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 14404 | Exercise Marrow | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 14405 | Crane Footwork | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 14406 | Elusive Footwork | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 14407 | Styx Agility | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 14408 | Soul Seizing | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 14409 | Surging Waves | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 14410 | Overwhelming Force | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 14501 | Crash Fist - Blink | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 14502 | Crash Fist - Shocked | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 14503 | Exercise Soul | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 14504 | Realm-Killing Palms | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 14505 | Shura Roar | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 14506 | Soul Cleaving | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 14507 | Gather Intense Force | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 14508 | Vast Universe | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |

## S1 Secret Enchantment (14 cards) - VERIFIED

| Base ID | Name | Act 1 | Act 2 | Act 3 | Cost 1 | Cost 2 | Cost 3 | Open 1 | Open 2 | Open 3 |
|---------|------|-------|-------|-------|--------|--------|--------|--------|--------|--------|
| 21101 | Rhyme Spirit Sword | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 21102 | Diligent Sword | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 21201 | Cloud Sword - Dawn | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 21202 | Giant Ape Spirit Sword | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 21301 | Unrestrained Sword - Dragon Coiled | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 21302 | One Heart One Sword | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 21303 | Synergy Sword Formation | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 21401 | Sword Intent Flow | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 21402 | Emptiness Sword Formation | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 21501 | Apex Sword Citta-Dharma | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 21502 | Step Moon Into Cloud | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 21503 | Unrestrained Sword - Twin Dragons | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 21601 | Remnant Cloud Sky Sealing Sword | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 21602 | Secret Sword - Spirit Cloud | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |

## S2 Secret Enchantment (14 cards) - VERIFIED

| Base ID | Name | Act 1 | Act 2 | Act 3 | Cost 1 | Cost 2 | Cost 3 | Open 1 | Open 2 | Open 3 |
|---------|------|-------|-------|-------|--------|--------|--------|--------|--------|--------|
| 22101 | Hexagrams Spirit Resurrection | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 22102 | Throwing Stones For Directions | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 22201 | Vitality Blossom | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 22202 | Star Born Rhythm | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 22301 | Sun And Moon For Glory | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 22302 | All-Or-Nothing | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 22401 | Flowers And Water | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 22402 | Astral Move - Dragon Slay | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 22403 | Thunder Citta-Dharma | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 22501 | Thin On The Ground | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 22502 | Preemptive Strike | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 22503 | Meteorite Meteor | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 22601 | Destiny Catastrophe | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 22602 | Covert Shift | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |

## S3 Secret Enchantment (18 cards) - VERIFIED

| Base ID | Name | Act 1 | Act 2 | Act 3 | Cost 1 | Cost 2 | Cost 3 | Open 1 | Open 2 | Open 3 | Notes |
|---------|------|-------|-------|-------|--------|--------|--------|--------|--------|--------|-------|
| 23101 | Wood Spirit Secret Seal | [x] | [!] | [!] | [x] | [x] | [x] | [x] | [x] | [x] | L2/L3: wrong stack counts (CSV=2, impl=3/4), missing HP effects |
| 23102 | Fire Spirit Secret Seal | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | |
| 23103 | Earth Spirit Secret Seal | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | |
| 23104 | Metal Spirit Secret Seal | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | |
| 23105 | Water Spirit Secret Seal | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | |
| 23201 | Metal Spirit - Chokehold | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | |
| 23202 | Water Spirit - Rhythm Wood | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | |
| 23203 | Fire Spirit - Rhythm Earth | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | |
| 23301 | Wood Spirit - Vine | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | |
| 23302 | Metal Spirit - Rhythm Water | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | |
| 23303 | Five Elements Escape | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | FALSE POSITIVE: get_n_activated uses #ifdef preprocessor |
| 23401 | Earth Spirit - Earthquake | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | |
| 23402 | Wood Spirit - Rhythm Fire | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | |
| 23403 | Earth Spirit - Rhythm Metal | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | |
| 23501 | Fire Spirit - Burning Sky | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | |
| 23502 | Water Spirit - Tsunami | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | |
| 23601 | Five Elements Spirit Blast | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | |
| 23602 | Five Elements Blossom | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | |

## S4 Secret Enchantment (12 cards) - VERIFIED

| Base ID | Name | Act 1 | Act 2 | Act 3 | Cost 1 | Cost 2 | Cost 3 | Open 1 | Open 2 | Open 3 |
|---------|------|-------|-------|-------|--------|--------|--------|--------|--------|--------|
| 24101 | Endless Entanglement | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 24102 | Endless Force | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 24201 | Toxin Immunity | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 24202 | Lying Drunk | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 24302 | Break Pots and Sink Boats | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 24401 | Strength Driven Mad | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 24402 | Crash Fist - Double | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 24403 | Styx Three Hit | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 24501 | Break Cocoon | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 24502 | Eerie Melody Buries Soul | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 24601 | Endless Crash | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 24602 | Return to Simplicity | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |

## Elixirist (10 cards) - VERIFIED

| Base ID | Name | Act 1 | Act 2 | Act 3 | Cost 1 | Cost 2 | Cost 3 | Open 1 | Open 2 | Open 3 | Notes |
|---------|------|-------|-------|-------|--------|--------|--------|--------|--------|--------|-------|
| 31101 | Earth Spirit Elixir | [x] | [x] | [x] | [x] | [x] | [x] | [-] | [-] | [-] | |
| 31102 | Fundamental Elixir | [x] | [x] | [x] | [x] | [x] | [x] | [-] | [-] | [-] | |
| 31103 | Small Recover Elixir | [x] | [x] | [x] | [x] | [x] | [x] | [-] | [-] | [-] | |
| 31201 | Cloud Elixir | [x] | [x] | [x] | [x] | [x] | [x] | [-] | [-] | [-] | |
| 31202 | Exorcism Elixir | [x] | [x] | [x] | [x] | [x] | [x] | [-] | [-] | [-] | |
| 31301 | Healing Elixir | [x] | [x] | [x] | [x] | [x] | [x] | [-] | [-] | [-] | |
| 31302 | Divine Power Elixir | [x] | [x] | [x] | [x] | [x] | [x] | [-] | [-] | [-] | |
| 31401 | Great Recover Elixir | [x] | [x] | [x] | [x] | [x] | [x] | [-] | [-] | [-] | |
| 31402 | Spiritage Elixir | [x] | [x] | [x] | [x] | [x] | [x] | [-] | [-] | [-] | |
| 31501 | Ice Spirit Guard Elixir | [x] | [x] | [x] | [x] | [x] | [x] | [-] | [-] | [-] | |

## Fuluist (15 cards) - VERIFIED

| Base ID | Name | Act 1 | Act 2 | Act 3 | Cost 1 | Cost 2 | Cost 3 | Open 1 | Open 2 | Open 3 | Notes |
|---------|------|-------|-------|-------|--------|--------|--------|--------|--------|--------|-------|
| 32101 | Thunder Fulu | [x] | [x] | [x] | [x] | [x] | [x] | [-] | [-] | [-] | |
| 32102 | Guard Spirit Fulu | [x] | [x] | [x] | [x] | [x] | [x] | [-] | [-] | [-] | |
| 32103 | Sharp Metal Fulu | [x] | [x] | [x] | [x] | [x] | [x] | [-] | [-] | [-] | |
| 32201 | Fire Cloud Fulu | [x] | [x] | [x] | [x] | [x] | [x] | [-] | [-] | [-] | |
| 32202 | Calm Incantation | [x] | [x] | [x] | [x] | [x] | [x] | [-] | [-] | [-] | |
| 32203 | Mist Fulu | [x] | [x] | [x] | [x] | [x] | [x] | [-] | [-] | [-] | |
| 32301 | Ice Incantation | [x] | [x] | [x] | [x] | [x] | [x] | [-] | [-] | [-] | |
| 32302 | Spirit Absorb Fulu | [x] | [x] | [x] | [x] | [x] | [x] | [-] | [-] | [-] | |
| 32303 | Miasma Fulu | [x] | [x] | [x] | [x] | [x] | [x] | [-] | [-] | [-] | |
| 32401 | Spiritage Incantation | [x] | [x] | [x] | [x] | [x] | [x] | [-] | [-] | [-] | |
| 32402 | Distubing Fulu | [x] | [x] | [x] | [x] | [x] | [x] | [-] | [-] | [-] | |
| 32403 | Weaken Fulu | [x] | [x] | [x] | [x] | [x] | [x] | [-] | [-] | [-] | |
| 32501 | Soul Requiem Fulu | [x] | [x] | [x] | [x] | [x] | [x] | [-] | [-] | [-] | |
| 32502 | Divine Walk Fulu | [x] | [x] | [x] | [x] | [x] | [x] | [-] | [-] | [-] | |
| 32503 | Thousand Evil Incantation | [x] | [x] | [x] | [x] | [x] | [x] | [-] | [-] | [-] | |

## Musician (15 cards) - VERIFIED

| Base ID | Name | Act 1 | Act 2 | Act 3 | Cost 1 | Cost 2 | Cost 3 | Open 1 | Open 2 | Open 3 | Notes |
|---------|------|-------|-------|-------|--------|--------|--------|--------|--------|--------|-------|
| 33101 | Cracking Voice | [x] | [x] | [x] | [x] | [x] | [x] | [-] | [-] | [-] | |
| 33102 | Earth Tune | [x] | [x] | [x] | [x] | [x] | [x] | [-] | [-] | [-] | |
| 33103 | Carefree Tune | [x] | [x] | [x] | [x] | [x] | [x] | [-] | [-] | [-] | |
| 33201 | Kindness Tune | [x] | [x] | [x] | [x] | [x] | [x] | [-] | [-] | [-] | Destiny effect is meta-game |
| 33202 | Illusion Tune | [x] | [x] | [x] | [x] | [x] | [x] | [-] | [-] | [-] | |
| 33203 | Sky Spirit Tune | [x] | [x] | [x] | [x] | [x] | [x] | [-] | [-] | [-] | |
| 33301 | Heartbroken Tune | [x] | [x] | [x] | [x] | [x] | [x] | [-] | [-] | [-] | |
| 33302 | Craze Dance Tune | [x] | [x] | [x] | [x] | [x] | [x] | [-] | [-] | [-] | |
| 33303 | Tremolo | [x] | [x] | [x] | [x] | [x] | [x] | [-] | [-] | [-] | |
| 33401 | Regen Tune | [x] | [x] | [x] | [x] | [x] | [x] | [-] | [-] | [-] | |
| 33402 | Nine Evil Ruptsprite | [x] | [x] | [x] | [x] | [x] | [x] | [-] | [-] | [-] | |
| 33403 | Concentric Tune | [x] | [x] | [x] | [x] | [x] | [x] | [-] | [-] | [-] | |
| 33501 | Predicament for Immortals | [x] | [x] | [x] | [x] | [x] | [x] | [-] | [-] | [-] | |
| 33502 | Apparition Confusion | [x] | [x] | [x] | [x] | [x] | [x] | [-] | [-] | [-] | |
| 33503 | Chord In Tune | [x] | [x] | [x] | [x] | [x] | [x] | [-] | [-] | [-] | |

## Painter (11 cards) - VERIFIED

| Base ID | Name | Act 1 | Act 2 | Act 3 | Cost 1 | Cost 2 | Cost 3 | Open 1 | Open 2 | Open 3 | Notes |
|---------|------|-------|-------|-------|--------|--------|--------|--------|--------|--------|-------|
| 34101 | Toning | [x] | [x] | [x] | [x] | [x] | [x] | [-] | [-] | [-] | |
| 34102 | Grinding Ink | [x] | [x] | [x] | [x] | [x] | [x] | [-] | [-] | [-] | |
| 34201 | Pen Walks Dragon Snake | [x] | [x] | [x] | [x] | [x] | [x] | [-] | [-] | [-] | |
| 34202 | Feed On Illusions | [x] | [x] | [x] | [x] | [x] | [x] | [-] | [-] | [-] | |
| 34203 | Gild The Lily | [x] | [x] | [x] | [x] | [x] | [x] | [-] | [-] | [-] | |
| 34301 | Splash Ink | [x] | [x] | [x] | [x] | [x] | [x] | [-] | [-] | [-] | |
| 34302 | Inspiration | [x] | [x] | [x] | [x] | [x] | [x] | [-] | [-] | [-] | |
| 34401 | Divine Brush | [!] | [!] | [!] | [x] | [x] | [x] | [-] | [-] | [-] | trigger_random_sect_card is TODO stub |
| 34402 | Falling Paper Clouds | [x] | [x] | [x] | [x] | [x] | [x] | [-] | [-] | [-] | |
| 34501 | Flying Brush | [x] | [x] | [x] | [x] | [x] | [x] | [-] | [-] | [-] | |
| 34502 | Finishing Touch | [x] | [x] | [x] | [x] | [x] | [x] | [-] | [-] | [-] | |

## Formation Master (15 cards) - VERIFIED

| Base ID | Name | Act 1 | Act 2 | Act 3 | Cost 1 | Cost 2 | Cost 3 | Open 1 | Open 2 | Open 3 | Notes |
|---------|------|-------|-------|-------|--------|--------|--------|--------|--------|--------|-------|
| 35101 | Thunderphilia Formation | [x] | [x] | [x] | [x] | [x] | [x] | [-] | [-] | [-] | |
| 35102 | Fraccide Formation | [x] | [x] | [x] | [x] | [x] | [x] | [-] | [-] | [-] | |
| 35103 | Impact Formation | [x] | [x] | [x] | [x] | [x] | [x] | [-] | [-] | [-] | |
| 35201 | Scutturtle Formation | [x] | [x] | [x] | [x] | [x] | [x] | [-] | [-] | [-] | |
| 35202 | Cacopoisonous Formation | [x] | [x] | [x] | [x] | [x] | [x] | [-] | [-] | [-] | |
| 35203 | Cure Formation | [x] | [x] | [x] | [x] | [x] | [x] | [-] | [-] | [-] | |
| 35301 | Spiritage Formation | [x] | [x] | [x] | [x] | [x] | [x] | [-] | [-] | [-] | |
| 35302 | Endless Sword Formation | [x] | [x] | [x] | [x] | [x] | [x] | [-] | [-] | [-] | |
| 35303 | Hexproof Formation | [x] | [x] | [x] | [x] | [x] | [x] | [-] | [-] | [-] | |
| 35401 | Heavenly Spirit Forceage Formation | [x] | [x] | [x] | [x] | [x] | [x] | [-] | [-] | [-] | |
| 35402 | Octgates Lock Formation | [x] | [x] | [x] | [x] | [x] | [x] | [-] | [-] | [-] | |
| 35403 | Motionless Tutelary Formation | [x] | [x] | [x] | [x] | [x] | [x] | [-] | [-] | [-] | |
| 35501 | Anthomania Formation | [x] | [x] | [x] | [x] | [x] | [x] | [-] | [-] | [-] | |
| 35502 | Echo Formation | [x] | [x] | [x] | [x] | [x] | [x] | [-] | [-] | [-] | |
| 35503 | Meru Formation | [x] | [x] | [x] | [x] | [x] | [x] | [-] | [-] | [-] | |

## Plant Master (13 cards) - VERIFIED

| Base ID | Name | Act 1 | Act 2 | Act 3 | Cost 1 | Cost 2 | Cost 3 | Open 1 | Open 2 | Open 3 | Notes |
|---------|------|-------|-------|-------|--------|--------|--------|--------|--------|--------|-------|
| 36101 | Sword Bamboo | [x] | [x] | [x] | [x] | [x] | [x] | [-] | [-] | [-] | |
| 36102 | Hard Bamboo | [x] | [x] | [x] | [x] | [x] | [x] | [-] | [-] | [-] | |
| 36202 | Mystery Seed | [x] | [x] | [x] | [x] | [x] | [x] | [-] | [-] | [-] | Meta-game transformation - empty implementation correct |
| 36203 | Leaf Shield Flower | [x] | [x] | [x] | [x] | [x] | [x] | [-] | [-] | [-] | |
| 36204 | Leaf Blade Flower | [x] | [x] | [x] | [x] | [x] | [x] | [-] | [-] | [-] | |
| 36301 | Qi-seeking Sunflower | [x] | [x] | [x] | [x] | [x] | [x] | [-] | [-] | [-] | |
| 36302 | Qi-corrupting Sunflower | [x] | [x] | [x] | [x] | [x] | [x] | [-] | [-] | [-] | |
| 36401 | Frozen Snow Lotus | [x] | [x] | [x] | [x] | [x] | [x] | [-] | [-] | [-] | |
| 36402 | Detoxific Purple Fern | [x] | [x] | [x] | [x] | [x] | [x] | [-] | [-] | [-] | |
| 36403 | Frozen Blood Lotus | [x] | [x] | [x] | [x] | [x] | [x] | [-] | [-] | [-] | |
| 36502 | Space Spiritual Field | [x] | [x] | [x] | [x] | [x] | [x] | [-] | [-] | [-] | Cul/Growth meta-game effect out of scope |
| 36503 | Entangling Ancient Vine | [x] | [x] | [x] | [x] | [x] | [x] | [-] | [-] | [-] | |
| 36504 | Devouring Ancient Vine | [x] | [x] | [x] | [x] | [x] | [x] | [-] | [-] | [-] | |

## Fortune Teller (20 cards) - VERIFIED

| Base ID | Name | Act 1 | Act 2 | Act 3 | Cost 1 | Cost 2 | Cost 3 | Open 1 | Open 2 | Open 3 | Notes |
|---------|------|-------|-------|-------|--------|--------|--------|--------|--------|--------|-------|
| 37101 | Heavenly Decree - Attack | [x] | [x] | [x] | [x] | [x] | [x] | [-] | [-] | [-] | |
| 37102 | Heavenly Decree - Defend | [x] | [x] | [x] | [x] | [x] | [x] | [-] | [-] | [-] | |
| 37103 | Foretell Fate | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | |
| 37104 | Examine Body | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | |
| 37201 | Heavenly Fortune - Seek Fortune | [x] | [x] | [x] | [x] | [x] | [x] | [-] | [-] | [-] | |
| 37202 | Heavenly Fortune - Shun Misfortune | [x] | [x] | [x] | [x] | [x] | [x] | [-] | [-] | [-] | |
| 37203 | Detect Qi | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | |
| 37204 | Bad Omen | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | |
| 37301 | Heavenly Time - Fleeting | [x] | [x] | [x] | [x] | [x] | [x] | [-] | [-] | [-] | |
| 37302 | Heavenly Time - Recurring | [x] | [x] | [x] | [x] | [x] | [x] | [-] | [-] | [-] | |
| 37303 | Disaster of Bloodshed | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | |
| 37304 | Lucky Start | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | |
| 37401 | Everything Goes Your Way | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | |
| 37402 | Heavenly Star - Guard | [x] | [x] | [x] | [x] | [x] | [x] | [-] | [-] | [-] | |
| 37403 | Heavenly Star - Pull | [x] | [x] | [x] | [x] | [x] | [x] | [-] | [-] | [-] | |
| 37404 | Everything is Unadvisable | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | |
| 37501 | Envelop In Disaster | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | |
| 37502 | Cycle of Fate | [x] | [x] | [x] | [x] | [x] | [x] | [-] | [-] | [-] | |
| 37503 | Heavenly Will - Comply | [x] | [x] | [x] | [x] | [x] | [x] | [-] | [-] | [-] | |
| 37504 | Heavenly Will - Defy | [!] | [!] | [!] | [x] | [x] | [x] | [x] | [x] | [x] | CSV: 50% rounded down, IMPL: 60% rounded up |

## Talisman (15 cards) - VERIFIED

| Base ID | Name | Act 1 | Act 2 | Act 3 | Cost 1 | Cost 2 | Cost 3 | Open 1 | Open 2 | Open 3 | Notes |
|---------|------|-------|-------|-------|--------|--------|--------|--------|--------|--------|-------|
| 40101 | Black Silver Armor | [x] | [x] | [x] | [x] | [x] | [x] | [-] | [-] | [-] | |
| 40102 | Thorns Spear | [x] | [x] | [x] | [x] | [x] | [x] | [-] | [-] | [-] | |
| 40201 | Dew Jade Vase | [x] | [x] | [x] | [x] | [x] | [x] | [-] | [-] | [-] | |
| 40202 | Nameless Ancient Sword | [x] | [x] | [x] | [x] | [x] | [x] | [-] | [-] | [-] | |
| 40301 | Fire Soul Refinement Flag | [x] | [x] | [x] | [x] | [x] | [x] | [-] | [-] | [-] | |
| 40302 | Requiem Jade Lotus | [x] | [x] | [x] | [x] | [x] | [x] | [-] | [-] | [-] | |
| 40303 | Blood Crystal of Wolf King | [x] | [x] | [x] | [x] | [x] | [x] | [-] | [-] | [-] | |
| 40401 | Cosmos Seal Divine Orb | [x] | [x] | [x] | [x] | [x] | [x] | [-] | [-] | [-] | |
| 40402 | Metal Tri-Thorn Spear | [x] | [x] | [x] | [x] | [x] | [x] | [-] | [-] | [-] | |
| 40403 | Carefree Guqin | [x] | [x] | [x] | [x] | [x] | [x] | [-] | [-] | [-] | |
| 40501 | Nether Seal Evil Signet | [x] | [x] | [x] | [x] | [x] | [x] | [-] | [-] | [-] | |
| 40502 | Dark Crystal Heart Shield | [x] | [x] | [x] | [x] | [x] | [x] | [-] | [-] | [-] | |
| 40503 | Bow of Hunting Owl | [x] | [x] | [x] | [x] | [x] | [x] | [-] | [-] | [-] | |
| 40601 | Void Split Spear | [x] | [x] | [x] | [x] | [x] | [x] | [-] | [-] | [-] | |
| 40602 | Mysterious Gates Devil Seal Tower | [x] | [x] | [x] | [x] | [x] | [x] | [-] | [-] | [-] | |

## Spiritual Pet (13 cards) - VERIFIED

| Base ID | Name | Act 1 | Act 2 | Act 3 | Cost 1 | Cost 2 | Cost 3 | Open 1 | Open 2 | Open 3 | Notes |
|---------|------|-------|-------|-------|--------|--------|--------|--------|--------|--------|-------|
| 50101 | Break Sky Eagle | [x] | [x] | [x] | [x] | [x] | [x] | [-] | [-] | [-] | |
| 50102 | Fat Immortal Raccoon | [x] | [x] | [x] | [x] | [x] | [x] | [-] | [-] | [-] | |
| 50201 | Dark Star Bat | [x] | [x] | [x] | [x] | [x] | [x] | [-] | [-] | [-] | |
| 50202 | Lonely Night Wolf | [x] | [x] | [x] | [x] | [x] | [x] | [-] | [-] | [-] | |
| 50301 | Black Earth Turtle | [x] | [x] | [x] | [x] | [x] | [x] | [-] | [-] | [-] | |
| 50302 | Brocade Rat | [x] | [x] | [x] | [x] | [x] | [x] | [-] | [-] | [-] | |
| 50401 | Scarlet-Eye The Sky Consumer | [x] | [x] | [x] | [x] | [x] | [x] | [-] | [-] | [-] | |
| 50402 | Ashes Phoenix | [x] | [x] | [x] | [x] | [x] | [x] | [-] | [-] | [-] | |
| 50403 | Three Tailed Cat | [?] | [?] | [?] | [x] | [x] | [x] | [-] | [-] | [-] | Uses three_tailed_cat_stacks instead of hexproof |
| 50501 | Colorful Spirit Crane | [x] | [x] | [x] | [x] | [x] | [x] | [-] | [-] | [-] | |
| 50502 | Shadow Owl Rabbit | [x] | [x] | [x] | [x] | [x] | [x] | [-] | [-] | [-] | |
| 50601 | Void The Spirit Consumer | [x] | [x] | [x] | [x] | [x] | [x] | [-] | [-] | [-] | |
| 50602 | Nether Void Canine | [x] | [x] | [x] | [x] | [x] | [x] | [-] | [-] | [-] | |

## Character-specific S1 (10 cards) - VERIFIED

| Base ID | Name | Act 1 | Act 2 | Act 3 | Cost 1 | Cost 2 | Cost 3 | Open 1 | Open 2 | Open 3 |
|---------|------|-------|-------|-------|--------|--------|--------|--------|--------|--------|
| 61101 | Cloud Sword - Flying Sand | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 61102 | Bronze Cat | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 61103 | Clear Heart Sword Embryo | [?] | [?] | [?] | [x] | [x] | [x] | [x] | [x] | [x] | SPECIAL: Immortal Fate card, L1 does_not_exist, no CSV for L2/L3
| 61201 | Cloud Sword - Cat Paw | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 61401 | Cloud Sword - Avalanche | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 61402 | Cloud Sword - Pray Rain | [!] | [!] | [!] | [x] | [x] | [x] | [x] | [x] | [x] | MISMATCH: ATK should be 2 (impl uses 3), Cloud Hit effect missing
| 61403 | Spirit Cat Chaos Sword | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 61501 | Unrestrained Sword - Flame Dance | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 61502 | Sky Delicate Bracelet | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] |
| 61503 | Yeying Sword Formation | [!] | [!] | [!] | [x] | [x] | [x] | [x] | [x] | [x] | MISMATCH: off-by-one in base reps and sword_formation_deck_count

## Character-specific S2 (10 cards) - VERIFIED

| Base ID | Name | Act 1 | Act 2 | Act 3 | Cost 1 | Cost 2 | Cost 3 | Open 1 | Open 2 | Open 3 | Notes |
|---------|------|-------|-------|-------|--------|--------|--------|--------|--------|--------|-------|
| 62101 | Perfectly Planned | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | |
| 62201 | Only Traces | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | |
| 62301 | Ultimate Hexagram Base | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | |
| 62302 | Starburst | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | |
| 62303 | Flame Flutter | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | |
| 62401 | Heptastar Soulstat | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | |
| 62402 | Within Reach | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | |
| 62403 | Rotary Divination Hexagram | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | |
| 62501 | Star Moon Folding Fan | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | |
| 62502 | Fury Thunder | [!] | [!] | [!] | [x] | [x] | [x] | [x] | [x] | [x] | MISMATCH: checks only next card for Thunder, not "any Thunder in deck" |

## Character-specific S3 (8 cards) - VERIFIED

| Base ID | Name | Act 1 | Act 2 | Act 3 | Cost 1 | Cost 2 | Cost 3 | Open 1 | Open 2 | Open 3 | Notes |
|---------|------|-------|-------|-------|--------|--------|--------|--------|--------|--------|-------|
| 63201 | Wood Spirit - Peach Blossom Seal | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | |
| 63301 | Kun Wu Metal Ring | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | |
| 63302 | Gourd Of Leisurely | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | |
| 63401 | Metal Spirit - Vigorous | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | |
| 63402 | Overcome with each other | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | |
| 63403 | Water Spirit - Spring Rain | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | |
| 63501 | Earth Spirit - Landslide | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | |
| 63502 | Forget Worries | [!] | [!] | [!] | [x] | [x] | [x] | [x] | [x] | [x] | MISMATCH: HP values wrong (L1: 8 vs 12, L2: 16 vs 18) |

## Character-specific S4 (11 cards) - VERIFIED

| Base ID | Name | Act 1 | Act 2 | Act 3 | Cost 1 | Cost 2 | Cost 3 | Open 1 | Open 2 | Open 3 | Notes |
|---------|------|-------|-------|-------|--------|--------|--------|--------|--------|--------|-------|
| 64101 | Double Stick | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | |
| 64201 | Unceasing Exercising | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | |
| 64202 | Overwhelming Power | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | |
| 64203 | Counter Move | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | |
| 64301 | Gone Crazy | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | |
| 64401 | Crash Fist - Styx Night | [!] | [!] | [!] | [!] | [!] | [!] | [x] | [x] | [x] | MISMATCH: Styx amounts off by 1, cost wrong |
| 64402 | Meditation of Xuan | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | |
| 64403 | Shift Stance | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | |
| 64501 | Styx Moon's Glow | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | |
| 64502 | Wan Xuan Demon Breaking Palm | [!] | [!] | [!] | [x] | [x] | [x] | [x] | [x] | [x] | MISMATCH: percentage vs flat value concern |
| 64503 | Red Gold Dragon Stick | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | |

## Fusion Side Jobs (15 cards) - VERIFIED

| Base ID | Name | Act 1 | Act 2 | Act 3 | Cost 1 | Cost 2 | Cost 3 | Open 1 | Open 2 | Open 3 | Notes |
|---------|------|-------|-------|-------|--------|--------|--------|--------|--------|--------|-------|
| 90301 | Xuanming Recurring | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | |
| 90401 | Xuanming Recover Elixir | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | |
| 90402 | Xuanming Regen Tune | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | |
| 90403 | Xuanming Clouds | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | |
| 90404 | Xuanming Forceage Formation | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | |
| 90405 | Xuanming Snowdrop | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | |
| 90501 | Xuanming Requiem Fulu | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | |
| 90600 | Crimson Star | [x] | - | - | [x] | - | - | [x] | - | - | L1 only (fusion material) |
| 90601 | Nüwa Stone | [x] | - | - | [x] | - | - | [x] | - | - | L1 only |
| 90602 | Haotian Pagoda | [x] | - | - | [x] | - | - | [x] | - | - | L1 only |
| 90603 | Fuxi Guqin | [!] | - | - | [x] | - | - | [x] | - | - | L1 only; Missing Chase effect |
| 90604 | Kongtong Seal | [x] | - | - | [x] | - | - | [x] | - | - | L1 only |
| 90605 | Donghuang Zhong | [x] | - | - | [x] | - | - | [x] | - | - | L1 only |
| 90606 | Shennong Ding | [!] | - | - | [x] | - | - | [x] | - | - | L1 only; Missing end-of-battle card gain passive |
| 90607 | Spirit Fusion Pot | [x] | - | - | [x] | - | - | [x] | - | - | L1 only |

## Fusion S1 (17 cards) - VERIFIED

| Base ID | Name | Act 1 | Act 2 | Act 3 | Cost 1 | Cost 2 | Cost 3 | Open 1 | Open 2 | Open 3 | Notes |
|---------|------|-------|-------|-------|--------|--------|--------|--------|--------|--------|-------|
| 91301 | Unrestrained Sword - Nebula Cloud | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | |
| 91302 | Spiritstat Tune | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | |
| 91401 | Unrestrained Sword - Cat Claw | [!] | [!] | [!] | [x] | [x] | [x] | [x] | [x] | [x] | Counts as 1 not 2 Unrestrained Sword |
| 91402 | Contemplate Spirits Vitality Rhythm | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | |
| 91403 | Cloud Sword - Clarity | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | |
| 91404 | Cloud Sword - Endless | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | |
| 91405 | Sword Spirit Sunflower | [x] | [!] | [!] | [x] | [x] | [x] | [x] | [x] | [x] | L2/L3: Base Qi values wrong (3/4 instead of 4/6) |
| 91501 | Cloud Sword - Dragon Spring | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | |
| 91502 | Cloud Sword - Flying Snow Shade | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | |
| 91503 | CentiBird Delicate Bracelet | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | |
| 91504 | Clear Heart Sword Formation | [!] | [!] | [!] | [x] | [x] | [x] | [x] | [x] | [x] | DEF values wrong (+8/11/14 vs +2/7/12), extra ATK |
| 91505 | Cloud Sword - Starry Sky | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | |
| 91506 | Xuanming Sword Intent Mantra | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | |
| 91507 | Shen Jian Ao Zhou | [x] | - | - | [x] | - | - | [x] | - | - | L1 only |
| 91508 | Unrestrained Sword  - Divine | [!] | [!] | [!] | [x] | [x] | [x] | [x] | [x] | [x] | trigger_random_unrestrained_card not implemented |
| 91509 | Heavenly Will - Earth Evil | [!] | [!] | [!] | [x] | [x] | [x] | [x] | [x] | [x] | Qi/stacks values all wrong |
| 91601 | Xuan-Yuan Sword | [x] | - | - | [x] | - | - | [x] | - | - | L1 only |

## Fusion S2 (17 cards) - VERIFIED

| Base ID | Name | Act 1 | Act 2 | Act 3 | Cost 1 | Cost 2 | Cost 3 | Open 1 | Open 2 | Open 3 | Notes |
|---------|------|-------|-------|-------|--------|--------|--------|--------|--------|--------|-------|
| 92201 | Astral Move - Extend | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | |
| 92301 | Traces Revitalized | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | |
| 92401 | Suspicious Flame Flutter | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | |
| 92402 | Thousand Star Explosion | [!] | [!] | [!] | [x] | [x] | [x] | [x] | [x] | [x] | Base ATK 4 instead of 6 |
| 92403 | Thunderbolt Tune | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | |
| 92404 | Fleeting Glimpse | [!] | [!] | [!] | [x] | [x] | [x] | [x] | [x] | [x] | NOT IMPLEMENTED |
| 92405 | Yin Yang Tutelary Formation | [!] | [!] | [!] | [x] | [x] | [x] | [x] | [x] | [x] | NOT IMPLEMENTED |
| 92501 | Ultimate Polaris Hexagram Base | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | |
| 92502 | Star Moon Hexagram Fan | [!] | [!] | [!] | [x] | [x] | [x] | [x] | [x] | [x] | Qi damage 3 instead of 2 |
| 92503 | Great Galaxy | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | |
| 92504 | Xuanming Thundercloud Tribulation | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | |
| 92505 | Die Ling Shen Ying | [x] | - | - | [x] | - | - | [x] | - | - | L1 only |
| 92506 | Spiritual Hunter | [!] | [!] | [!] | [x] | [x] | [x] | [x] | [x] | [x] | Empty implementation |
| 92507 | Hexagrams Generating Evils | [!] | [!] | [!] | [x] | [x] | [x] | [x] | [x] | [x] | Empty implementation |
| 92508 | Entangling Thornbush | [!] | [!] | [!] | [x] | [x] | [x] | [x] | [x] | [x] | Empty implementation |
| 92509 | Astral Move - Jump | [x] | [x] | [!] | [x] | [x] | [x] | [x] | [x] | [x] | L3: ATK 3 instead of 2 |
| 92601 | Heavenly Maiden White Jade Ring | [x] | - | - | [x] | - | - | [x] | - | - | L1 only |

## Fusion S3 (17 cards) - VERIFIED

| Base ID | Name | Act 1 | Act 2 | Act 3 | Cost 1 | Cost 2 | Cost 3 | Open 1 | Open 2 | Open 3 | Notes |
|---------|------|-------|-------|-------|--------|--------|--------|--------|--------|--------|-------|
| 93201 | Cosmos Fleche | [!] | [!] | [!] | [x] | [x] | [x] | [x] | [x] | [x] | Missing "if only one Five Elements type, +1 Qi" |
| 93301 | Kun Wu Molten Ring | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | |
| 93302 | Fire Spirit - Blazing Flame | [!] | [!] | [!] | [x] | [x] | [x] | [x] | [x] | [x] | Empty implementation |
| 93401 | Harmony of Water and Fire | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | |
| 93402 | Metal Spirit - Meteor | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | |
| 93403 | Wood Spirit Forceage Formation | [!] | [!] | [!] | [x] | [x] | [x] | [x] | [x] | [x] | NOT IMPLEMENTED |
| 93404 | Water Spirit - Continuous Flow | [!] | [!] | [!] | [x] | [x] | [x] | [x] | [x] | [x] | NOT IMPLEMENTED |
| 93501 | Heavenly Marrow Gourd | [!] | [!] | [!] | [x] | [x] | [x] | [x] | [x] | [x] | Qi off by 1, missing Max HP |
| 93502 | Ultimate Overcome Formation | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | |
| 93503 | Wood Spirit - All Things Grow | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | |
| 93504 | Xuanming Heavenly Essence Destruction | [!] | [!] | [!] | [x] | [x] | [x] | [x] | [x] | [x] | Chase condition === 1 instead of <= 2 |
| 93505 | Pi Yun Zhui Yue | [x] | - | - | [x] | - | - | [x] | - | - | L1 only |
| 93506 | Five Elements Guard | [!] | [!] | [!] | [x] | [x] | [x] | [x] | [x] | [x] | Wrong implementation (has Heavenly Marrow Dance Tune effects) |
| 93507 | Heavenly Marrow Dance Tune | [!] | [!] | [!] | [!] | [x] | [x] | [x] | [x] | [x] | Wrong implementation; L1 cost wrong |
| 93508 | Cosmos Brush | [!] | [!] | [!] | [x] | [x] | [x] | [x] | [x] | [x] | NOT IMPLEMENTED |
| 93509 | Five Elements Spiritual Field | [!] | [!] | [!] | [x] | [x] | [x] | [x] | [x] | [x] | NOT IMPLEMENTED |
| 93601 | Kunlun Mirror | [!] | - | - | [x] | - | - | [x] | - | - | L1 only; Missing Gather Qi 9 |

## Fusion S4 (16 cards) - VERIFIED

| Base ID | Name | Act 1 | Act 2 | Act 3 | Cost 1 | Cost 2 | Cost 3 | Open 1 | Open 2 | Open 3 | Notes |
|---------|------|-------|-------|-------|--------|--------|--------|--------|--------|--------|-------|
| 94301 | Star Sky Forge Bone | [!] | [!] | [!] | [x] | [x] | [x] | [x] | [x] | [x] | 16.66% instead of 20% (1/5 physique) |
| 94401 | Styx Night Footwork | [!] | [!] | [!] | [x] | [x] | [x] | [x] | [x] | [x] | Styx/Agility values off by +1 |
| 94402 | Crash Fist - Return to Xuan | [!] | [!] | [!] | [x] | [x] | [x] | [x] | [x] | [x] | HP/Internal Injury/Regen all wrong |
| 94403 | Crash Fist - Star Seizing | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | |
| 94404 | Cloud Footwork | [!] | [!] | [!] | [x] | [x] | [x] | [x] | [x] | [x] | ignore_def off by 1 (1/2/3 instead of 2/3/4) |
| 94405 | Spiritage And Exercise | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | |
| 94406 | Continuous Tune | [!] | [!] | [!] | [x] | [x] | [x] | [x] | [x] | [x] | NOT IMPLEMENTED |
| 94407 | Mystic Snowdrop | [!] | [!] | [!] | [x] | [x] | [x] | [x] | [x] | [x] | NOT IMPLEMENTED |
| 94501 | Unceasing Universe | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | |
| 94502 | Soul Overwhelming Palm | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | |
| 94503 | Xuanming Boundary-Breaking Palms | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | |
| 94504 | Jiu Qi Po Xiao | [x] | - | - | [x] | - | - | [x] | - | - | L1 only |
| 94505 | Exercise To The Utmost | [!] | [!] | [!] | [x] | [x] | [x] | [x] | [x] | [x] | NOT IMPLEMENTED |
| 94506 | Force Spiritage Formation | [!] | [!] | [!] | [x] | [x] | [x] | [x] | [x] | [x] | NOT IMPLEMENTED |
| 94507 | Heavenly Will - Seizing | [!] | [!] | [!] | [x] | [x] | [x] | [x] | [x] | [x] | NOT IMPLEMENTED |
| 94601 | Pangu Axe | [!] | - | - | [x] | - | - | [x] | - | - | L1 only; Missing HP block + [Injured] check |

## Spacetime Mirage (31 implemented + 9 unimplemented) - VERIFIED

| Base ID | Name | Act 1 | Act 2 | Act 3 | Cost 1 | Cost 2 | Cost 3 | Open 1 | Open 2 | Open 3 | Notes |
|---------|------|-------|-------|-------|--------|--------|--------|--------|--------|--------|-------|
| 71403 | M - Raven Spirit Sword | [!] | [!] | [!] | [x] | [x] | [x] | [x] | [x] | [x] | Math.max instead of Math.min for DEF cap |
| 71404 | M - Light Sword | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | |
| 71405 | M - Spiritage Sword | [!] | [!] | [!] | [x] | [x] | [x] | [x] | [x] | [x] | atk_amt calculated but never used |
| 71406 | M - Flying Fang Sword | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | |
| 71407 | M - Diligent Sword | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | |
| 71503 | M - Cloud Sword Touch Sky | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | |
| 71504 | M - Cloud Sword Conceal | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | |
| 71505 | M - Consonance Sword Formation | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | |
| 71506 | M - Cloud Dance Rhythm | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | |
| 71507 | M - Unrestrained Sword Dragon Coiled | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | |
| 72403 | M - Cutting Weeds | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | |
| 72404 | M - Ruthless Water | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | |
| 72405 | M - Earth Hexagram | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | |
| 72406 | M - Dotted Around | [!] | [!] | [!] | [x] | [x] | [x] | [x] | [x] | [x] | Star Power/stack values off by 1 |
| 72503 | M - Shifting Stars | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | |
| 72504 | M - Incessant | [x] | [!] | [!] | [x] | [x] | [x] | [x] | [x] | [x] | L2/L3: ATK should be 9, Star Power wrong |
| 72505 | M - Astral Fleche | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | |
| 73403 | M - Fire Spirit Flame Eater | [!] | [!] | [!] | [x] | [x] | [x] | [x] | [x] | [x] | Base Max HP values off by 3 |
| 73404 | M - Wood Spirit Recovery | [!] | [!] | [!] | [!] | [!] | [!] | [x] | [x] | [x] | HP/Max HP off by 1, Qi cost 5 vs 4 |
| 73405 | M - Metal Spirit Needle | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | |
| 73503 | M - Water Spirit Billows | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | |
| 73504 | M - Five Elements Circulation | [!] | [!] | [!] | [x] | [x] | [x] | [x] | [x] | [x] | Qi/DEF wrong, activates both slots |
| 73505 | M - Earth Spirit Mountains | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | |
| 73506 | M - Cosmos Seal | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | |
| 74401 | M - Youthful Vigor | [!] | [!] | [!] | [x] | [x] | [x] | [x] | [x] | [x] | HP values wrong, ATK threshold wrong |
| 74402 | M - Exercise Bones | [!] | [!] | [!] | [x] | [x] | [x] | [x] | [x] | [x] | HP heals unconditionally (should only when physique > cap) |
| 74403 | M - Sinking Qi | [x] | [x] | [!] | [x] | [x] | [x] | [x] | [x] | [x] | L3: Qi/HP/stack values all wrong |
| 74404 | M - Standing Firm | [!] | [!] | [!] | [x] | [x] | [x] | [x] | [x] | [x] | Agility exhausted to 0 instead of decreased to 5 |
| 74501 | M - Double Trouble | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | |
| 74502 | M - Rakshasa Pouncing | [!] | [!] | [!] | [x] | [x] | [x] | [x] | [x] | [x] | Missing Ignore DEF effect |
| 74503 | M - Crash Fist Poke | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | [x] | |

### Unimplemented M - Cards (in CSV but not in swogi.json)
- 289: M - Flower Sentient
- 310: M - Magnanimous Righteousness
- 315: M - Fire Spirit Seal
- 316: M - Metal Spirit Seal
- 317: M - Earth Spirit Formation
- 318: M - Endless Entanglement
- 319: M - Crash Fist Entangle
- 320: M - Yin Yang Formation
- 324: M - Vitality Blossom

---

**Total: 553 base cards (1659 level variants)**