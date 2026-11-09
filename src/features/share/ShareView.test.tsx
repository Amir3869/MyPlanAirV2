import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ShareView } from './ShareView';
import { useTripStore } from '../../store/tripStore';
import type { Trip } from '../../store/types';

const makeTrip = (overrides: Partial<Trip> = {}): Trip => ({
  id: 'trip-1',
  destination: 'Marrakech',
  country: 'Maroc',
  countryCode: 'MA',
  startDate: '2027-03-01',
  endDate: '2027-03-05',
  budget: 500,
  currency: 'EUR',
  homeCurrency: 'EUR',
  photoUrl: '',
  steps: [],
  expenses: [],
  checklist: [],
  documents: [],
  notes: 'notes privées jamais affichées',
  createdAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

const initialState = useTripStore.getState();

beforeEach(() => {
  useTripStore.setState(initialState, true);
});

const renderShare = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/share/:id" element={<ShareView />} />
      </Routes>
    </MemoryRouter>,
  );

describe('ShareView — trip resolution', () => {
  it('shows a not-found state when the trip id is unknown and no encoded payload is given', () => {
    renderShare('/share/unknown-id');
    expect(screen.getByText('Voyage introuvable')).toBeInTheDocument();
  });

  it('reads the trip from the local store when no ?v= payload is present', () => {
    useTripStore.getState().addTrip(makeTrip());
    renderShare('/share/trip-1');

    expect(screen.getByText('Marrakech')).toBeInTheDocument();
    expect(screen.getByText('Maroc')).toBeInTheDocument();
  });

  it('prefers the base64-encoded ?v= payload over the local store (cross-device sharing)', () => {
    useTripStore.getState().addTrip(makeTrip({ destination: 'Marrakech (local)' }));

    const sharedTrip = makeTrip({ id: 'trip-1', destination: 'Marrakech (partagé)' });
    const encoded = btoa(encodeURIComponent(JSON.stringify(sharedTrip)));
    renderShare(`/share/trip-1?v=${encoded}`);

    expect(screen.getByText('Marrakech (partagé)')).toBeInTheDocument();
    expect(screen.queryByText('Marrakech (local)')).not.toBeInTheDocument();
  });

  it('shows not-found if the ?v= payload is malformed, instead of crashing', () => {
    renderShare('/share/trip-1?v=not-valid-base64!!!');
    expect(screen.getByText('Voyage introuvable')).toBeInTheDocument();
  });
});

describe('ShareView — privacy: private expenses are hidden', () => {
  it('excludes private expenses from the public spent total', () => {
    useTripStore.getState().addTrip(makeTrip({
      budget: 200,
      expenses: [
        { id: 'e1', category: 'food', label: 'Public', amount: 30, currency: 'EUR', amountHome: 30, homeCurrency: 'EUR', exchangeRate: 1, date: '2027-03-02' },
        { id: 'e2', category: 'other', label: 'Secret', amount: 999, currency: 'EUR', amountHome: 999, homeCurrency: 'EUR', exchangeRate: 1, date: '2027-03-02', private: true },
      ],
    }));
    renderShare('/share/trip-1');

    expect(screen.getByText('30 €')).toBeInTheDocument();
    expect(screen.queryByText('999 €')).not.toBeInTheDocument();
    expect(screen.getByText(/certaines dépenses sont masquées/i)).toBeInTheDocument();
  });

  it('never renders the trip notes field', () => {
    useTripStore.getState().addTrip(makeTrip({ notes: 'adresse secrète de ma grand-mère' }));
    renderShare('/share/trip-1');

    expect(screen.queryByText('adresse secrète de ma grand-mère')).not.toBeInTheDocument();
  });
});

describe('ShareView — content sections', () => {
  it('groups itinerary steps by day, sorted by period', () => {
    useTripStore.getState().addTrip(makeTrip({
      steps: [
        { id: 's1', day: 1, period: 'night', type: 'food', title: 'Dîner', place: 'Riad' },
        { id: 's2', day: 1, period: 'morning', type: 'sight', title: 'Médina', place: 'Centre' },
      ],
    }));
    renderShare('/share/trip-1');

    const dayHeading = screen.getByText('Jour 1');
    const stepTitles = Array.from(
      dayHeading.parentElement!.querySelectorAll('.font-medium.text-sm'),
    ).map((el) => el.textContent);
    expect(stepTitles).toEqual(['Médina', 'Dîner']);
  });

  it('shows checklist completion state', () => {
    useTripStore.getState().addTrip(makeTrip({
      checklist: [
        { id: 'c1', label: 'Passeport', done: true },
        { id: 'c2', label: 'Visa', done: false },
      ],
    }));
    renderShare('/share/trip-1');

    expect(screen.getByText('1/2')).toBeInTheDocument();
    expect(screen.getByText('Passeport')).toBeInTheDocument();
    expect(screen.getByText('Visa')).toBeInTheDocument();
  });
});
