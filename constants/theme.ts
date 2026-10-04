/**
 * Système visuel BorneApp.
 * - « ink » : bleu nuit des en-têtes (identique dans les deux thèmes, c'est la signature).
 * - « primary » : vert électrique, réservé aux actions et à l'énergie.
 * - « copper » : cuivre des câbles, réservé aux prix et au wallet.
 * Les couleurs sémantiques (success/warning/danger) ne servent qu'aux états.
 */

export const Colors = {
  light: {
    background: '#F3F5F8',
    surface: '#FFFFFF',
    surfaceAlt: '#EBEFF4',
    text: '#0B1623',
    textMuted: '#5A697C',
    textFaint: '#8B98A8',
    border: '#E1E6ED',

    primary: '#0E9F76',
    primaryPressed: '#0A8363',
    primarySoft: '#E1F4EC',
    onPrimary: '#FFFFFF',

    ink: '#0B1B2E',
    inkRaised: '#15304D',
    onInk: '#F2F6FA',
    onInkMuted: '#9CB0C7',

    copper: '#BF6128',
    copperSoft: '#FBEDE3',

    success: '#12A150',
    warning: '#C98309',
    danger: '#D64545',
    info: '#2F6FDB',
    neutral: '#7A8797',

    // Compatibilité avec les composants du template Expo
    tint: '#0E9F76',
    icon: '#5A697C',
    muted: '#5A697C',
    card: '#FFFFFF',
    tabIconDefault: '#8B98A8',
    tabIconSelected: '#0E9F76',
  },
  dark: {
    background: '#060E18',
    surface: '#0D1826',
    surfaceAlt: '#132234',
    text: '#EAF0F6',
    textMuted: '#93A3B8',
    textFaint: '#63758B',
    border: '#1B2B40',

    primary: '#2BD4A0',
    primaryPressed: '#21B98A',
    primarySoft: '#0E2B25',
    onPrimary: '#03140E',

    ink: '#0B1B2E',
    inkRaised: '#15304D',
    onInk: '#F2F6FA',
    onInkMuted: '#9CB0C7',

    copper: '#F0955A',
    copperSoft: '#2C1A0F',

    success: '#3DDC84',
    warning: '#F5B83D',
    danger: '#FF6B6B',
    info: '#6FA3FF',
    neutral: '#8A99AB',

    tint: '#2BD4A0',
    icon: '#93A3B8',
    muted: '#93A3B8',
    card: '#0D1826',
    tabIconDefault: '#63758B',
    tabIconSelected: '#2BD4A0',
  },
};

export type Palette = (typeof Colors)['light'];
export type CouleurSemantique = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'primary';

/** Familles chargées dans app/_layout.tsx. Pas de fontWeight avec ces polices (Android l'ignore). */
export const Polices = {
  display: 'Sora_700Bold',
  displayHeavy: 'Sora_800ExtraBold',
  displaySemi: 'Sora_600SemiBold',
  body: 'Manrope_500Medium',
  bodyRegular: 'Manrope_400Regular',
  bodySemi: 'Manrope_600SemiBold',
  bodyBold: 'Manrope_700Bold',
};

export const Rayons = { sm: 10, md: 14, lg: 20, xl: 28, pill: 999 };

export const Espace = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28, xxxl: 40 };

export const EtatBorneCouleurs: Record<string, { label: string; couleur: CouleurSemantique }> = {
  disponible: { label: 'Disponible', couleur: 'success' },
  occupee: { label: 'En charge', couleur: 'info' },
  hors_service: { label: 'Hors service', couleur: 'danger' },
  maintenance: { label: 'Maintenance', couleur: 'warning' },
  deconnectee: { label: 'Hors ligne', couleur: 'neutral' },
  defaut: { label: 'En défaut', couleur: 'danger' },
  inconnu: { label: 'Borne publique', couleur: 'neutral' },
};
