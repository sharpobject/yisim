import argparse
from PIL import Image, ImageDraw
import numpy as np
import cv2
import os

# Define base regions for each type (replace with actual values)
BASE_REGIONS = {
    1: (636, 545, 1017, 1186),
}

# Define horizontal offset between cards for types 1 and 2
H_OFFSET = 480
BASE_REGIONS[3] = (BASE_REGIONS[1][0] + H_OFFSET, BASE_REGIONS[1][1], BASE_REGIONS[1][2] + H_OFFSET, BASE_REGIONS[1][3])

TOOLTIP_OFFSET = 353
for i in range(1, 4, 2):
    x1, y1, x2, y2 = BASE_REGIONS[i]
    BASE_REGIONS[i+1] = (x1 - TOOLTIP_OFFSET, y1, x2 - TOOLTIP_OFFSET, y2)

# Define the single template region (replace with actual values)
TEMPLATE_REGION_ = (30, 370, 99, 405)

def get_regions(img_type):
    base = BASE_REGIONS[img_type]
    if img_type in [1, 2]:
        return [
            base,
            (base[0] + H_OFFSET, base[1], base[2] + H_OFFSET, base[3]),
            (base[0] + 2*H_OFFSET, base[1], base[2] + 2*H_OFFSET, base[3])
        ]
    else:
        return [base]

def extract(img, region):
    # Extract the region
    region_img = img.crop(region)
    
    # Create a new image with an alpha channel
    result = Image.new('RGBA', region_img.size, (0, 0, 0, 0))
    
    # Paste the extracted region onto the new image
    result.paste(region_img, (0, 0))
    
    return result

def extract_and_round_corners(img, region, corner_radius):
    result = extract(img, region)
    
    # Create a mask for rounded corners
    mask = Image.new('L', result.size, 0)
    draw = ImageDraw.Draw(mask)
    
    # Draw four filled circles for corners
    draw.pieslice((0, 0, corner_radius * 2, corner_radius * 2), 180, 270, fill=255)
    draw.pieslice((0, result.height - corner_radius * 2, corner_radius * 2, result.height), 90, 180, fill=255)
    draw.pieslice((result.width - corner_radius * 2, 0, result.width, corner_radius * 2), 270, 360, fill=255)
    draw.pieslice((result.width - corner_radius * 2, result.height - corner_radius * 2, result.width, result.height), 0, 90, fill=255)
    
    # Draw rectangles to fill the rest
    draw.rectangle((corner_radius, 0, result.width - corner_radius, result.height), fill=255)
    draw.rectangle((0, corner_radius, result.width, result.height - corner_radius), fill=255)
    
    # Apply the mask
    result.putalpha(mask)
    
    return result

def pad_image(image, padding):
    # Create a new image with padding
    new_size = (image.width + 2 * padding, image.height + 2 * padding)
    padded_image = Image.new('RGBA', new_size, (0, 0, 0, 0))
    
    # Paste the original image onto the padded image
    padded_image.paste(image, (padding, padding))
    
    return padded_image

def classify_image(img, padding, output_dir, k_threecards=0.8):
    # Convert image to grayscale
    gray = cv2.cvtColor(np.array(img), cv2.COLOR_RGB2GRAY)
    
    # Load and convert templates to grayscale
    templates = []
    for i in range(1, 4):
        template = cv2.imread(f'template{i}.png')
        if template is None:
            raise FileNotFoundError(f'Could not find template{i}.png in working directory')
        template_gray = cv2.cvtColor(template, cv2.COLOR_BGR2GRAY)
        templates.append(template_gray)
    
    TEMPLATE_REGION = tuple(x-padding for x in TEMPLATE_REGION_)
    
    # First stage: Try three-card layouts (types 1 and 2)
    best_three_card_score = -1
    best_three_card_type = None
    
    for img_type in [1, 2]:  # Three-card layouts
        regions = get_regions(img_type)
        scores = []
        
        # Match each region against its corresponding level template
        for i, region in enumerate(regions):
            roi = gray[region[1]:region[3], region[0]:region[2]]
            template_area = roi[TEMPLATE_REGION[1]:TEMPLATE_REGION[3],
                              TEMPLATE_REGION[0]:TEMPLATE_REGION[2]]
            
            debug_path = os.path.join(output_dir, f'debug_type{img_type}_region{i+1}_template_area.png')
            cv2.imwrite(debug_path, template_area)
            
            result = cv2.matchTemplate(templates[i], template_area, cv2.TM_CCOEFF_NORMED)
            match_score = np.max(result)
            scores.append(match_score)
            print(f"Type {img_type}, Region {i+1}: Score = {match_score} (against template {i+1})")
        
        min_score = min(scores)
        print(f"Type {img_type} minimum score: {min_score}")
        
        if min_score > best_three_card_score:
            best_three_card_score = min_score
            best_three_card_type = img_type
    
    # If we found a good three-card match, return it
    if best_three_card_score >= k_threecards:
        print(f"Found three-card layout type {best_three_card_type} with minimum score {best_three_card_score}")
        return (best_three_card_type, None)
    
    # Second stage: Try single-card layouts (types 3 and 4)
    best_single_card_score = -1
    best_single_card_result = None
    
    for img_type in [3, 4]:  # Single-card layouts
        regions = get_regions(img_type)
        region = regions[0]  # Only one region for single-card layouts
        
        roi = gray[region[1]:region[3], region[0]:region[2]]
        template_area = roi[TEMPLATE_REGION[1]:TEMPLATE_REGION[3],
                          TEMPLATE_REGION[0]:TEMPLATE_REGION[2]]
        
        # Try both level 1 and level 3 templates
        for template_idx in [0, 2]:  # Templates 1 and 3
            result = cv2.matchTemplate(templates[template_idx], template_area, cv2.TM_CCOEFF_NORMED)
            match_score = np.max(result)
            level = template_idx + 1
            print(f"Type {img_type}, Template {level}: Score = {match_score}")
            
            if match_score > best_single_card_score:
                best_single_card_score = match_score
                best_single_card_result = (img_type, level)
    
    if best_single_card_result is None:
        raise RuntimeError("Failed to find any matching layout")
        
    print(f"Found single-card layout type {best_single_card_result[0]} with template {best_single_card_result[1]} (score {best_single_card_score})")
    return best_single_card_result

def process_image(input_path, output_base, corner_radius, padding):
    with Image.open(input_path) as img:
        img_type, level = classify_image(img, padding, os.path.dirname(output_base))
        regions = get_regions(img_type)
        
        results = []
        bigger_results = []
        for region in regions:
            rounded = extract_and_round_corners(img, region, corner_radius)
            padded = pad_image(rounded, padding)
            results.append(padded)
            padded_region = (region[0] - padding*2, region[1] - padding*2, region[2] + padding*2, region[3] + padding*2)
            bigger = extract(img, padded_region)
            bigger_results.append(bigger)
        
        if img_type in [1, 2]:  # Three-card layouts
            for i, result in enumerate(results, 1):
                output_path = f"{output_base}{i}.png"
                result.save(output_path)
                bigger_path = f"{output_base}{i}_nocrop.png"
                bigger_results[i-1].save(bigger_path)
        else:  # Single-card layout
            output_path = f"{output_base}{level}.png"
            results[0].save(output_path)
            bigger_path = f"{output_base}{level}_nocrop.png"
            bigger_results[0].save(bigger_path)

def extract_template(input_path, output_path, img_type, padding):
    with Image.open(input_path) as img:
        regions = get_regions(img_type)
        
        for i, region in enumerate(regions, 1):
            # Calculate the absolute coordinates of the template within the image
            abs_template_region = (
                region[0] + TEMPLATE_REGION[0] - padding,
                region[1] + TEMPLATE_REGION[1] - padding,
                region[0] + TEMPLATE_REGION[2] - padding,
                region[1] + TEMPLATE_REGION[3] - padding
            )
            
            template = img.crop(abs_template_region)
            
            # Modify the output filename to include the region number
            base, ext = os.path.splitext(output_path)
            region_output_path = f"{base}{i}{ext}"
            
            template.save(region_output_path)
            
        if img_type != 1:
            print(f"Note: Only one template was extracted for image type {img_type}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Process images with template matching and multiple ROIs")
    parser.add_argument("input_path", help="Path to the input image")
    parser.add_argument("output_path", help="Path to save the output image")
    parser.add_argument("--corner_radius", type=int, default=20, help="Corner radius for rounding")
    parser.add_argument("--padding", type=int, default=21, help="Padding in pixels")
    parser.add_argument("--extract_template", action="store_true", help="Extract template instead of processing")
    parser.add_argument("--image_type", type=int, choices=[1, 2, 3, 4], help="Image type for template extraction")
    
    args = parser.parse_args()
    
    if args.extract_template:
        if args.image_type is None:
            parser.error("--image_type is required when using --extract_template")
        extract_template(args.input_path, args.output_path, args.image_type, args.padding)
    else:
        process_image(args.input_path, args.output_path, args.corner_radius, args.padding)
