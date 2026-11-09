import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthPage } from './AuthPage';
import { useTripStore } from '../../store/tripStore';

const authenticateWithRedirect = vi.fn();
const signInCreate = vi.fn();
const signUpCreate = vi.fn();

vi.mock('@clerk/clerk-react', () => ({
  useSignIn: () => ({
    isLoaded: true,
    signIn: { authenticateWithRedirect, create: signInCreate },
  }),
  useSignUp: () => ({
    isLoaded: true,
    signUp: { create: signUpCreate },
  }),
}));

const initialState = useTripStore.getState();

beforeEach(() => {
  useTripStore.setState(initialState, true);
  authenticateWithRedirect.mockReset();
  signInCreate.mockReset();
  signUpCreate.mockReset();
});

describe('AuthPage — OAuth buttons', () => {
  it('starts a Google OAuth redirect on click', async () => {
    const user = userEvent.setup();
    authenticateWithRedirect.mockResolvedValue(undefined);
    render(<AuthPage />);

    await user.click(screen.getByRole('button', { name: /continuer avec google/i }));

    expect(authenticateWithRedirect).toHaveBeenCalledWith(
      expect.objectContaining({ strategy: 'oauth_google' }),
    );
  });

  it('starts an Apple OAuth redirect on click', async () => {
    const user = userEvent.setup();
    authenticateWithRedirect.mockResolvedValue(undefined);
    render(<AuthPage />);

    await user.click(screen.getByRole('button', { name: /continuer avec apple/i }));

    expect(authenticateWithRedirect).toHaveBeenCalledWith(
      expect.objectContaining({ strategy: 'oauth_apple' }),
    );
  });

  it('shows a French error message if the Google redirect fails', async () => {
    const user = userEvent.setup();
    authenticateWithRedirect.mockRejectedValue(new Error('network down'));
    render(<AuthPage />);

    await user.click(screen.getByRole('button', { name: /continuer avec google/i }));

    expect(await screen.findByText(/erreur google/i)).toBeInTheDocument();
  });

  it('does not leave the user stuck in a loading state after a failed redirect', async () => {
    const user = userEvent.setup();
    authenticateWithRedirect.mockRejectedValue(new Error('network down'));
    render(<AuthPage />);

    const googleButton = screen.getByRole('button', { name: /continuer avec google/i });
    await user.click(googleButton);

    await waitFor(() => expect(googleButton).toBeEnabled());
  });
});

describe('AuthPage — email login (currently disabled in the UI)', () => {
  it('keeps the email button disabled and does not reveal the email form', async () => {
    render(<AuthPage />);

    expect(screen.getByText(/email bientôt disponible/i).closest('button')).toBeDisabled();
    expect(screen.queryByPlaceholderText(/ton@email.com/i)).not.toBeInTheDocument();
  });
});
