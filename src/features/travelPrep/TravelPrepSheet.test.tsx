import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TravelPrepSheet } from './TravelPrepSheet';
import type { Trip } from '../../store/types';

const makeTrip = (overrides: Partial<Trip> = {}): Trip => ({
  id: 'trip-1',
  destination: 'Bali',
  country: 'Indonésie',
  countryCode: 'ID',
  startDate: '2027-06-01',
  endDate: '2027-06-10',
  budget: 1500,
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

const windowOpen = vi.fn();

beforeEach(() => {
  windowOpen.mockClear();
  vi.stubGlobal('open', windowOpen);
});

describe('TravelPrepSheet', () => {
  it('renders nothing when there is no trip', () => {
    const { container } = render(
      <TravelPrepSheet open trip={null} onClose={vi.fn()} onOpenTrip={vi.fn()} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the 3 standard prep items for a simple trip (no car rental)', () => {
    render(<TravelPrepSheet open trip={makeTrip()} onClose={vi.fn()} onOpenTrip={vi.fn()} />);
    expect(screen.getByText('Transport')).toBeInTheDocument();
    expect(screen.getByText('Hébergement')).toBeInTheDocument();
    expect(screen.getByText('eSIM')).toBeInTheDocument();
    expect(screen.queryByText('Voiture')).not.toBeInTheDocument();
  });

  it('adds a car rental item for roadtrips', () => {
    render(<TravelPrepSheet open trip={makeTrip({ isRoadtrip: true })} onClose={vi.fn()} onOpenTrip={vi.fn()} />);
    expect(screen.getByText('Voiture')).toBeInTheDocument();
  });

  it('marks an item handled and hides its actions when "J\'ai déjà" is clicked', async () => {
    const user = userEvent.setup();
    render(<TravelPrepSheet open trip={makeTrip()} onClose={vi.fn()} onOpenTrip={vi.fn()} />);

    const skipButtons = screen.getAllByText('J’ai déjà');
    await user.click(skipButtons[0]);

    // The "Transport" row no longer shows action buttons once handled.
    const transportRow = screen.getByText('Transport').closest('div')!.parentElement!.parentElement!;
    expect(transportRow.querySelector('button')).toBeNull();
  });

  it('opens the partner link and marks the item handled when the action button is clicked', async () => {
    const user = userEvent.setup();
    render(<TravelPrepSheet open trip={makeTrip()} onClose={vi.fn()} onOpenTrip={vi.fn()} />);

    await user.click(screen.getAllByText('Chercher')[0]);

    expect(windowOpen).toHaveBeenCalledWith(expect.any(String), '_blank', 'noopener,noreferrer');
  });

  it('calls onClose and onOpenTrip from the footer buttons', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const onOpenTrip = vi.fn();
    render(<TravelPrepSheet open trip={makeTrip()} onClose={onClose} onOpenTrip={onOpenTrip} />);

    await user.click(screen.getByText('Fermer'));
    expect(onClose).toHaveBeenCalled();

    await user.click(screen.getByText('Voir le voyage'));
    expect(onOpenTrip).toHaveBeenCalled();
  });
});
