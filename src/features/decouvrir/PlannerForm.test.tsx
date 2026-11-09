import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { PlannerForm } from './PlannerForm';
import type { PlannerRequest } from './plannerTypes';

vi.mock('../../api/countries', async () => {
  const actual = await vi.importActual<typeof import('../../api/countries')>('../../api/countries');
  return { ...actual, searchAll: vi.fn().mockResolvedValue([]) };
});

const Harness = ({ onGenerate, online = true }: { onGenerate: (r: PlannerRequest) => void; online?: boolean }) => {
  const [expanded, setExpanded] = useState(true);
  return (
    <PlannerForm
      online={online}
      expanded={expanded}
      homeCurrency="EUR"
      homeCity="Paris"
      homeLat={48.8566}
      homeLon={2.3522}
      defaultStyle={null}
      onExpandedChange={setExpanded}
      onGenerate={onGenerate}
    />
  );
};

describe('PlannerForm', () => {
  it('collapses by default content behind the header, expanding on click', async () => {
    const user = userEvent.setup();
    const Collapsible = () => {
      const [expanded, setExpanded] = useState(false);
      return (
        <PlannerForm
          online
          expanded={expanded}
          homeCurrency="EUR"
          homeCity="Paris"
          homeLat={48.8566}
          homeLon={2.3522}
          defaultStyle={null}
          onExpandedChange={setExpanded}
          onGenerate={vi.fn()}
        />
      );
    };
    render(<Collapsible />);

    expect(screen.queryByText('Générer des idées', { exact: false })).not.toBeInTheDocument();
    await user.click(screen.getByText('Planificateur IA'));
    expect(screen.getByText(/générer des idées/i)).toBeInTheDocument();
  });

  it('generates a request with default mood/prompt and no destination (inspiration mode)', async () => {
    const user = userEvent.setup();
    const onGenerate = vi.fn();
    render(<Harness onGenerate={onGenerate} />);

    await user.click(screen.getByText(/générer des idées/i));

    expect(onGenerate).toHaveBeenCalledWith(
      expect.objectContaining({
        mood: 'sun',
        destination: undefined,
        tripMode: 'auto',
        preferredCities: [],
        budget: 1200,
        days: 7,
        travelStyle: 'solo',
        origin: { city: 'Paris', lat: 48.8566, lon: 2.3522 },
      }),
    );
  });

  it('updates the prompt placeholder and mood when selecting a different mood', async () => {
    const user = userEvent.setup();
    const onGenerate = vi.fn();
    render(<Harness onGenerate={onGenerate} />);

    await user.click(screen.getByText('Nature'));
    await user.click(screen.getByText(/générer des idées/i));

    expect(onGenerate).toHaveBeenCalledWith(expect.objectContaining({ mood: 'nature' }));
  });

  it('adjusts budget and duration before generating', async () => {
    const user = userEvent.setup();
    const onGenerate = vi.fn();
    render(<Harness onGenerate={onGenerate} />);

    const budgetInput = screen.getByDisplayValue('1200');
    await user.clear(budgetInput);
    await user.type(budgetInput, '2000');
    await user.click(screen.getByText('14j'));
    await user.click(screen.getByText(/générer des idées/i));

    expect(onGenerate).toHaveBeenCalledWith(expect.objectContaining({ budget: 2000, days: 14 }));
  });

  it('selects a travel style before generating', async () => {
    const user = userEvent.setup();
    const onGenerate = vi.fn();
    render(<Harness onGenerate={onGenerate} />);

    await user.click(screen.getByText('Famille'));
    await user.click(screen.getByText(/générer des idées/i));

    expect(onGenerate).toHaveBeenCalledWith(expect.objectContaining({ travelStyle: 'family' }));
  });

  it('disables all inputs and the generate button when offline', () => {
    render(<Harness onGenerate={vi.fn()} online={false} />);
    expect(screen.getByText(/générer des idées/i).closest('button')).toBeDisabled();
  });

});
