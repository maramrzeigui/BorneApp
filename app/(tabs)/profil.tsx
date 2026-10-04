import { useFocusEffect } from 'expo-router';
import { Fragment, useCallback, useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Bouton } from '@/components/ui/bouton';
import { ChiffreAnime } from '@/components/ui/chiffre-anime';
import { SurfaceEncre } from '@/components/ui/surface-encre';
import { Texte } from '@/components/ui/texte';
import { Espace, Rayons } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useTheme } from '@/hooks/use-theme';
import * as api from '@/lib/api';
import { confirmer, informer } from '@/lib/dialogue';
import { ouvrirFacture } from '@/lib/factures';
import { formatPrix } from '@/lib/format';
import type { BadgeRfid, Facture, Role, Vehicule } from '@/types/domain';

const MONTANTS_RECHARGE = [10, 20, 50];

const LIBELLE_ROLE: Record<Role, string> = {
  super_admin: 'Administrateur',
  exploitant: 'Exploitant',
  operateur: 'Opérateur',
  technicien: 'Technicien',
  service_client: 'Service client',
  finance: 'Finance',
  client: 'Client',
};

function Groupe({ titre, children }: { titre: string; children: ReactNode[] }) {
  const { c } = useTheme();
  const lignes = children.filter(Boolean);
  return (
    <View style={styles.groupe}>
      <Texte variant="label" color="textMuted" style={{ marginLeft: 4 }}>
        {titre}
      </Texte>
      <View style={[styles.groupeCadre, { backgroundColor: c.surface, borderColor: c.border }]}>
        {lignes.length === 0 ? (
          <View style={styles.ligne}>
            <Texte variant="caption" color="textFaint">
              Rien pour le moment
            </Texte>
          </View>
        ) : (
          lignes.map((ligne, i) => (
            <Fragment key={i}>
              {i > 0 && <View style={[styles.filet, { backgroundColor: c.border }]} />}
              {ligne}
            </Fragment>
          ))
        )}
      </View>
    </View>
  );
}

function Ligne({
  titre,
  detail,
  droite,
  onPress,
}: {
  titre: string;
  detail?: string;
  droite?: ReactNode;
  onPress?: () => void;
}) {
  const { c } = useTheme();
  return (
    <Pressable
      disabled={!onPress}
      onPress={onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      style={({ pressed }) => [styles.ligne, pressed && { backgroundColor: c.surfaceAlt }]}>
      <View style={{ flex: 1, gap: 2 }}>
        <Texte variant="bodyStrong" numberOfLines={1}>
          {titre}
        </Texte>
        {detail && (
          <Texte variant="caption" color="textMuted" numberOfLines={1}>
            {detail}
          </Texte>
        )}
      </View>
      {droite}
    </Pressable>
  );
}

export default function CompteScreen() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { utilisateur, deconnexion, rafraichirProfil } = useAuth();

  const [vehicules, setVehicules] = useState<Vehicule[]>([]);
  const [badges, setBadges] = useState<BadgeRfid[]>([]);
  const [factures, setFactures] = useState<Facture[]>([]);
  const [rechargement, setRechargement] = useState<number | null>(null);
  const [telechargement, setTelechargement] = useState<number | null>(null);

  useFocusEffect(
    useCallback(() => {
      rafraichirProfil().catch(() => undefined);
      Promise.all([api.listeVehicules(), api.listeBadges(), api.listeFactures()])
        .then(([v, b, f]) => {
          setVehicules(v);
          setBadges(b);
          setFactures(f);
        })
        .catch(() => undefined);
    }, [rafraichirProfil])
  );

  const recharger = async (montant: number) => {
    setRechargement(montant);
    try {
      await api.rechargerWallet(montant);
      await rafraichirProfil();
    } catch (e) {
      informer('Rechargement impossible', e instanceof Error ? e.message : 'Réessayez dans un instant.');
    } finally {
      setRechargement(null);
    }
  };

  const telecharger = async (facture: Facture) => {
    setTelechargement(facture.id);
    try {
      await ouvrirFacture(facture);
    } catch (e) {
      informer('Téléchargement impossible', e instanceof Error ? e.message : 'Réessayez dans un instant.');
    } finally {
      setTelechargement(null);
    }
  };

  const seDeconnecter = async () => {
    const ok = await confirmer('Se déconnecter ?', 'Vous devrez saisir à nouveau vos identifiants.', {
      confirmer: 'Se déconnecter',
      destructif: true,
    });
    if (ok) await deconnexion();
  };

  const initiales = `${utilisateur?.prenom?.[0] ?? ''}${utilisateur?.nom?.[0] ?? ''}`;

  return (
    <ScrollView
      style={{ backgroundColor: c.background }}
      contentContainerStyle={[styles.contenu, { paddingTop: insets.top + Espace.lg }]}>
      <View style={styles.identite}>
        <View style={[styles.avatar, { backgroundColor: c.ink }]}>
          <Texte variant="heading" color="onInk">
            {initiales}
          </Texte>
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Texte variant="heading" numberOfLines={1}>
            {utilisateur?.prenom} {utilisateur?.nom}
          </Texte>
          <Texte variant="caption" color="textMuted" numberOfLines={1}>
            {utilisateur?.email}
          </Texte>
        </View>
        {utilisateur && (
          <View style={[styles.role, { backgroundColor: c.surfaceAlt }]}>
            <Texte variant="captionStrong" color="textMuted">
              {LIBELLE_ROLE[utilisateur.role]}
            </Texte>
          </View>
        )}
      </View>

      <Animated.View entering={FadeInDown.duration(450)}>
        <SurfaceEncre style={styles.wallet}>
          <View style={styles.walletHaut}>
            <Texte variant="label" color="onInkMuted">
              Wallet BorneApp
            </Texte>
            <Texte variant="label" color="primary">
              Paiement automatique
            </Texte>
          </View>
          <View>
            <Texte variant="caption" color="onInkMuted">
              Solde disponible
            </Texte>
            <View style={styles.solde}>
              <ChiffreAnime valeur={utilisateur?.soldeWallet} decimales={2} variant="numberLarge" color="onInk" />
              <Texte variant="heading" color="copper">
                DT
              </Texte>
            </View>
          </View>
          <View style={styles.walletActions}>
            {MONTANTS_RECHARGE.map((montant) => (
              <Bouton
                key={montant}
                titre={`+ ${montant} DT`}
                variante="surEncre"
                taille="compact"
                chargement={rechargement === montant}
                desactive={rechargement !== null && rechargement !== montant}
                onPress={() => recharger(montant)}
                style={{ flex: 1 }}
              />
            ))}
          </View>
          <Texte variant="caption" color="onInkMuted">
            Chaque recharge est débitée à l’arrêt de la session. Mode test : crédit immédiat, sans paiement réel.
          </Texte>
        </SurfaceEncre>
      </Animated.View>

      <Groupe titre="Mes véhicules">
        {vehicules.map((v) => (
          <Ligne
            key={v.id}
            titre={`${v.marque} ${v.modele}`}
            detail={`${v.typeConnecteur === 'Type2' ? 'Type 2' : v.typeConnecteur} · batterie ${v.capaciteBatterieKwh} kWh`}
            droite={
              <View style={[styles.plaque, { borderColor: c.border }]}>
                <Texte variant="captionStrong" style={styles.chiffres}>
                  {v.immatriculation}
                </Texte>
              </View>
            }
          />
        ))}
      </Groupe>

      <Groupe titre="Badges RFID">
        {badges.map((b) => (
          <Ligne
            key={b.id}
            titre={b.uid}
            detail={
              b.dateExpiration
                ? `Valable jusqu’au ${new Date(b.dateExpiration).toLocaleDateString('fr-FR')}`
                : 'Sans date d’expiration'
            }
            droite={
              <Texte variant="captionStrong" color={b.actif ? 'success' : 'danger'}>
                {b.actif ? 'Actif' : 'Bloqué'}
              </Texte>
            }
          />
        ))}
      </Groupe>

      <Groupe titre="Factures">
        {factures.map((f) => (
          <Ligne
            key={f.id}
            titre={f.numero}
            detail={new Date(f.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
            onPress={() => telecharger(f)}
            droite={
              telechargement === f.id ? (
                <ActivityIndicator size="small" color={c.primary} />
              ) : (
                <View style={{ alignItems: 'flex-end' }}>
                  <Texte variant="bodyStrong" style={styles.chiffres}>
                    {formatPrix(f.montantTtc)}
                  </Texte>
                  <Texte variant="captionStrong" color="primary">
                    PDF
                  </Texte>
                </View>
              )
            }
          />
        ))}
      </Groupe>

      <Bouton titre="Se déconnecter" variante="danger" onPress={seDeconnecter} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  contenu: { paddingHorizontal: Espace.xl, paddingBottom: Espace.xxxl, gap: Espace.xl },
  identite: { flexDirection: 'row', alignItems: 'center', gap: Espace.md },
  avatar: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  role: { borderRadius: Rayons.pill, paddingHorizontal: 10, height: 26, justifyContent: 'center' },
  wallet: { borderRadius: Rayons.xl, padding: Espace.xl, gap: Espace.lg },
  walletHaut: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  solde: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  walletActions: { flexDirection: 'row', gap: Espace.sm },
  groupe: { gap: Espace.sm },
  groupeCadre: { borderRadius: Rayons.lg, borderWidth: 1, overflow: 'hidden' },
  ligne: { flexDirection: 'row', alignItems: 'center', gap: Espace.md, paddingVertical: 14, paddingHorizontal: 16 },
  filet: { height: StyleSheet.hairlineWidth, marginLeft: 16 },
  plaque: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  chiffres: { fontVariant: ['tabular-nums'] },
});
