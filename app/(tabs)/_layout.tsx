import { Tabs } from 'expo-router';
import React from 'react';

import { BarreOnglets } from '@/components/barre-onglets';
import { useTheme } from '@/hooks/use-theme';

export default function TabLayout() {
  const { c } = useTheme();

  return (
    <Tabs
      tabBar={(props) => <BarreOnglets {...props} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: c.background } }}>
      <Tabs.Screen name="index" options={{ title: 'Accueil' }} />
      <Tabs.Screen name="carte" options={{ title: 'Carte' }} />
      <Tabs.Screen name="bornes" options={{ title: 'Bornes' }} />
      <Tabs.Screen name="sessions" options={{ title: 'Activité' }} />
      <Tabs.Screen name="profil" options={{ title: 'Compte' }} />
    </Tabs>
  );
}
