import { dateForWeekday, rangesOverlap, shiftDurationHours, shiftPreferenceCategory } from '../dateUtils';

describe('dateForWeekday', () => {
  it('restituisce la stessa data per weekday 1 (lunedì)', () => {
    expect(dateForWeekday('2026-08-03', 1)).toBe('2026-08-03');
  });

  it('somma i giorni corretti per weekday successivi', () => {
    expect(dateForWeekday('2026-08-03', 7)).toBe('2026-08-09');
  });
});

describe('shiftPreferenceCategory', () => {
  it('classifica correttamente mattina, pomeriggio, sera', () => {
    expect(shiftPreferenceCategory('09:00')).toBe('mattina');
    expect(shiftPreferenceCategory('13:00')).toBe('pomeriggio');
    expect(shiftPreferenceCategory('17:00')).toBe('sera');
  });
});

describe('rangesOverlap', () => {
  it('rileva sovrapposizioni', () => {
    expect(rangesOverlap('09:00', '13:00', '12:00', '16:00')).toBe(true);
    expect(rangesOverlap('09:00', '13:00', '13:00', '17:00')).toBe(false);
    expect(rangesOverlap('09:00', '13:00', '14:00', '17:00')).toBe(false);
  });
});

describe('shiftDurationHours', () => {
  it('calcola la durata in ore', () => {
    expect(shiftDurationHours('09:00', '13:00')).toBe(4);
    expect(shiftDurationHours('17:30', '21:00')).toBe(3.5);
  });
});
