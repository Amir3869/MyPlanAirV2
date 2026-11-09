import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { TripChat } from './TripChat';
import { useTripStore } from '../../store/tripStore';
import type { Trip } from '../../store/types';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

const fetchChat = vi.fn();
const clearChatCache = vi.fn();
vi.mock('../../api/cloud', async () => {
  const actual = await vi.importActual<typeof import('../../api/cloud')>('../../api/cloud');
  return {
    ...actual,
    fetchChat: (...args: unknown[]) => fetchChat(...args),
    clearChatCache: (...args: unknown[]) => clearChatCache(...args),
  };
});

// `welcomeSentForTrips` is a module-level Set in TripChat.tsx that survives
// across tests in this file — use a fresh trip id per test to avoid one test's
// welcome message being silently skipped because a prior test already "sent" it.
let tripCounter = 0;
const makeTrip = (overrides: Partial<Trip> = {}): Trip => {
  tripCounter += 1;
  return {
    id: `trip-${tripCounter}`,
    destination: 'Lisbonne',
    country: 'Portugal',
    countryCode: 'PT',
    startDate: '2027-07-01',
    endDate: '2027-07-10',
    budget: 800,
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
  };
};

const initialState = useTripStore.getState();

const renderChat = (tripId: string) =>
  render(
    <MemoryRouter initialEntries={[`/trip/${tripId}/chat`]}>
      <Routes>
        <Route path="/trip/:id/chat" element={<TripChat />} />
      </Routes>
    </MemoryRouter>,
  );

beforeEach(() => {
  useTripStore.setState(initialState, true);
  mockNavigate.mockClear();
  fetchChat.mockReset();
  clearChatCache.mockReset();
});

describe('TripChat — welcome message', () => {
  it('shows a welcome message from ARIA mentioning the destination on first open', () => {
    const trip = makeTrip();
    useTripStore.getState().addTrip(trip);
    renderChat(trip.id);

    expect(screen.getByText('ARIA - Guide')).toBeInTheDocument();
    const history = useTripStore.getState().chatHistories[trip.id];
    expect(history).toHaveLength(1);
    expect(history[0].role).toBe('assistant');
    expect(history[0].content).toContain('Lisbonne');
  });

  it('shows a not-found state and offers to go back if the trip does not exist', () => {
    renderChat('unknown-trip');
    expect(screen.getByText('Voyage introuvable.')).toBeInTheDocument();
  });
});

describe('TripChat — sending messages', () => {
  it("sends a question and displays ARIA's answer", async () => {
    const user = userEvent.setup();
    fetchChat.mockResolvedValue({ ok: true, answer: 'Essaie le Time Out Market pour déjeuner !' });

    const trip = makeTrip();
    useTripStore.getState().addTrip(trip);
    renderChat(trip.id);

    const textarea = screen.getByRole('textbox');
    await user.type(textarea, 'Où manger ce soir ?');
    await user.click(screen.getByRole('button', { name: /envoyer/i }));

    expect(await screen.findByText('Essaie le Time Out Market pour déjeuner !')).toBeInTheDocument();
    const history = useTripStore.getState().chatHistories[trip.id];
    expect(history.some((m) => m.role === 'user' && m.content === 'Où manger ce soir ?')).toBe(true);
    expect(fetchChat).toHaveBeenCalledWith(
      expect.objectContaining({ question: 'Où manger ce soir ?', destination: 'Lisbonne' }),
      trip.id,
    );
  });

  it('falls back to an offline reply and shows a retry option when the API fails', async () => {
    const user = userEvent.setup();
    fetchChat.mockResolvedValue({ ok: false, reason: 'network' });

    const trip = makeTrip();
    useTripStore.getState().addTrip(trip);
    renderChat(trip.id);

    const textarea = screen.getByRole('textbox');
    await user.type(textarea, "Que faire aujourd'hui ?");
    await user.click(screen.getByRole('button', { name: /envoyer/i }));

    await waitFor(() => {
      expect(screen.getByText('Connexion requise')).toBeInTheDocument();
    });
  });

  it('retries the last message when the retry button is clicked after a failure', async () => {
    const user = userEvent.setup();
    fetchChat.mockResolvedValueOnce({ ok: false, reason: 'network' });

    const trip = makeTrip();
    useTripStore.getState().addTrip(trip);
    renderChat(trip.id);

    await user.type(screen.getByRole('textbox'), 'Météo demain ?');
    await user.click(screen.getByRole('button', { name: /envoyer/i }));
    await screen.findByText('Connexion requise');

    fetchChat.mockResolvedValueOnce({ ok: true, answer: 'Ensoleillé toute la journée.' });
    const retryButtons = screen.getAllByRole('button');
    const retryButton = retryButtons.find((b) => b.className.includes('ml-auto'));
    await user.click(retryButton!);

    expect(await screen.findByText('Ensoleillé toute la journée.')).toBeInTheDocument();
  });

  it('does not send an empty message', async () => {
    const trip = makeTrip();
    useTripStore.getState().addTrip(trip);
    renderChat(trip.id);

    const initialHistoryLength = useTripStore.getState().chatHistories[trip.id]?.length ?? 0;
    fetchChat.mockClear();

    const sendButton = screen.getByRole('button', { name: /envoyer/i });
    expect(sendButton).toBeDisabled();
    expect(fetchChat).not.toHaveBeenCalled();
    expect(useTripStore.getState().chatHistories[trip.id]).toHaveLength(initialHistoryLength);
  });
});

describe('TripChat — clearing history', () => {
  it('clears the chat history after confirming', async () => {
    const user = userEvent.setup();
    const trip = makeTrip();
    useTripStore.getState().addTrip(trip);
    renderChat(trip.id);

    expect(useTripStore.getState().chatHistories[trip.id]).toHaveLength(1);

    await user.click(screen.getByRole('button', { name: /effacer la conversation/i }));
    expect(await screen.findByText('Effacer la conversation ?')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /^effacer$/i }));

    await waitFor(() => {
      expect(useTripStore.getState().chatHistories[trip.id]).toEqual([]);
    });
    expect(clearChatCache).toHaveBeenCalledWith(trip.id);
  });
});
