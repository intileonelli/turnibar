import { mixHex } from '@/src/utils/color';

export type BackgroundPatternId = 'none' | 'lowpoly' | 'bauhaus' | 'waves' | 'diamonds';

export const BACKGROUND_PATTERN_OPTIONS: { id: BackgroundPatternId; label: string }[] = [
  { id: 'none', label: 'Nessuno (colore pieno)' },
  { id: 'lowpoly', label: 'Poligoni sfaccettati' },
  { id: 'bauhaus', label: 'Forme decise' },
  { id: 'waves', label: 'Onde morbide' },
  { id: 'diamonds', label: 'Losanghe sfumate' },
];

/** Tavolozza multicolore dedicata al motivo "Forme decise": intenzionalmente indipendente da
 * ROLE_COLOR_PALETTE (colors.ts) per evitare un giro di import circolare tra i due file. */
const BAUHAUS_PALETTE = ['#4F46E5', '#0EA5E9', '#16A34A', '#D97706', '#DB2777', '#7C3AED', '#DC2626', '#0D9488'];

function svgUrl(svg: string): string {
  if (typeof btoa !== 'function') return '';
  return `url(data:image/svg+xml;base64,${btoa(svg)})`;
}

/** Hash deterministico per assegnare pseudo-casualmente forme/colori nei motivi generati, senza
 * dipendere da Math.random (lo stesso motivo deve restare identico ad ogni render). */
function hashInt(a: number, b: number, c = 0): number {
  let h = a * 374761393 + b * 668265263 + c * 2147483647;
  h = (h ^ (h >>> 13)) * 1274126177;
  return Math.abs(h ^ (h >>> 16));
}

/**
 * Vero "bevel" (bordo smussato): per ogni lato del poligono, una fascia inclinata verso il
 * centro, più chiara o più scura a seconda di quanto quel lato guarda verso una luce immaginaria
 * (in alto a sinistra) — come lo smusso dorato di un tasto/icona, non solo un'ombra sotto la
 * forma. La faccia interna (il "top" piatto della forma) resta al colore base, leggermente
 * schiarito. `bevelRatio` è quanta parte della forma diventa smusso (0-0.5).
 */
function bevelFacets(points: [number, number][], base: string, bevelRatio = 0.26): string {
  const n = points.length;
  const cx = points.reduce((s, p) => s + p[0], 0) / n;
  const cy = points.reduce((s, p) => s + p[1], 0) / n;
  const inner = points.map(([x, y]) => [x + (cx - x) * bevelRatio, y + (cy - y) * bevelRatio] as [number, number]);
  const lx = -0.45;
  const ly = -0.9;
  const llen = Math.hypot(lx, ly);
  let facets = '';
  for (let i = 0; i < n; i++) {
    const [ax, ay] = points[i];
    const [bx, by] = points[(i + 1) % n];
    const [iax, iay] = inner[i];
    const [ibx, iby] = inner[(i + 1) % n];
    const ex = bx - ax;
    const ey = by - ay;
    let nx = ey;
    let ny = -ex;
    const midx = (ax + bx) / 2 - cx;
    const midy = (ay + by) / 2 - cy;
    if (nx * midx + ny * midy < 0) {
      nx = -nx;
      ny = -ny;
    }
    const nlen = Math.hypot(nx, ny) || 1;
    const dot = (nx / nlen) * (lx / llen) + (ny / nlen) * (ly / llen);
    const shade = dot >= 0 ? mixHex(base, '#FFFFFF', Math.min(dot * 0.6, 0.6)) : mixHex(base, '#000000', Math.min(-dot * 0.55, 0.55));
    facets += `<polygon points="${ax},${ay} ${bx},${by} ${ibx},${iby} ${iax},${iay}" fill="${shade}"/>`;
  }
  const innerPts = inner.map((p) => p.join(',')).join(' ');
  facets += `<polygon points="${innerPts}" fill="${mixHex(base, '#FFFFFF', 0.14)}"/>`;
  return facets;
}

/** Poligoni sfaccettati: tassellazione di triangoli equilateri, con una sfumatura per ciascuno,
 * nei toni chiari dei due colori scelti per il motivo. */
function lowPolyBackground(colorA: string, colorB: string): string {
  // Tessera grande (poche ripetizioni): pensata soprattutto per lo schermo di un telefono, dove
  // la maggior parte delle persone usa l'app.
  const cols = 5;
  const rowsN = 4;
  const b = 92;
  const h = (b * Math.sqrt(3)) / 2;
  const tileW = b * cols;
  const tileH = h * rowsN;
  const palette = [
    mixHex(colorA, '#FFFFFF', 0.5),
    mixHex(colorA, '#FFFFFF', 0.65),
    mixHex(colorB, '#FFFFFF', 0.5),
    mixHex(colorB, '#FFFFFF', 0.65),
    mixHex(mixHex(colorA, colorB, 0.5), '#FFFFFF', 0.55),
  ];
  const lineColor = mixHex(mixHex(colorA, colorB, 0.5), '#FFFFFF', 0.2);
  let shapes = '';
  for (let r = 0; r < rowsN; r++) {
    for (let c = 0; c < cols; c++) {
      const x = c * b;
      const y = r * h;
      const upBase = palette[hashInt(r, c, 1) % palette.length];
      const downBase = palette[hashInt(r, c, 2) % palette.length];
      // Triangolo "su": interamente dentro la cella. Triangolo "giù": a cavallo dei bordi
      // sinistro e destro della cella (disegnato due volte, come per gli altri motivi), così la
      // ripetizione del motivo lo ricompone senza cuciture. Ogni triangolo è un vero bevel (bordo
      // smussato con facce chiare/scure a seconda del lato, come un tasto), non una sfumatura piatta.
      shapes += bevelFacets(
        [
          [x + b / 2, y],
          [x, y + h],
          [x + b, y + h],
        ],
        upBase,
      );
      shapes += bevelFacets(
        [
          [x, y + h],
          [x - b / 2, y],
          [x + b / 2, y],
        ],
        downBase,
      );
      shapes += bevelFacets(
        [
          [x + b, y + h],
          [x + b / 2, y],
          [x + b * 1.5, y],
        ],
        downBase,
      );
    }
  }
  // Il velo di sfondo va spesso usato con "Trasparenza sfondo" bassa (es. 20-30%), che schiaccia
  // uniformemente ogni colore verso il bianco della pagina: l'ombra va quindi sovradimensionata
  // per restare visibile anche lì.
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${tileW}" height="${tileH}" viewBox="0 0 ${tileW} ${tileH}"><defs><filter id="ds" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="#000000" flood-opacity="0.85"/></filter></defs><g filter="url(#ds)" stroke="${lineColor}" stroke-width="0.4" stroke-opacity="0.5">${shapes}</g></svg>`;
  return `${svgUrl(svg)} 0 0/${tileW}px ${tileH}px repeat`;
}

/** Forme decise (stile Bauhaus): quadretti con una forma geometrica ciascuno (quarto di cerchio,
 * triangolo, cerchio, mezzaluna), in una tavolozza multicolore fissa, indipendente dai colori
 * dell'azienda (come richiesto: qui non ha senso limitarsi a due soli toni). */
function bauhausBackground(): string {
  const cols = 3;
  const rowsN = 4;
  const s = 84;
  const tileW = cols * s;
  const tileH = rowsN * s;
  // Il rettangolo di sfondo di ogni cella resta piatto (è il "tavolo" su cui poggiano le forme);
  // solo la forma in primo piano riceve rilievo, per un effetto di profondità invece che piatto.
  // Il quarto di cerchio e la mezzaluna (curvi) restano a sfumatura piatta + il filo chiaro
  // duplicato sotto (stessa tecnica di prima): un vero bevel a sfaccettature richiede lati
  // dritti. Il triangolo (poligono) ha invece un vero bevel, e il cerchio una resa "a cupola"
  // (sfumatura radiale scentrata verso la luce) — l'equivalente circolare dello stesso bevel.
  const flatCellShape = (type: number, x: number, y: number, size: number, gradId: string) => {
    switch (type) {
      case 0:
        return `<path d="M${x},${y + size} A${size},${size} 0 0 1 ${x + size},${y} L${x},${y}Z" fill="url(#${gradId})"/>`;
      case 3:
        return `<path d="M${x},${y + size / 2} A${size / 2},${size / 2} 0 0 1 ${x + size},${y + size / 2} Z" fill="url(#${gradId})"/>`;
      default:
        return '';
    }
  };
  let flatShapes = '';
  let depthShapes = '';
  let defs = '';
  let gid = 0;
  let bgRects = '';
  for (let r = 0; r < rowsN; r++) {
    for (let c = 0; c < cols; c++) {
      const h1 = hashInt(r, c);
      const cellType = h1 % 5;
      const base = mixHex(BAUHAUS_PALETTE[h1 % BAUHAUS_PALETTE.length], '#FFFFFF', 0.55);
      const bgBase = mixHex(BAUHAUS_PALETTE[(h1 >> 3) % BAUHAUS_PALETTE.length], '#FFFFFF', 0.86);
      const x = c * s;
      const y = r * s;
      bgRects += `<rect x="${x}" y="${y}" width="${s}" height="${s}" fill="${bgBase}"/>`;
      if (cellType === 1) {
        depthShapes += bevelFacets(
          [
            [x, y + s],
            [x + s, y + s],
            [x + s, y],
          ],
          base,
          0.3,
        );
      } else if (cellType === 2) {
        const domeId = `rd${gid++}`;
        defs += `<radialGradient id="${domeId}" cx="35%" cy="30%" r="75%"><stop offset="0" stop-color="${mixHex(base, '#FFFFFF', 0.6)}"/><stop offset="0.65" stop-color="${base}"/><stop offset="1" stop-color="${mixHex(base, '#000000', 0.38)}"/></radialGradient>`;
        depthShapes += `<circle cx="${x + s / 2}" cy="${y + s / 2}" r="${s * 0.32}" fill="url(#${domeId})"/>`;
      } else {
        const id = `bg${gid++}`;
        defs += `<linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${mixHex(base, '#FFFFFF', 0.25)}"/><stop offset="1" stop-color="${base}"/></linearGradient>`;
        flatShapes += flatCellShape(cellType, x, y, s, id);
      }
    }
  }
  defs += `<filter id="ds" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="2.5" stdDeviation="3" flood-color="#000000" flood-opacity="0.85"/></filter>`;
  // Filo chiaro sopra le forme curve (oltre all'ombra scura sotto): luce sopra + ombra sotto è
  // quello che legge come rilievo, non la sola ombra. Sovradimensionato (vedi lowPolyBackground)
  // per restare visibile anche con "Trasparenza sfondo" bassa.
  const highlight = flatShapes.replace(/fill="[^"]*"/g, 'fill="none"');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${tileW}" height="${tileH}" viewBox="0 0 ${tileW} ${tileH}"><defs>${defs}</defs>${bgRects}<g filter="url(#ds)">${flatShapes}${depthShapes}</g><g fill="none" stroke="#FFFFFF" stroke-opacity="0.95" stroke-width="2" stroke-linejoin="round">${highlight}</g></svg>`;
  return `${svgUrl(svg)} 0 0/${tileW}px ${tileH}px repeat`;
}

/** Onde morbide: 3 colline sovrapposte con una leggera trasparenza (i colori si fondono dove si
 * incontrano), "ancorate" in fondo alla tessera — poco spazio vuoto sopra, non fluttuano a metà.
 * Ogni cresta è la somma di due sinusoidi con periodi diversi (una principale + una più corta),
 * per una forma meno geometrica/ripetitiva rispetto a un'unica onda regolare. Un numero intero
 * di cicli nella larghezza della tessera fa combaciare la fase a x=0 e x=w, senza spezzature. */
function wavesBackground(colorA: string, colorB: string): string {
  const w = 320;
  const tileH = 420;
  const bg = mixHex(colorA, '#FFFFFF', 0.9);
  const c1 = mixHex(colorA, '#FFFFFF', 0.65);
  const c2 = mixHex(mixHex(colorA, colorB, 0.5), '#FFFFFF', 0.58);
  const c3 = mixHex(colorB, '#FFFFFF', 0.62);
  let defs = '';
  let gid = 0;
  const hill = (baseY: number, amp: number, color: string, phaseOffset: number) => {
    const cyclesPerTile = 2;
    const period = w / cyclesPerTile;
    const period2 = period / 2.7;
    const step = period / 24;
    let d = `M0,${tileH}`;
    for (let x = 0; x <= w + 0.001; x += step) {
      const angle = ((x + phaseOffset) / period) * Math.PI * 2;
      const angle2 = ((x + phaseOffset) / period2) * Math.PI * 2;
      const y = baseY + Math.sin(angle) * amp + Math.sin(angle2) * (amp * 0.22);
      d += ` L${x},${y}`;
    }
    d += ` L${w},${tileH} Z`;
    // Sfumatura verticale (chiara vicino alla cresta, più profonda verso il fondo): dà volume
    // alla collina, come fosse un cuscino morbido, non solo un colore piatto con l'ombra sotto.
    const id = `hg${gid++}`;
    defs += `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${mixHex(color, '#FFFFFF', 0.45)}"/><stop offset="0.4" stop-color="${color}"/><stop offset="1" stop-color="${mixHex(color, '#000000', 0.12)}"/></linearGradient>`;
    return `<path d="${d}" fill="url(#${id})" opacity="0.9"/>`;
  };
  // Le chiamate a hill() vanno eseguite prima di leggere "defs" qui sotto: ognuna vi aggiunge il
  // proprio gradiente, quindi "defs" deve già essere popolato al momento dell'interpolazione.
  const hill1 = hill(tileH * 0.22, 22, c1, 0);
  const hill2 = hill(tileH * 0.52, 20, c2, w / 3);
  const hill3 = hill(tileH * 0.8, 18, c3, w / 1.6);
  // Filo chiaro lungo la cresta di ogni collina (oltre all'ombra): dà rilievo invece di un
  // colore piatto con solo un'ombra sotto. Valori sovradimensionati (vedi lowPolyBackground) per
  // restare visibili anche con "Trasparenza sfondo" bassa.
  const highlight = `${hill1}${hill2}${hill3}`.replace(/fill="[^"]*"/g, 'fill="none"').replace(/ opacity="[^"]*"/g, '');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${tileH}" viewBox="0 0 ${w} ${tileH}"><defs>${defs}<filter id="ds" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="-4" stdDeviation="5" flood-color="#000000" flood-opacity="0.8"/></filter></defs><rect width="${w}" height="${tileH}" fill="${bg}"/><g filter="url(#ds)">${hill1}${hill2}${hill3}</g><g fill="none" stroke="#FFFFFF" stroke-opacity="0.95" stroke-width="2.5" stroke-linejoin="round">${highlight}</g></svg>`;
  // Un solo pannello, ancorato in basso, mai ripetuto: le colline riempiono per intero lo
  // spazio disponibile (non un motivo a piastrelle come gli altri tre).
  return `${svgUrl(svg)} center bottom/100% 100% no-repeat`;
}

/** Losanghe sfumate: quilt di rombi pieni (un rombo centrale + 4 triangoli d'angolo per
 * tessera, l'unica combinazione che copre l'intera tessera senza vuoti), con sfumatura. */
function diamondsBackground(colorA: string, colorB: string): string {
  const s = 76;
  const half = s / 2;
  const baseA = mixHex(colorA, '#FFFFFF', 0.35);
  const baseB = mixHex(colorB, '#FFFFFF', 0.32);
  // Ogni losanga/triangolo è un vero bevel (bordo smussato con facce chiare/scure a seconda del
  // lato, come un tasto), non solo una sfumatura piatta con un'ombra sotto.
  let diamondShapes = bevelFacets(
    [
      [half, 0],
      [s, half],
      [half, s],
      [0, half],
    ],
    baseA,
    0.32,
  );
  diamondShapes += bevelFacets(
    [
      [0, 0],
      [half, 0],
      [0, half],
    ],
    baseB,
    0.3,
  );
  diamondShapes += bevelFacets(
    [
      [s, 0],
      [s, half],
      [half, 0],
    ],
    baseB,
    0.3,
  );
  diamondShapes += bevelFacets(
    [
      [s, s],
      [s, half],
      [half, s],
    ],
    baseB,
    0.3,
  );
  diamondShapes += bevelFacets(
    [
      [0, s],
      [0, half],
      [half, s],
    ],
    baseB,
    0.3,
  );
  // Il velo di sfondo va spesso usato con "Trasparenza sfondo" bassa (es. 20-30%), che schiaccia
  // uniformemente ogni colore verso il bianco della pagina: l'ombra va quindi sovradimensionata
  // per restare visibile anche lì.
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}"><defs><filter id="ds" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="2.2" stdDeviation="2.5" flood-color="#000000" flood-opacity="0.85"/></filter></defs><g filter="url(#ds)">${diamondShapes}</g></svg>`;
  return `${svgUrl(svg)} 0 0/${s}px ${s}px repeat`;
}

/**
 * Valore CSS "background" (proprietà composita) per il motivo scelto, pronto per uno style di
 * react-native-web — le proprietà separate (backgroundImage, backgroundSize, ecc.) non sono
 * supportate da react-native-web, solo la scorciatoia "background". Nessun equivalente pratico
 * su nativo (niente CSS): lì il motivo viene ignorato e resta solo il velo di colore pieno.
 * colorA/colorB sono i colori dedicati al motivo (impostabili separatamente da primario/
 * secondario in Personalizzazione): "bauhaus" fa eccezione e usa sempre la sua tavolozza fissa.
 */
export function backgroundPatternCss(pattern: BackgroundPatternId, colorA: string, colorB: string): string | null {
  switch (pattern) {
    case 'lowpoly':
      return lowPolyBackground(colorA, colorB);
    case 'bauhaus':
      return bauhausBackground();
    case 'waves':
      return wavesBackground(colorA, colorB);
    case 'diamonds':
      return diamondsBackground(colorA, colorB);
    default:
      return null;
  }
}
