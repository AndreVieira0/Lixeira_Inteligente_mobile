import type { ReactElement } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Icon } from 'react-native-paper';

import { colors } from '../../constants/theme';
import type { BinReading } from '../../types/bin';
import { computeStats } from '../../utils/binStats';

// ── Célula individual ────────────────────────────────────────────────────────

function StatCell({
  icon, label, value, color, subtext,
}: {
  icon: string;
  label: string;
  value: string;
  color?: string;
  subtext?: string;
}): ReactElement {
  return (
    <View style={styles.cell}>
      <View style={[styles.iconWrap, { backgroundColor: color ? `${color}18` : colors.primarySoft }]}>
        <Icon source={icon} size={18} color={color ?? colors.primary} />
      </View>
      <Text style={styles.cellValue}>{value}</Text>
      <Text style={styles.cellLabel}>{label}</Text>
      {subtext ? <Text style={styles.cellSub}>{subtext}</Text> : null}
    </View>
  );
}

// ── Componente principal ─────────────────────────────────────────────────────

interface HistoryStatsProps {
  readings: BinReading[];
}

export function HistoryStats({ readings }: HistoryStatsProps): ReactElement {
  const { avg, max, min, trend, trendDelta, fillRate, reconCount } = computeStats(readings);

  const trendIcon  = trend === 'up' ? 'trending-up' : trend === 'down' ? 'trending-down' : 'trending-neutral';
  const trendColor = trend === 'up' ? colors.danger : trend === 'down' ? colors.primary : colors.muted;
  const trendLabel = trend === 'up' ? `+${trendDelta}% alta` : trend === 'down' ? `-${trendDelta}% queda` : 'Estável';

  return (
    <View style={styles.grid}>
      <StatCell
        icon="gauge"
        label="Média"
        value={`${avg}%`}
        color={avg >= 80 ? colors.danger : avg >= 50 ? '#B07C00' : colors.primary}
      />
      <StatCell
        icon="arrow-up-bold"
        label="Máxima"
        value={`${max}%`}
        color={max >= 80 ? colors.danger : colors.primary}
      />
      <StatCell
        icon="arrow-down-bold"
        label="Mínima"
        value={`${min}%`}
        color={colors.primary}
      />
      <StatCell
        icon={trendIcon}
        label="Tendência"
        value={trendLabel}
        color={trendColor}
      />
      <StatCell
        icon="alert-circle-outline"
        label="Acima de 80%"
        value={`${fillRate}%`}
        subtext="das medições"
        color={fillRate > 50 ? colors.danger : colors.primary}
      />
      <StatCell
        icon="wifi-refresh"
        label="Reconexões"
        value={reconCount.toString()}
        color={reconCount > 2 ? '#B07C00' : colors.primary}
      />
    </View>
  );
}

// ── Estilos ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  cell: {
    flex: 1,
    minWidth: 90,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    alignItems: 'flex-start',
    gap: 4,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  cellValue: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.5,
    lineHeight: 22,
  },
  cellLabel: {
    color: colors.muted,
    fontSize: 11,
    lineHeight: 15,
  },
  cellSub: {
    color: colors.muted,
    fontSize: 10,
    lineHeight: 13,
  },
});
