import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { TicketService } from '../../services/ticketService';
import { COLORS } from '../../constants/theme';

export default function DispatcherMap() {
    const [tickets, setTickets] = useState([]);

    useEffect(() => {
        TicketService.getAllTickets().then(data => {
            const valid = data.filter(t => t.location && t.location.latitude);
            setTickets(valid);
        });
    }, []);

    return (
        <View style={{ flex: 1 }}>
            <MapView
                style={{ flex: 1 }}
                initialRegion={{
                    latitude: 52.2405,
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
