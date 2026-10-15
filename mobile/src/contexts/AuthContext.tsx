import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode, type ReactElement } from 'react';

import { firebaseConfigured } from '../config/environment';
import type { AccountService } from '../services/accountService';
import { getFirebaseClient } from '../services/firebase/client';
import { observeIdentity, observeProfile } from '../services/firebase/observers';
import type { Identity, UserProfile } from '../types/account';
import { authErrorMessage } from '../utils/authErrors';

interface AuthState {
  identity: Identity | null;
  profile: UserProfile | null;
  loading: boolean;
  profileError: string | null;
}
interface AuthValue extends AuthState {
  configured: boolean;
  busy: boolean;
  error: string | null;
  clearError: () => void;
  retry: () => void;
  execute: (action: (accounts: AccountService) => Promise<void>) => Promise<boolean>;
}
const AuthContext = createContext<AuthValue | null>(null);
const initialState: AuthState = { identity: null, profile: null, loading: true, profileError: null };
const SERVICE_UNAVAILABLE = 'O serviço de acesso está indisponível. Tente novamente mais tarde.';
const SESSION_TIMEOUT_MS = 15000;

export function AuthProvider({ children }: { children: ReactNode }): ReactElement {
  const [state, setState] = useState<AuthState>(initialState);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const locked = useRef(false);

  useEffect(() => {
    let active = true;
    let stopProfile = (): void => undefined;
    let stopIdentity = (): void => undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = (): void => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (active) setState((previous) => ({ ...previous, loading: false, profileError: 'A conexão está demorando. Confira sua internet e tente novamente.' }));
      }, SESSION_TIMEOUT_MS);
    };
    timeout();
    queueMicrotask(() => {
      if (!active) return;
      try {
      stopIdentity = observeIdentity((identity) => {
        if (!active) return;
        stopProfile();
        clearTimeout(timer);
        setState({ identity, profile: null, loading: Boolean(identity), profileError: null });
        if (!identity) return;
        timeout();
        stopProfile = observeProfile(identity.uid, (profile) => {
          if (!active) return;
          clearTimeout(timer);
          setState((previous) => previous.identity?.uid === identity.uid ? { identity, profile, loading: false, profileError: null } : previous);
        }, (reason) => {
          if (!active) return;
          clearTimeout(timer);
          setState((previous) => previous.identity?.uid === identity.uid ? { ...previous, loading: false, profileError: authErrorMessage(reason) } : previous);
        });
      }, (reason) => {
        clearTimeout(timer);
        if (active) setState({ ...initialState, loading: false, profileError: authErrorMessage(reason) });
      });
      } catch {
        clearTimeout(timer);
        setState({ ...initialState, loading: false, profileError: SERVICE_UNAVAILABLE });
      }
    });
    return () => { active = false; clearTimeout(timer); stopProfile(); stopIdentity(); };
  }, [revision]);

  const execute = useCallback(async (action: (accounts: AccountService) => Promise<void>): Promise<boolean> => {
    if (locked.current) return false;
    locked.current = true;
    setBusy(true);
    setError(null);
    try {
      const client = getFirebaseClient();
      if (!client) { setError(SERVICE_UNAVAILABLE); return false; }
      await action(client.accounts);
      return true;
    } catch (reason) {
      setError(authErrorMessage(reason));
      return false;
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }, []);

  return <AuthContext.Provider value={{ ...state, configured: firebaseConfigured, busy, error, execute,
    clearError: () => { setError(null); }, retry: () => { setState(initialState); setError(null); setRevision((value) => value + 1); },
  }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth precisa de AuthProvider.');
  return value;
}
