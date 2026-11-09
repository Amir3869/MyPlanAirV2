import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { Decouvrir } from './Decouvrir';
import { useTripStore } from '../../store/tripStore';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate, useLocation: () => ({ pathname: '/decouvrir', state: null }) };
});

vi.mock('@clerk/clerk-react', () => ({
  useUser: () => ({ user: null }),
}));

vi.mock('../../shared/Toast', () => ({
  useToast: () => ({ toast: vi.fn(), success: vi.fn(), error: vi.fn(), info: vi.fn() }),
}));

const fetchPlanner = vi.fn();
vi.mock('./plannerApi', () => ({
  fetchPlanner: (...args: unknown[]) => fetchPlanner(...args),
}));

const createPlannerTrip = vi.fn();
vi.mock('./plannerCreateTrip', () => ({
  createPlannerTrip: (...args: unknown[]) => createPlannerTrip(...args),
}));

const initialState = useTripStore.getState();

const renderPage = () => render(<MemoryRouter><Decouvrir /></MemoryRouter>);

const suggestion = {
  id: 'jp-tokyo-city',
  destination: 'Tokyo',
  country: 'Japon',
  countryCode: 'JP',
  type: 'city' as const,
  days: 7,
  estimatedBudget: 1800,
  currency: 'EUR',
  bestFor: 'City trip',
  description: 'Un super voyage à Tokyo.',
  breakdown: { route: 600, lodging: 500, food: 300, activities: 200, localTransport: 100, safety: 100 },
  feedback: { level: 'good' as const, label: 'Budget faisable', emoji: '👍', color: '#7c8cff', message: 'Ça devrait aller.' },
};

beforeEach(() => {
  useTripStore.setState(initialState, true);
  mockNavigate.mockClear();
  fetchPlanner.mockReset();
  createPlannerTrip.mockReset();
  vi.stubGlobal('navigator', { ...navigator, onLine: true });
});

describe('Decouvrir — planner golden path', () => {
  it('generates suggestions and shows them in the results list', async () => {
    const user = userEvent.setup();
    fetchPlanner.mockResolvedValue({ ok: true, suggestions: [suggestion] });

    renderPage();
    await user.click(screen.getByText('Planificateur IA'));
    await user.click(screen.getByText(/générer des idées/i));

    expect(await screen.findByText('Idées générées')).toBeInTheDocument();
    expect(screen.getAllByText('Tokyo').length).toBeGreaterThan(0);
    expect(fetchPlanner).toHaveBeenCalled();
  });

  it('falls back to demo suggestions with a warning banner when the planner API is unavailable', async () => {
    const user = userEvent.setup();
    fetchPlanner.mockResolvedValue({
      ok: false,
      reason: 'planner_unavailable',
      message: 'indisponible',
    });

    renderPage();
    await user.click(screen.getByText('Planificateur IA'));
    await user.click(screen.getByText(/générer des idées/i));

    expect(await screen.findByText('Mode aperçu')).toBeInTheDocument();
    expect(screen.getByText('Idées générées')).toBeInTheDocument();
  });

  it('shows an error state without suggestions for other API failures', async () => {
    const user = userEvent.setup();
    fetchPlanner.mockResolvedValue({ ok: false, reason: 'network_error', message: 'Pas de connexion' });

    renderPage();
    await user.click(screen.getByText('Planificateur IA'));
    await user.click(screen.getByText(/générer des idées/i));

    expect(await screen.findByText('Planificateur indisponible')).toBeInTheDocument();
    expect(screen.queryByText('Idées générées')).not.toBeInTheDocument();
  });

  it('creates a trip from a prepared suggestion and adds it to the store', async () => {
    const user = userEvent.setup();
    fetchPlanner.mockResolvedValue({ ok: true, suggestions: [suggestion] });
    const createdTrip = { id: 'trip-1', destination: 'Tokyo' } as never;
    createPlannerTrip.mockResolvedValue(createdTrip);

    renderPage();
    await user.click(screen.getByText('Planificateur IA'));
    await user.click(screen.getByText(/générer des idées/i));
    await screen.findByText('Idées générées');

    await user.click(screen.getByText('Préparer ce voyage'));
    const createButton = await screen.findByText('Créer dans My Plan’Air');
    await user.click(createButton);

    await waitFor(() => {
      expect(useTripStore.getState().trips).toContainEqual(createdTrip);
    });
  });
});
