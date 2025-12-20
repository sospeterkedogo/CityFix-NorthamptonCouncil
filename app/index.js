import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { COLORS, STYLES } from '../src/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useEffect } from 'react';
import { useAuth } from '../src/context/AuthContext';

export default function LandingScreen() {
  const router = useRouter();
  const { user } = useAuth();

  // If already logged in, the RootLayout will likely handle it, 
  // but we can offer a clear "Get Started" here.

  return (
    <View style={[STYLES.container, { justifyContent: 'center', alignItems: 'center', gap: 20 }]}>
      <View style={{ alignItems: 'center', marginBottom: 40 }}>
        <Ionicons name="business" size={80} color={COLORS.primary} />
        <Text style={{ fontSize: 32, fontWeight: 'bold', color: COLORS.primary, marginTop: 10 }}>
          CityFix <Text style={{ color: COLORS.action }}>Northampton</Text>
        </Text>
        <Text style={{ color: COLORS.text.secondary, marginTop: 5 }}>Community Reporting App</Text>
      </View>

      <TouchableOpacity
        style={styles.btnPrimary}
        onPress={() => router.replace('/(auth)/login')}
      >
        <Text style={styles.btnText}>Get Started</Text>
        <Ionicons name="arrow-forward" size={20} color="white" style={{ marginLeft: 10 }} />
      </TouchableOpacity>

    </View>
  );
}

const styles = StyleSheet.create({
  btnPrimary: {
    backgroundColor: COLORS.primary,
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 30,
    flexDirection: 'row',
    alignItems: 'center',
    ...STYLES.shadow
  },
  btnText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 18
  }
});