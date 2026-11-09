import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { TripCockpit } from './TripCockpit';
import { useTripStore } from '../../store/tripStore';
import type { Trip } from '../../store/types';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('../../shared/Toast', () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn(), info: vi.fn(), toast: vi.fn() }),
}));

const makeTrip = (overrides: Partial<Trip> = {}): Trip => ({
  id: 'trip-1',
  destination: 'Séoul',
  country: 'Corée du Sud',
  countryCode: 'KR',
  startDate: '2027-09-01',
  endDate: '2027-09-10',
  budget: 1500,
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

const renderCockpit = (initialPath = '/trip/trip-1/overview') =>
  render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/trip/:id/*" element={<TripCockpit />}>
          <Route path="overview" element={<div>Overview content</div>} />
          <Route path="budget" element={<div>Budget content</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );

beforeEach(() => {
  useTripStore.setState(initialState, true);
  mockNavigate.mockClear();
});

describe('TripCockpit', () => {
  it('shows a not-found state and offers to go back if the trip does not exist', () => {
    render(
      <MemoryRouter initialEntries={['/trip/unknown/overview']}>
        <Routes>
          <Route path="/trip/:id/*" element={<TripCockpit />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByText('Voyage introuvable.')).toBeInTheDocument();
  });

  it('renders the trip header and the routed child content', () => {
    useTripStore.getState().addTrip(makeTrip());
    renderCockpit();

    expect(screen.getByText('Séoul')).toBeInTheDocument();
    expect(screen.getByText('Corée du Sud')).toBeInTheDocument();
    expect(screen.getByText('Overview content')).toBeInTheDocument();
  });

  it('navigates back to /voyages when on the overview tab', async () => {
    const user = userEvent.setup();
    useTripStore.getState().addTrip(makeTrip());
    renderCockpit('/trip/trip-1/overview');

    await user.click(screen.getByLabelText('Retour'));
    expect(mockNavigate).toHaveBeenCalledWith('/voyages');
  });

  it('navigates back to overview when on a non-overview tab', async () => {
    const user = userEvent.setup();
    useTripStore.getState().addTrip(makeTrip());
    renderCockpit('/trip/trip-1/budget');

    await user.click(screen.getByLabelText('Retour'));
    expect(mockNavigate).toHaveBeenCalledWith('/trip/trip-1/overview');
  });

  it('opens the share sheet and copies the link to the clipboard', async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } });

    useTripStore.getState().addTrip(makeTrip());
    renderCockpit();

    await user.click(screen.getByLabelText('Partager'));
    expect(await screen.findByText('Partager le voyage')).toBeInTheDocument();

    await user.click(screen.getByText('Copier le lien de partage'));
    expect(writeText).toHaveBeenCalled();

    vi.unstubAllGlobals();
  });

  it('navigates to the team page', async () => {
    const user = userEvent.setup();
    useTripStore.getState().addTrip(makeTrip());
    renderCockpit();

    await user.click(screen.getByLabelText('Team'));
    expect(mockNavigate).toHaveBeenCalledWith('/trip/trip-1/team');
  });
});
