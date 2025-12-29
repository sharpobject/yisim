#!/usr/bin/env python3
"""
Analyze talent occurrences - maps talent names to their IDs and metadata.
"""

import json
import sys
from collections import defaultdict

# Claude-provided translations for missing English names
CLAUDE_TRANSLATIONS = {
    "血痕记忆": "Memory of Blood Scars (Claude translation)",
    "身轻如燕": "Light as a Swallow (Claude translation)",
    "逆境不弃": "Unyielding in Adversity (Claude translation)",
    "疾驰不休": "Tireless Sprint (Claude translation)",
    "传承不绝": "Endless Inheritance (Claude translation)",
}

def analyze_talents(version_dir):
    params = json.load(open(f'{version_dir}/talent_params.json'))
    fates = json.load(open(f'{version_dir}/immortal_fates.json'))
    
    fate_lookup = {f['id']: f for f in fates}
    
    # Group by base_id (field_2) which is the canonical ID
    by_base_id = defaultdict(list)
    
    for p in params:
        base_id = p.get('field_2', p['field_1'])
        by_base_id[base_id].append(p)
    
    # Build summary for each base_id
    results = []
    
    for base_id, entries in sorted(by_base_id.items()):
        ids = [e['field_1'] for e in entries]
        phases = [e.get('field_6') for e in entries]
        
        # Get names - prefer from fate_lookup, fall back to desc
        name_cn = None
        name_en = None
        
        # Try to get from any of the IDs in fate_lookup
        for e in entries:
            fate = fate_lookup.get(e['field_1'])
            if fate:
                name_cn = fate.get('name_cn')
                name_en = fate.get('name_en')
                break
        
        # Fall back to desc field
        if not name_cn:
            for e in entries:
                if e.get('desc'):
                    name_cn = e['desc']
                    break
        
        if not name_cn:
            name_cn = f"(unknown base_id {base_id})"
        
        # Apply Claude translations if needed
        if not name_en or name_en == '?':
            name_en = CLAUDE_TRANSLATIONS.get(name_cn, name_cn)
        
        # Check for field_7 (sect) and field_8 (character)
        field_7_values = set(e.get('field_7') for e in entries if e.get('field_7'))
        field_8_values = set(e.get('field_8') for e in entries if e.get('field_8'))
        
        # Check if has variants (multiple entries with different phases)
        unique_phases = set(phases)
        
        # Determine type
        if field_8_values:
            talent_type = "character-specific"
        elif field_7_values:
            sects = sorted(field_7_values)
            talent_type = f"sect-pool (sect {sects})"
        elif len(entries) > 1:
            talent_type = "generic (has variants)"
        else:
            talent_type = "orphan (no variants)"
        
        # Other params summary
        other_params = [e.get('otherParams', []) for e in entries]
        has_field_4 = any(e.get('field_4') for e in entries)
        has_field_10 = any(e.get('field_10') for e in entries)
        
        results.append({
            'base_id': base_id,
            'name_cn': name_cn,
            'name_en': name_en,
            'count': len(entries),
            'ids': ids,
            'phases': phases,
            'type': talent_type,
            'field_7': list(field_7_values) if field_7_values else None,
            'field_8': list(field_8_values) if field_8_values else None,
            'has_field_4': has_field_4,
            'has_field_10': has_field_10,
            'other_params': other_params,
        })
    
    # Sort by count descending, then by base_id
    results.sort(key=lambda x: (-x['count'], x['base_id']))
    
    return results

def print_summary(results):
    print(f"{'Name (EN)':<45} {'Name (CN)':<15} {'#':>3} {'Type':<25} {'Base ID':>7} {'IDs'}")
    print("=" * 130)
    
    for r in results:
        name_en = r['name_en'][:44] if len(r['name_en']) > 44 else r['name_en']
        ids_str = str(r['ids'][:3])
        if len(r['ids']) > 3:
            ids_str = ids_str[:-1] + f", ...+{len(r['ids'])-3}]"
        
        print(f"{name_en:<45} {r['name_cn']:<15} {r['count']:>3} {r['type']:<25} {r['base_id']:>7} {ids_str}")

def main():
    version_dir = sys.argv[1] if len(sys.argv) > 1 else '1.5.9'
    
    results = analyze_talents(version_dir)
    
    # Print summary
    print_summary(results)
    
    # Also save full JSON
    output_file = f'{version_dir}/talent_analysis.json'
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(results, f, indent=2, ensure_ascii=False)
    
    print(f"\nFull analysis saved to: {output_file}")
    
    # Stats
    print(f"\n=== STATS ===")
    print(f"Total unique talents (by base_id): {len(results)}")
    print(f"Character-specific: {sum(1 for r in results if 'character' in r['type'])}")
    print(f"Sect-pool: {sum(1 for r in results if 'sect' in r['type'])}")
    print(f"Generic with variants: {sum(1 for r in results if 'generic' in r['type'])}")
    print(f"Orphans: {sum(1 for r in results if 'orphan' in r['type'])}")

if __name__ == "__main__":
    main()
