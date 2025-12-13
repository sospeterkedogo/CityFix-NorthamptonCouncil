import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { AuthProvider, useAuth } from '../src/context/AuthContext';
import { View, ActivityIndicator } from 'react-native';
import { COLORS } from '../src/constants/theme';

// Separate component to handle the "Traffic Cop" logic
function RootNavigation() {
  const { user, userRole, loading } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inProfile = segments[0] === 'profile';

    if (!user && !inAuthGroup) {
      // If not logged in, kick them to the Login page
      router.replace('/(auth)/login');
    } else if (user && userRole && !inProfile) {
      // If logged in, redirect based on Role (unless viewing profile)
      if (userRole === 'citizen' && segments[0] !== '(citizen)') {
        router.replace('/(citizen)/dashboard');
      } else if (userRole === 'dispatcher' && segments[0] !== '(dispatcher)') {
        router.replace('/(dispatcher)');
      } else if (userRole === 'engineer' && segments[0] !== '(engineer)') {
        router.replace('/(engineer)/dashboard');
      } else if (userRole === 'qa' && segments[0] !== '(qa)') {
        router.replace('/(qa)/dashboard');
      }
    }
  }, [user, userRole, loading, segments]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(citizen)" />
      <Stack.Screen name="(dispatcher)" />
      <Stack.Screen name="(engineer)" />
      <Stack.Screen name="(qa)" />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootNavigation />
    </AuthProvider>
  );
}