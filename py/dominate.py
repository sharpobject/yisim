import csv

input_file = "o.csv"
output_file = "p.csv"

rows = []

def dominates(a, b):
    found_difference = False
    for k in range(10):
        if a[k+8] == 1 and b[k+8] == 0:
            return False
        if a[k+8] == 0 and b[k+8] == 1:
            found_difference = True
    return found_difference

def is_dominated(i):
    for j in range(len(rows)):
        if j == i:
            continue
        if dominates(rows[j], rows[i]):
            return True
    return False

with open(input_file, 'r') as csvfile:
    reader = csv.reader(csvfile)
    rows = [list(map(lambda x: int(x) if x.isdigit() else x, row)) for row in reader]

filtered_rows = []

# for i in range(3):
for i in range(len(rows)):
    if not is_dominated(i):
        filtered_rows.append(rows[i])

# print(filtered_rows[0])

with open(output_file, 'w', newline='') as csvfile:
    writer = csv.writer(csvfile)
    for row in filtered_rows:
        writer.writerow(row)

