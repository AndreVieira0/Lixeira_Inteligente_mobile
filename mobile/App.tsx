import { StatusBar } from 'expo-status-bar';
import { type ReactElement } from 'react';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { demoMode } from './src/config/environment';
import { paperTheme } from './src/constants/paperTheme';
import { AuthProvider } from './src/contexts/AuthContext';
import { DemoNavigator } from './src/navigation/DemoNavigator';
import { RootNavigator } from './src/navigation/RootNavigator';

export default function App(): ReactElement {
  return (
    <SafeAreaProvider>
      <PaperProvider theme={paperTheme}>
        {demoMode ? <DemoNavigator /> : <AuthProvider><RootNavigator /></AuthProvider>}
        <StatusBar style="dark" />
      </PaperProvider>
    </SafeAreaProvider>
  );
}
