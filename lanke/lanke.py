from mss import mss
import pywinctl as gw
import pyautogui
import cv2
import numpy as np
import argparse
import os
from typing import Dict, Tuple, List
import json
from time import sleep
import easyocr

window = None
reader = easyocr.Reader(['en'])  # Initialize EasyOCR
talent_name_to_attr = json.load(open('talents.json'))
pure_vase_element_to_card = {
    "Five Elements Pure Vase Wood": "131011",
    "Five Elements Pure Vase Fire": "131031",
    "Five Elements Pure Vase Earth": "131051",
    "Five Elements Pure Vase Metal": "131071",
    "Five Elements Pure Vase Water": "131091",
}

def capture_window(window_title, idx=0):
    global window
    if window is None:
        window = gw.getWindowsWithTitle(window_title)[0]
        window.activate()
    left, top = window.left, window.top
    width, height = window.width, window.height

    if idx == 1:
        # click at 720, 155 within the window
        pyautogui.click(left + 720/2, top + 155/2)
        sleep(0.3)

    with mss() as sct:
        monitor = {"top": top, "left": left, "width": width, "height": height}
        screenshot = np.array(sct.grab(monitor))

    return cv2.cvtColor(screenshot, cv2.COLOR_BGRA2BGR)

def extaaaract_text(image, x, y, width, height, label, lang='eng'):
    roi = image[y:y+height, x:x+width]
    cv2.imwrite(f'{label}_roi.png', roi)
    gray = cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY)
    thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)[1]
    cv2.imwrite(f'{label}_roi_thresh.png', thresh)

    if label in ['round', 'speed', 'health', 'physique']:
        whitelist = '0123456789/-'
    else:
        whitelist = 'Round Info'

    config = f'--psm 7 --oem 1 -c "tessedit_char_whitelist={whitelist}"'
    text = pytesseract.image_to_string(thresh, lang=lang, config=config)
    return text.strip()

def extract_text(image, x, y, width, height, label, lang='en'):
    roi = image[y:y+height, x:x+width]
    cv2.imwrite(f'{label}_roi.png', roi)

    # Use EasyOCR to recognize text
    result = reader.readtext(roi)

    if result:
        text = result[0][1]  # Get the text from the first result
        if label in ['round', 'speed', 'health', 'physique']:
            # Keep only digits and '/' and '-'
            text = ''.join(filter(lambda x: x.isdigit() or x == '/' or x == '-', text))
        return text.strip()
    else:
        return ""

def preprocess_card_image(roi, multiplier=2):
    hsv = cv2.cvtColor(roi, cv2.COLOR_BGR2HSV)
    hsv = cv2.resize(hsv, (roi.shape[1]*multiplier, roi.shape[0]*multiplier), interpolation=cv2.INTER_CUBIC)
    lower_white = np.array([0, 0, 140])
    upper_white = np.array([180, 20, 255])
    mask = cv2.inRange(hsv, lower_white, upper_white)
    mask_inv = cv2.bitwise_not(mask)
    return mask_inv

def load_card_templates(template_dir: str, target_shape=None):
    """Load templates and build a matrix for fast matching.
    Returns (template_names, template_matrix) where template_matrix has shape
    (N, pixels) with each row being a normalized template vector."""
    raw_templates = {}
    for filename in os.listdir(template_dir):
        if filename.endswith('.png'):
            card_name = os.path.splitext(filename)[0]
            image_path = os.path.join(template_dir, filename)
            image = cv2.imread(image_path, cv2.IMREAD_GRAYSCALE)
            if image is not None:
                raw_templates[card_name] = image
    if not raw_templates:
        return [], None
    # Determine target shape from first template if not specified
    if target_shape is None:
        target_shape = next(iter(raw_templates.values())).shape
    template_names = []
    vectors = []
    for card_name, image in raw_templates.items():
        if image.shape != target_shape:
            image = cv2.resize(image, (target_shape[1], target_shape[0]))
        vec = image.astype(np.float32).flatten()
        vec = vec - vec.mean()
        norm = np.linalg.norm(vec)
        if norm > 0:
            vec = vec / norm
        template_names.append(card_name)
        vectors.append(vec)
    template_matrix = np.stack(vectors)
    return template_names, template_matrix

def load_upgrade_templates(template_dir: str):
    upgrade_templates = {}
    for level in range(1, 4):
        image_path = os.path.join(template_dir, f'level{level}.png')
        image = cv2.imread(image_path, cv2.IMREAD_GRAYSCALE)
        if image is not None:
            image = cv2.GaussianBlur(image, (5, 5), 0)
            image = cv2.Canny(image, 50, 150)
            upgrade_templates[level] = image
    return upgrade_templates

talent_templates = []
def load_talent_templates(base_dir: str):
    global talent_templates
    talent_templates = []
    for i in range(1, 6):  # Assuming 5 talent positions
        position_dir = os.path.join(base_dir, f'position_{i}')
        position_templates = {}
        if os.path.exists(position_dir):
            for filename in os.listdir(position_dir):
                if filename.endswith('.png'):
                    talent_name = os.path.splitext(filename)[0]
                    image_path = os.path.join(position_dir, filename)
                    #read the image in full color
                    #image = cv2.imread(image_path, cv2.IMREAD_GRAYSCALE)
                    image = cv2.imread(image_path)
                    if image is not None:
                        position_templates[talent_name] = image
        talent_templates.append(position_templates)

def find_best_match(card_image: np.ndarray, template_names, template_matrix) -> Tuple[str, float]:
    if template_matrix is None or len(template_names) == 0:
        return None, 0.0
    vec = card_image.astype(np.float32).flatten()
    vec = vec - vec.mean()
    norm = np.linalg.norm(vec)
    if norm > 0:
        vec = vec / norm
    scores = template_matrix @ vec
    best_idx = np.argmax(scores)
    return template_names[best_idx], float(scores[best_idx])

def intt(x):
    try:
        return int(x)
    except:
        return "UNKNOWN"

def detect_upgrade_level(card_roi: np.ndarray, upgrade_templates: Dict[int, np.ndarray]) -> int:
    # Convert to grayscale
    try:
        gray = cv2.cvtColor(card_roi, cv2.COLOR_BGR2GRAY)
    except:
        gray = card_roi

    # Apply some preprocessing to enhance the circle feature
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    edges = cv2.Canny(blurred, 50, 150)

    best_match = None
    best_score = float('-inf')

    # output the edges image
    cv2.imwrite('edges.png', edges)


    for level, template in upgrade_templates.items():
        # output the upgrade templates
        cv2.imwrite(f'level{level}.png', template)
        if template.shape != edges.shape:
            template = cv2.resize(template, edges.shape[::-1])

        result = cv2.matchTemplate(edges, template, cv2.TM_CCOEFF_NORMED)
        _, max_val, _, _ = cv2.minMaxLoc(result)

        if max_val > best_score:
            best_score = max_val
            best_match = level

    return best_match

def detect_talents(image: np.ndarray, talent_templates: List[Dict[str, np.ndarray]], filename: str) -> List[str]:
    role = os.path.basename(filename).split('.')[0]
    if role == 'hero':
        talent_positions = [
            (318, 1560, 83, 83),
            (173, 1533, 91, 91),
            (56, 1440, 98, 98),
            (44, 1300, 106, 106),
            (105, 1168, 114, 111)
        ]
    else:
        talent_positions = [
            (783, 1352, 140, 140),
            (1033, 1352, 140, 140),
            (1284, 1352, 140, 140),
            (1534, 1352, 140, 140),
            (1785, 1352, 140, 140)
        ]

    detected_talents = []

    for i, ((x, y, w, h), position_templates) in enumerate(zip(talent_positions, talent_templates), 1):
        roi = image[y:y+h, x:x+w]
        #roi_gray = cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY)

        best_match = None
        best_score = float('-inf')

        for talent_name, template in position_templates.items():
            # If template and roi differ in size, resize the smaller one to match the other
            template_resized = template
            roi_resized = roi
            if template.shape != roi.shape:
                if template.shape[0] > roi.shape[0] or template.shape[1] > roi.shape[1]:
                    roi_resized = cv2.resize(roi, (template.shape[1], template.shape[0]))
                else:
                    template_resized = cv2.resize(template, (roi.shape[1], roi.shape[0]))
            # crop the template to the middle 70% of the image
            my_h = template_resized.shape[0]
            my_w = template_resized.shape[1]
            template_cropped = template_resized[int(0.15*my_h):int(0.85*my_h), int(0.15*my_w):int(0.85*my_w)]
            # crop the roi to the middle 70% of the image
            roi_cropped = roi_resized[int(0.15*my_h):int(0.85*my_h), int(0.15*my_w):int(0.85*my_w)]

            result = cv2.matchTemplate(roi_cropped, template_cropped, cv2.TM_CCOEFF_NORMED)
            _, max_val, _, _ = cv2.minMaxLoc(result)

            if max_val > best_score:
                best_score = max_val
                best_match = talent_name.strip()

        if best_match and best_score > 0.693:  # You may need to adjust this threshold
        #if best_match and best_score > 0.9:  # You may need to adjust this threshold
            detected_talents.append(best_match)
        else:
            detected_talents.append(None)
            # Save unmatched talent image
            unmatched_dir = os.path.join(os.path.dirname(filename), 'talent_templates', f'position_{i}')
            os.makedirs(unmatched_dir, exist_ok=True)
            unmatched_filename = f'unmatched_talent_position_{i}_{os.path.basename(filename)}'
            cv2.imwrite(os.path.join(unmatched_dir, unmatched_filename), roi)
            print(f"Saved unmatched talent image: {unmatched_filename}")

    return detected_talents

def detect_card(image, x, y, width, height, templates, upgrade_templates, card_idx, filename, preprocess=True, save=True):
    card_roi = image[y:y+height, x:x+width]
    if preprocess:
        card_preprocessed = preprocess_card_image(card_roi)
    else:
        card_preprocessed = card_roi

    if save:
        cv2.imwrite(f'{filename}_card_{card_idx}.png', image)
        cv2.imwrite(f'{filename}_card_{card_idx}_roi.png', card_roi)
        cv2.imwrite(f'{filename}_card_{card_idx}_preprocessed.png', card_preprocessed)

    template_names, template_matrix = templates
    best_match, score = find_best_match(card_preprocessed, template_names, template_matrix)

    # Region below card art contains both level dots (regular) and phase indicator (dream)
    indicator_roi = image[y+200:y+245, x:x+width]
    if best_match and best_match.startswith("Dream "):
        upgrade_level = detect_dream_phase(indicator_roi)
    else:
        upgrade_level = detect_upgrade_level(indicator_roi[:30], upgrade_templates)
    return best_match, score, upgrade_level, card_roi, card_preprocessed


phase_templates = {}
def load_phase_templates():
    global phase_templates
    for phase in range(1, 6):
        path = f'upgrade_templates/phase{phase}.png'
        if os.path.exists(path):
            phase_templates[phase] = cv2.imread(path)

def detect_dream_phase(indicator_roi):
    """Detect dream card phase by template matching against phase color images."""
    # Phase region is the bottom 25px of the indicator ROI
    phase_roi = indicator_roi[20:]
    best_phase = 1
    best_score = float('-inf')
    for phase, template in phase_templates.items():
        if template.shape != phase_roi.shape:
            template = cv2.resize(template, (phase_roi.shape[1], phase_roi.shape[0]))
        result = cv2.matchTemplate(phase_roi, template, cv2.TM_CCOEFF_NORMED)
        _, max_val, _, _ = cv2.minMaxLoc(result)
        if max_val > best_score:
            best_score = max_val
            best_phase = phase
    return best_phase


def get_info(filename, n_hand_cards):
    global templates
    speed_region = (82, 187, 70, 50)
    health_region = (230, 187, 70, 50)
    physique_region = (358, 187, 80, 50)
    round_region = (1210, 90, 30, 23)
    speed_region = (x * 2 for x in speed_region)
    health_region = (x * 2 for x in health_region)
    physique_region = (x * 2 for x in physique_region)
    round_region = (x * 2 for x in round_region)

    image = cv2.imread(filename)

    speed = extract_text(image, *speed_region, "speed")
    health = extract_text(image, *health_region, "health")
    physique = extract_text(image, *physique_region, "physique")
    round = extract_text(image, *round_region, "round")

    print(f"Speed: {speed}")
    print(f"Health: {health}")
    print(f"Physique: {physique}")
    print(f"Round: {round}")
    physique_n = 0
    max_physique_n = 0
    if "/" in physique:
        physique_n, max_physique_n = physique.split("/")
        try:
            physique_n, max_physique_n = int(physique_n), int(max_physique_n)
        except:
            pass

    card_x, card_y = 42, 266.5
    card_width, card_height = 20, 110
    card_horizontal_interval = 154

    filename_trimmed = os.path.splitext(filename)[0]

    talents = detect_talents(image, talent_templates, filename)

    best_total_score = 0
    best_deck = []
    best_problems = 0
    best_dy = 0
    best_rois = []
    best_preprocessed = []
    for dy in [6, 0, 8.5, 9.5]:
        deck = []
        total_score = 0
        problems = 0
        rois = []
        preprocessed = []
        for i in range(8):
            x = card_x + i * card_horizontal_interval
            this_x = x * 2
            this_y = int(card_y * 2) + int(dy * 2)
            this_width = card_width * 2
            this_height = card_height * 2
            best_match, score, upgrade_level, card_roi, card_prep = detect_card(image, this_x, this_y, this_width, this_height, templates, upgrade_templates, "deck"+str(i+1), filename_trimmed, save=False)
            rois.append(card_roi)
            preprocessed.append(card_prep)
            if score < 0.3:
                best_match = "Normal Attack"
                upgrade_level = 1
                problems -= 1
            deck.append(best_match + " " + str(upgrade_level))
            if score < 0.79:
                problems += 1
            total_score += score
            print(f"Card {i+1}: {best_match} (Score: {score:.2f}, Level: {upgrade_level})")
        if total_score > best_total_score:
            best_total_score = total_score
            best_deck = deck
            best_problems = problems
            best_dy = dy
            best_rois = rois
            best_preprocessed = preprocessed
    problems = best_problems
    deck = best_deck
    print("best dy was " + str(best_dy))
    for i in range(8):
        cv2.imwrite(f'{filename_trimmed}_card_deck{i+1}_roi.png', best_rois[i])
        cv2.imwrite(f'{filename_trimmed}_card_deck{i+1}_preprocessed.png', best_preprocessed[i])
        # Save phase indicator strip (for dream cards)
        x = card_x + i * card_horizontal_interval
        this_x = int(x * 2)
        this_y = int(card_y * 2) + int(best_dy * 2)
        this_width = card_width * 2
        phase_roi = image[this_y + 220:this_y + 245, this_x:this_x + this_width]
        #cv2.imwrite(f'{filename_trimmed}_card_deck{i+1}_phase.png', phase_roi)
    print(f"Total score: {best_total_score}")
    hand_cards = detect_hand_cards(image, n_hand_cards, templates)
    health = intt(health)
    if "/" in speed:
        speed = speed.split("/")[0]
    speed = intt(speed)
    ret = {
        'cultivation': speed,
        'hp': health,
        'physique': physique_n,
        'max_physique': max_physique_n,
        'max_hp': health + physique_n,
        'round_number': intt(round),
        'cards': deck + hand_cards,
        'talents': talents,
    }
    if physique_n > 0 or max_physique_n > 0:
        ret['physique'] = physique_n
        ret['max_physique'] = max_physique_n
    for i, talent in enumerate(talents, 1):
        if talent:
            if talent in pure_vase_element_to_card:
                ret['five_elements_pure_vase_stacks'] = 1
                ret.setdefault('five_elements_pure_vase_cards', []).append(pure_vase_element_to_card[talent])
                continue
            if talent not in talent_name_to_attr:
                print(f"Unknown talent: {talent}")
                problems += 1
                continue
            if not talent_name_to_attr[talent]:
                continue
            talent_attr = talent_name_to_attr[talent]
            if "{n}" in talent_attr:
                talent_attr = talent_attr.format(n=i)
            ret[talent_attr] = 1
        else:
            problems += 1
    if problems > 0:
        ret['problems'] = True
    return ret

def load_card_positions(file_path):
    with open(file_path, 'r') as f:
        return json.load(f)

def rotate_and_crop(image, angle, crop_x, crop_y, crop_w, crop_h):
    """Rotate image and extract a small crop, without materializing the full rotated image."""
    height, width = image.shape[:2]
    center = (width // 2, height // 2)
    M = cv2.getRotationMatrix2D(center, angle, 1.0)

    abs_cos = abs(M[0, 0])
    abs_sin = abs(M[0, 1])
    new_width = int(height * abs_sin + width * abs_cos)
    new_height = int(height * abs_cos + width * abs_sin)

    M[0, 2] += new_width / 2 - center[0] - crop_x
    M[1, 2] += new_height / 2 - center[1] - crop_y

    return cv2.warpAffine(image, M, (crop_w, crop_h), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT, borderValue=(0, 0, 0))

def detect_hand_cards(image, hand_size, templates):
    hand_cards = []
    card_width, card_height = 40, 220
    for card_index in range(1, hand_size + 1):
        if hand_size < len(card_positions) and card_index < len(card_positions[hand_size]):
            position = card_positions[hand_size][card_index]
            x, y = position['x'], position['y']
            angle = position['angle']

            x //= 2
            y //= 2

            # Crop enough for both the card ROI and the upgrade level strip below it
            cropped = rotate_and_crop(image, angle, x, y, card_width, card_height + 30)
            best_match, score, upgrade_level, _, _ = detect_card(cropped, 0, 0, card_width, card_height, templates, upgrade_templates, card_index, f"hand{card_index}")
            print(f"Hand card {card_index}: {best_match} (Score: {score:.2f}, Level: {upgrade_level})")

            hand_cards.append(f"{best_match} {upgrade_level}")

    return hand_cards

def main(hand_size, use_previous_screenshot=False, card_template_dir='card_templates'):
    global templates
    global upgrade_templates
    global card_positions
    templates = load_card_templates(card_template_dir)
    upgrade_templates = load_upgrade_templates('upgrade_templates')
    load_talent_templates('talent_templates')
    load_phase_templates()
    card_positions = load_card_positions('card_positions.json')

    for x in range(2):
        if os.path.exists('hero.png') and os.path.exists('villain.png'):
            break
        window_title = "YiXianPai"
        image = capture_window(window_title, x)

        cv2.imwrite('full_window.png', image)

        round_info_region = (76, 310, 320, 72)
        round_info = extract_text(image, *round_info_region, "round_info")
        print(f"Round Info: {round_info}")
        round_info = "".join(round_info.split())
        if round_info == "RoundInfo" or round_info == "Round":
            cv2.imwrite('villain.png', image)
        if round_info == "":
            cv2.imwrite('hero.png', image)

    # if both hero.png and villain.png exist, then we can extract the information
    # from both and dump it to stdout
    if os.path.exists('hero.png') and os.path.exists('villain.png'):
        hero_info = get_info('hero.png', hand_size)
        villain_info = get_info('villain.png', 0)
        print(json.dumps({
            'hero': hero_info,
            'villain': villain_info
        }, indent=4))
        # write the json to ../riddle_data.json
        with open('../riddle_data.json', 'w') as f:
            json.dump({
                'hero': hero_info,
                'villain': villain_info
            }, f, indent=4)
        if ('problems' not in hero_info) and ('problems' not in villain_info):
            # run the riddle solver
            os.system('cd ../; bun swogi.js')

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Extract text from game screenshot")
    parser.add_argument('hand_size', type=int, help="Number of cards in hand")
    parser.add_argument('--use-previous', action='store_true', help="Use the previous screenshot instead of capturing a new one")
    args = parser.parse_args()

    main(args.hand_size, use_previous_screenshot=args.use_previous)
