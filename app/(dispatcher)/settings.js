import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { COLORS, STYLES } from '../../src/constants/theme';

export default function DispatcherSettings() {
  const router = useRouter();

  return (
    <View style={STYLES.container}>
      <Text style={styles.header}>Admin Settings</Text>
      
      <View style={styles.card}>
        <Text style={styles.label}>Profile</Text>
        <Text style={styles.value}>Dispatcher (Admin Role)</Text>
        
        <View style={styles.divider} />
        
        <Text style={styles.label}>Region</Text>
        <Text style={styles.value}>Northampton (North Zone)</Text>

        <View style={styles.divider} />

        <TouchableOpacity 
          style={styles.logoutBtn}
          onPress={() => router.replace('/')}
        >
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { fontSize: 24, fontWeight: 'bold', color: COLORS.primary, marginBottom: 20 },
  card: { backgroundColor: 'white', padding: 20, borderRadius: 12, ...STYLES.shadow, maxWidth: 400 },
  label: { color: '#999', fontSize: 12, marginBottom: 4 },
  value: { fontSize: 16, color: COLORS.text.primary, fontWeight: '600', marginBottom: 15 },
  divider: { height: 1, backgroundColor: '#eee', marginVertical: 10 },
  logoutBtn: { backgroundColor: '#ffebee', padding: 12, borderRadius: 8, alignItems: 'center', marginTop: 10 },
  logoutText: { color: COLORS.error, fontWeight: 'bold' }
});