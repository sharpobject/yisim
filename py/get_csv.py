import sqlite3
import csv

con = sqlite3.connect("db/yisim.sqlite")
cur = con.cursor()

cur.execute('select BATCH_ID, B1, B2, B3, B4, B5, B6, B7, B8, T_SIGMOID FROM BATTLE WHERE BATCH_ID <> 1')

foo = {};

for x in cur:
    if x[1] not in foo:
        foo[x[1]] = {}
    if x[2] not in foo[x[1]]:
        foo[x[1]][x[2]] = {}
    if x[3] not in foo[x[1]][x[2]]:
        foo[x[1]][x[2]][x[3]] = {}
    if x[4] not in foo[x[1]][x[2]][x[3]]:
        foo[x[1]][x[2]][x[3]][x[4]] = {}
    if x[5] not in foo[x[1]][x[2]][x[3]][x[4]]:
        foo[x[1]][x[2]][x[3]][x[4]][x[5]] = {}
    if x[6] not in foo[x[1]][x[2]][x[3]][x[4]][x[5]]:
        foo[x[1]][x[2]][x[3]][x[4]][x[5]][x[6]] = {}
    if x[7] not in foo[x[1]][x[2]][x[3]][x[4]][x[5]][x[6]]:
        foo[x[1]][x[2]][x[3]][x[4]][x[5]][x[6]][x[7]] = {}
    if x[8] not in foo[x[1]][x[2]][x[3]][x[4]][x[5]][x[6]][x[7]]:
        foo[x[1]][x[2]][x[3]][x[4]][x[5]][x[6]][x[7]][x[8]] = {}
    foo[x[1]][x[2]][x[3]][x[4]][x[5]][x[6]][x[7]][x[8]][x[0]] = 1 if x[9] > 0 else 0

# Writing data to CSV
with open('a.csv', 'w', newline='') as csvfile:
    fieldnames = ['B1', 'B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'B8']
    for i in range(28):
        fieldnames.append(str(i+2))
    writer = csv.writer(csvfile)
    # writer.writeheader()
    for b1 in foo:
        d1 = foo[b1]
        for b2 in d1:
            d2 = d1[b2]
            for b3 in d2:
                d3 = d2[b3]
                for b4 in d3:
                    d4 = d3[b4]
                    for b5 in d4:
                        d5 = d4[b5]
                        for b6 in d5:
                            d6 = d5[b6]
                            for b7 in d6:
                                d7 = d6[b7]
                                for b8 in d7:
                                    d8 = d7[b8]
                                    row = [b1, b2, b3, b4, b5, b6, b7, b8]
                                    print(d8)
                                    for i in range(28):
                                        row.append(d8[i+2] if i+2 in d8 else -1)
                                    writer.writerow(row)
