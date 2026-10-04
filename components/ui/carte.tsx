import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';

import { Rayons } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  children: ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
  accessibilityLabel?: string;
};

/** Surface blanche (ou bleu nuit en thème sombre) à bord fin et ombre douce. */
export function Carte({ children, onPress, style, accessibilityLabel }: Props) {
  const { c, scheme } = useTheme();

  const base = [
    styles.carte,
    {
      backgroundColor: c.surface,
      borderColor: c.border,
      shadowOpacity: scheme === 'dark' ? 0 : 0.05,
    },
    style,
  ];

  if (!onPress) return <View style={base}>{children}</View>;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [...base, pressed && { transform: [{ scale: 0.985 }], opacity: 0.92 }]}>
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  carte: {
    borderRadius: Rayons.lg,
    borderWidth: 1,
    padding: 16,
    shadowColor: '#0B1B2E',
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 16,
    elevation: 1,
  },
});
