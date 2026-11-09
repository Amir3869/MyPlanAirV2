import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { Parcours } from './Parcours';
import { useTripStore } from '../../store/tripStore';
import type { Trip } from '../../store/types';

// AnimatePresence's exit transitions (mode="wait") don't reliably resolve in
// jsdom, which makes step-by-step wizard flows flaky. Render children as-is.
vi.mock('framer-motion', async () => {
  const actual = await vi.importActual<typeof import('framer-motion')>('framer-motion');
  return {
    ...actual,
    AnimatePresence: ({ children }: { children: ReactNode }) => children,
  };
});

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

vi.mock('../decouvrir/itineraryApi', () => ({
  fetchItinerary: vi.fn().mockResolvedValue({ ok: false, steps: [] }),
}));

const makeTrip = (overrides: Partial<Trip> = {}): Trip => ({
  id: 'trip-1',
  destination: 'Florence',
  country: 'Italie',
  countryCode: 'IT',
  startDate: '2027-05-01',
  endDate: '2027-05-05',
  budget: 900,
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

describe('Parcours — day navigation', () => {
  it('shows day 1 selected by default and switches days on click', async () => {
    const user = userEvent.setup();
    useTripStore.getState().addTrip(makeTrip({
      steps: [
        { id: 's1', day: 1, period: 'morning', type: 'sight', title: 'Duomo', place: 'Centre' },
        { id: 's2', day: 2, period: 'morning', type: 'food', title: 'Trattoria', place: 'Oltrarno' },
      ],
    }));
    render(<Parcours />);

    expect(screen.getByText('Duomo')).toBeInTheDocument();
    expect(screen.queryByText('Trattoria')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /jour 2/i }));

    expect(await screen.findByText('Trattoria')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByText('Duomo')).not.toBeInTheDocument();
    });
  });

  it('shows the "Journée libre" prompt for an empty day', () => {
    useTripStore.getState().addTrip(makeTrip());
    render(<Parcours />);
    expect(screen.getByText('Journée libre')).toBeInTheDocument();
  });
});

describe('Parcours — step CRUD', () => {
  it('toggles a step done', async () => {
    const user = userEvent.setup();
    useTripStore.getState().addTrip(makeTrip({
      steps: [{ id: 's1', day: 1, period: 'morning', type: 'sight', title: 'Duomo', place: 'Centre' }],
    }));
    render(<Parcours />);

    const stepRow = screen.getByText('Duomo').closest('div')!.parentElement!.parentElement!;
    const checkButton = stepRow.querySelector('button')!;
    await user.click(checkButton);

    await waitFor(() => {
      expect(useTripStore.getState().trips[0].steps[0].done).toBe(true);
    });
  });

  it('removes a step and detaches its memories', async () => {
    const user = userEvent.setup();
    useTripStore.getState().addTrip(makeTrip({
      steps: [{ id: 's1', day: 1, period: 'morning', type: 'sight', title: 'Duomo', place: 'Centre' }],
      memories: [{ id: 'm1', stepId: 's1', photoIds: ['p1'], createdAt: new Date().toISOString() }],
    }));
    render(<Parcours />);

    const stepRow = screen.getByText('Duomo').closest('div')!.parentElement!.parentElement!;
    const buttons = stepRow.querySelectorAll('button');
    await user.click(buttons[buttons.length - 1]); // trash icon is the last button

    await waitFor(() => {
      expect(useTripStore.getState().trips[0].steps).toHaveLength(0);
    });
    expect(useTripStore.getState().trips[0].memories?.[0].stepId).toBeUndefined();
  });

  describe('manual step wizard', () => {
    it('adds a step manually through the 3-step wizard', async () => {
      useTripStore.getState().addTrip(makeTrip());
      render(<Parcours />);

      fireEvent.click(screen.getAllByText('Ajouter une étape')[0]);
      expect(await screen.findByText('Nouvelle étape')).toBeInTheDocument();

      // Step 1 — type
      fireEvent.click(screen.getByText('Resto'));
      fireEvent.click(screen.getByRole('button', { name: /suivant/i }));

      // Step 2 — details
      const titleInput = await screen.findByPlaceholderText('Ex: Visite du Colisée');
      fireEvent.change(titleInput, { target: { value: 'Dîner trattoria' } });
      const placeInput = screen.getByPlaceholderText(/ex: centre de florence/i);
      fireEvent.change(placeInput, { target: { value: 'Oltrarno' } });
      fireEvent.click(screen.getByRole('button', { name: /suivant/i }));

      // Step 3 — when, then confirm
      const confirmButton = await screen.findByRole('button', { name: /ajouter l'étape/i });
      fireEvent.click(confirmButton);

      await waitFor(() => {
        const steps = useTripStore.getState().trips[0].steps;
        expect(steps).toHaveLength(1);
        expect(steps[0].title).toBe('Dîner trattoria');
        expect(steps[0].place).toBe('Oltrarno');
        expect(steps[0].type).toBe('food');
      });
    });

    it('keeps the wizard from advancing past step 2 without a title or place', async () => {
      useTripStore.getState().addTrip(makeTrip());
      render(<Parcours />);

      fireEvent.click(screen.getAllByText('Ajouter une étape')[0]);
      await screen.findByText('Nouvelle étape');
      fireEvent.click(screen.getByRole('button', { name: /suivant/i }));

      expect(await screen.findByText("Détails de l'étape")).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /suivant/i })).toBeDisabled();
    });
  });
});
