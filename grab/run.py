import os
import subprocess
from pathlib import Path

lang = "zh"

def process_all_screenshots():
    global lang
    whitelist = [
        "21101",
        "21102",
        "21201",
        "21202",
        "21301",
        "21302",
        "21303",
        "21401",
        "21402",
        "21501",
        "21502",
        "21503",
        "21601",
        "22101",
        "22102",
        "22201",
        "22202",
        "22301",
        "22302",
        "22401",
        "22402",
        "22403",
        "22501",
        "22502",
        "22503",
        "22602",
        "23101",
        "23102",
        "23103",
        "23104",
        "23105",
        "23201",
        "23202",
        "23203",
        "23301",
        "23302",
        "23303",
        "23401",
        "23402",
        "23403",
        "23501",
        "23502",
        "23601",
        "24101",
        "24102",
        "24201",
        "24202",
        "24302",
        "24401",
        "24402",
        "24403",
        "24501",
        "24502",
        "24601",
        "40101",
        "40102",
        "40201",
        "40202",
        "40301",
        "40302",
        "40303",
        "40401",
        "40402",
        "40403",
        "40501",
        "40502",
        "40503",
        "40601",
        "40602",
        "50101",
        "50102",
        "50201",
        "50202",
        "50301",
        "50302",
        "50401",
        "50402",
        "50403",
        "50501",
        "50502",
        "50601",
        "50602",
        "Herbal Bath",
    ]
    # Create output directories if they don't exist
    os.makedirs(lang, exist_ok=True)
    
    # Get all PNG files from en_in directory
    input_dir = Path(lang+'_in')
    if not input_dir.exists():
        raise FileNotFoundError(lang+"_in directory not found")
    
    for input_file in sorted(input_dir.glob('*.png')):
        if not input_file.stem.startswith(tuple(whitelist)):
            continue
        # Get the base filename without extension
        base_name = input_file.stem
        
        # Construct input and output paths
        input_path = str(input_file)
        output_base = lang+f'/{base_name}'
        
        # Run extract.py with these paths
        print(f"Processing {input_path}...")
        subprocess.run(['python3', 'extract.py', input_path, output_base])

if __name__ == '__main__':
    process_all_screenshots()
