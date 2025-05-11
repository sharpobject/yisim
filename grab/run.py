import os
import subprocess
from pathlib import Path

def process_all_screenshots():
    whitelist = [
        "61503",
        "64101",
        "64203",
        "73301",
        "91302",
        "91402",
        "91403",
        "91404",
        "91405",
        "91508",
        "91509",
        "92403",
        "92404",
        "92405",
        "92506",
        "92507",
        "92508",
        "92509",
        "93302",
        "93403",
        "93404",
        "93506",
        "93507",
        "93508",
        "93509",
        "94404",
        "94405",
        "94406",
        "94407",
        "94505",
        "94506",
        "94507",
        "Deviation Syndrome",
    ]
    # Create output directories if they don't exist
    os.makedirs('en', exist_ok=True)
    
    # Get all PNG files from en_in directory
    input_dir = Path('en_in')
    if not input_dir.exists():
        raise FileNotFoundError("en_in directory not found")
    
    for input_file in sorted(input_dir.glob('*.png')):
        if not input_file.stem.startswith(tuple(whitelist)):
            continue
        # Get the base filename without extension
        base_name = input_file.stem
        
        # Construct input and output paths
        input_path = str(input_file)
        output_base = f'en/{base_name}'
        
        # Run extract.py with these paths
        print(f"Processing {input_path}...")
        subprocess.run(['python3', 'extract.py', input_path, output_base])

if __name__ == '__main__':
    process_all_screenshots()
