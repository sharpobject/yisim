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
import json
import math
import re
import ctypes
import subprocess
import unicodedata
import hashlib
from collections.abc import Callable, Iterable
from dataclasses import dataclass
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageFont
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
TEXT_RENDERER = "sdf"
TEXT_RENDERERS = ("sdf", "otf")
SDF_DISTANCE_SCALE_NORMAL = 1.0
SDF_DISTANCE_SCALE_BOLD = 1.0
SDF_ISOLATED_EXTRA_PAD = 10
ISOLATED_SDF_CACHE_VERSION = 4

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
ART_SCALE = 1.001422084521948
ART_OFFSET_X_UI = -0.09205882369925211
ART_OFFSET_Y_UI = -0.03182882018845394
QI_ICON_RECT = cardface_rect_to_frame(
    UnityRect((0.0, 1.0), (18.0, -22.0), (34.4144134521, 34.4144134521))
)
QI_LABEL_RECT = child_rect(
    QI_ICON_RECT,
    (34.4144134521, 34.4144134521),
    UnityRect((0.5, 0.5), (0.5, 0.0), (41.4144134521, 34.4144134521)),
)
QI_ICON_DRAW_RECT = QI_ICON_RECT.translated(0.0, -1.0)
HP_ICON_RECT = cardface_rect_to_frame(
    UnityRect((0.0, 1.0), (18.0, -22.0), (40.0900001526, 33.7690010071))
)
HP_ICON_DRAW_RECT = HP_ICON_RECT
HP_ICON_TINT = (1.0, 0.8254716992, 0.8254716992, 1.0)
CARD_OUTPUT_BLEED_X_UI = max(0.0, -HP_ICON_DRAW_RECT.left)
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

DESC_TEXT_DRAW_RECT_EN = DESC_RECT.translated(0.8126833572395623, 1.8731626620095925)
DESC_TEXT_DRAW_RECT_CJK = DESC_RECT.translated(0.5744326767405602, 1.011374107932542)
DESC_LAYOUT_RECT_EN = DESC_RECT.translated(-0.08740619886848097, 1.4175855117404319)
DESC_LAYOUT_RECT_CJK = DESC_TEXT_DRAW_RECT_CJK
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
CJK_FULL_WIDTH_PUNCTUATION = {
    "，",
    "。",
    "、",
    "：",
    "；",
    "？",
    "！",
    "“",
    "”",
    "‘",
    "’",
    "（",
    "）",
    "【",
    "】",
    "《",
    "》",
    "〈",
    "〉",
    "「",
    "」",
    "『",
    "』",
}
CJK_OPENING_PUNCTUATION = {"（", "【", "《", "〈", "“", "‘", "「", "『"}
LINE_START_FORBIDDEN_PUNCTUATION = {"[", "{"}
LINE_END_FORBIDDEN_PUNCTUATION = CJK_OPENING_PUNCTUATION
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
    # Serialized on the material, but the Unity material keyword set is only
    # OUTLINE_ON. TMP's underlay pass is inactive without UNDERLAY_ON.
    "underlay_enabled": False,
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
    "scale_ratio_a": 0.6130268573760986,
    "weight_normal": 0.0,
    "weight_bold": 0.75,
    "face_color": (1.0, 1.0, 1.0),
    "outline_color": (0.0, 0.0, 0.0),
    "underlay_dilate": 0.0,
    "underlay_softness": 0.0,
    "underlay_offset_x": 0.0,
    "underlay_offset_y": 0.0,
    "underlay_color": (0.0, 0.0, 0.0, 0.5),
    "underlay_enabled": False,
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
QI_ICON_SCALE = 1.0008057020731886
QI_ICON_OFFSET_X_UI = -0.12769639345461417
QI_ICON_OFFSET_Y_UI = 0.7372986965004059
QI_DIGIT_FONT_SIZE_UI = 28.8449109354962
QI_DIGIT_SCALE_X = 1.001759114865247
QI_DIGIT_SCALE_Y = 0.9591710014525825
QI_DIGIT_OFFSET_X = 0.036068902928897355
QI_DIGIT_OFFSET_Y = -0.48511498013103743
QI_DIGIT_FACE_DILATE = 0.5273610944678632
QI_DIGIT_OUTLINE_WIDTH = 0.4183877831138458
QI_DIGIT_DISTANCE_SCALE = 1.0147642048750347
QI_DIGIT_FACE_DISTANCE_SCALE = 3.308406981452679
QI_DIGIT_OUTLINE_DISTANCE_SCALE = 3.1494289229419365
HP_DIGIT_SCALE_X = 0.92
HP_DIGIT_SCALE_Y = 0.94
HP_DIGIT_OFFSET_X = 0.0
HP_DIGIT_OFFSET_Y = 0.25
TITLE_FONT_SIZE_MAX_UI = 14.56875284433342
TITLE_FONT_SIZE_MIN_UI = 10.0
TITLE_WRAP_FONT_SIZE_MAX_UI = 14.25
TITLE_TWO_LINE_MAX_SCALE = 0.8334215347837868
TITLE_LINE_SPACING = 2.3012257089082526
TITLE_CHARACTER_SPACING_EN = -3.7700981175200186
TITLE_GLYPH_SCALE_EN = 1.1404085973558389
TITLE_RECT_OFFSET_X_UI = -0.034971895036527895
TITLE_RECT_WIDTH_SCALE = 1.0041974547473036
TITLE_OFFSET_X_UI = -1.0506263503372113
TITLE_OFFSET_Y_UI = 0.09712161096106693
TITLE_SINGLE_LINE_OFFSET_Y_UI = 0.42
TITLE_SINGLE_LINE_SCALE = 0.9941755847635919
TITLE_FACE_DILATE = 0.2090065665925679
TITLE_OUTLINE_WIDTH = 0.43900004618261096
TITLE_DISTANCE_SCALE = 1.0558865146164804
TITLE_FACE_DISTANCE_SCALE = 2.2009971710995266
TITLE_OUTLINE_DISTANCE_SCALE = 1.580999819486321
DESC_FONT_SIZE_MAX_UI = 20.0
DESC_FONT_SIZE_MAX_EN_UI = 16.0
DESC_FONT_SIZE_MIN_UI = 12.0
DESC_CHARACTER_SPACING_EN = -2.351297241738103
DESC_LAYOUT_CHARACTER_SPACING_EN = -1.7914233019245518
DESC_CHARACTER_SPACING_CJK = 1.8936616714342625
DESC_BLOCK_SCALE_EN = 1.0032253814165486
DESC_BLOCK_SCALE_CJK = 1.0
DESC_GLYPH_SCALE_EN = 1.0
DESC_GLYPH_SCALE_CJK = 0.9967916566135181
DESC_FACE_DILATE_EN_NORMAL = -0.051993628472797856
DESC_FACE_DILATE_EN_BOLD = -0.04002735604645256
DESC_FACE_DILATE_CJK_NORMAL = -0.000293767427539617
DESC_FACE_DILATE_CJK_BOLD = -4.897105441768699e-05
DESC_SDF_DISTANCE_SCALE_EN_NORMAL = 2.0
DESC_SDF_DISTANCE_SCALE_EN_BOLD = 2.0
DESC_SDF_DISTANCE_SCALE_CJK_NORMAL = DESC_SDF_DISTANCE_SCALE_EN_NORMAL
DESC_SDF_DISTANCE_SCALE_CJK_BOLD = DESC_SDF_DISTANCE_SCALE_EN_BOLD
DREAM_DESC_OFFSET_Y_UI = 0.0
DREAM_DESC_LINE_SPACING = -12.0
VERTICAL_NAME_FONT_SIZE_UI = 18.156028642800912
VERTICAL_NAME_LINE_GAP_UI = -0.17364423725807782
VERTICAL_NAME_OFFSET_X_UI = 0.02867320274363877
VERTICAL_NAME_OFFSET_Y_UI = 4.7650312726046335
DREAM_VERTICAL_NAME_OFFSET_Y_UI = -7.826987024998088
VERTICAL_NAME_SLOT_HEIGHT_UI = 20.512251449250936
VERTICAL_NAME_GLYPH_SCALE = 1.088768345464635
VERTICAL_NAME_FACE_DILATE = 0.31696039008946836
VERTICAL_NAME_OUTLINE_WIDTH = 0.49218453372502824
VERTICAL_NAME_DISTANCE_SCALE = 1.3611748823227159
VERTICAL_NAME_FACE_DISTANCE_SCALE = 2.2
VERTICAL_NAME_OUTLINE_DISTANCE_SCALE = 1.58
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


def desc_face_dilates(locale_suffix: str) -> tuple[float, float]:
    if locale_suffix == "en":
        return DESC_FACE_DILATE_EN_NORMAL, DESC_FACE_DILATE_EN_BOLD
    return DESC_FACE_DILATE_CJK_NORMAL, DESC_FACE_DILATE_CJK_BOLD


def desc_sdf_distance_scales(locale_suffix: str) -> tuple[float, float]:
    if locale_suffix == "en":
        return DESC_SDF_DISTANCE_SCALE_EN_NORMAL, DESC_SDF_DISTANCE_SCALE_EN_BOLD
    return DESC_SDF_DISTANCE_SCALE_CJK_NORMAL, DESC_SDF_DISTANCE_SCALE_CJK_BOLD


def desc_layout_character_spacing(locale_suffix: str) -> float:
    if locale_suffix == "en":
        return DESC_LAYOUT_CHARACTER_SPACING_EN
    return DESC_CHARACTER_SPACING_CJK


DESC_LAYOUT_CHARACTER_SPACING_BY_GROUP_EN: dict[tuple[int, int], float] = {
}


def desc_layout_character_spacing_for_group(
    locale_suffix: str,
    description: str,
    wrapped_lines: list[tuple[list[str], bool]],
    is_dream: bool = False,
) -> float:
    if locale_suffix != "en" or is_dream:
        return desc_layout_character_spacing(locale_suffix)
    key = (len(wrapped_lines), description.count("\n"))
    return DESC_LAYOUT_CHARACTER_SPACING_BY_GROUP_EN.get(key, DESC_LAYOUT_CHARACTER_SPACING_EN)


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
        self.font_asset_path_id = font_asset_path_id
        self.atlas_path = atlas_path
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
        self._isolated_sdf_cache: dict[tuple[object, ...], tuple[Image.Image, tuple[int, int, int, int]]] = {}

    def isolated_glyph_sdf(
        self,
        char: str,
        glyph: TmpGlyph,
        crop_pad: int,
        extra_pad: int,
        isolate_fringe: int,
        extrapolate: int,
        tight: bool = False,
        seed_largest_only: bool = False,
    ) -> tuple[Image.Image, tuple[int, int, int, int]]:
        """Return an isolated padded glyph SDF crop and adjusted glyph box.

        This is deliberately a pixel-translation-only derived atlas cell: the
        original atlas pixels are copied into a larger crop and the synthetic
        fringe is generated once for this glyph/padding configuration.  Later
        render passes still sample the derived cell at their final scale.
        """

        key = (
            ISOLATED_SDF_CACHE_VERSION,
            self.font_asset_path_id,
            self.atlas_path.name,
            ord(char),
            glyph.x,
            glyph.y,
            glyph.width,
            glyph.height,
            crop_pad,
            extra_pad,
            isolate_fringe,
            extrapolate,
            tight,
            seed_largest_only,
        )
        cached = self._isolated_sdf_cache.get(key)
        if cached is not None:
            image, glyph_box = cached
            return image.copy(), glyph_box

        cache_id = hashlib.sha1(repr(key).encode("utf-8")).hexdigest()
        cache_dir = RENDER_CACHE_DIR / "isolated_sdf"
        png_path = cache_dir / f"{cache_id}.png"
        json_path = cache_dir / f"{cache_id}.json"
        if png_path.exists() and json_path.exists():
            try:
                data = json.loads(json_path.read_text(encoding="utf-8"))
                glyph_box = tuple(int(value) for value in data["glyph_box"])
                if len(glyph_box) == 4:
                    image = Image.open(png_path).convert("L")
                    result = (image, glyph_box)
                    self._isolated_sdf_cache[key] = result
                    return image.copy(), glyph_box
            except Exception:
                pass

        glyph_left = glyph.x
        glyph_top = self.atlas.height - glyph.y - glyph.height
        glyph_right = glyph.x + glyph.width
        glyph_bottom = self.atlas.height - glyph.y

        if tight:
            atlas_pixels = self.atlas.load()
            seeds = {
                (x, y)
                for y in range(max(0, glyph_top), min(self.atlas.height, glyph_bottom))
                for x in range(max(0, glyph_left), min(self.atlas.width, glyph_right))
                if atlas_pixels[x, y] >= 128
            }
            if not seeds:
                seeds = {
                    (x, y)
                    for y in range(max(0, glyph_top), min(self.atlas.height, glyph_bottom))
                    for x in range(max(0, glyph_left), min(self.atlas.width, glyph_right))
                    if atlas_pixels[x, y] >= 64
                }

            seen: set[tuple[int, int]] = set()
            largest: list[tuple[int, int]] = []
            for seed in seeds:
                if seed in seen:
                    continue
                stack = [seed]
                component: list[tuple[int, int]] = []
                seen.add(seed)
                while stack:
                    px, py = stack.pop()
                    component.append((px, py))
                    for nx in (px - 1, px, px + 1):
                        for ny in (py - 1, py, py + 1):
                            if (nx, ny) in seeds and (nx, ny) not in seen:
                                seen.add((nx, ny))
                                stack.append((nx, ny))
                if len(component) > len(largest):
                    largest = component

            if largest:
                source_pad = max(1, isolate_fringe)
                left = max(0, min(x for x, _ in largest) - source_pad)
                top = max(0, min(y for _, y in largest) - source_pad)
                right = min(self.atlas.width, max(x for x, _ in largest) + source_pad + 1)
                bottom = min(self.atlas.height, max(y for _, y in largest) + source_pad + 1)
            else:
                left = max(0, glyph_left - crop_pad)
                top = max(0, glyph_top - crop_pad)
                right = min(self.atlas.width, glyph_right + crop_pad)
                bottom = min(self.atlas.height, glyph_bottom + crop_pad)
        else:
            left = max(0, glyph_left - crop_pad)
            top = max(0, glyph_top - crop_pad)
            right = min(self.atlas.width, glyph_right + crop_pad)
            bottom = min(self.atlas.height, glyph_bottom + crop_pad)
        sdf = self.atlas.crop((left, top, right, bottom))
        glyph_box = (
            glyph_left - left,
            glyph_top - top,
            glyph_right - left,
            glyph_bottom - top,
        )
        if extra_pad > 0:
            padded = Image.new("L", (sdf.width + extra_pad * 2, sdf.height + extra_pad * 2), 0)
            padded.paste(sdf, (extra_pad, extra_pad))
            sdf = padded
            glyph_box = (
                glyph_box[0] + extra_pad,
                glyph_box[1] + extra_pad,
                glyph_box[2] + extra_pad,
                glyph_box[3] + extra_pad,
            )
        sdf = isolate_sdf_component(sdf, glyph_box, isolate_fringe, extrapolate, seed_largest_only=seed_largest_only)

        cache_dir.mkdir(parents=True, exist_ok=True)
        sdf.save(png_path, optimize=True, compress_level=9)
        json_path.write_text(json.dumps({"glyph_box": glyph_box}, separators=(",", ":")), encoding="utf-8")
        result = (sdf, glyph_box)
        self._isolated_sdf_cache[key] = result
        return sdf.copy(), glyph_box

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

    def text_line_height_float(self, font_size: float, line_spacing: float = 0.0) -> float:
        face_line_height = self.line_height * font_size / self.point_size
        spacing = line_spacing * font_size * 0.01
        return max(1.0, face_line_height + spacing)

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
        glyph_scale_x: float = 1.0,
        glyph_scale_y: float = 1.0,
        isolate_fringe_px: int | None = None,
        tight_isolate: bool = False,
        line_phase_x: float = 0.0,
        line_phase_y: float = 0.0,
        sdf_distance_scale_normal: float | None = None,
        sdf_distance_scale_bold: float | None = None,
        sdf_face_distance_scale_normal: float | None = None,
        sdf_face_distance_scale_bold: float | None = None,
        sdf_outline_distance_scale_normal: float | None = None,
        sdf_outline_distance_scale_bold: float | None = None,
    ) -> Image.Image:
        scale = font_size / self.point_size
        x_scale = scale * glyph_scale_x
        y_scale = scale * glyph_scale_y
        spacing = self.character_spacing_px(character_spacing, font_size)
        pad = max(4, round(font_size * 0.25 * max(glyph_scale_x, glyph_scale_y)))
        if isolate_bleed:
            pad += math.ceil(SDF_ISOLATED_EXTRA_PAD * max(x_scale, y_scale))
        cursor = pad
        baseline = pad + round(27.0 * y_scale)
        width = round(self.text_width_float(text, font_size, character_spacing) * glyph_scale_x) + pad * 2
        height = round(42.0 * y_scale) + pad * 2
        result = Image.new("RGBA", (max(1, width), max(1, height)), (0, 0, 0, 0))

        for char in text:
            glyph = self.glyphs.get(char)
            if glyph is None or glyph.width == 0 or glyph.height == 0:
                cursor += self.space_advance * x_scale + spacing * glyph_scale_x
                continue
            active_material = material or DEFAULT_ATLAS_MATERIAL
            crop_pad = tmp_glyph_padding(active_material, bold)
            extra_pad = SDF_ISOLATED_EXTRA_PAD if isolate_bleed else 0
            effective_crop_pad = crop_pad + extra_pad
            if isolate_bleed:
                isolate_fringe = crop_pad if isolate_fringe_px is None else isolate_fringe_px
                sdf, glyph_box = self.isolated_glyph_sdf(
                    char,
                    glyph,
                    crop_pad,
            extra_pad,
            isolate_fringe,
            max(0, effective_crop_pad - isolate_fringe),
            tight=tight_isolate,
            seed_largest_only=tight_isolate,
        )
            else:
                left = max(0, glyph.x - crop_pad)
                top = max(0, self.atlas.height - glyph.y - glyph.height - crop_pad)
                right = min(self.atlas.width, glyph.x + glyph.width + crop_pad)
                bottom = min(self.atlas.height, self.atlas.height - glyph.y + crop_pad)
                sdf = self.atlas.crop((left, top, right, bottom))
                glyph_box = (crop_pad, crop_pad, crop_pad + glyph.width, crop_pad + glyph.height)
            glyph_left = cursor + (glyph.bearing_x - glyph_box[0]) * x_scale
            glyph_top = baseline - (glyph.bearing_y + glyph_box[1]) * y_scale
            glyph_left_i = math.floor(glyph_left + line_phase_x)
            glyph_top_i = math.floor(glyph_top + line_phase_y)
            sdf_source = sdf
            sampled_size = (max(1, round(sdf.width * x_scale)), max(1, round(sdf.height * y_scale)))
            sample_phase_x = (glyph_left + line_phase_x) - glyph_left_i
            sample_phase_y = (glyph_top + line_phase_y) - glyph_top_i
            sdf = sample_sdf_bilinear_offset(
                sdf_source,
                sampled_size,
                sample_phase_x,
                sample_phase_y,
            )

            alpha_font_size = shader_font_size or font_size
            fill_alpha, outline_alpha = tmp_sdf_alphas(
                sdf,
                active_material,
                alpha_font_size,
                bold=bold,
                sdf_distance_scale_normal=sdf_distance_scale_normal,
                sdf_distance_scale_bold=sdf_distance_scale_bold,
                sdf_face_distance_scale_normal=sdf_face_distance_scale_normal,
                sdf_face_distance_scale_bold=sdf_face_distance_scale_bold,
                sdf_outline_distance_scale_normal=sdf_outline_distance_scale_normal,
                sdf_outline_distance_scale_bold=sdf_outline_distance_scale_bold,
            )
            underlay_offset = tmp_sdf_underlay_offset(active_material, alpha_font_size)
            if underlay_offset is not None:
                underlay_sdf = sample_sdf_bilinear_offset(
                    sdf_source,
                    sampled_size,
                    sample_phase_x + underlay_offset[0],
                    sample_phase_y + underlay_offset[1],
                )
                underlay_alpha = tmp_sdf_underlay(underlay_sdf, active_material, alpha_font_size)
                color = active_material.get("underlay_color", (0.0, 0.0, 0.0, 0.0))
                underlay_color = rgb_from_unit((color[0], color[1], color[2]))
                underlay_layer = Image.new("RGBA", sdf.size, (*underlay_color, 255))
                underlay_layer.putalpha(underlay_alpha)
                alpha_composite_text(
                    result,
                    underlay_layer,
                    (glyph_left_i, glyph_top_i),
                )
            if outline_alpha is not None:
                outline_color = rgb_from_unit(active_material["outline_color"])
                outline = Image.new("RGBA", sdf.size, (*outline_color, 255))
                outline.putalpha(outline_alpha)
                alpha_composite_text(result, outline, (glyph_left_i, glyph_top_i))

            face = Image.new("RGBA", sdf.size, (*fill, 255))
            face.putalpha(fill_alpha)
            alpha_composite_text(result, face, (glyph_left_i, glyph_top_i))
            cursor += glyph.advance * x_scale + spacing * glyph_scale_x

        if trim:
            return result.crop(result.getbbox() or (0, 0, 1, 1))
        if isolate_bleed and SDF_ISOLATED_EXTRA_PAD > 0:
            inset_x = math.ceil(SDF_ISOLATED_EXTRA_PAD * x_scale)
            inset_y = math.ceil(SDF_ISOLATED_EXTRA_PAD * y_scale)
            if result.width > inset_x * 2 and result.height > inset_y * 2:
                return result.crop((inset_x, inset_y, result.width - inset_x, result.height - inset_y))
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
        sdf_distance_scale_normal: float | None = None,
        sdf_distance_scale_bold: float | None = None,
        sdf_face_distance_scale_normal: float | None = None,
        sdf_face_distance_scale_bold: float | None = None,
        sdf_outline_distance_scale_normal: float | None = None,
        sdf_outline_distance_scale_bold: float | None = None,
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
                sdf = sample_sdf_bilinear(
                    sdf,
                    (max(1, round(sdf.width * scale)), max(1, round(sdf.height * scale))),
                )
                glyph_left = cursor + (glyph.bearing_x - crop_pad) * scale
                glyph_top = baseline - (glyph.bearing_y + crop_pad) * scale
                alpha_font_size = shader_font_size or font_size
                fill_alpha, _ = tmp_sdf_alphas(
                    sdf,
                    active_material,
                    alpha_font_size,
                    bold=bold,
                    sdf_distance_scale_normal=sdf_distance_scale_normal,
                    sdf_distance_scale_bold=sdf_distance_scale_bold,
                    sdf_face_distance_scale_normal=sdf_face_distance_scale_normal,
                    sdf_face_distance_scale_bold=sdf_face_distance_scale_bold,
                    sdf_outline_distance_scale_normal=sdf_outline_distance_scale_normal,
                    sdf_outline_distance_scale_bold=sdf_outline_distance_scale_bold,
                )
                face = Image.new("RGBA", sdf.size, (*fill, 255))
                face.putalpha(fill_alpha)
                alpha_composite_text(result, face, (glyph_left, glyph_top))
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


def material_outline_width_px(material: dict[str, object], font_size: int) -> int:
    outline_width = float(material.get("outline_width", 0.0))
    scale_ratio = float(material.get("scale_ratio_a", 1.0))
    gradient_scale = float(material.get("gradient_scale", 3.0))
    if outline_width <= 0.0:
        return 0
    return max(1, round(outline_width * scale_ratio * gradient_scale * font_size / DEFAULT_FONT_POINT_SIZE))


def set_text_renderer(name: str) -> None:
    if name not in TEXT_RENDERERS:
        raise ValueError(f"Unknown text renderer {name!r}; expected one of {TEXT_RENDERERS}")
    global TEXT_RENDERER
    TEXT_RENDERER = name


def set_sdf_distance_scale(normal: float | None = None, bold: float | None = None) -> None:
    global SDF_DISTANCE_SCALE_NORMAL, SDF_DISTANCE_SCALE_BOLD
    if normal is not None:
        SDF_DISTANCE_SCALE_NORMAL = float(normal)
    if bold is not None:
        SDF_DISTANCE_SCALE_BOLD = float(bold)


def set_english_title_render_params(
    font_size_max_ui: float | None = None,
    two_line_max_scale: float | None = None,
    single_line_scale: float | None = None,
    rect_offset_x_ui: float | None = None,
    rect_width_scale: float | None = None,
    offset_x_ui: float | None = None,
    offset_y_ui: float | None = None,
    glyph_scale: float | None = None,
    char_spacing: float | None = None,
    line_spacing: float | None = None,
    face_dilate: float | None = None,
    outline_width: float | None = None,
    distance_scale: float | None = None,
    face_distance_scale: float | None = None,
    outline_distance_scale: float | None = None,
) -> None:
    global TITLE_FONT_SIZE_MAX_UI, TITLE_OFFSET_X_UI, TITLE_OFFSET_Y_UI
    global TITLE_TWO_LINE_MAX_SCALE, TITLE_SINGLE_LINE_SCALE, TITLE_RECT_OFFSET_X_UI, TITLE_RECT_WIDTH_SCALE
    global TITLE_GLYPH_SCALE_EN, TITLE_CHARACTER_SPACING_EN, TITLE_LINE_SPACING
    global TITLE_FACE_DILATE, TITLE_OUTLINE_WIDTH, TITLE_DISTANCE_SCALE
    global TITLE_FACE_DISTANCE_SCALE, TITLE_OUTLINE_DISTANCE_SCALE
    if font_size_max_ui is not None:
        TITLE_FONT_SIZE_MAX_UI = float(font_size_max_ui)
    if two_line_max_scale is not None:
        TITLE_TWO_LINE_MAX_SCALE = float(two_line_max_scale)
    if single_line_scale is not None:
        TITLE_SINGLE_LINE_SCALE = float(single_line_scale)
    if rect_offset_x_ui is not None:
        TITLE_RECT_OFFSET_X_UI = float(rect_offset_x_ui)
    if rect_width_scale is not None:
        TITLE_RECT_WIDTH_SCALE = float(rect_width_scale)
    if offset_x_ui is not None:
        TITLE_OFFSET_X_UI = float(offset_x_ui)
    if offset_y_ui is not None:
        TITLE_OFFSET_Y_UI = float(offset_y_ui)
    if glyph_scale is not None:
        TITLE_GLYPH_SCALE_EN = float(glyph_scale)
    if char_spacing is not None:
        TITLE_CHARACTER_SPACING_EN = float(char_spacing)
    if line_spacing is not None:
        TITLE_LINE_SPACING = float(line_spacing)
    if face_dilate is not None:
        TITLE_FACE_DILATE = float(face_dilate)
    if outline_width is not None:
        TITLE_OUTLINE_WIDTH = float(outline_width)
    if distance_scale is not None:
        TITLE_DISTANCE_SCALE = float(distance_scale)
        TITLE_FACE_DISTANCE_SCALE = float(distance_scale)
        TITLE_OUTLINE_DISTANCE_SCALE = float(distance_scale)
    if face_distance_scale is not None:
        TITLE_FACE_DISTANCE_SCALE = float(face_distance_scale)
    if outline_distance_scale is not None:
        TITLE_OUTLINE_DISTANCE_SCALE = float(outline_distance_scale)


def set_art_transform(
    scale: float | None = None,
    dx_ui: float | None = None,
    dy_ui: float | None = None,
) -> None:
    global ART_SCALE, ART_OFFSET_X_UI, ART_OFFSET_Y_UI
    if scale is not None:
        ART_SCALE = float(scale)
    if dx_ui is not None:
        ART_OFFSET_X_UI = float(dx_ui)
    if dy_ui is not None:
        ART_OFFSET_Y_UI = float(dy_ui)


def set_qi_cost_render_params(
    icon_scale: float | None = None,
    icon_dx_ui: float | None = None,
    icon_dy_ui: float | None = None,
    digit_font_size_ui: float | None = None,
    digit_scale_x: float | None = None,
    digit_scale_y: float | None = None,
    digit_dx_ui: float | None = None,
    digit_dy_ui: float | None = None,
    digit_face_dilate: float | None = None,
    digit_outline_width: float | None = None,
    digit_distance_scale: float | None = None,
    digit_face_distance_scale: float | None = None,
    digit_outline_distance_scale: float | None = None,
) -> None:
    global QI_ICON_SCALE, QI_ICON_OFFSET_X_UI, QI_ICON_OFFSET_Y_UI
    global QI_DIGIT_FONT_SIZE_UI, QI_DIGIT_SCALE_X, QI_DIGIT_SCALE_Y
    global QI_DIGIT_OFFSET_X, QI_DIGIT_OFFSET_Y
    global QI_DIGIT_FACE_DILATE, QI_DIGIT_OUTLINE_WIDTH, QI_DIGIT_DISTANCE_SCALE
    global QI_DIGIT_FACE_DISTANCE_SCALE, QI_DIGIT_OUTLINE_DISTANCE_SCALE
    if icon_scale is not None:
        QI_ICON_SCALE = float(icon_scale)
    if icon_dx_ui is not None:
        QI_ICON_OFFSET_X_UI = float(icon_dx_ui)
    if icon_dy_ui is not None:
        QI_ICON_OFFSET_Y_UI = float(icon_dy_ui)
    if digit_font_size_ui is not None:
        QI_DIGIT_FONT_SIZE_UI = float(digit_font_size_ui)
    if digit_scale_x is not None:
        QI_DIGIT_SCALE_X = float(digit_scale_x)
    if digit_scale_y is not None:
        QI_DIGIT_SCALE_Y = float(digit_scale_y)
    if digit_dx_ui is not None:
        QI_DIGIT_OFFSET_X = float(digit_dx_ui)
    if digit_dy_ui is not None:
        QI_DIGIT_OFFSET_Y = float(digit_dy_ui)
    if digit_face_dilate is not None:
        QI_DIGIT_FACE_DILATE = float(digit_face_dilate)
    if digit_outline_width is not None:
        QI_DIGIT_OUTLINE_WIDTH = float(digit_outline_width)
    if digit_distance_scale is not None:
        QI_DIGIT_DISTANCE_SCALE = float(digit_distance_scale)
        QI_DIGIT_FACE_DISTANCE_SCALE = float(digit_distance_scale)
        QI_DIGIT_OUTLINE_DISTANCE_SCALE = float(digit_distance_scale)
    if digit_face_distance_scale is not None:
        QI_DIGIT_FACE_DISTANCE_SCALE = float(digit_face_distance_scale)
    if digit_outline_distance_scale is not None:
        QI_DIGIT_OUTLINE_DISTANCE_SCALE = float(digit_outline_distance_scale)


def set_vertical_name_render_params(
    font_size_ui: float | None = None,
    slot_height_ui: float | None = None,
    line_gap_ui: float | None = None,
    offset_x_ui: float | None = None,
    offset_y_ui: float | None = None,
    dream_offset_y_ui: float | None = None,
    glyph_scale: float | None = None,
    face_dilate: float | None = None,
    outline_width: float | None = None,
    distance_scale: float | None = None,
    face_distance_scale: float | None = None,
    outline_distance_scale: float | None = None,
) -> None:
    global VERTICAL_NAME_FONT_SIZE_UI, VERTICAL_NAME_SLOT_HEIGHT_UI, VERTICAL_NAME_LINE_GAP_UI
    global VERTICAL_NAME_OFFSET_X_UI, VERTICAL_NAME_OFFSET_Y_UI, DREAM_VERTICAL_NAME_OFFSET_Y_UI
    global VERTICAL_NAME_GLYPH_SCALE, VERTICAL_NAME_FACE_DILATE, VERTICAL_NAME_OUTLINE_WIDTH
    global VERTICAL_NAME_DISTANCE_SCALE, VERTICAL_NAME_FACE_DISTANCE_SCALE, VERTICAL_NAME_OUTLINE_DISTANCE_SCALE
    if font_size_ui is not None:
        VERTICAL_NAME_FONT_SIZE_UI = float(font_size_ui)
    if slot_height_ui is not None:
        VERTICAL_NAME_SLOT_HEIGHT_UI = float(slot_height_ui)
    if line_gap_ui is not None:
        VERTICAL_NAME_LINE_GAP_UI = float(line_gap_ui)
    if offset_x_ui is not None:
        VERTICAL_NAME_OFFSET_X_UI = float(offset_x_ui)
    if offset_y_ui is not None:
        VERTICAL_NAME_OFFSET_Y_UI = float(offset_y_ui)
    if dream_offset_y_ui is not None:
        DREAM_VERTICAL_NAME_OFFSET_Y_UI = float(dream_offset_y_ui)
    if glyph_scale is not None:
        VERTICAL_NAME_GLYPH_SCALE = float(glyph_scale)
    if face_dilate is not None:
        VERTICAL_NAME_FACE_DILATE = float(face_dilate)
    if outline_width is not None:
        VERTICAL_NAME_OUTLINE_WIDTH = float(outline_width)
    if distance_scale is not None:
        VERTICAL_NAME_DISTANCE_SCALE = float(distance_scale)
        VERTICAL_NAME_FACE_DISTANCE_SCALE = float(distance_scale)
        VERTICAL_NAME_OUTLINE_DISTANCE_SCALE = float(distance_scale)
    if face_distance_scale is not None:
        VERTICAL_NAME_FACE_DISTANCE_SCALE = float(face_distance_scale)
    if outline_distance_scale is not None:
        VERTICAL_NAME_OUTLINE_DISTANCE_SCALE = float(outline_distance_scale)


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


def scaled_ui_font_size_float(value: float, render_scale: float) -> float:
    return max(1.0, value * _scale()[1] * render_scale)


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


def isolate_sdf_component(
    sdf_alpha: Image.Image,
    glyph_box: tuple[int, int, int, int],
    fringe: int,
    extrapolate: int = 0,
    seed_largest_only: bool = False,
) -> Image.Image:
    """Remove neighboring atlas glyph bleed while preserving the glyph fringe.

    TMP expands glyph UVs by material padding.  That works when the atlas packer
    leaves a clean SDF fringe.  Some Yi Xian atlas cells include neighboring
    glyph remnants inside the expanded crop, and those remnants can be connected
    through antialias pixels.  Seed only from high-SDF pixels inside the real TMP
    glyph rect, then dilate those seeds enough to retain a small real SDF fringe.
    When more padding is needed for outline rendering, synthesize it from that
    clean fringe instead of copying neighboring atlas pixels back in.
    """

    gx0, gy0, gx1, gy1 = glyph_box
    pixels = sdf_alpha.load()
    width, height = sdf_alpha.size
    keep: set[tuple[int, int]] = {
        (x, y)
        for y in range(max(0, gy0), min(height, gy1))
        for x in range(max(0, gx0), min(width, gx1))
        if pixels[x, y] >= 128
    }
    if not keep:
        keep = {
            (x, y)
            for y in range(max(0, gy0), min(height, gy1))
            for x in range(max(0, gx0), min(width, gx1))
            if pixels[x, y] >= 64
        }

    if not keep:
        return sdf_alpha

    if seed_largest_only:
        seen: set[tuple[int, int]] = set()
        largest: set[tuple[int, int]] = set()
        for seed in keep:
            if seed in seen:
                continue
            stack = [seed]
            component: set[tuple[int, int]] = set()
            seen.add(seed)
            while stack:
                px, py = stack.pop()
                component.add((px, py))
                for nx in (px - 1, px, px + 1):
                    for ny in (py - 1, py, py + 1):
                        if (nx, ny) in keep and (nx, ny) not in seen:
                            seen.add((nx, ny))
                            stack.append((nx, ny))
            if len(component) > len(largest):
                largest = component
        if largest:
            keep = largest

    mask = Image.new("L", sdf_alpha.size, 0)
    mask_pixels = mask.load()
    radius = max(1, fringe)
    for x, y in keep:
        for yy in range(max(0, y - radius), min(height, y + radius + 1)):
            for xx in range(max(0, x - radius), min(width, x + radius + 1)):
                mask_pixels[xx, yy] = 255

    cleaned = Image.new("L", sdf_alpha.size, 0)
    cleaned.paste(sdf_alpha, mask=mask)
    if extrapolate <= 0:
        return cleaned

    cleaned_pixels = cleaned.load()
    valid: set[tuple[int, int]] = {
        (x, y)
        for y in range(height)
        for x in range(width)
        if mask_pixels[x, y] != 0
    }
    frontier = set(valid)
    falloff = 48
    for _ in range(extrapolate):
        additions: dict[tuple[int, int], int] = {}
        for x, y in frontier:
            base = cleaned_pixels[x, y]
            if base <= falloff:
                continue
            value = base - falloff
            for yy in range(max(0, y - 1), min(height, y + 2)):
                for xx in range(max(0, x - 1), min(width, x + 2)):
                    if (xx, yy) in valid:
                        continue
                    key = (xx, yy)
                    if value > additions.get(key, 0):
                        additions[key] = value
        if not additions:
            break
        frontier = set(additions)
        valid.update(frontier)
        for (x, y), value in additions.items():
            cleaned_pixels[x, y] = value
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


def keep_alpha_near_strong_component(image: Image.Image, seed_threshold: int = 64, pad: int = 3) -> Image.Image:
    alpha = image.getchannel("A")
    seed = alpha.point(lambda value: 255 if value >= seed_threshold else 0)
    width, height = seed.size
    pixels = seed.load()
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
                for nx, ny in ((px - 1, py), (px + 1, py), (px, py - 1), (px, py + 1)):
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
    if pad > 0:
        keep = keep.filter(ImageFilter.MaxFilter(pad * 2 + 1))
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


def alpha_composite_text(canvas: Image.Image, image: Image.Image, xy: tuple[float, float]) -> None:
    if TEXT_RENDERER == "sdf":
        canvas.alpha_composite(image, (round(xy[0]), round(xy[1])))
        return
    alpha_composite_subpixel(canvas, image, xy)


def composite_card_art(canvas: Image.Image, art: Image.Image, render_scale: float) -> None:
    x0, y0, x1, y1 = scaled_box_float(ART_RECT, render_scale)
    center_x = (x0 + x1) / 2.0 + scaled_signed_float(ART_OFFSET_X_UI, render_scale)
    center_y = (y0 + y1) / 2.0 + scaled_signed_float(ART_OFFSET_Y_UI, render_scale)
    scale_x = ((x1 - x0) * ART_SCALE) / art.width
    scale_y = ((y1 - y0) * ART_SCALE) / art.height
    dx = center_x - art.width * scale_x / 2.0
    dy = center_y - art.height * scale_y / 2.0
    layer = magic_kernel_sharp_resample_translate(art, canvas.size, scale_x, scale_y, dx, dy)
    canvas.alpha_composite(layer)


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
        lib.mks_resample_translate_rgba.argtypes = [
            u8_ptr,
            ctypes.c_int,
            ctypes.c_int,
            ctypes.c_int,
            ctypes.c_int,
            ctypes.c_double,
            ctypes.c_double,
            ctypes.c_double,
            ctypes.c_double,
            u8_ptr,
        ]
        lib.mks_resample_translate_rgba.restype = ctypes.c_int
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


def magic_kernel_sharp_resample_translate_c(
    image: Image.Image,
    target_size: tuple[int, int],
    scale_x: float,
    scale_y: float,
    dx: float,
    dy: float,
) -> Image.Image | None:
    lib = magic_kernel_sharp_lib()
    if lib is None:
        return None
    source = image.convert("RGBA")
    source_width, source_height = source.size
    target_width, target_height = target_size
    if source_width <= 0 or source_height <= 0 or target_width <= 0 or target_height <= 0:
        return None
    source_bytes = source.tobytes()
    source_buffer = (ctypes.c_uint8 * len(source_bytes)).from_buffer_copy(source_bytes)
    output_buffer = (ctypes.c_uint8 * (target_width * target_height * 4))()
    result = lib.mks_resample_translate_rgba(
        source_buffer,
        source_width,
        source_height,
        target_width,
        target_height,
        scale_x,
        scale_y,
        dx,
        dy,
        output_buffer,
    )
    if result != 0:
        return None
    return image_from_rgba_buffer(output_buffer, target_size)


def magic_kernel_sharp_resample_translate(
    image: Image.Image,
    target_size: tuple[int, int],
    scale_x: float,
    scale_y: float,
    dx: float,
    dy: float,
) -> Image.Image:
    c_result = magic_kernel_sharp_resample_translate_c(image, target_size, scale_x, scale_y, dx, dy)
    if c_result is not None:
        return c_result
    source = image.convert("RGBA")
    scaled = magic_kernel_sharp_resize(
        source,
        (max(1, round(source.width * scale_x)), max(1, round(source.height * scale_y))),
    )
    canvas = Image.new("RGBA", target_size, (0, 0, 0, 0))
    alpha_composite_subpixel(canvas, scaled, (dx, dy))
    return canvas


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


def sample_sdf_bilinear(sdf_alpha: Image.Image, size: tuple[int, int]) -> Image.Image:
    """Sample a TMP SDF glyph crop like a shader texture lookup.

    This is intentionally not Magic Kernel or sharpening.  TMP samples the
    distance field texture bilinearly at the final glyph pixels, then applies
    the SDF threshold.  Reconstruction filters make the distance ramp wider and
    visibly blur the final text.
    """

    return sample_sdf_bilinear_offset(sdf_alpha, size, 0.0, 0.0)


def sample_sdf_bilinear_offset(
    sdf_alpha: Image.Image,
    size: tuple[int, int],
    dest_offset_x: float = 0.0,
    dest_offset_y: float = 0.0,
) -> Image.Image:
    source = sdf_alpha.convert("L")
    if source.size == size and dest_offset_x == 0.0 and dest_offset_y == 0.0:
        return source.copy()
    out_width, out_height = size
    out = Image.new("L", (max(1, out_width), max(1, out_height)), 0)
    src = source.load()
    dst = out.load()
    scale_x = out_width / source.width
    scale_y = out_height / source.height

    for y in range(out_height):
        sy = (y + 0.5 - dest_offset_y) / scale_y - 0.5
        y0 = math.floor(sy)
        y1 = y0 + 1
        fy = sy - y0
        y0 = min(source.height - 1, max(0, y0))
        y1 = min(source.height - 1, max(0, y1))
        for x in range(out_width):
            sx = (x + 0.5 - dest_offset_x) / scale_x - 0.5
            x0 = math.floor(sx)
            x1 = x0 + 1
            fx = sx - x0
            x0 = min(source.width - 1, max(0, x0))
            x1 = min(source.width - 1, max(0, x1))
            top = src[x0, y0] * (1.0 - fx) + src[x1, y0] * fx
            bottom = src[x0, y1] * (1.0 - fx) + src[x1, y1] * fx
            dst[x, y] = clamp_byte(top * (1.0 - fy) + bottom * fy)
    return out


def tmp_sdf_alphas(
    sdf_alpha: Image.Image,
    material: dict[str, object],
    font_size: int,
    bold: bool = False,
    sdf_distance_scale_normal: float | None = None,
    sdf_distance_scale_bold: float | None = None,
    sdf_face_distance_scale_normal: float | None = None,
    sdf_face_distance_scale_bold: float | None = None,
    sdf_outline_distance_scale_normal: float | None = None,
    sdf_outline_distance_scale_bold: float | None = None,
) -> tuple[Image.Image, Image.Image | None]:
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
    base_distance_scale = max(1.0, gradient_scale * font_size / DEFAULT_FONT_POINT_SIZE)
    normal_distance_scale = SDF_DISTANCE_SCALE_NORMAL if sdf_distance_scale_normal is None else sdf_distance_scale_normal
    bold_distance_scale = SDF_DISTANCE_SCALE_BOLD if sdf_distance_scale_bold is None else sdf_distance_scale_bold
    legacy_distance_scale = bold_distance_scale if bold else normal_distance_scale
    face_distance_scale = (
        sdf_face_distance_scale_bold if bold else sdf_face_distance_scale_normal
    )
    outline_distance_scale = (
        sdf_outline_distance_scale_bold if bold else sdf_outline_distance_scale_normal
    )
    face_distance_scale = base_distance_scale * (
        legacy_distance_scale if face_distance_scale is None else face_distance_scale
    )
    outline_distance_scale = base_distance_scale * (
        legacy_distance_scale if outline_distance_scale is None else outline_distance_scale
    )
    softness = float(material.get("outline_softness", 0.0)) * scale_ratio
    face_distance_scale = face_distance_scale / (1.0 + softness * face_distance_scale)
    outline_distance_scale = outline_distance_scale / (1.0 + softness * outline_distance_scale)
    weight = (font_weight + float(material["face_dilate"])) * scale_ratio * 0.5
    outline_width = float(material["outline_width"])
    face_bias = (0.5 - weight) * face_distance_scale - 0.5
    outline_bias = (0.5 - weight) * outline_distance_scale - 0.5
    face_outline = outline_width * scale_ratio * 0.5 * face_distance_scale
    outline_outline = outline_width * scale_ratio * 0.5 * outline_distance_scale

    def saturate_alpha(px: int, distance_scale: float, threshold: float) -> int:
        return max(0, min(255, round(((px / 255.0) * distance_scale - threshold) * 255)))

    if outline_width <= 0:
        face = sdf_alpha.point(lambda px: saturate_alpha(px, face_distance_scale, face_bias))
        return face, None
    face = sdf_alpha.point(lambda px: saturate_alpha(px, face_distance_scale, face_bias + face_outline))
    outline_alpha = sdf_alpha.point(
        lambda px: saturate_alpha(px, outline_distance_scale, outline_bias - outline_outline)
    )
    return face, outline_alpha


def tmp_sdf_underlay(
    sdf_alpha: Image.Image,
    material: dict[str, object],
    font_size: int,
) -> Image.Image | None:
    alpha = float(material.get("underlay_color", (0.0, 0.0, 0.0, 0.0))[3])
    if alpha <= 0.0 or not bool(material.get("underlay_enabled", alpha > 0.0)):
        return None
    dilate = float(material.get("underlay_dilate", 0.0))
    softness = float(material.get("underlay_softness", 0.0))

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

    return sdf_alpha.point(saturate_underlay)


def tmp_sdf_underlay_offset(
    material: dict[str, object],
    font_size: int,
) -> tuple[float, float] | None:
    alpha = float(material.get("underlay_color", (0.0, 0.0, 0.0, 0.0))[3])
    if alpha <= 0.0 or not bool(material.get("underlay_enabled", alpha > 0.0)):
        return None
    offset_x = float(material.get("underlay_offset_x", 0.0))
    offset_y = float(material.get("underlay_offset_y", 0.0))
    dilate = float(material.get("underlay_dilate", 0.0))
    softness = float(material.get("underlay_softness", 0.0))
    if offset_x == 0.0 and offset_y == 0.0:
        return (0.0, 0.0)

    scale_ratio = float(material.get("scale_ratio_c", 0.0))
    gradient_scale = float(material["gradient_scale"])
    offset_scale = gradient_scale * scale_ratio * font_size / DEFAULT_FONT_POINT_SIZE
    # TMP's underlay Y value is expressed in UV space; negative serialized Y
    # moves the visible copy downward in image coordinates.
    return (offset_x * offset_scale, -offset_y * offset_scale)


def vector_line_image(
    text: str,
    font_asset: "TmpFont",
    font_size: int,
    fill: tuple[int, int, int],
    material: dict[str, object] | None = None,
    character_spacing: float = 0.0,
    bold: bool = False,
    trim: bool = True,
    glyph_scale: float = 1.0,
) -> Image.Image:
    effective_size = max(1, round(font_size * glyph_scale))
    fnt = font(effective_size)
    metrics_scale = effective_size / font_asset.point_size
    spacing = font_asset.character_spacing_px(character_spacing, effective_size)
    pad = max(4, round(effective_size * 0.25))
    cursor = float(pad)
    baseline = pad + round(27.0 * metrics_scale)
    width = font_asset.text_width(text, effective_size, character_spacing) + pad * 2
    height = round(42.0 * metrics_scale) + pad * 2
    result = Image.new("RGBA", (max(1, width), max(1, height)), (0, 0, 0, 0))
    draw = ImageDraw.Draw(result)
    active_material = material or DEFAULT_ATLAS_MATERIAL
    stroke_width = material_outline_width_px(active_material, effective_size)
    stroke_fill = rgb_from_unit(active_material.get("outline_color", (0.0, 0.0, 0.0)))
    if bold and stroke_width == 0:
        stroke_width = max(1, round(effective_size / 42))
        stroke_fill = fill

    for char in text:
        glyph = font_asset.glyphs.get(char)
        advance = glyph.advance if glyph else font_asset.space_advance
        draw.text(
            (cursor, baseline),
            char,
            font=fnt,
            fill=fill,
            anchor="ls",
            stroke_width=stroke_width,
            stroke_fill=stroke_fill,
        )
        cursor += advance * metrics_scale + spacing

    if trim:
        return result.crop(result.getbbox() or (0, 0, 1, 1))
    return result


def vector_rich_line_image(
    tokens: list[str],
    font_asset: "TmpFont",
    font_size: int,
    character_spacing: float = 0.0,
    trim: bool = True,
    glyph_scale: float = 1.0,
) -> Image.Image:
    effective_size = max(1, round(font_size * glyph_scale))
    fnt = font(effective_size)
    metrics_scale = effective_size / font_asset.point_size
    spacing = font_asset.character_spacing_px(character_spacing, effective_size)
    pad = max(4, round(effective_size * 0.25))
    baseline = pad + round(27.0 * metrics_scale)
    visible_text = "".join(display_token(token) for token in tokens)
    width = font_asset.text_width(visible_text, effective_size, character_spacing) + pad * 2
    height = round(42.0 * metrics_scale) + pad * 2
    result = Image.new("RGBA", (max(1, width), max(1, height)), (0, 0, 0, 0))
    draw = ImageDraw.Draw(result)
    cursor = float(pad)
    previous_visible = ""

    for token in tokens:
        visible = display_token(token)
        fill, _, _ = token_style(token, previous_visible)
        bold = token_is_keyword(token)
        stroke_width = max(1, round(effective_size / 42)) if bold else 0
        for char in visible:
            glyph = font_asset.glyphs.get(char)
            advance = glyph.advance if glyph else font_asset.space_advance
            draw.text(
                (cursor, baseline),
                char,
                font=fnt,
                fill=fill,
                anchor="ls",
                stroke_width=stroke_width,
                stroke_fill=fill,
            )
            cursor += advance * metrics_scale + spacing
        if visible.strip():
            previous_visible = visible

    if trim:
        return result.crop(result.getbbox() or (0, 0, 1, 1))
    return result


def sdf_line_image(
    text: str,
    font_asset: "TmpFont",
    font_size: int,
    fill: tuple[int, int, int],
    material: dict[str, object] | None = None,
    character_spacing: float = 0.0,
    shader_font_size: int | None = None,
    bold: bool = False,
    trim: bool = True,
    isolate_bleed: bool = False,
    isolate_fringe_px: int | None = None,
    tight_isolate: bool = False,
    glyph_scale: float = 1.0,
    line_phase_x: float = 0.0,
    line_phase_y: float = 0.0,
    sdf_distance_scale_normal: float | None = None,
    sdf_distance_scale_bold: float | None = None,
    sdf_face_distance_scale_normal: float | None = None,
    sdf_face_distance_scale_bold: float | None = None,
    sdf_outline_distance_scale_normal: float | None = None,
    sdf_outline_distance_scale_bold: float | None = None,
) -> Image.Image:
    effective_size = max(1, round(font_size * glyph_scale))
    effective_shader_size = None
    if shader_font_size is not None:
        effective_shader_size = max(1, round(shader_font_size * glyph_scale))
    return font_asset.render_line(
        text,
        effective_size,
        fill,
        material=material,
        character_spacing=character_spacing,
        shader_font_size=effective_shader_size,
        bold=bold,
        trim=trim,
        isolate_bleed=isolate_bleed,
        isolate_fringe_px=isolate_fringe_px,
        tight_isolate=tight_isolate,
        line_phase_x=line_phase_x,
        line_phase_y=line_phase_y,
        sdf_distance_scale_normal=sdf_distance_scale_normal,
        sdf_distance_scale_bold=sdf_distance_scale_bold,
        sdf_face_distance_scale_normal=sdf_face_distance_scale_normal,
        sdf_face_distance_scale_bold=sdf_face_distance_scale_bold,
        sdf_outline_distance_scale_normal=sdf_outline_distance_scale_normal,
        sdf_outline_distance_scale_bold=sdf_outline_distance_scale_bold,
    )


def sdf_rich_line_image(
    tokens: list[str],
    font_asset: "TmpFont",
    font_size: int,
    character_spacing: float = 0.0,
    shader_font_size: int | None = None,
    trim: bool = True,
    normal_face_dilate: float | None = None,
    bold_face_dilate: float | None = None,
    glyph_scale: float = 1.0,
    sdf_distance_scale_normal: float | None = None,
    sdf_distance_scale_bold: float | None = None,
    sdf_face_distance_scale_normal: float | None = None,
    sdf_face_distance_scale_bold: float | None = None,
    sdf_outline_distance_scale_normal: float | None = None,
    sdf_outline_distance_scale_bold: float | None = None,
) -> Image.Image:
    effective_size = max(1, round(font_size * glyph_scale))
    effective_shader_size = None
    if shader_font_size is not None:
        effective_shader_size = max(1, round(shader_font_size * glyph_scale))
    return font_asset.render_rich_line(
        tokens,
        effective_size,
        character_spacing,
        shader_font_size=effective_shader_size,
        trim=trim,
        normal_face_dilate=normal_face_dilate,
        bold_face_dilate=bold_face_dilate,
        sdf_distance_scale_normal=sdf_distance_scale_normal,
        sdf_distance_scale_bold=sdf_distance_scale_bold,
        sdf_face_distance_scale_normal=sdf_face_distance_scale_normal,
        sdf_face_distance_scale_bold=sdf_face_distance_scale_bold,
        sdf_outline_distance_scale_normal=sdf_outline_distance_scale_normal,
        sdf_outline_distance_scale_bold=sdf_outline_distance_scale_bold,
    )


def text_line_image(
    text: str,
    font_asset: "TmpFont",
    font_size: int,
    fill: tuple[int, int, int],
    material: dict[str, object] | None = None,
    character_spacing: float = 0.0,
    shader_font_size: int | None = None,
    trim: bool = True,
    isolate_bleed: bool = False,
    isolate_fringe_px: int | None = None,
    tight_isolate: bool = False,
    glyph_scale: float = 1.0,
    line_phase_x: float = 0.0,
    line_phase_y: float = 0.0,
    sdf_distance_scale_normal: float | None = None,
    sdf_distance_scale_bold: float | None = None,
    sdf_face_distance_scale_normal: float | None = None,
    sdf_face_distance_scale_bold: float | None = None,
    sdf_outline_distance_scale_normal: float | None = None,
    sdf_outline_distance_scale_bold: float | None = None,
) -> Image.Image:
    if TEXT_RENDERER == "otf":
        return vector_line_image(
            text,
            font_asset,
            font_size,
            fill,
            material=material,
            character_spacing=character_spacing,
            trim=trim,
            glyph_scale=glyph_scale,
        )
    return sdf_line_image(
        text,
        font_asset,
        font_size,
        fill,
        material=material,
        character_spacing=character_spacing,
        shader_font_size=shader_font_size,
        trim=trim,
        isolate_bleed=isolate_bleed,
        isolate_fringe_px=isolate_fringe_px,
        tight_isolate=tight_isolate,
        glyph_scale=glyph_scale,
        line_phase_x=line_phase_x,
        line_phase_y=line_phase_y,
        sdf_distance_scale_normal=sdf_distance_scale_normal,
        sdf_distance_scale_bold=sdf_distance_scale_bold,
        sdf_face_distance_scale_normal=sdf_face_distance_scale_normal,
        sdf_face_distance_scale_bold=sdf_face_distance_scale_bold,
        sdf_outline_distance_scale_normal=sdf_outline_distance_scale_normal,
        sdf_outline_distance_scale_bold=sdf_outline_distance_scale_bold,
    )


def rich_line_image(
    tokens: list[str],
    font_asset: "TmpFont",
    font_size: int,
    character_spacing: float = 0.0,
    shader_font_size: int | None = None,
    trim: bool = True,
    normal_face_dilate: float | None = None,
    bold_face_dilate: float | None = None,
    glyph_scale: float = 1.0,
    sdf_distance_scale_normal: float | None = None,
    sdf_distance_scale_bold: float | None = None,
    sdf_face_distance_scale_normal: float | None = None,
    sdf_face_distance_scale_bold: float | None = None,
    sdf_outline_distance_scale_normal: float | None = None,
    sdf_outline_distance_scale_bold: float | None = None,
) -> Image.Image:
    if TEXT_RENDERER == "otf":
        return vector_rich_line_image(
            tokens,
            font_asset,
            font_size,
            character_spacing,
            trim=trim,
            glyph_scale=glyph_scale,
        )
    return sdf_rich_line_image(
        tokens,
        font_asset,
        font_size,
        character_spacing,
        shader_font_size=shader_font_size,
        trim=trim,
        glyph_scale=glyph_scale,
        normal_face_dilate=normal_face_dilate,
        bold_face_dilate=bold_face_dilate,
        sdf_distance_scale_normal=sdf_distance_scale_normal,
        sdf_distance_scale_bold=sdf_distance_scale_bold,
        sdf_face_distance_scale_normal=sdf_face_distance_scale_normal,
        sdf_face_distance_scale_bold=sdf_face_distance_scale_bold,
        sdf_outline_distance_scale_normal=sdf_outline_distance_scale_normal,
        sdf_outline_distance_scale_bold=sdf_outline_distance_scale_bold,
    )


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
    return char in CJK_FULL_WIDTH_PUNCTUATION or unicodedata.east_asian_width(char) in {"F", "W"}


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


def default_tmp_cjk_cell_width_float_spaced(character_spacing: float):
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
        cell_units = 30.0 * len(text)
        width = cell_units * scale
        if len(text) > 1:
            width += (len(text) - 1) * spacing
        return width

    return measure


def desc_wrap_width_fn(locale_suffix: str, character_spacing: float):
    del locale_suffix
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
    del next_token
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
    return split_hyphen_prefix_suffix_rows(avoid_forbidden_line_edges(rows, max_width, tokens_width)) or [[]]


def avoid_forbidden_line_edges(
    rows: list[list[str]],
    max_width: int,
    tokens_width: Callable[[list[str]], float],
) -> list[list[str]]:
    fixed_rows = [trim_space_tokens(row) for row in rows if trim_space_tokens(row)]
    index = 0
    while index < len(fixed_rows) - 1:
        row = fixed_rows[index]
        if not row or display_token(row[-1]) not in LINE_END_FORBIDDEN_PUNCTUATION:
            index += 1
            continue
        fixed_rows[index] = trim_space_tokens(row[:-1])
        fixed_rows[index + 1] = trim_space_tokens([row[-1]] + fixed_rows[index + 1])
        while (
            fixed_rows[index + 1]
            and index + 2 < len(fixed_rows)
            and tokens_width(fixed_rows[index + 1]) > max_width
        ):
            fixed_rows[index + 2] = trim_space_tokens([fixed_rows[index + 1].pop()] + fixed_rows[index + 2])
        index += 1
    index = 0
    while index < len(fixed_rows) - 1:
        while fixed_rows[index] and tokens_width(fixed_rows[index]) > max_width:
            fixed_rows[index + 1] = trim_space_tokens([fixed_rows[index].pop()] + fixed_rows[index + 1])
        index += 1
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


def multiply_rgba(image: Image.Image, color: tuple[float, float, float, float]) -> Image.Image:
    icon = image.convert("RGBA")
    r, g, b, a = icon.split()
    cr, cg, cb, ca = color
    icon.putalpha(a.point(lambda v: round(v * ca)))
    return Image.merge(
        "RGBA",
        (
            r.point(lambda v: round(v * cr)),
            g.point(lambda v: round(v * cg)),
            b.point(lambda v: round(v * cb)),
            icon.getchannel("A"),
        ),
    )


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
            f"digit_directsdf_clean11_largestseed_no_underlay_{ord(digit):x}_ui{cache_key_float(font_size_ui)}"
            f"_scale{cache_key_float(render_scale)}"
            f"_xs{cache_key_float(scale_x)}"
            f"_ys{cache_key_float(scale_y)}"
            f"_fd{cache_key_float(QI_DIGIT_FACE_DILATE)}"
            f"_ow{cache_key_float(QI_DIGIT_OUTLINE_WIDTH)}"
            f"_fds{cache_key_float(QI_DIGIT_FACE_DISTANCE_SCALE)}"
            f"_ods{cache_key_float(QI_DIGIT_OUTLINE_DISTANCE_SCALE)}.png"
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
    material = dict(HUIWEN_OUTLINE_MATERIAL)
    material["face_dilate"] = QI_DIGIT_FACE_DILATE
    material["outline_width"] = QI_DIGIT_OUTLINE_WIDTH
    image = huiwen_tmp_font().render_line(
        digit,
        font_size_px,
        fill=(255, 255, 255),
        material=material,
        shader_font_size=shader_font_size,
        bold=True,
        isolate_bleed=True,
        isolate_fringe_px=2,
        tight_isolate=True,
        glyph_scale_x=scale_x,
        glyph_scale_y=scale_y,
        sdf_face_distance_scale_bold=QI_DIGIT_FACE_DISTANCE_SCALE,
        sdf_outline_distance_scale_bold=QI_DIGIT_OUTLINE_DISTANCE_SCALE,
    )
    image = keep_alpha_near_strong_component(image, seed_threshold=96, pad=5)
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


def wrap_description_text_with_layout_spacing(
    draw: ImageDraw.ImageDraw,
    description: str,
    locale_suffix: str,
    is_dream: bool,
    body_font: ImageFont.FreeTypeFont,
    wrap_width: float,
) -> tuple[float, list[tuple[list[str], bool]]]:
    layout_character_spacing = desc_layout_character_spacing(locale_suffix)
    wrapped_lines = wrap_display_text_with_gaps(
        draw,
        description,
        body_font,
        wrap_width,
        width_fn=desc_wrap_width_fn(locale_suffix, layout_character_spacing),
        token_gap_width=default_tmp_font().character_spacing_px(layout_character_spacing, body_font.size),
    )
    tuned_layout_spacing = desc_layout_character_spacing_for_group(
        locale_suffix,
        description,
        wrapped_lines,
        is_dream=is_dream,
    )
    if tuned_layout_spacing == layout_character_spacing:
        return layout_character_spacing, wrapped_lines
    wrapped_lines = wrap_display_text_with_gaps(
        draw,
        description,
        body_font,
        wrap_width,
        width_fn=desc_wrap_width_fn(locale_suffix, tuned_layout_spacing),
        token_gap_width=default_tmp_font().character_spacing_px(tuned_layout_spacing, body_font.size),
    )
    return tuned_layout_spacing, wrapped_lines


def fit_description_font_size_without_reflow(
    wrapped_lines: list[tuple[list[str], bool]],
    font_size: int,
    min_font_size: int,
    line_spacing: float,
    paragraph_spacing: float,
    top: float,
    bottom: float,
    render_scale: float,
) -> tuple[int, int, int]:
    body_size = font_size
    line_height = default_tmp_font().text_line_height(body_size, line_spacing)
    paragraph_gap = default_tmp_font().tmp_spacing_height(body_size, paragraph_spacing)
    font_step = max(1, round(render_scale))
    while (
        top + rich_lines_height(wrapped_lines, line_height, paragraph_gap)
        > desc_vertical_fit_bottom(bottom, render_scale)
        and body_size > min_font_size
    ):
        body_size -= font_step
        line_height = default_tmp_font().text_line_height(body_size, line_spacing)
        paragraph_gap = default_tmp_font().tmp_spacing_height(body_size, paragraph_spacing)
    return body_size, line_height, paragraph_gap


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
    normal_face_dilate: float | None = None,
    bold_face_dilate: float | None = None,
    sdf_distance_scale_normal: float | None = None,
    sdf_distance_scale_bold: float | None = None,
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
            sdf_distance_scale_normal=sdf_distance_scale_normal,
            sdf_distance_scale_bold=sdf_distance_scale_bold,
        )
        layout_bbox = layout_image.getbbox()
        if layout_bbox is not None:
            layout_height = layout_bbox[3] - layout_bbox[1]
            layout_raw_y_offset = round((line_height - layout_height) / 2 - layout_bbox[1])
    for row, has_gap in rows:
        if ignore_descenders_for_layout:
            image = rich_line_image(
                row,
                default_tmp_font(),
                font_size,
                character_spacing,
                shader_font_size=shader_font_size,
                trim=False,
                normal_face_dilate=normal_face_dilate,
                bold_face_dilate=bold_face_dilate,
                glyph_scale=glyph_scale,
                sdf_distance_scale_normal=sdf_distance_scale_normal,
                sdf_distance_scale_bold=sdf_distance_scale_bold,
            )
            alpha_composite_text(
                canvas,
                image,
                (
                    center_x - image.width / 2,
                    y + layout_raw_y_offset,
                ),
            )
        else:
            image = rich_line_image(
                row,
                default_tmp_font(),
                font_size,
                character_spacing,
                shader_font_size=shader_font_size,
                trim=False,
                normal_face_dilate=normal_face_dilate,
                bold_face_dilate=bold_face_dilate,
                glyph_scale=glyph_scale,
                sdf_distance_scale_normal=sdf_distance_scale_normal,
                sdf_distance_scale_bold=sdf_distance_scale_bold,
            )
            alpha_composite_text(
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
    layout_desc_rect = DESC_LAYOUT_RECT_EN if locale_suffix == "en" else DESC_LAYOUT_RECT_CJK
    if is_dream:
        layout_desc_rect = layout_desc_rect.translated(0.0, DREAM_DESC_OFFSET_Y_UI)
    left, top, right, bottom = scaled_box(layout_desc_rect, render_scale)
    wrap_width = (right - left) - round(DESC_WRAP_INSET_X * 2 * render_scale)
    desc_character_spacing = DESC_CHARACTER_SPACING_EN if locale_suffix == "en" else DESC_CHARACTER_SPACING_CJK
    line_spacing = desc_line_spacing(locale_suffix, is_dream=is_dream)
    line_height = default_tmp_font().text_line_height(body_font.size, line_spacing)
    paragraph_gap = default_tmp_font().tmp_spacing_height(body_font.size, DESC_PARAGRAPH_SPACING)
    layout_character_spacing, wrapped_lines = wrap_description_text_with_layout_spacing(
        draw,
        description,
        locale_suffix,
        is_dream,
        body_font,
        wrap_width,
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
        layout_character_spacing, wrapped_lines = wrap_description_text_with_layout_spacing(
            draw,
            description,
            locale_suffix,
            is_dream,
            body_font,
            wrap_width,
        )

    return body_font.size, ["".join(display_token(token) for token in row).strip() for row, _ in wrapped_lines]


def fitted_english_title_rows(
    title: str,
    render_scale: float = 2.0,
) -> tuple[float, list[str]]:
    """Return the English title font size and wrapped rows used by the card renderer."""
    title_draw_rect = english_title_draw_rect()
    left, top, right, bottom = scaled_box_float(title_draw_rect, render_scale)
    title_font_size, fitted_lines, _ = fit_english_title(
        title,
        scaled_ui_font_size_float(TITLE_FONT_SIZE_MAX_UI, render_scale),
        scaled_ui_font_size_float(TITLE_FONT_SIZE_MIN_UI, render_scale),
        right - left,
        bottom - top,
        TITLE_CHARACTER_SPACING_EN,
    )
    return title_font_size, fitted_lines


def fit_english_title(
    title: str,
    max_font_size: float,
    min_font_size: float,
    max_width: float,
    max_height: float,
    character_spacing: float,
) -> tuple[float, list[str], float]:
    """Approximate TMP auto-size for the English card title."""
    font_asset = default_tmp_font()
    wrap_font_size = min(max_font_size, max_font_size * TITLE_WRAP_FONT_SIZE_MAX_UI / TITLE_FONT_SIZE_MAX_UI)
    lines = wrap_plain_line_tmp(title, wrap_font_size, max_width, character_spacing)
    if len(lines) <= 2:
        base_size = max_font_size
        if len(lines) == 1:
            base_size *= TITLE_SINGLE_LINE_SCALE
        else:
            base_size = min(base_size, max(min_font_size, base_size * TITLE_TWO_LINE_MAX_SCALE))

        max_line_width = max(
            font_asset.text_width_float(line, base_size, character_spacing) * TITLE_GLYPH_SCALE_EN
            for line in lines
        )
        line_height = font_asset.text_line_height_float(base_size, TITLE_LINE_SPACING)
        width_scale = max_width / max_line_width if max_line_width > 0 else 1.0
        height_scale = max_height / (len(lines) * line_height) if line_height > 0 else 1.0
        fit_scale = min(1.0, width_scale, height_scale)
        fitted_size = max(min_font_size, base_size * fit_scale)
        return fitted_size, lines, font_asset.text_line_height_float(fitted_size, TITLE_LINE_SPACING)

    fixed_lines = None

    def fit_at(size: float) -> tuple[bool, list[str], float]:
        candidate_lines = fixed_lines or wrap_plain_line_tmp(title, size, max_width, character_spacing)
        line_height = font_asset.text_line_height_float(size, TITLE_LINE_SPACING)
        max_line_width = max(
            font_asset.text_width_float(line, size, character_spacing) * TITLE_GLYPH_SCALE_EN
            for line in candidate_lines
        )
        ok = len(candidate_lines) <= 2 and len(candidate_lines) * line_height <= max_height and max_line_width <= max_width
        return ok, candidate_lines, line_height

    ok, lines, line_height = fit_at(max_font_size)
    if ok:
        return max_font_size, lines, line_height

    low = min_font_size
    high = max_font_size
    best_size = min_font_size
    best_lines = wrap_plain_line_tmp(title, min_font_size, max_width, character_spacing)[:2]
    best_line_height = font_asset.text_line_height_float(min_font_size, TITLE_LINE_SPACING)
    for _ in range(14):
        mid = (low + high) / 2.0
        ok, candidate_lines, candidate_line_height = fit_at(mid)
        if ok:
            best_size = mid
            best_lines = candidate_lines
            best_line_height = candidate_line_height
            low = mid
        else:
            high = mid
    return best_size, best_lines, best_line_height


def english_title_draw_rect() -> PixelRect:
    rect = EN_TITLE_DRAW_RECT
    if TITLE_RECT_WIDTH_SCALE != 1.0 or TITLE_RECT_OFFSET_X_UI != 0.0:
        center_x, center_y = rect.center
        center_x += TITLE_RECT_OFFSET_X_UI
        half_width = rect.width * TITLE_RECT_WIDTH_SCALE / 2
        rect = PixelRect(center_x - half_width, rect.top, center_x + half_width, rect.bottom)
    return rect.translated(TITLE_OFFSET_X_UI, TITLE_OFFSET_Y_UI)


def fit_english_title_in_rect(
    title: str,
    rect: tuple[float, float, float, float],
    render_scale: float,
    character_spacing: float,
) -> tuple[float, list[str], float]:
    left, top, right, bottom = rect
    return fit_english_title(
        title,
        scaled_ui_font_size_float(TITLE_FONT_SIZE_MAX_UI, render_scale),
        scaled_ui_font_size_float(TITLE_FONT_SIZE_MIN_UI, render_scale),
        right - left,
        bottom - top,
        character_spacing,
    )


def draw_tmp_centered_stroked_lines(
    canvas: Image.Image,
    box: tuple[float, float, float, float],
    lines: list[str],
    font_size: float,
    fill: tuple[int, int, int],
    material: dict[str, object],
    line_height: float,
    character_spacing: float = 0.0,
    shader_font_size: float | None = None,
    glyph_scale: float = 1.0,
    sdf_distance_scale: float | None = None,
    sdf_face_distance_scale: float | None = None,
    sdf_outline_distance_scale: float | None = None,
) -> None:
    left, top, right, bottom = box
    total_height = len(lines) * line_height
    y = top + max(0.0, (bottom - top - total_height) / 2.0)
    center_x = (left + right) / 2.0
    font_asset = default_tmp_font()
    for line in lines:
        probe = text_line_image(
            line,
            font_asset,
            font_size,
            fill,
            material=material,
            character_spacing=character_spacing,
            shader_font_size=shader_font_size,
            trim=False,
            glyph_scale=glyph_scale,
            sdf_distance_scale_normal=sdf_distance_scale,
            sdf_distance_scale_bold=sdf_distance_scale,
            sdf_face_distance_scale_normal=sdf_face_distance_scale,
            sdf_face_distance_scale_bold=sdf_face_distance_scale,
            sdf_outline_distance_scale_normal=sdf_outline_distance_scale,
            sdf_outline_distance_scale_bold=sdf_outline_distance_scale,
        )
        x_float = center_x - probe.width / 2
        y_float = y + (line_height - probe.height) / 2
        x_int = math.floor(x_float)
        y_int = math.floor(y_float)
        image = text_line_image(
            line,
            font_asset,
            font_size,
            fill,
            material=material,
            character_spacing=character_spacing,
            shader_font_size=shader_font_size,
            trim=False,
            glyph_scale=glyph_scale,
            line_phase_x=x_float - x_int,
            line_phase_y=y_float - y_int,
            sdf_distance_scale_normal=sdf_distance_scale,
            sdf_distance_scale_bold=sdf_distance_scale,
            sdf_face_distance_scale_normal=sdf_face_distance_scale,
            sdf_face_distance_scale_bold=sdf_face_distance_scale,
            sdf_outline_distance_scale_normal=sdf_outline_distance_scale,
            sdf_outline_distance_scale_bold=sdf_outline_distance_scale,
        )
        canvas.alpha_composite(image, (x_int, y_int))
        y += line_height


def draw_tmp_vertical_stroked(
    canvas: Image.Image,
    box: tuple[float, float, float, float],
    text: str,
    font_size: int,
    fill: tuple[int, int, int],
    material: dict[str, object],
    line_gap: float,
    shader_font_size: int | None = None,
    x_offset: float = 0.0,
    y_offset: float = 0.0,
    glyph_scale: float = 1.0,
    sdf_distance_scale: float | None = None,
    sdf_face_distance_scale: float | None = None,
    sdf_outline_distance_scale: float | None = None,
) -> None:
    left, top, right, bottom = box
    center_x = (left + right) / 2.0 + x_offset
    slot_height = max(1.0, VERTICAL_NAME_SLOT_HEIGHT_UI * font_size / VERTICAL_NAME_FONT_SIZE_UI)
    char_entries = []
    for index, char in enumerate(text):
        probe = text_line_image(
            char,
            default_tmp_font(),
            font_size,
            fill,
            material=material,
            shader_font_size=shader_font_size,
            trim=False,
            isolate_bleed=True,
            isolate_fringe_px=2,
            glyph_scale=glyph_scale,
            sdf_distance_scale_normal=sdf_distance_scale,
            sdf_distance_scale_bold=sdf_distance_scale,
            sdf_face_distance_scale_normal=sdf_face_distance_scale,
            sdf_face_distance_scale_bold=sdf_face_distance_scale,
            sdf_outline_distance_scale_normal=sdf_outline_distance_scale,
            sdf_outline_distance_scale_bold=sdf_outline_distance_scale,
        )
        char_entries.append((char, probe))
    total_height = len(char_entries) * slot_height + max(0, len(char_entries) - 1) * line_gap
    y = top + max(0.0, (bottom - top - total_height) / 2.0) + y_offset
    if len(char_entries) >= 6:
        six_line_height = 6 * slot_height + 5 * line_gap
        six_line_y = top + max(0.0, (bottom - top - six_line_height) / 2.0) + y_offset
        y = max(y, six_line_y)
    for char, probe in char_entries:
        x_float = center_x - probe.width / 2
        y_float = y + (slot_height - probe.height) / 2
        x_int = math.floor(x_float)
        y_int = math.floor(y_float)
        image = text_line_image(
            char,
            default_tmp_font(),
            font_size,
            fill,
            material=material,
            shader_font_size=shader_font_size,
            trim=False,
            isolate_bleed=True,
            isolate_fringe_px=2,
            glyph_scale=glyph_scale,
            line_phase_x=x_float - x_int,
            line_phase_y=y_float - y_int,
            sdf_distance_scale_normal=sdf_distance_scale,
            sdf_distance_scale_bold=sdf_distance_scale,
            sdf_face_distance_scale_normal=sdf_face_distance_scale,
            sdf_face_distance_scale_bold=sdf_face_distance_scale,
            sdf_outline_distance_scale_normal=sdf_outline_distance_scale,
            sdf_outline_distance_scale_bold=sdf_outline_distance_scale,
        )
        canvas.alpha_composite(image, (x_int, y_int))
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
        TEXTURE_DIR / "Card_Default.png",
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
FUSION_LEFT_MASK_RIGHT_EXPAND_PX = 2
FUSION_LINE_TEXTURE = TEXTURE_DIR / "Img_卡牌融合.png"
FUSION_LINE_POS_UI = (-3.5, -12.899999618530273)
FUSION_LINE_SIZE_UI = (82.0, 207.0)


def fusion_line_texture() -> Image.Image:
    return Image.open(FUSION_LINE_TEXTURE).convert("RGBA")


def mixed_card_art(left_card_id: int, right_card_id: int) -> Image.Image:
    left = art_for(left_card_id)
    right = art_for(right_card_id)
    if right.size != left.size:
        right = magic_kernel_sharp_resize(right, left.size)
    width, height = left.size

    def shifted(image: Image.Image, dx: float, dy: float) -> Image.Image:
        layer = Image.new("RGBA", image.size, (0, 0, 0, 0))
        alpha_composite_subpixel(layer, image, (dx, dy))
        return layer

    # CardItem's MixedCardFace prefab does not draw an explicit polygon split.
    # It has two 120x180 mask roots rotated -20 degrees.  Each child art image
    # is counter-rotated +20 degrees, so the card art remains upright while the
    # mask rectangles produce the diagonal boundary.
    ui_width, ui_height = 125.0, 150.0
    px_per_ui_x = width / ui_width
    px_per_ui_y = height / ui_height
    root_angle = math.radians(-20.0)
    cos_a = math.cos(root_angle)
    sin_a = math.sin(root_angle)

    def rotated_child_center(root_pos: tuple[float, float], child_pos: tuple[float, float]) -> tuple[float, float]:
        x, y = child_pos
        return (
            root_pos[0] + x * cos_a - y * sin_a,
            root_pos[1] + x * sin_a + y * cos_a,
        )

    left_center = rotated_child_center((-55.0, 20.0), (30.0, -5.0))
    right_center = rotated_child_center((60.0, -15.0), (-30.0, 5.0))
    left = shifted(left, left_center[0] * px_per_ui_x, -left_center[1] * px_per_ui_y)
    right = shifted(right, right_center[0] * px_per_ui_x, -right_center[1] * px_per_ui_y)
    result = Image.new("RGBA", left.size, (0, 0, 0, 0))
    left_mask = Image.new("L", left.size, 0)
    right_mask = Image.new("L", left.size, 0)
    left_px = left_mask.load()
    right_px = right_mask.load()
    mask_half_w, mask_half_h = 60.0, 90.0

    def in_rotated_mask(ux: float, uy: float, center: tuple[float, float]) -> bool:
        dx = ux - center[0]
        dy = uy - center[1]
        local_x = dx * cos_a + dy * sin_a
        local_y = -dx * sin_a + dy * cos_a
        return abs(local_x) <= mask_half_w and abs(local_y) <= mask_half_h

    for y in range(height):
        ui_y = ui_height / 2.0 - (y + 0.5) / px_per_ui_y
        for x in range(width):
            ui_x = (x + 0.5) / px_per_ui_x - ui_width / 2.0
            if in_rotated_mask(ui_x, ui_y, (-55.0, 20.0)):
                left_px[x, y] = 255
            if in_rotated_mask(ui_x, ui_y, (60.0, -15.0)):
                right_px[x, y] = 255

    for dx in range(1, FUSION_LEFT_MASK_RIGHT_EXPAND_PX + 1):
        shifted_mask = Image.new("L", left_mask.size, 0)
        shifted_mask.paste(left_mask, (dx, 0))
        left_mask = ImageChops.lighter(left_mask, shifted_mask)

    result.alpha_composite(left)
    result.putalpha(left_mask)
    right_layer = Image.new("RGBA", left.size, (0, 0, 0, 0))
    right_layer.alpha_composite(right)
    right_layer.putalpha(right_mask)
    result.alpha_composite(right_layer)

    line = fusion_line_texture()
    line_width = FUSION_LINE_SIZE_UI[0] * px_per_ui_x
    line_height = FUSION_LINE_SIZE_UI[1] * px_per_ui_y
    line_center_x = width / 2.0 + FUSION_LINE_POS_UI[0] * px_per_ui_x
    line_center_y = height / 2.0 - FUSION_LINE_POS_UI[1] * px_per_ui_y
    line_layer = magic_kernel_sharp_resample_translate(
        line,
        result.size,
        line_width / line.width,
        line_height / line.height,
        line_center_x - line_width / 2.0,
        line_center_y - line_height / 2.0,
    )
    result.alpha_composite(line_layer)
    return result


def art_for_config(card: dict[str, object], ref_id: str | None = None) -> Image.Image:
    card_id = int(card["id"])
    rarity = int(card["rarity"])
    base_id = card_base_id(card_id)
    override = int(card["overrideSpriteId"])
    new_card_fusion_inputs = card.get("_new_card_fusion_ingredients")
    if new_card_fusion_inputs is not None:
        left_card_id, right_card_id = new_card_fusion_inputs
        return mixed_card_art(int(left_card_id), int(right_card_id))
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


def new_card_art_override_id(card_id: int) -> int:
    candidates = [
        card_id,
        card_base_id(card_id),
        card_id % 1_000_000,
        card_id % 10_000,
        card_id % 1_000,
        card_id % 100,
    ]
    for candidate in candidates:
        if candidate and (TEXTURE_DIR / f"Card_{candidate}.png").exists():
            return candidate
    return 0


def new_card_art_source_id(row: dict[str, object]) -> int:
    explicit_source = row.get("art_source_id")
    if explicit_source is not None:
        return int(explicit_source)
    return 0


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
    composite_card_art(canvas, art, render_scale)
    canvas.alpha_composite(frame)

    sx0, sy0, sx1, sy1 = scaled_box(SECT_EMBLEM_RECT, render_scale)
    emblem = magic_kernel_sharp_resize(sect_emblem(), (sx1 - sx0, sy1 - sy0))
    canvas.alpha_composite(tint_alpha(emblem, 150), (sx0, sy0))

    draw = ImageDraw.Draw(canvas)

    title_left, title_top, title_right, title_bottom = scaled_box(english_title_draw_rect(), render_scale)
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
    vertical_material = dict(DEFAULT_OUTLINE_MATERIAL)
    vertical_material["face_dilate"] = VERTICAL_NAME_FACE_DILATE
    vertical_material["outline_width"] = VERTICAL_NAME_OUTLINE_WIDTH

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
        material=vertical_material,
        line_gap=scaled_signed_float(VERTICAL_NAME_LINE_GAP_UI, render_scale),
        shader_font_size=vertical_shader_size,
        x_offset=scaled_signed_float(VERTICAL_NAME_OFFSET_X_UI, render_scale),
        y_offset=scaled_signed_float(VERTICAL_NAME_OFFSET_Y_UI, render_scale),
        glyph_scale=VERTICAL_NAME_GLYPH_SCALE,
        sdf_distance_scale=VERTICAL_NAME_DISTANCE_SCALE,
        sdf_face_distance_scale=VERTICAL_NAME_FACE_DISTANCE_SCALE,
        sdf_outline_distance_scale=VERTICAL_NAME_OUTLINE_DISTANCE_SCALE,
    )

    if locale.suffix == "en":
        bg_left, bg_top, bg_right, bg_bottom = scaled_box(EN_TITLE_BG_DRAW_RECT, render_scale)
        bg = magic_kernel_sharp_resize(en_title_bg(), (bg_right - bg_left, bg_bottom - bg_top))
        canvas.alpha_composite(bg, (bg_left, bg_top))
        draw = ImageDraw.Draw(canvas)
        title_character_spacing = -2.0
        title_lines = wrap_plain_line_tmp(locale.title, title_font.size, title_right - title_left, title_character_spacing)
        fitted_title_lines = title_lines
        min_title_size = scaled_ui_font_size(TITLE_FONT_SIZE_MIN_UI, render_scale)
        title_line_height = default_tmp_font().text_line_height(title_font.size, TITLE_LINE_SPACING)
        while (
            (len(fitted_title_lines) > 2 or len(fitted_title_lines) * title_line_height > title_bottom - title_top)
            and title_font.size > min_title_size
        ):
            title_font = font(title_font.size - 1)
            title_shader_size = max(1, round(title_font.size / render_scale))
            fitted_title_lines = wrap_plain_line_tmp(
                locale.title,
                title_font.size,
                title_right - title_left,
                title_character_spacing,
            )
            title_line_height = default_tmp_font().text_line_height(title_font.size, TITLE_LINE_SPACING)
        draw_tmp_centered_stroked_lines(
            canvas,
            scaled_box(english_title_draw_rect(), render_scale),
            fitted_title_lines,
            title_font.size,
            fill=title_fill,
            material=DEFAULT_OUTLINE_MATERIAL,
            line_height=title_line_height,
            character_spacing=title_character_spacing,
            shader_font_size=title_shader_size,
            glyph_scale=TITLE_GLYPH_SCALE_EN,
            sdf_distance_scale=TITLE_DISTANCE_SCALE,
            sdf_face_distance_scale=TITLE_FACE_DISTANCE_SCALE,
            sdf_outline_distance_scale=TITLE_OUTLINE_DISTANCE_SCALE,
        )

    description = locale.description.replace("{def}", f"[color:#9A6212|{level.defense}]")
    desc_rect = DESC_TEXT_DRAW_RECT_EN if locale.suffix == "en" else DESC_TEXT_DRAW_RECT_CJK
    desc_box = scaled_box_float(desc_rect, render_scale)
    left, top, right, bottom = desc_box
    wrap_width = (right - left) - round(DESC_WRAP_INSET_X * 2 * render_scale)
    desc_character_spacing = DESC_CHARACTER_SPACING_EN if locale.suffix == "en" else DESC_CHARACTER_SPACING_CJK
    line_spacing = desc_line_spacing(locale.suffix)
    normal_face_dilate, bold_face_dilate = desc_face_dilates(locale.suffix)
    normal_distance_scale, bold_distance_scale = desc_sdf_distance_scales(locale.suffix)
    line_height = default_tmp_font().text_line_height(body_font.size, line_spacing)
    paragraph_gap = default_tmp_font().tmp_spacing_height(body_font.size, DESC_PARAGRAPH_SPACING)
    layout_character_spacing, wrapped_lines = wrap_description_text_with_layout_spacing(
        draw,
        description,
        locale.suffix,
        False,
        body_font,
        wrap_width,
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
        layout_character_spacing, wrapped_lines = wrap_description_text_with_layout_spacing(
            draw,
            description,
            locale.suffix,
            False,
            body_font,
            wrap_width,
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
        normal_face_dilate=normal_face_dilate,
        bold_face_dilate=bold_face_dilate,
        sdf_distance_scale_normal=normal_distance_scale,
        sdf_distance_scale_bold=bold_distance_scale,
        ignore_descenders_for_layout=True,
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
    composite_card_art(canvas, art, render_scale)
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
    vertical_material = dict(DEFAULT_OUTLINE_MATERIAL)
    vertical_material["face_dilate"] = VERTICAL_NAME_FACE_DILATE
    vertical_material["outline_width"] = VERTICAL_NAME_OUTLINE_WIDTH

    draw_tmp_vertical_stroked(
        canvas,
        scaled_box(VERTICAL_NAME_RECT, render_scale),
        locale.chinese_title,
        vertical_font.size,
        fill=title_fill,
        material=vertical_material,
        line_gap=scaled_signed_float(VERTICAL_NAME_LINE_GAP_UI, render_scale),
        shader_font_size=vertical_shader_size,
        x_offset=scaled_signed_float(VERTICAL_NAME_OFFSET_X_UI, render_scale),
        y_offset=scaled_signed_float(DREAM_VERTICAL_NAME_OFFSET_Y_UI, render_scale),
        glyph_scale=VERTICAL_NAME_GLYPH_SCALE,
        sdf_distance_scale=VERTICAL_NAME_DISTANCE_SCALE,
        sdf_face_distance_scale=VERTICAL_NAME_FACE_DISTANCE_SCALE,
        sdf_outline_distance_scale=VERTICAL_NAME_OUTLINE_DISTANCE_SCALE,
    )

    if locale.suffix == "en":
        title_left, title_top, title_right, title_bottom = scaled_box(english_title_draw_rect(), render_scale)
        bg_left, bg_top, bg_right, bg_bottom = scaled_box(EN_TITLE_BG_DRAW_RECT, render_scale)
        bg = magic_kernel_sharp_resize(en_title_bg(), (bg_right - bg_left, bg_bottom - bg_top))
        canvas.alpha_composite(bg, (bg_left, bg_top))
        title_character_spacing = -2.0
        title_lines = wrap_plain_line_tmp(locale.title, title_font.size, title_right - title_left, title_character_spacing)
        fitted_title_lines = title_lines
        min_title_size = scaled_ui_font_size(TITLE_FONT_SIZE_MIN_UI, render_scale)
        title_line_height = default_tmp_font().text_line_height(title_font.size, TITLE_LINE_SPACING)
        while (
            (len(fitted_title_lines) > 2 or len(fitted_title_lines) * title_line_height > title_bottom - title_top)
            and title_font.size > min_title_size
        ):
            title_font = font(title_font.size - 1)
            fitted_title_lines = wrap_plain_line_tmp(
                locale.title,
                title_font.size,
                title_right - title_left,
                title_character_spacing,
            )
            title_line_height = default_tmp_font().text_line_height(title_font.size, TITLE_LINE_SPACING)
        draw_tmp_centered_stroked_lines(
            canvas,
            scaled_box(english_title_draw_rect(), render_scale),
            fitted_title_lines,
            title_font.size,
            fill=title_fill,
            material=DEFAULT_OUTLINE_MATERIAL,
            line_height=title_line_height,
            character_spacing=title_character_spacing,
            glyph_scale=TITLE_GLYPH_SCALE_EN,
            sdf_distance_scale=TITLE_DISTANCE_SCALE,
            sdf_face_distance_scale=TITLE_FACE_DISTANCE_SCALE,
            sdf_outline_distance_scale=TITLE_OUTLINE_DISTANCE_SCALE,
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
    normal_face_dilate, bold_face_dilate = desc_face_dilates(locale.suffix)
    normal_distance_scale, bold_distance_scale = desc_sdf_distance_scales(locale.suffix)
    line_height = default_tmp_font().text_line_height(body_font.size, line_spacing)
    paragraph_gap = default_tmp_font().tmp_spacing_height(body_font.size, DESC_PARAGRAPH_SPACING)
    layout_character_spacing, wrapped_lines = wrap_description_text_with_layout_spacing(
        draw,
        description,
        locale.suffix,
        True,
        body_font,
        wrap_width,
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
        layout_character_spacing, wrapped_lines = wrap_description_text_with_layout_spacing(
            draw,
            description,
            locale.suffix,
            True,
            body_font,
            wrap_width,
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
        normal_face_dilate=normal_face_dilate,
        bold_face_dilate=bold_face_dilate,
        sdf_distance_scale_normal=normal_distance_scale,
        sdf_distance_scale_bold=bold_distance_scale,
        ignore_descenders_for_layout=True,
    )
    return canvas


def draw_config_description(
    canvas: Image.Image,
    card: dict[str, object],
    locale_suffix: str,
    render_scale: float,
    is_dream: bool,
    offset: tuple[float, float] = (0.0, 0.0),
    layout_render_scale: float | None = None,
    description_override: str | None = None,
    description_single_row: bool = False,
) -> None:
    layout_scale = layout_render_scale if layout_render_scale is not None else render_scale
    final_from_layout = render_scale / layout_scale
    draw = ImageDraw.Draw(canvas)
    body_font = font(
        scaled_description_font_size(
            DESC_FONT_SIZE_MAX_EN_UI if locale_suffix == "en" else DESC_FONT_SIZE_MAX_UI,
            layout_scale,
        )
    )
    description = description_override if description_override is not None else render_description_text(int(card["id"]), locale_suffix)
    desc_rect = DESC_TEXT_DRAW_RECT_EN if locale_suffix == "en" else DESC_TEXT_DRAW_RECT_CJK
    if is_dream:
        desc_rect = desc_rect.translated(0.0, DREAM_DESC_OFFSET_Y_UI)
    layout_desc_rect = DESC_LAYOUT_RECT_EN if locale_suffix == "en" else DESC_LAYOUT_RECT_CJK
    if is_dream:
        layout_desc_rect = layout_desc_rect.translated(0.0, DREAM_DESC_OFFSET_Y_UI)
    layout_box = scaled_box_float(layout_desc_rect, layout_scale)
    left, top, right, bottom = layout_box
    wrap_width = (right - left) - round(DESC_WRAP_INSET_X * 2 * layout_scale)
    desc_character_spacing = DESC_CHARACTER_SPACING_EN if locale_suffix == "en" else DESC_CHARACTER_SPACING_CJK
    line_spacing = desc_line_spacing(locale_suffix, is_dream=is_dream)
    desc_glyph_scale = DESC_GLYPH_SCALE_EN if locale_suffix == "en" else DESC_GLYPH_SCALE_CJK
    normal_face_dilate, bold_face_dilate = desc_face_dilates(locale_suffix)
    normal_distance_scale, bold_distance_scale = desc_sdf_distance_scales(locale_suffix)
    line_height = default_tmp_font().text_line_height(body_font.size, line_spacing)
    paragraph_gap = default_tmp_font().tmp_spacing_height(body_font.size, DESC_PARAGRAPH_SPACING)
    if description_single_row:
        layout_character_spacing = desc_layout_character_spacing(locale_suffix)
        wrapped_lines = [(text_to_tokens(description), False)]
    else:
        layout_character_spacing, wrapped_lines = wrap_description_text_with_layout_spacing(
            draw,
            description,
            locale_suffix,
            is_dream,
            body_font,
            wrap_width,
        )

    min_body_size = scaled_description_font_size(DESC_FONT_SIZE_MIN_UI, layout_scale)
    font_step = max(1, round(layout_scale))
    while (
        (
            top + rich_lines_height(wrapped_lines, line_height, paragraph_gap)
            > desc_vertical_fit_bottom(bottom, layout_scale)
            or rich_lines_rendered_max_width(wrapped_lines, body_font.size, desc_character_spacing) > wrap_width
            or rich_lines_have_crowded_orphan_stat_line(wrapped_lines, locale_suffix)
        )
        and body_font.size > min_body_size
    ):
        body_font = font(body_font.size - font_step)
        line_height = default_tmp_font().text_line_height(body_font.size, line_spacing)
        paragraph_gap = default_tmp_font().tmp_spacing_height(body_font.size, DESC_PARAGRAPH_SPACING)
        if description_single_row:
            layout_character_spacing = desc_layout_character_spacing(locale_suffix)
            wrapped_lines = [(text_to_tokens(description), False)]
        else:
            layout_character_spacing, wrapped_lines = wrap_description_text_with_layout_spacing(
                draw,
                description,
                locale_suffix,
                is_dream,
                body_font,
                wrap_width,
            )

    final_desc_box = scaled_box_float(desc_rect, render_scale)
    final_desc_box = (
        final_desc_box[0] + offset[0],
        final_desc_box[1] + offset[1],
        final_desc_box[2] + offset[0],
        final_desc_box[3] + offset[1],
    )
    final_font_size = max(1, round(body_font.size * final_from_layout))
    final_line_height = max(1.0, line_height * final_from_layout)
    final_paragraph_gap = paragraph_gap * final_from_layout
    final_shader_size = max(1, round(final_font_size / render_scale))
    block_scale = DESC_BLOCK_SCALE_EN if locale_suffix == "en" else DESC_BLOCK_SCALE_CJK
    text_canvas = canvas if abs(block_scale - 1.0) < 1e-6 else Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    draw_tmp_centered_rich_lines_with_gaps(
        text_canvas,
        final_desc_box,
        wrapped_lines,
        final_font_size,
        final_line_height,
        final_paragraph_gap,
        character_spacing=desc_character_spacing,
        shader_font_size=final_shader_size,
        glyph_scale=desc_glyph_scale,
        normal_face_dilate=normal_face_dilate,
        bold_face_dilate=bold_face_dilate,
        sdf_distance_scale_normal=normal_distance_scale,
        sdf_distance_scale_bold=bold_distance_scale,
        ignore_descenders_for_layout=True,
    )
    if text_canvas is not canvas:
        center_x = (final_desc_box[0] + final_desc_box[2]) / 2.0
        center_y = (final_desc_box[1] + final_desc_box[3]) / 2.0
        scaled_text = magic_kernel_sharp_resample_translate(
            text_canvas,
            canvas.size,
            block_scale,
            block_scale,
            center_x * (1.0 - block_scale),
            center_y * (1.0 - block_scale),
        )
        canvas.alpha_composite(scaled_text)


def config_card_titles(ref_id: str, card: dict[str, object], locale_suffix: str) -> tuple[str, str]:
    new_card_name = card.get("_new_card_name_cn")
    if new_card_name is not None:
        return str(new_card_name), str(new_card_name)
    if ref_id == "906001":
        return (
            localized_term("Relic4OptionTitle_6", locale_suffix, "赤贯星"),
            localized_term("Relic4OptionTitle_6", "zh", "赤贯星"),
        )
    stale_reference_titles = {
        "906011": {"en": "Nüwa Stone", "zh": "女娲石", "tw": "女媧石"},
        "906021": {"en": "Haotian Pagoda", "zh": "昊天塔", "tw": "昊天塔"},
        "906051": {"en": "Donghuang Zhong", "zh": "东皇钟", "tw": "東皇鐘"},
        "916011": {"en": "Xuan-Yuan Sword", "zh": "轩辕剑", "tw": "軒轅劍"},
    }
    if ref_id in stale_reference_titles:
        titles = stale_reference_titles[ref_id]
        return titles.get(locale_suffix, titles["en"]), titles["zh"]
    return card_name(int(card["id"]), locale_suffix), card_name(int(card["id"]), "zh")


def draw_config_titles(
    canvas: Image.Image,
    ref_id: str,
    card: dict[str, object],
    locale_suffix: str,
    render_scale: float,
    is_dream: bool,
    offset: tuple[float, float] = (0.0, 0.0),
    layout_render_scale: float | None = None,
    vertical_name_override: str | None = None,
) -> None:
    layout_scale = layout_render_scale if layout_render_scale is not None else render_scale
    final_from_layout = render_scale / layout_scale
    display_title, vertical_title = config_card_titles(ref_id, card, locale_suffix)
    if vertical_name_override is not None:
        vertical_title = vertical_name_override
    vertical_font = font(scaled_ui_font_size(VERTICAL_NAME_FONT_SIZE_UI, layout_scale))
    title_fill = rgb_from_unit(
        multiply_unit_rgb(TITLE_FONT_COLOR, DEFAULT_OUTLINE_MATERIAL["face_color"])
    )
    vertical_material = dict(DEFAULT_OUTLINE_MATERIAL)
    vertical_material["face_dilate"] = VERTICAL_NAME_FACE_DILATE
    vertical_material["outline_width"] = VERTICAL_NAME_OUTLINE_WIDTH

    vertical_offset = DREAM_VERTICAL_NAME_OFFSET_Y_UI if is_dream else VERTICAL_NAME_OFFSET_Y_UI
    vbox = scaled_box_float(VERTICAL_NAME_RECT, render_scale)
    final_vertical_size = max(1, round(vertical_font.size * final_from_layout))
    final_vertical_shader_size = max(1, round(final_vertical_size / render_scale))
    draw_tmp_vertical_stroked(
        canvas,
        (vbox[0] + offset[0], vbox[1] + offset[1], vbox[2] + offset[0], vbox[3] + offset[1]),
        vertical_title,
        final_vertical_size,
        fill=title_fill,
        material=vertical_material,
        line_gap=scaled_signed_float(VERTICAL_NAME_LINE_GAP_UI, render_scale),
        shader_font_size=final_vertical_shader_size,
        x_offset=scaled_signed_float(VERTICAL_NAME_OFFSET_X_UI, render_scale),
        y_offset=scaled_signed_float(vertical_offset, render_scale),
        glyph_scale=VERTICAL_NAME_GLYPH_SCALE,
        sdf_distance_scale=VERTICAL_NAME_DISTANCE_SCALE,
        sdf_face_distance_scale=VERTICAL_NAME_FACE_DISTANCE_SCALE,
        sdf_outline_distance_scale=VERTICAL_NAME_OUTLINE_DISTANCE_SCALE,
    )

    if locale_suffix != "en":
        return

    title_draw_rect = english_title_draw_rect()
    title_material = dict(DEFAULT_OUTLINE_MATERIAL)
    title_material["face_dilate"] = TITLE_FACE_DILATE
    title_material["outline_width"] = TITLE_OUTLINE_WIDTH
    layout_title_left, layout_title_top, layout_title_right, layout_title_bottom = scaled_box_float(title_draw_rect, layout_scale)
    title_character_spacing = TITLE_CHARACTER_SPACING_EN
    title_font_size, fitted_title_lines, title_line_height = fit_english_title_in_rect(
        display_title,
        (layout_title_left, layout_title_top, layout_title_right, layout_title_bottom),
        layout_scale,
        title_character_spacing,
    )

    title_left, title_top, title_right, title_bottom = scaled_box_float(title_draw_rect, render_scale)
    if len(fitted_title_lines) == 1:
        title_single_line_offset_y = scaled_signed_float(TITLE_SINGLE_LINE_OFFSET_Y_UI, render_scale)
        title_top += title_single_line_offset_y
        title_bottom += title_single_line_offset_y
    final_title_size = max(1.0, title_font_size * final_from_layout)
    final_title_line_height = max(1.0, title_line_height * final_from_layout)
    final_title_shader_size = max(1.0, final_title_size / render_scale)
    draw_tmp_centered_stroked_lines(
        canvas,
        (
            title_left + offset[0],
            title_top + offset[1],
            title_right + offset[0],
            title_bottom + offset[1],
        ),
        fitted_title_lines,
        final_title_size,
        fill=title_fill,
        material=title_material,
        line_height=final_title_line_height,
        character_spacing=title_character_spacing,
        shader_font_size=final_title_shader_size,
        glyph_scale=TITLE_GLYPH_SCALE_EN,
        sdf_distance_scale=TITLE_DISTANCE_SCALE,
        sdf_face_distance_scale=TITLE_FACE_DISTANCE_SCALE,
        sdf_outline_distance_scale=TITLE_OUTLINE_DISTANCE_SCALE,
    )


def draw_config_text(
    canvas: Image.Image,
    ref_id: str,
    card: dict[str, object],
    locale_suffix: str,
    render_scale: float,
    is_dream: bool,
    offset: tuple[float, float] = (0.0, 0.0),
    layout_render_scale: float | None = None,
) -> None:
    draw_config_cost_digits(canvas, card, render_scale, offset=offset)
    draw_config_titles(
        canvas,
        ref_id,
        card,
        locale_suffix,
        render_scale,
        is_dream,
        offset=offset,
        layout_render_scale=layout_render_scale,
    )
    draw_config_description(
        canvas,
        card,
        locale_suffix,
        render_scale,
        is_dream,
        offset=offset,
        layout_render_scale=layout_render_scale,
    )


def config_cost_info(card: dict[str, object]) -> tuple[int, bool] | None:
    if int(card["hpCost"]) > 0:
        return int(card["hpCost"]), True
    if int(card["anima"]) < 0:
        return abs(int(card["anima"])), False
    return None


def draw_config_cost_digits(
    canvas: Image.Image,
    card: dict[str, object],
    render_scale: float,
    offset: tuple[float, float] = (0.0, 0.0),
) -> None:
    cost = config_cost_info(card)
    if cost is None:
        return
    cost_value, cost_is_hp = cost
    digit_font_size = ANIMA_FONT_SIZE_UI if cost_is_hp else QI_DIGIT_FONT_SIZE_UI
    digit_scale_x = HP_DIGIT_SCALE_X if cost_is_hp else QI_DIGIT_SCALE_X
    digit_scale_y = HP_DIGIT_SCALE_Y if cost_is_hp else QI_DIGIT_SCALE_Y
    digit_offset_x = HP_DIGIT_OFFSET_X if cost_is_hp else QI_DIGIT_OFFSET_X
    digit_offset_y = HP_DIGIT_OFFSET_Y if cost_is_hp else QI_DIGIT_OFFSET_Y
    digit = huiwen_number_image(str(cost_value), digit_font_size, render_scale, digit_scale_x, digit_scale_y)
    label_center = (QI_LABEL_RECT.center[0] * render_scale, QI_LABEL_RECT.center[1] * render_scale)
    digit_x = label_center[0] - digit.width / 2 + scaled_signed_float(digit_offset_x, render_scale) + offset[0]
    digit_y = label_center[1] - digit.height / 2 + scaled_signed_float(digit_offset_y, render_scale) + offset[1]
    alpha_composite_subpixel(canvas, digit, (digit_x, digit_y))


def draw_config_cost_icon(
    canvas: Image.Image,
    cost_is_hp: bool,
    render_scale: float,
    offset: tuple[float, float] = (0.0, 0.0),
) -> None:
    cost_icon = hp_icon() if cost_is_hp else qi_icon()
    icon_rect = HP_ICON_DRAW_RECT if cost_is_hp else QI_ICON_DRAW_RECT
    x0, y0, x1, y1 = scaled_box_float(icon_rect, render_scale)
    x0 += offset[0]
    x1 += offset[0]
    y0 += offset[1]
    y1 += offset[1]
    if cost_is_hp:
        cost_icon = multiply_rgba(cost_icon, HP_ICON_TINT)
        icon_left, icon_top, icon_right, icon_bottom = round(x0), round(y0), round(x1), round(y1)
        icon = magic_kernel_sharp_resize(cost_icon, (icon_right - icon_left, icon_bottom - icon_top))
        canvas.alpha_composite(icon, (icon_left, icon_top))
        return

    center_x = (x0 + x1) / 2.0 + scaled_signed_float(QI_ICON_OFFSET_X_UI, render_scale)
    center_y = (y0 + y1) / 2.0 + scaled_signed_float(QI_ICON_OFFSET_Y_UI, render_scale)
    scale_x = ((x1 - x0) * QI_ICON_SCALE) / cost_icon.width
    scale_y = ((y1 - y0) * QI_ICON_SCALE) / cost_icon.height
    dx = center_x - cost_icon.width * scale_x / 2.0
    dy = center_y - cost_icon.height * scale_y / 2.0
    layer = magic_kernel_sharp_resample_translate(cost_icon, canvas.size, scale_x, scale_y, dx, dy)
    canvas.alpha_composite(layer)


def render_config_card(
    ref_id: str,
    card: dict[str, object],
    locale_suffix: str,
    render_scale: float = 1.0,
    skip_description: bool = False,
    skip_text: bool = False,
    description_override: str | None = None,
    description_single_row: bool = False,
    vertical_name_override: str | None = None,
) -> Image.Image:
    level_name = LEVEL_NAMES[int(card["level"])]
    is_dream = int(card["subcategory"]) == 14
    if is_dream:
        frame_name = f"DreamCardUI_{level_name}.png"
    else:
        frame_name = f"CardUI_{level_name}_{int(card['rarity'])}.png"
    frame = Image.open(TEXTURE_DIR / frame_name).convert("RGBA")
    art = art_for_config(card, ref_id)

    cost = config_cost_info(card)
    bleed_x = math.ceil(CARD_OUTPUT_BLEED_X_UI * render_scale)

    output_size = scaled_size(CARD_SIZE, render_scale)
    frame = magic_kernel_sharp_resize(frame, output_size)
    base = Image.new("RGBA", output_size, (0, 0, 0, 0))
    composite_card_art(base, art, render_scale)
    base.alpha_composite(frame)

    if not is_dream:
        emblem = bottom_emblem_for(card)
        if emblem is not None:
            sx0, sy0, sx1, sy1 = scaled_box(SECT_EMBLEM_RECT, render_scale)
            emblem = magic_kernel_sharp_resize(emblem, (sx1 - sx0, sy1 - sy0))
            base.alpha_composite(tint_alpha(emblem, 150), (sx0, sy0))

    if locale_suffix == "en":
        bg_left, bg_top, bg_right, bg_bottom = scaled_box(EN_TITLE_BG_DRAW_RECT, render_scale)
        bg = magic_kernel_sharp_resize(en_title_bg(), (bg_right - bg_left, bg_bottom - bg_top))
        base.alpha_composite(bg, (bg_left, bg_top))

    if bleed_x:
        canvas = Image.new("RGBA", (output_size[0] + bleed_x * 2, output_size[1]), (0, 0, 0, 0))
        canvas.alpha_composite(base, (bleed_x, 0))
        draw_offset = (float(bleed_x), 0.0)
    else:
        canvas = base
        draw_offset = (0.0, 0.0)

    if cost is not None:
        cost_value, cost_is_hp = cost
        draw_config_cost_icon(canvas, cost_is_hp, render_scale, offset=draw_offset)
        if not skip_text:
            draw_config_cost_digits(canvas, card, render_scale, offset=draw_offset)

    if not skip_text:
        draw_config_titles(
            canvas,
            ref_id,
            card,
            locale_suffix,
            render_scale,
            is_dream,
            offset=draw_offset,
            vertical_name_override=vertical_name_override,
        )
    if not skip_description and not skip_text:
        draw_config_description(
            canvas,
            card,
            locale_suffix,
            render_scale,
            is_dream,
            offset=draw_offset,
            description_override=description_override,
            description_single_row=description_single_row,
        )
    return canvas


NEW_CARD_VALUE_COLORS = {
    "attack": "#9D1022",
    "randomAttack": "#9D1022",
    "def": "#9A6212",
    "randomDef": "#9A6212",
    "anima": "#2C81BF",
    "jianYi": "#CF3521",
}


def render_new_card_template_value(key: str, value: object) -> str:
    placeholder = key[1:-1] if key.startswith("{") and key.endswith("}") else key
    rendered = str(value)
    color = NEW_CARD_VALUE_COLORS.get(placeholder)
    if color is None:
        return rendered
    return f"[color:{color}|{rendered}]"


def render_new_card_description(level_row: dict[str, object]) -> str:
    text = str(level_row["desc_cn_template"]).replace("\\n", "\n")
    values = level_row.get("template_values", {})
    if not isinstance(values, dict):
        raise TypeError("template_values must be an object for new-card level row")
    for key, value in sorted(values.items(), key=lambda item: len(str(item[0])), reverse=True):
        text = text.replace(str(key), render_new_card_template_value(str(key), value))
    return text


def new_card_level_id(base_card_id: int, level_row: dict[str, object]) -> int:
    rarity = int(level_row.get("level", 1)) - 1
    return base_card_id + rarity * 10000


def new_card_to_config(row: dict[str, object], level_row: dict[str, object]) -> dict[str, object]:
    base_card_id = int(row["id"])
    card_id = new_card_level_id(base_card_id, level_row)
    existing = card_by_id().get(card_id) or card_by_id().get(base_card_id)
    if existing is not None:
        card = dict(existing)
    else:
        card = {
            "id": card_id,
            "name": row["name_cn"],
            "desc": level_row["desc_cn_template"],
            "sect": 0,
            "career": 0,
            "level": int(row["phase"]),
            "anima": 0,
            "attack": 0,
            "attackCount": 0,
            "def": 0,
            "damage": 0,
            "actionAgain": False,
            "cardType": 0,
            "rarity": 0,
            "hpCost": 0,
            "physique": 0,
            "linkageId": 0,
            "chargeQi": 0,
            "overrideSpriteId": 0,
            "subcategory": 0,
            "owner": 0,
            "hidden": True,
            "otherParams": [],
            "seasonMechanics": [],
            "obsolete": False,
        }
    card["id"] = card_id
    card["name"] = str(row["name_cn"])
    card["desc"] = str(level_row["desc_cn_template"]).replace("\\n", "\n")
    card["level"] = int(row["phase"])
    card["rarity"] = int(level_row.get("level", 1)) - 1
    card["hpCost"] = int(level_row.get("hp_cost", 0) or 0)
    card["anima"] = -int(level_row.get("qi_cost", 0) or 0)
    fusion_ingredients = row.get("fusion_ingredients")
    if fusion_ingredients is not None:
        if (
            not isinstance(fusion_ingredients, list)
            or len(fusion_ingredients) != 2
        ):
            raise TypeError(f"fusion_ingredients must be a 2-item array for new card {base_card_id}")
        card["_new_card_fusion_ingredients"] = [int(fusion_ingredients[0]), int(fusion_ingredients[1])]
        card["overrideSpriteId"] = 0
    else:
        art_override = new_card_art_source_id(row)
        if art_override:
            card["overrideSpriteId"] = art_override
        else:
            card["overrideSpriteId"] = int(card.get("overrideSpriteId", 0) or 0)
    card["_new_card_name_cn"] = str(row["name_cn"])
    return card


def output_path_for_new_card(
    row: dict[str, object],
    level_row: dict[str, object],
    locale_suffix: str,
    output_subdir: str,
) -> Path:
    base_card_id = int(row["id"])
    level = int(level_row.get("level", 1))
    return OUTPUT_DIR / "custom" / output_subdir / f"{base_card_id}_{locale_suffix}_{level}.png"


def render_new_card_rows(
    rows: Iterable[dict[str, object]],
    locale_suffix: str,
    output_subdir: str,
    render_scale: float = 1.0,
    selected_level: int | None = 1,
) -> list[Path]:
    outputs: list[Path] = []
    for row in rows:
        levels = row.get("levels", [])
        if not isinstance(levels, list):
            raise TypeError(f"levels must be an array for new card {row.get('id')}")
        for level_row in levels:
            if not isinstance(level_row, dict):
                raise TypeError(f"level row must be an object for new card {row.get('id')}")
            if selected_level is not None and int(level_row.get("level", 0)) != selected_level:
                continue
            card = new_card_to_config(row, level_row)
            description = render_new_card_description(level_row)
            image = render_config_card(
                str(row["id"]),
                card,
                locale_suffix,
                render_scale=render_scale,
                description_override=description,
            )
            output = output_path_for_new_card(row, level_row, locale_suffix, output_subdir)
            output.parent.mkdir(parents=True, exist_ok=True)
            save_png(image, output)
            outputs.append(output)
    return outputs


def render_card_for_label(
    label: str,
    render_scale: float = 1.0,
    skip_description: bool = False,
    description_override: str | None = None,
    description_single_row: bool = False,
    vertical_name_override: str | None = None,
) -> Image.Image:
    ref_id, locale_suffix = label.split("_", 1)
    if ref_id.startswith("l"):
        level_num = int(ref_id.removeprefix("l"))
        level = next(card_level for card_level in CARD_LEVELS if card_level.level == level_num)
        return render_config_card(
            ref_id,
            card_by_id()[level.card_id],
            locale_suffix,
            render_scale,
            skip_description=skip_description,
            skip_text=skip_description,
            description_override=description_override,
            description_single_row=description_single_row,
            vertical_name_override=vertical_name_override,
        )
    resolved = resolve_reference(ref_id)
    if resolved.card_id is not None and not ref_id.startswith("l"):
        return render_config_card(
            ref_id,
            card_by_id()[resolved.card_id],
            locale_suffix,
            render_scale,
            skip_description=skip_description,
            skip_text=skip_description,
            description_override=description_override,
            description_single_row=description_single_row,
            vertical_name_override=vertical_name_override,
        )
    level_num = NORMAL_REF_TO_LEVEL[ref_id]
    level = next(card_level for card_level in CARD_LEVELS if card_level.level == level_num)
    locale = next(locale_text for locale_text in LOCALES if locale_text.suffix == locale_suffix)
    return render_card(level, locale, render_scale=render_scale)


def draw_config_text_for_label(
    canvas: Image.Image,
    label: str,
    render_scale: float,
    offset: tuple[float, float] = (0.0, 0.0),
    layout_render_scale: float | None = None,
) -> bool:
    bleed_offset = (offset[0] + CARD_OUTPUT_BLEED_X_UI * render_scale, offset[1])
    ref_id, locale_suffix = label.split("_", 1)
    if ref_id.startswith("l"):
        level_num = int(ref_id.removeprefix("l"))
        level = next(card_level for card_level in CARD_LEVELS if card_level.level == level_num)
        card = card_by_id()[level.card_id]
        draw_config_text(
            canvas,
            ref_id,
            card,
            locale_suffix,
            render_scale,
            is_dream=False,
            offset=bleed_offset,
            layout_render_scale=layout_render_scale,
        )
        return True
    resolved = resolve_reference(ref_id)
    if resolved.card_id is None:
        return False
    card = card_by_id()[resolved.card_id]
    draw_config_text(
        canvas,
        ref_id,
        card,
        locale_suffix,
        render_scale,
        is_dream=int(card["subcategory"]) == 14,
        offset=bleed_offset,
        layout_render_scale=layout_render_scale,
    )
    return True


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
    parser.add_argument(
        "--new-cards-json",
        type=Path,
        help="render custom card rows from scrape/new_cards_data.json-style input",
    )
    parser.add_argument("--new-cards-locale", default="zh", choices=["zh", "en", "tw"])
    parser.add_argument("--new-cards-output-subdir", default="hidden_pool_expansion_cards_zh")
    parser.add_argument(
        "--new-cards-level",
        default="1",
        help="which nested new-card level to render, or 'all'",
    )
    parser.add_argument("--description-override", help="override rules text for this render only")
    parser.add_argument("--vertical-name-override", help="override the vertical Chinese card name for this render only")
    parser.add_argument(
        "--description-single-row",
        action="store_true",
        help="render description override as one unwrapped row",
    )
    parser.add_argument("--render-scale", type=float, default=1.0)
    parser.add_argument(
        "--text-renderer",
        choices=TEXT_RENDERERS,
        default=TEXT_RENDERER,
        help="default text rasterizer; sdf uses the game TMP atlas/materials, otf uses extracted DefaultFont.otf",
    )
    args = parser.parse_args()
    set_text_renderer(args.text_renderer)

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    if args.new_cards_json:
        rows = json.loads(args.new_cards_json.read_text(encoding="utf-8"))
        if not isinstance(rows, list):
            raise TypeError("--new-cards-json must contain a JSON array")
        selected_level = None if args.new_cards_level == "all" else int(args.new_cards_level)
        outputs = render_new_card_rows(
            rows,
            args.new_cards_locale,
            args.new_cards_output_subdir,
            render_scale=args.render_scale,
            selected_level=selected_level,
        )
        for output in outputs:
            print(output.relative_to(ROOT))
        return

    if args.label:
        image = render_card_for_label(
            args.label,
            render_scale=args.render_scale,
            description_override=args.description_override,
            description_single_row=args.description_single_row,
            vertical_name_override=args.vertical_name_override,
        )
        output = output_path_for_label(args.label)
        save_png(image, output)
        print(output.relative_to(ROOT))
        return

    for level in CARD_LEVELS:
        for locale in LOCALES:
            label = f"l{level.level}_{locale.suffix}"
            image = render_card_for_label(label)
            output = output_path_for_label(label)
            save_png(image, output)
            print(output.relative_to(ROOT))
    for level in DREAM_CARD_LEVELS:
        for locale in DREAM_LOCALES:
            label = f"{level.ref_id}_{locale.suffix}"
            image = render_card_for_label(label)
            output = output_path_for_label(label)
            save_png(image, output)
            print(output.relative_to(ROOT))


if __name__ == "__main__":
    main()
