import { useEffect, useState, type ReactElement } from 'react';
import { ActivityIndicator, BackHandler, Text, View } from 'react-native';

import { Button, Card, Notice, Page, uiStyles } from '../components/common/AuthUi';
import { ScreenTransition } from '../components/common/ScreenTransition';
import { colors } from '../constants/theme';
import { useAuth } from '../contexts/AuthContext';
import { AuthScreen, type AuthMode } from '../screens/auth/AuthScreen';
import { ProfileScreen } from '../screens/auth/ProfileScreen';

function GuestNavigator(): ReactElement {
  const { busy, clearError } = useAuth();
  const [mode, setMode] = useState<AuthMode>('login');

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (busy) return true;
      if (mode !== 'login') { clearError(); setMode('login'); return true; }
      return false;
    });
    return () => { subscription.remove(); };
  }, [busy, mode, clearError]);
  return <ScreenTransition key={mode} fill><AuthScreen mode={mode} navigate={setMode} /></ScreenTransition>;
}

export function RootNavigator(): ReactElement {
  const { identity, loading, profileError, retry, execute, busy } = useAuth();
  if (loading) return <Page><View style={uiStyles.centered}><ActivityIndicator size="large" color={colors.primary} /><Text style={uiStyles.text}>Preparando sua conta…</Text></View></Page>;
  if (profileError) return <Page><Card><Notice message={profileError} /><Button title="Tentar novamente" onPress={retry} disabled={busy} />{identity && <Button title="Sair da conta" variant="secondary" disabled={busy} onPress={async () => { await execute(async (accounts) => { await accounts.logout(); }); }} />}</Card></Page>;
  if (identity) return <ScreenTransition key={identity.uid} fill><ProfileScreen key={identity.uid} /></ScreenTransition>;
  return <GuestNavigator />;
}
