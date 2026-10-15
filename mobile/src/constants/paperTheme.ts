import { MD3LightTheme, type MD3Theme } from 'react-native-paper';

import { colors } from './theme';

export const paperTheme: MD3Theme = {
  ...MD3LightTheme,
  roundness: 4,
  colors: {
    ...MD3LightTheme.colors,
    primary: colors.primary,
    onPrimary: colors.white,
    primaryContainer: colors.primarySoft,
    onPrimaryContainer: colors.ink,
    secondary: colors.primary,
    secondaryContainer: colors.primarySoft,
    onSecondaryContainer: colors.ink,
    background: colors.background,
    onBackground: colors.ink,
    surface: colors.surface,
    onSurface: colors.ink,
    surfaceVariant: colors.primarySoft,
    onSurfaceVariant: colors.muted,
    outline: colors.border,
    outlineVariant: colors.border,
    error: colors.danger,
    errorContainer: colors.dangerSoft,
    onErrorContainer: colors.danger,
    elevation: { ...MD3LightTheme.colors.elevation, level1: colors.surface, level2: colors.surface },
  },
};
