import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { UserService } from '../../src/services/userService';
import { COLORS, STYLES, SPACING } from '../../src/constants/theme';

export default function EngineersList() {
  const [engineers, setEngineers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEngineers();
  }, []);

  const loadEngineers = async () => {
    const data = await UserService.getAllEngineers();
    setEngineers(data);
    setLoading(false);
  };

  const renderRow = ({ item }) => (
    <View style={styles.row}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{(item.name || item.email || 'E').charAt(0).toUpperCase()}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.name}>{item.name || 'Unknown Engineer'}</Text>
        <Text style={styles.email}>{item.email || 'No email'}</Text>
      </View>
      <View style={[
        styles.badge,
        { backgroundColor: item.status === 'Available' ? COLORS.success : COLORS.error }
      ]}>
        <Text style={styles.badgeText}>{item.status || 'OFFLINE'}</Text>
      </View>
    </View>
  );

  return (
    <View style={STYLES.container}>
      <Text style={styles.header}>Field Force Status</Text>

      {loading ? (
        <ActivityIndicator size="large" color={COLORS.primary} />
      ) : (
        <View style={styles.table}>
          <FlatList
            data={engineers}
            renderItem={renderRow}
            keyExtractor={(item, index) => item.id || String(index)}
            ListEmptyComponent={<Text>No engineers found.</Text>}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { fontSize: 24, fontWeight: 'bold', color: COLORS.primary, marginBottom: 20 },
  table: { backgroundColor: 'white', borderRadius: 12, ...STYLES.shadow },
  row: { flexDirection: 'row', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderColor: '#eee' },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  avatarText: { color: 'white', fontWeight: 'bold' },
  name: { fontSize: 16, fontWeight: 'bold', color: COLORS.primary },
  email: { color: '#999', fontSize: 12 },
  badge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  badgeText: { color: 'white', fontWeight: 'bold', fontSize: 12 },
});