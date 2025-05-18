import json

newData= {}

with open('./data.json', 'r', encoding="utf-8") as f:
    data = json.load(f)
    nomi = data["nominativ"]
    akku = data["akkusativ"]
    geni = data["genitiv"]
    dati = data["dativ"]

    newNomi = []
    newAkku = []
    newGeni = []
    newDati = []

    id = 0
    for item in nomi:
        isUniqe = 0
        for itemTest in nomi:
            if itemTest["question"] == item["question"]:
                isUniqe = isUniqe + 1

        if isUniqe == 1:
            item['id'] = 'N_' + str(id)
            newNomi.append(item)
            id = id+1 
    data['nominativ'] = newNomi
        

    id = 0
    for item in akku:
        isUniqe = 0
        for itemTest in akku:
            if itemTest["question"] == item["question"]:
                isUniqe = isUniqe + 1

        if isUniqe == 1:
            item['id'] = 'A_' + str(id)
            newAkku.append(item)
            id = id+1 
    data['akkusativ'] = newAkku


    id = 0
    for item in geni:
        isUniqe = 0
        for itemTest in geni:
            if(itemTest["question"] == item["question"]):
                isUniqe = isUniqe + 1

        if isUniqe == 1:
            item['id'] = 'G_' + str(id)
            newGeni.append(item)
            id = id+1 
    data['genitiv'] = newGeni


    id = 0
    for item in dati:
        isUniqe = 0
        for itemTest in dati:
            if(itemTest["question"] == item["question"]):
                isUniqe = isUniqe + 1

        if isUniqe == 1:
            item['id'] = 'D_' + str(id)
            newDati.append(item)
            id = id+1             
    data['dativ'] = newDati

    newData = data



with open('./data.json', 'w', encoding="utf-8") as f:
    json.dump(newData, f, ensure_ascii=False)