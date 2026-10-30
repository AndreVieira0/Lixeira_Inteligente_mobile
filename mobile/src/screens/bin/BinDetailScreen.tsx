import type { ReactElement } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

import { BinLevel } from '../../components/bin/BinCard';
import { AppShell, appStyles as s } from '../../components/common/AppShell';
import { Button, Card } from '../../components/common/AuthUi';
import { colors } from '../../constants/theme';
import { BIN_STATUS_LABEL, type BinReading, type BinPreview, type BinStatus } from '../../types/bin';

interface BinDetailScreenProps {
  bin: BinPreview;
  onBack: () => void;
  onHistory: () => void;
  onSettings: () => void;
  /** Real-time readings from Firestore (Firebase mode only). */
  readings?: BinReading[];
  readingsState?: 'loading' | 'ready' | 'error';
  /** Firmware status string for display (Firebase mode only). */
  firmwareStatus?: BinStatus | null;
}

export function BinDetailScreen({
  bin, onBack, onHistory, onSettings,
  readings, readingsState, firmwareStatus,
}: BinDetailScreenProps): ReactElement {
  const isFirebaseMode = readings !== undefined;

  // In Firebase mode use the latest reading timestamp from the bin doc directly;
  // fall back to the most recent reading timestamp if lastReading is not yet populated.
  const latestTimestamp = bin.lastReading
    ?? (readings && readings.length > 0
      ? new Date(readings[0].timestamp).toLocaleString('pt-BR', {
          day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
        })
      : null);

  const statusLabel = firmwareStatus
    ? (BIN_STATUS_LABEL[firmwareStatus] ?? firmwareStatus)
    : null;

  const connectionText = isFirebaseMode
    ? (readingsState === 'loading'
        ? 'Carregando dados do dispositivo…'
        : latestTimestamp
          ? `Última leitura recebida: ${latestTimestamp}`
          : 'Aguardando primeira medição do dispositivo.')
    : 'Dispositivo não conectado';

  return (
    <AppShell title={bin.name} subtitle={bin.location} onBack={onBack}>
      <Card>
        <Text style={s.label}>OCUPAÇÃO ATUAL</Text>
        <BinLevel level={bin.level} />
        {statusLabel && (
          <Text style={s.text}>Status: {statusLabel}</Text>
        )}
        <Text style={s.text}>
          Última leitura: {latestTimestamp ?? 'nenhuma medição recebida'}
        </Text>
      </Card>

      <Card>
        <Text style={s.title}>Dispositivo</Text>
        {isFirebaseMode && readingsState === 'loading' && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={s.text}>Conectando ao dispositivo…</Text>
          </View>
        )}
        <Text style={s.text}>
          {bin.battery === null
            ? 'Bateria não informada'
            : `Bateria: ${bin.battery.toString()}%`}
        </Text>
        <Text style={s.text}>{connectionText}</Text>
      </Card>

      <Button title="Ver histórico" onPress={onHistory} />
      <Button title="Configurar lixeira" variant="secondary" onPress={onSettings} />
    </AppShell>
  );
}
