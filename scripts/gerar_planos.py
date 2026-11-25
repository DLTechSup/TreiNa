# -*- coding: utf-8 -*-
"""
Gera src/data/planos.json: os planos de treino sugeridos do TreiNa.
Cada item = (id do exercício, séries, repetições, descanso em segundos).
Dias: 1=Segunda ... 7=Domingo. Os planos do TreiNa Mulher vêm de programas.json.
Rode:  python scripts/gerar_planos.py
"""
import json
import pathlib
import sys

RAIZ = pathlib.Path(__file__).resolve().parent.parent
DADOS = RAIZ / 'src' / 'data'
exercicios = {e['id']: e for e in json.loads((DADOS / 'exercicios.json').read_text(encoding='utf-8'))}
programas = json.loads((DADOS / 'programas.json').read_text(encoding='utf-8'))

SEG, TER, QUA, QUI, SEX, SAB, DOM = 1, 2, 3, 4, 5, 6, 7


def dia(numero, nome, itens):
    return {'dia': numero, 'nome': nome, 'itens': [
        {'id': i, 'series': s, 'repeticoes': r, 'descanso': d} for (i, s, r, d) in itens
    ]}


PLANOS = [
    {
        'id': 'hipertrofia-abc', 'nome': 'Hipertrofia ABC',
        'descricao': 'Peito e tríceps, costas e bíceps, pernas e ombros. 3 treinos por semana para ganhar massa.',
        'local': 'Academia', 'objetivos': ['Ganhar massa'], 'nivel': 'Intermediário',
        'dias': [
            dia(SEG, 'A · Peito e tríceps', [
                ('supino-reto', 4, '8-10', 90), ('supino-inclinado-com-halteres', 3, '10', 75),
                ('crucifixo-com-halteres', 3, '12', 60), ('voador-no-pec-deck', 3, '12-15', 60),
                ('triceps-pulley-corda', 3, '12', 60), ('triceps-testa-com-barra', 3, '10', 60),
            ]),
            dia(QUA, 'B · Costas e bíceps', [
                ('puxada-alta', 4, '10', 90), ('remada-curvada-com-barra', 4, '8-10', 90),
                ('remada-sentada-com-cabo', 3, '12', 60), ('face-pull', 3, '15', 45),
                ('rosca-direta-com-barra', 3, '10', 60), ('rosca-martelo', 3, '12', 60),
            ]),
            dia(SEX, 'C · Pernas e ombros', [
                ('agachamento-barra', 4, '8-10', 120), ('leg-press', 4, '12', 90),
                ('cadeira-extensora', 3, '12', 60), ('mesa-flexora', 3, '12', 60),
                ('desenvolvimento-de-ombro-no-banco-com-halteres', 3, '10', 75),
                ('elevacao-lateral-de-bracos-com-halteres', 3, '12-15', 45),
                ('elevacao-de-panturrilha-em-maquina-em-pe', 4, '15', 45),
            ]),
        ],
    },
    {
        'id': 'corpo-inteiro-iniciante', 'nome': 'Corpo inteiro para iniciantes',
        'descricao': 'Dois treinos (A e B) que trabalham o corpo todo, alternados 3 vezes por semana. Ótimo para começar.',
        'local': 'Academia', 'objetivos': ['Ganhar massa', 'Emagrecer', 'Condicionamento'], 'nivel': 'Iniciante',
        'dias': [
            dia(SEG, 'A · Corpo inteiro', [
                ('leg-press', 3, '12', 60), ('supino-reto-na-maquina', 3, '12', 60),
                ('puxada-alta', 3, '12', 60), ('desenvolvimento-de-ombro-na-maquina', 3, '12', 60),
                ('mesa-flexora', 3, '12', 60), ('contracao-abdominal', 3, '15', 45),
            ]),
            dia(QUA, 'B · Corpo inteiro', [
                ('agachamento-goblet-com-haltere', 3, '12', 60), ('supino-inclinado-com-halteres', 3, '12', 60),
                ('remada-sentada-na-maquina', 3, '12', 60), ('cadeira-extensora', 3, '12', 60),
                ('rosca-direta-com-barra', 3, '12', 45), ('triceps-pulley-corda', 3, '12', 45),
            ]),
            dia(SEX, 'A · Corpo inteiro', [
                ('leg-press', 3, '12', 60), ('supino-reto-na-maquina', 3, '12', 60),
                ('puxada-alta', 3, '12', 60), ('desenvolvimento-de-ombro-na-maquina', 3, '12', 60),
                ('mesa-flexora', 3, '12', 60), ('contracao-abdominal', 3, '15', 45),
            ]),
        ],
    },
    {
        'id': 'superiores-inferiores', 'nome': 'Superiores e inferiores (4x)',
        'descricao': 'Divisão clássica de academia: 2 treinos de parte de cima e 2 de pernas por semana. Bom para ganhar força e massa.',
        'local': 'Academia', 'objetivos': ['Ganhar massa'], 'nivel': 'Intermediário',
        'dias': [
            dia(SEG, 'Superiores A', [
                ('supino-reto', 4, '8-10', 90), ('remada-curvada-com-barra', 4, '8-10', 90),
                ('desenvolvimento-militar-com-barra', 3, '8-10', 90), ('puxada-alta', 3, '10', 75),
                ('rosca-direta-com-barra', 3, '10', 60), ('triceps-pulley-barra', 3, '12', 60),
            ]),
            dia(TER, 'Inferiores A', [
                ('agachamento-barra', 4, '6-8', 120), ('levantamento-terra-romeno', 3, '8-10', 90),
                ('leg-press', 3, '12', 90), ('mesa-flexora', 3, '12', 60),
                ('elevacao-de-panturrilha-em-maquina-em-pe', 4, '12-15', 45),
            ]),
            dia(QUI, 'Superiores B', [
                ('supino-inclinado-com-halteres', 4, '10', 90), ('puxada-alta-com-triangulo', 4, '10', 75),
                ('desenvolvimento-arnold', 3, '10', 75), ('remada-sentada-com-cabo', 3, '12', 60),
                ('rosca-martelo', 3, '12', 60), ('triceps-frances-com-halteres', 3, '12', 60),
            ]),
            dia(SEX, 'Inferiores B', [
                ('agachamento-na-maquina-hack', 4, '10', 90), ('elevacao-pelvica-com-barra', 4, '10', 90),
                ('cadeira-extensora', 3, '15', 60), ('cadeira-flexora', 3, '12', 60),
                ('afundo-com-halteres', 3, '10 cada perna', 60), ('elevacao-de-panturrilha-sentado-com-alavanca', 4, '15', 45),
            ]),
        ],
    },
    {
        'id': 'emagrecer-forca-cardio', 'nome': 'Emagrecer: musculação + cardio',
        'descricao': 'Musculação com descanso curto e cardio no fim de cada treino. 4 dias por semana.',
        'local': 'Academia', 'objetivos': ['Emagrecer'], 'nivel': 'Iniciante',
        'dias': [
            dia(SEG, 'Pernas + esteira', [
                ('agachamento-goblet-com-haltere', 3, '15', 45), ('leg-press', 3, '15', 45),
                ('afundo-com-halteres', 3, '12 cada perna', 45), ('mesa-flexora', 3, '15', 45),
                ('elevacao-pelvica-com-barra', 3, '15', 45), ('esteira-com-inclinacao', 1, '20 min', 0),
            ]),
            dia(TER, 'Parte de cima + bike', [
                ('supino-com-halteres', 3, '15', 45), ('puxada-alta', 3, '15', 45),
                ('desenvolvimento-de-ombro-na-maquina', 3, '15', 45), ('remada-sentada-com-cabo', 3, '15', 45),
                ('triceps-pulley-corda', 3, '15', 30), ('bike', 1, '20 min', 0),
            ]),
            dia(QUI, 'Pernas e glúteo + esteira', [
                ('agachamento-no-smith', 3, '15', 45), ('stiff-com-halter', 3, '15', 45),
                ('cadeira-extensora', 3, '15', 45), ('maquina-de-abducao-de-quadril', 3, '20', 30),
                ('elevacao-de-panturrilha-em-maquina-em-pe', 3, '20', 30), ('esteira-com-inclinacao', 1, '20 min', 0),
            ]),
            dia(SEX, 'Parte de cima + tiros na bike', [
                ('supino-reto-na-maquina', 3, '15', 45), ('remada-curvada-com-halteres', 3, '15', 45),
                ('elevacao-lateral-de-bracos-com-halteres', 3, '15', 30), ('rosca-martelo', 3, '15', 30),
                ('triceps-pulley-corda', 3, '15', 30), ('airbike', 8, '30 s', 30),
            ]),
        ],
    },
    {
        'id': 'condicionamento-academia', 'nome': 'Condicionamento na academia',
        'descricao': 'Circuitos com máquinas e halteres, descanso curto e cardio. Para ganhar fôlego e resistência.',
        'local': 'Academia', 'objetivos': ['Condicionamento', 'Emagrecer'], 'nivel': 'Iniciante',
        'dias': [
            dia(SEG, 'Circuito 1', [
                ('esteira-ergometrica', 1, '10 min', 60), ('agachamento-goblet-com-haltere', 3, '15', 30),
                ('supino-com-halteres', 3, '15', 30), ('remada-sentada-com-cabo', 3, '15', 30),
                ('desenvolvimento-de-ombro-na-maquina', 3, '15', 30), ('airbike', 6, '30 s', 30),
            ]),
            dia(QUA, 'Circuito 2', [
                ('bike', 1, '10 min', 60), ('leg-press', 3, '15', 30), ('puxada-alta', 3, '15', 30),
                ('supino-reto-na-maquina', 3, '15', 30), ('mesa-flexora', 3, '15', 30),
                ('maquina-de-remo', 4, '2 min', 60),
            ]),
            dia(SEX, 'Cardio longo', [
                ('esteira-com-inclinacao', 1, '30 min', 0), ('bike', 1, '15 min', 0),
            ]),
        ],
    },
    {
        'id': 'mobilidade-diaria', 'nome': 'Mobilidade e alongamento',
        'descricao': 'Sessões curtas (15 min) para soltar quadril, coluna e ombros. Boas para antes do treino ou nos dias de descanso.',
        'local': 'Academia', 'objetivos': ['Mobilidade'], 'nivel': 'Iniciante',
        'dias': [
            dia(SEG, 'Quadril e pernas', [
                ('alongamento-de-quadril-90-90', 2, '40 s', 15), ('alongamento-dos-flexores-de-quadril-ajoelhado', 2, '30 s cada lado', 15),
                ('alongamento-de-isquiotibiais-em-pe', 2, '30 s', 15), ('alongamento-piriforme', 2, '30 s cada lado', 15),
                ('alongamento-borboleta', 2, '40 s', 15),
            ]),
            dia(QUA, 'Coluna e ombros', [
                ('rotacao-da-coluna-toracica-de-joelhos', 2, '10 cada lado', 15), ('circulos-com-os-bracos', 2, '30 s', 15),
                ('alongamento-do-peitoral-e-do-ombro-na-porta', 2, '30 s', 15), ('alongamento-de-ombro-com-o-braco-cruzado', 2, '30 s cada lado', 15),
                ('rotacao-espinhal-deitado', 2, '30 s cada lado', 15),
            ]),
            dia(SEX, 'Corpo inteiro', [
                ('alongamento-em-pe-dos-quadriceps', 2, '30 s cada lado', 15), ('alongamento-de-panturrilha-na-parede', 2, '30 s cada lado', 15),
                ('postura-da-cobra-alongamento-abdominal', 2, '30 s', 15), ('alongamento-inclinado-lateral-em-pe', 2, '30 s cada lado', 15),
                ('alongamento-das-costas-com-rolo-de-espuma', 2, '40 s', 15),
            ]),
        ],
    },
]

# TreiNa Mulher: os 2 programas da área feminina
SIGLA = {'Seg': SEG, 'Ter': TER, 'Qua': QUA, 'Qui': QUI, 'Sex': SEX, 'Sáb': SAB, 'Sab': SAB, 'Dom': DOM}
for i, p in enumerate(programas):
    local = 'Academia' if p['local'].startswith('Academia') else 'Casa'
    PLANOS.append({
        'id': f'treina-mulher-{i + 1}', 'nome': f"TreiNa Mulher: {p['nome']}",
        'descricao': 'Plano da área feminina: glúteo, pernas, posterior de coxa e ombros com volume. 4 dias na academia.',
        'local': local, 'objetivos': ['Ganhar massa', 'Emagrecer'], 'nivel': 'Intermediário', 'mulher': True,
        'dias': [
            {'dia': SIGLA[d['dia']], 'nome': d['titulo'], 'itens': [
                {'id': x['id'], 'series': x['series'], 'repeticoes': x['repeticoes'], 'descanso': x['descanso']}
                for x in d['exercicios']
            ]} for d in p['dias']
        ],
    })

# Confere se todo exercício existe e completa os grupos de cada dia
faltando = []
for p in PLANOS:
    for d in p['dias']:
        grupos = []
        for it in d['itens']:
            e = exercicios.get(it['id'])
            if not e:
                faltando.append(f"{p['id']}: {it['id']}")
                continue
            if e['grupo'] not in grupos:
                grupos.append(e['grupo'])
        d['grupos'] = grupos

if faltando:
    print('Exercícios que não existem na biblioteca:\n  ' + '\n  '.join(faltando))
    sys.exit(1)

(DADOS / 'planos.json').write_text(json.dumps(PLANOS, ensure_ascii=False, indent=1), encoding='utf-8')
print(f'{len(PLANOS)} planos gravados em src/data/planos.json')
