import { useState, type ReactElement } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Icon } from 'react-native-paper';

import { HistoryChart } from '../../components/bin/HistoryChart';
import { HistoryStats } from '../../components/bin/HistoryStats';
import { AppShell } from '../../components/common/AppShell';
import { Card } from '../../components/common/AuthUi';
import { colors } from '../../constants/theme';
import { BIN_STATUS_LABEL, type BinPreview, type BinReading } from '../../types/bin';

// ── Constantes ───────────────────────────────────────────────────────────────

const REASON_LABEL: Record<BinReading['reason'], string> = {
  level_change: 'Mudança de nível',
  reconnection: 'Reconexão',
};

// Largura do gráfico = largura da tela menos padding (20 * 2) e margem do Card (20 * 2)
const CHART_WIDTH = Dimensions.get('window').width - 80;

// ── Formatação ───────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function groupByDate(readings: BinReading[]): { date: string; items: BinReading[] }[] {
  const map = new Map<string, BinReading[]>();
  for (const r of readings) {
    const key = formatDate(r.timestamp);
    const existing = map.get(key);
    if (existing) { existing.push(r); } else { map.set(key, [r]); }
  }
  return Array.from(map.entries()).map(([date, items]) => ({ date, items }));
}

// ── Cor por nível ─────────────────────────────────────────────────────────────
function levelColor(level: number): string {
  if (level >= 90) return colors.danger;
  if (level >= 80) return '#CC5A00';
  if (level >= 50) return '#B07C00';
  return colors.primary;
}
function levelBg(level: number): string {
  if (level >= 90) return colors.dangerSoft;
  if (level >= 80) return '#FFF3E8';
  if (level >= 50) return '#FFF8E1';
  return colors.primarySoft;
}

// ── Item de medição ───────────────────────────────────────────────────────────

function ReadingItem({ reading }: { reading: BinReading }): ReactElement {
  const color = levelColor(reading.level);
  const bg    = levelBg(reading.level);
  return (
    <View style={styles.readingRow}>
      {/* Hora + motivo */}
      <View style={styles.readingMeta}>
        <Text style={styles.readingTime}>{formatTime(reading.timestamp)}</Text>
        <View style={styles.reasonPill}>
          <Icon
            source={reading.reason === 'reconnection' ? 'wifi-refresh' : 'chart-line'}
            size={11}
            color={colors.muted}
          />
          <Text style={styles.reasonText}>{REASON_LABEL[reading.reason]}</Text>
        </View>
      </View>

      {/* Barra + percentual */}
      <View style={styles.readingBar}>
        <View style={styles.barTrack}>
          <View
            style={[
              styles.barFill,
              {
                width: `${reading.level}%` as `${number}%`,
                backgroundColor: color,
              },
            ]}
          />
        </View>
      </View>

      {/* Badge nível */}
      <View style={[styles.levelBadge, { backgroundColor: bg }]}>
        <Text style={[styles.levelBadgeText, { color }]}>{reading.level}%</Text>
      </View>
    </View>
  );
}

// ── Grupo de data ─────────────────────────────────────────────────────────────

function DateGroup({
  date, items, defaultOpen,
}: {
  date: string; items: BinReading[]; defaultOpen?: boolean;
}): ReactElement {
  const [open, setOpen] = useState(defaultOpen ?? false);
  const avgLevel = Math.round(items.reduce((s, r) => s + r.level, 0) / items.length);
  const color = levelColor(avgLevel);

  return (
    <View style={styles.dateGroup}>
      <TouchableOpacity
        style={styles.dateHeader}
        onPress={() => { setOpen((v) => !v); }}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`${date} — ${items.length} medições, média ${avgLevel}%`}
        accessibilityState={{ expanded: open }}
      >
        <View style={styles.dateLeft}>
          <View style={[styles.dateDot, { backgroundColor: color }]} />
          <Text style={styles.dateText}>{date}</Text>
          <View style={[styles.countPill, { backgroundColor: levelBg(avgLevel) }]}>
            <Text style={[styles.countText, { color }]}>{items.length}</Text>
          </View>
        </View>
        <View style={styles.dateRight}>
          <Text style={[styles.dateAvg, { color }]}>~{avgLevel}%</Text>
          <Icon
            source={open ? 'chevron-up' : 'chevron-down'}
            size={18}
            color={colors.muted}
          />
        </View>
      </TouchableOpacity>

      {open && (
        <View style={styles.dateItems}>
          {items.map((r) => <ReadingItem key={r.id} reading={r} />)}
        </View>
      )}
    </View>
  );
}

// ── Tela principal ────────────────────────────────────────────────────────────

interface BinHistoryScreenProps {
  bin: BinPreview;
  onBack: () => void;
  readings?: BinReading[];
  readingsState?: 'loading' | 'ready' | 'error';
  readingsError?: string | null;
}

export function BinHistoryScreen({
  bin, onBack,
  readings, readingsState, readingsError,
}: BinHistoryScreenProps): ReactElement {
  const isFirebaseMode = readings !== undefined;
  const groups = isFirebaseMode && readings && readings.length > 0
    ? groupByDate(readings)
    : [];

  return (
    <AppShell title="Histórico" subtitle={bin.name} onBack={onBack}>

      {/* ── Estado: carregando ── */}
      {isFirebaseMode && readingsState === 'loading' && (
        <Card>
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Carregando histórico…</Text>
          </View>
        </Card>
      )}

      {/* ── Estado: erro ── */}
      {isFirebaseMode && readingsState === 'error' && (
        <Card>
          <View style={styles.centered}>
            <View style={styles.errorIcon}>
              <Icon source="wifi-off" size={28} color={colors.danger} />
            </View>
            <Text style={styles.errorTitle}>Não foi possível carregar</Text>
            <Text style={styles.errorText}>
              {readingsError ?? 'Verifique sua conexão e tente novamente.'}
            </Text>
          </View>
        </Card>
      )}

      {/* ── Estado: sem dados ── */}
      {isFirebaseMode && readingsState === 'ready' && (!readings || readings.length === 0) && (
        <Card>
          <View style={styles.centered}>
            <View style={styles.emptyIcon}>
              <Icon source="chart-timeline-variant" size={36} color={colors.primary} />
            </View>
            <Text style={styles.emptyTitle}>Sem medições ainda</Text>
            <Text style={styles.emptyText}>
              O histórico aparecerá aqui assim que o dispositivo enviar as primeiras medições.
            </Text>
          </View>
        </Card>
      )}

      {/* ── Dados reais (Firebase mode) ── */}
      {isFirebaseMode && readingsState === 'ready' && readings && readings.length > 0 && (
        <>
          {/* Gráfico de linha */}
          <Card>
            <Text style={styles.sectionTitle}>Evolução da ocupação</Text>
            <Text style={styles.sectionSub}>
              {readings.length} medição{readings.length !== 1 ? 'ões' : ''} · toque no gráfico para ver o valor
            </Text>
            <View style={styles.chartWrap}>
              <HistoryChart readings={readings} width={CHART_WIDTH} />
            </View>
          </Card>

          {/* Estatísticas */}
          <Card>
            <Text style={styles.sectionTitle}>Estatísticas do período</Text>
            <HistoryStats readings={readings} />
          </Card>

          {/* Linha do tempo por data */}
          <Card>
            <Text style={styles.sectionTitle}>Linha do tempo</Text>
            <Text style={styles.sectionSub}>
              Toque em uma data para expandir as medições
            </Text>
            <View style={styles.timeline}>
              {groups.map((g, i) => (
                <DateGroup
                  key={g.date}
                  date={g.date}
                  items={g.items}
                  defaultOpen={i === 0}   // primeiro grupo (mais recente) começa aberto
                />
              ))}
            </View>
          </Card>
        </>
      )}

      {/* ── Modo demo ── */}
      {!isFirebaseMode && (
        <Card>
          {bin.history.length > 0 ? (
            <>
              <Text style={styles.sectionTitle}>Hoje</Text>
              {bin.history.map((reading) => (
                <View key={reading.time} style={styles.demoRow}>
                  <View style={styles.readingMeta}>
                    <Text style={styles.readingTime}>{reading.time}</Text>
                  </View>
                  <View style={styles.readingBar}>
                    <View style={styles.barTrack}>
                      <View
                        style={[
                          styles.barFill,
                          {
                            width: `${reading.level}%` as `${number}%`,
                            backgroundColor: levelColor(reading.level),
                          },
                        ]}
                      />
                    </View>
                  </View>
                  <View style={[styles.levelBadge, { backgroundColor: levelBg(reading.level) }]}>
                    <Text style={[styles.levelBadgeText, { color: levelColor(reading.level) }]}>
                      {reading.level}%
                    </Text>
                  </View>
                </View>
              ))}
            </>
          ) : (
            <View style={styles.centered}>
              <Text style={styles.emptyText}>Ainda não há medições para mostrar.</Text>
            </View>
          )}
        </Card>
      )}

    </AppShell>
  );
}

// ── Estilos ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Seção
  sectionTitle: {
    color: colors.ink,
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  sectionSub: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 2,
  },

  // Gráfico
  chartWrap: { marginHorizontal: -4, marginTop: 4 },

  // Estados vazios / erro / loading
  centered: { alignItems: 'center', gap: 10, paddingVertical: 12 },
  loadingText: { color: colors.muted, fontSize: 14, marginTop: 4 },
  errorIcon: {
    width: 56, height: 56, borderRadius: 18,
    backgroundColor: colors.dangerSoft, alignItems: 'center', justifyContent: 'center',
  },
  errorTitle: { color: colors.ink, fontSize: 16, fontWeight: '700', textAlign: 'center' },
  errorText:  { color: colors.muted, fontSize: 13, textAlign: 'center', lineHeight: 19 },
  emptyIcon: {
    width: 64, height: 64, borderRadius: 20,
    backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center',
  },
  emptyTitle: { color: colors.ink, fontSize: 16, fontWeight: '700', textAlign: 'center' },
  emptyText:  { color: colors.muted, fontSize: 13, textAlign: 'center', lineHeight: 19, maxWidth: 240 },

  // Timeline
  timeline: { gap: 2, marginTop: 4 },

  // Grupo de data
  dateGroup: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  dateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
  },
  dateLeft:  { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  dateRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dateDot:   { width: 8, height: 8, borderRadius: 4 },
  dateText:  { color: colors.ink, fontSize: 14, fontWeight: '600' },
  countPill: {
    paddingHorizontal: 8, paddingVertical: 2,
    borderRadius: 20,
  },
  countText:  { fontSize: 12, fontWeight: '700' },
  dateAvg:    { fontSize: 14, fontWeight: '700' },
  dateItems:  { borderTopWidth: 1, borderTopColor: colors.border },

  // Item de medição
  readingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  readingMeta: { width: 62 },
  readingTime: { color: colors.ink, fontSize: 13, fontWeight: '600' },
  reasonPill:  { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
  reasonText:  { color: colors.muted, fontSize: 10, flexShrink: 1 },
  readingBar:  { flex: 1 },
  barTrack: {
    height: 8, backgroundColor: colors.primarySoft,
    borderRadius: 4, overflow: 'hidden',
  },
  barFill: { height: '100%', borderRadius: 4 },
  levelBadge: {
    width: 44, paddingVertical: 4,
    borderRadius: 8, alignItems: 'center',
  },
  levelBadgeText: { fontSize: 12, fontWeight: '700' },

  // Demo row
  demoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
});
