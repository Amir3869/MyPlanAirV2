import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Budget } from './Budget';
import { useTripStore } from '../../store/tripStore';
import type { Trip } from '../../store/types';

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useLocation: () => ({ pathname: '/trip/trip-1/budget', state: null }),
    useNavigate: () => vi.fn(),
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

vi.mock('../../api/currency', () => ({
  fetchRate: vi.fn().mockResolvedValue({ rate: 2, source: 'live', updatedAt: new Date().toISOString() }),
}));

const makeTrip = (overrides: Partial<Trip> = {}): Trip => ({
  id: 'trip-1',
  destination: 'Bali',
  country: 'Indonésie',
  countryCode: 'ID',
  startDate: '2026-06-01',
  endDate: '2026-06-10',
  budget: 1000,
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

describe('Budget — totals and spending', () => {
  it('shows remaining budget and spent percentage based on expenses', () => {
    useTripStore.getState().addTrip(makeTrip({
      budget: 1000,
      expenses: [
        { id: 'e1', category: 'food', label: 'Dîner', amount: 100, currency: 'EUR', amountHome: 100, homeCurrency: 'EUR', exchangeRate: 1, date: '2026-06-02' },
        { id: 'e2', category: 'transport', label: 'Taxi', amount: 50, currency: 'EUR', amountHome: 50, homeCurrency: 'EUR', exchangeRate: 1, date: '2026-06-03' },
      ],
    }));
    render(<Budget />);

    expect(screen.getByText('850 €')).toBeInTheDocument(); // Restant
    expect(screen.getByText('15%')).toBeInTheDocument(); // Utilisé
  });

  it('converts multi-currency expenses to the trip currency for the total', () => {
    useTripStore.getState().addTrip(makeTrip({
      budget: 1000,
      currency: 'EUR',
      expenses: [
        { id: 'e1', category: 'food', label: 'Satay', amount: 100000, currency: 'IDR', amountHome: 6, homeCurrency: 'EUR', exchangeRate: 0.00006, date: '2026-06-02' },
      ],
    }));
    render(<Budget />);

    // 1000 - 6 = 994 → rounds to 994 €
    expect(screen.getByText('994 €')).toBeInTheDocument();
  });

  it('shows an empty state when there are no expenses yet', () => {
    useTripStore.getState().addTrip(makeTrip());
    render(<Budget />);
    expect(screen.getByText('Aucune dépense pour le moment')).toBeInTheDocument();
  });
});

describe('Budget — add expense', () => {
  it('adds a new expense through the adder sheet', async () => {
    const user = userEvent.setup();
    useTripStore.getState().addTrip(makeTrip());
    render(<Budget />);

    await user.click(screen.getByRole('button', { name: /ajouter une dépense/i }));

    const sheet = await screen.findByText('Nouvelle dépense');
    const dialog = sheet.closest('[role], div')?.parentElement ?? document.body;

    await user.type(within(dialog as HTMLElement).getByPlaceholderText(/dîner au resto/i), 'Plongée');
    await user.type(within(dialog as HTMLElement).getByPlaceholderText('0.00'), '40');
    await user.click(within(dialog as HTMLElement).getByRole('button', { name: /enregistrer la dépense/i }));

    await waitFor(() => {
      const trip = useTripStore.getState().trips[0];
      expect(trip.expenses).toHaveLength(1);
      expect(trip.expenses[0].label).toBe('Plongée');
      expect(trip.expenses[0].amount).toBe(40);
    });
  });

  it('keeps the save button disabled without a label or amount', async () => {
    const user = userEvent.setup();
    useTripStore.getState().addTrip(makeTrip());
    render(<Budget />);

    await user.click(screen.getByRole('button', { name: /ajouter une dépense/i }));
    await screen.findByText('Nouvelle dépense');

    expect(screen.getByRole('button', { name: /enregistrer la dépense/i })).toBeDisabled();
  });
});

describe('Budget — edit and delete expense', () => {
  it('opens the editor and deletes an expense', async () => {
    const user = userEvent.setup();
    useTripStore.getState().addTrip(makeTrip({
      expenses: [
        { id: 'e1', category: 'food', label: 'Dîner', amount: 30, currency: 'EUR', amountHome: 30, homeCurrency: 'EUR', exchangeRate: 1, date: '2026-06-02' },
      ],
    }));
    render(<Budget />);

    await user.click(screen.getByText('Dîner'));
    expect(await screen.findByText('Modifier la dépense')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /supprimer la dépense/i }));

    await waitFor(() => {
      expect(useTripStore.getState().trips[0].expenses).toHaveLength(0);
    });
  });

  it('removes an expense directly from the history row trash icon', async () => {
    const user = userEvent.setup();
    useTripStore.getState().addTrip(makeTrip({
      expenses: [
        { id: 'e1', category: 'food', label: 'Dîner', amount: 30, currency: 'EUR', amountHome: 30, homeCurrency: 'EUR', exchangeRate: 1, date: '2026-06-02' },
      ],
    }));
    render(<Budget />);

    // The history row's own delete button has no accessible name (icon-only),
    // unlike the editor's labeled "Supprimer la dépense" button.
    const unlabeledButtons = screen.getAllByRole('button', { name: '' });
    expect(unlabeledButtons.length).toBeGreaterThan(0);
    await user.click(unlabeledButtons[unlabeledButtons.length - 1]);

    await waitFor(() => {
      expect(useTripStore.getState().trips[0].expenses).toHaveLength(0);
    });
  });
});

describe('Budget — currency converter', () => {
  it('fetches and displays a live exchange rate when opened', async () => {
    const user = userEvent.setup();
    useTripStore.getState().addTrip(makeTrip({ homeCurrency: 'EUR', currency: 'EUR', countryCode: 'ID' }));
    render(<Budget />);

    await user.click(screen.getByRole('button', { name: /convertisseur/i }));
    expect(await screen.findByText('Convertisseur de devises')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(/LIVE/)).toBeInTheDocument();
    });
  });
});
