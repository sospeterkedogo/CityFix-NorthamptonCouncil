import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { TicketService } from '../../src/services/ticketService';
// LEAFLET IMPORTS (Web Only)
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';

// Fix for missing marker icons in Leaflet
const icon = L.icon({
    iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
    iconRetinaUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
    shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
});

export default function DispatcherMapWeb() {
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        TicketService.getAllTickets().then(data => {
            const valid = data.filter(t => t.location && t.location.latitude);
            setTickets(valid);
            setLoading(false);
        });
    }, []);

    if (loading) return <ActivityIndicator size="large" style={{ marginTop: 50 }} />;

    return (
        <View style={styles.container}>
            {/* height: '100vh' ensures it takes full screen on mobile web 
        zIndex: 0 ensures it sits behind any absolute UI elements
      */}
            <View style={{ height: '100%', width: '100%' }}>
                <MapContainer
                    center={[52.2405, -0.9027]} // Northampton
                    zoom={13}
                    style={{ height: '100%', width: '100%' }}
                >
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />

                    {tickets.map(ticket => (
                        <Marker
                            key={ticket.id}
                            position={[ticket.location.latitude, ticket.location.longitude]}
                            icon={icon}
                        >
                            <Popup>
                                <div style={styles.popup}>
                                    <strong>{ticket.title}</strong><br />
                                    Status: {ticket.status.toUpperCase()}
                                </div>
                            </Popup>
                        </Marker>
                    ))}
                </MapContainer>
            </View>

            {/* Optional: Floating Title Box */}
            <View style={styles.overlay}>
                <Text style={styles.overlayText}>Live Dispatch Map</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    popup: { fontSize: '14px', textAlign: 'center' },
    overlay: {
        position: 'absolute',
        top: 20,
        left: 20,
        backgroundColor: 'white',
        padding: 10,
        borderRadius: 8,
        zIndex: 9999, // Above the map
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
    },
    overlayText: { fontWeight: 'bold' }
});