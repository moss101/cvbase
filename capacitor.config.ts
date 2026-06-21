import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.cvbase.app',
  appName: 'CVBase',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
