import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'in.rebelcraves.app',
  appName: 'RebelCraves',
  webDir: 'dist',
  server: {
    url: 'https://rebelcraves.in',
    cleartext: false,
    androidScheme: 'https',
    allowNavigation: [
      'rebelcraves.in',
      '*.rebelcraves.in'
    ]
  }
};

export default config;