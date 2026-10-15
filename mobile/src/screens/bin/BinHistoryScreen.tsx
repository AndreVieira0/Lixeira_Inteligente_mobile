import type { ReactElement } from 'react';
import { Text, View } from 'react-native';

import { AppShell, appStyles as s } from '../../components/common/AppShell';
import { Card } from '../../components/common/AuthUi';
import type { BinPreview } from '../../types/bin';

export function BinHistoryScreen({ bin, onBack }: { bin: BinPreview; onBack: () => void }): ReactElement {
  return <AppShell title="Histórico de ocupação" subtitle={bin.name} onBack={onBack}>
    <Card><Text style={s.title}>Hoje</Text>
      {bin.history.length ? bin.history.map((reading) => <View key={reading.time} style={s.section}>
        <Text style={s.text}>{reading.time} · {reading.level}% de ocupação</Text>
        <View style={s.track}><View style={[s.fill, { width: `${reading.level.toString()}%` as `${number}%` }]} /></View>
      </View>) : <Text style={s.text}>Ainda não há medições para mostrar.</Text>}
    </Card>
  </AppShell>;
}
