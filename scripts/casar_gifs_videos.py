import json, re, unicodedata
v=json.load(open('src/data/exercicios_video.json'))
g=json.load(open('src/data/exercicios.json'))
STOP={'de','da','do','das','dos','com','e','em','no','na','nos','nas','a','o','para','ao','os','as','um','uma'}
SIN={'halter':'halteres','haltere':'halteres','alternada':'alternado','sentada':'sentado','crossover':'cross','over':'','pulley':'polia','cabo':'polia','livre':'','reta':'reto'}
def tok(s):
    s=unicodedata.normalize('NFKD',s.lower()); s=''.join(c for c in s if not unicodedata.combining(c))
    t=[SIN.get(w,w) for w in re.findall(r'[a-z0-9]+',s)]
    return {w for w in t if w and w not in STOP}
pares=[]
for x in g:
    tx=tok(x['nome'])
    best=None
    for y in v:
        if y['grupo']!=x['grupo'] or y['equipamento']!=x['equipamento']: continue
        ty=tok(y['nome']); j=len(tx&ty)/len(tx|ty)
        if not best or j>best[0]: best=(j,y)
    if best and best[0]>=0.6: pares.append((round(best[0],2),x['id'],x['nome'],best[1]['id'],best[1]['nome']))
pares.sort(key=lambda p:-p[0])
for p in pares: print(p[0], '|', p[2], '=>', p[4])
print(len(pares))

ACEITOS_PARCIAIS = {
 'Elevação de Panturrilha no Leg Press Horizontal','Rosca Alternada com Halteres Sentado','Rosca Martelo com Halteres no Banco Scott',
 'Rosca Scott com Halteres Martelo no Banco','Agachamento Frontal com Barra no Smith','Crucifixo com Halteres Declinado',
 'Desenvolvimento de Ombro Unilateral com Halter','Elevação Frontal Alternada com Halteres','Elevação Lateral de Braços com Halteres',
 'Leg Press Unilateral','Remada Unilateral com Cabo','Rosca Concentrada com Cabo','Rosca Inversa com Barra','Rosca Unilateral com Cabo',
 'Supino com Banco Inclinado no Smith','Supino com Barra Declinado','Supino Inclinado com Barra','Supino Inclinado com Cabo',
 'Tríceps Testa com Barra','Tríceps Francês com Barra W Acima da Cabeça Sentado','Afundo na Máquina Smith','Agachamento na Máquina Hack',
 'Elevação de Panturrilha no Smith','Panturrilha em Pé no Smith','Elevação Lateral Unilateral com Cabo',
 'Elevação Unilateral de Panturrilha no Leg Press','Encolhimento com Halteres','Extensão de Tríceps com Haltere Unilateral Sentado',
 'Leg Press','Pullover com Barra','Rosca Martelo','Supino na Máquina','Supino Reto','Supino Inclinado na Máquina com Pegada Martelo',
 'Elevação de Panturrilha no Leg Press','Desenvolvimento de Ombro com Barra Sentado','Elevação Frontal com Dois Braços com Halteres',
 'Rosca de Bíceps com Halteres no Banco Scott','Tríceps Testa Pegada Neutra com Halteres','Desenvolvimento Arnold','Agachamento Frontal',
}
eq={p[1]:p[3] for p in pares if p[0]==1.0 or p[2] in ACEITOS_PARCIAIS}
json.dump(eq, open('src/data/equivalencias.json','w'), ensure_ascii=False, indent=0)
print('equivalências:', len(eq))

# Equivalências conferidas à mão (nomes diferentes, mesmo exercício)
MANUAL = {
 'Desenvolvimento de Ombro na Máquina':'Desenvolvimento Máquina (Pegada Pronada)', 'Desenvolvimento Militar com Barra':'Desenvolvimento Barra Reta',
 'Elevação de Panturrilha Sentado com Alavanca':'Panturrilha Sentado Maquina', 'Elevação de Panturrilha em Máquina em Pé':'Extensão de Panturrilha Maquina',
 'Elevação Pélvica com Barra':'Elevação de Quadril com Barra', 'Ponte de Glúteos com Barra':'Elevação de Quadril com Barra',
 'Puxada Alta':'Puxada Aberta Barra Reta', 'Puxada Alta com Triângulo':'Puxada Neutra Triangulo',
 'Remada Curvada com Barra':'Remada Curvada com Barra Reta (Pegada Pronada)', 'Remada Curvada com Halteres':'Remada Curvada com Halteres (Pegada Neutra)',
 'Remada Sentada com Cabo':'Remada Baixa Triangulo', 'Remada Sentada na Máquina':'Remada Máquina (Pegada Neutra)',
 'Rosca Direta com Barra':'Rosca Direta Barra Reta', 'Supino com Halteres':'Supino Reto com Halteres',
 'Tríceps Pulley Barra':'Tríceps na Polia com Barra Reta', 'Voador no Pec Deck':'Crucifixo Máquina', 'Voador Invertido':'Crucifixo Inverso Máquina',
 'Levantamento Terra Romeno com Halteres':'Stiff com Halteres', 'Levantamento Terra Romeno':'Stiff Pés Afastados com Barra Livre',
 'Glúteo Coice Unilateral na Polia Baixa':'Glúteos Coice na Polia', 'Abdução de Quadril com Cabo':'Abdução de Quadril na Polia Baixa Unilateral',
}
gn={x['nome']:x['id'] for x in g}; vn={y['nome']:y['id'] for y in v}
for a,b in MANUAL.items():
    if a in gn and b in vn: eq[gn[a]]=vn[b]
json.dump(eq, open('src/data/equivalencias.json','w'), ensure_ascii=False, indent=0)
print('equivalências com as manuais:', len(eq))
