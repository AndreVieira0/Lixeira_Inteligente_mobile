import { useState, type ReactElement } from 'react';

import { AppShell } from '../../components/common/AppShell';
import { Button, Card, Field, Notice, TextLink } from '../../components/common/AuthUi';
import type { BinPreview } from '../../types/bin';

export function BinSettingsScreen({ bin, onBack, onSave, onWifi, onMembers, onAlerts }: {
  bin: BinPreview; onBack: () => void; onSave: (name: string, location: string) => void; onWifi: () => void;
  onMembers?: () => void;
  onAlerts?: () => void;
}): ReactElement {
  const [name, setName] = useState(bin.name);
  const [location, setLocation] = useState(bin.location);
  const [error, setError] = useState<string | null>(null);
  return <AppShell title="Editar lixeira" onBack={onBack}>
    <Card>
      <Field label="Nome da lixeira" value={name} onChangeText={(value) => { setName(value); setError(null); }} maxLength={80} />
      <Field label="Localização (opcional)" value={location} onChangeText={setLocation} maxLength={100} />
      <Notice message={error} />
      <Button title="Salvar alterações" onPress={() => {
        if (!name.trim()) { setError('Informe um nome para a lixeira.'); return; }
        onSave(name, location);
      }} />
    </Card>
    <TextLink onPress={onWifi}>Configurar Wi-Fi</TextLink>
    {onMembers && <TextLink onPress={onMembers}>Gerenciar membros</TextLink>}
    {onAlerts && <TextLink onPress={onAlerts}>Configurar alertas</TextLink>}
  </AppShell>;
}
