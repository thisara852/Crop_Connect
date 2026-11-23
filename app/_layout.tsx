import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { ThemeProvider, useTheme } from '@/src/contexts/ThemeContext';
import { AuthProvider } from '@/src/contexts/AuthContext';
import { LocalizationProvider } from '@/src/contexts/LocalizationContext';

export {
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  initialRouteName: 'index',
};

// Prevent splash screen from auto-hiding on native platforms before asset loading is complete
if (Platform.OS !== 'web') {
  SplashScreen.preventAutoHideAsync().catch(() => {});
}

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (error) {
      console.warn('Font load error:', error);
    }
  }, [error]);

  useEffect(() => {
    if (loaded && Platform.OS !== 'web') {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [loaded]);

  // On web, render immediately even while fonts stream in to avoid blank screens
  if (!loaded && Platform.OS !== 'web') {
    return null;
  }

  return (
    <ThemeProvider>
      <LocalizationProvider>
        <AuthProvider>
          <RootLayoutNav />
        </AuthProvider>
      </LocalizationProvider>
    </ThemeProvider>
  );
}

function RootLayoutNav() {
  const { isDark } = useTheme();

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: {
            backgroundColor: isDark ? '#121815' : '#F8F7F0',
          },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="welcome" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="register" options={{ headerShown: false }} />
        <Stack.Screen name="forgot-password" options={{ headerShown: false }} />
        <Stack.Screen name="role-selection" options={{ headerShown: false }} />
        <Stack.Screen name="(farmer)" options={{ headerShown: false }} />
        <Stack.Screen name="(buyer)" options={{ headerShown: false }} />
        <Stack.Screen name="(admin)" options={{ headerShown: false }} />
        <Stack.Screen name="crop/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="buyer/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="nearby-buyers" options={{ headerShown: false }} />
        <Stack.Screen name="map-view" options={{ headerShown: false }} />
        <Stack.Screen name="ai-prediction" options={{ headerShown: false }} />
        <Stack.Screen name="price-comparison" options={{ headerShown: false }} />
        <Stack.Screen name="price-history" options={{ headerShown: false }} />
        <Stack.Screen name="notifications" options={{ headerShown: false }} />
        <Stack.Screen name="settings" options={{ headerShown: false }} />
        <Stack.Screen name="help" options={{ headerShown: false }} />
        <Stack.Screen name="edit-profile" options={{ headerShown: false }} />
        <Stack.Screen
          name="modal"
          options={{
            presentation: 'modal',
            headerShown: false,
          }}
        />
      </Stack>
    </>
  );
}
