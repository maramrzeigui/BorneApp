import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SurfaceEncre } from '@/components/ui/surface-encre';
import { Texte } from '@/components/ui/texte';
import { Espace, Rayons } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  titre: string;
  sousTitre: string;
  retour?: boolean;
  children: ReactNode;
};

/** Mise en page des écrans d'authentification : marque sur fond nuit, formulaire sur feuille. */
export function AuthLayout({ titre, sousTitre, retour = false, children }: Props) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: c.ink }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        bounces={false}>
        <SurfaceEncre style={{ ...styles.hero, paddingTop: insets.top + Espace.lg }}>
          {retour ? (
            <Pressable accessibilityRole="button" onPress={() => router.back()} hitSlop={10} style={styles.retour}>
              <Texte variant="bodyStrong" color="onInkMuted">
                Retour
              </Texte>
            </Pressable>
          ) : (
            <View style={styles.marque}>
              <Texte variant="heading" color="onInk">
                borne
              </Texte>
              <View style={[styles.point, { backgroundColor: c.primary }]} />
              <Texte variant="heading" color="primary">
                app
              </Texte>
            </View>
          )}
          <View style={styles.accroche}>
            <Texte variant="display" color="onInk">
              {titre}
            </Texte>
            <Texte variant="body" color="onInkMuted">
              {sousTitre}
            </Texte>
          </View>
        </SurfaceEncre>

        <View
          style={[
            styles.feuille,
            { backgroundColor: c.background, paddingBottom: insets.bottom + Espace.xl },
          ]}>
          {children}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  hero: { paddingHorizontal: Espace.xl, paddingBottom: 56, gap: Espace.xxl },
  marque: { flexDirection: 'row', alignItems: 'center', gap: 5, height: 44 },
  point: { width: 7, height: 7, borderRadius: 4, marginTop: 4 },
  retour: { height: 44, justifyContent: 'center', alignSelf: 'flex-start' },
  accroche: { gap: Espace.sm },
  feuille: {
    flexGrow: 1,
    marginTop: -Espace.xxl,
    borderTopLeftRadius: Rayons.xl,
    borderTopRightRadius: Rayons.xl,
    paddingHorizontal: Espace.xl,
    paddingTop: Espace.xxl,
    gap: Espace.lg,
  },
});
