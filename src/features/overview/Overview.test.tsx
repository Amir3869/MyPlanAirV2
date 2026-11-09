import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Overview } from './Overview';
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

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => vi.fn() };
});

vi.mock('../../shared/Toast', () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn(), info: vi.fn(), toast: vi.fn() }),
}));

const fetchWeather = vi.fn().mockResolvedValue({ ok: false, reason: 'no-coords' });
vi.mock('../../api/weather', () => ({
  fetchWeather: (...args: unknown[]) => fetchWeather(...args),
}));

const fetchRate = vi.fn().mockResolvedValue({ rate: 1, source: 'live', updatedAt: new Date().toISOString() });
vi.mock('../../api/currency', () => ({
  fetchRate: (...args: unknown[]) => fetchRate(...args),
}));

const fetchAssistant = vi.fn().mockResolvedValue({ ok: false, error: 'offline' });
const clearAssistantCache = vi.fn();
vi.mock('../../api/cloud', async () => {
  const actual = await vi.importActual<typeof import('../../api/cloud')>('../../api/cloud');
  return {
    ...actual,
    fetchAssistant: (...args: unknown[]) => fetchAssistant(...args),
    clearAssistantCache: (...args: unknown[]) => clearAssistantCache(...args),
  };
});

const savePhoto = vi.fn().mockResolvedValue(undefined);
const removePhoto = vi.fn().mockResolvedValue(undefined);
vi.mock('../../utils/memoryStorage', () => ({
  MemoryStorage: {
    isAvailable: () => true,
    canOpen: vi.fn().mockResolvedValue(true),
    savePhoto: (...args: unknown[]) => savePhoto(...args),
    removePhoto: (...args: unknown[]) => removePhoto(...args),
  },
}));

const makeTrip = (overrides: Partial<Trip> = {}): Trip => ({
  id: 'trip-1',
  destination: 'Bangkok',
  country: 'Thaïlande',
  countryCode: 'TH',
  startDate: '2027-02-01',
  endDate: '2027-02-10',
  budget: 1000,
  currency: 'THB',
  homeCurrency: 'EUR',
  photoUrl: '',
  steps: [],
  expenses: [],
  checklist: [],
  documents: [],
  memories: [],
  notes: '',
  createdAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

const initialState = useTripStore.getState();

beforeEach(() => {
  useTripStore.setState(initialState, true);
  fetchWeather.mockClear();
  fetchRate.mockClear();
  fetchAssistant.mockClear();
  savePhoto.mockClear();
  removePhoto.mockClear();
});

describe('Overview — trip stats', () => {
  it('shows day count, step count, and checklist progress', () => {
    useTripStore.getState().addTrip(makeTrip({
      steps: [{ id: 's1', day: 1, period: 'morning', type: 'sight', title: 'Temple', place: 'Wat Pho' }],
      checklist: [
        { id: 'c1', label: 'Passeport', done: true },
        { id: 'c2', label: 'Visa', done: false },
      ],
    }));
    render(<Overview />);

    expect(screen.getByText('10')).toBeInTheDocument(); // days
    expect(screen.getByText('1')).toBeInTheDocument(); // steps count
    expect(screen.getByText('1/2')).toBeInTheDocument(); // checklist
  });

  it('shows the roadtrip itinerary banner when the trip is a roadtrip', () => {
    useTripStore.getState().addTrip(makeTrip({
      isRoadtrip: true,
      destinations: [
        { city: 'Bangkok', countryCode: 'TH', fromDate: '2027-02-01', toDate: '2027-02-05', fromDay: 1, toDay: 5 },
        { city: 'Phuket', countryCode: 'TH', fromDate: '2027-02-06', toDate: '2027-02-10', fromDay: 6, toDay: 10 },
      ],
    }));
    render(<Overview />);

    const banner = screen.getByText('Itinéraire Roadtrip').closest('div')!.parentElement!;
    expect(screen.getAllByText('Bangkok').length).toBeGreaterThan(0);
    expect(banner).toHaveTextContent('Bangkok');
    expect(banner).toHaveTextContent('Phuket');
  });
});

describe('Overview — memories (souvenirs)', () => {
  it('shows the empty "capture tes moments" prompt with no memories', () => {
    useTripStore.getState().addTrip(makeTrip());
    render(<Overview />);
    expect(screen.getByText('Capture tes moments')).toBeInTheDocument();
  });

  it('shows the photo count when memories exist', () => {
    useTripStore.getState().addTrip(makeTrip({
      memories: [{ id: 'm1', photoIds: ['p1', 'p2'], createdAt: new Date().toISOString() }],
    }));
    render(<Overview />);
    expect(screen.getByText('2 photos')).toBeInTheDocument();
  });

  it('adds a memory end-to-end: pick photos, save, and persist photoIds to the store', async () => {
    const user = userEvent.setup();
    useTripStore.getState().addTrip(makeTrip());
    render(<Overview />);

    await user.click(screen.getByText('Capture tes moments'));
    expect(await screen.findByText('Ajouter un souvenir')).toBeInTheDocument();

    const file = new File(['img'], 'plage.jpg', { type: 'image/jpeg' });
    const fileInput = document.querySelector('input[type="file"][accept="image/*"]') as HTMLInputElement;
    const { fireEvent } = await import('@testing-library/react');
    fireEvent.change(fileInput, { target: { files: [file] } });

    expect(await screen.findByText('1 photo sélectionnée')).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText(/écrire un souvenir/i), 'Magnifique coucher de soleil');
    await user.click(screen.getByRole('button', { name: /^ajouter$/i }));

    await waitFor(() => {
      const trip = useTripStore.getState().trips[0];
      expect(trip.memories).toHaveLength(1);
      expect(trip.memories![0].photoIds).toHaveLength(1);
      expect(trip.memories![0].caption).toBe('Magnifique coucher de soleil');
    });
    expect(savePhoto).toHaveBeenCalledWith('trip-1', expect.any(String), file);
  });

  it('keeps the save button disabled until at least one photo is picked', async () => {
    const user = userEvent.setup();
    useTripStore.getState().addTrip(makeTrip());
    render(<Overview />);

    await user.click(screen.getByText('Capture tes moments'));
    await screen.findByText('Ajouter un souvenir');

    expect(screen.getByRole('button', { name: /^ajouter$/i })).toBeDisabled();
  });
});

describe('Overview — budget widget', () => {
  it('shows the spent/budget totals via the donut labels', () => {
    useTripStore.getState().addTrip(makeTrip({
      budget: 1000,
      currency: 'EUR',
      expenses: [
        { id: 'e1', category: 'food', label: 'Dîner', amount: 200, currency: 'EUR', amountHome: 200, homeCurrency: 'EUR', exchangeRate: 1, date: '2027-02-02' },
      ],
    }));
    render(<Overview />);

    expect(screen.getByText('200 €')).toBeInTheDocument();
  });
});
