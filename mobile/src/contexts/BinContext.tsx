import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';

import { BinError } from '../services/firebase/binGateway';
import { observeAlerts, observeBins } from '../services/firebase/binObservers';
import { getFirebaseClient } from '../services/firebase/client';
import { requestNotificationPermissions, sendBinAlert, setupNotificationHandler } from '../services/notifications';
import type { BinService } from '../services/binService';
import type { Bin } from '../types/bin';
import type { AlertSettings } from '../types/alert';
import { highestCrossed } from '../utils/alertLogic';

// ---------- types ----------

type BinListState = 'loading' | 'ready' | 'empty' | 'error';

interface BinState {
  bins: Bin[];
  listState: BinListState;
  listError: string | null;
}

interface BinValue extends BinState {
  busy: boolean;
  actionError: string | null;
  clearActionError: () => void;
  execute: (action: (bins: BinService) => Promise<void>) => Promise<boolean>;
}

// ---------- helpers ----------

const SERVICE_UNAVAILABLE = 'O serviço de lixeiras está indisponível. Tente novamente mais tarde.';

function binErrorMessage(error: unknown): string {
  if (error instanceof BinError) {
    switch (error.code) {
      case 'bin/not-found': return 'Lixeira não encontrada. Verifique o código e tente novamente.';
      case 'bin/already-claimed': return 'Esta lixeira já foi vinculada a outra conta.';
      case 'bin/invalid-name': return 'Informe um nome válido para a lixeira.';
      case 'bin/invalid-local': return 'A localização deve ter até 100 caracteres.';
      case 'bin/invalid-id': return 'Informe o código da lixeira.';
      case 'bin/invalid-uid': return 'UID do usuário inválido.';
      case 'bin/members-limit': return 'Limite de 10 membros por lixeira atingido.';
      case 'bin/cannot-remove-owner': return 'O proprietário não pode ser removido da lixeira.';
      default: break;
    }
  }
  const code = (error as { code?: string }).code;
  if (code === 'permission-denied') return 'Sem permissão para esta operação.';
  if (code === 'unavailable') return 'Serviço indisponível. Verifique sua conexão.';
  return 'Não foi possível concluir. Tente novamente em instantes.';
}

// ---------- context ----------

const BinContext = createContext<BinValue | null>(null);
const initialState: BinState = { bins: [], listState: 'loading', listError: null };

// ---------- provider ----------

export function BinProvider({ uid, children }: { uid: string; children: ReactNode }): ReactElement {
  const [state, setState] = useState<BinState>(initialState);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const locked = useRef(false);

  // Refs for threshold-crossing detection
  const prevBinsRef = useRef<Map<string, number | null>>(new Map());
  const alertsRef = useRef<Map<string, AlertSettings>>(new Map());
  const notifReadyRef = useRef(false);

  // Set up notification handler + request permissions once
  useEffect(() => {
    setupNotificationHandler();
    requestNotificationPermissions().then((granted) => {
      notifReadyRef.current = granted;
    }).catch(() => { notifReadyRef.current = false; });
  }, []);

  // Subscribe to alert settings for this user
  useEffect(() => {
    if (!uid) return;
    let active = true;
    const unsub = observeAlerts(
      uid,
      (alerts) => {
        if (!active) return;
        const map = new Map<string, AlertSettings>();
        for (const a of alerts) map.set(a.binId, a);
        alertsRef.current = map;
      },
      () => { /* silent — alerts are best-effort */ },
    );
    return () => { active = false; unsub(); };
  }, [uid]);

  // Subscribe to bins + detect threshold crossings
  useEffect(() => {
    if (!uid) { setState({ bins: [], listState: 'empty', listError: null }); return; }

    setState(initialState);
    let active = true;

    const unsub = observeBins(
      uid,
      (bins) => {
        if (!active) return;
        setState({ bins, listState: bins.length > 0 ? 'ready' : 'empty', listError: null });

        // Detect threshold crossings
        if (notifReadyRef.current && alertsRef.current.size > 0) {
          for (const bin of bins) {
            const prevLevel = prevBinsRef.current.get(bin.id) ?? null;
            const newLevel = bin.currentLevel;

            // Only check if level changed
            if (prevLevel !== newLevel) {
              const alert = alertsRef.current.get(bin.id);
              if (alert && alert.enabled && alert.thresholds.length > 0) {
                const crossed = highestCrossed(prevLevel, newLevel, alert.thresholds);
                if (crossed != null) {
                  sendBinAlert(bin.name, bin.local, newLevel ?? 0, crossed).catch(() => {});
                }
              }
              prevBinsRef.current.set(bin.id, newLevel);
            }
          }
        }
      },
      (error) => {
        if (!active) return;
        setState({ bins: [], listState: 'error', listError: binErrorMessage(error) });
      },
    );

    return () => {
      active = false;
      unsub();
    };
  }, [uid]);

  const execute = useCallback(async (action: (bins: BinService) => Promise<void>): Promise<boolean> => {
    if (locked.current) return false;
    locked.current = true;
    setBusy(true);
    setActionError(null);
    try {
      const client = getFirebaseClient();
      if (!client) { setActionError(SERVICE_UNAVAILABLE); return false; }
      await action(client.bins);
      return true;
    } catch (reason) {
      setActionError(binErrorMessage(reason));
      return false;
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }, []);

  return (
    <BinContext.Provider value={{
      ...state, busy, actionError,
      clearActionError: () => { setActionError(null); },
      execute,
    }}>
      {children}
    </BinContext.Provider>
  );
}

// ---------- hook ----------

export function useBins(): BinValue {
  const value = useContext(BinContext);
  if (!value) throw new Error('useBins precisa de BinProvider.');
  return value;
}
