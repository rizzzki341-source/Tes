import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  // Change before the first store release if you own a domain: the id cannot change afterwards.
  appId: 'io.github.rizzzki341_source.myanime',
  appName: 'myanime',
  webDir: 'dist',
  backgroundColor: '#0e1116',
  android: {
    // The YouTube embedded player needs an http(s) referrer, so keep the default https scheme.
    allowMixedContent: false,
  },
  plugins: {
    // Dark interface: ask for light status bar icons. Insets arrive through env(safe-area-inset-*).
    SystemBars: {
      insetsHandling: 'css',
      style: 'DARK',
    },
    LocalNotifications: {
      smallIcon: 'ic_stat_episode',
      iconColor: '#3ddc97',
    },
  },
};

export default config;
