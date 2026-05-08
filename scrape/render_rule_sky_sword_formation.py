# -*- coding: utf-8 -*-
"""Render Rule Sky Sword Formation card mockups from extracted Yi Xian assets.

Findings encoded here:
- The decompiled managed layer exposes the runtime sprite path in
  DarkSun.Utility/AsyncLoadExtensions.cs: Unity UI Image components call
  SpriteCache.main.LoadAsync(spriteName), so the renderer uses extracted sprite
  names directly: Card_<id>, CardUI_<phase>_<level>, and Icon_灵气(卡牌).
- DarkSun.HotUpdate strings include CardItemBase, GetCardSpriteName,
  GetCardFrameSpritePath, LINGQI_SPRITE_NAME, GetCardNameTranslate, and
  GetCardDescTranslate.
- The normal CardItem prefab in 0ed28b0be07270565aa7f4ea36ea12b8.bundle gives
  the concrete UI RectTransforms used below: Anima, AnimaLabel, NameLabel,
  NameLabel_EN_Bg/NameLabel_EN, DescLabel, Mask/Icon, and LevelBG.
- Card illustrations are separate 180x216 sprites named Card_<card id>.png.
- Card frames are transparent overlays named CardUI_<phase>_<level-index>.png.
- The frame is drawn over the art.  The CardItem prefab places the card art in
  Mask/Icon and draws LevelBG afterward, so the native frame texture covers the
  art edge.
- Cards with qi cost draw a blue circular qi sprite under the cost number.
- Text is drawn last.  English cards draw an English title at the top; zh/tw
  cards only use the vertical left-rail Chinese title.  The screenshots in
  rssf_examples show that card description brackets are presentation markers,
  not literal glyphs: [DEF] renders as DEF, [防] as 防, and [Chase]/[再次行动]
  renders teal.

This intentionally renders a static card image rather than reproducing the
entire Unity prefab hierarchy.  The actual card view logic lives in the
hot-update ILRuntime payload; the normal managed assemblies only show the
addressable sprite-loading plumbing.
"""

from __future__ import annotations

import argparse
import math
import re
import ctypes
import subprocess
import unicodedata
from dataclasses import dataclass
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont
import UnityPy

from card_data import (
    card_base_id,
    card_by_id,
    card_name,
    localized_term,
    render_description_text,
    resolve_reference,
)
from png_io import save_png


UnityPy.config.FALLBACK_UNITY_VERSION = "2020.3.49f1"


VERSION = "001.0006.0014"
ROOT = Path(__file__).resolve().parent
ASSET_ROOT = ROOT / "extracted_assets" / VERSION
TEXTURE_DIR = ASSET_ROOT / "textures"
FONT_PATH = ASSET_ROOT / "fonts" / "DefaultFont.otf"
HUIWEN_ATLAS_PATH = TEXTURE_DIR / "Huiwen SDF Atlas.png"
DEFAULT_ATLAS_PATH = TEXTURE_DIR / "DefaultFont SDF Atlas.png"
OUTPUT_DIR = ASSET_ROOT / "rendered_cards" / "rule_sky_sword_formation"
RENDER_CACHE_DIR = OUTPUT_DIR / ".cache"
MKS_C_PATH = ROOT / "magic_kernel_sharp.c"
MKS_SO_PATH = RENDER_CACHE_DIR / "libmagic_kernel_sharp.so"
TMP_FONT_BUNDLE = ROOT / "YiXianPai/YiXianPai_Data/StreamingAssets/aa/StandaloneLinux64/6cca45594ab0a2c34be6caab06d1f8c6.bundle"
DEFAULT_TMP_FONT_PATH_ID = -8666073828371201828
HUIWEN_TMP_FONT_PATH_ID = 2000889227418753794

CARD_SIZE = (300.0, 508.0)
PREFAB_CARD_FACE = (168.0, 285.0)

# LevelBG is a CardFace sibling, not the CardFace itself.  Since the extracted
# CardUI_* texture is LevelBG's sprite, all other CardFace children must be
# expressed relative to LevelBG's RectTransform before scaling to texture pixels.
LEVEL_BG_POS = (0.0, -2.0)


@dataclass(frozen=True)
class UnityRect:
    """RectTransform fields needed to project prefab UI into frame pixels."""

    anchor: tuple[float, float]
    pos: tuple[float, float]
    size: tuple[float, float]
    pivot: tuple[float, float] = (0.5, 0.5)


@dataclass(frozen=True)
class PixelRect:
    left: float
    top: float
    right: float
    bottom: float

    @property
    def width(self) -> float:
        return self.right - self.left

    @property
    def height(self) -> float:
        return self.bottom - self.top

    @property
    def center(self) -> tuple[float, float]:
        return ((self.left + self.right) / 2, (self.top + self.bottom) / 2)

    def expanded(self, dx: float, dy: float) -> "PixelRect":
        return PixelRect(self.left - dx, self.top - dy, self.right + dx, self.bottom + dy)

    def inset(self, dx: float, dy: float) -> "PixelRect":
        return PixelRect(self.left + dx, self.top + dy, self.right - dx, self.bottom - dy)

    def translated(self, dx: float, dy: float) -> "PixelRect":
        return PixelRect(self.left + dx, self.top + dy, self.right + dx, self.bottom + dy)

    def rounded(self) -> tuple[int, int, int, int]:
        return (round(self.left), round(self.top), round(self.right), round(self.bottom))


def _scale() -> tuple[float, float]:
    return (CARD_SIZE[0] / PREFAB_CARD_FACE[0], CARD_SIZE[1] / PREFAB_CARD_FACE[1])


def cardface_rect_to_frame(rect: UnityRect) -> PixelRect:
    sx, sy = _scale()
    parent_w, parent_h = PREFAB_CARD_FACE
    anchor_x = (rect.anchor[0] - 0.5) * parent_w
    anchor_y = (rect.anchor[1] - 0.5) * parent_h
    center_x = anchor_x + rect.pos[0] - LEVEL_BG_POS[0]
    center_y = anchor_y + rect.pos[1] - LEVEL_BG_POS[1]
    left = (center_x - rect.pivot[0] * rect.size[0] + parent_w / 2) * sx
    right = (center_x + (1 - rect.pivot[0]) * rect.size[0] + parent_w / 2) * sx
    top = (parent_h / 2 - (center_y + (1 - rect.pivot[1]) * rect.size[1])) * sy
    bottom = (parent_h / 2 - (center_y - rect.pivot[1] * rect.size[1])) * sy
    return PixelRect(left, top, right, bottom)


def child_rect(parent: PixelRect, parent_ui_size: tuple[float, float], rect: UnityRect) -> PixelRect:
    sx = parent.width / parent_ui_size[0]
    sy = parent.height / parent_ui_size[1]
    parent_w, parent_h = parent_ui_size
    anchor_x = rect.anchor[0] * parent_w
    anchor_y_from_top = (1.0 - rect.anchor[1]) * parent_h
    center_x = anchor_x + rect.pos[0]
    center_y = anchor_y_from_top - rect.pos[1]
    left = parent.left + (center_x - rect.pivot[0] * rect.size[0]) * sx
    right = parent.left + (center_x + (1 - rect.pivot[0]) * rect.size[0]) * sx
    top = parent.top + (center_y - (1 - rect.pivot[1]) * rect.size[1]) * sy
    bottom = parent.top + (center_y + rect.pivot[1] * rect.size[1]) * sy
    return PixelRect(left, top, right, bottom)


ART_RECT = cardface_rect_to_frame(UnityRect((0.5, 0.5), (10.0, 48.0), (125.0, 150.0)))
QI_ICON_RECT = cardface_rect_to_frame(
    UnityRect((0.0, 1.0), (18.0, -22.0), (34.4144134521, 34.4144134521))
)
QI_LABEL_RECT = child_rect(
    QI_ICON_RECT,
    (34.4144134521, 34.4144134521),
    UnityRect((0.5, 0.5), (0.5, 0.0), (41.4144134521, 34.4144134521)),
)
QI_ICON_DRAW_RECT = QI_ICON_RECT.translated(0.0, -1.0)
HP_ICON_DRAW_RECT = QI_ICON_DRAW_RECT.expanded(3.25, 0.0)
VERTICAL_NAME_RECT = cardface_rect_to_frame(
    UnityRect((0.0, 1.0), (23.6000003815, -92.1999969482), (25.0, 120.0))
)
SECT_EMBLEM_RECT = cardface_rect_to_frame(
    UnityRect((0.5, 0.5), (0.8600000143, -77.3899993896), (100.0, 100.0))
)
DESC_RECT = cardface_rect_to_frame(
    UnityRect((0.5, 0.5), (0.3499999940, -77.0500030518), (134.0198822021, 102.8636169434))
)
EN_TITLE_BG_RECT = cardface_rect_to_frame(UnityRect((0.5, 0.5), (15.0, 120.0), (160.0, 34.0)))
EN_TITLE_RECT = child_rect(
    EN_TITLE_BG_RECT,
    (160.0, 34.0),
    UnityRect((0.0, 1.0), (77.0, -16.0), (120.0, 28.0)),
)

DESC_TEXT_DRAW_RECT_EN = DESC_RECT.translated(-0.08740619886848097, -1.2405589386906428)
DESC_TEXT_DRAW_RECT_CJK = DESC_RECT.translated(0.5744326767405602, -1.6437780077879998)
DESC_WRAP_INSET_X = 0.0
EN_TITLE_BG_DRAW_RECT = EN_TITLE_BG_RECT
EN_TITLE_DRAW_RECT = EN_TITLE_RECT.translated(0.0, 3.0)

PHASE = "HuaShen"
QI_COST = 1
LEVEL_NAMES = {
    1: "LianQi",
    2: "ZhuJi",
    3: "JinDan",
    4: "YuanYing",
    5: "HuaShen",
    6: "FanXu",
}

TOKEN_RE = re.compile(r"(\[[^\]]+\]|\d+|[A-Za-z]+|\s+|.)")
CJK_RE = re.compile(r"[\u3400-\u9fff]")
CJK_CLOSING_PUNCTUATION = {"”", "」", "』", "）", "】", "》", "〉", "’"}
LINE_START_FORBIDDEN_PUNCTUATION = {"[", "{", "（", "【", "《", "〈", "“", "‘", "「", "『"}
BODY_TEXT_COLOR = (61, 57, 53)
CONTINUOUS_COLOR = (0xB2, 0x1D, 0x81)
INJURED_ATTACK_COLOR = (0x9D, 0x10, 0x22)
CHASE_COLOR = (0x37, 0x8E, 0x89)
GROWTH_COLOR = (0x52, 0x7E, 0x1D)
DEF_VALUE_COLOR = (0x9A, 0x62, 0x12)
QI_VALUE_COLOR = (0x2C, 0x81, 0xBF)
JIAN_YI_VALUE_COLOR = (0xCF, 0x35, 0x21)
STAT_NUMBER_COLOR = DEF_VALUE_COLOR

# TMP_FontAsset data extracted from Huiwen SDF in
# 6cca45594ab0a2c34be6caab06d1f8c6.bundle.  AnimaLabel uses this face; the
# repository only has the generated SDF atlas, not the source Huiwen OTF.
HUIWEN_SDF_ATLAS_SIZE = (4096, 2048)
HUIWEN_SDF_POINT_SIZE = 30.0
HUIWEN_DIGIT_GLYPHS = {
    "1": {"x": 2249, "y": 1320, "w": 11, "h": 21},
}

# TMP material values read from aa1648ee8276d6e171b7fc04aa1c6984.bundle.
DEFAULT_OUTLINE_MATERIAL = {
    # The serialized material is 0.3000000119.  The CPU SDF evaluator needs a
    # tiny positive compensation to match the captured TMP face fill after the
    # same card-scale downsampling used by the game.
    "face_dilate": 0.32,
    "outline_width": 0.5,
    "outline_softness": 0.0,
    "gradient_scale": 3.0,
    "scale_ratio_a": 0.6666666865348816,
    "weight_normal": 0.0,
    "weight_bold": 0.75,
    "face_color": (1.3041188716888428, 1.3041188716888428, 1.3041188716888428),
    "outline_color": (0.0, 0.0, 0.0),
    "underlay_dilate": 0.0,
    "underlay_softness": 0.0,
    "underlay_offset_x": 0.5,
    "underlay_offset_y": -0.5,
    "underlay_color": (0.0, 0.0, 0.0, 0.20392157137393951),
    "scale_ratio_c": 0.34166666865348816,
}
DEFAULT_ATLAS_MATERIAL = {
    "face_dilate": 0.0,
    "outline_width": 0.0,
    "outline_softness": 0.0,
    "gradient_scale": 3.0,
    "scale_ratio_a": 0.6666666865348816,
    "weight_normal": 0.0,
    "weight_bold": 0.75,
    "face_color": (1.0, 1.0, 1.0),
    "outline_color": (0.23529411852359772, 0.2235294133424759, 0.2078431397676468),
    "underlay_dilate": 0.0,
    "underlay_softness": 0.0,
    "underlay_offset_x": 0.0,
    "underlay_offset_y": 0.0,
    "underlay_color": (0.0, 0.0, 0.0, 0.0),
    "scale_ratio_c": 0.0,
}
HUIWEN_OUTLINE_MATERIAL = {
    "face_dilate": 0.5,
    "outline_width": 0.4000000059604645,
    "outline_softness": 0.0,
    "gradient_scale": 3.0,
    "scale_ratio_a": 0.6133333444595337,
    "weight_normal": 0.0,
    "weight_bold": 0.75,
    "face_color": (1.0, 1.0, 1.0),
    "outline_color": (0.0, 0.0, 0.0),
    "underlay_dilate": 0.0,
    "underlay_softness": 0.0,
    "underlay_offset_x": 0.0,
    "underlay_offset_y": 0.0,
    "underlay_color": (0.0, 0.0, 0.0, 0.5),
    "scale_ratio_c": 0.2083333283662796,
}
TITLE_FONT_COLOR = (0.8588235378265381, 0.8588235378265381, 0.8588235378265381)

# Serialized TextMeshProUGUI values from the normal CardItem DescLabel prefab
# (0ed28b0be07270565aa7f4ea36ea12b8.bundle).  TMP applies these as
# `spacing * currentFontSize * 0.01`; explicit newlines add paragraph spacing
# in addition to the normal line advance, while soft wraps do not.
DESC_TMP_LINE_SPACING = -6.0
DESC_TMP_PARAGRAPH_SPACING = 9.0
DESC_PARAGRAPH_SPACING = DESC_TMP_PARAGRAPH_SPACING
DESC_VERTICAL_FIT_TOLERANCE_UI = 4.0
DESC_LINE_SPACING_EN = DESC_TMP_LINE_SPACING
DESC_LINE_SPACING_CJK = DESC_TMP_LINE_SPACING
DEFAULT_FONT_POINT_SIZE = 30.0
DEFAULT_FONT_SPACE_ADVANCE = 15.0
ANIMA_FONT_SIZE_UI = 29.0
ANIMA_DIGIT_SCALE_X = 1.07
ANIMA_DIGIT_SCALE_Y = 0.94
ANIMA_DIGIT_OFFSET_X = 0.5
ANIMA_DIGIT_OFFSET_Y = 0.25
HP_DIGIT_SCALE_X = 0.92
HP_DIGIT_SCALE_Y = 0.94
HP_DIGIT_OFFSET_X = 0.0
HP_DIGIT_OFFSET_Y = 0.25
TITLE_FONT_SIZE_MAX_UI = 13.5
TITLE_FONT_SIZE_MIN_UI = 10.0
TITLE_LINE_SPACING = -2.0
TITLE_GLYPH_SCALE_EN = 1.025
DESC_FONT_SIZE_MAX_UI = 20.0
DESC_FONT_SIZE_MAX_EN_UI = 16.0
DESC_FONT_SIZE_MIN_UI = 12.0
DESC_CHARACTER_SPACING_EN = -1.7914233019245518
DESC_CHARACTER_SPACING_CJK = 1.8936616714342625
DESC_GLYPH_SCALE_EN = 1.001468481818466
DESC_GLYPH_SCALE_CJK = 0.9967916566135181
DESC_FIXED_LINE_OFFSET_Y_EN_UI = 2.6581444504310747
DESC_FIXED_LINE_OFFSET_Y_CJK_UI = 2.6551521157205418
DESC_FACE_DILATE_EN_NORMAL = 0.03855153853000065
DESC_FACE_DILATE_EN_BOLD = -0.10512826733185415
DESC_FACE_DILATE_CJK_NORMAL = -0.000293767427539617
DESC_FACE_DILATE_CJK_BOLD = -4.897105441768699e-05
DREAM_DESC_OFFSET_Y_UI = 0.0
DREAM_DESC_LINE_SPACING = -12.0
VERTICAL_NAME_FONT_SIZE_UI = 20.0
VERTICAL_NAME_LINE_GAP_UI = 0.0
VERTICAL_NAME_OFFSET_Y_UI = 0.0
DREAM_VERTICAL_NAME_OFFSET_Y_UI = -4.0
VERTICAL_NAME_SLOT_HEIGHT_UI = 20.5
DEFAULT_FONT_ADVANCES = {
    "+": 15.0,
    "0": 15.0,
    "1": 15.0,
    "2": 15.0,
    "4": 15.0,
    "8": 15.0,
    ">": 15.0,
    "C": 15.0,
    "D": 15.0,
    "E": 15.0,
    "F": 15.0,
    "N": 15.0,
    "Q": 15.0,
    "a": 15.0,
    "c": 15.0,
    "d": 15.0,
    "e": 15.0,
    "f": 15.0,
    "h": 15.0,
    "i": 15.0,
    "o": 15.0,
    "r": 15.0,
    "s": 15.0,
    "t": 15.0,
    "再": 30.0,
    "则": 30.0,
    "則": 30.0,
    "动": 30.0,
    "動": 30.0,
    "无": 30.0,
    "次": 30.0,
    "此": 30.0,
    "气": 30.0,
    "氣": 30.0,
    "灵": 30.0,
    "無": 30.0,
    "牌": 30.0,
    "行": 30.0,
    "防": 30.0,
    "需": 30.0,
    "靈": 30.0,
}


def desc_line_spacing(locale_suffix: str, is_dream: bool = False) -> float:
    if is_dream:
        return DREAM_DESC_LINE_SPACING
    return DESC_LINE_SPACING_EN if locale_suffix == "en" else DESC_LINE_SPACING_CJK


def desc_fixed_line_offset_ui(locale_suffix: str) -> float:
    return DESC_FIXED_LINE_OFFSET_Y_EN_UI if locale_suffix == "en" else DESC_FIXED_LINE_OFFSET_Y_CJK_UI


def desc_face_dilates(locale_suffix: str) -> tuple[float, float]:
    if locale_suffix == "en":
        return DESC_FACE_DILATE_EN_NORMAL, DESC_FACE_DILATE_EN_BOLD
    return DESC_FACE_DILATE_CJK_NORMAL, DESC_FACE_DILATE_CJK_BOLD


@dataclass(frozen=True)
class DescriptionStyle:
    rect: PixelRect
    glyph_scale: float
    char_spacing: float
    line_spacing: float
    fixed_line_offset: float
    normal_face_dilate: float
    bold_face_dilate: float


DESC_GROUP_STYLES_EN: dict[tuple[int, int], DescriptionStyle] = {
    (1, 0): DescriptionStyle(
        rect=DESC_RECT.translated(0.2662313972092861, 0.006890329470316036),
        glyph_scale=1.0097827360100955,
        char_spacing=-2.9206905486715082,
        line_spacing=-4.9529518407920765,
        fixed_line_offset=1.3310520793108709,
        normal_face_dilate=-0.09337863948680239,
        bold_face_dilate=-0.016979653743006903,
    ),
    (2, 0): DescriptionStyle(
        rect=DESC_RECT.translated(0.2526105423335931, 0.025267808849738546),
        glyph_scale=1.0129141719859827,
        char_spacing=-2.901151746837599,
        line_spacing=-4.787246942537729,
        fixed_line_offset=1.2183925914946447,
        normal_face_dilate=-0.043439701415128165,
        bold_face_dilate=-0.06070288139777832,
    ),
    (2, 1): DescriptionStyle(
        rect=DESC_RECT.translated(0.15598870902729928, 0.0015710518999591647),
        glyph_scale=1.0111662253627824,
        char_spacing=-2.8568051612912035,
        line_spacing=-4.6334976086191455,
        fixed_line_offset=1.0293761120041753,
        normal_face_dilate=-0.08563293938005352,
        bold_face_dilate=-0.025694572157604605,
    ),
    (3, 0): DescriptionStyle(
        rect=DESC_RECT.translated(0.07413663887310831, 0.08752570659082932),
        glyph_scale=1.0077699628801338,
        char_spacing=-2.92132043308044,
        line_spacing=-4.546174015362379,
        fixed_line_offset=0.8310934029740475,
        normal_face_dilate=-0.040139870101944475,
        bold_face_dilate=-0.05667900425242179,
    ),
    (3, 1): DescriptionStyle(
        rect=DESC_RECT.translated(-0.05319154493470608, 0.12329193141470297),
        glyph_scale=1.0070440654498956,
        char_spacing=-2.858284576439883,
        line_spacing=-4.6605171923017314,
        fixed_line_offset=0.6962627536712882,
        normal_face_dilate=-0.02830589904579816,
        bold_face_dilate=-0.09750469163503185,
    ),
    (3, 2): DescriptionStyle(
        rect=DESC_RECT.translated(0.09680523586072867, 0.0352001432926961),
        glyph_scale=1.010062185221565,
        char_spacing=-2.8650884249219426,
        line_spacing=-4.823438396130484,
        fixed_line_offset=0.7582635769667199,
        normal_face_dilate=-0.041841606326500136,
        bold_face_dilate=-0.06547234541892799,
    ),
    (4, 0): DescriptionStyle(
        rect=DESC_RECT.translated(-0.03593750413938427, 0.11844534843508692),
        glyph_scale=1.0061951740068305,
        char_spacing=-2.8594444156072725,
        line_spacing=-4.694867439988668,
        fixed_line_offset=0.9560735190863694,
        normal_face_dilate=-0.05642826503798186,
        bold_face_dilate=-0.017743816533011957,
    ),
    (4, 1): DescriptionStyle(
        rect=DESC_RECT.translated(0.09503011808483043, 0.07549684713104941),
        glyph_scale=1.00426276126279,
        char_spacing=-2.774907741349656,
        line_spacing=-4.891881168948058,
        fixed_line_offset=1.2522307234100887,
        normal_face_dilate=0.0014604620071501778,
        bold_face_dilate=-0.02195978202483368,
    ),
}


def description_style_for_group(
    locale_suffix: str,
    description: str,
    rows: list[str],
    is_dream: bool = False,
) -> DescriptionStyle:
    if locale_suffix == "en" and not is_dream:
        tuned = DESC_GROUP_STYLES_EN.get((len(rows), description.count("\n")))
        if tuned is not None:
            return tuned
    rect = DESC_TEXT_DRAW_RECT_EN if locale_suffix == "en" else DESC_TEXT_DRAW_RECT_CJK
    if is_dream:
        rect = rect.translated(0.0, DREAM_DESC_OFFSET_Y_UI)
    glyph_scale = DESC_GLYPH_SCALE_EN if locale_suffix == "en" else DESC_GLYPH_SCALE_CJK
    char_spacing = DESC_CHARACTER_SPACING_EN if locale_suffix == "en" else DESC_CHARACTER_SPACING_CJK
    normal_face_dilate, bold_face_dilate = desc_face_dilates(locale_suffix)
    return DescriptionStyle(
        rect=rect,
        glyph_scale=glyph_scale,
        char_spacing=char_spacing,
        line_spacing=desc_line_spacing(locale_suffix, is_dream=is_dream),
        fixed_line_offset=desc_fixed_line_offset_ui(locale_suffix),
        normal_face_dilate=normal_face_dilate,
        bold_face_dilate=bold_face_dilate,
    )


@dataclass(frozen=True)
class CardLevel:
    level: int
    card_id: int
    defense: int


@dataclass(frozen=True)
class DreamCardLevel:
    ref_id: str
    level_name: str
    damage: int
    per_formation_damage: int
    chase: bool = False


@dataclass(frozen=True)
class LocaleText:
    suffix: str
    title: str
    chinese_title: str
    description: str


@dataclass(frozen=True)
class TmpGlyph:
    x: int
    y: int
    width: int
    height: int
    bearing_x: float
    bearing_y: float
    advance: float


class TmpFont:
    def __init__(self, font_asset_path_id: int, atlas_path: Path) -> None:
        self.atlas = Image.open(atlas_path).convert("RGBA").getchannel("A")
        self.glyphs: dict[str, TmpGlyph] = {}
        env = UnityPy.load(str(TMP_FONT_BUNDLE))
        data = None
        for obj in env.objects:
            if obj.path_id == font_asset_path_id:
                data = obj.read_typetree()
                break
        if data is None:
            raise RuntimeError(f"TMP font asset {font_asset_path_id} not found")
        face_info = data["m_FaceInfo"]
        self.point_size = float(face_info["m_PointSize"])
        self.line_height = float(face_info["m_LineHeight"])
        self.ascent_line = float(face_info["m_AscentLine"])
        self.descent_line = float(face_info["m_DescentLine"])
        glyph_table = {glyph["m_Index"]: glyph for glyph in data["m_GlyphTable"]}
        for char in data["m_CharacterTable"]:
            glyph = glyph_table.get(char["m_GlyphIndex"])
            if glyph is None:
                continue
            rect = glyph["m_GlyphRect"]
            metrics = glyph["m_Metrics"]
            self.glyphs[chr(char["m_Unicode"])] = TmpGlyph(
                x=int(rect["m_X"]),
                y=int(rect["m_Y"]),
                width=int(rect["m_Width"]),
                height=int(rect["m_Height"]),
                bearing_x=float(metrics["m_HorizontalBearingX"]),
                bearing_y=float(metrics["m_HorizontalBearingY"]),
                advance=float(metrics["m_HorizontalAdvance"]),
            )
        self.space_advance = self.glyphs.get(" ", TmpGlyph(0, 0, 0, 0, 0, 0, 15.0)).advance

    @staticmethod
    def character_spacing_px(character_spacing: float, font_size: int) -> float:
        return character_spacing * 0.01 * font_size

    def text_width(self, text: str, font_size: int, character_spacing: float = 0.0) -> int:
        return round(self.text_width_float(text, font_size, character_spacing))

    def text_width_float(self, text: str, font_size: int, character_spacing: float = 0.0) -> float:
        scale = font_size / self.point_size
        spacing = self.character_spacing_px(character_spacing, font_size)
        width = 0.0
        visible_count = 0
        for char in text:
            glyph = self.glyphs.get(char)
            width += (glyph.advance if glyph else self.space_advance) * scale
            visible_count += 1
        if visible_count > 1:
            width += (visible_count - 1) * spacing
        return width

    def text_line_height(self, font_size: int, line_spacing: float = 0.0) -> int:
        face_line_height = self.line_height * font_size / self.point_size
        spacing = line_spacing * font_size * 0.01
        return max(1, round(face_line_height + spacing))

    @staticmethod
    def tmp_spacing_height(font_size: int, spacing: float) -> int:
        return max(0, math.ceil(spacing * font_size * 0.01))

    def render_line(
        self,
        text: str,
        font_size: int,
        fill: tuple[int, int, int],
        material: dict[str, object] | None = None,
        character_spacing: float = 0.0,
        shader_font_size: int | None = None,
        bold: bool = False,
        trim: bool = True,
        isolate_bleed: bool = False,
    ) -> Image.Image:
        scale = font_size / self.point_size
        spacing = self.character_spacing_px(character_spacing, font_size)
        pad = max(4, round(font_size * 0.25))
        cursor = pad
        baseline = pad + round(27.0 * scale)
        width = self.text_width(text, font_size, character_spacing) + pad * 2
        height = round(42.0 * scale) + pad * 2
        result = Image.new("RGBA", (max(1, width), max(1, height)), (0, 0, 0, 0))

        for char in text:
            glyph = self.glyphs.get(char)
            if glyph is None or glyph.width == 0 or glyph.height == 0:
                cursor += self.space_advance * scale + spacing
                continue
            active_material = material or DEFAULT_ATLAS_MATERIAL
            crop_pad = tmp_glyph_padding(active_material, bold)
            left = max(0, glyph.x - crop_pad)
            top = max(0, self.atlas.height - glyph.y - glyph.height - crop_pad)
            right = min(self.atlas.width, glyph.x + glyph.width + crop_pad)
            bottom = min(self.atlas.height, self.atlas.height - glyph.y + crop_pad)
            sdf = self.atlas.crop((left, top, right, bottom))
            if isolate_bleed:
                glyph_box = (
                    glyph.x - left,
                    self.atlas.height - glyph.y - glyph.height - top,
                    glyph.x + glyph.width - left,
                    self.atlas.height - glyph.y - top,
                )
                sdf = isolate_sdf_component(sdf, glyph_box, crop_pad)
            sdf = magic_kernel_sharp_resize_l(
                sdf,
                (max(1, round(sdf.width * scale)), max(1, round(sdf.height * scale))),
            )
            glyph_left = cursor + (glyph.bearing_x - crop_pad) * scale
            glyph_top = baseline - (glyph.bearing_y + crop_pad) * scale

            fill_alpha, outline_alpha, underlay = tmp_sdf_alphas(sdf, active_material, font_size, bold=bold)
            if underlay is not None:
                underlay_alpha, underlay_offset = underlay
                color = active_material.get("underlay_color", (0.0, 0.0, 0.0, 0.0))
                underlay_color = rgb_from_unit((color[0], color[1], color[2]))
                underlay_layer = Image.new("RGBA", sdf.size, (*underlay_color, 255))
                underlay_layer.putalpha(underlay_alpha)
                alpha_composite_subpixel(
                    result,
                    underlay_layer,
                    (glyph_left + underlay_offset[0], glyph_top + underlay_offset[1]),
                )
            if outline_alpha is not None:
                outline_color = rgb_from_unit(active_material["outline_color"])
                outline = Image.new("RGBA", sdf.size, (*outline_color, 255))
                outline.putalpha(outline_alpha)
                alpha_composite_subpixel(result, outline, (glyph_left, glyph_top))

            face = Image.new("RGBA", sdf.size, (*fill, 255))
            face.putalpha(fill_alpha)
            alpha_composite_subpixel(result, face, (glyph_left, glyph_top))
            cursor += glyph.advance * scale + spacing

        if trim:
            return result.crop(result.getbbox() or (0, 0, 1, 1))
        return result

    def render_rich_line(
        self,
        tokens: list[str],
        font_size: int,
        character_spacing: float = 0.0,
        shader_font_size: int | None = None,
        trim: bool = True,
        normal_face_dilate: float | None = None,
        bold_face_dilate: float | None = None,
    ) -> Image.Image:
        scale = font_size / self.point_size
        spacing = self.character_spacing_px(character_spacing, font_size)
        pad = max(4, round(font_size * 0.25))
        baseline = pad + round(27.0 * scale)
        visible_text = "".join(display_token(token) for token in tokens)
        width = self.text_width(visible_text, font_size, character_spacing) + pad * 2
        height = round(42.0 * scale) + pad * 2
        result = Image.new("RGBA", (max(1, width), max(1, height)), (0, 0, 0, 0))
        cursor = pad
        previous_visible = ""

        for token in tokens:
            visible = display_token(token)
            fill, _, _ = token_style(token, previous_visible)
            bold = token_is_keyword(token)
            active_material = DEFAULT_ATLAS_MATERIAL
            face_dilate = bold_face_dilate if bold else normal_face_dilate
            if face_dilate is not None:
                active_material = {**DEFAULT_ATLAS_MATERIAL, "face_dilate": face_dilate}
            for char in visible:
                glyph = self.glyphs.get(char)
                if glyph is None or glyph.width == 0 or glyph.height == 0:
                    cursor += self.space_advance * scale + spacing
                    continue
                crop_pad = tmp_glyph_padding(active_material, bold)
                left = max(0, glyph.x - crop_pad)
                top = max(0, self.atlas.height - glyph.y - glyph.height - crop_pad)
                right = min(self.atlas.width, glyph.x + glyph.width + crop_pad)
                bottom = min(self.atlas.height, self.atlas.height - glyph.y + crop_pad)
                sdf = self.atlas.crop((left, top, right, bottom))
                sdf = magic_kernel_sharp_resize_l(
                    sdf,
                    (max(1, round(sdf.width * scale)), max(1, round(sdf.height * scale))),
                )
                glyph_left = cursor + (glyph.bearing_x - crop_pad) * scale
                glyph_top = baseline - (glyph.bearing_y + crop_pad) * scale
                fill_alpha, _, _ = tmp_sdf_alphas(sdf, active_material, font_size, bold=bold)
                face = Image.new("RGBA", sdf.size, (*fill, 255))
                face.putalpha(fill_alpha)
                alpha_composite_subpixel(result, face, (glyph_left, glyph_top))
                cursor += glyph.advance * scale + spacing
            if visible.strip():
                previous_visible = visible

        if trim:
            return result.crop(result.getbbox() or (0, 0, 1, 1))
        return result


_DEFAULT_TMP_FONT: TmpFont | None = None
_HUIWEN_TMP_FONT: TmpFont | None = None


def default_tmp_font() -> TmpFont:
    global _DEFAULT_TMP_FONT
    if _DEFAULT_TMP_FONT is None:
        _DEFAULT_TMP_FONT = TmpFont(DEFAULT_TMP_FONT_PATH_ID, DEFAULT_ATLAS_PATH)
    return _DEFAULT_TMP_FONT


def huiwen_tmp_font() -> TmpFont:
    global _HUIWEN_TMP_FONT
    if _HUIWEN_TMP_FONT is None:
        _HUIWEN_TMP_FONT = TmpFont(HUIWEN_TMP_FONT_PATH_ID, HUIWEN_ATLAS_PATH)
    return _HUIWEN_TMP_FONT


CARD_LEVELS = [
    CardLevel(level=1, card_id=1000025, defense=8),
    CardLevel(level=2, card_id=1010025, defense=14),
    CardLevel(level=3, card_id=1020025, defense=20),
]

DREAM_CARD_LEVELS = [
    DreamCardLevel(ref_id="D11131", level_name="LianQi", damage=5, per_formation_damage=1),
    DreamCardLevel(ref_id="D11132", level_name="ZhuJi", damage=5, per_formation_damage=2),
    DreamCardLevel(ref_id="D11133", level_name="JinDan", damage=6, per_formation_damage=3),
    DreamCardLevel(ref_id="D11134", level_name="YuanYing", damage=4, per_formation_damage=1, chase=True),
    DreamCardLevel(ref_id="D11135", level_name="HuaShen", damage=8, per_formation_damage=1, chase=True),
]

LOCALES = [
    LocaleText(
        suffix="zh",
        title="御空剑阵",
        chinese_title="御空剑阵",
        description="[防]>0则此牌无需灵气\n[防]+{def}\n[再次行动]",
    ),
    LocaleText(
        suffix="tw",
        title="禦空劍陣",
        chinese_title="禦空劍陣",
        description="[防]>0則此牌無需靈氣\n[防]+{def}\n[再次行動]",
    ),
    LocaleText(
        suffix="en",
        title="Rule Sky Sword Formation",
        chinese_title="御空剑阵",
        description="No Qi cost for this card if [DEF]>0\n[DEF]+{def}\n[Chase]",
    ),
]

DREAM_LOCALES = [
    LocaleText(
        suffix="zh",
        title="梦·御空剑阵",
        chinese_title="梦·御空剑阵",
        description="造成{damage}点伤害\n卡组每有一张\n剑阵多{per}伤害",
    ),
    LocaleText(
        suffix="en",
        title="Dream - Rule Sky Sword Formation",
        chinese_title="梦·御空剑阵",
        description="Deal {damage} DMG\nFor each Sword\nFormation in your\ndeck, deal {per} more\nDMG",
    ),
]

DREAM_CHASE_DESCRIPTIONS = {
    "zh": "造成{damage}点伤害\n每用过一张剑\n阵多{per}伤害\n卡组剑阵数量\n≥2则[再次行动]",
    "en": (
        "Deal {damage} DMG\n"
        "For each Sword\n"
        "Formation played,\n"
        "deal {per} more DMG\n"
        "If there are 2 or\n"
        "more Sword Formations\n"
        "in your deck, [Chase]"
    ),
}

NORMAL_REF_TO_LEVEL = {
    "115061": 1,
    "115062": 2,
    "115063": 3,
}


def font(size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(FONT_PATH), size=size)


def scaled_font(size: int, render_scale: float) -> ImageFont.FreeTypeFont:
    return font(max(1, round(size * render_scale)))


def scaled_box(rect: PixelRect, render_scale: float) -> tuple[int, int, int, int]:
    return (
        round(rect.left * render_scale),
        round(rect.top * render_scale),
        round(rect.right * render_scale),
        round(rect.bottom * render_scale),
    )


def scaled_box_float(rect: PixelRect, render_scale: float) -> tuple[float, float, float, float]:
    return (
        rect.left * render_scale,
        rect.top * render_scale,
        rect.right * render_scale,
        rect.bottom * render_scale,
    )


def scaled_point(point: tuple[float, float], render_scale: float) -> tuple[int, int]:
    return (round(point[0] * render_scale), round(point[1] * render_scale))


def scaled_size(size: tuple[float, float], render_scale: float) -> tuple[int, int]:
    return (round(size[0] * render_scale), round(size[1] * render_scale))


def scaled_px(value: int, render_scale: float) -> int:
    return max(1, round(value * render_scale))


def scaled_signed_px(value: float, render_scale: float) -> int:
    return round(value * render_scale)


def scaled_signed_float(value: float, render_scale: float) -> float:
    return value * render_scale


def scaled_ui_font_size(value: float, render_scale: float) -> int:
    return max(1, round(value * _scale()[1] * render_scale))


def scaled_description_font_size(value: float, render_scale: float) -> int:
    # TMP lays text out in UI units before render-target scaling.  Keep
    # description font sizes scale-stable so 2x rendering does not change wraps
    # by landing one raster pixel above the corresponding 1x size.
    scale_step = max(1, round(render_scale))
    return max(1, round(value * _scale()[1]) * scale_step)


def scaled_ui_px(value: float, render_scale: float) -> int:
    return round(value * _scale()[1] * render_scale)


def rgb_from_unit(values: tuple[float, float, float]) -> tuple[int, int, int]:
    return tuple(max(0, min(255, round(v * 255))) for v in values)


def multiply_unit_rgb(a: tuple[float, float, float], b: tuple[float, float, float]) -> tuple[float, float, float]:
    return (a[0] * b[0], a[1] * b[1], a[2] * b[2])


def tmp_outline_px(material: dict[str, object], render_scale: float) -> int:
    native_px = (
        float(material["face_dilate"]) + float(material["outline_width"])
    ) * float(material["gradient_scale"]) * float(material["scale_ratio_a"])
    return max(1, round(native_px * render_scale))


def tmp_glyph_padding(material: dict[str, object], bold: bool = False) -> int:
    """Atlas pixels included around a glyph, matching TMP's padding logic."""

    scale_ratio = float(material["scale_ratio_a"])
    face = float(material["face_dilate"]) * scale_ratio
    softness = float(material.get("outline_softness", 0.0)) * scale_ratio
    outline = float(material["outline_width"]) * scale_ratio
    effect = min(max(face + softness + outline, 0.0), 1.0)
    padding = effect * float(material["gradient_scale"]) + 1.25
    style = (
        float(material["weight_bold"] if bold else material["weight_normal"])
        / 4.0
        * float(material["gradient_scale"])
        * scale_ratio
    )
    return max(2, int(round(padding + style + 0.5)))


def isolate_sdf_component(sdf_alpha: Image.Image, glyph_box: tuple[int, int, int, int], fringe: int) -> Image.Image:
    """Remove neighboring atlas glyph bleed while preserving the glyph fringe.

    TMP expands glyph UVs by material padding.  That works when the atlas packer
    leaves a clean SDF fringe; the Huiwen digit cell for "1" has disconnected
    remnants from adjacent glyphs inside the expanded crop.  Keep only high-SDF
    components intersecting the real glyph rect, then dilate enough to retain the
    intended face/outline distance field around that component.
    """

    high = sdf_alpha.point(lambda v: 255 if v >= 64 else 0)
    width, height = high.size
    pixels = high.load()
    gx0, gy0, gx1, gy1 = glyph_box
    keep: set[tuple[int, int]] = set()
    seen: set[tuple[int, int]] = set()

    for y in range(height):
        for x in range(width):
            if pixels[x, y] == 0 or (x, y) in seen:
                continue
            stack = [(x, y)]
            component: list[tuple[int, int]] = []
            seen.add((x, y))
            touches_glyph = False
            while stack:
                px, py = stack.pop()
                component.append((px, py))
                if gx0 <= px < gx1 and gy0 <= py < gy1:
                    touches_glyph = True
                for nx, ny in ((px - 1, py), (px + 1, py), (px, py - 1), (px, py + 1)):
                    if 0 <= nx < width and 0 <= ny < height and pixels[nx, ny] and (nx, ny) not in seen:
                        seen.add((nx, ny))
                        stack.append((nx, ny))
            if touches_glyph:
                keep.update(component)

    if not keep:
        return sdf_alpha

    mask = Image.new("L", sdf_alpha.size, 0)
    mask_pixels = mask.load()
    radius = max(1, fringe)
    for x, y in keep:
        for yy in range(max(0, y - radius), min(height, y + radius + 1)):
            for xx in range(max(0, x - radius), min(width, x + radius + 1)):
                mask_pixels[xx, yy] = 255

    cleaned = Image.new("L", sdf_alpha.size, 0)
    cleaned.paste(sdf_alpha, mask=mask)
    return cleaned


def keep_largest_alpha_component(image: Image.Image, threshold: int = 1) -> Image.Image:
    alpha = image.getchannel("A")
    mask = alpha.point(lambda value: 255 if value >= threshold else 0)
    width, height = mask.size
    pixels = mask.load()
    seen: set[tuple[int, int]] = set()
    largest: list[tuple[int, int]] = []

    for y in range(height):
        for x in range(width):
            if pixels[x, y] == 0 or (x, y) in seen:
                continue
            stack = [(x, y)]
            component: list[tuple[int, int]] = []
            seen.add((x, y))
            while stack:
                px, py = stack.pop()
                component.append((px, py))
                for nx in (px - 1, px, px + 1):
                    for ny in (py - 1, py, py + 1):
                        if 0 <= nx < width and 0 <= ny < height and pixels[nx, ny] and (nx, ny) not in seen:
                            seen.add((nx, ny))
                            stack.append((nx, ny))
            if len(component) > len(largest):
                largest = component

    if not largest:
        return image

    keep = Image.new("L", image.size, 0)
    keep_pixels = keep.load()
    for x, y in largest:
        keep_pixels[x, y] = 255
    result = Image.new("RGBA", image.size, (0, 0, 0, 0))
    result.paste(image, mask=keep)
    return result.crop(result.getbbox() or (0, 0, 1, 1))


def magic_kernel_shift_rgba(image: Image.Image, shift_x: float, shift_y: float) -> Image.Image:
    c_result = magic_kernel_shift_rgba_c(image, shift_x, shift_y)
    if c_result is not None:
        return c_result
    source = image.convert("RGBA")
    width, height = source.size
    out_width = width + 2
    out_height = height + 2
    src_pixels = source.load()
    temp = [[[0.0, 0.0, 0.0, 0.0] for _ in range(out_width)] for _ in range(height)]

    for y in range(height):
        for x in range(out_width):
            src_x = x - shift_x
            start = math.floor(src_x - 1.5)
            end = math.ceil(src_x + 1.5)
            total_weight = 0.0
            acc = [0.0, 0.0, 0.0, 0.0]
            for sx in range(start, end + 1):
                if sx < 0 or sx >= width:
                    continue
                weight = magic_kernel(src_x - sx)
                if weight == 0.0:
                    continue
                r, g, b, a = src_pixels[sx, y]
                alpha = a / 255.0
                acc[0] += r * alpha * weight
                acc[1] += g * alpha * weight
                acc[2] += b * alpha * weight
                acc[3] += a * weight
                total_weight += weight
            if total_weight:
                temp[y][x] = [value / total_weight for value in acc]

    result = Image.new("RGBA", (out_width, out_height), (0, 0, 0, 0))
    out_pixels = result.load()
    for y in range(out_height):
        src_y = y - shift_y
        start = math.floor(src_y - 1.5)
        end = math.ceil(src_y + 1.5)
        for x in range(out_width):
            total_weight = 0.0
            acc = [0.0, 0.0, 0.0, 0.0]
            for sy in range(start, end + 1):
                if sy < 0 or sy >= height:
                    continue
                weight = magic_kernel(src_y - sy)
                if weight == 0.0:
                    continue
                row_pixel = temp[sy][x]
                acc[0] += row_pixel[0] * weight
                acc[1] += row_pixel[1] * weight
                acc[2] += row_pixel[2] * weight
                acc[3] += row_pixel[3] * weight
                total_weight += weight
            if not total_weight:
                continue
            alpha = max(0.0, min(255.0, acc[3] / total_weight))
            if alpha <= 0.0:
                continue
            unpremultiply = 255.0 / alpha
            out_pixels[x, y] = (
                clamp_byte((acc[0] / total_weight) * unpremultiply),
                clamp_byte((acc[1] / total_weight) * unpremultiply),
                clamp_byte((acc[2] / total_weight) * unpremultiply),
                clamp_byte(alpha),
            )
    return result


def alpha_composite_subpixel(canvas: Image.Image, image: Image.Image, xy: tuple[float, float]) -> None:
    x, y = xy
    ix = math.floor(x)
    iy = math.floor(y)
    fx = x - ix
    fy = y - iy
    if abs(fx) < 1e-6 and abs(fy) < 1e-6:
        canvas.alpha_composite(image, (ix, iy))
        return
    shifted = magic_kernel_shift_rgba(image, fx, fy)
    canvas.alpha_composite(shifted, (ix, iy))


def magic_kernel(value: float) -> float:
    x = abs(value)
    if x <= 0.5:
        return 0.75 - x * x
    if x <= 1.5:
        return 0.5 * (x - 1.5) * (x - 1.5)
    return 0.0


def clamp_byte(value: float) -> int:
    return max(0, min(255, round(value)))


_MKS_LIB: ctypes.CDLL | None | bool = None


def magic_kernel_sharp_lib() -> ctypes.CDLL | None:
    global _MKS_LIB
    if _MKS_LIB is False:
        return None
    if isinstance(_MKS_LIB, ctypes.CDLL):
        return _MKS_LIB
    try:
        RENDER_CACHE_DIR.mkdir(parents=True, exist_ok=True)
        if not MKS_SO_PATH.exists() or MKS_SO_PATH.stat().st_mtime < MKS_C_PATH.stat().st_mtime:
            subprocess.run(
                [
                    "gcc",
                    "-O3",
                    "-fPIC",
                    "-shared",
                    "-o",
                    str(MKS_SO_PATH),
                    str(MKS_C_PATH),
                    "-lm",
                ],
                check=True,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
            )
        lib = ctypes.CDLL(str(MKS_SO_PATH))
        u8_ptr = ctypes.POINTER(ctypes.c_uint8)
        lib.mks_resample_axis_rgba.argtypes = [
            u8_ptr,
            ctypes.c_int,
            ctypes.c_int,
            ctypes.c_int,
            ctypes.c_int,
            u8_ptr,
        ]
        lib.mks_resample_axis_rgba.restype = ctypes.c_int
        lib.mks_sharp_axis_rgba.argtypes = [
            u8_ptr,
            ctypes.c_int,
            ctypes.c_int,
            ctypes.c_int,
            u8_ptr,
        ]
        lib.mks_sharp_axis_rgba.restype = ctypes.c_int
        lib.mks_shift_rgba.argtypes = [
            u8_ptr,
            ctypes.c_int,
            ctypes.c_int,
            ctypes.c_double,
            ctypes.c_double,
            u8_ptr,
        ]
        lib.mks_shift_rgba.restype = ctypes.c_int
        _MKS_LIB = lib
        return lib
    except (OSError, subprocess.SubprocessError):
        _MKS_LIB = False
        return None


def image_from_rgba_buffer(buffer: ctypes.Array[ctypes.c_uint8], size: tuple[int, int]) -> Image.Image:
    return Image.frombytes("RGBA", size, bytes(buffer))


def magic_kernel_shift_rgba_c(image: Image.Image, shift_x: float, shift_y: float) -> Image.Image | None:
    lib = magic_kernel_sharp_lib()
    if lib is None:
        return None
    source = image.convert("RGBA")
    width, height = source.size
    source_bytes = source.tobytes()
    source_buffer = (ctypes.c_uint8 * len(source_bytes)).from_buffer_copy(source_bytes)
    output_buffer = (ctypes.c_uint8 * ((width + 2) * (height + 2) * 4))()
    result = lib.mks_shift_rgba(source_buffer, width, height, shift_x, shift_y, output_buffer)
    if result != 0:
        return None
    return image_from_rgba_buffer(output_buffer, (width + 2, height + 2))


def resample_axis_magic_kernel_c(image: Image.Image, target_size: int, axis: str) -> Image.Image | None:
    lib = magic_kernel_sharp_lib()
    if lib is None:
        return None
    source = image.convert("RGBA")
    source_width, source_height = source.size
    if (axis == "x" and source_width == target_size) or (axis == "y" and source_height == target_size):
        return source.copy()
    target_width = target_size if axis == "x" else source_width
    target_height = target_size if axis == "y" else source_height
    source_bytes = source.tobytes()
    source_buffer = (ctypes.c_uint8 * len(source_bytes)).from_buffer_copy(source_bytes)
    output_buffer = (ctypes.c_uint8 * (target_width * target_height * 4))()
    result = lib.mks_resample_axis_rgba(
        source_buffer,
        source_width,
        source_height,
        target_size,
        0 if axis == "x" else 1,
        output_buffer,
    )
    if result != 0:
        return None
    return image_from_rgba_buffer(output_buffer, (target_width, target_height))


def sharp_2021_axis_c(image: Image.Image, axis: str) -> Image.Image | None:
    lib = magic_kernel_sharp_lib()
    if lib is None:
        return None
    source = image.convert("RGBA")
    width, height = source.size
    source_bytes = source.tobytes()
    source_buffer = (ctypes.c_uint8 * len(source_bytes)).from_buffer_copy(source_bytes)
    output_buffer = (ctypes.c_uint8 * (width * height * 4))()
    result = lib.mks_sharp_axis_rgba(
        source_buffer,
        width,
        height,
        0 if axis == "x" else 1,
        output_buffer,
    )
    if result != 0:
        return None
    return image_from_rgba_buffer(output_buffer, (width, height))


def resample_axis_magic_kernel_py(image: Image.Image, target_size: int, axis: str) -> Image.Image:
    source = image.convert("RGBA")
    source_width, source_height = source.size
    if (axis == "x" and source_width == target_size) or (axis == "y" and source_height == target_size):
        return source.copy()

    target_width = target_size if axis == "x" else source_width
    target_height = target_size if axis == "y" else source_height
    output = Image.new("RGBA", (target_width, target_height), (0, 0, 0, 0))
    src = source.load()
    dst = output.load()
    src_extent = source_width if axis == "x" else source_height
    dst_extent = target_size
    scale = dst_extent / src_extent

    for out_y in range(target_height):
        for out_x in range(target_width):
            out_pos = out_x if axis == "x" else out_y
            center = (out_pos + 0.5) / scale - 0.5
            radius = 1.5 / min(scale, 1.0)
            start = max(0, int(center - radius) - 1)
            end = min(src_extent - 1, int(center + radius) + 1)
            total_weight = 0.0
            channels = [0.0, 0.0, 0.0, 0.0]
            for sample_pos in range(start, end + 1):
                distance = (sample_pos - center) * min(scale, 1.0)
                weight = magic_kernel(distance)
                if weight == 0.0:
                    continue
                px = sample_pos if axis == "x" else out_x
                py = out_y if axis == "x" else sample_pos
                rgba = src[px, py]
                total_weight += weight
                for index, channel in enumerate(rgba):
                    channels[index] += channel * weight
            if total_weight:
                dst[out_x, out_y] = tuple(clamp_byte(channel / total_weight) for channel in channels)
    return output


def resample_axis_magic_kernel(image: Image.Image, target_size: int, axis: str) -> Image.Image:
    c_result = resample_axis_magic_kernel_c(image, target_size, axis)
    if c_result is not None:
        return c_result
    return resample_axis_magic_kernel_py(image, target_size, axis)


def sharp_2021_axis_py(image: Image.Image, axis: str) -> Image.Image:
    source = image.convert("RGBA")
    width, height = source.size
    output = Image.new("RGBA", source.size, (0, 0, 0, 0))
    src = source.load()
    dst = output.load()
    kernel = (-1.0, 6.0, -35.0, 204.0, -35.0, 6.0, -1.0)
    divisor = 144.0
    for y in range(height):
        for x in range(width):
            channels = [0.0, 0.0, 0.0, 0.0]
            for offset, weight in zip(range(-3, 4), kernel):
                px = min(width - 1, max(0, x + offset)) if axis == "x" else x
                py = y if axis == "x" else min(height - 1, max(0, y + offset))
                rgba = src[px, py]
                for index, channel in enumerate(rgba):
                    channels[index] += channel * weight
            dst[x, y] = tuple(clamp_byte(channel / divisor) for channel in channels)
    return output


def sharp_2021_axis(image: Image.Image, axis: str) -> Image.Image:
    c_result = sharp_2021_axis_c(image, axis)
    if c_result is not None:
        return c_result
    return sharp_2021_axis_py(image, axis)


def magic_kernel_sharp_resize(image: Image.Image, size: tuple[int, int]) -> Image.Image:
    """Resize using Magic Kernel plus Sharp 2021 post-filter.

    This is intentionally small and dependency-free; we use it for cached glyph
    assets where quality matters and the cost is paid once on disk.
    """

    result = image.convert("RGBA")
    if result.width != size[0]:
        result = resample_axis_magic_kernel(result, size[0], "x")
        result = sharp_2021_axis(result, "x")
    if result.height != size[1]:
        result = resample_axis_magic_kernel(result, size[1], "y")
        result = sharp_2021_axis(result, "y")
    return result


def magic_kernel_sharp_resize_l(image: Image.Image, size: tuple[int, int]) -> Image.Image:
    if image.size == size and image.mode == "L":
        return image.copy()
    channel = image.convert("L")
    rgba = Image.merge("RGBA", (channel, channel, channel, channel))
    return magic_kernel_sharp_resize(rgba, size).getchannel("R")


def tmp_sdf_alphas(
    sdf_alpha: Image.Image,
    material: dict[str, object],
    font_size: int,
    bold: bool = False,
) -> tuple[Image.Image, Image.Image | None, tuple[Image.Image, tuple[int, int]] | None]:
    """Evaluate TMP's distance-field face/outline model for a CPU image.

    This mirrors the TextMeshPro Mobile/Distance Field shader's core pixel
    math.  The vertex shader computes:
        weight = (styleWeight / 4 + FaceDilate) * ScaleRatioA * 0.5
        scale = screenScale * GradientScale
        bias = (0.5 - weight) * scale - 0.5
        outline = OutlineWidth * ScaleRatioA * 0.5 * scale
    The pixel shader then samples `d = atlasAlpha * scale` and uses
    saturate(d - bias) or, with outline enabled, saturate(d - (bias - outline))
    and saturate(d - (bias + outline)).
    """

    scale_ratio = float(material["scale_ratio_a"])
    font_weight = float(material["weight_bold"] if bold else material["weight_normal"]) / 4.0
    gradient_scale = float(material["gradient_scale"])
    distance_scale = max(1.0, gradient_scale * font_size / DEFAULT_FONT_POINT_SIZE)
    softness = float(material.get("outline_softness", 0.0)) * scale_ratio * distance_scale
    distance_scale = distance_scale / (1.0 + softness)
    weight = (font_weight + float(material["face_dilate"])) * scale_ratio * 0.5
    bias = (0.5 - weight) * distance_scale - 0.5
    outline_width = float(material["outline_width"])
    outline = outline_width * scale_ratio * 0.5 * distance_scale

    def saturate_alpha(px: int, threshold: float) -> int:
        return max(0, min(255, round(((px / 255.0) * distance_scale - threshold) * 255)))

    underlay = tmp_sdf_underlay(sdf_alpha, material, font_size)
    if outline_width <= 0:
        face = sdf_alpha.point(lambda px: saturate_alpha(px, bias))
        return face, None, underlay
    face = sdf_alpha.point(lambda px: saturate_alpha(px, bias + outline))
    outline_alpha = sdf_alpha.point(lambda px: saturate_alpha(px, bias - outline))
    return face, outline_alpha, underlay


def tmp_sdf_underlay(
    sdf_alpha: Image.Image,
    material: dict[str, object],
    font_size: int,
) -> tuple[Image.Image, tuple[int, int]] | None:
    alpha = float(material.get("underlay_color", (0.0, 0.0, 0.0, 0.0))[3])
    if alpha <= 0.0:
        return None
    offset_x = float(material.get("underlay_offset_x", 0.0))
    offset_y = float(material.get("underlay_offset_y", 0.0))
    dilate = float(material.get("underlay_dilate", 0.0))
    softness = float(material.get("underlay_softness", 0.0))
    if offset_x == 0.0 and offset_y == 0.0 and dilate == 0.0 and softness == 0.0:
        return None

    scale_ratio = float(material.get("scale_ratio_c", 0.0))
    gradient_scale = float(material["gradient_scale"])
    distance_scale = max(1.0, gradient_scale * font_size / DEFAULT_FONT_POINT_SIZE)
    softness_scaled = softness * scale_ratio * distance_scale
    distance_scale = distance_scale / (1.0 + softness_scaled)
    weight = dilate * scale_ratio * 0.5
    bias = (0.5 - weight) * distance_scale - 0.5

    def saturate_underlay(px: int) -> int:
        value = max(0, min(255, round(((px / 255.0) * distance_scale - bias) * 255)))
        return round(value * alpha)

    offset_scale = gradient_scale * scale_ratio * font_size / DEFAULT_FONT_POINT_SIZE
    # TMP's underlay Y value is expressed in UV space; negative serialized Y
    # moves the visible copy downward in image coordinates.
    offset = (round(offset_x * offset_scale), round(-offset_y * offset_scale))
    return sdf_alpha.point(saturate_underlay), offset


def text_width(draw: ImageDraw.ImageDraw, text: str, fnt: ImageFont.FreeTypeFont) -> int:
    if not text:
        return 0
    left, _, right, _ = draw.textbbox((0, 0), text, font=fnt)
    return right - left


def default_tmp_text_width(text: str, fnt: ImageFont.FreeTypeFont) -> int:
    return default_tmp_font().text_width(text, fnt.size, 1.0)


def default_tmp_text_width_float(text: str, fnt: ImageFont.FreeTypeFont) -> float:
    return default_tmp_font().text_width_float(text, fnt.size, 1.0)


def default_tmp_text_width_float_spaced(character_spacing: float):
    def measure(_draw: ImageDraw.ImageDraw, text: str, fnt: ImageFont.FreeTypeFont) -> float:
        return default_tmp_font().text_width_float(text, fnt.size, character_spacing)

    return measure


def is_full_width_char(char: str) -> bool:
    return unicodedata.east_asian_width(char) in {"F", "W"}


def default_tmp_cell_width_float_spaced(character_spacing: float):
    def measure(
        _draw: ImageDraw.ImageDraw,
        text: str,
        fnt: ImageFont.FreeTypeFont,
        token: str = "",
    ) -> float:
        del token
        font_asset = default_tmp_font()
        scale = fnt.size / font_asset.point_size
        spacing = font_asset.character_spacing_px(character_spacing, fnt.size)
        cell_units = sum(30.0 if is_full_width_char(char) else 15.0 for char in text)
        width = cell_units * scale
        if len(text) > 1:
            width += (len(text) - 1) * spacing
        return width

    return measure


def desc_wrap_width_fn(locale_suffix: str, character_spacing: float):
    return default_tmp_cell_width_float_spaced(character_spacing)


def fit_font(draw: ImageDraw.ImageDraw, text: str, max_width: int, size: int) -> ImageFont.FreeTypeFont:
    while size > 10:
        fnt = font(size)
        if text_width(draw, text, fnt) <= max_width:
            return fnt
        size -= 1
    return font(size)


def wrap_plain_line(
    draw: ImageDraw.ImageDraw,
    line: str,
    fnt: ImageFont.FreeTypeFont,
    max_width: int,
) -> list[str]:
    if not line:
        return [""]

    if " " in line:
        words = line.split(" ")
        rows: list[str] = []
        row = words[0]
        for word in words[1:]:
            candidate = f"{row} {word}"
            if text_width(draw, candidate, fnt) <= max_width:
                row = candidate
            else:
                rows.append(row)
                row = word
        rows.append(row)
        return rows

    rows = []
    row = ""
    for char in line:
        candidate = row + char
        if row and text_width(draw, candidate, fnt) > max_width:
            rows.append(row)
            row = char
        else:
            row = candidate
    if row:
        rows.append(row)
    return rows


def wrap_plain_line_tmp(text: str, font_size: int, max_width: int, character_spacing: float = 0.0) -> list[str]:
    if not text:
        return [""]
    font_asset = default_tmp_font()
    words = text.split(" ")
    rows: list[str] = []
    row = words[0]
    for word in words[1:]:
        candidate = f"{row} {word}"
        if font_asset.text_width(candidate, font_size, character_spacing) <= max_width:
            row = candidate
        else:
            rows.append(row)
            row = word
    rows.append(row)
    return rows


def rich_tokens(text: str) -> list[str]:
    tokens: list[str] = []
    in_ascii_quote = False
    for token in TOKEN_RE.findall(text):
        if not token:
            continue
        if token == '"':
            in_ascii_quote = not in_ascii_quote
            tokens.append(token)
            continue
        if token.startswith("[") and token.endswith("]"):
            keyword = token[1:-1]
            if keyword.startswith("color:"):
                tokens.append(token)
                continue
            if CJK_RE.search(keyword):
                tokens.extend(f"[{char}|{keyword}]" for char in keyword)
                continue
            if " " in keyword:
                parts = re.split(r"(\s+)", keyword)
                tokens.extend(f"[{part}|{keyword}]" if not part.isspace() else part for part in parts if part)
                continue
        if in_ascii_quote and not token.isspace() and not (token.startswith("[") and token.endswith("]")):
            tokens.append(f"[quote:{token}|{token}]")
            continue
        tokens.append(token)
    return merge_unbreakable_english_phrases(tokens)


def merge_unbreakable_english_phrases(tokens: list[str]) -> list[str]:
    merged: list[str] = []
    index = 0
    while index < len(tokens):
        if (
            index + 2 < len(tokens)
            and tokens[index] == "Max"
            and tokens[index + 1].isspace()
            and tokens[index + 2] == "HP"
        ):
            merged.append("Max HP")
            index += 3
            continue
        merged.append(tokens[index])
        index += 1
    return merged


def trim_space_tokens(tokens: list[str]) -> list[str]:
    start = 0
    end = len(tokens)
    while start < end and tokens[start].isspace():
        start += 1
    while end > start and tokens[end - 1].isspace():
        end -= 1
    return tokens[start:end]


def last_space_index(tokens: list[str]) -> int:
    for index in range(len(tokens) - 1, -1, -1):
        if tokens[index].isspace():
            return index
    return -1


def split_cjk_overflow_row(row: list[str], next_token: str) -> tuple[list[str], list[str], bool]:
    """Avoid TMP-unlike breaks around CJK closing punctuation.

    TextMeshPro's CJK line-breaking table keeps a closing quote with the
    preceding glyph and avoids ending a line immediately after that pair.  This
    matters for quoted card names such as “云剑” and “剑阵”.
    """

    if row and display_token(next_token) in CJK_CLOSING_PUNCTUATION and len(row) >= 1:
        return row[:-1], row[-1:] + [next_token], True
    if len(row) >= 2 and display_token(row[-1]) in CJK_CLOSING_PUNCTUATION:
        return row[:-2], row[-2:], False
    if len(row) >= 2 and re.fullmatch(r"\d+", display_token(row[-1])):
        return row[:-1], row[-1:], False
    return row, [], False


def wrap_rich_line(
    draw: ImageDraw.ImageDraw,
    line: str,
    fnt: ImageFont.FreeTypeFont,
    max_width: int,
    width_fn=text_width,
    token_gap_width: float = 0.0,
) -> list[list[str]]:
    rows: list[list[str]] = []
    row: list[str] = []
    row_width = 0.0
    last_break = -1

    def measure(token: str) -> float:
        try:
            return float(width_fn(draw, display_token(token), fnt, token))
        except TypeError:
            return float(width_fn(draw, display_token(token), fnt))

    def tokens_width(tokens: list[str]) -> float:
        if not tokens:
            return 0.0
        return sum(measure(t) for t in tokens) + max(0, len(tokens) - 1) * token_gap_width

    for token in rich_tokens(line):
        token_width = measure(token)
        gap_width = token_gap_width if row else 0.0
        is_breakable = token.isspace()
        candidate_width = row_width + gap_width + token_width
        if row and not token.isspace() and candidate_width >= max_width:
            if last_break >= 0:
                rows.append(trim_space_tokens(row[:last_break]))
                row = row[last_break + 1 :]
                row_width = tokens_width(row)
                last_break = last_space_index(row)
            else:
                emit, carry, consumed_token = split_cjk_overflow_row(row, token)
                emit = trim_space_tokens(emit)
                if emit:
                    rows.append(emit)
                row = carry
                row_width = tokens_width(row)
                if carry and consumed_token:
                    last_break = last_space_index(row)
                    continue
                last_break = -1
                gap_width = token_gap_width if row else 0.0
        if not row and token.isspace():
            continue
        row.append(token)
        row_width += gap_width + token_width
        if is_breakable:
            last_break = len(row) - 1

    if row:
        rows.append(trim_space_tokens(row))
    return split_hyphen_prefix_suffix_rows(avoid_forbidden_line_start(rows)) or [[]]


def avoid_forbidden_line_start(rows: list[list[str]]) -> list[list[str]]:
    fixed_rows = [trim_space_tokens(row) for row in rows if trim_space_tokens(row)]
    index = 1
    while index < len(fixed_rows):
        row = fixed_rows[index]
        if not row or display_token(row[0]) not in LINE_START_FORBIDDEN_PUNCTUATION:
            index += 1
            continue
        previous = fixed_rows[index - 1]
        split = len(previous) - 1
        while split >= 0 and previous[split].isspace():
            split -= 1
        while split > 0 and not previous[split - 1].isspace():
            split -= 1
        if split < 0 or split >= len(previous):
            index += 1
            continue
        carry = previous[split:]
        if (
            carry
            and row
            and not carry[-1].isspace()
            and not row[0].isspace()
            and display_token(row[0]) in LINE_START_FORBIDDEN_PUNCTUATION
        ):
            carry = carry + [" "]
        fixed_rows[index - 1] = trim_space_tokens(previous[:split])
        fixed_rows[index] = trim_space_tokens(carry + row)
        index += 1
    return [row for row in fixed_rows if row]


def split_hyphen_prefix_suffix_rows(rows: list[list[str]]) -> list[list[str]]:
    fixed_rows: list[list[str]] = []
    for row in rows:
        if (
            len(row) >= 3
            and len(row) <= 5
            and re.fullmatch(r"[A-Za-z]+", display_token(row[0]))
            and display_token(row[1]) == "-"
            and re.fullmatch(r"[A-Za-z]+", display_token(row[2]))
        ):
            fixed_rows.append([row[0], row[1]])
            fixed_rows.append(row[2:])
        else:
            fixed_rows.append(row)
    merged_rows: list[list[str]] = []
    for row in fixed_rows:
        if (
            merged_rows
            and len(row) == 2
            and re.fullmatch(r"[A-Za-z]+", display_token(row[0]))
            and display_token(row[1]) == "-"
        ):
            previous = merged_rows[-1]
            if previous and not previous[-1].isspace():
                previous.append(" ")
            previous.extend(row)
        else:
            merged_rows.append(row)
    return merged_rows


def draw_centered_stroked(
    draw: ImageDraw.ImageDraw,
    xy: tuple[int, int],
    text: str,
    fnt: ImageFont.FreeTypeFont,
    fill: tuple[int, int, int],
    stroke_fill: tuple[int, int, int],
    stroke_width: int,
    weight: int = 0,
) -> None:
    x, y = xy
    left, top, right, bottom = draw.textbbox((0, 0), text, font=fnt, stroke_width=stroke_width)
    text_x = x - (right - left) / 2
    text_y = y - (bottom - top) / 2 - top
    for dx in range(weight + 1):
        draw.text(
            (text_x + dx, text_y),
            text,
            font=fnt,
            fill=fill,
            stroke_width=stroke_width,
            stroke_fill=stroke_fill,
        )


def draw_text_weighted(
    draw: ImageDraw.ImageDraw,
    xy: tuple[int, int],
    text: str,
    fnt: ImageFont.FreeTypeFont,
    fill: tuple[int, int, int],
    stroke_width: int = 0,
    stroke_fill: tuple[int, int, int] = (0, 0, 0),
    weight: int = 0,
) -> None:
    x, y = xy
    for dx in range(weight + 1):
        draw.text(
            (x + dx, y),
            text,
            font=fnt,
            fill=fill,
            stroke_width=stroke_width,
            stroke_fill=stroke_fill,
        )


def tint_alpha(image: Image.Image, alpha: int) -> Image.Image:
    icon = image.convert("RGBA")
    a = icon.getchannel("A").point(lambda v: v * alpha // 255)
    icon.putalpha(a)
    return icon


def colorize_alpha(image: Image.Image, color: tuple[int, int, int], alpha: int) -> Image.Image:
    icon = image.convert("RGBA")
    mask = icon.getchannel("A").point(lambda v: v * alpha // 255)
    result = Image.new("RGBA", icon.size, (*color, 0))
    result.putalpha(mask)
    return result


def _sdf_alpha(alpha: Image.Image, threshold: int, softness: int) -> Image.Image:
    low = threshold - softness
    high = threshold + softness
    return alpha.point(lambda v: 0 if v <= low else 255 if v >= high else round((v - low) * 255 / (high - low)))


def cache_key_float(value: float) -> str:
    return str(value).replace(".", "p")


def huiwen_digit_cache_path(
    digit: str,
    font_size_ui: float,
    render_scale: float,
    scale_x: float,
    scale_y: float,
) -> Path:
    return (
        RENDER_CACHE_DIR
        / "huiwen_digits"
        / (
            f"digit_{ord(digit):x}_ui{cache_key_float(font_size_ui)}"
            f"_scale{cache_key_float(render_scale)}"
            f"_xs{cache_key_float(scale_x)}"
            f"_ys{cache_key_float(scale_y)}.png"
        )
    )


def _render_clean_huiwen_digit_image(
    digit: str,
    font_size_ui: float,
    render_scale: float,
    scale_x: float,
    scale_y: float,
) -> Image.Image:
    font_size_px = scaled_ui_font_size(font_size_ui, render_scale)
    shader_font_size = scaled_ui_font_size(font_size_ui, 1.0)
    image = huiwen_tmp_font().render_line(
        digit,
        font_size_px,
        fill=(255, 255, 255),
        material=HUIWEN_OUTLINE_MATERIAL,
        shader_font_size=shader_font_size,
        bold=True,
        isolate_bleed=True,
    )
    image = keep_largest_alpha_component(image)
    if scale_x != 1.0 or scale_y != 1.0:
        image = magic_kernel_sharp_resize(
            image,
            (
                max(1, round(image.width * scale_x)),
                max(1, round(image.height * scale_y)),
            ),
        )
    return image


def huiwen_digit_image(
    digit: str,
    font_size_ui: float,
    render_scale: float = 1.0,
    scale_x: float = ANIMA_DIGIT_SCALE_X,
    scale_y: float = ANIMA_DIGIT_SCALE_Y,
) -> Image.Image:
    cache_path = huiwen_digit_cache_path(digit, font_size_ui, render_scale, scale_x, scale_y)
    if cache_path.exists():
        return Image.open(cache_path).convert("RGBA")
    image = _render_clean_huiwen_digit_image(digit, font_size_ui, render_scale, scale_x, scale_y)
    cache_path.parent.mkdir(parents=True, exist_ok=True)
    save_png(image, cache_path)
    return image.copy()


def huiwen_number_image(
    value: str,
    font_size_ui: float,
    render_scale: float = 1.0,
    scale_x: float = ANIMA_DIGIT_SCALE_X,
    scale_y: float = ANIMA_DIGIT_SCALE_Y,
) -> Image.Image:
    glyphs = [huiwen_digit_image(digit, font_size_ui, render_scale, scale_x, scale_y) for digit in value]
    if not glyphs:
        return Image.new("RGBA", (1, 1), (0, 0, 0, 0))
    gap = max(0, round(1 * render_scale))
    width = sum(glyph.width for glyph in glyphs) + gap * max(0, len(glyphs) - 1)
    height = max(glyph.height for glyph in glyphs)
    image = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    x = 0
    for glyph in glyphs:
        image.alpha_composite(glyph, (x, round((height - glyph.height) / 2)))
        x += glyph.width + gap
    return image


def sect_emblem() -> Image.Image:
    return Image.open(TEXTURE_DIR / "SectBottom_1.png").convert("RGBA")


def en_title_bg() -> Image.Image:
    return Image.open(TEXTURE_DIR / "ContentBar_19.png").convert("RGBA")


def draw_centered_stroked_lines(
    draw: ImageDraw.ImageDraw,
    box: tuple[int, int, int, int],
    lines: list[str],
    fnt: ImageFont.FreeTypeFont,
    fill: tuple[int, int, int],
    stroke_fill: tuple[int, int, int],
    stroke_width: int,
    line_height: int,
    weight: int = 0,
) -> None:
    left, top, right, bottom = box
    y = top + max(0, (bottom - top - len(lines) * line_height) // 2)
    center_x = (left + right) // 2
    for line in lines:
        draw_centered_stroked(
            draw,
            (center_x, y + line_height // 2),
            line,
            fnt,
            fill=fill,
            stroke_fill=stroke_fill,
            stroke_width=stroke_width,
            weight=weight,
        )
        y += line_height


def draw_vertical_stroked(
    draw: ImageDraw.ImageDraw,
    box: tuple[int, int, int, int],
    text: str,
    fnt: ImageFont.FreeTypeFont,
    fill: tuple[int, int, int],
    stroke_fill: tuple[int, int, int],
    stroke_width: int,
    line_gap: int = 1,
) -> None:
    left, top, right, bottom = box
    center_x = (left + right) // 2
    heights = []
    for char in text:
        _, bbox_top, _, bbox_bottom = draw.textbbox((0, 0), char, font=fnt, stroke_width=stroke_width)
        heights.append(bbox_bottom - bbox_top)
    total_height = sum(heights) + max(0, len(text) - 1) * line_gap
    y = top + max(0, (bottom - top - total_height) // 2)
    for char in text:
        left, bbox_top, right, bottom = draw.textbbox(
            (0, 0),
            char,
            font=fnt,
            stroke_width=stroke_width,
        )
        width = right - left
        height = bottom - bbox_top
        draw_text_weighted(
            draw,
            (center_x - width / 2, y - bbox_top),
            char,
            fill=fill,
            fnt=fnt,
            stroke_width=stroke_width,
            stroke_fill=stroke_fill,
            weight=1,
        )
        y += height + line_gap


def display_token(token: str) -> str:
    if token.startswith("[") and token.endswith("]"):
        inner = token[1:-1]
        if inner.startswith("color:") and "|" in inner:
            return inner.split("|", 1)[1]
        if inner.startswith("quote:") and "|" in inner:
            return inner.split("|", 1)[1]
        return inner.split("|", 1)[0]
    return token


def token_keyword(token: str) -> str:
    if token.startswith("[") and token.endswith("]"):
        inner = token[1:-1]
        if inner.startswith("color:") and "|" in inner:
            return ""
        if inner.startswith("quote:") and "|" in inner:
            return ""
        if "|" in inner:
            return inner.split("|", 1)[1]
        return inner
    return token


def token_color(token: str) -> tuple[int, int, int] | None:
    if not (token.startswith("[") and token.endswith("]")):
        return None
    inner = token[1:-1]
    if not (inner.startswith("color:#") and "|" in inner):
        return None
    hex_value = inner.split("|", 1)[0].removeprefix("color:#")
    if not re.fullmatch(r"[0-9A-Fa-f]{6}", hex_value):
        return None
    return tuple(int(hex_value[index : index + 2], 16) for index in (0, 2, 4))


def token_is_keyword(token: str) -> bool:
    if not (token.startswith("[") and token.endswith("]")):
        return False
    inner = token[1:-1]
    return not (inner.startswith("color:") or inner.startswith("quote:"))


def token_is_quoted_text(token: str) -> bool:
    return token.startswith("[quote:") and token.endswith("]")


def next_visible_token(tokens: list[str], index: int) -> str:
    for token in tokens[index + 1 :]:
        visible = display_token(token)
        if visible.strip():
            return visible
    return ""


def token_style(
    token: str,
    previous_visible: str = "",
    next_visible: str = "",
) -> tuple[tuple[int, int, int], int, tuple[int, int, int]]:
    display = display_token(token)
    keyword = token_keyword(token)
    explicit_color = token_color(token)
    if explicit_color is not None:
        return explicit_color, 0, (0, 0, 0)
    if keyword in {"持续", "持續", "Continuous", "消耗", "Consumption"}:
        return CONTINUOUS_COLOR, 0, (0, 0, 0)
    if keyword in {"击伤", "擊傷", "Injured"}:
        return INJURED_ATTACK_COLOR, 0, (0, 0, 0)
    if keyword in {"再次行动", "再次行動", "Chase"}:
        return CHASE_COLOR, 0, (0, 0, 0)
    if keyword in {"成长", "成長", "Growth"}:
        return GROWTH_COLOR, 0, (0, 0, 0)
    return BODY_TEXT_COLOR, 0, (0, 0, 0)


def draw_rich_tokens(
    draw: ImageDraw.ImageDraw,
    x: int,
    y: int,
    tokens: list[str],
    fnt: ImageFont.FreeTypeFont,
) -> None:
    previous_visible = ""
    for index, token in enumerate(tokens):
        visible = display_token(token)
        fill, stroke_width, stroke_fill = token_style(token, previous_visible, next_visible_token(tokens, index))
        draw_text_weighted(
            draw,
            (x, y),
            visible,
            fnt,
            fill=fill,
            stroke_width=stroke_width,
            stroke_fill=stroke_fill,
            weight=1,
        )
        x += text_width(draw, visible, fnt)
        if visible.strip():
            previous_visible = visible


def token_list_width(draw: ImageDraw.ImageDraw, tokens: list[str], fnt: ImageFont.FreeTypeFont) -> int:
    return sum(text_width(draw, display_token(token), fnt) for token in tokens)


def text_to_tokens(text: str) -> list[str]:
    return [token for token in rich_tokens(text) if token]


def wrap_display_text(
    draw: ImageDraw.ImageDraw,
    text: str,
    fnt: ImageFont.FreeTypeFont,
    max_width: int,
) -> list[list[str]]:
    rows: list[list[str]] = []
    for source_line in text.splitlines():
        rows.extend(wrap_rich_line(draw, source_line, fnt, max_width))
    return rows


def wrap_display_text_with_gaps(
    draw: ImageDraw.ImageDraw,
    text: str,
    fnt: ImageFont.FreeTypeFont,
    max_width: int,
    width_fn=text_width,
    token_gap_width: float = 0.0,
) -> list[tuple[list[str], bool]]:
    rows: list[tuple[list[str], bool]] = []
    source_lines = text.splitlines()
    for source_index, source_line in enumerate(source_lines):
        wrapped = wrap_rich_line(
            draw,
            source_line,
            fnt,
            max_width,
            width_fn=width_fn,
            token_gap_width=token_gap_width,
        )
        for row_index, row in enumerate(wrapped):
            rows.append((row, source_index < len(source_lines) - 1 and row_index == len(wrapped) - 1))
    return rows


def draw_centered_rich_lines(
    draw: ImageDraw.ImageDraw,
    box: tuple[int, int, int, int],
    rows: list[list[str]],
    fnt: ImageFont.FreeTypeFont,
    line_height: int,
) -> None:
    left, top, right, bottom = box
    total_height = len(rows) * line_height
    y = top + max(0, (bottom - top - total_height) // 2)
    center_x = (left + right) // 2
    for row in rows:
        width = token_list_width(draw, row, fnt)
        draw_rich_tokens(draw, int(center_x - width / 2), y, row, fnt)
        y += line_height


def draw_centered_rich_lines_with_gaps(
    draw: ImageDraw.ImageDraw,
    box: tuple[int, int, int, int],
    rows: list[tuple[list[str], bool]],
    fnt: ImageFont.FreeTypeFont,
    line_height: int,
    paragraph_gap: int,
) -> None:
    left, top, right, bottom = box
    total_height = len(rows) * line_height + sum(paragraph_gap for _, has_gap in rows if has_gap)
    y = top + max(0, (bottom - top - total_height) // 2)
    center_x = (left + right) // 2
    for row, has_gap in rows:
        width = token_list_width(draw, row, fnt)
        draw_rich_tokens(draw, int(center_x - width / 2), y, row, fnt)
        y += line_height + (paragraph_gap if has_gap else 0)


def tmp_token_width(token: str, font_size: int, character_spacing: float = 0.0) -> int:
    return default_tmp_font().text_width(display_token(token), font_size, character_spacing)


def tmp_row_width(row: list[str], font_size: int, character_spacing: float = 0.0) -> int:
    return sum(tmp_token_width(token, font_size, character_spacing) for token in row)


def draw_tmp_rich_tokens(
    canvas: Image.Image,
    x: int,
    y: int,
    tokens: list[str],
    font_size: int,
    character_spacing: float = 0.0,
) -> None:
    previous_visible = ""
    font_asset = default_tmp_font()
    for index, token in enumerate(tokens):
        visible = display_token(token)
        fill, _, _ = token_style(token, previous_visible, next_visible_token(tokens, index))
        image = font_asset.render_line(visible, font_size, fill, character_spacing=character_spacing)
        canvas.alpha_composite(image, (round(x), round(y)))
        x += font_asset.text_width(visible, font_size, character_spacing)
        if visible.strip():
            previous_visible = visible


def draw_tmp_centered_rich_lines_with_gaps(
    canvas: Image.Image,
    box: tuple[float, float, float, float],
    rows: list[tuple[list[str], bool]],
    font_size: int,
    line_height: int,
    paragraph_gap: int,
    character_spacing: float = 0.0,
    shader_font_size: int | None = None,
    glyph_scale: float = 1.0,
    ignore_descenders_for_layout: bool = False,
    fixed_line_offset_y: float = 0.0,
    normal_face_dilate: float | None = None,
    bold_face_dilate: float | None = None,
) -> None:
    left, top, right, bottom = box
    total_height = rich_lines_height(rows, line_height, paragraph_gap)
    y = top + max(0, (bottom - top - total_height) // 2)
    center_x = (left + right) / 2
    layout_raw_y_offset = 0
    if ignore_descenders_for_layout:
        layout_image = default_tmp_font().render_rich_line(
            ["ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789御空剑阵禦空劍陣防灵气靈氣造成伤害傷害卡组組再次行动動"],
            font_size,
            character_spacing,
            shader_font_size=shader_font_size,
            trim=False,
            normal_face_dilate=normal_face_dilate,
            bold_face_dilate=bold_face_dilate,
        )
        layout_bbox = layout_image.getbbox()
        if layout_bbox is not None:
            layout_height = layout_bbox[3] - layout_bbox[1]
            layout_raw_y_offset = round((line_height - layout_height) / 2 - layout_bbox[1])
    for row, has_gap in rows:
        if ignore_descenders_for_layout:
            image = default_tmp_font().render_rich_line(
                row,
                font_size,
                character_spacing,
                shader_font_size=shader_font_size,
                trim=False,
                normal_face_dilate=normal_face_dilate,
                bold_face_dilate=bold_face_dilate,
            )
            if glyph_scale != 1.0:
                image = magic_kernel_sharp_resize(
                    image,
                    (
                        max(1, round(image.width * glyph_scale)),
                        max(1, round(image.height * glyph_scale)),
                    ),
                )
            alpha_composite_subpixel(
                canvas,
                image,
                (
                    center_x - image.width / 2,
                    y + layout_raw_y_offset + fixed_line_offset_y,
                ),
            )
        else:
            image = default_tmp_font().render_rich_line(
                row,
                font_size,
                character_spacing,
                shader_font_size=shader_font_size,
                trim=False,
                normal_face_dilate=normal_face_dilate,
                bold_face_dilate=bold_face_dilate,
            )
            if glyph_scale != 1.0:
                image = magic_kernel_sharp_resize(
                    image,
                    (
                        max(1, round(image.width * glyph_scale)),
                        max(1, round(image.height * glyph_scale)),
                    ),
                )
            alpha_composite_subpixel(
                canvas,
                image,
                (
                    center_x - image.width / 2,
                    y + (line_height - image.height) / 2,
                ),
            )
        y += line_height + (paragraph_gap if has_gap else 0)


def fitted_description_rows(
    description: str,
    locale_suffix: str,
    render_scale: float = 1.0,
    is_dream: bool = False,
) -> tuple[int, list[str]]:
    scratch = Image.new("RGBA", scaled_size(CARD_SIZE, render_scale), (0, 0, 0, 0))
    draw = ImageDraw.Draw(scratch)
    font_size_ui = DESC_FONT_SIZE_MAX_EN_UI if locale_suffix == "en" else DESC_FONT_SIZE_MAX_UI
    body_font = font(scaled_description_font_size(font_size_ui, render_scale))
    desc_rect = DESC_TEXT_DRAW_RECT_EN if locale_suffix == "en" else DESC_TEXT_DRAW_RECT_CJK
    if is_dream:
        desc_rect = desc_rect.translated(0.0, DREAM_DESC_OFFSET_Y_UI)
    left, top, right, bottom = scaled_box(desc_rect, render_scale)
    wrap_width = (right - left) - round(DESC_WRAP_INSET_X * 2 * render_scale)
    desc_character_spacing = DESC_CHARACTER_SPACING_EN if locale_suffix == "en" else DESC_CHARACTER_SPACING_CJK
    line_spacing = desc_line_spacing(locale_suffix, is_dream=is_dream)
    line_height = default_tmp_font().text_line_height(body_font.size, line_spacing)
    paragraph_gap = default_tmp_font().tmp_spacing_height(body_font.size, DESC_PARAGRAPH_SPACING)
    wrapped_lines = wrap_display_text_with_gaps(
        draw,
        description,
        body_font,
        wrap_width,
        width_fn=desc_wrap_width_fn(locale_suffix, desc_character_spacing),
        token_gap_width=default_tmp_font().character_spacing_px(desc_character_spacing, body_font.size),
    )

    min_body_size = scaled_description_font_size(DESC_FONT_SIZE_MIN_UI, render_scale)
    font_step = max(1, round(render_scale))
    while (
        (
            top + rich_lines_height(wrapped_lines, line_height, paragraph_gap)
            > desc_vertical_fit_bottom(bottom, render_scale)
            or rich_lines_rendered_max_width(wrapped_lines, body_font.size, desc_character_spacing) > wrap_width
            or rich_lines_have_crowded_orphan_stat_line(wrapped_lines, locale_suffix)
        )
        and body_font.size > min_body_size
    ):
        body_font = font(body_font.size - font_step)
        line_height = default_tmp_font().text_line_height(body_font.size, line_spacing)
        paragraph_gap = default_tmp_font().tmp_spacing_height(body_font.size, DESC_PARAGRAPH_SPACING)
        wrapped_lines = wrap_display_text_with_gaps(
            draw,
            description,
            body_font,
            wrap_width,
            width_fn=desc_wrap_width_fn(locale_suffix, desc_character_spacing),
            token_gap_width=default_tmp_font().character_spacing_px(desc_character_spacing, body_font.size),
        )

    return body_font.size, ["".join(display_token(token) for token in row).strip() for row, _ in wrapped_lines]


def draw_tmp_centered_stroked_lines(
    canvas: Image.Image,
    box: tuple[int, int, int, int],
    lines: list[str],
    font_size: int,
    fill: tuple[int, int, int],
    material: dict[str, object],
    line_height: int,
    character_spacing: float = 0.0,
    shader_font_size: int | None = None,
    glyph_scale: float = 1.0,
) -> None:
    left, top, right, bottom = box
    total_height = len(lines) * line_height
    y = top + max(0, (bottom - top - total_height) // 2)
    center_x = (left + right) // 2
    font_asset = default_tmp_font()
    for line in lines:
        image = font_asset.render_line(
            line,
            font_size,
            fill,
            material=material,
            character_spacing=character_spacing,
            shader_font_size=shader_font_size,
            trim=False,
        )
        if glyph_scale != 1.0:
            image = magic_kernel_sharp_resize(
                image,
                (
                    max(1, round(image.width * glyph_scale)),
                    max(1, round(image.height * glyph_scale)),
                ),
            )
        canvas.alpha_composite(
            image,
            (
                round(center_x - image.width / 2),
                round(y + (line_height - image.height) / 2),
            ),
        )
        y += line_height


def draw_tmp_vertical_stroked(
    canvas: Image.Image,
    box: tuple[int, int, int, int],
    text: str,
    font_size: int,
    fill: tuple[int, int, int],
    material: dict[str, object],
    line_gap: int,
    shader_font_size: int | None = None,
    y_offset: int = 0,
) -> None:
    left, top, right, bottom = box
    center_x = (left + right) // 2
    slot_height = max(1, round(VERTICAL_NAME_SLOT_HEIGHT_UI * font_size / VERTICAL_NAME_FONT_SIZE_UI))
    chars = [
        default_tmp_font().render_line(char, font_size, fill, material=material, shader_font_size=shader_font_size)
        for char in text
    ]
    total_height = len(chars) * slot_height + max(0, len(chars) - 1) * line_gap
    y = top + max(0, (bottom - top - total_height) // 2) + y_offset
    for image in chars:
        canvas.alpha_composite(image, (round(center_x - image.width / 2), round(y + (slot_height - image.height) / 2)))
        y += slot_height + line_gap


def rich_lines_height(rows: list[tuple[list[str], bool]], line_height: int, paragraph_gap: int) -> int:
    return len(rows) * line_height + sum(paragraph_gap for _, has_gap in rows if has_gap)


def desc_vertical_fit_bottom(bottom: int, render_scale: float) -> int:
    return bottom + scaled_signed_px(DESC_VERTICAL_FIT_TOLERANCE_UI, render_scale)


def rich_lines_rendered_max_width(
    rows: list[tuple[list[str], bool]],
    font_size: int,
    character_spacing: float,
) -> int:
    font_asset = default_tmp_font()
    return max(
        (font_asset.render_rich_line(row, font_size, character_spacing).width for row, _ in rows),
        default=0,
    )


DESC_ORPHAN_STAT_LINES = {"ATK", "DEF", "DMG", "HP", "Qi"}


def rich_lines_have_crowded_orphan_stat_line(rows: list[tuple[list[str], bool]], locale_suffix: str) -> bool:
    if locale_suffix != "en" or len(rows) <= 6:
        return False
    if len(rows) >= 2 and rows[-2][1]:
        return False
    text = "".join(display_token(token) for token in rows[-1][0]).strip()
    return text in DESC_ORPHAN_STAT_LINES


def art_for(card_id: int) -> Image.Image:
    candidates = [
        TEXTURE_DIR / f"Card_{card_id}.png",
        TEXTURE_DIR / "Card_1000025.png",
    ]
    for path in candidates:
        if path.exists():
            return Image.open(path).convert("RGBA")
    raise FileNotFoundError(f"No card art found for {card_id}")


FUSION_ART_INPUTS = {
    125: (8, 1000035),
    151: (1000022, 1000031),
    160: (8000011, 155),
    185: (1000020, 5000005),
}


def mixed_card_art(left_card_id: int, right_card_id: int) -> Image.Image:
    left = art_for(left_card_id)
    right = art_for(right_card_id)
    if right.size != left.size:
        right = magic_kernel_sharp_resize(right, left.size)
    width, height = left.size

    def shifted(image: Image.Image, dx: int, dy: int) -> Image.Image:
        layer = Image.new("RGBA", image.size, (0, 0, 0, 0))
        layer.alpha_composite(image, (dx, dy))
        return layer

    # CardItem only loads the two sprites into the MixedCardFace prefab; the
    # diagonal clipping geometry lives in the prefab data.  These offsets match
    # that prefab presentation: both input faces are slightly recentered under a
    # steeper diagonal mask instead of being split down the middle of each art.
    left = shifted(left, -18, 0)
    right = shifted(right, -20, 0)
    result = Image.new("RGBA", left.size, (0, 0, 0, 0))
    left_mask = Image.new("L", left.size, 0)
    right_mask = Image.new("L", left.size, 0)
    left_px = left_mask.load()
    right_px = right_mask.load()
    for y in range(height):
        split_x = round(width * 0.62 - width * 0.34 * (y / max(1, height - 1)))
        for x in range(width):
            if x <= split_x:
                left_px[x, y] = 255
            if x >= split_x - 1:
                right_px[x, y] = 255
    result.alpha_composite(left)
    result.putalpha(left_mask)
    right_layer = Image.new("RGBA", left.size, (0, 0, 0, 0))
    right_layer.alpha_composite(right)
    right_layer.putalpha(right_mask)
    result.alpha_composite(right_layer)

    divider = ImageDraw.Draw(result)
    top_x = round(width * 0.62)
    bottom_x = round(width * 0.28)
    divider.line((top_x, 0, bottom_x, height), fill=(25, 21, 21, 255), width=max(5, round(width * 0.045)))
    divider.line((top_x + 2, 0, bottom_x + 2, height), fill=(66, 55, 50, 180), width=max(1, round(width * 0.014)))
    return result


def art_for_config(card: dict[str, object], ref_id: str | None = None) -> Image.Image:
    card_id = int(card["id"])
    rarity = int(card["rarity"])
    base_id = card_base_id(card_id)
    override = int(card["overrideSpriteId"])
    fusion_inputs = FUSION_ART_INPUTS.get(base_id)
    if fusion_inputs is not None:
        return mixed_card_art(*fusion_inputs)
    candidates = []
    if ref_id == "906001":
        candidates.append(TEXTURE_DIR / "Card_182.png")
    if override:
        candidates.append(TEXTURE_DIR / f"Card_{override}.png")
    candidates.extend(
        [
            TEXTURE_DIR / f"Card_{card_id}.png",
            TEXTURE_DIR / f"Card_{base_id}.png",
            TEXTURE_DIR / f"Card_{card_id - rarity * 10000}.png",
            TEXTURE_DIR / "Card_Default.png",
        ]
    )
    for path in candidates:
        if path.exists():
            image = Image.open(path).convert("RGBA")
            if int(card["subcategory"]) == 14:
                image = image.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
            return image
    raise FileNotFoundError(f"No card art found for {card_id}")


def dream_art() -> Image.Image:
    return Image.open(TEXTURE_DIR / "Card_1000025.png").convert("RGBA").transpose(Image.Transpose.FLIP_LEFT_RIGHT)


def qi_icon() -> Image.Image:
    return Image.open(TEXTURE_DIR / "Icon_灵气(卡牌).png").convert("RGBA")


def hp_icon() -> Image.Image:
    return Image.open(TEXTURE_DIR / "Icon_生命(卡牌).png").convert("RGBA")


def bottom_emblem_for(card: dict[str, object]) -> Image.Image | None:
    sect = int(card["sect"])
    career = int(card["career"])
    if sect:
        path = TEXTURE_DIR / f"SectBottom_{sect}.png"
    elif career:
        path = TEXTURE_DIR / f"CareerBottom_{career}.png"
    else:
        return None
    if not path.exists():
        return None
    return Image.open(path).convert("RGBA")


def render_card(level: CardLevel, locale: LocaleText, render_scale: float = 1.0) -> Image.Image:
    frame = Image.open(TEXTURE_DIR / f"CardUI_{PHASE}_{level.level - 1}.png").convert("RGBA")
    art = art_for(level.card_id)

    output_size = scaled_size(CARD_SIZE, render_scale)
    frame = magic_kernel_sharp_resize(frame, output_size)
    canvas = Image.new("RGBA", output_size, (0, 0, 0, 0))
    x0, y0, x1, y1 = scaled_box(ART_RECT, render_scale)
    art = magic_kernel_sharp_resize(art, (x1 - x0, y1 - y0))
    canvas.alpha_composite(art, (x0, y0))
    canvas.alpha_composite(frame)

    sx0, sy0, sx1, sy1 = scaled_box(SECT_EMBLEM_RECT, render_scale)
    emblem = magic_kernel_sharp_resize(sect_emblem(), (sx1 - sx0, sy1 - sy0))
    canvas.alpha_composite(tint_alpha(emblem, 150), (sx0, sy0))

    draw = ImageDraw.Draw(canvas)

    title_left, title_top, title_right, title_bottom = scaled_box(EN_TITLE_DRAW_RECT, render_scale)
    title_font = font(scaled_ui_font_size(TITLE_FONT_SIZE_MAX_UI, render_scale))
    vertical_font = font(scaled_ui_font_size(VERTICAL_NAME_FONT_SIZE_UI, render_scale))
    body_font = font(
        scaled_description_font_size(
            DESC_FONT_SIZE_MAX_EN_UI if locale.suffix == "en" else DESC_FONT_SIZE_MAX_UI,
            render_scale,
        )
    )
    title_shader_size = max(1, round(title_font.size / render_scale))
    vertical_shader_size = max(1, round(vertical_font.size / render_scale))
    body_shader_size = max(1, round(body_font.size / render_scale))
    title_fill = rgb_from_unit(
        multiply_unit_rgb(TITLE_FONT_COLOR, DEFAULT_OUTLINE_MATERIAL["face_color"])
    )

    if QI_COST > 0:
        icon_left, icon_top, icon_right, icon_bottom = scaled_box(QI_ICON_DRAW_RECT, render_scale)
        icon = magic_kernel_sharp_resize(qi_icon(), (icon_right - icon_left, icon_bottom - icon_top))
        canvas.alpha_composite(icon, (icon_left, icon_top))
        digit = huiwen_number_image(str(QI_COST), ANIMA_FONT_SIZE_UI, render_scale)
        label_center = scaled_point(QI_LABEL_RECT.center, render_scale)
        digit_x = round(label_center[0] - digit.width / 2) + scaled_signed_px(ANIMA_DIGIT_OFFSET_X, render_scale)
        digit_y = round(label_center[1] - digit.height / 2) + scaled_signed_px(ANIMA_DIGIT_OFFSET_Y, render_scale)
        canvas.alpha_composite(digit, (digit_x, digit_y))
        draw = ImageDraw.Draw(canvas)

    draw_tmp_vertical_stroked(
        canvas,
        scaled_box(VERTICAL_NAME_RECT, render_scale),
        locale.chinese_title,
        vertical_font.size,
        fill=title_fill,
        material=DEFAULT_OUTLINE_MATERIAL,
        line_gap=scaled_signed_px(VERTICAL_NAME_LINE_GAP_UI, render_scale),
        shader_font_size=vertical_shader_size,
        y_offset=scaled_signed_px(VERTICAL_NAME_OFFSET_Y_UI, render_scale),
    )

    if locale.suffix == "en":
        bg_left, bg_top, bg_right, bg_bottom = scaled_box(EN_TITLE_BG_DRAW_RECT, render_scale)
        bg = magic_kernel_sharp_resize(en_title_bg(), (bg_right - bg_left, bg_bottom - bg_top))
        canvas.alpha_composite(bg, (bg_left, bg_top))
        draw = ImageDraw.Draw(canvas)
        title_character_spacing = -2.0
        title_lines = wrap_plain_line_tmp(locale.title, title_font.size, title_right - title_left, title_character_spacing)
        min_title_size = scaled_ui_font_size(TITLE_FONT_SIZE_MIN_UI, render_scale)
        title_line_height = default_tmp_font().text_line_height(title_font.size, TITLE_LINE_SPACING)
        while (
            (len(title_lines) > 2 or len(title_lines) * title_line_height > title_bottom - title_top)
            and title_font.size > min_title_size
        ):
            title_font = font(title_font.size - 1)
            title_shader_size = max(1, round(title_font.size / render_scale))
            title_line_height = default_tmp_font().text_line_height(title_font.size, TITLE_LINE_SPACING)
        draw_tmp_centered_stroked_lines(
            canvas,
            scaled_box(EN_TITLE_DRAW_RECT, render_scale),
            title_lines,
            title_font.size,
            fill=title_fill,
            material=DEFAULT_OUTLINE_MATERIAL,
            line_height=title_line_height,
            character_spacing=title_character_spacing,
            shader_font_size=title_shader_size,
            glyph_scale=TITLE_GLYPH_SCALE_EN,
        )

    description = locale.description.replace("{def}", f"[color:#9A6212|{level.defense}]")
    desc_rect = DESC_TEXT_DRAW_RECT_EN if locale.suffix == "en" else DESC_TEXT_DRAW_RECT_CJK
    desc_box = scaled_box_float(desc_rect, render_scale)
    left, top, right, bottom = desc_box
    wrap_width = (right - left) - round(DESC_WRAP_INSET_X * 2 * render_scale)
    desc_character_spacing = DESC_CHARACTER_SPACING_EN if locale.suffix == "en" else DESC_CHARACTER_SPACING_CJK
    line_spacing = desc_line_spacing(locale.suffix)
    paragraph_gap = default_tmp_font().tmp_spacing_height(body_font.size, DESC_PARAGRAPH_SPACING)
    normal_face_dilate, bold_face_dilate = desc_face_dilates(locale.suffix)
    line_height = default_tmp_font().text_line_height(body_font.size, line_spacing)
    wrapped_lines = wrap_display_text_with_gaps(
        draw,
        description,
        body_font,
        wrap_width,
        width_fn=desc_wrap_width_fn(locale.suffix, desc_character_spacing),
        token_gap_width=default_tmp_font().character_spacing_px(desc_character_spacing, body_font.size),
    )

    min_body_size = scaled_description_font_size(DESC_FONT_SIZE_MIN_UI, render_scale)
    font_step = max(1, round(render_scale))
    while (
        (
            top + rich_lines_height(wrapped_lines, line_height, paragraph_gap)
            > desc_vertical_fit_bottom(bottom, render_scale)
            or rich_lines_rendered_max_width(wrapped_lines, body_font.size, desc_character_spacing) > wrap_width
            or rich_lines_have_crowded_orphan_stat_line(wrapped_lines, locale.suffix)
        )
        and body_font.size > min_body_size
    ):
        body_font = font(body_font.size - font_step)
        body_shader_size = max(1, round(body_font.size / render_scale))
        line_height = default_tmp_font().text_line_height(body_font.size, line_spacing)
        paragraph_gap = default_tmp_font().tmp_spacing_height(body_font.size, DESC_PARAGRAPH_SPACING)
        wrapped_lines = wrap_display_text_with_gaps(
            draw,
            description,
            body_font,
            wrap_width,
            width_fn=desc_wrap_width_fn(locale.suffix, desc_character_spacing),
            token_gap_width=default_tmp_font().character_spacing_px(desc_character_spacing, body_font.size),
        )

    draw_tmp_centered_rich_lines_with_gaps(
        canvas,
        desc_box,
        wrapped_lines,
        body_font.size,
        line_height,
        paragraph_gap,
        character_spacing=desc_character_spacing,
        shader_font_size=body_shader_size,
        glyph_scale=DESC_GLYPH_SCALE_EN if locale.suffix == "en" else DESC_GLYPH_SCALE_CJK,
        ignore_descenders_for_layout=True,
        fixed_line_offset_y=scaled_signed_float(desc_fixed_line_offset_ui(locale.suffix), render_scale),
        normal_face_dilate=normal_face_dilate,
        bold_face_dilate=bold_face_dilate,
    )

    return canvas


def dream_description(level: DreamCardLevel, locale: LocaleText) -> str:
    template = DREAM_CHASE_DESCRIPTIONS[locale.suffix] if level.chase else locale.description
    return template.format(damage=level.damage, per=level.per_formation_damage)


def render_dream_card(level: DreamCardLevel, locale: LocaleText, render_scale: float = 1.0) -> Image.Image:
    frame = Image.open(TEXTURE_DIR / f"DreamCardUI_{level.level_name}.png").convert("RGBA")
    art = dream_art()

    output_size = scaled_size(CARD_SIZE, render_scale)
    frame = magic_kernel_sharp_resize(frame, output_size)
    canvas = Image.new("RGBA", output_size, (0, 0, 0, 0))
    x0, y0, x1, y1 = scaled_box(ART_RECT, render_scale)
    art = magic_kernel_sharp_resize(art, (x1 - x0, y1 - y0))
    canvas.alpha_composite(art, (x0, y0))
    canvas.alpha_composite(frame)

    draw = ImageDraw.Draw(canvas)
    title_font = font(scaled_ui_font_size(TITLE_FONT_SIZE_MAX_UI, render_scale))
    vertical_font = font(scaled_ui_font_size(VERTICAL_NAME_FONT_SIZE_UI, render_scale))
    body_font = font(
        scaled_description_font_size(
            DESC_FONT_SIZE_MAX_EN_UI if locale.suffix == "en" else DESC_FONT_SIZE_MAX_UI,
            render_scale,
        )
    )
    vertical_shader_size = max(1, round(vertical_font.size / render_scale))
    body_shader_size = max(1, round(body_font.size / render_scale))
    title_fill = rgb_from_unit(
        multiply_unit_rgb(TITLE_FONT_COLOR, DEFAULT_OUTLINE_MATERIAL["face_color"])
    )

    draw_tmp_vertical_stroked(
        canvas,
        scaled_box(VERTICAL_NAME_RECT, render_scale),
        locale.chinese_title,
        vertical_font.size,
        fill=title_fill,
        material=DEFAULT_OUTLINE_MATERIAL,
        line_gap=scaled_signed_px(VERTICAL_NAME_LINE_GAP_UI, render_scale),
        shader_font_size=vertical_shader_size,
        y_offset=scaled_signed_px(DREAM_VERTICAL_NAME_OFFSET_Y_UI, render_scale),
    )

    if locale.suffix == "en":
        title_left, title_top, title_right, title_bottom = scaled_box(EN_TITLE_DRAW_RECT, render_scale)
        bg_left, bg_top, bg_right, bg_bottom = scaled_box(EN_TITLE_BG_DRAW_RECT, render_scale)
        bg = magic_kernel_sharp_resize(en_title_bg(), (bg_right - bg_left, bg_bottom - bg_top))
        canvas.alpha_composite(bg, (bg_left, bg_top))
        title_character_spacing = -2.0
        title_lines = wrap_plain_line_tmp(locale.title, title_font.size, title_right - title_left, title_character_spacing)
        min_title_size = scaled_ui_font_size(TITLE_FONT_SIZE_MIN_UI, render_scale)
        title_line_height = default_tmp_font().text_line_height(title_font.size, TITLE_LINE_SPACING)
        while (
            (len(title_lines) > 2 or len(title_lines) * title_line_height > title_bottom - title_top)
            and title_font.size > min_title_size
        ):
            title_font = font(title_font.size - 1)
            title_line_height = default_tmp_font().text_line_height(title_font.size, TITLE_LINE_SPACING)
        draw_tmp_centered_stroked_lines(
            canvas,
            scaled_box(EN_TITLE_DRAW_RECT, render_scale),
            title_lines,
            title_font.size,
            fill=title_fill,
            material=DEFAULT_OUTLINE_MATERIAL,
            line_height=title_line_height,
            character_spacing=title_character_spacing,
            glyph_scale=TITLE_GLYPH_SCALE_EN,
        )

    description = dream_description(level, locale)
    desc_rect = (DESC_TEXT_DRAW_RECT_EN if locale.suffix == "en" else DESC_TEXT_DRAW_RECT_CJK).translated(
        0.0,
        DREAM_DESC_OFFSET_Y_UI,
    )
    desc_box = scaled_box_float(desc_rect, render_scale)
    left, top, right, bottom = desc_box
    wrap_width = (right - left) - round(DESC_WRAP_INSET_X * 2 * render_scale)
    desc_character_spacing = DESC_CHARACTER_SPACING_EN if locale.suffix == "en" else DESC_CHARACTER_SPACING_CJK
    line_spacing = desc_line_spacing(locale.suffix, is_dream=True)
    paragraph_gap = default_tmp_font().tmp_spacing_height(body_font.size, DESC_PARAGRAPH_SPACING)
    normal_face_dilate, bold_face_dilate = desc_face_dilates(locale.suffix)
    line_height = default_tmp_font().text_line_height(body_font.size, line_spacing)
    wrapped_lines = wrap_display_text_with_gaps(
        draw,
        description,
        body_font,
        wrap_width,
        width_fn=desc_wrap_width_fn(locale.suffix, desc_character_spacing),
        token_gap_width=default_tmp_font().character_spacing_px(desc_character_spacing, body_font.size),
    )

    min_body_size = scaled_description_font_size(DESC_FONT_SIZE_MIN_UI, render_scale)
    font_step = max(1, round(render_scale))
    while (
        (
            top + rich_lines_height(wrapped_lines, line_height, paragraph_gap)
            > desc_vertical_fit_bottom(bottom, render_scale)
            or rich_lines_rendered_max_width(wrapped_lines, body_font.size, desc_character_spacing) > wrap_width
            or rich_lines_have_crowded_orphan_stat_line(wrapped_lines, locale.suffix)
        )
        and body_font.size > min_body_size
    ):
        body_font = font(body_font.size - font_step)
        body_shader_size = max(1, round(body_font.size / render_scale))
        line_height = default_tmp_font().text_line_height(body_font.size, line_spacing)
        paragraph_gap = default_tmp_font().tmp_spacing_height(body_font.size, DESC_PARAGRAPH_SPACING)
        wrapped_lines = wrap_display_text_with_gaps(
            draw,
            description,
            body_font,
            wrap_width,
            width_fn=desc_wrap_width_fn(locale.suffix, desc_character_spacing),
            token_gap_width=default_tmp_font().character_spacing_px(desc_character_spacing, body_font.size),
        )

    draw_tmp_centered_rich_lines_with_gaps(
        canvas,
        desc_box,
        wrapped_lines,
        body_font.size,
        line_height,
        paragraph_gap,
        character_spacing=desc_character_spacing,
        shader_font_size=body_shader_size,
        glyph_scale=DESC_GLYPH_SCALE_EN if locale.suffix == "en" else DESC_GLYPH_SCALE_CJK,
        ignore_descenders_for_layout=True,
        fixed_line_offset_y=scaled_signed_float(desc_fixed_line_offset_ui(locale.suffix), render_scale),
        normal_face_dilate=normal_face_dilate,
        bold_face_dilate=bold_face_dilate,
    )
    return canvas


def render_config_card(ref_id: str, card: dict[str, object], locale_suffix: str, render_scale: float = 1.0) -> Image.Image:
    level_name = LEVEL_NAMES[int(card["level"])]
    is_dream = int(card["subcategory"]) == 14
    if is_dream:
        frame_name = f"DreamCardUI_{level_name}.png"
    else:
        frame_name = f"CardUI_{level_name}_{int(card['rarity'])}.png"
    frame = Image.open(TEXTURE_DIR / frame_name).convert("RGBA")
    art = art_for_config(card, ref_id)

    output_size = scaled_size(CARD_SIZE, render_scale)
    frame = magic_kernel_sharp_resize(frame, output_size)
    canvas = Image.new("RGBA", output_size, (0, 0, 0, 0))
    x0, y0, x1, y1 = scaled_box(ART_RECT, render_scale)
    art = magic_kernel_sharp_resize(art, (x1 - x0, y1 - y0))
    canvas.alpha_composite(art, (x0, y0))
    canvas.alpha_composite(frame)

    if not is_dream:
        emblem = bottom_emblem_for(card)
        if emblem is not None:
            sx0, sy0, sx1, sy1 = scaled_box(SECT_EMBLEM_RECT, render_scale)
            emblem = magic_kernel_sharp_resize(emblem, (sx1 - sx0, sy1 - sy0))
            canvas.alpha_composite(tint_alpha(emblem, 150), (sx0, sy0))

    draw = ImageDraw.Draw(canvas)
    title_font = font(scaled_ui_font_size(TITLE_FONT_SIZE_MAX_UI, render_scale))
    vertical_font = font(scaled_ui_font_size(VERTICAL_NAME_FONT_SIZE_UI, render_scale))
    body_font = font(
        scaled_description_font_size(
            DESC_FONT_SIZE_MAX_EN_UI if locale_suffix == "en" else DESC_FONT_SIZE_MAX_UI,
            render_scale,
        )
    )
    title_shader_size = max(1, round(title_font.size / render_scale))
    vertical_shader_size = max(1, round(vertical_font.size / render_scale))
    body_shader_size = max(1, round(body_font.size / render_scale))
    title_fill = rgb_from_unit(
        multiply_unit_rgb(TITLE_FONT_COLOR, DEFAULT_OUTLINE_MATERIAL["face_color"])
    )

    cost_value = 0
    cost_icon = None
    cost_is_hp = int(card["hpCost"]) > 0
    if cost_is_hp:
        cost_value = int(card["hpCost"])
        cost_icon = hp_icon()
    elif int(card["anima"]) < 0:
        cost_value = abs(int(card["anima"]))
        cost_icon = qi_icon()
    if cost_value > 0 and cost_icon is not None:
        icon_rect = HP_ICON_DRAW_RECT if cost_is_hp else QI_ICON_DRAW_RECT
        digit_scale_x = HP_DIGIT_SCALE_X if cost_is_hp else ANIMA_DIGIT_SCALE_X
        digit_scale_y = HP_DIGIT_SCALE_Y if cost_is_hp else ANIMA_DIGIT_SCALE_Y
        digit_offset_x = HP_DIGIT_OFFSET_X if cost_is_hp else ANIMA_DIGIT_OFFSET_X
        digit_offset_y = HP_DIGIT_OFFSET_Y if cost_is_hp else ANIMA_DIGIT_OFFSET_Y
        icon_left, icon_top, icon_right, icon_bottom = scaled_box(icon_rect, render_scale)
        icon = magic_kernel_sharp_resize(cost_icon, (icon_right - icon_left, icon_bottom - icon_top))
        canvas.alpha_composite(icon, (icon_left, icon_top))
        digit = huiwen_number_image(str(cost_value), ANIMA_FONT_SIZE_UI, render_scale, digit_scale_x, digit_scale_y)
        label_center = scaled_point(QI_LABEL_RECT.center, render_scale)
        digit_x = round(label_center[0] - digit.width / 2) + scaled_signed_px(digit_offset_x, render_scale)
        digit_y = round(label_center[1] - digit.height / 2) + scaled_signed_px(digit_offset_y, render_scale)
        canvas.alpha_composite(digit, (digit_x, digit_y))
        draw = ImageDraw.Draw(canvas)

    if ref_id == "906001":
        display_title = localized_term("Relic4OptionTitle_6", locale_suffix, "赤贯星")
        vertical_title = localized_term("Relic4OptionTitle_6", "zh", "赤贯星")
    else:
        display_title = card_name(int(card["id"]), locale_suffix)
        vertical_title = card_name(int(card["id"]), "zh")

    vertical_offset = DREAM_VERTICAL_NAME_OFFSET_Y_UI if is_dream else VERTICAL_NAME_OFFSET_Y_UI
    draw_tmp_vertical_stroked(
        canvas,
        scaled_box(VERTICAL_NAME_RECT, render_scale),
        vertical_title,
        vertical_font.size,
        fill=title_fill,
        material=DEFAULT_OUTLINE_MATERIAL,
        line_gap=scaled_signed_px(VERTICAL_NAME_LINE_GAP_UI, render_scale),
        shader_font_size=vertical_shader_size,
        y_offset=scaled_signed_px(vertical_offset, render_scale),
    )

    if locale_suffix == "en":
        title_left, title_top, title_right, title_bottom = scaled_box(EN_TITLE_DRAW_RECT, render_scale)
        bg_left, bg_top, bg_right, bg_bottom = scaled_box(EN_TITLE_BG_DRAW_RECT, render_scale)
        bg = magic_kernel_sharp_resize(en_title_bg(), (bg_right - bg_left, bg_bottom - bg_top))
        canvas.alpha_composite(bg, (bg_left, bg_top))
        title_character_spacing = -2.0
        title_lines = wrap_plain_line_tmp(display_title, title_font.size, title_right - title_left, title_character_spacing)
        min_title_size = scaled_ui_font_size(TITLE_FONT_SIZE_MIN_UI, render_scale)
        title_line_height = default_tmp_font().text_line_height(title_font.size, TITLE_LINE_SPACING)
        while (
            (len(title_lines) > 2 or len(title_lines) * title_line_height > title_bottom - title_top)
            and title_font.size > min_title_size
        ):
            title_font = font(title_font.size - 1)
            title_shader_size = max(1, round(title_font.size / render_scale))
            title_line_height = default_tmp_font().text_line_height(title_font.size, TITLE_LINE_SPACING)
        draw_tmp_centered_stroked_lines(
            canvas,
            scaled_box(EN_TITLE_DRAW_RECT, render_scale),
            title_lines,
            title_font.size,
            fill=title_fill,
            material=DEFAULT_OUTLINE_MATERIAL,
            line_height=title_line_height,
            character_spacing=title_character_spacing,
            shader_font_size=title_shader_size,
            glyph_scale=TITLE_GLYPH_SCALE_EN,
        )

    description = render_description_text(int(card["id"]), locale_suffix)
    _, base_description_rows = fitted_description_rows(description, locale_suffix, render_scale, is_dream=is_dream)
    desc_style = description_style_for_group(locale_suffix, description, base_description_rows, is_dream=is_dream)
    desc_rect = desc_style.rect
    desc_box = scaled_box_float(desc_rect, render_scale)
    left, top, right, bottom = desc_box
    wrap_width = (right - left) - round(DESC_WRAP_INSET_X * 2 * render_scale)
    desc_character_spacing = desc_style.char_spacing
    line_spacing = desc_style.line_spacing
    line_height = default_tmp_font().text_line_height(body_font.size, line_spacing)
    paragraph_gap = default_tmp_font().tmp_spacing_height(body_font.size, DESC_PARAGRAPH_SPACING)
    normal_face_dilate = desc_style.normal_face_dilate
    bold_face_dilate = desc_style.bold_face_dilate
    wrapped_lines = wrap_display_text_with_gaps(
        draw,
        description,
        body_font,
        wrap_width,
        width_fn=desc_wrap_width_fn(locale_suffix, desc_character_spacing),
        token_gap_width=default_tmp_font().character_spacing_px(desc_character_spacing, body_font.size),
    )

    min_body_size = scaled_description_font_size(DESC_FONT_SIZE_MIN_UI, render_scale)
    font_step = max(1, round(render_scale))
    while (
        (
            top + rich_lines_height(wrapped_lines, line_height, paragraph_gap)
            > desc_vertical_fit_bottom(bottom, render_scale)
            or rich_lines_rendered_max_width(wrapped_lines, body_font.size, desc_character_spacing) > wrap_width
            or rich_lines_have_crowded_orphan_stat_line(wrapped_lines, locale_suffix)
        )
        and body_font.size > min_body_size
    ):
        body_font = font(body_font.size - font_step)
        body_shader_size = max(1, round(body_font.size / render_scale))
        line_height = default_tmp_font().text_line_height(body_font.size, line_spacing)
        paragraph_gap = default_tmp_font().tmp_spacing_height(body_font.size, DESC_PARAGRAPH_SPACING)
        wrapped_lines = wrap_display_text_with_gaps(
            draw,
            description,
            body_font,
            wrap_width,
            width_fn=desc_wrap_width_fn(locale_suffix, desc_character_spacing),
            token_gap_width=default_tmp_font().character_spacing_px(desc_character_spacing, body_font.size),
        )

    draw_tmp_centered_rich_lines_with_gaps(
        canvas,
        desc_box,
        wrapped_lines,
        body_font.size,
        line_height,
        paragraph_gap,
        character_spacing=desc_character_spacing,
        shader_font_size=body_shader_size,
        glyph_scale=desc_style.glyph_scale,
        ignore_descenders_for_layout=True,
        fixed_line_offset_y=scaled_signed_float(desc_style.fixed_line_offset, render_scale),
        normal_face_dilate=normal_face_dilate,
        bold_face_dilate=bold_face_dilate,
    )
    return canvas


def render_card_for_label(label: str, render_scale: float = 1.0) -> Image.Image:
    ref_id, locale_suffix = label.split("_", 1)
    resolved = resolve_reference(ref_id)
    if resolved.card_id is not None and not ref_id.startswith("l"):
        return render_config_card(ref_id, card_by_id()[resolved.card_id], locale_suffix, render_scale)
    if ref_id.startswith("D"):
        level = next(card_level for card_level in DREAM_CARD_LEVELS if card_level.ref_id == ref_id)
        locale = next(locale_text for locale_text in DREAM_LOCALES if locale_text.suffix == locale_suffix)
        return render_dream_card(level, locale, render_scale=render_scale)
    if ref_id.startswith("l"):
        level_num = int(ref_id.removeprefix("l"))
    else:
        level_num = NORMAL_REF_TO_LEVEL[ref_id]
    level = next(card_level for card_level in CARD_LEVELS if card_level.level == level_num)
    locale = next(locale_text for locale_text in LOCALES if locale_text.suffix == locale_suffix)
    return render_card(level, locale, render_scale=render_scale)


def output_path_for_label(label: str) -> Path:
    ref_id, locale_suffix = label.split("_", 1)
    if ref_id.startswith("D"):
        return OUTPUT_DIR / f"{ref_id}_{locale_suffix}.png"
    if ref_id.startswith("l"):
        return OUTPUT_DIR / f"rule_sky_sword_formation_{ref_id}_{locale_suffix}.png"
    return OUTPUT_DIR / f"{ref_id}_{locale_suffix}.png"


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--label", help="render one card label, e.g. 115061_en, l1_zh, or D11131_en")
    parser.add_argument("--render-scale", type=float, default=1.0)
    args = parser.parse_args()

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    if args.label:
        image = render_card_for_label(args.label, render_scale=args.render_scale)
        output = output_path_for_label(args.label)
        save_png(image, output)
        print(output.relative_to(ROOT))
        return

    for level in CARD_LEVELS:
        for locale in LOCALES:
            image = render_card(level, locale)
            output = OUTPUT_DIR / f"rule_sky_sword_formation_l{level.level}_{locale.suffix}.png"
            save_png(image, output)
            print(output.relative_to(ROOT))
    for level in DREAM_CARD_LEVELS:
        for locale in DREAM_LOCALES:
            image = render_dream_card(level, locale)
            output = OUTPUT_DIR / f"{level.ref_id}_{locale.suffix}.png"
            save_png(image, output)
            print(output.relative_to(ROOT))


if __name__ == "__main__":
    main()
