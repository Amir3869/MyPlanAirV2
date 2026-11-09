import { describe, it, expect, beforeEach } from 'vitest';
import { useTripStore } from './tripStore';
import type { Trip } from './types';

const makeTrip = (overrides: Partial<Trip> = {}): Trip => ({
  id: 'trip-1',
  destination: 'Tokyo',
  country: 'Japon',
  countryCode: 'JP',
  startDate: '2026-05-01',
  endDate: '2026-05-10',
  budget: 2000,
  currency: 'EUR',
  homeCurrency: 'EUR',
  photoUrl: '',
  steps: [],
  expenses: [],
  checklist: [],
  documents: [],
  notes: '',
  createdAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

const initialState = useTripStore.getState();

beforeEach(() => {
  useTripStore.setState(initialState, true);
});

describe('tripStore — auth & onboarding', () => {
  it('starts signed out and onboarding not done', () => {
    expect(useTripStore.getState().authed).toBe(false);
    expect(useTripStore.getState().onboardingDone).toBe(false);
  });

  it('setAuthed updates authed flag and optionally the user name', () => {
    useTripStore.getState().setAuthed(true, 'Amir');
    expect(useTripStore.getState().authed).toBe(true);
    expect(useTripStore.getState().userName).toBe('Amir');
  });

  it('completeOnboarding marks onboarding done and stores preferences', () => {
    useTripStore.getState().completeOnboarding({
      userName: 'Amir',
      travelStyle: 'solo',
      homeCurrency: 'USD',
      theme: 'ocean',
    });
    const state = useTripStore.getState();
    expect(state.onboardingDone).toBe(true);
    expect(state.userName).toBe('Amir');
    expect(state.travelStyle).toBe('solo');
    expect(state.homeCurrency).toBe('USD');
    expect(state.theme).toBe('ocean');
  });
});

describe('tripStore — trips CRUD', () => {
  it('addTrip prepends the new trip', () => {
    useTripStore.getState().addTrip(makeTrip({ id: 'a' }));
    useTripStore.getState().addTrip(makeTrip({ id: 'b' }));
    expect(useTripStore.getState().trips.map((t) => t.id)).toEqual(['b', 'a']);
  });

  it('updateTrip patches only the matching trip', () => {
    useTripStore.getState().addTrip(makeTrip({ id: 'a', destination: 'Tokyo' }));
    useTripStore.getState().addTrip(makeTrip({ id: 'b', destination: 'Lisbonne' }));
    useTripStore.getState().updateTrip('a', { destination: 'Kyoto' });
    const trips = useTripStore.getState().trips;
    expect(trips.find((t) => t.id === 'a')?.destination).toBe('Kyoto');
    expect(trips.find((t) => t.id === 'b')?.destination).toBe('Lisbonne');
  });

  it('removeTrip deletes the trip and cleans up related pin/participants state', () => {
    useTripStore.getState().addTrip(makeTrip({ id: 'a' }));
    useTripStore.getState().pinTrip('a');
    useTripStore.getState().removeTrip('a');
    const state = useTripStore.getState();
    expect(state.trips).toHaveLength(0);
    expect(state.pinnedTripIds).not.toContain('a');
  });
});

describe('tripStore — pin / unpin', () => {
  it('pinTrip adds an id only once', () => {
    useTripStore.getState().pinTrip('a');
    useTripStore.getState().pinTrip('a');
    expect(useTripStore.getState().pinnedTripIds).toEqual(['a']);
  });

  it('unpinTrip removes the id', () => {
    useTripStore.getState().pinTrip('a');
    useTripStore.getState().unpinTrip('a');
    expect(useTripStore.getState().pinnedTripIds).toEqual([]);
  });
});

describe('tripStore — steps', () => {
  beforeEach(() => {
    useTripStore.getState().addTrip(makeTrip({ id: 'a' }));
  });

  it('addStep appends a step to the right trip', () => {
    useTripStore.getState().addStep('a', {
      id: 's1', day: 1, period: 'morning', type: 'sight', title: 'Visite', place: 'Musée',
    });
    expect(useTripStore.getState().trips[0].steps).toHaveLength(1);
  });

  it('updateStep patches the matching step', () => {
    useTripStore.getState().addStep('a', {
      id: 's1', day: 1, period: 'morning', type: 'sight', title: 'Visite', place: 'Musée',
    });
    useTripStore.getState().updateStep('a', 's1', { title: 'Visite modifiée' });
    expect(useTripStore.getState().trips[0].steps[0].title).toBe('Visite modifiée');
  });

  it('removeStep removes only the targeted step', () => {
    useTripStore.getState().addStep('a', {
      id: 's1', day: 1, period: 'morning', type: 'sight', title: 'A', place: 'X',
    });
    useTripStore.getState().addStep('a', {
      id: 's2', day: 1, period: 'afternoon', type: 'food', title: 'B', place: 'Y',
    });
    useTripStore.getState().removeStep('a', 's1');
    const steps = useTripStore.getState().trips[0].steps;
    expect(steps).toHaveLength(1);
    expect(steps[0].id).toBe('s2');
  });
});

describe('tripStore — expenses', () => {
  beforeEach(() => {
    useTripStore.getState().addTrip(makeTrip({ id: 'a' }));
  });

  const expense = {
    id: 'e1', category: 'food' as const, label: 'Dîner', amount: 30,
    currency: 'EUR', amountHome: 30, homeCurrency: 'EUR', exchangeRate: 1, date: '2026-05-02',
  };

  it('addExpense prepends the expense to the trip', () => {
    useTripStore.getState().addExpense('a', expense);
    expect(useTripStore.getState().trips[0].expenses).toHaveLength(1);
  });

  it('updateExpense patches the matching expense', () => {
    useTripStore.getState().addExpense('a', expense);
    useTripStore.getState().updateExpense('a', 'e1', { amount: 45 });
    expect(useTripStore.getState().trips[0].expenses[0].amount).toBe(45);
  });

  it('removeExpense removes the matching expense', () => {
    useTripStore.getState().addExpense('a', expense);
    useTripStore.getState().removeExpense('a', 'e1');
    expect(useTripStore.getState().trips[0].expenses).toHaveLength(0);
  });
});

describe('tripStore — checklist', () => {
  beforeEach(() => {
    useTripStore.getState().addTrip(makeTrip({ id: 'a' }));
  });

  it('addChecklistItem adds an undone item', () => {
    useTripStore.getState().addChecklistItem('a', 'Passeport');
    const item = useTripStore.getState().trips[0].checklist[0];
    expect(item.label).toBe('Passeport');
    expect(item.done).toBe(false);
  });

  it('toggleChecklist flips the done flag', () => {
    useTripStore.getState().addChecklistItem('a', 'Passeport');
    const id = useTripStore.getState().trips[0].checklist[0].id;
    useTripStore.getState().toggleChecklist('a', id);
    expect(useTripStore.getState().trips[0].checklist[0].done).toBe(true);
  });

  it('removeChecklistItem removes the matching item', () => {
    useTripStore.getState().addChecklistItem('a', 'Passeport');
    const id = useTripStore.getState().trips[0].checklist[0].id;
    useTripStore.getState().removeChecklistItem('a', id);
    expect(useTripStore.getState().trips[0].checklist).toHaveLength(0);
  });
});

describe('tripStore — notifications', () => {
  it('addNotification is a no-op when notifications are disabled', () => {
    useTripStore.getState().setNotificationsEnabled(false);
    useTripStore.getState().addNotification({ type: 'tip', title: 'Astuce', body: 'Buvez de l’eau' });
    expect(useTripStore.getState().notifications).toHaveLength(0);
  });

  it('addNotification is a no-op for a trip with notifications disabled', () => {
    useTripStore.getState().toggleNotifForTrip('a');
    useTripStore.getState().addNotification({ type: 'tip', title: 'Astuce', body: 'x', tripId: 'a' });
    expect(useTripStore.getState().notifications).toHaveLength(0);
  });

  it('addNotification replaces an existing entry with the same dedupeKey', () => {
    useTripStore.getState().addNotification({ type: 'tip', title: 'Astuce 1', body: 'x', dedupeKey: 'k' });
    useTripStore.getState().addNotification({ type: 'tip', title: 'Astuce 2', body: 'y', dedupeKey: 'k' });
    const notifs = useTripStore.getState().notifications;
    expect(notifs).toHaveLength(1);
    expect(notifs[0].title).toBe('Astuce 2');
  });

  it('markAllNotifsRead marks every notification as read', () => {
    useTripStore.getState().addNotification({ type: 'tip', title: 'A', body: 'x' });
    useTripStore.getState().addNotification({ type: 'tip', title: 'B', body: 'y' });
    useTripStore.getState().markAllNotifsRead();
    expect(useTripStore.getState().notifications.every((n) => n.read)).toBe(true);
  });
});
