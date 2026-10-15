import { useEffect, useState, type ReactElement, type ReactNode } from 'react';
import { AccessibilityInfo, Animated, Easing, Platform } from 'react-native';

/** A short entrance that never delays navigation or reduced-motion users. */
export function ScreenTransition({ children, fill = false }: { children: ReactNode; fill?: boolean }): ReactElement {
  const [progress] = useState(() => new Animated.Value(1));

  useEffect(() => {
    let active = true;
    let preferenceChanged = false;
    const show = (reduceMotion: boolean): void => {
      if (!active) return;
      progress.stopAnimation();
      if (reduceMotion) { progress.setValue(1); return; }
      progress.setValue(0);
      Animated.timing(progress, {
        toValue: 1, duration: 240, easing: Easing.out(Easing.cubic),
        useNativeDriver: Platform.OS !== 'web',
      }).start();
    };
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', (reduced) => {
      preferenceChanged = true;
      show(reduced);
    });
    void AccessibilityInfo.isReduceMotionEnabled().then((reduced) => {
      if (!preferenceChanged) show(reduced);
    }).catch(() => { /* Keep content visible when the preference is unavailable. */ });
    return () => { active = false; subscription.remove(); progress.stopAnimation(); };
  }, [progress]);

  return <Animated.View style={{ flex: fill ? 1 : undefined, opacity: progress, transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }] }}>{children}</Animated.View>;
}
