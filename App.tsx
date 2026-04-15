import React from 'react';
import { StatusBar }          from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider }   from 'react-native-safe-area-context';
import Toast                  from 'react-native-toast-message';
import { AuthProvider }       from '@/context/AuthContext';
import { CartProvider }       from '@/context/CartContext';
import { I18nProvider }       from '@/i18n/I18nContext';
import AppNavigator           from '@/navigation';

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <I18nProvider>
          <AuthProvider>
            <CartProvider>
              <AppNavigator />
            </CartProvider>
          </AuthProvider>
        </I18nProvider>
        <Toast />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
