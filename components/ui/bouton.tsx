import { ActivityIndicator, Pressable, StyleSheet, View, type ViewStyle } from 'react-native';

import { Icone, type NomIcone } from '@/components/ui/icone';
import { Texte } from '@/components/ui/texte';
import { Rayons } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Variante = 'primaire' | 'secondaire' | 'fantome' | 'danger' | 'surEncre';

type Props = {
  /** Absent pour un bouton icône seule : fournir alors `accessibilityLabel`. */
  titre?: string;
  accessibilityLabel?: string;
  onPress?: () => void;
  variante?: Variante;
  icone?: NomIcone;
  chargement?: boolean;
  desactive?: boolean;
  taille?: 'normal' | 'compact';
  style?: ViewStyle;
};

export function Bouton({
  titre,
  onPress,
  variante = 'primaire',
  icone,
  chargement = false,
  desactive = false,
  taille = 'normal',
  style,
  accessibilityLabel,
}: Props) {
  const { c } = useTheme();

  const apparence = {
    primaire: { fond: c.primary, fondPresse: c.primaryPressed, texte: c.onPrimary, bord: c.primary },
    secondaire: { fond: c.surface, fondPresse: c.surfaceAlt, texte: c.text, bord: c.border },
    fantome: { fond: 'transparent', fondPresse: c.surfaceAlt, texte: c.primary, bord: 'transparent' },
    danger: { fond: c.surface, fondPresse: c.surfaceAlt, texte: c.danger, bord: c.border },
    surEncre: { fond: '#FFFFFF1A', fondPresse: '#FFFFFF2E', texte: c.onInk, bord: '#FFFFFF26' },
  }[variante];

  const inactif = desactive || chargement;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? titre}
      accessibilityState={{ disabled: inactif, busy: chargement }}
      disabled={inactif}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        taille === 'compact' ? styles.compact : styles.normal,
        {
          backgroundColor: pressed ? apparence.fondPresse : apparence.fond,
          borderColor: apparence.bord,
          opacity: desactive ? 0.45 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
        style,
      ]}>
      {chargement ? (
        <ActivityIndicator color={apparence.texte} />
      ) : (
        <View style={styles.contenu}>
          {icone && <Icone name={icone} size={taille === 'compact' ? 18 : 20} color={apparence.texte} />}
          {titre ? (
            <Texte variant={taille === 'compact' ? 'captionStrong' : 'bodyStrong'} color={apparence.texte}>
              {titre}
            </Texte>
          ) : null}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: Rayons.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  normal: { minHeight: 54, paddingHorizontal: 20 },
  compact: { minHeight: 40, paddingHorizontal: 14 },
  contenu: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
