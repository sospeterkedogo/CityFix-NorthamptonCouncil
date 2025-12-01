import { View, Text, Button } from 'react-native';
import { useRouter } from 'expo-router';
import { COLORS, STYLES } from '../src/constants/theme';

export default function LoginScreen() {
  const router = useRouter();

  return (
    <View style={[STYLES.container, { justifyContent: 'center', alignItems: 'center' }]}>
      <Text style={{ fontSize: 24, fontWeight: 'bold', color: COLORS.primary, marginBottom: 20 }}>
        City Fix Login
      </Text>
      <Button 
        title="Login as Citizen" 
        color={COLORS.action}
        onPress={() => router.replace('/(citizen)/dashboard')} 
      />
    </View>
  );
}