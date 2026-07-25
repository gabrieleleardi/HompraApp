import React from 'react';
import { NavigationContainer }       from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator }   from '@react-navigation/bottom-tabs';
import { View, Text, Image, StyleSheet } from 'react-native';
import { COLORS }                    from '@/constants';
import { useAuth }                   from '@/context/AuthContext';
import { useCart }                   from '@/context/CartContext';
import { useI18n }                   from '@/i18n/I18nContext';
import TabIcon, { CartTabIcon }      from '@/components/TabIcon';

// Screens
import LoginScreen          from '@/screens/auth/LoginScreen';
import CatalogScreen        from '@/screens/catalog/CatalogScreen';
import ProductDetailScreen  from '@/screens/catalog/ProductDetailScreen';
import CartScreen           from '@/screens/cart/CartScreen';
import OrdersScreen         from '@/screens/orders/OrdersScreen';
import OrderDetailScreen    from '@/screens/orders/OrderDetailScreen';
import ProfileScreen        from '@/screens/profile/ProfileScreen';
import NotificationsScreen  from '@/screens/notifications/NotificationsScreen';

export type RootStackParamList = {
  Login:         undefined;
  Main:          undefined;
  ProductDetail: { productId: string; supplierId: string };
  OrderDetail:   { orderId: string };
  Notifications: undefined;
};

export type TabParamList = {
  Catalog: undefined;
  Cart:    undefined;
  Orders:  undefined;
  Profile: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab   = createBottomTabNavigator<TabParamList>();

function CartTabIconWithBadge({ color, size }: { color: string; size: number }) {
  const { totalItems } = useCart();
  return <CartTabIcon name="cart-outline" color={color} size={size} badge={totalItems} />;
}

function MainTabs() {
  const { t } = useI18n();
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor:   COLORS.accent,
        tabBarInactiveTintColor: COLORS.textSecondary,
        tabBarStyle: {
          backgroundColor: COLORS.surface,
          borderTopColor:  COLORS.border,
          paddingTop:      8,
          paddingBottom:   20,
          height:          88,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          marginTop: 4,
        },
        tabBarIconStyle: {
          marginBottom: 0,
        },
        headerStyle:      { backgroundColor: COLORS.surface },
        headerTintColor:  COLORS.primary,
        headerTitleStyle: { fontWeight: '700', color: COLORS.text },
      }}
    >
      <Tab.Screen
        name="Catalog"
        component={CatalogScreen}
        options={{
          tabBarIcon: ({ color, size }) => <TabIcon name="grid-outline" size={size} color={color} />,
          tabBarLabel: t('mobile.tabs.catalog', 'Catalogo'),
          // Il logo e il pulsante "I miei Fornitori" sono gestiti
          // dinamicamente da CatalogScreen via navigation.setOptions
          headerTitle: () => (
            <Image
              source={require('../../assets/logo-hompra.png')}
              style={{ width: 130, height: 36 }}
              resizeMode="contain"
            />
          ),
          // lascia spazio sufficiente a destra per il headerRight
          headerTitleAlign: 'left',
        }}
      />
      <Tab.Screen
        name="Cart"
        component={CartScreen}
        options={{
          title: t('mobile.tabs.cart', 'Carrello'),
          tabBarIcon: (props) => <CartTabIconWithBadge {...props} />,
        }}
      />
      <Tab.Screen
        name="Orders"
        component={OrdersScreen}
        options={{
          title: t('mobile.tabs.orders', 'Ordini'),
          tabBarIcon: ({ color, size }) => <TabIcon name="receipt-outline" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: t('mobile.tabs.profile', 'Profilo'),
          tabBarIcon: ({ color, size }) => <TabIcon name="person-outline" size={size} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { isLoggedIn, isLoading } = useAuth();

  if (isLoading) return null; // splash screen gestita da expo-splash-screen

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isLoggedIn ? (
          <>
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen
              name="ProductDetail"
              component={ProductDetailScreen}
              options={{ headerShown: true, title: 'Prodotto', headerBackTitle: '' }}
            />
            <Stack.Screen
              name="OrderDetail"
              component={OrderDetailScreen}
              options={{ headerShown: true, title: 'Dettaglio Ordine', headerBackTitle: '' }}
            />
            <Stack.Screen
              name="Notifications"
              component={NotificationsScreen}
              options={{ headerShown: true, title: 'Notifiche', headerBackTitle: '' }}
            />
          </>
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({});
