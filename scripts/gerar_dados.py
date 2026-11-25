#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TreiNa - gera os dados do app a partir das planilhas da Fase 1.

Lê:   ..\\TreiNa_Fase1\\exercicios.csv  e  ..\\TreiNa_Fase1\\programas_femininos.csv
Gera: src\\data\\exercicios.json, src\\data\\programas.json, src\\data\\midia.ts

Rode pelo ATUALIZAR_DADOS.bat sempre que editar as planilhas no Excel.
"""
import csv
import json
import sys
from pathlib import Path

APP = Path(__file__).resolve().parent.parent            # ...\TreiNa_App

# O TreiNa é focado em ACADEMIA: só estes grupos entram no app (nome do grupo no app à direita).
# Calistenia, Crossfit e Funcional/HIT ficam de fora.
GRUPOS_APP = {
    "Peitoral": "Peito", "Costas": "Costas", "Eretor Lombar": "Costas", "Ombros": "Ombros",
    "Trapézio": "Trapézio", "Bíceps": "Bíceps", "Tríceps": "Tríceps", "Antebraços": "Antebraço",
    "Pernas": "Pernas", "Glúteos": "Glúteos", "Panturrilhas": "Panturrilha",
    "Cardio": "Cardio", "Mobilidade": "Mobilidade",
}
# Equipamentos que não são de academia
FORA_DA_ACADEMIA = {"Elástico / faixa", "Toalha", "Gymstick", "TRX", "Bosu", "Bola suíça",
                    "Bola medicinal", "Pneu", "Corda", "Argolas"}
FASE1 = APP.parent / "TreiNa_Fase1"
DADOS = APP / "src" / "data"


def ler_csv(caminho):
    with open(caminho, encoding="utf-8-sig", newline="") as fh:
        return list(csv.DictReader(fh, delimiter=";"))


def main():
    csv_ex = Path(sys.argv[1]) if len(sys.argv) > 1 else FASE1 / "exercicios.csv"
    csv_pr = Path(sys.argv[2]) if len(sys.argv) > 2 else FASE1 / "programas_femininos.csv"
    linhas = ler_csv(csv_ex)

    exercicios = []
    for r in linhas:
        if r["grupo_muscular"] not in GRUPOS_APP or r["equipamento"] in FORA_DA_ACADEMIA:
            continue
        passos = [r[f"como_fazer_{i}"].strip() for i in range(1, 5) if r.get(f"como_fazer_{i}", "").strip()]
        exercicios.append({
            "id": r["id"],
            "nome": r["nome"],
            "grupo": GRUPOS_APP[r["grupo_muscular"]],
            "padrao": r["padrao_movimento"],
            "equipamento": r["equipamento"],
            "tipo": r["tipo"],
            "medida": r["medida"],
            "secundarios": [s.strip() for s in r["musculos_secundarios"].split(",") if s.strip()],
            "passos": passos,
            "erro": r["erro_comum"],
            "foco": r["foco_feminino"],
        })
    exercicios.sort(key=lambda e: e["nome"].lower())

    programas = {}
    for r in ler_csv(csv_pr):
        p = programas.setdefault(r["programa"], {"nome": r["programa"], "local": r["local"], "dias": []})
        dia = next((d for d in p["dias"] if d["dia"] == r["dia"]), None)
        if not dia:
            dia = {"dia": r["dia"], "titulo": r["treino_do_dia"], "exercicios": []}
            p["dias"].append(dia)
        dia["exercicios"].append({"id": r["exercicio_id"], "series": int(r["series"]),
                                  "repeticoes": r["repeticoes"], "descanso": int(r["descanso_s"])})

    # Só ficam os planos cujos exercícios todos continuam no app (o plano de casa com elástico sai)
    ids = {e["id"] for e in exercicios}
    for nome in list(programas):
        faltando = [x["id"] for d in programas[nome]["dias"] for x in d["exercicios"] if x["id"] not in ids]
        if faltando:
            print(f"Plano '{nome}' ficou de fora (usa exercícios fora da academia: {len(faltando)}).")
            del programas[nome]

    DADOS.mkdir(parents=True, exist_ok=True)
    (DADOS / "exercicios.json").write_text(json.dumps(exercicios, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    (DADOS / "programas.json").write_text(json.dumps(list(programas.values()), ensure_ascii=False, indent=1), encoding="utf-8")

    # O Metro (empacotador do app) precisa de um require() fixo para cada arquivo.
    linhas_ts = ["// Gerado por scripts/gerar_dados.py - não edite à mão.",
                 "/* eslint-disable */",
                 "export const videos: Record<string, number> = {"]
    linhas_ts += [f"  '{e['id']}': require('../../assets/videos/{e['id']}.mp4')," for e in exercicios]
    linhas_ts += ["};", "", "export const miniaturas: Record<string, number> = {"]
    linhas_ts += [f"  '{e['id']}': require('../../assets/miniaturas/{e['id']}.jpg')," for e in exercicios]
    linhas_ts += ["};", ""]
    (DADOS / "midia.ts").write_text("\n".join(linhas_ts), encoding="utf-8")

    sem_midia = [e["id"] for e in exercicios
                 if not (APP / "assets" / "videos" / f"{e['id']}.mp4").exists()
                 or not (APP / "assets" / "miniaturas" / f"{e['id']}.jpg").exists()]
    print(f"{len(exercicios)} exercícios e {len(programas)} planos gerados em src\\data.")
    if sem_midia:
        print(f"ATENÇÃO: {len(sem_midia)} exercícios sem vídeo/miniatura em assets (rode o INSTALAR.bat).")


if __name__ == "__main__":
    main()
