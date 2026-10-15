import type { ReactElement } from 'react';
import { IconButton as PaperIconButton } from 'react-native-paper';

import { colors } from '../../constants/theme';

export function IconButton({ icon, label, onPress, primary = false }: {
  icon: 'profile' | 'add' | 'edit' | 'back'; label: string; onPress: () => void; primary?: boolean;
}): ReactElement {
  const names = { profile: 'account-circle-outline', add: 'plus', edit: 'pencil-outline', back: 'arrow-left' };
  return <PaperIconButton icon={names[icon]} accessibilityLabel={label} onPress={onPress}
    mode={primary ? 'contained' : 'contained-tonal'} size={24}
    iconColor={primary ? colors.white : colors.primary} containerColor={primary ? colors.primary : colors.primarySoft}
    style={{ margin: 0, width: 48, height: 48, borderRadius: 16 }} />;
}
