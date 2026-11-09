import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PlannerResults } from './PlannerResults';
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
  description: 'Un super voyage à Tokyo.',
  breakdown: { route: 600, lodging: 500, food: 300, activities: 200, localTransport: 100, safety: 100 },
  feedback: { level: 'good', label: 'Budget faisable', emoji: '👍', color: '#7c8cff', message: 'Ça devrait aller.' },
  ...overrides,
});

describe('PlannerResults', () => {
  it('renders nothing when there are no suggestions', () => {
    const { container } = render(
      <PlannerResults suggestions={[]} userBudget={1000} onPrepare={vi.fn()} onClear={vi.fn()} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('opens the first suggestion by default and shows its budget breakdown', () => {
    render(
      <PlannerResults suggestions={[makeSuggestion()]} userBudget={1000} onPrepare={vi.fn()} onClear={vi.fn()} />,
    );
    expect(screen.getByText('Un super voyage à Tokyo.')).toBeInTheDocument();
    expect(screen.getByText('Préparer ce voyage')).toBeInTheDocument();
  });

  it('only keeps one suggestion expanded at a time (accordion)', async () => {
    const user = userEvent.setup();
    const suggestions = [
      makeSuggestion({ id: 'a', destination: 'Tokyo' }),
      makeSuggestion({ id: 'b', destination: 'Kyoto', description: 'Un voyage à Kyoto.' }),
    ];
    render(<PlannerResults suggestions={suggestions} userBudget={1000} onPrepare={vi.fn()} onClear={vi.fn()} />);

    // First suggestion open by default.
    expect(screen.getByText('Un super voyage à Tokyo.')).toBeInTheDocument();
    expect(screen.queryByText('Un voyage à Kyoto.')).not.toBeInTheDocument();

    await user.click(screen.getByText('Kyoto'));

    expect(await screen.findByText('Un voyage à Kyoto.')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByText('Un super voyage à Tokyo.')).not.toBeInTheDocument();
    });
  });

  it('calls onPrepare with the suggestion when "Préparer ce voyage" is clicked', async () => {
    const user = userEvent.setup();
    const onPrepare = vi.fn();
    const suggestion = makeSuggestion();
    render(<PlannerResults suggestions={[suggestion]} userBudget={1000} onPrepare={onPrepare} onClear={vi.fn()} />);

    await user.click(screen.getByText('Préparer ce voyage'));
    expect(onPrepare).toHaveBeenCalledWith(suggestion);
  });

  it('calls onClear when "Effacer" is clicked', async () => {
    const user = userEvent.setup();
    const onClear = vi.fn();
    render(<PlannerResults suggestions={[makeSuggestion()]} userBudget={1000} onPrepare={vi.fn()} onClear={onClear} />);

    await user.click(screen.getByText('Effacer'));
    expect(onClear).toHaveBeenCalled();
  });

  it('shows roadtrip stop badges when expanded', () => {
    const suggestion = makeSuggestion({
      type: 'roadtrip',
      stops: [{ city: 'Tokyo', days: 3 }, { city: 'Kyoto', days: 4 }],
    });
    render(<PlannerResults suggestions={[suggestion]} userBudget={1000} onPrepare={vi.fn()} onClear={vi.fn()} />);

    expect(screen.getByText('Tokyo · 3j')).toBeInTheDocument();
    expect(screen.getByText('Kyoto · 4j')).toBeInTheDocument();
  });
});
