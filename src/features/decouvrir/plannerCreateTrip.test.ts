import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createPlannerTrip } from './plannerCreateTrip';
import type { PlannerSuggestion } from './plannerTypes';

const fetchTripPhoto = vi.fn();
const fetchAssistant = vi.fn();
vi.mock('../../api/cloud', async () => {
  const actual = await vi.importActual<typeof import('../../api/cloud')>('../../api/cloud');
  return {
    ...actual,
    fetchTripPhoto: (...args: unknown[]) => fetchTripPhoto(...args),
    fetchAssistant: (...args: unknown[]) => fetchAssistant(...args),
  };
});

const fetchItinerary = vi.fn();
vi.mock('./itineraryApi', async () => {
  const actual = await vi.importActual<typeof import('./itineraryApi')>('./itineraryApi');
  return {
    ...actual,
    fetchItinerary: (...args: unknown[]) => fetchItinerary(...args),
  };
});

const makeSuggestion = (overrides: Partial<PlannerSuggestion> = {}): PlannerSuggestion => ({
  id: 'jp-tokyo-city',
  destination: 'Tokyo',
  country: 'Japon',
  countryCode: 'JP',
  lat: 35.68,
  lon: 139.69,
  type: 'city',
  days: 7,
  estimatedBudget: 1800,
  currency: 'EUR',
  bestFor: 'City trip',
  description: 'Un super voyage à Tokyo.',
  breakdown: { route: 600, lodging: 500, food: 300, activities: 200, localTransport: 100, safety: 100 },
  feedback: { level: 'good', label: 'Budget faisable', emoji: '👍', color: '#7c8cff', message: '' },
  ...overrides,
});

beforeEach(() => {
  fetchTripPhoto.mockReset();
  fetchAssistant.mockReset();
  fetchItinerary.mockReset();
  fetchTripPhoto.mockResolvedValue({ ok: true, photoUrl: 'https://example.com/tokyo.jpg' });
  fetchAssistant.mockResolvedValue({ ok: true, checklist: ['Passeport', 'Visa'] });
  fetchItinerary.mockResolvedValue({ ok: true, steps: [] });
});

describe('createPlannerTrip — simple city trip', () => {
  it('builds a trip with correct dates, budget and checklist from the API', async () => {
    const trip = await createPlannerTrip({
      suggestion: makeSuggestion(),
      startDate: '2027-03-01',
      homeCurrency: 'EUR',
      travelStyle: 'solo',
      withItinerary: false,
    });

    expect(trip.destination).toBe('Tokyo');
    expect(trip.startDate).toBe('2027-03-01');
    expect(trip.endDate).toBe('2027-03-07');
    expect(trip.budget).toBe(1800);
    expect(trip.photoUrl).toBe('https://example.com/tokyo.jpg');
    expect(trip.checklist.map((c) => c.label)).toEqual(['Passeport', 'Visa']);
    expect(trip.isRoadtrip).toBe(false);
    expect(trip.destinations).toBeUndefined();
    expect(trip.notes).toContain('Un super voyage à Tokyo.');
  });

  it('falls back to a default checklist when the assistant API fails', async () => {
    fetchAssistant.mockResolvedValue({ ok: false, error: 'offline' });
    const trip = await createPlannerTrip({
      suggestion: makeSuggestion(),
      startDate: '2027-03-01',
      homeCurrency: 'EUR',
      travelStyle: 'solo',
      withItinerary: false,
    });

    expect(trip.checklist.length).toBeGreaterThan(0);
    expect(trip.checklist[0].label).toBe("Passeport / Carte d'identité");
  });

  it('falls back to a default photo when the photo API fails', async () => {
    fetchTripPhoto.mockResolvedValue({ ok: false, photoUrl: null, reason: 'network_error' });
    const trip = await createPlannerTrip({
      suggestion: makeSuggestion(),
      startDate: '2027-03-01',
      homeCurrency: 'EUR',
      travelStyle: 'solo',
      withItinerary: false,
    });

    expect(trip.photoUrl).toContain('unsplash.com');
  });

  it('does not fetch an itinerary when withItinerary is false', async () => {
    await createPlannerTrip({
      suggestion: makeSuggestion(),
      startDate: '2027-03-01',
      homeCurrency: 'EUR',
      travelStyle: 'solo',
      withItinerary: false,
    });
    expect(fetchItinerary).not.toHaveBeenCalled();
  });

  it('fetches and applies the itinerary steps when withItinerary is true', async () => {
    fetchItinerary.mockResolvedValue({
      ok: true,
      steps: [{ id: 's1', day: 1, period: 'morning', type: 'sight', title: 'Senso-ji', place: 'Asakusa' }],
    });
    const trip = await createPlannerTrip({
      suggestion: makeSuggestion(),
      startDate: '2027-03-01',
      homeCurrency: 'EUR',
      travelStyle: 'solo',
      withItinerary: true,
    });

    expect(trip.steps).toHaveLength(1);
    expect(trip.steps[0].title).toBe('Senso-ji');
  });

  it('reports progress through each phase in order', async () => {
    const steps: string[] = [];
    await createPlannerTrip(
      { suggestion: makeSuggestion(), startDate: '2027-03-01', homeCurrency: 'EUR', travelStyle: 'solo', withItinerary: true },
      { onProgress: (step) => steps.push(step) },
    );
    expect(steps).toEqual(['photo', 'checklist', 'itinerary', 'saving']);
  });
});

describe('createPlannerTrip — roadtrip', () => {
  it('builds roadtrip destinations with correct day ranges from stops', async () => {
    const suggestion = makeSuggestion({
      type: 'roadtrip',
      destination: 'Japon · Roadtrip',
      days: 9,
      stops: [
        { city: 'Tokyo', days: 3 },
        { city: 'Kyoto', days: 3 },
        { city: 'Osaka', days: 3 },
      ],
    });

    const trip = await createPlannerTrip({
      suggestion,
      startDate: '2027-03-01',
      homeCurrency: 'EUR',
      travelStyle: 'couple',
      withItinerary: false,
    });

    expect(trip.isRoadtrip).toBe(true);
    expect(trip.destination).toBe('Japon');
    expect(trip.destinations).toHaveLength(3);
    expect(trip.destinations![0]).toMatchObject({ city: 'Tokyo', fromDay: 1, toDay: 3 });
    expect(trip.destinations![1]).toMatchObject({ city: 'Kyoto', fromDay: 4, toDay: 6 });
    expect(trip.destinations![2]).toMatchObject({ city: 'Osaka', fromDay: 7, toDay: 9 });
  });

  it('uses the first stop city as the main city for photo/assistant lookups', async () => {
    const suggestion = makeSuggestion({
      type: 'roadtrip',
      destination: 'Japon · Roadtrip',
      days: 6,
      stops: [{ city: 'Osaka', days: 6 }],
    });

    await createPlannerTrip({
      suggestion,
      startDate: '2027-03-01',
      homeCurrency: 'EUR',
      travelStyle: 'solo',
      withItinerary: false,
    });

    expect(fetchTripPhoto).toHaveBeenCalledWith(expect.objectContaining({ city: 'Osaka' }));
  });
});
