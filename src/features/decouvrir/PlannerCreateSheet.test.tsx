import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PlannerCreateSheet } from './PlannerCreateSheet';
import type { PlannerSuggestion } from './plannerTypes';

const makeSuggestion = (overrides: Partial<PlannerSuggestion> = {}): PlannerSuggestion => ({
  id: 'jp-tokyo-city',
  destination: 'Tokyo',
  country: 'Japon',
  countryCode: 'JP',
  type: 'city',
  days: 7,
  estimatedBudget: 1800,
  currency: 'EUR',
  bestFor: 'City trip',
  description: 'Un super voyage.',
  breakdown: { route: 600, lodging: 500, food: 300, activities: 200, localTransport: 100, safety: 100 },
  feedback: { level: 'good', label: 'Budget faisable', emoji: '👍', color: '#7c8cff', message: '' },
  ...overrides,
});

describe('PlannerCreateSheet', () => {
  it('renders nothing when there is no suggestion', () => {
    const { container } = render(
      <PlannerCreateSheet open suggestion={null} creating={false} creationStep="idle" onClose={vi.fn()} onCreate={vi.fn()} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('shows suggestion details and calls onCreate with the essential mode by default', async () => {
    const user = userEvent.setup();
    const onCreate = vi.fn();
    render(
      <PlannerCreateSheet open suggestion={makeSuggestion()} creating={false} creationStep="idle" onClose={vi.fn()} onCreate={onCreate} />,
    );

    expect(screen.getByText('Tokyo')).toBeInTheDocument();
    await user.click(screen.getByText('Créer dans My Plan’Air'));

    expect(onCreate).toHaveBeenCalledWith(expect.any(String), false);
  });

  it('switches to itinerary mode and passes withItinerary=true to onCreate', async () => {
    const user = userEvent.setup();
    const onCreate = vi.fn();
    render(
      <PlannerCreateSheet open suggestion={makeSuggestion()} creating={false} creationStep="idle" onClose={vi.fn()} onCreate={onCreate} />,
    );

    await user.click(screen.getByText('Parcours suggéré'));
    await user.click(screen.getByText('Créer dans My Plan’Air'));

    expect(onCreate).toHaveBeenCalledWith(expect.any(String), true);
  });

  it('disables the create button and shows progress while creating', () => {
    render(
      <PlannerCreateSheet open suggestion={makeSuggestion()} creating creationStep="checklist" onClose={vi.fn()} onCreate={vi.fn()} />,
    );

    expect(screen.getByText('Création en cours…').closest('button')).toBeDisabled();
    expect(screen.getAllByText('Checklist IA').length).toBeGreaterThan(0);
  });

  it('shows the roadtrip stop badges for a roadtrip suggestion', () => {
    render(
      <PlannerCreateSheet
        open
        suggestion={makeSuggestion({ type: 'roadtrip', stops: [{ city: 'Tokyo', days: 3 }, { city: 'Kyoto', days: 4 }] })}
        creating={false}
        creationStep="idle"
        onClose={vi.fn()}
        onCreate={vi.fn()}
      />,
    );

    expect(screen.getByText('Tokyo · 3j')).toBeInTheDocument();
    expect(screen.getByText('Kyoto · 4j')).toBeInTheDocument();
  });
});
