import type { ReactElement } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  VictoryArea,
  VictoryAxis,
  VictoryChart,
  VictoryScatter,
} from 'victory-native';

import { colors } from '../../constants/theme';
import type { BinReading } from '../../types/bin';

// ── Threshold legend ──────────────────────────────────────────────────────────
const THRESHOLDS = [
  { label: '50%', color: '#B07C00' },
  { label: '80%', color: colors.danger },
];

// ── Color by max level ────────────────────────────────────────────────────────
function areaColor(level: number): string {
  if (level >= 90) return colors.danger;
  if (level >= 80) return '#CC5A00';
  if (level >= 50) return '#B07C00';
  return colors.primary;
}

// ── Main component ───────────────────────────────────────────────────────────

interface HistoryChartProps {
  readings: BinReading[];
  width: number;
}

export function HistoryChart({ readings, width }: HistoryChartProps): ReactElement {
  // Readings chegam em ordem decrescente (mais recente primeiro); inverter para o gráfico
  const sorted = [...readings].reverse();

  const data = sorted.map((r, i) => ({
    x: i,
    y: r.level,
  }));

  const height = 220;
  const padding = { top: 16, bottom: 40, left: 38, right: 16 };

  // Eixo X: mostrar no máximo 5 labels de hora
  const xTickCount = Math.min(data.length, 5);
  const xTickValues = data
    .filter((_, i) => {
      if (data.length <= 5) return true;
      const step = Math.max(1, Math.floor(data.length / (xTickCount - 1)));
      return i % step === 0 || i === data.length - 1;
    })
    .map((d) => d.x);

  function xTickFormat(x: number): string {
    const item = sorted[x];
    if (!item) return '';
    const d = new Date(item.timestamp);
    return isNaN(d.getTime())
      ? ''
      : d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }

  const maxLevel = data.length ? Math.max(...data.map((d) => d.y)) : 0;
  const stroke = areaColor(maxLevel);

  return (
    <View style={[styles.wrapper, { width }]}>
      <VictoryChart
        width={width}
        height={height}
        padding={padding}
        domain={{ y: [0, 100] }}
      >
        {/* Grid horizontal */}
        <VictoryAxis
          dependentAxis
          tickValues={[0, 25, 50, 75, 100]}
          tickFormat={(t: number) => `${t}%`}
          style={{
            axis: { stroke: 'transparent' },
            grid: { stroke: colors.border, strokeWidth: 1, strokeDasharray: '4,4' },
            tickLabels: { fill: colors.muted, fontSize: 10, fontFamily: 'System' },
          }}
        />

        {/* Eixo X */}
        <VictoryAxis
          tickValues={xTickValues}
          tickFormat={xTickFormat}
          style={{
            axis: { stroke: colors.border },
            grid: { stroke: 'transparent' },
            tickLabels: { fill: colors.muted, fontSize: 9, fontFamily: 'System' },
          }}
        />

        {/* Área preenchida + linha */}
        <VictoryArea
          data={data}
          interpolation="monotoneX"
          style={{
            data: {
              fill: stroke,
              fillOpacity: 0.12,
              stroke: stroke,
              strokeWidth: 2.5,
            },
          }}
        />

        {/* Pontos */}
        <VictoryScatter
          data={data}
          size={4}
          style={{
            data: { fill: stroke },
          }}
        />
      </VictoryChart>

      {/* Linhas de threshold legendadas */}
      <View style={styles.thresholds}>
        {THRESHOLDS.map((t) => (
          <View key={t.label} style={styles.thresholdRow}>
            <View style={[styles.thresholdDash, { backgroundColor: t.color }]} />
            <Text style={[styles.thresholdLabel, { color: t.color }]}>{t.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { alignSelf: 'center' },
  thresholds: {
    flexDirection: 'row',
    gap: 16,
    paddingHorizontal: 40,
    marginTop: -8,
    marginBottom: 4,
    flexWrap: 'wrap',
  },
  thresholdRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  thresholdDash: { width: 12, height: 2, borderRadius: 1 },
  thresholdLabel: { fontSize: 11, fontWeight: '600' },
});
