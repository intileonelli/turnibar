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

/** Poligoni sfaccettati: tassellazione di triangoli equilateri, con una sfumatura per ciascuno,
 * nei toni chiari dei due colori scelti per il motivo. */
function lowPolyBackground(colorA: string, colorB: string): string {
  const cols = 7;
  const rowsN = 5;
  const b = 46;
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
  let defs = '';
  let shapes = '';
  let gid = 0;
  const grad = (c1: string, c2: string, angle: number) => {
    const id = `g${gid++}`;
    defs += `<linearGradient id="${id}" gradientTransform="rotate(${angle})"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient>`;
    return `url(#${id})`;
  };
  for (let r = 0; r < rowsN; r++) {
    for (let c = 0; c < cols; c++) {
      const x = c * b;
      const y = r * h;
      const upBase = palette[hashInt(r, c, 1) % palette.length];
      const downBase = palette[hashInt(r, c, 2) % palette.length];
      const upFill = grad(upBase, mixHex(upBase, '#FFFFFF', 0.4), 60);
      const downFill = grad(downBase, mixHex(downBase, '#FFFFFF', 0.4), 240);
      // Triangolo "su": interamente dentro la cella. Triangolo "giù": a cavallo dei bordi
      // sinistro e destro della cella (disegnato due volte, come per gli altri motivi), così la
      // ripetizione del motivo lo ricompone senza cuciture.
      shapes += `<polygon points="${x + b / 2},${y} ${x},${y + h} ${x + b},${y + h}" fill="${upFill}"/>`;
      shapes += `<polygon points="${x},${y + h} ${x - b / 2},${y} ${x + b / 2},${y}" fill="${downFill}"/>`;
      shapes += `<polygon points="${x + b},${y + h} ${x + b / 2},${y} ${x + b * 1.5},${y}" fill="${downFill}"/>`;
    }
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${tileW}" height="${tileH}" viewBox="0 0 ${tileW} ${tileH}"><defs>${defs}</defs><g stroke="${lineColor}" stroke-width="0.75" stroke-opacity="0.6">${shapes}</g></svg>`;
  return `${svgUrl(svg)} 0 0/${tileW}px ${tileH}px repeat`;
}

/** Forme decise (stile Bauhaus): quadretti con una forma geometrica ciascuno (quarto di cerchio,
 * triangolo, cerchio, mezzaluna), in una tavolozza multicolore fissa, indipendente dai colori
 * dell'azienda (come richiesto: qui non ha senso limitarsi a due soli toni). */
function bauhausBackground(): string {
  const cols = 4;
  const rowsN = 4;
  const s = 40;
  const tileW = cols * s;
  const tileH = rowsN * s;
  let shapes = '';
  let defs = '';
  let gid = 0;
  const cell = (type: number, x: number, y: number, size: number, gradId: string, bg: string) => {
    switch (type) {
      case 0:
        return `<rect x="${x}" y="${y}" width="${size}" height="${size}" fill="${bg}"/><path d="M${x},${y + size} A${size},${size} 0 0 1 ${x + size},${y} L${x},${y}Z" fill="url(#${gradId})"/>`;
      case 1:
        return `<rect x="${x}" y="${y}" width="${size}" height="${size}" fill="${bg}"/><polygon points="${x},${y + size} ${x + size},${y + size} ${x + size},${y}" fill="url(#${gradId})"/>`;
      case 2:
        return `<rect x="${x}" y="${y}" width="${size}" height="${size}" fill="${bg}"/><circle cx="${x + size / 2}" cy="${y + size / 2}" r="${size * 0.32}" fill="url(#${gradId})"/>`;
      case 3:
        return `<rect x="${x}" y="${y}" width="${size}" height="${size}" fill="${bg}"/><path d="M${x},${y + size / 2} A${size / 2},${size / 2} 0 0 1 ${x + size},${y + size / 2} Z" fill="url(#${gradId})"/>`;
      default:
        return `<rect x="${x}" y="${y}" width="${size}" height="${size}" fill="${bg}"/>`;
    }
  };
  for (let r = 0; r < rowsN; r++) {
    for (let c = 0; c < cols; c++) {
      const h1 = hashInt(r, c);
      const cellType = h1 % 5;
      const base = mixHex(BAUHAUS_PALETTE[h1 % BAUHAUS_PALETTE.length], '#FFFFFF', 0.55);
      const bgBase = mixHex(BAUHAUS_PALETTE[(h1 >> 3) % BAUHAUS_PALETTE.length], '#FFFFFF', 0.86);
      const id = `bg${gid++}`;
      defs += `<linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${mixHex(base, '#FFFFFF', 0.25)}"/><stop offset="1" stop-color="${base}"/></linearGradient>`;
      shapes += cell(cellType, c * s, r * s, s, id, bgBase);
    }
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${tileW}" height="${tileH}" viewBox="0 0 ${tileW} ${tileH}"><defs>${defs}</defs>${shapes}</svg>`;
  return `${svgUrl(svg)} 0 0/${tileW}px ${tileH}px repeat`;
}

/** Onde morbide: tre fasce ondulate sovrapposte, nei toni chiari dei due colori del motivo. */
function wavesBackground(colorA: string, colorB: string): string {
  const w = 220;
  const h = 140;
  const c1 = mixHex(colorA, '#FFFFFF', 0.72);
  const c2 = mixHex(mixHex(colorA, colorB, 0.5), '#FFFFFF', 0.66);
  const c3 = mixHex(colorB, '#FFFFFF', 0.7);
  const bg = mixHex(colorA, '#FFFFFF', 0.9);
  const wave = (baseY: number, amp: number, color: string, invert: boolean) => {
    const period = w / 2;
    let d = `M0,${baseY}`;
    for (let x = 0; x <= w + period; x += period / 2) {
      const y = baseY + (Math.round(x / (period / 2)) % 2 === 0 ? -amp : amp) * (invert ? -1 : 1);
      d += ` Q${x - period / 4},${y} ${x},${baseY}`;
    }
    d += ` L${w},${h} L0,${h} Z`;
    return `<path d="${d}" fill="${color}" opacity="0.85"/>`;
  };
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><rect width="${w}" height="${h}" fill="${bg}"/>${wave(h * 0.35, 14, c1, false)}${wave(h * 0.6, 12, c2, true)}${wave(h * 0.82, 10, c3, false)}</svg>`;
  return `${svgUrl(svg)} 0 0/${w}px ${h}px repeat`;
}

/** Losanghe sfumate: quilt di rombi pieni (un rombo centrale + 4 triangoli d'angolo per
 * tessera, l'unica combinazione che copre l'intera tessera senza vuoti), con sfumatura. */
function diamondsBackground(colorA: string, colorB: string): string {
  const s = 40;
  const half = s / 2;
  const gA1 = mixHex(colorA, '#FFFFFF', 0.45);
  const gA2 = mixHex(colorA, '#FFFFFF', 0.68);
  const gB1 = mixHex(colorB, '#FFFFFF', 0.42);
  const gB2 = mixHex(colorB, '#FFFFFF', 0.66);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}"><defs><linearGradient id="dA" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${gA1}"/><stop offset="1" stop-color="${gA2}"/></linearGradient><linearGradient id="dB" x1="1" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${gB1}"/><stop offset="1" stop-color="${gB2}"/></linearGradient></defs><polygon points="${half},0 ${s},${half} ${half},${s} 0,${half}" fill="url(#dA)"/><polygon points="0,0 ${half},0 0,${half}" fill="url(#dB)"/><polygon points="${s},0 ${s},${half} ${half},0" fill="url(#dB)"/><polygon points="${s},${s} ${s},${half} ${half},${s}" fill="url(#dB)"/><polygon points="0,${s} 0,${half} ${half},${s}" fill="url(#dB)"/></svg>`;
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
