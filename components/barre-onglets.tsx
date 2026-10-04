import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import * as Haptics from 'expo-haptics';
import { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icone, type NomIcone } from '@/components/ui/icone';
import { Texte } from '@/components/ui/texte';
import { Rayons } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Icône pleine pour l'onglet actif, contour sinon. */
const ICONES: Record<string, { actif: NomIcone; inactif: NomIcone }> = {
  index: { actif: 'home-variant', inactif: 'home-variant-outline' },
  carte: { actif: 'map', inactif: 'map-outline' },
  bornes: { actif: 'ev-station', inactif: 'ev-station' },
  sessions: { actif: 'chart-box', inactif: 'chart-box-outline' },
  profil: { actif: 'account-circle', inactif: 'account-circle-outline' },
};

const LARGEUR_PASTILLE = 56;
const HAUTEUR_PASTILLE = 30;

/** Barre d'onglets : icône et libellé, pastille qui glisse derrière l'icône active. */
export function BarreOnglets({ state, descriptors, navigation }: BottomTabBarProps) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const [largeur, setLargeur] = useState(0);

  const cellule = largeur / state.routes.length;
  const position = useSharedValue(0);

  useEffect(() => {
    position.value = withSpring(state.index * cellule + (cellule - LARGEUR_PASTILLE) / 2, {
      damping: 18,
      stiffness: 180,
    });
  }, [state.index, cellule, position]);

  const pastille = useAnimatedStyle(() => ({ transform: [{ translateX: position.value }] }));

  return (
    <View
      style={[
        styles.barre,
        { backgroundColor: c.surface, borderTopColor: c.border, paddingBottom: Math.max(insets.bottom, 10) },
      ]}>
      <View style={styles.rangee} onLayout={(e) => setLargeur(e.nativeEvent.layout.width)}>
        {largeur > 0 && (
          <Animated.View style={[styles.pastille, { backgroundColor: c.primarySoft }, pastille]} />
        )}
        {state.routes.map((route, index) => {
          const actif = state.index === index;
          const titre = descriptors[route.key].options.title ?? route.name;
          const icones = ICONES[route.name];

          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityLabel={titre}
              accessibilityState={{ selected: actif }}
              style={styles.onglet}
              onPress={() => {
                if (Platform.OS === 'ios') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                const evenement = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                if (!actif && !evenement.defaultPrevented) navigation.navigate(route.name);
              }}>
              <View style={styles.zoneIcone}>
                {icones && (
                  <Icone
                    name={actif ? icones.actif : icones.inactif}
                    size={22}
                    color={actif ? 'primary' : 'textFaint'}
                  />
                )}
              </View>
              <Texte variant="captionStrong" color={actif ? 'primary' : 'textFaint'} style={styles.libelle}>
                {titre}
              </Texte>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  barre: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 8, paddingHorizontal: 8 },
  rangee: { flexDirection: 'row' },
  onglet: { flex: 1, alignItems: 'center', gap: 4 },
  zoneIcone: { height: HAUTEUR_PASTILLE, justifyContent: 'center' },
  libelle: { fontSize: 11, lineHeight: 14 },
  pastille: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: LARGEUR_PASTILLE,
    height: HAUTEUR_PASTILLE,
    borderRadius: Rayons.pill,
  },
});
