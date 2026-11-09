import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Documents } from './Documents';
import { useTripStore } from '../../store/tripStore';
import type { Trip, TripDocument } from '../../store/types';

vi.mock('../cockpit/useTripContext', async () => {
  const actual = await vi.importActual<typeof import('../../store/tripStore')>('../../store/tripStore');
  return {
    useTripContext: () => {
      const trip = actual.useTripStore((s) => s.trips.find((t) => t.id === 'trip-1'));
      return { trip };
    },
  };
});

const docStorageSave = vi.fn().mockResolvedValue(undefined);
const docStorageGet = vi.fn().mockResolvedValue(null);
const docStorageRemove = vi.fn().mockResolvedValue(undefined);

vi.mock('../../shared/Toast', () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn(), info: vi.fn(), toast: vi.fn() }),
}));

vi.mock('../../utils/docStorage', () => ({
  DocStorage: {
    save: (...args: unknown[]) => docStorageSave(...args),
    get: (...args: unknown[]) => docStorageGet(...args),
    remove: (...args: unknown[]) => docStorageRemove(...args),
  },
}));

const makeTrip = (overrides: Partial<Trip> = {}): Trip => ({
  id: 'trip-1',
  destination: 'Lisbonne',
  country: 'Portugal',
  countryCode: 'PT',
  startDate: '2026-07-01',
  endDate: '2026-07-10',
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
});

const makeDoc = (overrides: Partial<TripDocument> = {}): TripDocument => ({
  id: 'doc-1',
  name: 'Billet avion',
  category: 'ticket',
  size: 150_000,
  fileType: 'pdf',
  createdAt: new Date().toISOString(),
  ...overrides,
});

const initialState = useTripStore.getState();

beforeEach(() => {
  useTripStore.setState(initialState, true);
  docStorageSave.mockClear();
  docStorageGet.mockClear();
  docStorageRemove.mockClear();
});

describe('Documents — empty and listing states', () => {
  it('shows an empty state when the trip has no documents', () => {
    useTripStore.getState().addTrip(makeTrip());
    render(<Documents />);
    expect(screen.getByText('Aucun document pour ce voyage')).toBeInTheDocument();
  });

  it('lists documents grouped by category with counts', () => {
    useTripStore.getState().addTrip(makeTrip({
      documents: [makeDoc({ id: 'd1', category: 'ticket' }), makeDoc({ id: 'd2', category: 'visa', name: 'Visa' })],
    }));
    render(<Documents />);

    expect(screen.getByText('2 fichiers · 293.0 KB')).toBeInTheDocument();
    expect(screen.getByText('Billet avion')).toBeInTheDocument();
    expect(screen.getByText('Visa')).toBeInTheDocument();
  });

  it('filters documents by category when a filter pill is clicked', async () => {
    const user = userEvent.setup();
    useTripStore.getState().addTrip(makeTrip({
      documents: [makeDoc({ id: 'd1', category: 'ticket' }), makeDoc({ id: 'd2', category: 'visa', name: 'Visa' })],
    }));
    render(<Documents />);

    await user.click(screen.getByRole('button', { name: /visas/i }));

    expect(screen.queryByText('Billet avion')).not.toBeInTheDocument();
    expect(screen.getByText('Visa')).toBeInTheDocument();
  });
});

describe('Documents — freemium limit', () => {
  it('shows the upgrade prompt in the counter bar once the free limit is reached', () => {
    useTripStore.getState().addTrip(makeTrip({
      documents: Array.from({ length: 10 }, (_, i) => makeDoc({ id: `d${i}`, name: `Doc ${i}` })),
    }));
    render(<Documents />);

    expect(screen.getByText(/limite atteinte/i)).toBeInTheDocument();
    expect(screen.getByText(/passe pro/i)).toBeInTheDocument();
  });

  it('opens the premium modal instead of the add sheet once the limit is reached', async () => {
    const user = userEvent.setup();
    useTripStore.getState().addTrip(makeTrip({
      documents: Array.from({ length: 10 }, (_, i) => makeDoc({ id: `d${i}`, name: `Doc ${i}` })),
    }));
    render(<Documents />);

    await user.click(screen.getByRole('button', { name: /ajouter un document/i }));

    expect(await screen.findByText('Limite atteinte')).toBeInTheDocument();
    expect(screen.queryByText('📄 Ajouter un document')).not.toBeInTheDocument();
  });
});

describe('Documents — add and delete', () => {
  it('adds a document end-to-end: pick a file, save, persist metadata and the blob', async () => {
    const user = userEvent.setup();
    useTripStore.getState().addTrip(makeTrip());
    render(<Documents />);

    await user.click(screen.getByRole('button', { name: /ajouter un document/i }));
    expect(await screen.findByText('📄 Ajouter un document')).toBeInTheDocument();

    const file = new File(['%PDF-1.4 content'], 'reservation.pdf', { type: 'application/pdf' });
    const dialog = screen.getByRole('dialog');
    const fileInput = dialog.querySelector('input[type="file"][accept="*/*"]') as HTMLInputElement;
    expect(fileInput).toBeTruthy();
    fireEvent.change(fileInput, { target: { files: [file] } });

    await screen.findByText('reservation.pdf');
    await user.click(screen.getByRole('button', { name: /ajouter le document/i }));

    await waitFor(() => {
      const trip = useTripStore.getState().trips[0];
      expect(trip.documents).toHaveLength(1);
      expect(trip.documents[0].name).toBe('reservation');
      expect(trip.documents[0].category).toBe('ticket');
    });
    expect(docStorageSave).toHaveBeenCalledWith('trip-1', expect.any(String), expect.any(File));
  });

  it('rejects a file larger than the max size with an alert and does not add it', async () => {
    const user = userEvent.setup();
    useTripStore.getState().addTrip(makeTrip());
    render(<Documents />);

    await user.click(screen.getByRole('button', { name: /ajouter un document/i }));
    await screen.findByText('📄 Ajouter un document');

    const oversized = new File([new Uint8Array(11 * 1024 * 1024)], 'huge.zip', { type: 'application/zip' });
    const dialog = screen.getByRole('dialog');
    const fileInput = dialog.querySelector('input[type="file"][accept="*/*"]') as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [oversized] } });

    expect(await screen.findByText('Fichier trop volumineux')).toBeInTheDocument();
    expect(useTripStore.getState().trips[0].documents).toHaveLength(0);
  });

  it('deletes a document after confirming, removing both the blob and the metadata', async () => {
    const user = userEvent.setup();
    useTripStore.getState().addTrip(makeTrip({ documents: [makeDoc()] }));
    render(<Documents />);

    await user.click(screen.getByRole('button', { name: /supprimer le document/i }));
    expect(await screen.findByText('Supprimer ce document ?')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^🗑️ supprimer$/i }));

    await waitFor(() => {
      expect(useTripStore.getState().trips[0].documents).toHaveLength(0);
    });
    expect(docStorageRemove).toHaveBeenCalledWith('trip-1', 'doc-1');
  });

  it('cancels deletion without removing the document', async () => {
    const user = userEvent.setup();
    useTripStore.getState().addTrip(makeTrip({ documents: [makeDoc()] }));
    render(<Documents />);

    await user.click(screen.getByRole('button', { name: /supprimer le document/i }));
    await screen.findByText('Supprimer ce document ?');
    await user.click(screen.getByRole('button', { name: /annuler/i }));

    expect(useTripStore.getState().trips[0].documents).toHaveLength(1);
  });
});
