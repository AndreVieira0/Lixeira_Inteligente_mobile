import { useEffect, useState, type ReactElement } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';
import { Icon } from 'react-native-paper';

import { AppShell, appStyles as s } from '../../components/common/AppShell';
import { Button, Card, Notice } from '../../components/common/AuthUi';
import { colors } from '../../constants/theme';
import { ALERT_PRESETS } from '../../types/alert';
import type { BinPreview } from '../../types/bin';

interface AlertSettingsScreenProps {
  bin: BinPreview;
  busy: boolean;
  error: string | null;
  onClearError: () => void;
  onBack: () => void;
  onLoad: () => Promise<{ thresholds: number[]; enabled: boolean } | null>;
  onSave: (thresholds: number[], enabled: boolean) => Promise<void>;
}

export function AlertSettingsScreen({
  bin, busy, error, onClearError, onBack, onLoad, onSave,
}: AlertSettingsScreenProps): ReactElement {
  const [enabled, setEnabled] = useState(true);
  const [selected, setSelected] = useState<Set<number>>(new Set([80]));
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    onLoad().then((settings) => {
      if (!active || !settings) return;
      setEnabled(settings.enabled);
      setSelected(new Set(settings.thresholds));
      setLoaded(true);
    }).catch(() => setLoaded(true));
    return () => { active = false; };
  }, [onLoad]);

  function toggle(level: number): void {
    onClearError();
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(level)) next.delete(level);
      else next.add(level);
      return next;
    });
  }

  return (
    <AppShell title="Alertas" subtitle={bin.name} onBack={onBack}>

      {/* Master toggle */}
      <Card>
        <View style={styles.toggleRow}>
          <View style={styles.toggleMeta}>
            <View style={styles.iconWrap}>
              <Icon source="bell-outline" size={20} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.toggleTitle}>Notificações</Text>
              <Text style={styles.toggleSub}>
                {enabled
                  ? 'Você receberá alertas no celular quando a lixeira atingir os níveis selecionados.'
                  : 'As notificações estão desativadas para esta lixeira.'}
              </Text>
            </View>
          </View>
          <Switch
            value={enabled}
            onValueChange={(v) => { setEnabled(v); onClearError(); }}
            color={colors.primary}
            disabled={busy}
          />
        </View>
      </Card>

      {/* Threshold selection */}
      <Card>
        <Text style={s.title}>Níveis de alerta</Text>
        <Text style={styles.sectionSub}>
          Escolha em quais percentuais deseja ser avisado. A notificação é enviada
          quando a ocupação atinge ou ultrapassa o nível selecionado.
        </Text>

        {ALERT_PRESETS.map((preset) => {
          const active = selected.has(preset.level);
          return (
            <View key={preset.level} style={[styles.presetRow, active && styles.presetRowActive]}>
              <View style={styles.presetMeta}>
                <View style={[styles.levelCircle, {
                  backgroundColor: preset.level >= 90 ? colors.dangerSoft
                    : preset.level >= 80 ? '#FFF3E8'
                    : preset.level >= 50 ? '#FFF8E1'
                    : colors.primarySoft,
                }]}>
                  <Text style={[styles.levelCircleText, {
                    color: preset.level >= 90 ? colors.danger
                      : preset.level >= 80 ? '#CC5A00'
                      : preset.level >= 50 ? '#B07C00'
                      : colors.primary,
                  }]}>{preset.level}%</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.presetLabel}>{preset.label}</Text>
                  <Text style={styles.presetDesc}>{preset.description}</Text>
                </View>
              </View>
              <Switch
                value={active && enabled}
                onValueChange={() => toggle(preset.level)}
                color={colors.primary}
                disabled={busy || !enabled}
              />
            </View>
          );
        })}

        {enabled && selected.size === 0 && (
          <Notice message="Selecione pelo menos um nível para receber alertas." />
        )}
      </Card>

      {/* Info card */}
      <Card>
        <View style={styles.infoRow}>
          <Icon source="information-outline" size={18} color={colors.muted} />
          <Text style={styles.infoText}>
            As notificações são exibidas enquanto o aplicativo está aberto ou em
 segundo plano. Para receber alertas com o app fechado seria necessário um
 serviço pago (Cloud Functions), fora do plano gratuito do Firebase.
          </Text>
        </View>
      </Card>

      {/* Save */}
      <Button
        title="Salvar configurações"
        loading={busy}
        disabled={!loaded || (enabled && selected.size === 0)}
        onPress={async () => {
          await onSave([...selected].sort((a, b) => a - b), enabled);
        }}
      />
    </AppShell>
  );
}

const styles = StyleSheet.create({
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  toggleMeta: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  iconWrap: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: colors.primarySoft,
    alignItems: 'center', justifyContent: 'center',
  },
  toggleTitle: { color: colors.ink, fontSize: 16, fontWeight: '700' },
  toggleSub: { color: colors.muted, fontSize: 12, lineHeight: 17, marginTop: 2 },

  sectionSub: { color: colors.muted, fontSize: 12, lineHeight: 17, marginTop: 2, marginBottom: 4 },

  presetRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 12, paddingHorizontal: 14,
    borderRadius: 14, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.background, gap: 10,
  },
  presetRowActive: {
    borderColor: colors.primary, backgroundColor: colors.primarySoft,
  },
  presetMeta: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  levelCircle: {
    width: 48, height: 48, borderRadius: 24,
    alignItems: 'center', justifyContent: 'center',
  },
  levelCircleText: { fontSize: 13, fontWeight: '700' },
  presetLabel: { color: colors.ink, fontSize: 14, fontWeight: '600' },
  presetDesc: { color: colors.muted, fontSize: 11, lineHeight: 15, marginTop: 1 },

  infoRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  infoText: { color: colors.muted, fontSize: 12, lineHeight: 18, flex: 1 },
});
