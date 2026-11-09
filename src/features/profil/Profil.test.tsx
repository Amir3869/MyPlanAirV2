import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Profil } from './Profil';
import { useTripStore } from '../../store/tripStore';
import type { Trip } from '../../store/types';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

const signOut = vi.fn().mockResolvedValue(undefined);
vi.mock('@clerk/clerk-react', () => ({
  useClerk: () => ({ signOut }),
  useUser: () => ({ user: null }),
}));

vi.mock('../../shared/Toast', () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn(), info: vi.fn(), toast: vi.fn() }),
}));

const docStorageClearTrip = vi.fn().mockResolvedValue(undefined);
vi.mock('../../utils/docStorage', () => ({
  DocStorage: { clearTrip: (...args: unknown[]) => docStorageClearTrip(...args) },
}));

const memoryStorageClearTrip = vi.fn().mockResolvedValue(undefined);
vi.mock('../../utils/memoryStorage', () => ({
  MemoryStorage: { clearTrip: (...args: unknown[]) => memoryStorageClearTrip(...args) },
}));

const makeTrip = (overrides: Partial<Trip> = {}): Trip => ({
  id: 'trip-1',
  destination: 'Hanoï',
  country: 'Vietnam',
  countryCode: 'VN',
  startDate: '2027-04-01',
  endDate: '2027-04-10',
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
  mockNavigate.mockClear();
  signOut.mockClear();
  docStorageClearTrip.mockClear();
  memoryStorageClearTrip.mockClear();
});

describe('Profil — identity', () => {
  it('renames the user inline', async () => {
    const user = userEvent.setup();
    useTripStore.getState().setUserName('Voyageur');
    render(<Profil />);

    await user.click(screen.getByText('Voyageur'));
    const input = screen.getByDisplayValue('Voyageur');
    await user.clear(input);
    await user.type(input, 'Amir{Enter}');

    await waitFor(() => {
      expect(useTripStore.getState().userName).toBe('Amir');
    });
  });

  it('shows trip stats (countries, trips, cities)', () => {
    useTripStore.getState().addTrip(makeTrip());
    useTripStore.getState().addTrip(makeTrip({ id: 'trip-2', country: 'Vietnam', countryCode: 'VN', destination: 'Hoi An' }));
    render(<Profil />);

    expect(screen.getByText('Pays')).toBeInTheDocument();
    expect(screen.getByText('Voyages')).toBeInTheDocument();
    // 2 trips, 1 country (both Vietnam), 2 distinct cities
    const voyagesValue = screen.getByText('Voyages').previousElementSibling;
    expect(voyagesValue).toHaveTextContent('2');
  });
});

describe('Profil — preferences', () => {
  it('changes the active theme', async () => {
    const user = userEvent.setup();
    render(<Profil />);
    await user.click(screen.getByText('Océan'));
    expect(useTripStore.getState().theme).toBe('ocean');
  });

  it('changes the travel style', async () => {
    const user = userEvent.setup();
    render(<Profil />);
    await user.click(screen.getByText('Style voyage'));
    await user.click(screen.getByText('Famille'));
    expect(useTripStore.getState().travelStyle).toBe('family');
  });
});

describe('Profil — data management', () => {
  it('exports local data as a downloadable JSON file', async () => {
    const user = userEvent.setup();
    const createObjectURL = vi.fn().mockReturnValue('blob:mock');
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', { ...URL, createObjectURL, revokeObjectURL });

    useTripStore.getState().addTrip(makeTrip());
    render(<Profil />);
    await user.click(screen.getByText('Exporter mes données locales'));

    expect(createObjectURL).toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it('clears local data (IndexedDB + localStorage) after confirming', async () => {
    const user = userEvent.setup();
    useTripStore.getState().addTrip(makeTrip());
    render(<Profil />);

    await user.click(screen.getByText('Effacer mes données locales'));
    expect(await screen.findByText('Effacer les données locales ?')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^effacer$/i }));

    await waitFor(() => {
      expect(docStorageClearTrip).toHaveBeenCalledWith('trip-1');
      expect(memoryStorageClearTrip).toHaveBeenCalledWith('trip-1');
    });
  });
});

describe('Profil — account', () => {
  it('signs out via Clerk after confirming', async () => {
    const user = userEvent.setup();
    render(<Profil />);

    await user.click(screen.getByText('Se déconnecter'));
    expect(await screen.findByText('Se déconnecter ?')).toBeInTheDocument();

    await user.click(screen.getByText('Déconnexion'));

    await waitFor(() => {
      expect(signOut).toHaveBeenCalled();
    });
  });
});
