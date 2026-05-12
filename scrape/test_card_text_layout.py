from __future__ import annotations

import json
import unittest
from pathlib import Path

from card_data import card_by_id, card_name, render_description_text, resolve_reference
from render_rule_sky_sword_formation import fitted_description_rows, fitted_english_title_rows, render_new_card_description


def description_rows(label: str) -> list[str]:
    ref_id, locale = label.split("_", 1)
    resolved = resolve_reference(ref_id)
    if resolved.card_id is None:
        raise AssertionError(f"{label} did not resolve to a card")
    card = card_by_id()[resolved.card_id]
    _, rows = fitted_description_rows(render_description_text(int(card["id"]), locale), locale)
    return rows


def english_title_rows(card_id: int) -> list[str]:
    _, rows = fitted_english_title_rows(card_name(card_id, "en"))
    return rows


def new_card_description_rows(card_id: int, level: int, locale: str = "zh") -> list[str]:
    rows = json.loads((Path(__file__).resolve().parent / "new_cards_data.json").read_text())
    row = next(row for row in rows if int(row["id"]) == card_id)
    level_row = next(level_row for level_row in row["levels"] if int(level_row["level"]) == level)
    _, fitted_rows = fitted_description_rows(render_new_card_description(level_row), locale)
    return fitted_rows


class CardTextLayoutTests(unittest.TestCase):
    def test_english_title_rows(self) -> None:
        expected_by_card_id = {
            1000001: ["Cloud Sword -", "Touch Sky"],
            1000003: ["Cloud Sword -", "Touch Earth"],
            1000017: ["Contemplate", "Spirits Rhythm"],
            1000046: ["Mirror Flower", "Sword Formation"],
            1000039: ["Cloud Sword -", "Flash Wind"],
            1000040: ["Cloud Sword - Moon", "Shade"],
            1000035: ["Unrestrained Sword", "- Two"],
            1000042: ["Cloud Sword -", "Dragon Roam"],
            1000060: ["Cloud Sword - Step", "Lightly"],
            1000043: ["Flying Spirit", "Shade Sword"],
            1000045: ["Dharma Spirit", "Sword"],
            1000044: ["Sword Intent Surge"],
            1000025: ["Rule Sky Sword", "Formation"],
            1000064: ["Chain Sword", "Formation"],
            1000066: ["Unrestrained Sword", "- Zero"],
        }
        for card_id, expected in expected_by_card_id.items():
            with self.subTest(card_id=card_id, title=card_name(card_id, "en")):
                self.assertEqual(english_title_rows(card_id), expected)

    def test_sword_intent_quantities_are_not_zero(self) -> None:
        expected_by_card_id = {
            1000031: "Sword Intent]+[color:#CF3521|2]",
            1010031: "Sword Intent]+[color:#CF3521|3]",
            1020031: "Sword Intent]+[color:#CF3521|4]",
            1000010: "Sword Intent]+[color:#CF3521|2]",
            1010010: "Sword Intent]+[color:#CF3521|3]",
            1020010: "Sword Intent]+[color:#CF3521|4]",
            1000050: "Sword Intent]+[color:#CF3521|2]",
            1010050: "Sword Intent]+[color:#CF3521|3]",
            1020050: "Sword Intent]+[color:#CF3521|4]",
        }
        for card_id, expected in expected_by_card_id.items():
            with self.subTest(card_id=card_id):
                rendered = render_description_text(card_id, "en")
                self.assertIn(expected, rendered)
                self.assertNotIn("Sword Intent]+[color:#CF3521|0]", rendered)

    def test_unrestrained_sword_one_en(self) -> None:
        expected_by_level = {
            "112111_en": ("5 ATK", "2"),
            "112112_en": ("8 ATK", "3"),
            "112113_en": ("10 ATK", "5"),
        }
        for label, (attack_line, bonus) in expected_by_level.items():
            with self.subTest(label=label):
                self.assertEqual(
                    description_rows(label),
                    [
                        attack_line,
                        "For each",
                        '"Unrestrained',
                        'Sword" you played',
                        "in this battle,",
                        f"this card adds {bonus}",
                        "more ATK",
                    ],
                )

    def test_inspiration_sword_en(self) -> None:
        self.assertEqual(
            description_rows("114071_en"),
            [
                "8 ATK",
                "Add 1 Sword",
                "Intent for each",
                "Qi (maximum 4)",
                "Injured: Change",
                "to maximum 7",
            ],
        )

    def test_spirit_gather_citta_dharma_en(self) -> None:
        expected_by_level = {
            "114031_en": ("Qi+1", "Qi every 2 turns"),
            "114032_en": ("Qi+1", "Qi each your turn"),
            "114033_en": ("Qi+3", "Qi each your turn"),
        }
        for label, (qi_line, final_line) in expected_by_level.items():
            with self.subTest(label=label):
                self.assertEqual(
                    description_rows(label),
                    [
                        qi_line,
                        "Continuous: Add 1",
                        final_line,
                    ],
                )

    def test_cloud_sword_necessity_en(self) -> None:
        expected_by_level = {
            "113021_en": ("4 ATK × 2", "Cloud Hit: Next 1", "time attack"),
            "113022_en": ("6 ATK × 2", "Cloud Hit: Next 1", "time attack"),
            "113023_en": ("8 ATK × 2", "Cloud Hit: Next 2", "times attack"),
        }
        for label, (attack_line, next_line, attack_text) in expected_by_level.items():
            with self.subTest(label=label):
                self.assertEqual(
                    description_rows(label),
                    [
                        attack_line,
                        next_line,
                        attack_text,
                        "Ignore DEF",
                    ],
                )

    def test_unrestrained_sword_zero_en(self) -> None:
        self.assertEqual(
            description_rows("115081_en"),
            [
                "Continuous:",
                "Whenever",
                '"Unrestrained',
                'Sword" Injured the',
                "opponent, you gain",
                "30% of damage as HP",
            ],
        )

    def test_crash_fist_shocked_en(self) -> None:
        expected_by_level = {
            "145021_en": "10 ATK",
            "145022_en": "16 ATK",
            "145023_en": "22 ATK",
        }
        for label, attack_line in expected_by_level.items():
            with self.subTest(label=label):
                self.assertEqual(
                    description_rows(label),
                    [
                        attack_line,
                        "After you played",
                        "the next Crash",
                        "Fist, make an",
                        "additional 1 ATK (1",
                        "more ATK for each 5",
                        "HP you have lost)",
                    ],
                )

    def test_crash_fist_truncate_en(self) -> None:
        expected_by_level = {
            "143021_en": "9 ATK",
            "143022_en": "13 ATK",
            "143023_en": "17 ATK",
        }
        for label, attack_line in expected_by_level.items():
            with self.subTest(label=label):
                self.assertEqual(
                    description_rows(label),
                    [
                        "Transfer 1 stack of",
                        "your random Debuff",
                        "to the opponent",
                        "(also triggered in",
                        "the next Crash",
                        "Fist)",
                        attack_line,
                    ],
                )

    def test_crash_fist_inch_force_en(self) -> None:
        expected_by_level = {
            "144021_en": "10 ATK",
            "144022_en": "14 ATK",
            "144023_en": "18 ATK",
        }
        for label, attack_line in expected_by_level.items():
            with self.subTest(label=label):
                self.assertEqual(
                    description_rows(label),
                    [
                        attack_line,
                        "This card receive",
                        "2x bonus from Force",
                        "(also triggered in",
                        "the next Crash",
                        "Fist, non-",
                        "stackable)",
                    ],
                )

    def test_elusive_footwork_en(self) -> None:
        expected_by_level = {
            "144061_en": ("Qi+1", "Agility+2"),
            "144062_en": ("Qi+2", "Agility+3"),
            "144063_en": ("Qi+3", "Agility+4"),
        }
        for label, (qi_line, agility_line) in expected_by_level.items():
            with self.subTest(label=label):
                self.assertEqual(
                    description_rows(label),
                    [
                        qi_line,
                        agility_line,
                        "Continuous: Add 1 Qi",
                        "and 1 Agility for",
                        "the first HP lost in",
                        "each your turn",
                    ],
                )

    def test_fire_spirit_blast_en(self) -> None:
        expected_by_level = {
            "133041_en": "Gain 1 stack(s) of",
            "133042_en": "Gain 2 stack(s) of",
            "133043_en": "Gain 3 stack(s) of",
        }
        for label, gain_line in expected_by_level.items():
            with self.subTest(label=label):
                self.assertEqual(
                    description_rows(label),
                    [
                        gain_line,
                        "Increase ATK",
                        "Fire Spirit: Opponent",
                        "loses 7 HP and Max HP",
                        "(increase this by 1",
                        "for every stack of",
                        "Increase ATK)",
                    ],
                )

    def test_earth_spirit_cliff_en(self) -> None:
        expected_by_level = {
            "133061_en": "DEF+10",
            "133062_en": "DEF+15",
            "133063_en": "DEF+20",
        }
        for label, def_line in expected_by_level.items():
            with self.subTest(label=label):
                self.assertEqual(
                    description_rows(label),
                    [
                        def_line,
                        "Earth Spirit: When",
                        "the next 1 time your",
                        "DEF is reduced, deal",
                        "the same value of",
                        "the reduced DEF's",
                        "DMG to the opponent",
                    ],
                )

    def test_metal_spirit_sharp_en(self) -> None:
        expected_by_level = {
            "133081_en": "6 ATK",
            "133082_en": "9 ATK",
            "133083_en": "12 ATK",
        }
        for label, attack_line in expected_by_level.items():
            with self.subTest(label=label):
                self.assertEqual(
                    description_rows(label),
                    [
                        attack_line,
                        "Metal Spirit: For",
                        "every 2 HP Injured",
                        "by this card, gain",
                        "1 stack of",
                        "Penetrate",
                    ],
                )

    def test_fire_spirit_heart_fire_en(self) -> None:
        expected_by_level = {
            "134041_en": "4 ATK × 2",
            "134042_en": "5 ATK × 2",
            "134043_en": "7 ATK × 2",
        }
        for label, attack_line in expected_by_level.items():
            with self.subTest(label=label):
                self.assertEqual(
                    description_rows(label),
                    [
                        attack_line,
                        "Fire Spirit: For",
                        "every Injured HP by",
                        "this card, decrease",
                        "opponent's Max HP",
                        "by 2",
                    ],
                )

    def test_world_smash_en(self) -> None:
        expected_by_level = {
            "134111_en": ("4 ATK", "this card adds 4 ATK"),
            "134112_en": ("7 ATK", "this card adds 5 ATK"),
            "134113_en": ("10 ATK", "this card adds 6 ATK"),
        }
        for label, (attack_line, final_line) in expected_by_level.items():
            with self.subTest(label=label):
                self.assertEqual(
                    description_rows(label),
                    [
                        attack_line,
                        "Smash DEF",
                        "For each different",
                        "Five Elements you",
                        "have in your deck,",
                        final_line,
                    ],
                )

    def test_cloud_sword_fleche_en(self) -> None:
        expected_by_level = {
            "111021_en": ("5 ATK", "additional 3", "ATK"),
            "111022_en": ("6 ATK", "additional 5", "ATK"),
            "111023_en": ("7 ATK", "additional 7", "ATK"),
        }
        for label, (attack_line, bonus_line, final_line) in expected_by_level.items():
            with self.subTest(label=label):
                self.assertEqual(
                    description_rows(label),
                    [
                        attack_line,
                        "Cloud Hit: Make",
                        f"an {bonus_line}",
                        final_line,
                    ],
                )

    def test_astral_move_flank_en(self) -> None:
        expected_by_level = {
            "121041_en": ("6 ATK", "additional 5", "ATK"),
            "121042_en": ("7 ATK", "additional 7", "ATK"),
            "121043_en": ("8 ATK", "additional 9", "ATK"),
        }
        for label, (attack_line, bonus_line, final_line) in expected_by_level.items():
            with self.subTest(label=label):
                self.assertEqual(
                    description_rows(label),
                    [
                        attack_line,
                        "Star Point: Make",
                        f"an {bonus_line}",
                        final_line,
                    ],
                )

    def test_sparrows_tail_en(self) -> None:
        expected_by_level = {
            "121101_en": ("9 ATK", "additional 5", "ATK"),
            "121102_en": ("10 ATK", "additional 7", "ATK"),
            "121103_en": ("11 ATK", "additional 9", "ATK"),
        }
        for label, (attack_line, bonus_line, final_line) in expected_by_level.items():
            with self.subTest(label=label):
                self.assertEqual(
                    description_rows(label),
                    [
                        attack_line,
                        "10% chance make",
                        f"an {bonus_line}",
                        final_line,
                    ],
                )

    def test_astral_move_point_en(self) -> None:
        expected_by_level = {
            "122021_en": "6 ATK",
            "122022_en": "10 ATK",
            "122023_en": "14 ATK",
        }
        for label, attack_line in expected_by_level.items():
            with self.subTest(label=label):
                self.assertEqual(
                    description_rows(label),
                    [
                        attack_line,
                        "Star Point:",
                        "Opponent loses 1",
                        "Qi",
                    ],
                )

    def test_water_spirit_combine_rivers_en(self) -> None:
        self.assertEqual(
            description_rows("135053_en"),
            [
                "Gain 5 stacks of",
                "Force of Water",
                "Water Spirit: Add",
                "10 HP and Max HP",
                "(for every stack of",
                "Force of Water,",
                "increase by 1)",
            ],
        )

    def test_lake_hexagram_en(self) -> None:
        expected_by_level = {
            "123031_en": ("Hexagram+2", "2 Qi"),
            "123032_en": ("Hexagram+3", "3 Qi"),
            "123033_en": ("Hexagram+4", "4 Qi"),
        }
        for label, (hexagram_line, final_line) in expected_by_level.items():
            with self.subTest(label=label):
                self.assertEqual(
                    description_rows(label),
                    [
                        hexagram_line,
                        "Both players add",
                        final_line,
                    ],
                )

    def test_thunder_and_lightning_en(self) -> None:
        expected_by_level = {
            "124071_en": "1～10 ATK",
            "124072_en": "1～13 ATK",
            "124073_en": "1～16 ATK",
        }
        for label, attack_line in expected_by_level.items():
            with self.subTest(label=label):
                self.assertEqual(
                    description_rows(label),
                    [
                        "Repeat twice:",
                        attack_line,
                        "If a Hexagram is",
                        "triggered add 1",
                        "Qi",
                    ],
                )

    def test_ultimate_world_formation_en(self) -> None:
        expected_by_level = {
            "135061_en": "Continuous X Times",
            "135062_en": "Continuous X+2 Times",
            "135063_en": "Continuous X+4 Times",
        }
        for label, first_line in expected_by_level.items():
            with self.subTest(label=label):
                self.assertEqual(description_rows(label)[0], first_line)

    def test_five_elements_heavenly_marrow_rhythm_en(self) -> None:
        expected_by_level = {
            "135071_en": [
                "Continuous 2 Times: If",
                "there is only one type",
                "of Five Elements in",
                "your deck, whenever",
                "you play a Five",
                "Elements card that is",
                "not an ATK, Chase",
            ],
            "135072_en": [
                "Qi+2",
                "Continuous 2 Times: If",
                "there is only one type",
                "of Five Elements in",
                "your deck, whenever",
                "you play a Five",
                "Elements card that is",
                "not an ATK, Chase",
            ],
            "135073_en": [
                "Qi+2",
                "Continuous 3 Times: If",
                "there is only one type",
                "of Five Elements in",
                "your deck, whenever",
                "you play a Five",
                "Elements card that is",
                "not an ATK, Chase",
            ],
        }
        for label, expected in expected_by_level.items():
            with self.subTest(label=label):
                self.assertEqual(description_rows(label), expected)

    def test_detect_horse_palms_en(self) -> None:
        expected_by_level = {
            "142051_en": ("7 ATK", "(up to 8)"),
            "142052_en": ("9 ATK", "(up to 11)"),
            "142053_en": ("11 ATK", "(up to 14)"),
        }
        for label, (attack_line, final_line) in expected_by_level.items():
            with self.subTest(label=label):
                self.assertEqual(
                    description_rows(label),
                    [
                        attack_line,
                        "Add 1 DEF for",
                        "each 2 Physique",
                        final_line,
                    ],
                )

    def test_hidden_pool_beast_spirit_sword_formation_zh(self) -> None:
        expected_by_level = {
            1: "灵气+2",
            2: "灵气+3",
            3: "灵气+4",
        }
        for level, anima_line in expected_by_level.items():
            with self.subTest(level=level):
                self.assertEqual(
                    new_card_description_rows(49, level),
                    [
                        anima_line,
                        "持续：每回合首次",
                        "使用“灵剑”或",
                        "“剑阵”牌后，每",
                        "剩1点灵气向对方",
                        "造成1伤害",
                    ],
                )


if __name__ == "__main__":
    unittest.main()
