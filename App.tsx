import React from 'react';
import { StatusBar }          from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider }   from 'react-native-safe-area-context';
import Toast                  from 'react-native-toast-message';
import { AuthProvider }       from '@/context/AuthContext';
import { CartProvider }       from '@/context/CartContext';
import AppNavigator           from '@/navigation';

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <AuthProvider>
          <CartProvider>
            <AppNavigator />
          </CartProvider>
        </AuthProvider>
        <Toast />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
