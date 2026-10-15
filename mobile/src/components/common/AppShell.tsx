import type { ReactElement, ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Surface } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '../../constants/theme';

import { Brand } from './AuthUi';
import { IconButton } from './IconButton';

export function AppShell({ title, subtitle, onBack, onAccount, onAdd, children }: {
  title: string; subtitle?: string; onBack?: () => void; onAccount?: () => void; onAdd?: () => void; children: ReactNode;
}): ReactElement {
  return <SafeAreaView style={s.root}>
    <Surface elevation={0} style={s.header}><View style={s.top}><Brand compact />{onAccount && <IconButton icon="profile" label="Abrir perfil" onPress={onAccount} />}</View></Surface>
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
        <View style={s.titleRow}>
          {onBack && <IconButton icon="back" label="Voltar" onPress={onBack} />}
          <View style={s.heading}><Text accessibilityRole="header" style={s.title}>{title}</Text>{subtitle && <Text style={s.subtitle}>{subtitle}</Text>}</View>
          {onAdd && <IconButton icon="add" label="Adicionar lixeira" onPress={onAdd} primary />}
        </View>
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}

export const appStyles = StyleSheet.create({
  section: { gap: 16 }, row: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, alignItems: 'center' },
  text: { color: colors.muted, fontSize: 15, lineHeight: 23 },
  title: { color: colors.ink, fontSize: 21, fontWeight: '700' },
  label: { color: colors.muted, fontSize: 12, letterSpacing: 1 },
  value: { color: colors.ink, fontSize: 56, fontWeight: '700' },
  track: { height: 12, backgroundColor: colors.primarySoft, borderRadius: 6, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 6, backgroundColor: colors.primary },
  panel: { backgroundColor: colors.primarySoft, borderRadius: 20, padding: 20, gap: 8 },
});

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { width: '100%', maxWidth: 720, alignSelf: 'center', padding: 20, paddingBottom: 32, gap: 20, flexGrow: 1 },
  header: { backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  top: { width: '100%', maxWidth: 720, alignSelf: 'center', paddingHorizontal: 20, paddingVertical: 12, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 2 },
  heading: { flex: 1, gap: 6 },
  title: { color: colors.ink, fontSize: 22, fontWeight: '700', letterSpacing: -0.4 },
  subtitle: { color: colors.muted, fontSize: 15, lineHeight: 23 },
});
