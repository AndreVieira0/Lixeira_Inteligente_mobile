import { useCallback, useEffect, useState, type ReactElement } from 'react';
import { ActivityIndicator, BackHandler, Text, View } from 'react-native';

import { Button, Card, Notice, Page, uiStyles } from '../components/common/AuthUi';
import { ScreenTransition } from '../components/common/ScreenTransition';
import { colors } from '../constants/theme';
import { useAuth } from '../contexts/AuthContext';
import { BinProvider, useBins } from '../contexts/BinContext';
import { useBinDetail } from '../hooks/useBinDetail';
import { getFirebaseClient } from '../services/firebase/client';
import { AuthScreen, type AuthMode } from '../screens/auth/AuthScreen';
import { ProfileScreen } from '../screens/auth/ProfileScreen';
import { AddBinScreen } from '../screens/bin/AddBinScreen';
import { BinDetailScreen } from '../screens/bin/BinDetailScreen';
import { BinHistoryScreen } from '../screens/bin/BinHistoryScreen';
import { BinListScreen } from '../screens/bin/BinListScreen';
import { BinSettingsScreen } from '../screens/bin/BinSettingsScreen';
import { AlertSettingsScreen } from '../screens/bin/AlertSettingsScreen';
import { ClaimBinScreen } from '../screens/bin/ClaimBinScreen';
import { MembersScreen } from '../screens/bin/MembersScreen';
import type { Bin, BinPreview } from '../types/bin';

// ---------- helpers ----------

function binToPreview(bin: Bin): BinPreview {
  return {
    id: bin.id,
    name: bin.name,
    location: bin.local,
    level: bin.currentLevel,
    battery: null,
    lastReading: bin.lastUpdate
      ? new Date(bin.lastUpdate).toLocaleString('pt-BR', {
          day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
        })
      : null,
    history: [], // populated by BinHistoryScreen via readings prop in Firebase mode
  };
}

// ---------- unauthenticated ----------

function GuestNavigator(): ReactElement {
  const { busy, clearError } = useAuth();
  const [mode, setMode] = useState<AuthMode>('login');
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (busy) return true;
      if (mode !== 'login') { clearError(); setMode('login'); return true; }
      return false;
    });
    return () => { sub.remove(); };
  }, [busy, mode, clearError]);
  return <ScreenTransition key={mode} fill><AuthScreen mode={mode} navigate={setMode} /></ScreenTransition>;
}

// ---------- detail + history container (subscribes to readings) ----------

/**
 * Thin wrapper that activates the readings observer only when a bin detail
 * route is active, and passes the live data down to the presentation screens.
 */
function BinDetailContainer({
  bin, uid, route, onBack, onHistory, onSettings,
}: {
  bin: Bin;
  uid: string;
  route: 'detail' | 'history';
  onBack: () => void;
  onHistory: () => void;
  onSettings: () => void;
}): ReactElement {
  const { readings, readingsState, readingsError } = useBinDetail(bin.id, uid);
  const preview = binToPreview(bin);

  if (route === 'history') {
    return (
      <BinHistoryScreen
        bin={preview}
        onBack={onBack}
        readings={readings}
        readingsState={readingsState}
        readingsError={readingsError}
      />
    );
  }

  return (
    <BinDetailScreen
      key={bin.id}
      bin={preview}
      onBack={onBack}
      onHistory={onHistory}
      onSettings={onSettings}
      readings={readings}
      readingsState={readingsState}
      firmwareStatus={bin.status}
    />
  );
}

// ---------- bin navigator (authenticated) ----------

type BinRoute =
  | { name: 'list' | 'add' | 'account' | 'claim' }
  | { name: 'detail' | 'history' | 'settings' | 'wifi' | 'members' | 'alerts'; id: string };

function BinNavigator({ uid, onAccount }: { uid: string; onAccount: () => void }): ReactElement {
  const { bins, listState, listError, execute, busy, actionError, clearActionError } = useBins();
  const [routes, setRoutes] = useState<BinRoute[]>([{ name: 'list' }]);
  const route = routes[routes.length - 1];
  const back = useCallback(() => { setRoutes((prev) => prev.length > 1 ? prev.slice(0, -1) : prev); }, []);
  const push = useCallback((r: BinRoute) => { setRoutes((prev) => [...prev, r]); }, []);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (routes.length <= 1) return false;
      back(); return true;
    });
    return () => { sub.remove(); };
  }, [back, routes.length]);

  function renderScreen(): ReactElement {
    if (route.name === 'account') return <ProfileScreen />;

    if (route.name === 'add' || route.name === 'claim') {
      return (
        <ClaimBinScreen
          busy={busy}
          error={actionError}
          onClearError={clearActionError}
          onBack={back}
          onClaim={async (binId, name, local) => {
            const ok = await execute(async (svc) => { await svc.claimBin(binId, uid, name, local); });
            if (ok) back();
          }}
        />
      );
    }

    if ('id' in route) {
      const bin = bins.find((b) => b.id === route.id);

      if (route.name === 'members' && bin) {
        return (
          <MembersScreen
            bin={bin}
            ownerUid={uid}
            busy={busy}
            error={actionError}
            onClearError={clearActionError}
            onBack={back}
            onAdd={async (memberUid) => {
              await execute(async (svc) => { await svc.addMember(bin, memberUid); });
            }}
            onRemove={async (memberUid) => {
              await execute(async (svc) => { await svc.removeMember(bin, uid, memberUid); });
            }}
          />
        );
      }

      if (!bin) {
        return (
          <Page>
            <Card>
              <Notice message="Lixeira não encontrada." />
              <Button title="Voltar" onPress={back} />
            </Card>
          </Page>
        );
      }

      if (route.name === 'detail' || route.name === 'history') {
        return (
          <BinDetailContainer
            bin={bin}
            uid={uid}
            route={route.name}
            onBack={back}
            onHistory={() => { push({ name: 'history', id: route.id }); }}
            onSettings={() => { push({ name: 'settings', id: route.id }); }}
          />
        );
      }

      if (route.name === 'settings') {
        return (
          <BinSettingsScreen
            key={bin.id}
            bin={binToPreview(bin)}
            onBack={back}
            onSave={async (name, location) => {
              const ok = await execute(async (svc) => { await svc.updateBinMeta(route.id, name, location); });
              if (ok) back();
            }}
            onWifi={() => { push({ name: 'wifi', id: route.id }); }}
            onMembers={bin.ownerId === uid ? () => { push({ name: 'members', id: route.id }); } : undefined}
            onAlerts={() => { push({ name: 'alerts', id: route.id }); }}
          />
        );
      }

      if (route.name === 'alerts') {
        const client = getFirebaseClient();
        return (
          <AlertSettingsScreen
            bin={binToPreview(bin)}
            busy={busy}
            error={actionError}
            onClearError={clearActionError}
            onBack={back}
            onLoad={async () => {
              if (!client) return null;
              return client.alerts.getAlert(route.id, uid);
            }}
            onSave={async (thresholds, enabled) => {
              const ok = await execute(async (svc) => {
                void svc; // execute gives BinService; we call AlertService directly
                if (!client) throw new Error('unavailable');
                await client.alerts.saveAlert(route.id, uid, thresholds, enabled);
              });
              if (ok) back();
            }}
          />
        );
      }

      if (route.name === 'wifi') {
        return <AddBinScreen wifiOnly onBack={back} onAdd={() => { /* Wi-Fi config not available in this version */ }} />;
      }
    }

    // list
    return (
      <BinListScreen
        bins={bins.map(binToPreview)}
        state={
          listState === 'loading' ? 'loading' :
          listState === 'error'   ? 'error'   :
          listState === 'empty'   ? 'empty'   : 'ready'
        }
        setState={() => { /* state is driven by Firestore */ }}
        onSelect={(id) => { push({ name: 'detail', id }); }}
        onEdit={(id) => { push({ name: 'settings', id }); }}
        onAdd={() => { push({ name: 'add' }); }}
        onAccount={onAccount}
        error={listError}
      />
    );
  }

  return (
    <ScreenTransition key={`${route.name}-${'id' in route ? route.id : ''}`} fill>
      {renderScreen()}
    </ScreenTransition>
  );
}

// ---------- authenticated shell ----------

function AuthenticatedNavigator({ uid }: { uid: string }): ReactElement {
  const [showAccount, setShowAccount] = useState(false);

  if (showAccount) {
    return (
      <ScreenTransition key="account" fill>
        <ProfileScreen onBack={() => { setShowAccount(false); }} />
      </ScreenTransition>
    );
  }

  return (
    <BinProvider uid={uid}>
      <BinNavigator uid={uid} onAccount={() => { setShowAccount(true); }} />
    </BinProvider>
  );
}

// ---------- root ----------

export function RootNavigator(): ReactElement {
  const { identity, loading, profileError, retry, busy, execute } = useAuth();

  if (loading) {
    return (
      <Page>
        <View style={uiStyles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={uiStyles.text}>Preparando sua conta…</Text>
        </View>
      </Page>
    );
  }

  if (profileError) {
    return (
      <Page>
        <Card>
          <Notice message={profileError} />
          <Button title="Tentar novamente" onPress={retry} disabled={busy} />
          {identity && (
            <Button
              title="Sair da conta"
              variant="secondary"
              disabled={busy}
              onPress={async () => {
                await execute(async (accounts) => { await accounts.logout(); });
              }}
            />
          )}
        </Card>
      </Page>
    );
  }

  if (identity) {
    return (
      <ScreenTransition key={identity.uid} fill>
        <AuthenticatedNavigator uid={identity.uid} />
      </ScreenTransition>
    );
  }

  return <GuestNavigator />;
}
