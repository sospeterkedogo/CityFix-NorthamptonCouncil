import { View, Text, Button, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { COLORS, STYLES } from '../src/constants/theme';

export default function LoginScreen() {
  const router = useRouter();

  return (
    <View style={[STYLES.container, { justifyContent: 'center', alignItems: 'center', gap: 20 }]}>
      <Text style={{ fontSize: 32, fontWeight: 'bold', color: COLORS.primary }}>
        CityFix <Text style={{ color: COLORS.action }}>Northampton</Text>
      </Text>

      {/* Citizen Entry */}
      <TouchableOpacity 
        style={{ backgroundColor: COLORS.primary, padding: 15, borderRadius: 8, width: 250, alignItems: 'center' }}
        onPress={() => router.replace('/(citizen)/dashboard')}
      >
        <Text style={{ color: 'white', fontWeight: 'bold' }}>Login as Citizen</Text>
      </TouchableOpacity>

      {/* Dispatcher Entry */}
      <TouchableOpacity 
        style={{ backgroundColor: 'white', borderWidth: 2, borderColor: COLORS.primary, padding: 15, borderRadius: 8, width: 250, alignItems: 'center' }}
        onPress={() => router.replace('/(dispatcher)')}
      >
        <Text style={{ color: COLORS.primary, fontWeight: 'bold' }}>Login as Dispatcher</Text>
      </TouchableOpacity>

      {/* Engineer Entry */}
      <TouchableOpacity 
        style={{ 
          backgroundColor: '#E67E22', // Orange for construction
          padding: 15, borderRadius: 8, width: 250, alignItems: 'center' 
        }}
        onPress={() => router.replace('/(engineer)/dashboard')}
      >
        <Text style={{ color: 'white', fontWeight: 'bold' }}>Login as Engineer</Text>
      </TouchableOpacity>

      {/* QA Entry */}
      <TouchableOpacity 
        style={{ 
          backgroundColor: '#8E44AD', // Purple for Governance
          padding: 15, borderRadius: 8, width: 250, alignItems: 'center' 
        }}
        onPress={() => router.replace('/(qa)/dashboard')}
      >
        <Text style={{ color: 'white', fontWeight: 'bold' }}>Login as QA Auditor</Text>
      </TouchableOpacity>

    </View>
  );
}