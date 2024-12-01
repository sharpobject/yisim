import argparse
from PIL import Image
import numpy as np
import cv2

def search_template_position(img_path, template_path, base_x=624-353, base_y=873):
    # Load the image
    img = cv2.imread(img_path)
    if img is None:
        raise FileNotFoundError(f"Could not load image: {img_path}")
    
    # Load the template
    template = cv2.imread(template_path)
    if template is None:
        raise FileNotFoundError(f"Could not load template: {template_path}")
    
    # Convert both to grayscale for template matching
    img_gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    template_gray = cv2.cvtColor(template, cv2.COLOR_BGR2GRAY)
    template_h, template_w = template_gray.shape
    
    best_score = -1
    best_offset_x = 0
    best_offset_y = 0
    
    # Search in the defined region
    for offset_y in range(-300, 300):  # -100 to +100
        for offset_x in range(-300, 300):  # -10 to +10
            x = base_x + offset_x
            y = base_y + offset_y
            
            # Extract region and perform template matching
            roi = img_gray[y:y+template_h, x:x+template_w]
            if roi.shape != template_gray.shape:
                continue
                
            # Use TM_CCOEFF_NORMED for normalized cross-correlation
            score = cv2.matchTemplate(roi, template_gray, cv2.TM_CCOEFF_NORMED)[0][0]
            
            if score > best_score:
                best_score = score
                best_offset_x = offset_x
                best_offset_y = offset_y
            
            # Output progress every 100 attempts
            if (offset_y + 100) % 10 == 0 and offset_x == 0:
                print(f"Checking y offset {offset_y:+d}... Best so far: score={best_score:.4f} at ({best_offset_x:+d}, {best_offset_y:+d})")
    
    print(f"\nBest match found:")
    print(f"Score: {best_score:.4f}")
    print(f"X offset: {best_offset_x:+d} (final x = {base_x + best_offset_x})")
    print(f"Y offset: {best_offset_y:+d} (final y = {base_y + best_offset_y})")
    
    return best_offset_x, best_offset_y, best_score

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Find optimal template position")
    parser.add_argument("image", help="Path to the input image")
    parser.add_argument("template", help="Path to the template image")
    parser.add_argument("--base-x", type=int, default=624, help="Base X coordinate (default: 624)")
    parser.add_argument("--base-y", type=int, default=873, help="Base Y coordinate (default: 873)")
    
    args = parser.parse_args()
    
    search_template_position(args.image, args.template)