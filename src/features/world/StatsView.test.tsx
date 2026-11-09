import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatsView } from './StatsView';
import { computeBadges, computeWorldStats } from './worldHelpers';
import type { Trip } from '../../store/types';

const makeTrip = (overrides: Partial<Trip> = {}): Trip => ({
  id: 'trip-1',
  destination: 'Tokyo',
  country: 'Japon',
  countryCode: 'JP',
  startDate: '2020-01-01',
  endDate: '2020-01-10',
  budget: 2000,
  currency: 'EUR',
  homeCurrency: 'EUR',
  photoUrl: '',
  lat: 35.68,
  lon: 139.69,
  steps: [],
  expenses: [],
  checklist: [],
  documents: [],
  notes: '',
  createdAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

const renderFor = (trips: Trip[]) => {
  const stats = computeWorldStats(trips, 48.8566, 2.3522);
  const badges = computeBadges(stats.totalTrips, stats.uniqueCountries, stats.totalKm, stats.hasOngoing);
  render(<StatsView stats={stats} badges={badges} trips={trips} />);
  return { stats, badges };
};

describe('StatsView', () => {
  // This component renders a lot of motion.div-heavy markup; jsdom renders it
  // correctly but slowly, so these tests need a higher-than-default timeout.
  const SLOW_TIMEOUT = 15000;

  it('shows 0 XP and no unlocked badges with no trips', () => {
    renderFor([]);
    expect(screen.getByText('0 XP')).toBeInTheDocument();
    expect(screen.getByText(/0\/8 badges débloqués/)).toBeInTheDocument();
  }, SLOW_TIMEOUT);

  it('awards XP for the first-trip badge once a trip exists', () => {
    const { badges } = renderFor([makeTrip()]);
    const expectedXp = badges.filter((b) => b.unlocked).reduce((sum, b) => sum + b.xp, 0);
    expect(screen.getByText(`${expectedXp} XP`)).toBeInTheDocument();
    expect(expectedXp).toBeGreaterThan(0);
  }, SLOW_TIMEOUT);

  it('shows the favorite country when trips share the same destination', () => {
    renderFor([makeTrip({ id: 'a' }), makeTrip({ id: 'b' })]);
    expect(screen.getAllByText('Japon').length).toBeGreaterThan(0);
  }, SLOW_TIMEOUT);

  it('shows the world exploration percentage and remaining countries', () => {
    renderFor([makeTrip()]);
    expect(screen.getByText(/pays à découvrir/)).toBeInTheDocument();
  }, SLOW_TIMEOUT);
});
