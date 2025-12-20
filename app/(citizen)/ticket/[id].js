import React, { useEffect, useState } from 'react';
import {
    View, Text, ScrollView, Image, TouchableOpacity, StyleSheet, ActivityIndicator, Platform
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { TicketService } from '../../../src/services/ticketService';
import { COLORS, SPACING, STYLES } from '../../../src/constants/theme';
import MediaGalleryModal from '../../../src/components/MediaGalleryModal';
import { Ionicons } from '@expo/vector-icons';

export default function CitizenTicketDetail() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const [ticket, setTicket] = useState(null);
    const [loading, setLoading] = useState(true);

    // Gallery State
    const [galleryVisible, setGalleryVisible] = useState(false);
    const [galleryItems, setGalleryItems] = useState([]);

    useEffect(() => {
        loadTicket();
    }, [id]);

    const loadTicket = async () => {
        const data = await TicketService.getTicketById(id);
        setTicket(data);
        setLoading(false);
    };

    const openGallery = (items) => {
        setGalleryItems(items);
        setGalleryVisible(true);
    };

    if (loading) return <ActivityIndicator size="large" style={{ marginTop: 50 }} />;
    if (!ticket) return <Text style={{ padding: 20 }}>Ticket not found.</Text>;

    const isResolved = ticket.status === 'resolved' || ticket.status === 'verified';

    return (
        <View style={{ flex: 1 }}>
            <ScrollView contentContainerStyle={STYLES.container}>

                {/* HEADER */}
                <TouchableOpacity onPress={() => router.back()} style={{ marginBottom: 10, flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons name="arrow-back" size={16} color={COLORS.action} style={{ marginRight: 5 }} />
                    <Text style={{ color: COLORS.action, fontSize: 16 }}>Back</Text>
                </TouchableOpacity>

                <View style={styles.header}>
                    <Text style={styles.title}>{ticket.title}</Text>
                    <View style={[styles.badge, { backgroundColor: getStatusColor(ticket.status) }]}>
                        <Text style={styles.badgeText}>{ticket.status.toUpperCase()}</Text>
                    </View>
                </View>

                <Text style={styles.date}>Reported on {new Date(ticket.createdAt).toLocaleDateString()}</Text>
                <Text style={styles.desc}>{ticket.description}</Text>

                {/* SECTION 1: MY EVIDENCE */}
                <Text style={styles.sectionTitle}>Your Evidence</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scrollRow}>
                    {ticket.photos?.length > 0 ? ticket.photos.map((url, i) => (
                        <TouchableOpacity key={i} onPress={() => openGallery(ticket.photos)}>
                            <Image source={{ uri: url }} style={styles.thumb} />
                        </TouchableOpacity>
                    )) : <Text style={styles.italic}>No photos uploaded.</Text>}
                </ScrollView>

                {/* SECTION 2: COUNCIL RESOLUTION (Only if Resolved) */}
                {isResolved && ticket.afterPhoto && (
                    <View style={styles.resolutionBox}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 15 }}>
                            <Ionicons name="checkmark-circle" size={24} color={COLORS.success} style={{ marginRight: 8 }} />
                            <Text style={styles.resTitle}>Council Resolution</Text>
                        </View>

                        <View style={{ flexDirection: 'row', gap: 15 }}>
                            <TouchableOpacity onPress={() => openGallery([ticket.afterPhoto])}>
                                <Image source={{ uri: ticket.afterPhoto }} style={styles.proofThumb} />
                            </TouchableOpacity>

                            <View style={{ flex: 1 }}>
                                <Text style={styles.resLabel}>Engineer's Note:</Text>
                                <Text style={styles.resText}>
                                    "{ticket.resolutionNotes || 'Fixed.'}"
                                </Text>
                                <Text style={styles.resDate}>
                                    Fixed on {new Date(ticket.resolvedAt || Date.now()).toLocaleDateString()}
                                </Text>
                            </View>
                        </View>
                    </View>
                )}

                {/* STATUS TIMELINE (Simple Text Version) */}
                <View style={styles.timeline}>
                    <Text style={styles.timelineHeader}>History</Text>
                    <View style={styles.timelineItemRow}>
                        <Ionicons name="item-filled" size={8} color="#666" style={{ marginRight: 8 }} />
                        <Text style={styles.timelineItem}>Submitted</Text>
                    </View>

                    {/* UNDER REVIEW STEP */}
                    {(ticket.status === 'under_review' || ticket.status === 'assigned' || isResolved) && (
                        <View style={styles.timelineItemRow}>
                            <Ionicons name="glasses-outline" size={14} color={COLORS.info} style={{ marginRight: 8 }} />
                            <Text style={[styles.timelineItem, { color: COLORS.info, fontWeight: 'bold' }]}>Under Review</Text>
                        </View>
                    )}

                    {(ticket.status === 'assigned' || isResolved) && (
                        <View style={styles.timelineItemRow}>
                            <Ionicons name="item-filled" size={8} color="#666" style={{ marginRight: 8 }} />
                            <Text style={styles.timelineItem}>Engineer Assigned</Text>
                        </View>
                    )}
                    {isResolved && (
                        <View style={styles.timelineItemRow}>
                            <Ionicons name="checkmark-circle" size={14} color={COLORS.success} style={{ marginRight: 8 }} />
                            <Text style={[styles.timelineItem, { color: COLORS.success, fontWeight: 'bold' }]}>Issue Resolved</Text>
                        </View>
                    )}
                </View>

            </ScrollView>

            <MediaGalleryModal
                visible={galleryVisible}
                onClose={() => setGalleryVisible(false)}
                mediaUrls={galleryItems}
            />
        </View>
    );
}

// Reuse your status color helper
const getStatusColor = (status) => {
    if (status === 'resolved') return COLORS.success;
    if (status === 'verified') return COLORS.success;
    if (status === 'under_review') return '#8e44ad'; // Purple
    if (status === 'merged') return '#95a5a6';
    return COLORS.warning;
};

const styles = StyleSheet.create({
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 5 },
    title: { fontSize: 24, fontWeight: 'bold', color: COLORS.primary, flex: 1, marginRight: 10 },
    badge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
    badgeText: { color: 'white', fontWeight: 'bold', fontSize: 12 },
    date: { color: '#999', fontSize: 12, marginBottom: 15 },
    desc: { fontSize: 16, color: '#333', lineHeight: 24, marginBottom: 25 },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.primary, marginBottom: 10 },
    scrollRow: { flexDirection: 'row', marginBottom: 30 },
    thumb: { width: 100, height: 100, borderRadius: 8, marginRight: 10, backgroundColor: '#eee' },
    italic: { fontStyle: 'italic', color: '#999' },

    // Resolution Box
    resolutionBox: {
        backgroundColor: '#E8F6F3',
        padding: 15,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: COLORS.success,
        marginBottom: 30,
    },
    resTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.success }, // Removed MarginBottom as it's handled by wrapper
    proofThumb: { width: 80, height: 80, borderRadius: 8, borderWidth: 2, borderColor: COLORS.success },
    resLabel: { fontSize: 12, fontWeight: 'bold', color: COLORS.success },
    resText: { fontSize: 14, color: '#333', marginTop: 2, fontStyle: 'italic' },
    resDate: { fontSize: 10, color: '#999', marginTop: 10 },

    // Timeline
    timeline: { borderTopWidth: 1, borderColor: '#eee', paddingTop: 20 },
    timelineHeader: { fontSize: 16, fontWeight: 'bold', marginBottom: 10 },
    timelineItemRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 5, marginLeft: 10 },
    timelineItem: { fontSize: 14, color: '#666' },
});