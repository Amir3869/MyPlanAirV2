import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Essentials } from './Essentials';
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
  destination: 'Rome',
  country: 'Italie',
  countryCode: 'IT',
  startDate: '2026-08-01',
  endDate: '2026-08-08',
  budget: 1200,
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

describe('Essentials — checklist', () => {
  it('shows 0% progress with an empty checklist', () => {
    useTripStore.getState().addTrip(makeTrip());
    render(<Essentials />);
    expect(screen.getByText('0%')).toBeInTheDocument();
    expect(screen.getByText(/ta liste est vide/i)).toBeInTheDocument();
  });

  it('adds a manual item via Enter key and toggles it done', async () => {
    const user = userEvent.setup();
    useTripStore.getState().addTrip(makeTrip());
    render(<Essentials />);

    const input = screen.getByPlaceholderText('Ajouter un élément...');
    await user.type(input, 'Passeport{Enter}');

    expect(await screen.findByText('Passeport')).toBeInTheDocument();
    expect(useTripStore.getState().trips[0].checklist).toHaveLength(1);

    const checkButton = screen.getByText('Passeport').closest('div')!.parentElement!.querySelector('button')!;
    await user.click(checkButton);

    await waitFor(() => {
      expect(useTripStore.getState().trips[0].checklist[0].done).toBe(true);
    });
    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  it('prevents adding a duplicate item (case/accent-insensitive)', async () => {
    const user = userEvent.setup();
    useTripStore.getState().addTrip(makeTrip({
      checklist: [{ id: 'c1', label: 'Passeport', done: false }],
    }));
    render(<Essentials />);

    const input = screen.getByPlaceholderText('Ajouter un élément...');
    await user.type(input, 'PASSEPORT{Enter}');

    expect(useTripStore.getState().trips[0].checklist).toHaveLength(1);
  });

  it('adds every item of a suggestion category at once, skipping duplicates', async () => {
    const user = userEvent.setup();
    useTripStore.getState().addTrip(makeTrip({
      checklist: [{ id: 'c1', label: 'Passeport', done: false }],
    }));
    render(<Essentials />);

    await user.click(screen.getByText('Suggestions par catégorie'));
    await user.click(screen.getByText('Documents'));

    const addAllButtons = screen.getAllByText('+ Tout');
    await user.click(addAllButtons[0]);

    await waitFor(() => {
      const labels = useTripStore.getState().trips[0].checklist.map((c) => c.label);
      expect(labels).toContain('Visa (si requis)');
      // Passeport was already present, so it is not duplicated.
      expect(labels.filter((l) => l === 'Passeport')).toHaveLength(1);
    });
  });

  it('removes an item from the checklist', async () => {
    const user = userEvent.setup();
    useTripStore.getState().addTrip(makeTrip({
      checklist: [{ id: 'c1', label: 'Passeport', done: false }],
    }));
    render(<Essentials />);

    const row = screen.getByText('Passeport').closest('div')!.parentElement!;
    const buttons = row.querySelectorAll('button');
    await user.click(buttons[buttons.length - 1]);

    await waitFor(() => {
      expect(useTripStore.getState().trips[0].checklist).toHaveLength(0);
    });
  });
});

describe('Essentials — notes autosave', () => {
  beforeEach(() => {
    // Keep requestAnimationFrame real so AnimatePresence tab transitions still
    // complete; only fake setTimeout/clearTimeout for the notes debounce.
    vi.useFakeTimers({ shouldAdvanceTime: true, toFake: ['setTimeout', 'clearTimeout', 'Date'] });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('autosaves notes to the store after the debounce delay', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    useTripStore.getState().addTrip(makeTrip());
    render(<Essentials />);

    await user.click(screen.getByRole('button', { name: /notes/i }));
    const textarea = await screen.findByPlaceholderText(/écris ici tes adresses/i);
    await user.type(textarea, 'Hôtel: 12 rue de Rome');

    expect(useTripStore.getState().trips[0].notes).toBe('');

    await vi.advanceTimersByTimeAsync(2000);

    expect(useTripStore.getState().trips[0].notes).toBe('Hôtel: 12 rue de Rome');
  });

  it('inserts a note shortcut template at the current draft position', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    useTripStore.getState().addTrip(makeTrip());
    render(<Essentials />);

    await user.click(screen.getByRole('button', { name: /notes/i }));
    await screen.findByPlaceholderText(/écris ici tes adresses/i);
    await user.click(screen.getByText('Adresse'));

    const textarea = screen.getByPlaceholderText(/écris ici tes adresses/i) as HTMLTextAreaElement;
    expect(textarea.value).toContain('📍 Adresse :');
  });
});
