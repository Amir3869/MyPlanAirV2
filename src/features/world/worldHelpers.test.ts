import { describe, it, expect } from 'vitest';
import {
  computeBadges,
  computeWorldStats,
  computeTripPoints,
  computeArcs,
  computeCountrySets,
  getTripCoords,
  getTripDistanceDetails,
  isUsableCoord,
  estimateFlightTime,
  fmtDistance,
} from './worldHelpers';
import type { Trip } from '../../store/types';

const makeTrip = (overrides: Partial<Trip> = {}): Trip => ({
  id: 'trip-1',
  destination: 'Tokyo',
  country: 'Japon',
  countryCode: 'JP',
  startDate: '2027-07-01',
  endDate: '2027-07-10',
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

describe('isUsableCoord', () => {
  it('rejects undefined/NaN coordinates', () => {
    expect(isUsableCoord(undefined, undefined)).toBe(false);
    expect(isUsableCoord(NaN, 2)).toBe(false);
  });

  it('rejects the 0,0 null-island coordinate', () => {
    expect(isUsableCoord(0, 0)).toBe(false);
  });

  it('accepts valid non-zero coordinates', () => {
    expect(isUsableCoord(48.85, 2.35)).toBe(true);
  });
});

describe('getTripCoords', () => {
  it('prefers the trip own coordinates when usable', () => {
    const coords = getTripCoords(makeTrip({ lat: 1, lon: 1 }));
    expect(coords).toEqual({ lat: 1, lon: 1, source: 'trip' });
  });

  it('falls back to the first roadtrip destination with usable coords', () => {
    const coords = getTripCoords(makeTrip({
      lat: undefined, lon: undefined,
      destinations: [{ city: 'Osaka', countryCode: 'JP', lat: 2, lon: 2, fromDate: '', toDate: '', fromDay: 1, toDay: 1 }],
    }));
    expect(coords).toEqual({ lat: 2, lon: 2, source: 'destination' });
  });

  it('falls back to the capital city coordinates as a last resort', () => {
    const coords = getTripCoords(makeTrip({ lat: undefined, lon: undefined, countryCode: 'FR' }));
    expect(coords?.source).toBe('capital');
  });

  it('returns null when no coordinate source is usable', () => {
    const coords = getTripCoords(makeTrip({ lat: undefined, lon: undefined, countryCode: 'ZZ' }));
    expect(coords).toBeNull();
  });
});

describe('getTripDistanceDetails', () => {
  const home = { lat: 48.8566, lon: 2.3522 }; // Paris

  it('returns null if home coordinates are not usable', () => {
    expect(getTripDistanceDetails(makeTrip(), 0, 0)).toBeNull();
  });

  it('computes a round-trip distance for a simple (non-roadtrip) destination', () => {
    const details = getTripDistanceDetails(makeTrip(), home.lat, home.lon);
    expect(details).not.toBeNull();
    expect(details!.distanceKm).toBeGreaterThan(0);
    expect(details!.roadtripLegs).toBeUndefined();
  });

  it('computes a home→stops→home loop distance for a roadtrip', () => {
    const trip = makeTrip({
      isRoadtrip: true,
      destinations: [
        { city: 'Tokyo', countryCode: 'JP', lat: 35.68, lon: 139.69, fromDate: '', toDate: '', fromDay: 1, toDay: 3 },
        { city: 'Osaka', countryCode: 'JP', lat: 34.69, lon: 135.5, fromDate: '', toDate: '', fromDay: 4, toDay: 7 },
      ],
    });
    const details = getTripDistanceDetails(trip, home.lat, home.lon);
    expect(details!.roadtripLegs).toHaveLength(3); // home→Tokyo, Tokyo→Osaka, Osaka→home
    expect(details!.roadtripLegs![0].from).toBe('🏠');
    expect(details!.roadtripLegs![2].to).toBe('🏠');
    const total = details!.roadtripLegs!.reduce((sum, leg) => sum + leg.km, 0);
    expect(details!.distanceKm).toBe(total);
  });
});

describe('computeBadges', () => {
  it('unlocks the first-trip badge once at least one trip exists', () => {
    const badges = computeBadges(1, 0, 0, false);
    expect(badges.find((b) => b.id === 'first_trip')!.unlocked).toBe(true);
  });

  it('keeps higher-tier badges locked until thresholds are met', () => {
    const badges = computeBadges(3, 4, 5000, false);
    expect(badges.find((b) => b.id === 'explorer')!.unlocked).toBe(false); // needs 5 countries
    expect(badges.find((b) => b.id === 'frequent')!.unlocked).toBe(false); // needs 5 trips
  });

  it('unlocks the nomad badge only when a trip is ongoing', () => {
    expect(computeBadges(1, 1, 0, false).find((b) => b.id === 'nomad')!.unlocked).toBe(false);
    expect(computeBadges(1, 1, 0, true).find((b) => b.id === 'nomad')!.unlocked).toBe(true);
  });
});

describe('computeWorldStats', () => {
  const home = { lat: 48.8566, lon: 2.3522 };

  it('counts unique countries only from travelled (finished/ongoing) trips', () => {
    const trips = [
      makeTrip({ id: 'a', countryCode: 'JP', startDate: '2020-01-01', endDate: '2020-01-10' }), // finished
      makeTrip({ id: 'b', countryCode: 'FR', startDate: '2027-07-01', endDate: '2027-07-10' }), // upcoming
    ];
    const stats = computeWorldStats(trips, home.lat, home.lon);
    expect(stats.totalTrips).toBe(2);
    expect(stats.uniqueCountries).toBe(1);
  });

  it('excludes upcoming trips from the total km count', () => {
    const trips = [
      makeTrip({ id: 'a', startDate: '2020-01-01', endDate: '2020-01-10' }), // finished
      makeTrip({ id: 'b', startDate: '2027-07-01', endDate: '2027-07-10' }), // upcoming
    ];
    const stats = computeWorldStats(trips, home.lat, home.lon);
    const upcomingEntry = stats.kmBreakdown.find((e) => e.tripId === 'b');
    expect(upcomingEntry?.status).toBe('upcoming');
    expect(stats.totalKm).toBeLessThan(
      stats.kmBreakdown.reduce((sum, e) => sum + e.distanceKm, 0),
    );
  });

  it('identifies the favorite (most-visited) country', () => {
    const trips = [
      makeTrip({ id: 'a', country: 'Japon', countryCode: 'JP' }),
      makeTrip({ id: 'b', country: 'Japon', countryCode: 'JP' }),
      makeTrip({ id: 'c', country: 'France', countryCode: 'FR' }),
    ];
    const stats = computeWorldStats(trips, home.lat, home.lon);
    expect(stats.favoriteCountry).toBe('Japon');
    expect(stats.favoriteCount).toBe(2);
  });

  it('returns zeroed stats for an empty trip list', () => {
    const stats = computeWorldStats([], home.lat, home.lon);
    expect(stats.totalTrips).toBe(0);
    expect(stats.uniqueCountries).toBe(0);
    expect(stats.favoriteCountry).toBeNull();
  });
});

describe('computeTripPoints / computeArcs', () => {
  it('skips trips with no resolvable coordinates', () => {
    const points = computeTripPoints([makeTrip({ lat: undefined, lon: undefined, countryCode: 'ZZ' })]);
    expect(points).toHaveLength(0);
  });

  it('builds arcs only for ongoing/finished trips, not upcoming ones', () => {
    const points = computeTripPoints([
      makeTrip({ id: 'a', startDate: '2020-01-01', endDate: '2020-01-10' }),
      makeTrip({ id: 'b', startDate: '2027-07-01', endDate: '2027-07-10' }),
    ]);
    const arcs = computeArcs(points, 48.8566, 2.3522);
    expect(arcs).toHaveLength(1);
  });
});

describe('computeCountrySets', () => {
  it('buckets countries by trip status', () => {
    const trips = [
      makeTrip({ id: 'a', countryCode: 'JP', startDate: '2020-01-01', endDate: '2020-01-10' }),
      makeTrip({ id: 'b', countryCode: 'FR', startDate: '2027-07-01', endDate: '2027-07-10' }),
    ];
    const sets = computeCountrySets(trips);
    expect(sets.visited.has('JP')).toBe(true);
    expect(sets.upcoming.has('FR')).toBe(true);
    expect(sets.ongoing.size).toBe(0);
  });
});

describe('estimateFlightTime / fmtDistance', () => {
  it('formats flight time as hHmm', () => {
    expect(estimateFlightTime(850)).toBe('1h00');
    expect(estimateFlightTime(1275)).toBe('1h30');
  });

  it('formats distance under 1000km in km, over in k km', () => {
    expect(fmtDistance(500)).toBe('500 km');
    expect(fmtDistance(12345)).toBe('12.3k km');
  });
});
