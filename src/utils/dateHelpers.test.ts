import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  fmtDate,
  fmtRange,
  daysBetween,
  tripStatus,
  dayCounter,
  todayISO,
  addDaysISO,
  getTripProgress,
} from './dateHelpers';

afterEach(() => {
  vi.useRealTimers();
});

describe('fmtDate', () => {
  it('formats an ISO date in French short style', () => {
    expect(fmtDate('2026-03-15')).toBe('15 mars');
  });

  it('returns empty string for empty input', () => {
    expect(fmtDate('')).toBe('');
  });

  it('does not throw on an invalid date string', () => {
    expect(fmtDate('not-a-date')).toBe('Invalid Date');
  });
});

describe('fmtRange', () => {
  it('returns empty string if either bound is missing', () => {
    expect(fmtRange('', '2026-03-20')).toBe('');
    expect(fmtRange('2026-03-15', '')).toBe('');
  });

  it('compresses the range when same month/year', () => {
    expect(fmtRange('2026-03-15', '2026-03-20')).toBe('15 – 20 mars 2026');
  });

  it('shows both full dates when months differ', () => {
    expect(fmtRange('2026-03-28', '2026-04-02')).toBe('28 mars – 02 avr. 2026');
  });
});

describe('daysBetween', () => {
  it('counts inclusive days between two dates', () => {
    expect(daysBetween('2026-03-15', '2026-03-20')).toBe(6);
  });

  it('returns 0 when a bound is missing', () => {
    expect(daysBetween('', '2026-03-20')).toBe(0);
  });

  it('clamps a reversed range to its floor of 1 (max(0, negative) + 1)', () => {
    expect(daysBetween('2026-03-20', '2026-03-15')).toBe(1);
  });
});

describe('tripStatus', () => {
  it('returns upcoming when the trip starts in the future', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T12:00:00'));
    expect(tripStatus('2026-03-15', '2026-03-20')).toBe('upcoming');
  });

  it('returns ongoing when today is within the range', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-17T12:00:00'));
    expect(tripStatus('2026-03-15', '2026-03-20')).toBe('ongoing');
  });

  it('returns finished when the trip has ended', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-01T12:00:00'));
    expect(tripStatus('2026-03-15', '2026-03-20')).toBe('finished');
  });
});

describe('dayCounter', () => {
  it('shows a J- countdown before the trip', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-10T12:00:00'));
    expect(dayCounter('2026-03-15', '2026-03-20')).toBe('J-5');
  });

  it('shows the current day index during the trip', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-17T12:00:00'));
    expect(dayCounter('2026-03-15', '2026-03-20')).toBe('Jour 3');
  });

  it('shows a finished marker with elapsed days after the trip', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-23T12:00:00'));
    expect(dayCounter('2026-03-15', '2026-03-20')).toBe('Terminé · J+3');
  });
});

describe('todayISO / addDaysISO', () => {
  it('returns an ISO date string (YYYY-MM-DD)', () => {
    expect(todayISO()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('adds days to an ISO date', () => {
    expect(addDaysISO('2026-03-15', 5)).toBe('2026-03-20');
  });

  it('handles negative offsets', () => {
    expect(addDaysISO('2026-03-15', -5)).toBe('2026-03-10');
  });
});

describe('getTripProgress', () => {
  it('returns null when the trip is not ongoing', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T12:00:00'));
    expect(getTripProgress('2026-03-15', '2026-03-20')).toBeNull();
  });

  it('returns a 0-100 percentage while ongoing', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-17T12:00:00'));
    const progress = getTripProgress('2026-03-15', '2026-03-20');
    expect(progress).not.toBeNull();
    expect(progress as number).toBeGreaterThanOrEqual(0);
    expect(progress as number).toBeLessThanOrEqual(100);
  });
});
