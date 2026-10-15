import type { ReactElement } from 'react';
import { Text } from 'react-native';

import { BinLevel } from '../../components/bin/BinCard';
import { AppShell, appStyles as s } from '../../components/common/AppShell';
import { Button, Card } from '../../components/common/AuthUi';
import type { BinPreview } from '../../types/bin';

export function BinDetailScreen({ bin, onBack, onHistory, onSettings }: {
  bin: BinPreview; onBack: () => void; onHistory: () => void; onSettings: () => void;
}): ReactElement {
  return <AppShell title={bin.name} subtitle={bin.location} onBack={onBack}>
    <Card><Text style={s.label}>OCUPAÇÃO ATUAL</Text><BinLevel level={bin.level} />
      <Text style={s.text}>Última leitura: {bin.lastReading ?? 'nenhuma medição recebida'}</Text>
    </Card>
    <Card><Text style={s.title}>Dispositivo</Text>
      <Text style={s.text}>{bin.battery === null ? 'Bateria não informada' : `Bateria: ${bin.battery.toString()}%`}</Text>
      <Text style={s.text}>Dispositivo não conectado</Text>
    </Card>
    <Button title="Ver histórico" onPress={onHistory} />
    <Button title="Configurar lixeira" variant="secondary" onPress={onSettings} />
  </AppShell>;
}
