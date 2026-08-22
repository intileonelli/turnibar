import { normalizeTime } from '../date';

describe('normalizeTime', () => {
  it('normalizza orari già nel formato corretto', () => {
    expect(normalizeTime('06:30')).toBe('06:30');
  });

  it('normalizza orari con il punto e senza zero iniziale', () => {
    expect(normalizeTime('6.30')).toBe('06:30');
  });

  it('normalizza orari con un solo cifra per i minuti', () => {
    expect(normalizeTime('9:5')).toBe('09:05');
  });

  it('restituisce null per testo non valido', () => {
    expect(normalizeTime('abc')).toBeNull();
    expect(normalizeTime('')).toBeNull();
  });

  it('restituisce null per ore o minuti fuori range', () => {
    expect(normalizeTime('25:00')).toBeNull();
    expect(normalizeTime('10:75')).toBeNull();
  });
});
