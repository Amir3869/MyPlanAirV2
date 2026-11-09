import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SettingsSheet } from './SettingsSheet';
import { useTripStore } from '../../store/tripStore';
import type { Trip } from '../../store/types';

const signOut = vi.fn().mockResolvedValue(undefined);
vi.mock('@clerk/clerk-react', () => ({
  useClerk: () => ({ signOut }),
}));

vi.mock('../../shared/Toast', () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn(), info: vi.fn(), toast: vi.fn() }),
}));

const makeTrip = (overrides: Partial<Trip> = {}): Trip => ({
  id: 'trip-1',
  destination: 'Tokyo',
  country: 'Japon',
  countryCode: 'JP',
  startDate: '2027-07-01',
  endDate: '2027-07-10',
  budget: 2000,
  currency: 'JPY',
  homeCurrency: 'EUR',
  photoUrl: '',
  steps: [],
  expenses: [
    { id: 'e1', category: 'food', label: 'Dîner', amount: 50, currency: 'EUR', amountHome: 50, homeCurrency: 'EUR', exchangeRate: 1, date: '2027-07-02' },
  ],
  checklist: [],
  documents: [],
  notes: '',
  createdAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

const initialState = useTripStore.getState();

beforeEach(() => {
  useTripStore.setState(initialState, true);
  signOut.mockClear();
});

describe('SettingsSheet — profile', () => {
  it('renames the user', async () => {
    const user = userEvent.setup();
    render(<SettingsSheet open onClose={vi.fn()} />);

    await user.click(screen.getByLabelText('Modifier le prénom'));
    const input = screen.getByDisplayValue('Voyageur');
    await user.clear(input);
    await user.type(input, 'Amir{Enter}');

    expect(useTripStore.getState().userName).toBe('Amir');
  });

  it('changes the avatar emoji', async () => {
    const user = userEvent.setup();
    render(<SettingsSheet open onClose={vi.fn()} />);

    await user.click(screen.getByLabelText("Changer l'avatar"));
    expect(await screen.findByText('Votre avatar')).toBeInTheDocument();

    const otherEmoji = screen.getAllByText('🌍')[0];
    await user.click(otherEmoji);

    expect(useTripStore.getState().userEmoji).toBe('🌍');
  });
});

describe('SettingsSheet — preferences', () => {
  it('changes the home currency', async () => {
    const user = userEvent.setup();
    render(<SettingsSheet open onClose={vi.fn()} />);

    await user.click(screen.getByText('Devise principale'));
    expect(await screen.findByText('USD')).toBeInTheDocument();
    await user.click(screen.getByText('USD'));

    expect(useTripStore.getState().homeCurrency).toBe('USD');
  });

  it('changes the active theme', async () => {
    const user = userEvent.setup();
    render(<SettingsSheet open onClose={vi.fn()} />);

    await user.click(screen.getByText('Océan'));

    expect(useTripStore.getState().theme).toBe('ocean');
  });
});

describe('SettingsSheet — stats', () => {
  it('shows accurate trip statistics', async () => {
    const user = userEvent.setup();
    useTripStore.getState().addTrip(makeTrip());
    useTripStore.getState().addTrip(makeTrip({ id: 'trip-2', country: 'Japon', countryCode: 'JP' }));
    render(<SettingsSheet open onClose={vi.fn()} />);

    await user.click(screen.getByText('Statistiques voyage'));
    expect(await screen.findByText('Mes statistiques')).toBeInTheDocument();

    const tripsCount = screen.getByText('Voyages créés').previousElementSibling;
    expect(tripsCount).toHaveTextContent('2');
    expect(screen.getByText(/Japon \(2 voyages\)/)).toBeInTheDocument();
  });
});

describe('SettingsSheet — data management', () => {
  it('exports trip data as a downloadable JSON file', async () => {
    const user = userEvent.setup();
    const createObjectURL = vi.fn().mockReturnValue('blob:mock');
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', { ...URL, createObjectURL, revokeObjectURL });
    useTripStore.getState().addTrip(makeTrip());

    render(<SettingsSheet open onClose={vi.fn()} />);
    await user.click(screen.getByText('Exporter mes voyages'));

    expect(createObjectURL).toHaveBeenCalled();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock');
    vi.unstubAllGlobals();
  });

  it('asks for confirmation before clearing all data, and does nothing if cancelled', async () => {
    const user = userEvent.setup();
    useTripStore.getState().addTrip(makeTrip());
    render(<SettingsSheet open onClose={vi.fn()} />);

    await user.click(screen.getByText('Effacer toutes les données'));
    expect(await screen.findByText('Effacer toutes les données ?')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /annuler/i }));
    await waitFor(() => {
      expect(screen.queryByText('Effacer toutes les données ?')).not.toBeInTheDocument();
    });
    expect(useTripStore.getState().trips).toHaveLength(1);
  });
});

describe('SettingsSheet — sign out', () => {
  it('signs the user out via Clerk and marks them as unauthenticated locally', async () => {
    const user = userEvent.setup();
    useTripStore.getState().setAuthed(true, 'Amir');
    render(<SettingsSheet open onClose={vi.fn()} />);

    await user.click(screen.getByText('Se déconnecter'));

    await waitFor(() => {
      expect(signOut).toHaveBeenCalled();
    });
    expect(useTripStore.getState().authed).toBe(false);
  });

  it('still marks the user as unauthenticated locally even if Clerk sign-out fails', async () => {
    const user = userEvent.setup();
    signOut.mockRejectedValueOnce(new Error('network'));
    useTripStore.getState().setAuthed(true, 'Amir');
    render(<SettingsSheet open onClose={vi.fn()} />);

    await user.click(screen.getByText('Se déconnecter'));

    await waitFor(() => {
      expect(useTripStore.getState().authed).toBe(false);
    });
  });
});
