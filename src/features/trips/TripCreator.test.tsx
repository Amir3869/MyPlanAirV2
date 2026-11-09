import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { TripCreator } from './TripCreator';
import { useTripStore } from '../../store/tripStore';
import type { CityEntry } from '../../api/countries';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('../../api/countries', async () => {
  const actual = await vi.importActual<typeof import('../../api/countries')>('../../api/countries');
  const PARIS: CityEntry = {
    type: 'city', city: 'Paris', country: 'France', countryCode: 'FR',
    currency: 'EUR', lat: 48.8566, lon: 2.3522,
  };
  return {
    ...actual,
    searchAll: vi.fn().mockResolvedValue([PARIS]),
  };
});

vi.mock('../../api/cloud', async () => {
  const actual = await vi.importActual<typeof import('../../api/cloud')>('../../api/cloud');
  return {
    ...actual,
    fetchTripPhoto: vi.fn().mockResolvedValue({ ok: true, photoUrl: 'https://example.com/photo.jpg' }),
    fetchAssistant: vi.fn().mockResolvedValue({ ok: true, checklist: ['Passeport'] }),
  };
});

vi.mock('../../api/currency', () => ({
  fetchRate: vi.fn().mockResolvedValue({ rate: 1, source: 'live' }),
}));

vi.mock('../../api/weather', () => ({
  geocodeCity: vi.fn().mockResolvedValue({ lat: 0, lon: 0, isFallback: false }),
}));

vi.mock('../decouvrir/itineraryApi', () => ({
  fetchItinerary: vi.fn().mockResolvedValue({ ok: true, steps: [] }),
}));

const toastError = vi.fn();
vi.mock('../../shared/Toast', () => ({
  useToast: () => ({ error: toastError, success: vi.fn(), info: vi.fn(), toast: vi.fn() }),
}));

const initialState = useTripStore.getState();

beforeEach(() => {
  useTripStore.setState(initialState, true);
  mockNavigate.mockClear();
  toastError.mockClear();
});

const renderTripCreator = (onClose = vi.fn(), onCreatedTrip?: (trip: unknown) => void) => {
  render(
    <MemoryRouter>
      <TripCreator onClose={onClose} onCreatedTrip={onCreatedTrip as never} />
    </MemoryRouter>,
  );
  return { onClose };
};

describe('TripCreator — golden path', () => {
  it('creates a trip end-to-end: pick destination → dates → budget → AI step → save', async () => {
    const user = userEvent.setup();
    const onCreatedTrip = vi.fn();
    renderTripCreator(vi.fn(), onCreatedTrip);

    // ── Étape 1 — destination ──
    expect(screen.getByText('Où allez-vous ?')).toBeInTheDocument();
    const nextButton = () => screen.getByRole('button', { name: /continuer/i });
    expect(nextButton()).toBeDisabled();

    const input = screen.getByPlaceholderText(/Paris, Malaisie/i);
    await user.type(input, 'Paris');

    const suggestion = await screen.findByText('Paris');
    await user.click(suggestion);

    expect(nextButton()).toBeEnabled();
    await user.click(nextButton());

    // ── Étape 2 — dates (pré-remplies par défaut) ──
    expect(await screen.findByText('Quand partez-vous ?')).toBeInTheDocument();
    expect(nextButton()).toBeEnabled();
    await user.click(nextButton());

    // ── Étape 3 — budget ──
    expect(await screen.findByText('Quel est votre budget ?')).toBeInTheDocument();
    await user.click(nextButton());

    // ── Étape 4 — itinéraire IA (on garde le choix par défaut "Non") ──
    expect(await screen.findByText('Voulez-vous un itinéraire IA ?')).toBeInTheDocument();
    const createButton = screen.getByRole('button', { name: /créer mon carnet/i });
    await user.click(createButton);

    await waitFor(() => {
      expect(useTripStore.getState().trips).toHaveLength(1);
    });

    const trip = useTripStore.getState().trips[0];
    expect(trip.destination).toBe('Paris');
    expect(trip.country).toBe('France');
    expect(trip.checklist.length).toBeGreaterThan(0);

    // onCreatedTrip/onClose fire after a short UX delay once the trip is saved.
    await waitFor(() => {
      expect(onCreatedTrip).toHaveBeenCalledWith(expect.objectContaining({ destination: 'Paris' }));
    }, { timeout: 2000 });
  });

  it('keeps the create button disabled until a destination is picked', () => {
    renderTripCreator();
    expect(screen.getByRole('button', { name: /continuer/i })).toBeDisabled();
  });

  it('shows a toast and does not crash the UI if trip creation fails unexpectedly', async () => {
    const user = userEvent.setup();
    const { useTripStore: store } = await import('../../store/tripStore');
    // Force addTrip to throw to simulate an unexpected failure mid-creation.
    const original = store.getState().addTrip;
    store.setState({ addTrip: () => { throw new Error('boom'); } });

    renderTripCreator();

    const input = screen.getByPlaceholderText(/Paris, Malaisie/i);
    await user.type(input, 'Paris');
    const suggestion = await screen.findByText('Paris');
    await user.click(suggestion);
    await user.click(screen.getByRole('button', { name: /continuer/i }));
    await user.click(screen.getByRole('button', { name: /continuer/i }));
    await user.click(screen.getByRole('button', { name: /continuer/i }));

    const createButton = await screen.findByRole('button', { name: /créer mon carnet/i });
    await user.click(createButton);

    await waitFor(() => expect(toastError).toHaveBeenCalled());

    store.setState({ addTrip: original });
  });
});

describe('TripCreator — roadtrip mode', () => {
  it('requires fully allocated days across stops before continuing', async () => {
    const user = userEvent.setup();
    const FRANCE: CityEntry = {
      type: 'country', city: 'France', country: 'France', countryCode: 'FR',
      currency: 'EUR', lat: 46.6, lon: 2.2,
    };
    const { searchAll } = await import('../../api/countries');
    (searchAll as unknown as ReturnType<typeof vi.fn>).mockResolvedValue([FRANCE]);

    renderTripCreator();

    const input = screen.getByPlaceholderText(/Paris, Malaisie/i);
    await user.type(input, 'France');
    const suggestion = await screen.findByText('France');
    await user.click(suggestion);

    await user.click(screen.getByText(/Roadtrip — Plusieurs villes/i));
    await user.click(screen.getByRole('button', { name: /continuer/i }));
    await user.click(screen.getByRole('button', { name: /continuer/i }));

    expect(await screen.findByText('Votre itinéraire')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /ajoutez une ville/i })).toBeDisabled();
  });
});
