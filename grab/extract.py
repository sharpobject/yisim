import argparse
from PIL import Image, ImageDraw
import numpy as np
import cv2
import os
from scipy.ndimage import convolve1d
from collections import deque
import json

# Load the JSON data
with open('../swogi.json') as f:
    card_data = json.load(f)

qi_cost_mask = np.array(Image.open('qi_cost_mask.png').convert('L'))
hp_cost_mask = np.array(Image.open('hp_cost_mask.png').convert('L'))
always_mask = np.array(Image.open('always_mask.png').convert('L'))
lv2_mask = np.array(Image.open('lv2_mask.png').convert('L'))
lv3_mask = np.array(Image.open('lv3_mask.png').convert('L'))

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

# also define a single two-card layout.
BASE_REGIONS[5] = (BASE_REGIONS[1][0] + H_OFFSET//2, BASE_REGIONS[1][1], BASE_REGIONS[1][2] + H_OFFSET//2, BASE_REGIONS[1][3])

def apply_magic_kernel_sharp(img, scale_factor, offset_x=0, offset_y=0):
    """Apply Magic Kernel Sharp 2021 for 4/3 upscaling with subpixel offset."""
    # Convert PIL Image to numpy array
    img_array = np.array(img)

    # Calculate dimensions
    height, width = img_array.shape[:2]
    new_width = int(width * scale_factor)
    new_height = int(height * scale_factor)

    # Do upscaling in float32 for precision
    result = np.zeros((new_height, new_width, img_array.shape[2]), dtype=np.float32)

    # Create coordinate grids with subpixel offsets
    x_coords = (np.arange(new_width) - offset_x) / scale_factor
    y_coords = (np.arange(new_height) - offset_y) / scale_factor

    # Use OpenCV's remap for efficient resampling
    map_x, map_y = np.meshgrid(x_coords, y_coords)
    result = cv2.remap(img_array.astype(np.float32),
                      map_x.astype(np.float32),
                      map_y.astype(np.float32),
                      cv2.INTER_CUBIC)

    # Apply Sharp 2021 kernel
    sharp_kernel = np.array([-1, 6, -35, 204, -35, 6, -1]) / 144

    # Apply separably in x and y directions
    result = convolve1d(result, sharp_kernel, axis=0, mode='reflect')
    result = convolve1d(result, sharp_kernel, axis=1, mode='reflect')

    result = np.clip(result, 0, 255).astype(np.uint8)
    return Image.fromarray(result)

def get_regions(img_type):
    base = BASE_REGIONS[img_type]
    if img_type in [1, 2]:
        return [
            base,
            (base[0] + H_OFFSET, base[1], base[2] + H_OFFSET, base[3]),
            (base[0] + 2*H_OFFSET, base[1], base[2] + 2*H_OFFSET, base[3])
        ]
    elif img_type in [5]:
        return [
            base,
            (base[0] + H_OFFSET, base[1], base[2] + H_OFFSET, base[3])
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

def flood_fill_from_top(img_array, top_row_idx,
        initial_brightness_threshold=120,
        brightness_threshold=70):
    """
    Perform flood fill from bright pixels in the top row to capture text.
    Returns a mask of pixels to keep.
    """
    height, width = img_array.shape[:2]
    mask = np.zeros((height, width), dtype=np.uint8)
    visited = set()
    queue = deque()

    # Check top row pixels and add bright ones to queue
    top_row = img_array[top_row_idx]
    for x in range(top_row_idx+83, width-top_row_idx-28):
        # Convert RGB(A) to grayscale for brightness check
        pixel = top_row[x]
        if len(pixel) == 4:  # RGBA
            brightness = (int(pixel[0]) + int(pixel[1]) + int(pixel[2])) / 3
        else:  # RGB
            brightness = (int(pixel[0]) + int(pixel[1]) + int(pixel[2])) / 3

        if brightness >= initial_brightness_threshold:
            queue.append((top_row_idx, x))
            visited.add((top_row_idx, x))
            mask[top_row_idx, x] = 255

    # Perform flood fill
    jump_up_direction = (-5, 0)
    directions = [(-1,-1), (-1,0), (-1,1), (0,-1), (0,1), (1,-1), (1,0), (1,1)]
    while queue:
        y, x = queue.popleft()

        new_y, new_x = y + jump_up_direction[0], x + jump_up_direction[1]
        if 0 <= new_y < height and 0 <= new_x < width:
            pixel = img_array[new_y, new_x]
            brightness = (int(pixel[0]) + int(pixel[1]) + int(pixel[2])) / 3
            if brightness >= initial_brightness_threshold:
                queue.append((new_y, new_x))
                visited.add((new_y, new_x))
                mask[new_y, new_x] = 255

        for dy, dx in directions:
            new_y, new_x = y + dy, x + dx

            if (new_y, new_x) in visited:
                continue

            if 0 <= new_y < height and 0 <= new_x < width:
                mask[new_y, new_x] = 255
                for dy2, dx2 in directions:
                    new_y2, new_x2 = new_y + dy2, new_x + dx2
                    if 0 <= new_y + dy2 < height and 0 <= new_x + dx2 < width:
                        if new_y2 != new_y and new_x2 != new_x:
                            mask[new_y2, new_x2] = max(mask[new_y2, new_x2], 100)
                        else:
                            mask[new_y2, new_x2] = max(mask[new_y2, new_x2], 150)
                visited.add((new_y, new_x))
                pixel = img_array[new_y, new_x]
                if len(pixel) == 4:  # RGBA
                    brightness = (int(pixel[0]) + int(pixel[1]) + int(pixel[2])) / 3
                else:  # RGB
                    brightness = (int(pixel[0]) + int(pixel[1]) + int(pixel[2])) / 3

                if brightness >= brightness_threshold:
                    queue.append((new_y, new_x))

    return mask

def extract_and_round_corners(img, region, corner_radius, padding, masks):
    # First extract the region plus some extra space above for text
    extra_height = padding*2  # Add 50 pixels above for potential text
    extended_region = (region[0]-extra_height, region[1]-extra_height, region[2]+extra_height, region[3]+extra_height)
    result = extract(img, extended_region)

    # Convert to numpy array for flood fill
    img_array = np.array(result)

    # Get mask of text pixels to keep
    text_mask = flood_fill_from_top(img_array, extra_height)

    # Create base mask for rounded corners
    corner_mask = Image.new('L', result.size, 0)
    draw = ImageDraw.Draw(corner_mask)

    # Draw rounded corners
    draw.pieslice((extra_height, extra_height, extra_height +corner_radius * 2, extra_height + corner_radius * 2), 180, 270, fill=255)
    draw.pieslice((extra_height, result.height - extra_height - corner_radius * 2-1, extra_height + corner_radius * 2, result.height - extra_height - 1), 90, 180, fill=255)
    draw.pieslice((result.width - extra_height - corner_radius * 2-1, extra_height, result.width - extra_height - 1, extra_height + corner_radius * 2), 270, 360, fill=255)
    draw.pieslice((result.width - extra_height - corner_radius * 2-1, result.height - extra_height - corner_radius * 2-1, result.width - extra_height - 1, result.height - extra_height - 1), 0, 90, fill=255)

    # Draw rectangles to fill the rest
    draw.rectangle((extra_height + corner_radius, extra_height, result.width - extra_height - corner_radius-1, result.height - extra_height-1), fill=255)
    draw.rectangle((extra_height, extra_height + corner_radius, result.width - extra_height-1, result.height - extra_height - corner_radius-1), fill=255)

    # Convert corner mask to numpy array
    corner_mask_array = np.array(corner_mask)

    # Combine corner mask with text mask
    final_mask = np.maximum(corner_mask_array, text_mask)
    for mask in masks:
        final_mask = np.maximum(final_mask, mask)
    final_mask = final_mask.astype(np.uint8)

    # Convert mask back to PIL image
    final_mask_img = Image.fromarray(final_mask, mode='L')

    # Apply the mask
    result.putalpha(final_mask_img)

    return result
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

def classify_image(img, padding, output_dir, k_threecards=0.7):
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

    for img_type in [1, 2, 5]:  # Three-card layouts
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

    if best_single_card_score < best_three_card_score:
        print(f"Found three-card layout type {best_three_card_type} with minimum score {best_three_card_score}")
        return (best_three_card_type, None)

    print(f"Found single-card layout type {best_single_card_result[0]} with template {best_single_card_result[1]} (score {best_single_card_score})")
    return best_single_card_result

def process_image(input_path, output_base, corner_radius, padding):
    with Image.open(input_path) as img:
        if img.width == 1920:
            print(f"Upscaling from 1920x{img.height} to 2560x{int(img.height * 4/3)}")
            result = apply_magic_kernel_sharp(img, 4/3, 0.53, 0.07)
            #result.save(args.output_path+".png")
            #return
            img = result
        if img.width == 1366:
            ratio = 2560/img.width
            print(f"Upsaling from {img.width}x{img.height} to 2560x{int(img.height*ratio)}")
            result = apply_magic_kernel_sharp(img, ratio, 0.53, 0.07)
            img = result
        if img.height == 1440:
            new_img = Image.new('RGB', (img.width, img.height + 136), (0, 0, 0))
            new_img.paste(img, (0, 136))
            img = new_img
        if img.height == 1439:
            new_img = Image.new('RGB', (img.width, img.height + 137), (0, 0, 0))
            new_img.paste(img, (0, 137))
            img = new_img
        img_type, level = classify_image(img, padding, os.path.dirname(output_base))
        regions = get_regions(img_type)

        results = []
        bigger_results = []
        for idx,region in enumerate(regions, 1):
            masks = [always_mask]
            this_level = level
            if this_level is None:
                this_level = idx
            if this_level == 2:
                masks.append(lv2_mask)
            elif this_level == 3:
                masks.append(lv3_mask)
            card_id = f"{output_base}{idx}"
            if len(card_id) > 5:
                card_id = card_id[-6:]
            if card_id.isdigit():
                base_id = card_id[:-1]
                qi_cost = 0
                hp_cost = 0
                for upgrade_level in range(1,this_level+1):
                    downgraded_id = base_id + str(upgrade_level)
                    if "qi_cost" in card_data[downgraded_id]:
                        qi_cost = card_data[downgraded_id]["qi_cost"]
                    if "hp_cost" in card_data[downgraded_id]:
                        hp_cost = card_data[downgraded_id]["hp_cost"]
                if hp_cost > 0:
                    masks.append(hp_cost_mask)
                if qi_cost > 0:
                    masks.append(qi_cost_mask)
            rounded = extract_and_round_corners(img, region, corner_radius, padding, masks)
            crop_region = (padding-1, padding-1, rounded.width-padding+1, rounded.height-padding+1)
            rounded = rounded.crop(crop_region)
            results.append(rounded)
            padded_region = (region[0] - padding*2, region[1] - padding*2, region[2] + padding*2, region[3] + padding*2)
            bigger = extract(img, padded_region)
            bigger_results.append(bigger)

        if img_type in [1, 2, 5]:  # Three-card layouts
            for i, result in enumerate(results, 1):
                output_path = f"{output_base}{i}.png"
                save(result, output_path)
                bigger_path = f"{output_base}{i}_nocrop.png"
                save(bigger_results[i-1], bigger_path)
        else:  # Single-card layout
            output_path = f"{output_base}{level}.png"
            save(results[0], output_path)
            bigger_path = f"{output_base}{level}_nocrop.png"
            save(bigger_results[0], bigger_path)

def save(img, path):
    # If file doesn't exist, save directly
    if not os.path.exists(path):
        img.save(path)
        return

    try:
        # Open existing file
        with Image.open(path) as existing:
            # Check if dimensions match
            if existing.size != img.size:
                img.save(path)
                return

            # Convert both images to RGBA if they aren't already
            if existing.mode != 'RGBA':
                existing = existing.convert('RGBA')
            if img.mode != 'RGBA':
                img = img.convert('RGBA')

            # Convert to numpy arrays for efficient comparison
            existing_array = np.array(existing)
            new_array = np.array(img)

            # Get alpha channels
            existing_alpha = existing_array[:, :, 3]
            new_alpha = new_array[:, :, 3]

            # First check if alpha channels are different
            if not np.array_equal(existing_alpha, new_alpha):
                img.save(path)
                return

            # Create masks for non-transparent pixels
            non_transparent = (new_alpha != 0)

            # Compare RGB values only where alpha is non-zero
            for channel in range(3):  # RGB channels
                if not np.array_equal(
                    existing_array[:, :, channel][non_transparent],
                    new_array[:, :, channel][non_transparent]
                ):
                    img.save(path)
                    return

    except Exception as e:
        # If there's any error reading the existing file, save the new one
        print(f"Warning: Error comparing images ({str(e)}), overwriting {path}")
        img.save(path)

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
