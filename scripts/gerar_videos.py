# -*- coding: utf-8 -*-
"""Gera src/data/exercicios_video.json a partir da lista de vídeos próprios (pasta de vídeos próprios no PC).

Os VÍDEOS não entram no site nem no repositório: ficam no armazenamento privado (Supabase Storage)
e são guardados no celular na "Atualização de vídeos". Aqui só vão nomes, grupos e a chave de cada arquivo.

Uso: python scripts/gerar_videos.py lista.json
  lista.json = [{"name": "Peito/Supino Reto com Barra.mp4", "size": 123}, ...]
"""
import json, re, sys, collections, unicodedata
sys.path.insert(0, '/home/claude/fase1')
from padroes import P, REGRAS, TEMPO_KW  # noqa: E402
from montar_csv import norm, slug, titulo, equipamento, CABO_EXTRA  # noqa: E402

PASTA_GRUPO = {
    'Abdomen': 'Abdômen', 'Antebraco': 'Antebraço', 'Biceps': 'Bíceps', 'Dorsal': 'Costas',
    'Ombro': 'Ombros', 'Peito': 'Peito', 'Pernas e Gluteos': 'Pernas', 'Triceps': 'Tríceps',
}
GLUTEO = {'abducao', 'coice', 'elevacao_pelvica'}
# correções de grafia comuns nos nomes dos arquivos
CORRIGE = {'Isometrica': 'Isométrica', 'Gluteo': 'Glúteo', 'Gluteos': 'Glúteos', 'Triceps': 'Tríceps',
           'Biceps': 'Bíceps', 'Abdomen': 'Abdômen', 'polia': 'Polia', 'Sumo': 'Sumô'}


# regras extras para nomes destes vídeos (antes das regras gerais)
EXTRA = [
    (r'^abducao', 'abducao'),
    (r'flexao de joelhos', 'flexora'),
    (r'flexao de quadril', 'flexao_quadril'),
    (r'^posterior de coxa', 'flexora'),
    (r'^flexao de braco \(pegada fechada\)|^triceps na parede', 'empurrar_fechado'),
    (r'^triceps banco', 'mergulho'),
    (r'^biceps .*polia', 'rosca'),
    (r'lombar', 'lombar'),
    (r'barra horizontal', 'remada'),
    (r'manguito rotador', 'mob_ombro'),
    (r'flexor', 'flexora'),
    (r'4 apoios|graviton', 'coice'),
    (r'^recuo', 'afundo'),
    (r'sobe desce|subida no caixote', 'unilateral'),
]


# aparelho quando o nome não diz (ou diz de um jeito diferente)
EQUIP_EXTRA = [
    (r'caneleira', 'Caneleira'),
    (r'remada baixa', 'Cabo / polia'),
    (r'remada cavalinho', 'Barra'),
    (r'articulad|graviton|leg horizontal|^flexora|cadeira', 'Máquina'),
    (r'^puxada (neutra|unilateral|aberta|fechada|supinada|pronada)', 'Cabo / polia'),
    (r'crucifixo inverso (sentado|no banco)|arnold|elevacao frontal alternada|rosca .*banco inclinado|rosca martelo 21|triceps coice no banco', 'Halteres'),
    (r'rosca de punho|^banco supino', 'Barra'),
    (r'hiperextensao|banco lombar', 'Banco'),
]


def classificar(nome, grupo):
    n = norm(nome)
    for rx, pid in EXTRA:
        if re.search(rx, n):
            return pid
    for pid, rx, grupos in REGRAS:
        if grupos and grupo not in grupos:
            continue
        if re.search(rx, n):
            return pid
    return None


def main(caminho):
    lista = json.load(open(caminho, encoding='utf-8'))
    arquivos = sorted([f for f in lista if f['name'].lower().endswith('.mp4')], key=lambda f: f['name'])
    saida, ids, chaves, sem_regra, locais = [], collections.Counter(), collections.Counter(), [], []
    for f in arquivos:
        rel = f['name'].replace('\\', '/')
        pasta, arq = rel.split('/', 1)
        base = re.sub(r'\.mp4$', '', arq, flags=re.I)
        grupo = PASTA_GRUPO.get(pasta, pasta)
        nome = titulo(' '.join(CORRIGE.get(w, w) for w in base.split()))
        n = norm(base)
        if grupo == 'Abdômen':
            pid = classificar(base, grupo) if re.search(r'^(remada|puxada|supino|agachamento)', n) else None
            pid = pid if pid else ('isometria' if re.search(r'prancha|isometr', n) else 'core')
        else:
            pid = classificar(base, grupo)
        if pid is None:
            sem_regra.append(rel)
            pid = {'Antebraço': 'punho_flex', 'Bíceps': 'rosca', 'Tríceps': 'triceps', 'Costas': 'remada',
                   'Ombros': 'elevacao_lateral', 'Peito': 'supino', 'Pernas': 'agachamento'}.get(grupo, 'core')
        if pasta == 'Pernas e Gluteos':
            grupo = 'Glúteos' if pid in GLUTEO else ('Panturrilha' if pid.startswith('panturrilha') else 'Pernas')
        if pid == 'encolhimento':
            grupo = 'Trapézio'
        if pid == 'mob_ombro':
            grupo = 'Ombros'
        if pid == 'lombar' and grupo == 'Abdômen':
            grupo = 'Costas'
        p = P[pid]
        eq = next((e for rx, e in EQUIP_EXTRA if re.search(rx, n)), None) or equipamento(n)
        if eq == 'Peso corporal' and re.search(CABO_EXTRA, n):
            eq = 'Cabo / polia'
        if eq == 'Peso corporal' and re.search(r'polia|cross', n):
            eq = 'Cabo / polia'
        medida = 'tempo' if re.search(TEMPO_KW, n) else p['medida']
        sec = [s.strip() for s in p['secundarios'].split(',') if s.strip()] if isinstance(p['secundarios'], str) else p['secundarios']
        b = 'v-' + slug(nome)
        ids[b] += 1
        if ids[b] > 1:
            b = f'{b}-{ids[b]}'
        chave = f'{slug(pasta)}/{slug(base)}.mp4'
        chaves[chave] += 1
        if chaves[chave] > 1:
            chave = chave.replace('.mp4', f'-{chaves[chave]}.mp4')
        saida.append(dict(id=b, nome=nome, grupo=grupo, padrao=p['nome'], equipamento=eq, tipo=p['tipo'],
                          medida=medida, secundarios=sec, passos=p['passos'], erro=p['erro'], foco=p['foco'] or '',
                          video=chave, bytes=f.get('size', 0)))
        locais.append({'arquivo': rel, 'chave': chave})
    assert len({e['id'] for e in saida}) == len(saida)
    json.dump(saida, open('src/data/exercicios_video.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
    # nome do arquivo no PC -> chave na nuvem (só para a prévia e o preparo do envio; fica fora do repositório)
    json.dump(locais, open('lista_videos_local.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
    print('vídeos:', len(saida), '| sem regra (usou o padrão do grupo):', len(sem_regra))
    for s in sem_regra[:40]:
        print('  ', s)
    print(collections.Counter(e['grupo'] for e in saida))


if __name__ == '__main__':
    main(sys.argv[1])
