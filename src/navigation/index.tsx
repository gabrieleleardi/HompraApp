import React from 'react';
import { NavigationContainer }       from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator }   from '@react-navigation/bottom-tabs';
import { Ionicons }                  from '@expo/vector-icons';
import { View, Text, Image, StyleSheet } from 'react-native';
import { COLORS }                    from '@/constants';
import { useAuth }                   from '@/context/AuthContext';
import { useCart }                   from '@/context/CartContext';

// Screens
import LoginScreen          from '@/screens/auth/LoginScreen';
import CatalogScreen        from '@/screens/catalog/CatalogScreen';
import ProductDetailScreen  from '@/screens/catalog/ProductDetailScreen';
import CartScreen           from '@/screens/cart/CartScreen';
import OrdersScreen         from '@/screens/orders/OrdersScreen';
import OrderDetailScreen    from '@/screens/orders/OrderDetailScreen';
import ProfileScreen        from '@/screens/profile/ProfileScreen';

export type RootStackParamList = {
  Login:         undefined;
  Main:          undefined;
  ProductDetail: { productId: string; supplierId: string };
  OrderDetail:   { orderId: string };
};

export type TabParamList = {
  Catalog: undefined;
  Cart:    undefined;
  Orders:  undefined;
  Profile: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab   = createBottomTabNavigator<TabParamList>();

function CartTabIcon({ color, size }: { color: string; size: number }) {
  const { totalItems } = useCart();
  return (
    <View>
      <Ionicons name="cart-outline" size={size} color={color} />
      {totalItems > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{totalItems > 99 ? '99+' : totalItems}</Text>
        </View>
      )}
    </View>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor:   COLORS.accent,
        tabBarInactiveTintColor: COLORS.textSecondary,
        tabBarStyle: {
          backgroundColor: COLORS.surface,
          borderTopColor:  COLORS.border,
          paddingBottom:   12,
          paddingTop:      6,
          height:          82,
        },
        tabBarLabelStyle: {
          marginTop: -8,
          fontSize:  11,
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
          tabBarIcon: ({ color, size }) => <Ionicons name="grid-outline" size={size} color={color} />,
          tabBarLabel: 'Catalogo',
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
          title: 'Carrello',
          tabBarIcon: (props) => <CartTabIcon {...props} />,
        }}
      />
      <Tab.Screen
        name="Orders"
        component={OrdersScreen}
        options={{
          title: 'Ordini',
          tabBarIcon: ({ color, size }) => <Ionicons name="receipt-outline" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: 'Profilo',
          tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" size={size} color={color} />,
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
          </>
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  badge: {
    position:        'absolute',
    right:           -6,
    top:             -4,
    backgroundColor: COLORS.error,
    borderRadius:    8,
    minWidth:        16,
    height:          16,
    justifyContent:  'center',
    alignItems:      'center',
    paddingHorizontal: 2,
  },
  badgeText: {
    color:    COLORS.white,
    fontSize: 9,
    fontWeight: '700',
  },
});
