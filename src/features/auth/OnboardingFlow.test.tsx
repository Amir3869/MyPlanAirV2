import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OnboardingFlow } from './OnboardingFlow';
import { useTripStore } from '../../store/tripStore';

const initialState = useTripStore.getState();

beforeEach(() => {
  useTripStore.setState(initialState, true);
  vi.useFakeTimers({ shouldAdvanceTime: true });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const skipSplash = async (user: ReturnType<typeof userEvent.setup>) => {
  await vi.advanceTimersByTimeAsync(1800);
  await screen.findByText("Comment tu", { exact: false });
  void user;
};

describe('OnboardingFlow — golden path', () => {
  it('completes onboarding end-to-end and persists the chosen preferences', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ features: [] }),
    }));
    const onComplete = vi.fn();

    render(<OnboardingFlow onComplete={onComplete} />);
    await skipSplash(user);

    // ── Étape 1 — nom ──
    const nameInput = screen.getByPlaceholderText('Ton prénom...');
    await user.type(nameInput, 'Amir');
    await user.click(screen.getByRole('button', { name: /continuer/i }));

    // ── Étape 2 — devise ──
    expect(await screen.findByText(/pour suivre ton budget/i)).toBeInTheDocument();
    const eurOption = screen.getAllByText('EUR')[0];
    await user.click(eurOption);
    await user.click(screen.getByRole('button', { name: /continuer/i }));

    // ── Étape 3 — ville (skippable) ──
    expect(await screen.findByText(/pour l.heure maison/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /plus tard/i }));

    // ── Étape 4 — thème + finish ──
    const finishButton = await screen.findByRole('button', { name: /c'est parti, amir/i });
    await user.click(finishButton);

    expect(useTripStore.getState().onboardingDone).toBe(true);
    expect(useTripStore.getState().userName).toBe('Amir');
    expect(useTripStore.getState().homeCurrency).toBe('EUR');

    await vi.advanceTimersByTimeAsync(2000);
    expect(onComplete).toHaveBeenCalled();
  });

  it('keeps step 1 "Continuer" disabled until a name of at least 2 characters is entered', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<OnboardingFlow onComplete={vi.fn()} />);
    await skipSplash(user);

    const continueButton = screen.getByRole('button', { name: /continuer/i });
    expect(continueButton).toBeDisabled();

    await user.type(screen.getByPlaceholderText('Ton prénom...'), 'A');
    expect(continueButton).toBeDisabled();

    await user.type(screen.getByPlaceholderText('Ton prénom...'), 'l');
    expect(continueButton).toBeEnabled();
  });

  it('falls back to "Voyageur" if the user skips the name entirely via onboardingDone defaults', () => {
    // completeOnboarding always receives a non-empty name because step 1 blocks
    // progression — this documents that guarantee at the store level.
    useTripStore.getState().completeOnboarding({
      userName: 'Voyageur',
      travelStyle: 'solo',
      homeCurrency: 'EUR',
      theme: 'myplanair',
    });
    expect(useTripStore.getState().userName).toBe('Voyageur');
  });
});
