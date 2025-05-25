import os
import subprocess
from pathlib import Path

def process_all_screenshots():
    whitelist = [
        "72505",
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
