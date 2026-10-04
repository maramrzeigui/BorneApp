import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';

import { useTheme } from '@/hooks/use-theme';

type Props = {
  children: ReactNode;
  style?: ViewStyle;
};

/**
 * Surface bleu nuit signature (en-têtes, carte de recharge, wallet).
 * Un halo vert diffus en haut à droite évoque le courant sans surcharger.
 */
export function SurfaceEncre({ children, style }: Props) {
  const { c } = useTheme();

  return (
    <LinearGradient
      colors={[c.inkRaised, c.ink]}
      start={{ x: 1, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={[styles.surface, style]}>
      <View pointerEvents="none" style={styles.halo}>
        <Svg width={360} height={360}>
          <Defs>
            <RadialGradient id="halo" cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor={c.primary} stopOpacity={0.32} />
              <Stop offset="0.55" stopColor={c.primary} stopOpacity={0.08} />
              <Stop offset="1" stopColor={c.primary} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Circle cx={180} cy={180} r={180} fill="url(#halo)" />
        </Svg>
      </View>
      {children}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  surface: { overflow: 'hidden' },
  halo: { position: 'absolute', top: -190, right: -150 },
});
