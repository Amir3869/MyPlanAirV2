import { describe, it, expect } from 'vitest';
import { generatePlannerDemoSuggestions, getBudgetFeedback } from './plannerFallback';
import type { PlannerRequest } from './plannerTypes';

const baseRequest: PlannerRequest = {
  mood: 'surprise',
  prompt: '',
  tripMode: 'auto',
  preferredCities: [],
  origin: { city: 'Paris', lat: 48.8566, lon: 2.3522 },
  budget: 1000,
  days: 7,
  travelStyle: 'solo',
  currency: 'EUR',
};

describe('getBudgetFeedback', () => {
  it('rates a budget far above the estimate as very comfortable', () => {
    expect(getBudgetFeedback(1800, 1000).level).toBe('comfortable');
  });

  it('rates a budget close to the estimate as "good"', () => {
    expect(getBudgetFeedback(1000, 1000).level).toBe('good');
  });

  it('rates a budget below the estimate as "tight"', () => {
    expect(getBudgetFeedback(800, 1000).level).toBe('tight');
  });

  it('rates a budget far below the estimate as "too_low"', () => {
    expect(getBudgetFeedback(400, 1000).level).toBe('too_low');
  });
});

describe('generatePlannerDemoSuggestions — targeted city', () => {
  it('returns a single suggestion scoped to the chosen city', () => {
    const request: PlannerRequest = {
      ...baseRequest,
      destination: { label: 'Tokyo', country: 'Japon', countryCode: 'JP', type: 'city', lat: 35.68, lon: 139.69 },
    };
    const suggestions = generatePlannerDemoSuggestions(request);

    expect(suggestions).toHaveLength(1);
    expect(suggestions[0].destination).toBe('Tokyo');
    expect(suggestions[0].countryCode).toBe('JP');
    expect(suggestions[0].type).toBe('city');
    expect(suggestions[0].days).toBe(7);
    expect(suggestions[0].estimatedBudget).toBeGreaterThan(0);
  });

  it('estimates a higher budget for a family than for a solo traveler, all else equal', () => {
    const destination = { label: 'Tokyo', country: 'Japon', countryCode: 'JP', type: 'city' as const, lat: 35.68, lon: 139.69 };
    const solo = generatePlannerDemoSuggestions({ ...baseRequest, destination, travelStyle: 'solo' })[0];
    const family = generatePlannerDemoSuggestions({ ...baseRequest, destination, travelStyle: 'family' })[0];

    expect(family.estimatedBudget).toBeGreaterThan(solo.estimatedBudget);
  });
});

describe('generatePlannerDemoSuggestions — targeted country', () => {
  it('returns a single simple-stay suggestion centered on the capital by default', () => {
    const request: PlannerRequest = {
      ...baseRequest,
      destination: { label: 'Japon', country: 'Japon', countryCode: 'JP', capital: 'Tokyo', type: 'country' },
    };
    const suggestions = generatePlannerDemoSuggestions(request);

    expect(suggestions).toHaveLength(1);
    expect(suggestions[0].destination).toBe('Tokyo');
    expect(suggestions[0].type).toBe('city');
  });

  it('returns up to 3 roadtrip variants when tripMode is "roadtrip"', () => {
    const request: PlannerRequest = {
      ...baseRequest,
      tripMode: 'roadtrip',
      days: 10,
      destination: { label: 'Japon', country: 'Japon', countryCode: 'JP', capital: 'Tokyo', type: 'country' },
    };
    const suggestions = generatePlannerDemoSuggestions(request);

    expect(suggestions.length).toBeGreaterThan(1);
    expect(suggestions.length).toBeLessThanOrEqual(3);
    suggestions.forEach((s) => {
      expect(s.type).toBe('roadtrip');
      expect(s.stops && s.stops.length).toBeGreaterThan(0);
      const totalStopDays = s.stops!.reduce((sum, stop) => sum + stop.days, 0);
      expect(totalStopDays).toBe(request.days);
    });
  });

  it('prioritizes the user-preferred cities in the roadtrip stops', () => {
    const request: PlannerRequest = {
      ...baseRequest,
      tripMode: 'roadtrip',
      days: 9,
      preferredCities: ['Kyoto'],
      destination: { label: 'Japon', country: 'Japon', countryCode: 'JP', capital: 'Tokyo', type: 'country' },
    };
    const [first] = generatePlannerDemoSuggestions(request);
    expect(first.stops!.some((stop) => stop.city === 'Kyoto')).toBe(true);
  });
});

describe('generatePlannerDemoSuggestions — no destination (inspiration mode)', () => {
  it('returns mood-matched ideas when no destination is picked', () => {
    const request: PlannerRequest = { ...baseRequest, mood: 'sun', prompt: '' };
    const suggestions = generatePlannerDemoSuggestions(request);

    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions.length).toBeLessThanOrEqual(3);
    suggestions.forEach((s) => expect(s.estimatedBudget).toBeGreaterThan(0));
  });

  it('picks sun-themed ideas when the prompt mentions the beach, regardless of mood', () => {
    const request: PlannerRequest = { ...baseRequest, mood: 'culture', prompt: 'Je veux du soleil et la plage' };
    const suggestions = generatePlannerDemoSuggestions(request);
    expect(suggestions.map((s) => s.destination)).toContain('Marrakech');
  });

  it('gives every suggestion a unique id', () => {
    const request: PlannerRequest = { ...baseRequest, mood: 'roadtrip', prompt: '' };
    const suggestions = generatePlannerDemoSuggestions(request);
    const ids = new Set(suggestions.map((s) => s.id));
    expect(ids.size).toBe(suggestions.length);
  });
});
