import React, { useState, useEffect } from 'react';
import { StatusBar }          from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider }   from 'react-native-safe-area-context';
import Toast                  from 'react-native-toast-message';
import * as Font              from 'expo-font';
import { AuthProvider }       from '@/context/AuthContext';
import { CartProvider }       from '@/context/CartContext';
import { NotificationsProvider } from '@/context/NotificationsContext';
import { I18nProvider }       from '@/i18n/I18nContext';
import AppNavigator           from '@/navigation';

export default function App() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Carica Ionicons con ENTRAMBI i nomi (maiuscolo e minuscolo)
    // per coprire sia l'uso diretto (TabIcon con 'Ionicons')
    // sia eventuali usi di @expo/vector-icons ('ionicons')
    Font.loadAsync({
      Ionicons: require('@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Ionicons.ttf'),
      ionicons: require('@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Ionicons.ttf'),
    })
      .then(() => setReady(true))
      .catch((err) => {
        console.warn('Font load failed:', err);
        setReady(true); // render comunque, il fallback mostra iniziali
      });
  }, []);

  if (!ready) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" color="#2a7fc1" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <I18nProvider>
          <AuthProvider>
            <NotificationsProvider>
              <CartProvider>
                <AppNavigator />
              </CartProvider>
            </NotificationsProvider>
          </AuthProvider>
        </I18nProvider>
        <Toast />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
