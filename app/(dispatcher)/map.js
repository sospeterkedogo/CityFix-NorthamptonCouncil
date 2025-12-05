import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { TicketService } from '../../src/services/ticketService';
import { COLORS } from '../../src/constants/theme';

// Conditional Import for Native Maps
let MapView, Marker;

export default function DispatcherMap() {
  const [tickets, setTickets] = useState([]);

  useEffect(() => {
    // Fetch all active tickets
    TicketService.getAllTickets().then(data => {
      // Filter out tickets with no location
      const valid = data.filter(t => t.location && t.location.latitude);
      setTickets(valid);
    });
  }, []);

  if (Platform.OS === 'web') {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Live Map View</Text>
        <Text style={styles.sub}>
          (Map rendering is disabled on Web Simulator to prevent crashes without API Keys)
        </Text>
        <View style={styles.grid}>
          {tickets.map(t => (
            <View key={t.id} style={styles.pinCard}>
              <Text>📍</Text>
              <Text style={{ fontWeight: 'bold' }}>{t.title}</Text>
              <Text style={{ fontSize: 10, color: '#666' }}>
                {t.location.latitude.toFixed(4)}, {t.location.longitude.toFixed(4)}
              </Text>
            </View>
          ))}
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <MapView 
        style={{ flex: 1 }}
        initialRegion={{
          latitude: 52.2405, // Northampton
          longitude: -0.9027,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
      >
        {tickets.map(ticket => (
          <Marker
            key={ticket.id}
            coordinate={{
              latitude: ticket.location.latitude,
              longitude: ticket.location.longitude,
            }}
            title={ticket.title}
            description={ticket.status}
            pinColor={ticket.status === 'resolved' ? 'green' : 'red'}
          />
        ))}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, padding: 40, alignItems: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', color: COLORS.primary },
  sub: { color: COLORS.error, marginBottom: 20 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' },
  pinCard: { padding: 10, backgroundColor: 'white', borderRadius: 8, width: 150, alignItems: 'center', borderWidth: 1, borderColor: '#eee' }
});