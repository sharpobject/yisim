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

def preprocess_card_image(roi):
    hsv = cv2.cvtColor(roi, cv2.COLOR_BGR2HSV)
    hsv = cv2.resize(hsv, (roi.shape[1]*2, roi.shape[0]*2), interpolation=cv2.INTER_CUBIC)
    lower_white = np.array([0, 0, 140])
    upper_white = np.array([180, 20, 255])
    mask = cv2.inRange(hsv, lower_white, upper_white)
    mask_inv = cv2.bitwise_not(mask)
    return mask_inv

def load_card_templates(template_dir: str) -> Dict[str, np.ndarray]:
    templates = {}
    for filename in os.listdir(template_dir):
        if filename.endswith('.png'):
            card_name = os.path.splitext(filename)[0]
            image_path = os.path.join(template_dir, filename)
            image = cv2.imread(image_path, cv2.IMREAD_GRAYSCALE)
            if image is not None:
                templates[card_name] = image
    return templates

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

def find_best_match(card_image: np.ndarray, templates: Dict[str, np.ndarray]) -> Tuple[str, float]:
    best_match = None
    best_score = float('-inf')
    
    for card_name, template in templates.items():
        if template.shape != card_image.shape:
            template = cv2.resize(template, card_image.shape[::-1])
        
        result = cv2.matchTemplate(card_image, template, cv2.TM_CCOEFF_NORMED)
        _, max_val, _, _ = cv2.minMaxLoc(result)
        
        if max_val > best_score:
            best_score = max_val
            best_match = card_name
    
    return best_match, best_score

def intt(x):
    try:
        return int(x)
    except:
        return "UNKNOWN"

def detect_upgrade_level(card_roi: np.ndarray, upgrade_templates: Dict[int, np.ndarray]) -> int:
    # Convert to grayscale
    gray = cv2.cvtColor(card_roi, cv2.COLOR_BGR2GRAY)
    
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
                best_match = talent_name
        
        if best_match and best_score > 0.693:  # You may need to adjust this threshold
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


def get_info(filename):
    global templates
    speed_region = (92, 187, 70, 50)
    health_region = (230, 187, 70, 50)
    physique_region = (368, 187, 70, 50)
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

    card_x, card_y = 42, 270
    card_width, card_height = 20, 110
    card_horizontal_interval = 154
    
    filename_trimmed = os.path.splitext(filename)[0]

    talents = detect_talents(image, talent_templates, filename)

    deck = []
    for i in range(8):
        x = card_x + i * card_horizontal_interval
        this_x = x * 2
        this_y = card_y * 2
        this_width = card_width * 2
        this_height = card_height * 2
        card_roi = image[this_y:this_y+this_height, this_x:this_x+this_width]
        card_preprocessed = preprocess_card_image(card_roi)
        
        cv2.imwrite(f'{filename_trimmed}_card_{i+1}_preprocessed.png', card_preprocessed)

        this_height = 30
        this_y += 200
        card_roi = image[this_y:this_y+this_height, this_x:this_x+this_width]
        
        best_match, score = find_best_match(card_preprocessed, templates)
        upgrade_level = detect_upgrade_level(card_roi, upgrade_templates)
        deck.append(best_match + " " + str(upgrade_level))
        print(f"Card {i+1}: {best_match} (Score: {score:.2f}, Level: {upgrade_level})")
    health = intt(health)
    speed = intt(speed)
    return {
        'cultivation': speed,
        'hp': health,
        'physique': physique_n,
        'max_physique': max_physique_n,
        'max_hp': health + physique_n,
        'round': intt(round),
        'cards': deck,
        'talents': talents,
    }

def main(use_previous_screenshot=False, card_template_dir='card_templates'):
    global templates
    global upgrade_templates
    templates = load_card_templates(card_template_dir)
    upgrade_templates = load_upgrade_templates('upgrade_templates')
    load_talent_templates('talent_templates')

    for x in range(2):
        if os.path.exists('hero.png') and os.path.exists('villain.png'):
            break
        window_title = "YiXianPai"
        image = capture_window(window_title, x)
        
        cv2.imwrite('full_window.png', image)

        round_info_region = (76, 298, 320, 72)
        round_info = extract_text(image, *round_info_region, "round_info")
        print(f"Round Info: {round_info}")
        if "".join(round_info.split()) == "RoundInfo":
            cv2.imwrite('villain.png', image)
        if round_info == "":
            cv2.imwrite('hero.png', image)

    # if both hero.png and villain.png exist, then we can extract the information
    # from both and dump it to stdout
    if os.path.exists('hero.png') and os.path.exists('villain.png'):
        hero_info = get_info('hero.png')
        villain_info = get_info('villain.png')
        print(json.dumps({
            'hero': hero_info,
            'villain': villain_info
        }, indent=4))
    
if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Extract text from game screenshot")
    parser.add_argument('--use-previous', action='store_true', help="Use the previous screenshot instead of capturing a new one")
    args = parser.parse_args()

    main(use_previous_screenshot=args.use_previous)