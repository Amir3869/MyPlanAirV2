import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { WorldMap } from './WorldMap';
import { useTripStore } from '../../store/tripStore';
import type { Trip } from '../../store/types';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('./Map2DView', () => ({
  Map2DView: () => <div data-testid="map2d-view" />,
}));
vi.mock('./Globe3DView', () => ({
  Globe3DView: () => <div data-testid="globe3d-view" />,
}));
vi.mock('./StatsView', () => ({
  StatsView: () => <div data-testid="stats-view" />,
}));

const makeTrip = (overrides: Partial<Trip> = {}): Trip => ({
  id: 'trip-1',
  destination: 'Tokyo',
  country: 'Japon',
  countryCode: 'JP',
  startDate: '2027-07-01',
  endDate: '2027-07-10',
  budget: 2000,
  currency: 'EUR',
  homeCurrency: 'EUR',
  photoUrl: '',
  lat: 35.68,
  lon: 139.69,
  steps: [],
  expenses: [],
  checklist: [],
  documents: [],
  notes: '',
  createdAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

const initialState = useTripStore.getState();

const renderPage = () => render(<MemoryRouter><WorldMap /></MemoryRouter>);

beforeEach(() => {
  useTripStore.setState(initialState, true);
  mockNavigate.mockClear();
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ type: 'FeatureCollection', features: [] }) }));
});

describe('WorldMap', () => {
  it('shows the 2D map view by default', () => {
    renderPage();
    expect(screen.getByTestId('map2d-view')).toBeInTheDocument();
    expect(screen.queryByTestId('globe3d-view')).not.toBeInTheDocument();
  });

  it('switches to the 3D globe view', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByLabelText('Globe 3D'));

    expect(await screen.findByTestId('globe3d-view')).toBeInTheDocument();
  });

  it('switches to the stats view', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByLabelText('Stats'));

    expect(await screen.findByTestId('stats-view')).toBeInTheDocument();
  });

  it('shows aggregate stats in the header stat cards', () => {
    useTripStore.getState().addTrip(makeTrip({ startDate: '2020-01-01', endDate: '2020-01-10' }));
    renderPage();

    expect(screen.getByText('Voyages')).toBeInTheDocument();
    expect(screen.getByText('Pays')).toBeInTheDocument();
  });

  it('navigates back to home', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByLabelText('Retour'));
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });
});
