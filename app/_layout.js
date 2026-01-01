import { useEffect } from 'react';
import { View, ActivityIndicator, Platform } from 'react-native';
import { Stack, useRouter, useSegments, usePathname } from 'expo-router';
import { AuthProvider, useAuth } from '../src/context/AuthContext';
import { NotificationProvider } from '../src/context/NotificationContext';
import { COLORS } from '../src/constants/theme';

// --- Configuration ---
const ROLE_PATHS = {
  citizen: '/(citizen)', // Default to Index (Feed)
  dispatcher: '/(dispatcher)',
  engineer: '/(engineer)/dashboard',
  qa: '/(qa)/dashboard',
};

const PUBLIC_GROUPS = ['(auth)', 'onboarding'];

// --- Helper Hook for Web Styling ---
function useWebConfig() {
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);
    const style = document.createElement('style');
    style.textContent = `
      @font-face {
        font-family: 'Ionicons';
        src: url('https://unpkg.com/@expo/vector-icons@15.0.0/build/vendor/react-native-vector-icons/Fonts/Ionicons.ttf') format('truetype');
      }
    `;
    document.head.appendChild(style);

    // Inject CSP to allow blob: images (Fixes Security Error)
    const meta = document.createElement('meta');
    meta.httpEquiv = "Content-Security-Policy";
    meta.content = "default-src * 'self' blob: data: gap:; style-src * 'self' 'unsafe-inline' blob: data: gap:; script-src * 'self' 'unsafe-eval' 'unsafe-inline' blob: data: gap:; object-src * 'self' blob: data: gap:; img-src * 'self' 'unsafe-inline' blob: data: gap:; connect-src * 'self' blob: data: gap:; frame-src * 'self' blob: data: gap:;";
    document.head.appendChild(meta);
  }, []);
}

// --- Navigation Logic ---
function RootNavigation() {
  const { user, userRole, loading } = useAuth();
  const router = useRouter();
  const segments = useSegments();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;

    const currentGroup = segments[0];

    // Check pathname for shared routes (profile, settings, legal)
    const isShared = ['/profile', '/settings', '/legal'].some(path => pathname.includes(path));
    const isPublic = PUBLIC_GROUPS.includes(currentGroup);

    // Scenario 1: User is NOT logged in
    if (!user) {
      if (!isPublic) {
        router.replace('/onboarding');
      }
      return;
    }

    // Scenario 2: User IS logged in
    // Allow shared routes to stay
    if (isShared) return;

    // If in public area, redirect to dashboard
    if (isPublic) {
      if (userRole && ROLE_PATHS[userRole]) {
        router.replace(ROLE_PATHS[userRole]);
      }
      return;
    }

    // Scenario 3: Role Enforcement
    if (userRole && currentGroup !== `(${userRole})`) {
      const targetPath = ROLE_PATHS[userRole];
      if (targetPath) {
        router.replace(targetPath);
      }
    }

  }, [user, userRole, loading, segments, pathname]);

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
      {/* ADD PROFILE HERE so the router knows about it */}
      <Stack.Screen name="profile" options={{ presentation: 'modal' }} />
    </Stack>
  );
}

export default function RootLayout() {
  useWebConfig();
  return (
    <AuthProvider>
      <NotificationProvider>
        <RootNavigation />
      </NotificationProvider>
    </AuthProvider>
  );
}