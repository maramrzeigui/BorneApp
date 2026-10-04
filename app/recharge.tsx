import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AnneauCharge } from '@/components/ui/anneau-charge';
import { Bouton } from '@/components/ui/bouton';
import { ChiffreAnime } from '@/components/ui/chiffre-anime';
import { CourbePuissance } from '@/components/ui/courbe-puissance';
import { PointDirect } from '@/components/ui/point-direct';
import { Texte } from '@/components/ui/texte';
import { Colors, Espace, Rayons } from '@/constants/theme';
import * as api from '@/lib/api';
import { confirmer, informer } from '@/lib/dialogue';
import { finEstimee } from '@/lib/estimation';
import { formatDuree, formatHeure, minutesDepuis } from '@/lib/format';
import type { Mesure, SessionRecharge, Vehicule } from '@/types/domain';

const OBJECTIFS = [80, 90, 100];
// Écran immersif : toujours sur fond nuit, quel que soit le thème.
const c = Colors.dark;

export default function RechargeScreen() {
  const insets = useSafeAreaInsets();
  const [session, setSession] = useState<SessionRecharge | null>(null);
  const [mesures, setMesures] = useState<Mesure[]>([]);
  const [vehicule, setVehicule] = useState<Vehicule | null>(null);
  const [objectif, setObjectif] = useState(80);
  const [terminee, setTerminee] = useState<SessionRecharge | null>(null);
  const [arret, setArret] = useState(false);

  const charger = useCallback(async () => {
    const s = await api.sessionActive();
    setSession((avant) => {
      if (avant && !s) setTerminee(avant);
      return s;
    });
    if (s) setMesures(await api.mesuresSession(s.id));
  }, []);

  useFocusEffect(
    useCallback(() => {
      charger().catch(() => undefined);
      api
        .listeVehicules()
        .then((v) => setVehicule(v[0] ?? null))
        .catch(() => undefined);
      const timer = setInterval(() => charger().catch(() => undefined), 5000);
      return () => clearInterval(timer);
    }, [charger])
  );

  const arreter = async () => {
    if (!session) return;
    const ok = await confirmer(
      'Arrêter la recharge ?',
      `La session sur ${session.borneNom} sera terminée et facturée sur votre wallet.`,
      { confirmer: 'Arrêter', annuler: 'Continuer', destructif: true }
    );
    if (!ok) return;
    setArret(true);
    try {
      const finale = await api.arreterSession(session.id);
      setTerminee(finale);
      setSession(null);
    } catch (e) {
      informer('Arrêt impossible', e instanceof Error ? e.message : 'Réessayez dans un instant.');
    } finally {
      setArret(false);
    }
  };

  const batterie = session?.pourcentageBatterie ?? null;
  const fin =
    session && batterie != null
      ? finEstimee({
          batterie,
          objectif,
          capaciteKwh: vehicule?.capaciteBatterieKwh ?? 60,
          puissanceKw: session.puissanceInstantaneeKw,
        })
      : null;

  return (
    <View style={[styles.ecran, { backgroundColor: c.ink }]}>
      <ScrollView contentContainerStyle={[styles.contenu, { paddingTop: insets.top + Espace.sm, paddingBottom: insets.bottom + Espace.xl }]}>
        <View style={styles.barre}>
          <Pressable accessibilityRole="button" onPress={() => router.back()} hitSlop={10}>
            <Texte variant="bodyStrong" color={c.onInkMuted}>
              Fermer
            </Texte>
          </Pressable>
          {session && (
            <View style={styles.enDirect}>
              <PointDirect couleur={c.primary} />
              <Texte variant="label" color={c.primary}>
                En direct
              </Texte>
            </View>
          )}
        </View>

        {session ? (
          <>
            <Animated.View entering={FadeIn.duration(500)} style={styles.titre}>
              <Texte variant="caption" color={c.onInkMuted}>
                {session.typeConnecteur === 'Type2' ? 'Type 2' : session.typeConnecteur} · depuis{' '}
                {formatDuree(minutesDepuis(session.dateDebut))}
              </Texte>
              <Texte variant="heading" color={c.onInk} align="center">
                {session.borneNom}
              </Texte>
            </Animated.View>

            <Animated.View entering={FadeIn.delay(150).duration(700)} style={styles.anneau}>
              <AnneauCharge
                valeur={batterie ?? Math.min(100, session.energieKwh * 2)}
                taille={250}
                epaisseur={16}
                couleurDebut={c.primary}
                couleurFin="#8FF5D2"
                couleurPiste="#FFFFFF12"
                flux>
                <View style={styles.centre}>
                  <View style={styles.pourcent}>
                    <ChiffreAnime
                      valeur={batterie ?? session.energieKwh}
                      decimales={batterie != null ? 0 : 1}
                      variant="display"
                      color={c.onInk}
                    />
                    <Texte variant="heading" color={c.onInkMuted}>
                      {batterie != null ? '%' : 'kWh'}
                    </Texte>
                  </View>
                  <Texte variant="caption" color={c.onInkMuted}>
                    {fin ? `${objectif} % vers ${formatHeure(fin.toISOString())}` : 'batterie'}
                  </Texte>
                </View>
              </AnneauCharge>
            </Animated.View>

            <View style={styles.objectifs}>
              <Texte variant="label" color={c.onInkMuted}>
                Objectif
              </Texte>
              <View style={styles.choix}>
                {OBJECTIFS.map((o) => (
                  <Pressable
                    key={o}
                    accessibilityRole="button"
                    accessibilityState={{ selected: o === objectif }}
                    onPress={() => setObjectif(o)}
                    style={[
                      styles.choixBouton,
                      {
                        backgroundColor: o === objectif ? c.primary : '#FFFFFF0F',
                        borderColor: o === objectif ? c.primary : '#FFFFFF1F',
                      },
                    ]}>
                    <Texte variant="captionStrong" color={o === objectif ? c.onPrimary : c.onInk}>
                      {o} %
                    </Texte>
                  </Pressable>
                ))}
              </View>
            </View>

            <Animated.View entering={FadeInDown.delay(250).duration(500)} style={[styles.grille, { borderColor: '#FFFFFF14' }]}>
              {[
                { libelle: 'Puissance', valeur: session.puissanceInstantaneeKw, dec: 0, unite: 'kW' },
                { libelle: 'Énergie', valeur: session.energieKwh, dec: 1, unite: 'kWh' },
                { libelle: 'Coût', valeur: session.prix, dec: 2, unite: 'DT' },
              ].map((m) => (
                <View key={m.libelle} style={styles.cellule}>
                  <View style={styles.pourcent}>
                    <ChiffreAnime valeur={m.valeur} decimales={m.dec} color={m.libelle === 'Coût' ? c.copper : c.onInk} />
                    <Texte variant="captionStrong" color={c.onInkMuted}>
                      {m.unite}
                    </Texte>
                  </View>
                  <Texte variant="label" color={c.onInkMuted}>
                    {m.libelle}
                  </Texte>
                </View>
              ))}
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(350).duration(500)} style={[styles.courbe, { backgroundColor: '#FFFFFF08', borderColor: '#FFFFFF14' }]}>
              <View style={styles.courbeEntete}>
                <Texte variant="subheading" color={c.onInk}>
                  Puissance délivrée
                </Texte>
                <Texte variant="caption" color={c.onInkMuted}>
                  mesures de la borne
                </Texte>
              </View>
              <CourbePuissance
                mesures={mesures}
                couleur={c.primary}
                couleurGrille="#FFFFFF14"
                couleurTexte={c.onInkMuted}
                enDirect
              />
            </Animated.View>

            <Bouton titre="Arrêter la recharge" variante="surEncre" chargement={arret} onPress={arreter} />
          </>
        ) : terminee ? (
          <Animated.View entering={FadeInDown.duration(500)} style={styles.resume}>
            <Texte variant="label" color={c.primary}>
              Recharge terminée
            </Texte>
            <Texte variant="title" color={c.onInk} align="center">
              {terminee.borneNom}
            </Texte>
            <View style={[styles.grille, { borderColor: '#FFFFFF14' }]}>
              <View style={styles.cellule}>
                <ChiffreAnime valeur={terminee.energieKwh} decimales={1} color={c.onInk} suffixe=" kWh" />
                <Texte variant="label" color={c.onInkMuted}>Énergie</Texte>
              </View>
              <View style={styles.cellule}>
                <ChiffreAnime valeur={terminee.prix} decimales={2} color={c.copper} suffixe=" DT" />
                <Texte variant="label" color={c.onInkMuted}>Facturé</Texte>
              </View>
            </View>
            <Texte variant="caption" color={c.onInkMuted} align="center">
              Le montant a été débité de votre wallet. La facture est disponible dans votre compte.
            </Texte>
            <Bouton titre="Terminer" onPress={() => router.back()} style={{ alignSelf: 'stretch' }} />
          </Animated.View>
        ) : (
          <View style={styles.resume}>
            <Texte variant="heading" color={c.onInk}>
              Aucune recharge en cours
            </Texte>
            <Bouton titre="Trouver une borne" onPress={() => router.replace('/carte')} style={{ alignSelf: 'stretch' }} />
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  ecran: { flex: 1 },
  contenu: { paddingHorizontal: Espace.xl, gap: Espace.xl },
  barre: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', height: 44 },
  enDirect: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  titre: { alignItems: 'center', gap: 4 },
  anneau: { alignItems: 'center' },
  centre: { alignItems: 'center', gap: 2 },
  pourcent: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  objectifs: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  choix: { flexDirection: 'row', gap: 8 },
  choixBouton: { borderWidth: 1, borderRadius: Rayons.pill, paddingHorizontal: 16, height: 36, justifyContent: 'center' },
  grille: { flexDirection: 'row', borderTopWidth: 1, borderBottomWidth: 1, paddingVertical: Espace.lg },
  cellule: { flex: 1, alignItems: 'center', gap: 4 },
  courbe: { borderWidth: 1, borderRadius: Rayons.lg, padding: Espace.lg, gap: Espace.md },
  courbeEntete: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  resume: { alignItems: 'center', gap: Espace.lg, paddingTop: Espace.xxxl },
});
