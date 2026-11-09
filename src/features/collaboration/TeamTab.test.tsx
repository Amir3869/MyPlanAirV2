import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TeamTab } from './TeamTab';
import { useTripStore } from '../../store/tripStore';
import type { Trip } from '../../store/types';

vi.mock('../cockpit/useTripContext', async () => {
  const actual = await vi.importActual<typeof import('../../store/tripStore')>('../../store/tripStore');
  return {
    useTripContext: () => {
      const trip = actual.useTripStore((s) => s.trips.find((t) => t.id === 'trip-1'));
      return { trip };
    },
  };
});

vi.mock('../../shared/Toast', () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn(), info: vi.fn(), toast: vi.fn() }),
}));

const makeTrip = (overrides: Partial<Trip> = {}): Trip => ({
  id: 'trip-1',
  destination: 'Nice',
  country: 'France',
  countryCode: 'FR',
  startDate: '2027-06-01',
  endDate: '2027-06-05',
  budget: 500,
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

const seedTrip = (trip: Trip) => {
  useTripStore.getState().addTrip(trip);
};

describe('TeamTab', () => {
  it('shows the current user as owner with a member count of 1 when alone', () => {
    seedTrip(makeTrip());
    useTripStore.getState().setUserName('Amir');
    render(<TeamTab />);

    expect(screen.getByText('1 membre')).toBeInTheDocument();
    expect(screen.getByText('Amir')).toBeInTheDocument();
    expect(screen.getAllByText('Propriétaire').length).toBeGreaterThan(0);
  });

  it('lists additional participants alongside the owner', () => {
    seedTrip(makeTrip());
    useTripStore.setState((s) => ({
      participants: {
        ...s.participants,
        'trip-1': [{ id: 'p1', name: 'Léa', initials: 'LE', gradientHue: 120, role: 'editor' }],
      },
    }));
    render(<TeamTab />);

    expect(screen.getByText('2 membres')).toBeInTheDocument();
    expect(screen.getByText('Léa')).toBeInTheDocument();
    expect(screen.getAllByText('Éditeur').length).toBeGreaterThan(0);
  });

  it('copies the share link to the clipboard when adding a traveler', async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } });

    seedTrip(makeTrip());
    render(<TeamTab />);

    await user.click(screen.getByText('Ajouter un voyageur'));

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith(expect.stringContaining('/share/trip-1?v='));
    });

    vi.unstubAllGlobals();
  });

  it('shows the "coming soon" real-time collaboration banner', () => {
    seedTrip(makeTrip());
    render(<TeamTab />);
    expect(screen.getByText('Collaboration temps réel — Bientôt')).toBeInTheDocument();
  });
});
