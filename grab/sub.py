import argparse
from PIL import Image
import numpy as np
import cv2
from scipy.ndimage import convolve1d
from itertools import product

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
    
    return np.clip(result, 0, 255).astype(np.uint8)

def find_best_subpixel_offset(img_path, template_path):
    """Find the best subpixel offset using template matching."""
    # Load the input image
    with Image.open(img_path) as img:
        if img.width != 1920:
            raise ValueError("Expected 1920px wide image")
            
        # Load the template
        template = cv2.imread(template_path, cv2.IMREAD_GRAYSCALE)
        if template is None:
            raise FileNotFoundError(f"Could not load template: {template_path}")
        
        # Generate offsets to try
        yoff = 0.48
        xoff = 0.08
        x_offsets = np.arange(xoff-.1, xoff+.1, .01)
        y_offsets = np.arange(yoff-.1, yoff+.1, .01)
        offsets = list(product(x_offsets, y_offsets))
        best_score = -1
        best_offset = None
        best_roi = None
        
        total_combinations = len(offsets)
        current = 0
        
        for offset_y, offset_x in offsets:
            current += 1
            if current % 20 == 0:
                print(f"Trying combination {current}/{total_combinations}...")
            
            # Apply Magic Kernel Sharp with current offsets
            upscaled = apply_magic_kernel_sharp(img, 4/3, offset_x, offset_y)
            
            # Extract the template region (using your coordinates)
            x, y = 624-353+21, 873-136+21  # Your template region coordinates
            roi = upscaled[y:y+template.shape[0], x:x+template.shape[1]]
            
            # Convert to grayscale for template matching
            roi = cv2.cvtColor(roi, cv2.COLOR_RGB2GRAY)
            
            if roi.shape != template.shape:
                continue
                
            # Perform template matching
            score = cv2.matchTemplate(roi, template, cv2.TM_CCOEFF_NORMED)[0][0]
            
            if score > best_score:
                best_score = score
                best_offset = (offset_x, offset_y)
                best_roi = roi
                Image.fromarray(roi).save("best_roi.png")
                print(f"New best score: {score:.4f} at offset ({offset_x:.2f}, {offset_y:.2f})")

        print(f"\nBest match found:")
        print(f"Score: {best_score:.4f}")
        print(f"X offset: {best_offset[0]:.2f}")
        print(f"Y offset: {best_offset[1]:.2f}")
        
        # Generate final image with best offsets
        final_image = apply_magic_kernel_sharp(img, 4/3, best_offset[0], best_offset[1])
        return final_image, best_offset, best_score

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Find best subpixel offset and upscale")
    parser.add_argument("input_path", help="Path to the input image")
    parser.add_argument("template_path", help="Path to the template image")
    parser.add_argument("output_path", help="Path to save the output image")
    
    args = parser.parse_args()
    
    final_image, best_offset, best_score = find_best_subpixel_offset(args.input_path, args.template_path)
    Image.fromarray(final_image).save(args.output_path)
