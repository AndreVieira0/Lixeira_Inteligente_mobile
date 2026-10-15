import { useState, type ReactElement } from 'react';
import { Text } from 'react-native';

import { AppShell, appStyles as s } from '../../components/common/AppShell';
import { Button, Card, Field, Notice } from '../../components/common/AuthUi';

export function AddBinScreen({ onBack, onAdd, wifiOnly = false }: {
  onBack: () => void; onAdd: (name: string, location: string) => void; wifiOnly?: boolean;
}): ReactElement {
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [error, setError] = useState<string | null>(null);
  if (wifiOnly) return <AppShell title="Rede Wi-Fi" onBack={onBack}>
    <Card><Text style={s.title}>Dispositivo não conectado</Text><Text style={s.text}>A configuração de rede estará disponível quando houver um dispositivo vinculado.</Text><Button title="Voltar às configurações" onPress={onBack} /></Card>
  </AppShell>;
  return <AppShell title="Adicionar lixeira" onBack={onBack}>
    <Card>
      <Field label="Nome da lixeira" value={name} onChangeText={(value) => { setName(value); setError(null); }} maxLength={80} placeholder="Ex.: Biblioteca" autoFocus />
      <Field label="Localização (opcional)" value={location} onChangeText={setLocation} maxLength={100} placeholder="Ex.: Bloco B" />
      <Notice message={error} />
      <Button title="Salvar lixeira" onPress={() => {
        if (!name.trim()) { setError('Informe um nome para a lixeira.'); return; }
        onAdd(name, location);
      }} />
    </Card>
  </AppShell>;
}
