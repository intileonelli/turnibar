import { dateForWeekday, rangesOverlap, shiftDurationHours, timeToMinutes } from '../dateUtils';

describe('dateForWeekday', () => {
  it('restituisce la stessa data per weekday 1 (lunedì)', () => {
    expect(dateForWeekday('2026-08-03', 1)).toBe('2026-08-03');
  });

  it('somma i giorni corretti per weekday successivi', () => {
    expect(dateForWeekday('2026-08-03', 7)).toBe('2026-08-09');
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

describe('timeToMinutes', () => {
  it('interpreta correttamente "HH:mm" standard', () => {
    expect(timeToMinutes('06:30')).toBe(390);
    expect(timeToMinutes('00:00')).toBe(0);
  });

  it('interpreta correttamente orari con il punto invece dei due punti', () => {
    expect(timeToMinutes('6.30')).toBe(390);
    expect(timeToMinutes('06.30')).toBe(390);
  });

  it('interpreta correttamente ore senza lo zero iniziale', () => {
    expect(timeToMinutes('6:30')).toBe(390);
  });
});
