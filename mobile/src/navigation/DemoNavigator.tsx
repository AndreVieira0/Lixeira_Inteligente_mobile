import { useCallback, useEffect, useState, type ReactElement } from 'react';
import { BackHandler } from 'react-native';

import { ScreenTransition } from '../components/common/ScreenTransition';
import { useBinPreview } from '../hooks/useBinPreview';
import { AccountPreviewScreen } from '../screens/auth/AccountPreviewScreen';
import { AuthForm, type AuthMode } from '../screens/auth/AuthScreen';
import { RecoveryPreviewScreen } from '../screens/auth/RecoveryPreviewScreen';
import { AddBinScreen } from '../screens/bin/AddBinScreen';
import { BinDetailScreen } from '../screens/bin/BinDetailScreen';
import { BinHistoryScreen } from '../screens/bin/BinHistoryScreen';
import { BinListScreen } from '../screens/bin/BinListScreen';
import { BinSettingsScreen } from '../screens/bin/BinSettingsScreen';

type Visitor = { nome: string; email: string };
type Route = { name: 'list' | 'add' | 'account' } | { name: 'detail' | 'history' | 'settings' | 'wifi'; id: string };

function BinPreviewNavigator({ visitor, onLogout }: { visitor: Visitor; onLogout: () => void }): ReactElement {
  const preview = useBinPreview();
  const [routes, setRoutes] = useState<Route[]>([{ name: 'list' }]);
  const route = routes[routes.length - 1];
  const back = useCallback(() => { setRoutes((items) => items.length > 1 ? items.slice(0, -1) : items); }, []);
  const push = (next: Route): void => { setRoutes((items) => [...items, next]); };
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (routes.length <= 1) return false;
      back(); return true;
    });
    return () => { subscription.remove(); };
  }, [back, routes.length]);
  function renderScreen(): ReactElement {
    if (route.name === 'account') return <AccountPreviewScreen visitor={visitor} onBack={back} onLogout={onLogout} />;
    if (route.name === 'add') return <AddBinScreen onBack={back} onAdd={(name, location) => {
      preview.add(name, location);
      back();
    }} />;
    if ('id' in route) {
      const bin = preview.bins.find((item) => item.id === route.id);
      if (bin) {
        if (route.name === 'history') return <BinHistoryScreen bin={bin} onBack={back} />;
        if (route.name === 'settings') return <BinSettingsScreen key={bin.id} bin={bin} onBack={back} onSave={(name, location) => { preview.update(bin.id, name, location); back(); }} onWifi={() => { push({ name: 'wifi', id: bin.id }); }} />;
        if (route.name === 'wifi') return <AddBinScreen wifiOnly onBack={back} onAdd={() => { /* Preview only: no network changes. */ }} />;
        return <BinDetailScreen key={bin.id} bin={bin} onBack={back} onHistory={() => { push({ name: 'history', id: bin.id }); }} onSettings={() => { push({ name: 'settings', id: bin.id }); }} />;
      }
    }
    return <BinListScreen bins={preview.bins} state={preview.state} setState={preview.setState} onSelect={(id) => { push({ name: 'detail', id }); }} onEdit={(id) => { push({ name: 'settings', id }); }} onAdd={() => { push({ name: 'add' }); }} onAccount={() => { push({ name: 'account' }); }} />;
  }
  return <ScreenTransition key={`${route.name}-${'id' in route ? route.id : ''}`} fill>{renderScreen()}</ScreenTransition>;
}

export function DemoNavigator(): ReactElement {
  const [mode, setMode] = useState<AuthMode>('login');
  const [visitor, setVisitor] = useState<Visitor | null>(null);

  useEffect(() => {
    if (visitor) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (mode === 'login') return false;
      setMode('login'); return true;
    });
    return () => { subscription.remove(); };
  }, [mode, visitor]);

  if (visitor) {
    return <ScreenTransition key="signed-in" fill><BinPreviewNavigator visitor={visitor} onLogout={() => { setVisitor(null); setMode('login'); }} /></ScreenTransition>;
  }
  if (mode === 'reset') return <ScreenTransition key="reset" fill><RecoveryPreviewScreen onBack={() => { setMode('login'); }} /></ScreenTransition>;
  return <ScreenTransition key={mode} fill><AuthForm key={mode} mode={mode} navigate={setMode} demo onSubmit={(action, values) => {
    if (action !== 'reset') setVisitor({ nome: values.nome.trim() || 'Visitante', email: values.email.trim() });
    return true;
  }} /></ScreenTransition>;
}
