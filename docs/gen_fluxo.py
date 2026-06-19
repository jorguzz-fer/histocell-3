#!/usr/bin/env python3
"""Gera um fluxograma grande e legível do processo Histocell."""
import cairosvg

INK   = "#0f172a"
SUB   = "#475569"

STEPS = [
    ("1", "PEDIDO",
     ["Cliente (Portal Web, link sem login)", "ou Recepção (local)",
      "serviços + observações (nº dos casos)"],
     "#2563eb", "#eff6ff"),
    ("2", "RECEBIMENTO · RECEPÇÃO",
     ["registra recipientes", "Pote / Caixa / Saco / Outro",
      "etiqueta o recipiente · grava a hora"],
     "#0891b2", "#ecfeff"),
    ("3", "RECEBIMENTO · LABORATÓRIO",
     ["designa amostras (nº Histocell)", "conferência previsto x recebido -> excedente",
      "lança serviços · grava a hora"],
     "#0d9488", "#f0fdfa"),
    ("4", "ETIQUETAS",
     ["gera e imprime Code128", "1 por lâmina / cassete",
      "nº impresso = nº do código de barras"],
     "#7c3aed", "#f5f3ff"),
    ("5", "RASTREIO POR DEPARTAMENTO",
     ["scan de Entrada / Saída em cada setor",
      "barra de progresso · responsável · tempo"],
     "#c026d3", "#fdf4ff"),
    ("6", "EXPEDIÇÃO / CONCLUÍDO",
     ["a saída da Expedição", "encerra a peça"],
     "#16a34a", "#f0fdf4"),
]

DEPTS = ["Recepção /\nConferência", "Macroscopia", "Processamento /\nInclusão",
         "Microtomia\n(corte)", "Coloração /\nMontagem", "Laudo", "Expedição"]

LATERAIS = [
    ("FINANCEIRO", ["crédito pré-pago abatido", "no recebimento", "excedente sinalizado"],
     "#b45309", "#fffbeb"),
    ("CLIENTE · PORTAL", ["saldo · histórico · status", "acompanha sem login",
                          "fale com a Histocell"], "#1d4ed8", "#eff6ff"),
    ("RELATÓRIO DE TEMPOS", ["carimbos por etapa (scans)", "criado -> recepção ->",
                             "laboratório -> processado -> despachado"], "#475569", "#f8fafc"),
]

W = 1680
TOP = 150
BOX_W = 980
BOX_H = 150
BOX_X = 360
GAP = 56
ARROW = 46

def esc(s):
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")

parts = []
y = TOP
step_centers = []
for num, title, lines, stroke, fill in STEPS:
    cx = BOX_X + BOX_W / 2
    cyc = y + BOX_H / 2
    step_centers.append((cx, y, BOX_H))
    parts.append(f'<rect x="{BOX_X}" y="{y}" width="{BOX_W}" height="{BOX_H}" rx="20" '
                 f'fill="{fill}" stroke="{stroke}" stroke-width="3"/>')
    parts.append(f'<circle cx="{BOX_X+62}" cy="{cyc}" r="40" fill="{stroke}"/>')
    parts.append(f'<text x="{BOX_X+62}" y="{cyc+15}" font-size="44" font-weight="800" '
                 f'fill="white" text-anchor="middle">{num}</text>')
    parts.append(f'<text x="{BOX_X+130}" y="{y+50}" font-size="30" font-weight="800" '
                 f'fill="{INK}">{esc(title)}</text>')
    ly = y + 84
    for ln in lines:
        parts.append(f'<text x="{BOX_X+130}" y="{ly}" font-size="21" fill="{SUB}">{esc(ln)}</text>')
        ly += 30
    y += BOX_H + GAP + ARROW

for i in range(len(STEPS) - 1):
    cx, sy, sh = step_centers[i]
    y1 = sy + sh
    y2 = step_centers[i+1][1]
    parts.insert(0, f'<line x1="{cx}" y1="{y1}" x2="{cx}" y2="{y2}" stroke="#94a3b8" '
                    f'stroke-width="4" marker-end="url(#arrow)"/>')

cx5, y5, h5 = step_centers[4]
dep_x = BOX_X + BOX_W + 80
dep_w = 210
dep_h = 92
dep_gap = 18
dep_y = y5 - (len(DEPTS) * (dep_h + dep_gap) - dep_gap) / 2 + h5 / 2
parts.append(f'<line x1="{BOX_X+BOX_W}" y1="{y5+h5/2}" x2="{dep_x}" y2="{y5+h5/2}" '
             f'stroke="#c026d3" stroke-width="4" marker-end="url(#arrowM)"/>')
dy = dep_y
prev = None
for i, d in enumerate(DEPTS):
    parts.append(f'<rect x="{dep_x}" y="{dy:.0f}" width="{dep_w}" height="{dep_h}" rx="14" '
                 f'fill="#fdf4ff" stroke="#e879f9" stroke-width="2.5"/>')
    parts.append(f'<text x="{dep_x+22}" y="{dy+30:.0f}" font-size="17" font-weight="700" '
                 f'fill="#86198f">{i+1}.</text>')
    for j, seg in enumerate(d.split("\n")):
        parts.append(f'<text x="{dep_x+44}" y="{dy+30+j*23:.0f}" font-size="17" font-weight="600" '
                     f'fill="#701a75">{esc(seg)}</text>')
    if prev is not None:
        parts.append(f'<line x1="{dep_x+dep_w/2}" y1="{prev:.0f}" x2="{dep_x+dep_w/2}" y2="{dy:.0f}" '
                     f'stroke="#d946ef" stroke-width="3" marker-end="url(#arrowM)"/>')
    prev = dy + dep_h
    dy += dep_h + dep_gap

parts.append(f'<text x="{dep_x}" y="{dep_y-22:.0f}" font-size="19" font-weight="800" '
             f'fill="#86198f">7 DEPARTAMENTOS</text>')

lat_x = 40
lat_w = 290
lat_h = 130
lat_gap = 40
body_bottom = y - GAP - ARROW
total_lat = len(LATERAIS) * (lat_h + lat_gap) - lat_gap
lat_y = TOP + ((body_bottom - TOP) - total_lat) / 2
ly = lat_y
parts.append(f'<text x="{lat_x}" y="{lat_y-22:.0f}" font-size="19" font-weight="800" '
             f'fill="{SUB}">TRANSVERSAIS</text>')
for title, lines, stroke, fill in LATERAIS:
    parts.append(f'<rect x="{lat_x}" y="{ly:.0f}" width="{lat_w}" height="{lat_h}" rx="16" '
                 f'fill="{fill}" stroke="{stroke}" stroke-width="2.5"/>')
    parts.append(f'<text x="{lat_x+22}" y="{ly+38:.0f}" font-size="20" font-weight="800" '
                 f'fill="{stroke}">{esc(title)}</text>')
    yy = ly + 68
    for ln in lines:
        parts.append(f'<text x="{lat_x+22}" y="{yy:.0f}" font-size="15.5" fill="{SUB}">{esc(ln)}</text>')
        yy += 23
    ly += lat_h + lat_gap

H = int(body_bottom + 80)

svg = f'''<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}" font-family="Arial, sans-serif">
  <defs>
    <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M0,0 L10,5 L0,10 z" fill="#94a3b8"/>
    </marker>
    <marker id="arrowM" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M0,0 L10,5 L0,10 z" fill="#d946ef"/>
    </marker>
  </defs>
  <rect width="{W}" height="{H}" fill="white"/>
  <text x="{W/2}" y="76" font-size="40" font-weight="800" fill="{INK}" text-anchor="middle">Fluxo do Processo - Histocell</text>
  <text x="{W/2}" y="112" font-size="22" fill="{SUB}" text-anchor="middle">Do pedido a expedicao</text>
  {''.join(parts)}
</svg>'''

with open("/tmp/fluxo-histocell.svg", "w") as f:
    f.write(svg)
cairosvg.svg2png(bytestring=svg.encode(), write_to="/tmp/fluxo-histocell.png", scale=2.0)
print(f"OK  {W}x{H}  -> PNG @2x = {W*2}x{H*2}")
