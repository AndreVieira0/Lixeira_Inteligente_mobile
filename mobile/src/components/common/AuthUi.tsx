import { useState, type ComponentProps, type ReactElement, type ReactNode } from 'react';
import { Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Button as PaperButton, Card as PaperCard, HelperText, TextInput as PaperInput } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

import brandIcon from '../../../assets/icons/logo-desenho.png';
import { colors } from '../../constants/theme';

export function Brand({ compact = false }: { compact?: boolean }): ReactElement {
  return <View style={styles.brand}>
    <View style={styles.brandMark} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Image source={brandIcon} style={styles.brandImage} resizeMode="contain" />
    </View>
    <View><Text style={styles.brandName}>Lixeira Inteligente</Text>{!compact && <Text style={styles.brandCaption}>CUIDAR COMEÇA COM UMA CONEXÃO</Text>}</View>
  </View>;
}

export function Page({ children, footer, showcase = false, compact = false }: { children: ReactNode; footer?: ReactNode; showcase?: boolean; compact?: boolean }): ReactElement {
  const wide = useWindowDimensions().width >= 1100 && showcase;
  return <SafeAreaView style={styles.safe}>
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
        <View style={[styles.pageLayout, wide && styles.wideLayout]}>
          {wide && <View style={styles.showcase}>
            <Text style={styles.showcaseEyebrow}>TECNOLOGIA A FAVOR DO AMBIENTE</Text>
            <Text style={styles.showcaseTitle}>Menos desperdício.{ '\n' }Mais cuidado.</Text>
            <Text style={styles.showcaseText}>Um jeito simples de acompanhar suas lixeiras e saber a hora certa de agir.</Text>
            <View style={styles.illustration} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
              <View style={styles.orbit} />
              <View style={styles.largeLid} />
              <View style={styles.largeBin}><View style={styles.binFill} /><View style={styles.largeBinLines}><View style={styles.largeBinLine} /><View style={styles.largeBinLine} /><View style={styles.largeBinLine} /></View></View>
              <View style={styles.floatingLevel}><Text style={styles.floatingPercent}>43%</Text><Text style={styles.floatingCaption}>Tudo sob controle</Text></View>
            </View>
            <View style={styles.showcaseFooter}><View style={styles.onlineDot} /><Text style={styles.showcaseText}>Conectando pequenos cuidados a grandes mudanças.</Text></View>
          </View>}
          <View style={styles.content}><Brand compact={compact} />{children}{footer}{!compact && <Text style={styles.bottomNote}>Mais cuidado com os espaços que compartilhamos.</Text>}</View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}

export function Heading({ eyebrow, title, subtitle }: { eyebrow?: string; title: string; subtitle?: string }): ReactElement {
  return <View style={styles.heading}>{eyebrow && <Text style={styles.eyebrow}>{eyebrow}</Text>}<Text accessibilityRole="header" style={styles.title}>{title}</Text>{subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}</View>;
}

export function Card({ children }: { children: ReactNode }): ReactElement {
  return <PaperCard mode="outlined" style={styles.card}><PaperCard.Content style={styles.cardContent}>{children}</PaperCard.Content></PaperCard>;
}

export function Field({ label, error, secret = false, ...props }: Omit<ComponentProps<typeof PaperInput>, 'label' | 'error' | 'right'> & { label: string; error?: string; secret?: boolean }): ReactElement {
  const [visible, setVisible] = useState(false);
  return <View>
    <PaperInput {...props} mode="outlined" label={label} accessibilityLabel={label} accessibilityHint={error}
      error={Boolean(error)} outlineColor={colors.border} activeOutlineColor={colors.primary}
      style={styles.input} outlineStyle={styles.inputOutline} secureTextEntry={secret && !visible}
      autoCapitalize={props.autoCapitalize ?? (secret ? 'none' : 'sentences')} autoCorrect={props.autoCorrect ?? !secret}
      right={secret ? <PaperInput.Icon icon={visible ? 'eye-off-outline' : 'eye-outline'}
        accessibilityLabel={visible ? `Ocultar ${label.toLowerCase()}` : `Mostrar ${label.toLowerCase()}`}
        onPress={() => { setVisible(!visible); }} /> : undefined} />
    {error && <HelperText type="error" accessibilityRole="alert" style={styles.fieldError}>{error}</HelperText>}
  </View>;
}

export function Button({ title, onPress, loading = false, disabled = false, variant = 'primary' }: {
  title: string; onPress: () => void | Promise<void>; loading?: boolean; disabled?: boolean; variant?: 'primary' | 'secondary' | 'danger';
}): ReactElement {
  return <PaperButton accessibilityLabel={title} accessibilityState={{ disabled: disabled || loading, busy: loading }}
    mode={variant === 'secondary' ? 'contained-tonal' : 'contained'} loading={loading} disabled={disabled || loading} onPress={onPress}
    buttonColor={variant === 'danger' ? colors.danger : undefined} contentStyle={styles.buttonContent} style={styles.button} labelStyle={styles.buttonText}>
    {loading ? 'Aguarde…' : title}
  </PaperButton>;
}

export function TextLink({ children, onPress, disabled }: { children: string; onPress: () => void; disabled?: boolean }): ReactElement {
  return <PaperButton mode="text" disabled={disabled} onPress={onPress} contentStyle={styles.textLink} labelStyle={styles.linkText}>{children}</PaperButton>;
}

export function Notice({ message, kind = 'error' }: { message: string | null; kind?: 'error' | 'success' }): ReactElement | null {
  if (!message) return null;
  return <View accessibilityLiveRegion="polite" accessibilityRole={kind === 'error' ? 'alert' : 'text'} style={[styles.notice, kind === 'success' && styles.success]}><Text style={[styles.noticeText, kind === 'success' && styles.successText]}>{message}</Text></View>;
}

export const uiStyles = StyleSheet.create({
  text: { color: colors.muted, fontSize: 14, lineHeight: 22 },
  strong: { color: colors.ink, fontSize: 18, fontWeight: '700' },
  section: { gap: 16 },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 6 },
  actions: { gap: 10, marginTop: 10 },
  centered: { alignItems: 'center', gap: 14, paddingVertical: 30 },
  demoLabel: { color: colors.primary, fontSize: 10, letterSpacing: 1, fontWeight: '700' },
});

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background }, flex: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 22, paddingVertical: 30 },
  content: { width: '100%', maxWidth: 460, alignSelf: 'center', gap: 22 },
  pageLayout: { width: '100%', alignItems: 'center' },
  wideLayout: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 64, maxWidth: 1140, alignSelf: 'center' },
  showcase: { flex: 1, minHeight: 740, maxWidth: 520, borderRadius: 32, padding: 40, backgroundColor: colors.ink, overflow: 'hidden', gap: 24 },
  showcaseEyebrow: { color: colors.accent, fontSize: 10, letterSpacing: 2, fontWeight: '700' },
  showcaseTitle: { color: colors.white, fontSize: 42, lineHeight: 50, fontWeight: '700', letterSpacing: -1.5 },
  showcaseText: { color: '#CADCD0', fontSize: 15, lineHeight: 25, flexShrink: 1 },
  illustration: { height: 300, justifyContent: 'center', alignItems: 'center', marginVertical: 12 },
  orbit: { position: 'absolute', width: 290, height: 290, borderRadius: 145, borderWidth: 1, borderColor: '#3C5D4E', backgroundColor: '#244837' },
  largeLid: { width: 146, height: 12, borderRadius: 6, backgroundColor: colors.accent, marginBottom: 10, transform: [{ rotate: '-7deg' }] },
  largeBin: { width: 122, height: 165, borderWidth: 3, borderColor: colors.accent, borderBottomLeftRadius: 26, borderBottomRightRadius: 26, overflow: 'hidden' },
  binFill: { position: 'absolute', bottom: 0, height: '43%', width: '100%', backgroundColor: '#678B55' },
  largeBinLines: { flexDirection: 'row', justifyContent: 'center', gap: 22, paddingTop: 28 },
  largeBinLine: { height: 105, width: 3, borderRadius: 3, backgroundColor: colors.accent },
  floatingLevel: { position: 'absolute', right: 0, bottom: 18, borderRadius: 17, backgroundColor: colors.accent, paddingHorizontal: 22, paddingVertical: 16, transform: [{ rotate: '-5deg' }] },
  floatingPercent: { color: colors.ink, fontSize: 32, fontWeight: '700' },
  floatingCaption: { color: colors.ink, fontSize: 11, marginTop: 3 },
  showcaseFooter: { flexDirection: 'row', gap: 10, alignItems: 'center', marginTop: 'auto' },
  onlineDot: { height: 8, width: 8, borderRadius: 4, backgroundColor: colors.accent },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  brandMark: { width: 48, height: 48, borderRadius: 14, backgroundColor: colors.white, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  brandImage: { width: 48, height: 48 },
  brandName: { color: colors.ink, fontSize: 18, fontWeight: '700' },
  brandCaption: { color: colors.muted, fontSize: 8, letterSpacing: 1.2, marginTop: 5 },
  heading: { gap: 10 }, eyebrow: { color: colors.primary, fontWeight: '700', fontSize: 11, letterSpacing: 2 },
  title: { color: colors.ink, fontSize: 34, lineHeight: 40, fontWeight: '700', letterSpacing: -1 },
  subtitle: { color: colors.muted, fontSize: 15, lineHeight: 23 },
  card: { borderRadius: 24, backgroundColor: colors.surface, borderColor: colors.border },
  cardContent: { padding: 20, gap: 18 },
  input: { backgroundColor: colors.surface, fontSize: 16 }, inputOutline: { borderRadius: 12 },
  fieldError: { paddingHorizontal: 0 },
  button: { borderRadius: 16 }, buttonContent: { minHeight: 54 },
  buttonText: { fontSize: 15, fontWeight: '700', letterSpacing: 0 },
  textLink: { minHeight: 44 },
  linkText: { color: colors.primary, fontSize: 13, fontWeight: '600', textAlign: 'center' },
  notice: { backgroundColor: colors.dangerSoft, padding: 14, borderRadius: 12 },
  noticeText: { color: colors.danger, fontSize: 13, lineHeight: 20 },
  success: { backgroundColor: colors.primarySoft }, successText: { color: colors.primary },
  bottomNote: { color: colors.muted, fontSize: 11, textAlign: 'center', lineHeight: 18, marginTop: 4 },
});
