import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, STYLES, SPACING } from '../constants/theme';

export default function TicketListItem({
    ticket,
    onPress,
    role = 'citizen', // 'citizen' | 'engineer'
    showNavigation = false,
    onNavigate
}) {
    // Determine Status Color
    const getStatusColor = (status) => {
        switch (status) {
            case 'resolved': return COLORS.success; // Green
            case 'verified': return COLORS.success;
            case 'in_progress': return COLORS.warning; // Yellow/Orange
            case 'assigned': return '#3498db'; // Blue
            case 'merged': return '#7f8c8d'; // Grey
            default: return '#e74c3c'; // Red (Open/Submitted)
        }
    };

    // Formatting Date (Native)
    const dateStr = ticket.createdAt ? new Date(ticket.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';

    // Distance (Specific to Engineer)
    const distanceStr = ticket.distanceKm
        ? (ticket.distanceKm < 1 ? `${(ticket.distanceKm * 1000).toFixed(0)}m away` : `${ticket.distanceKm.toFixed(1)}km away`)
        : null;

    return (
        <TouchableOpacity
            style={styles.card}
            onPress={onPress}
            activeOpacity={0.7}
        >
            <View style={styles.cardHeader}>
                <View style={[styles.badge, { backgroundColor: getStatusColor(ticket.status) }]}>
                    <Text style={styles.badgeText}>{ticket.status?.replace('_', ' ').toUpperCase() || 'OPEN'}</Text>
                </View>

                {/* Metadata: Distance for Engineer, Date for Citizen */}
                {role === 'engineer' && distanceStr ? (
                    <View style={styles.metaRow}>
                        <Ionicons name="navigate-circle-outline" size={14} color={COLORS.text.secondary} />
                        <Text style={styles.metaText}>{distanceStr}</Text>
                    </View>
                ) : (
                    <Text style={styles.dateText}>{dateStr}</Text>
                )}
            </View>

            <Text style={styles.title} numberOfLines={1}>{ticket.title}</Text>
            <Text style={styles.desc} numberOfLines={2}>{ticket.description}</Text>

            <View style={styles.divider} />

            <View style={styles.footer}>
                <View style={styles.locationRow}>
                    <Ionicons name="location-outline" size={16} color={COLORS.text.secondary} />
                    <Text style={styles.locationText} numberOfLines={1}>
                        {ticket.location?.address || `${ticket.location?.latitude.toFixed(4)}, ${ticket.location?.longitude.toFixed(4)}`}
                    </Text>
                </View>

                {/* Engineer: Navigate Button */}
                {role === 'engineer' && showNavigation && (
                    <TouchableOpacity style={styles.navBtn} onPress={onNavigate}>
                        <Text style={styles.navText}>NAVIGATE</Text>
                        <Ionicons name="arrow-forward" size={12} color="white" style={{ marginLeft: 4 }} />
                    </TouchableOpacity>
                )}

                {/* Citizen: Chevron */}
                {role === 'citizen' && (
                    <Ionicons name="chevron-forward" size={16} color="#ccc" />
                )}
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        ...Platform.select({
            web: { boxShadow: '0 4px 12px rgba(0,0,0,0.08)', transition: '0.2s' },
            default: {
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
                elevation: 3
            }
        }),
        borderWidth: 1,
        borderColor: '#f1f5f9'
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12
    },
    badge: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8,
    },
    badgeText: {
        color: 'white',
        fontSize: 10,
        fontWeight: 'bold',
        letterSpacing: 0.5
    },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    metaText: { fontSize: 12, color: '#64748B', fontWeight: '500' },
    dateText: { fontSize: 12, color: '#94A3B8' },

    title: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1E293B',
        marginBottom: 6
    },
    desc: {
        fontSize: 14,
        color: '#64748B',
        lineHeight: 20,
        marginBottom: 16
    },
    divider: { height: 1, backgroundColor: '#F1F5F9', marginBottom: 12 },

    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    locationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        marginRight: 10
    },
    locationText: {
        fontSize: 12,
        color: '#64748B',
        marginLeft: 6,
        flex: 1
    },
    navBtn: {
        backgroundColor: COLORS.primary,
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 8,
        flexDirection: 'row',
        alignItems: 'center',
        ...STYLES.shadow
    },
    navText: {
        color: 'white',
        fontSize: 10,
        fontWeight: 'bold',
        letterSpacing: 1
    }
});
