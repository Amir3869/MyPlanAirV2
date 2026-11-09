import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Dashboard } from './Dashboard';
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

const makeTrip = (overrides: Partial<Trip> = {}): Trip => ({
  id: 'trip-1',
  destination: 'Kyoto',
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

beforeEach(() => {
  useTripStore.setState(initialState, true);
  mockNavigate.mockClear();
});

describe('Dashboard — empty state', () => {
  it('shows the create-trip CTA when there are no trips', () => {
    render(<Dashboard />);
    expect(screen.getByText('Ta prochaine aventure')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /créer un voyage/i })).toBeInTheDocument();
  });

  it('shows the Marketplace and World cards with zero stats', () => {
    render(<Dashboard />);
    expect(screen.getByText('Mon Monde')).toBeInTheDocument();
    expect(screen.getByText('0 pays')).toBeInTheDocument();
    expect(screen.getByText('Marketplace')).toBeInTheDocument();
  });
});

describe('Dashboard — with an ongoing trip', () => {
  it('shows the Documents card instead of budget/community for an ongoing trip', () => {
    useTripStore.getState().addTrip(makeTrip({ startDate: '2020-01-01', endDate: '2099-01-01' }));
    render(<Dashboard />);

    expect(screen.getByText('Documents')).toBeInTheDocument();
    expect(screen.queryByText('Communauté')).not.toBeInTheDocument();
  });

  it('navigates to the trip documents page when the Documents card is clicked', async () => {
    const user = userEvent.setup();
    useTripStore.getState().addTrip(makeTrip({ id: 'trip-1', startDate: '2020-01-01', endDate: '2099-01-01' }));
    render(<Dashboard />);

    await user.click(screen.getByText('Documents'));
    expect(mockNavigate).toHaveBeenCalledWith('/trip/trip-1/documents');
  });
});

describe('Dashboard — with an upcoming trip', () => {
  it('shows the planned budget card for an upcoming trip', () => {
    useTripStore.getState().addTrip(makeTrip({ budget: 1500, currency: 'EUR' }));
    render(<Dashboard />);

    expect(screen.getByText('Budget')).toBeInTheDocument();
    expect(screen.getAllByText('1 500 €').length).toBeGreaterThan(0);
  });
});

describe('Dashboard — navigation', () => {
  it('navigates to /world when the "Mon Monde" card is clicked', async () => {
    const user = userEvent.setup();
    render(<Dashboard />);
    await user.click(screen.getByText('Mon Monde'));
    expect(mockNavigate).toHaveBeenCalledWith('/world');
  });

  it('navigates to the profile page when the avatar is clicked', async () => {
    const user = userEvent.setup();
    render(<Dashboard />);
    await user.click(screen.getByLabelText('Mon profil'));
    expect(mockNavigate).toHaveBeenCalledWith('/profil');
  });
});
