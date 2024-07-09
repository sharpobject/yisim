import cv2
import numpy as np
import os
import json
from scipy.optimize import minimize_scalar

def load_template(template_path):
    full_template = cv2.imread(template_path, cv2.IMREAD_GRAYSCALE)
    height = full_template.shape[0]
    quarter_height = height // 4
    return full_template[quarter_height:3*quarter_height, :]

def preprocess_card_image(roi):
    hsv = cv2.cvtColor(roi, cv2.COLOR_BGR2HSV)
    hsv = cv2.resize(hsv, (roi.shape[1]*2, roi.shape[0]*2), interpolation=cv2.INTER_CUBIC)
    lower_white = np.array([0, 0, 140])
    upper_white = np.array([180, 20, 255])
    mask = cv2.inRange(hsv, lower_white, upper_white)
    mask_inv = cv2.bitwise_not(mask)
    return mask_inv

def rotate_image(image, angle):
    height, width = image.shape[:2]
    center = (width // 2, height // 2)
    rotation_matrix = cv2.getRotationMatrix2D(center, angle, 1.0)
    
    abs_cos = abs(rotation_matrix[0, 0])
    abs_sin = abs(rotation_matrix[0, 1])
    new_width = int(height * abs_sin + width * abs_cos)
    new_height = int(height * abs_cos + width * abs_sin)
    
    rotation_matrix[0, 2] += new_width / 2 - center[0]
    rotation_matrix[1, 2] += new_height / 2 - center[1]
    
    rotated = cv2.warpAffine(image, rotation_matrix, (new_width, new_height), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT, borderValue=(0, 0, 0))
    return rotated, rotation_matrix

def match_template(rotated_image, template):
    result = cv2.matchTemplate(rotated_image, template, cv2.TM_CCOEFF_NORMED)
    min_val, max_val, min_loc, max_loc = cv2.minMaxLoc(result)
    return max_val, max_loc

n_obj_calls = 0
def objective_function(angle, image, template):
    global n_obj_calls
    rotated_image, _ = rotate_image(image, angle)
    score, _ = match_template(rotated_image, template)
    n_obj_calls += 1
    #print(f"Objective function called {n_obj_calls} times Angle: {angle:.4f}, Score: {score:.4f}")
    return -score  # Negative because we want to maximize the score

from scipy.optimize import shgo

import numpy as np
from scipy.optimize import minimize_scalar

def search_template(preprocessed_image, template):
    def sample_angle(angle):
        return -objective_function(angle, preprocessed_image, template)

    angles = [0]
    scores = [sample_angle(0)]
    best_index = 0
    found_good_score = scores[0] >= 0.7

    # Phase 1: Sample until we find a good score or reach 31 samples
    while len(angles) < 31 and not found_good_score:
        if len(angles) % 2 == 1:
            new_angle = min(angles) - 2
        else:
            new_angle = max(angles) + 2
        
        if -30 <= new_angle <= 30:
            angles.append(new_angle)
            scores.append(sample_angle(new_angle))
            if scores[-1] > scores[best_index]:
                best_index = len(scores) - 1
                if scores[best_index] >= 0.7:
                    found_good_score = True

    # Phase 2: Sample 2 more angles on each side of the best angle
    if found_good_score and len(angles) < 31:
        best_angle = angles[best_index]
        for offset in [-4, -2, 2, 4]:
            new_angle = best_angle + offset
            if -30 <= new_angle <= 30 and new_angle not in angles:
                angles.append(new_angle)
                scores.append(sample_angle(new_angle))
                if scores[-1] > scores[best_index]:
                    best_index = len(scores) - 1

    best_grid_angle = angles[best_index]
    
    # Fine-tuning with minimize_scalar
    result = minimize_scalar(
        lambda angle: objective_function(angle, preprocessed_image, template),
        method='bounded',
        bounds=(max(-30, best_grid_angle - 3), min(30, best_grid_angle + 3))
    )
    
    best_angle = result.x
    best_score = -result.fun  # Convert back to positive score

    # use minimize_scalar again in a smaller range to get a more accurate result
    result = minimize_scalar(
        lambda angle: objective_function(angle, preprocessed_image, template),
        method='bounded',
        bounds=(max(-30, best_angle - 0.2), min(30, best_angle + 0.2))
    )
    
    best_rotated, best_rotation_matrix = rotate_image(preprocessed_image, best_angle)
    _, best_location = match_template(best_rotated, template)
    
    return best_angle, best_score, best_location, best_rotated, best_rotation_matrix

def save_image(image, filename):
    output_path = os.path.join(".", filename)
    cv2.imwrite(output_path, image)

def process____images(image_dir, template_path):
    template = load_template(template_path)
    save_image(template, "truncated_template.png")
    
    positions = {}

    for filename in os.listdir(image_dir):
        if filename.endswith('.png') or filename.endswith('.jpg') and ('preprocessed' not in filename):
            if len(filename) != 12 or "_of_" not in filename:
                continue
            print(f"Processing {filename}")
            image_path = os.path.join(image_dir, filename)
            image = cv2.imread(image_path)

            preprocessed_image = preprocess_card_image(image)
            save_image(preprocessed_image, f"preprocessed_{filename}")

            angle, score, location, rotated_image, rotation_matrix = search_template(preprocessed_image, template)

            save_image(rotated_image, f"rotated_{filename}")

            debug_image = cv2.cvtColor(rotated_image, cv2.COLOR_GRAY2BGR)
            template_h, template_w = template.shape[:2]
            top_left = location
            bottom_right = (top_left[0] + template_w, top_left[1] + template_h)
            cv2.rectangle(debug_image, top_left, bottom_right, (0, 255, 0), 2)
            save_image(debug_image, f"debug_{filename}")

            # Adjust the y-coordinate to account for the truncated template
            full_template_height = cv2.imread(template_path, cv2.IMREAD_GRAYSCALE).shape[0]
            y_offset = full_template_height // 4
            adjusted_top_left = (top_left[0], top_left[1] - y_offset)
            adjusted_bottom_right = (bottom_right[0], bottom_right[1] - y_offset)

            card_position, hand_size = map(int, filename.split('.')[0].split('_of_'))

            if hand_size not in positions:
                positions[hand_size] = {}

            positions[hand_size][card_position] = {
                'x': adjusted_top_left[0],
                'y': adjusted_top_left[1],
                'angle': float(angle),
                'score': float(score)
            }
            print(f"Card found at ({adjusted_top_left[0]}, {adjusted_top_left[1]}) with angle {angle:.2f} and score {score:.4f}")

    return positions

def load_previous_positions(output_file):
    if os.path.exists(output_file):
        with open(output_file, 'r') as f:
            return json.load(f)
    return {}

def save_positions(positions, output_file):
    with open(output_file, 'w') as f:
        json.dump(positions, f, indent=2)

def process_images(image_dir, template_path, previous_positions):
    template = load_template(template_path)
    save_image(template, "truncated_template.png")
    
    positions = previous_positions.copy()

    for filename in os.listdir(image_dir):
        if filename.endswith('.png') or filename.endswith('.jpg') and ('preprocessed' not in filename):
            if len(filename) != 12 or "_of_" not in filename:
                continue
            
            card_position, hand_size = map(int, filename.split('.')[0].split('_of_'))
            hand_size = int(hand_size)
            
            
            # Skip if this card position has already been processed
            if str(hand_size) in positions and str(card_position) in positions[str(hand_size)]:
                print(f"Skipping {filename} - already processed")
                continue
            
            print(f"Processing {filename}")
            image_path = os.path.join(image_dir, filename)
            image = cv2.imread(image_path)

            preprocessed_image = preprocess_card_image(image)
            save_image(preprocessed_image, f"preprocessed_{filename}")

            angle, score, location, rotated_image, rotation_matrix = search_template(preprocessed_image, template)

            save_image(rotated_image, f"rotated_{filename}")

            debug_image = cv2.cvtColor(rotated_image, cv2.COLOR_GRAY2BGR)
            template_h, template_w = template.shape[:2]
            top_left = location
            bottom_right = (top_left[0] + template_w, top_left[1] + template_h)
            cv2.rectangle(debug_image, top_left, bottom_right, (0, 255, 0), 2)
            save_image(debug_image, f"debug_{filename}")

            # Adjust the y-coordinate to account for the truncated template
            full_template_height = cv2.imread(template_path, cv2.IMREAD_GRAYSCALE).shape[0]
            y_offset = full_template_height // 4
            adjusted_top_left = (top_left[0], top_left[1] - y_offset)
            adjusted_bottom_right = (bottom_right[0], bottom_right[1] - y_offset)

            if hand_size not in positions:
                positions[hand_size] = {}

            positions[hand_size][card_position] = {
                'x': adjusted_top_left[0],
                'y': adjusted_top_left[1],
                'angle': float(angle),
                'score': float(score)
            }
            print(f"Card found at ({adjusted_top_left[0]}, {adjusted_top_left[1]}) with angle {angle:.2f} and score {score:.4f}")

    return positions


if __name__ == "__main__":
    image_directory = '.'
    template_path = '../card_templates/Spiritage Incantation.png'
    output_file = 'card_positions.json'

    previous_positions = load_previous_positions(output_file)
    positions = process_images(image_directory, template_path, previous_positions)
    save_positions(positions, output_file)
    print(f"Card positions saved to {output_file}")
