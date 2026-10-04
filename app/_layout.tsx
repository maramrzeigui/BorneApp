import {
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
} from '@expo-google-fonts/manrope';
import { Sora_600SemiBold, Sora_700Bold, Sora_800ExtraBold } from '@expo-google-fonts/sora';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';

import { Polices } from '@/constants/theme';
import { AuthProvider, useAuth } from '@/contexts/auth-context';
import { useTheme } from '@/hooks/use-theme';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

export const unstable_settings = {
  anchor: '(tabs)',
};

function RootNavigator() {
  const { utilisateur, chargement } = useAuth();
  const { c } = useTheme();

  if (chargement) return null;

  return (
    <Stack
      screenOptions={{
        contentStyle: { backgroundColor: c.background },
        headerTitleStyle: { fontFamily: Polices.display, color: c.text },
        headerTintColor: c.text,
        headerShadowVisible: false,
        headerStyle: { backgroundColor: c.background },
      }}>
      <Stack.Protected guard={!!utilisateur}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="borne/[id]"
          options={{ headerShown: false, animation: 'slide_from_right' }}
        />
        <Stack.Screen name="recharge" options={{ headerShown: false, animation: 'slide_from_bottom' }} />
        <Stack.Screen
          name="session/[id]"
          options={{ headerShown: false, animation: 'slide_from_right' }}
        />
      </Stack.Protected>
      <Stack.Protected guard={!utilisateur}>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      </Stack.Protected>
    </Stack>
  );
}

function Chargeur() {
  const { chargement } = useAuth();
  const [policesPretes, erreurPolices] = useFonts({
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Sora_600SemiBold,
    Sora_700Bold,
    Sora_800ExtraBold,
  });

  const pret = (policesPretes || !!erreurPolices) && !chargement;

  useEffect(() => {
    if (pret) SplashScreen.hideAsync().catch(() => undefined);
  }, [pret]);

  if (!pret) return null;
  return <RootNavigator />;
}

export default function RootLayout() {
  const { c, scheme } = useTheme();
  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;

  return (
    <ThemeProvider
      value={{
        ...base,
        colors: {
          ...base.colors,
          primary: c.primary,
          background: c.background,
          card: c.surface,
          text: c.text,
          border: c.border,
        },
      }}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <AuthProvider>
          <Chargeur />
        </AuthProvider>
        <StatusBar style="auto" />
      </GestureHandlerRootView>
    </ThemeProvider>
  );
}
