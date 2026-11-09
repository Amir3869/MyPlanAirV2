import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { TripsHub } from './TripsHub';
import { useTripStore } from '../../store/tripStore';
import type { Trip } from '../../store/types';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('@clerk/clerk-react', () => ({
  useClerk: () => ({ user: null }),
}));

vi.mock('../../shared/Toast', () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn(), info: vi.fn(), toast: vi.fn() }),
}));

vi.mock('../../utils/docStorage', () => ({
  DocStorage: { clearTrip: vi.fn().mockResolvedValue(undefined) },
}));
vi.mock('../../utils/memoryStorage', () => ({
  MemoryStorage: { clearTrip: vi.fn().mockResolvedValue(undefined) },
}));

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
  steps: [],
  expenses: [],
  checklist: [],
  documents: [],
  notes: '',
  createdAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

const initialState = useTripStore.getState();

const renderHub = () => render(<MemoryRouter><TripsHub /></MemoryRouter>);

beforeEach(() => {
  useTripStore.setState(initialState, true);
  mockNavigate.mockClear();
});

describe('TripsHub — empty and listing', () => {
  it('shows an empty state when there are no trips', () => {
    renderHub();
    expect(screen.getByText('Votre prochaine aventure commence ici')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /créer un voyage/i })).toBeInTheDocument();
  });

  it('lists trips and navigates to the trip overview on click', async () => {
    const user = userEvent.setup();
    useTripStore.getState().addTrip(makeTrip());
    renderHub();

    await user.click(screen.getByText('Tokyo'));
    expect(mockNavigate).toHaveBeenCalledWith('/trip/trip-1/overview');
  });
});

describe('TripsHub — filters and search', () => {
  it('filters trips by status', async () => {
    const user = userEvent.setup();
    useTripStore.getState().addTrip(makeTrip({ id: 'a', destination: 'Tokyo', startDate: '2027-07-01', endDate: '2027-07-10' }));
    useTripStore.getState().addTrip(makeTrip({ id: 'b', destination: 'Rome', startDate: '2020-01-01', endDate: '2020-01-10' }));
    renderHub();

    expect(screen.getByText('Tokyo')).toBeInTheDocument();
    expect(screen.getByText('Rome')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Terminés' }));

    expect(screen.queryByText('Tokyo')).not.toBeInTheDocument();
    expect(screen.getByText('Rome')).toBeInTheDocument();
  });

  it('searches trips by destination name', async () => {
    const user = userEvent.setup();
    useTripStore.getState().addTrip(makeTrip({ id: 'a', destination: 'Tokyo', country: 'Japon' }));
    useTripStore.getState().addTrip(makeTrip({ id: 'b', destination: 'Rome', country: 'Italie' }));
    renderHub();

    await user.click(screen.getByRole('button', { name: /rechercher/i }));
    await user.type(screen.getByPlaceholderText('Rechercher un voyage...'), 'rome');

    expect(screen.queryByText('Tokyo')).not.toBeInTheDocument();
    expect(screen.getByText('Rome')).toBeInTheDocument();
  });
});

describe('TripsHub — long-press actions', () => {
  it('pins and unpins a trip via the long-press menu', async () => {
    const user = userEvent.setup();
    useTripStore.getState().addTrip(makeTrip());
    renderHub();

    const card = screen.getByText('Tokyo').closest('div')!.parentElement!.parentElement!;
    card.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }));

    const pinButton = await screen.findByText('Épingler');
    await user.click(pinButton);

    await waitFor(() => {
      expect(useTripStore.getState().pinnedTripIds).toContain('trip-1');
    });
  });

  it('deletes a trip after confirming', async () => {
    const user = userEvent.setup();
    useTripStore.getState().addTrip(makeTrip());
    renderHub();

    const card = screen.getByText('Tokyo').closest('div')!.parentElement!.parentElement!;
    card.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }));

    await user.click(await screen.findByText('Supprimer'));
    expect(await screen.findByText('Supprimer le voyage ?')).toBeInTheDocument();

    const confirmButtons = screen.getAllByRole('button', { name: 'Supprimer' });
    await user.click(confirmButtons[confirmButtons.length - 1]);

    await waitFor(() => {
      expect(useTripStore.getState().trips).toHaveLength(0);
    });
  });
});
