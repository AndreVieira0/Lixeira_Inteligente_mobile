import type { ReactElement } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Avatar, Card as PaperCard, Chip, Icon, ProgressBar, TouchableRipple } from 'react-native-paper';

import { PREVIEW_COLLECTION_LEVEL } from '../../constants/binPreview';
import { colors } from '../../constants/theme';
import type { BinPreview } from '../../types/bin';
import { appStyles as s } from '../common/AppShell';
import { IconButton } from '../common/IconButton';

export function BinLevel({ level, showStatus = true }: { level: number | null; showStatus?: boolean }): ReactElement {
  const attention = level !== null && level >= PREVIEW_COLLECTION_LEVEL;
  return <View style={s.section}>
    <View style={styles.levelRow}><Text style={styles.level}>{level === null ? '—' : level.toString()}<Text style={styles.percent}>{level !== null ? '%' : ''}</Text></Text><Text style={styles.caption}>de ocupação</Text></View>
    {level !== null && <ProgressBar accessibilityLabel="Ocupação da lixeira" accessibilityValue={{ min: 0, max: 100, now: level }}
      progress={level / 100} color={attention ? colors.danger : colors.primary} style={styles.progress} />}
    {showStatus && <Text style={s.text}>{level === null ? 'Sem leitura' : attention ? 'Precisa de coleta' : 'Capacidade disponível'}</Text>}
  </View>;
}

export function BinCard({ bin, onPress, onEdit }: { bin: BinPreview; onPress: () => void; onEdit: () => void }): ReactElement {
  const attention = bin.level !== null && bin.level >= PREVIEW_COLLECTION_LEVEL;
  const status = bin.level === null ? 'Sem leitura' : attention ? 'Precisa de coleta' : 'Capacidade disponível';
  return <PaperCard mode="elevated" elevation={1} style={styles.card}>
    <PaperCard.Content style={styles.content}>
    <View style={styles.heading}>
      <Avatar.Icon size={42} icon="trash-can-outline" color={colors.primary} style={styles.avatar} />
      <View style={styles.identity}><Text style={styles.name}>{bin.name}</Text><Text style={styles.location}>{bin.location}</Text></View>
      <IconButton icon="edit" label={`Editar ${bin.name}`} onPress={onEdit} />
    </View>
    <Chip icon={bin.level === null ? 'clock-outline' : attention ? 'alert-circle-outline' : 'check-circle-outline'}
      style={[styles.chip, attention && styles.attention]} textStyle={{ color: attention ? colors.danger : colors.primary }}>{status}</Chip>
    </PaperCard.Content>
    <TouchableRipple accessibilityRole="button" accessibilityLabel={`Ver detalhes de ${bin.name}`} onPress={onPress} style={styles.details}>
      <View style={s.section}>
        <BinLevel level={bin.level} showStatus={false} />
        <View style={styles.reading}><Icon source="clock-outline" size={16} color={colors.muted} /><Text style={styles.caption}>{bin.lastReading ?? 'Aguardando primeira medição'}</Text></View>
        <View style={styles.footer}><Text style={styles.detailsText}>Ver detalhes</Text><Icon source="arrow-right" size={20} color={colors.primary} /></View>
      </View>
    </TouchableRipple>
  </PaperCard>;
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: 24 },
  content: { paddingHorizontal: 18, paddingTop: 18, paddingBottom: 0, gap: 16 },
  heading: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { backgroundColor: colors.primarySoft }, identity: { flex: 1, gap: 4 },
  name: { color: colors.ink, fontSize: 17, fontWeight: '700', lineHeight: 22 },
  location: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  chip: { alignSelf: 'flex-start', backgroundColor: colors.primarySoft }, attention: { backgroundColor: colors.dangerSoft },
  details: { padding: 20, borderBottomLeftRadius: 24, borderBottomRightRadius: 24, overflow: 'hidden' },
  levelRow: { flexDirection: 'row', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' },
  level: { color: colors.ink, fontSize: 52, lineHeight: 62, fontWeight: '700', letterSpacing: -2 },
  percent: { fontSize: 25, letterSpacing: 0 }, caption: { color: colors.muted, fontSize: 13, flexShrink: 1 },
  progress: { height: 10, borderRadius: 5, backgroundColor: colors.primarySoft },
  reading: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  footer: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  detailsText: { color: colors.primary, fontSize: 14, fontWeight: '600' },
});
