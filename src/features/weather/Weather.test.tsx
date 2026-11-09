import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Weather } from './Weather';
import { useTripStore } from '../../store/tripStore';
import type { Trip } from '../../store/types';
import type { DailyForecast, WeatherResult } from '../../api/weather';

vi.mock('../cockpit/useTripContext', async () => {
  const actual = await vi.importActual<typeof import('../../store/tripStore')>('../../store/tripStore');
  return {
    useTripContext: () => {
      const trip = actual.useTripStore((s) => s.trips.find((t) => t.id === 'trip-1'));
      return { trip };
    },
  };
});

const fetchForecast = vi.fn();
const fetchWeather = vi.fn();
const geocodeCity = vi.fn();
const getCachedForecast = vi.fn().mockReturnValue(null);
const getCachedWeather = vi.fn().mockReturnValue(null);

vi.mock('../../api/weather', async () => {
  const actual = await vi.importActual<typeof import('../../api/weather')>('../../api/weather');
  return {
    ...actual,
    fetchForecast: (...args: unknown[]) => fetchForecast(...args),
    fetchWeather: (...args: unknown[]) => fetchWeather(...args),
    geocodeCity: (...args: unknown[]) => geocodeCity(...args),
    getCachedForecast: (...args: unknown[]) => getCachedForecast(...args),
    getCachedWeather: (...args: unknown[]) => getCachedWeather(...args),
  };
});

const makeDay = (overrides: Partial<DailyForecast> = {}): DailyForecast => ({
  date: '2027-07-01',
  dayName: "Aujourd'hui",
  weatherCode: 0,
  tempMax: 28,
  tempMin: 18,
  humidity: 55,
  windSpeed: 12,
  uvIndex: 6,
  pressure: 1013,
  sunrise: '06:30',
  sunset: '20:45',
  precipitation: 0,
  morning: { temp: 20, humidity: 60, windSpeed: 10, weatherCode: 0 },
  afternoon: { temp: 28, humidity: 45, windSpeed: 14, weatherCode: 0 },
  night: { temp: 19, humidity: 65, windSpeed: 8, weatherCode: 0 },
  ...overrides,
});

const currentWeatherOk: WeatherResult = {
  ok: true, temp: 27, feelsLike: 29, code: 0, icon: '☀️', label: 'Ensoleillé', wind: 11, humidity: 50,
};

const makeTrip = (overrides: Partial<Trip> = {}): Trip => ({
  id: 'trip-1',
  destination: 'Lisbonne',
  country: 'Portugal',
  countryCode: 'PT',
  startDate: '2027-07-01',
  endDate: '2027-07-10',
  budget: 800,
  currency: 'EUR',
  homeCurrency: 'EUR',
  photoUrl: '',
  lat: 38.7223,
  lon: -9.1393,
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
  fetchForecast.mockReset();
  fetchWeather.mockReset();
  geocodeCity.mockReset();
  getCachedForecast.mockReturnValue(null);
  getCachedWeather.mockReturnValue(null);
});

describe('Weather — past trips', () => {
  it('shows a historical-unavailable message and skips any API calls for a finished trip', () => {
    useTripStore.getState().addTrip(makeTrip({ startDate: '2020-01-01', endDate: '2020-01-10' }));
    render(<Weather />);

    expect(screen.getByText('Historique non disponible')).toBeInTheDocument();
    expect(fetchForecast).not.toHaveBeenCalled();
    expect(fetchWeather).not.toHaveBeenCalled();
  });
});

describe('Weather — loading and data states', () => {
  it('shows the forecast and current weather once both resolve', async () => {
    fetchForecast.mockResolvedValue({ ok: true, days: [makeDay(), makeDay({ date: '2027-07-02', dayName: 'Demain' })] });
    fetchWeather.mockResolvedValue(currentWeatherOk);

    useTripStore.getState().addTrip(makeTrip());
    render(<Weather />);

    expect(await screen.findByText('27°C')).toBeInTheDocument();
    expect(screen.getByText('Ensoleillé')).toBeInTheDocument();
    expect(screen.getByText('📍 Lisbonne')).toBeInTheDocument();
    expect(screen.getByText("Aujourd'hui")).toBeInTheDocument();
    expect(screen.getByText('Demain')).toBeInTheDocument();
  });

  it('shows an offline state with a retry button when the forecast fetch fails', async () => {
    fetchForecast.mockResolvedValue({ ok: false, reason: 'network' });
    fetchWeather.mockResolvedValue({ ok: false, reason: 'network' });

    useTripStore.getState().addTrip(makeTrip());
    render(<Weather />);

    expect(await screen.findByText('Météo indisponible')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /réessayer/i })).toBeInTheDocument();
  });

  it('retries fetching weather when the retry button is clicked', async () => {
    const user = userEvent.setup();
    fetchForecast.mockResolvedValueOnce({ ok: false, reason: 'network' });
    fetchWeather.mockResolvedValueOnce({ ok: false, reason: 'network' });

    useTripStore.getState().addTrip(makeTrip());
    render(<Weather />);

    await screen.findByText('Météo indisponible');

    fetchForecast.mockResolvedValueOnce({ ok: true, days: [makeDay()] });
    fetchWeather.mockResolvedValueOnce(currentWeatherOk);
    await user.click(screen.getByRole('button', { name: /réessayer/i }));

    expect(await screen.findByText('27°C')).toBeInTheDocument();
  });

  it('shows a no-coordinates state when the trip has no lat/lon and no country fallback', async () => {
    useTripStore.getState().addTrip(makeTrip({ lat: undefined, lon: undefined, countryCode: 'ZZ' }));
    render(<Weather />);

    expect(await screen.findByText('Localisation indisponible')).toBeInTheDocument();
    expect(fetchForecast).not.toHaveBeenCalled();
  });
});

describe('Weather — roadtrip city switching', () => {
  it('switches forecast when selecting another roadtrip city pill', async () => {
    const user = userEvent.setup();
    fetchForecast.mockImplementation((lat: number) =>
      Promise.resolve({
        ok: true,
        days: [makeDay({ tempMax: lat > 40 ? 15 : 30 })],
      }),
    );
    fetchWeather.mockResolvedValue({ ok: false, reason: 'no-current' });

    useTripStore.getState().addTrip(makeTrip({
      isRoadtrip: true,
      destinations: [
        { city: 'Porto', countryCode: 'PT', lat: 41.15, lon: -8.6, fromDate: '2027-07-01', toDate: '2027-07-04', fromDay: 1, toDay: 4 },
        { city: 'Faro', countryCode: 'PT', lat: 37.02, lon: -7.93, fromDate: '2027-07-05', toDate: '2027-07-10', fromDay: 5, toDay: 10 },
      ],
    }));
    render(<Weather />);

    await screen.findByText('📍 Porto');
    await user.click(screen.getByText('Faro'));

    await waitFor(() => {
      expect(screen.getByText('📍 Faro')).toBeInTheDocument();
    });
    expect(fetchForecast).toHaveBeenCalledWith(37.02, -7.93);
  });
});
