import json
import sys

# Read JSON data from stdin
json_data = json.load(sys.stdin)

# Find the maximum key value to determine the size of the outer list
max_key = max(int(k) for k in json_data.keys())

# Initialize the result list with None values
result = [None] * (max_key + 1)

# Transform the data
for outer_key, outer_value in json_data.items():
    outer_index = int(outer_key)
    
    # Find the maximum key value for the inner list
    max_inner_key = max(int(k) for k in outer_value.keys())
    
    # Initialize the inner list with None values
    inner_list = [None] * (max_inner_key + 1)
    
    # Fill in the inner list
    for inner_key, inner_value in outer_value.items():
        inner_index = int(inner_key)
        inner_list[inner_index] = inner_value
    
    # Assign the inner list to the corresponding position in the result
    result[outer_index] = inner_list

# Print the result as JSON
print(json.dumps(result, indent=2))
