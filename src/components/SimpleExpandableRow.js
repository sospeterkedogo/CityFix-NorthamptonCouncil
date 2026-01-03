import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, LayoutAnimation, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, STYLES } from '../constants/theme';

import { formatRelativeTime } from '../utils/dateUtils';

export default function SimpleExpandableRow({ ticket }) {
    const [expanded, setExpanded] = useState(false);
    const [fullScreenImage, setFullScreenImage] = useState(null);

    const toggleExpand = () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setExpanded(!expanded);
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'resolved': return COLORS.success;
            case 'verified': return COLORS.success;
            case 'in_progress': return COLORS.warning; // Orange
            case 'draft': return '#95a5a6';
            default: return COLORS.error; // Open
        }
    };

    const statusColor = getStatusColor(ticket.status);
    const isResolved = ticket.status === 'resolved' || ticket.status === 'verified';
    const beforePhoto = ticket.photos?.[0];
    const afterPhoto = ticket.afterPhoto;

    return (
        <View style={styles.container}>
            {/* --- COLLAPSED ROW (Simple View) --- */}
            <TouchableOpacity onPress={toggleExpand} style={styles.row}>
                <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                <View style={styles.infoCol}>
                    <Text style={styles.title} numberOfLines={1}>{ticket.title}</Text>
                    <Text style={styles.meta}>
                        {formatRelativeTime(ticket.createdAt)} • {ticket.status.replace('_', ' ').toUpperCase()}
                    </Text>
                </View>
                <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={20} color="#ccc" />
            </TouchableOpacity>

            {/* --- EXPANDED DETAILS --- */}
            {expanded && (
                <View style={styles.detailsContainer}>

                    {/* Location */}
                    <Text style={styles.location}>
                        <Ionicons name="location-sharp" size={14} color="#666" />
                        {ticket.locationName || ticket.street || ticket.locationAddress || "Unknown Location"}
                    </Text>

                    {/* IMAGES (Revealed on Expand) */}
                    <View style={styles.imageRow}>
                        {/* Before */}
                        <TouchableOpacity
                            style={styles.imageWrapper}
                            onPress={() => beforePhoto && setFullScreenImage(beforePhoto)}
                            disabled={!beforePhoto}
                        >
                            {beforePhoto ? (
                                <Image source={{ uri: beforePhoto }} style={styles.image} resizeMode="cover" />
                            ) : (
                                <View style={styles.placeholder}><Text style={styles.placeholderText}>No Photo</Text></View>
                            )}
                            <View style={styles.imageLabel}><Text style={styles.imageLabelText}>BEFORE</Text></View>
                        </TouchableOpacity>

                        {/* After (if exists or space for it) */}
                        <TouchableOpacity
                            style={styles.imageWrapper}
                            onPress={() => afterPhoto && setFullScreenImage(afterPhoto)}
                            disabled={!afterPhoto}
                        >
                            {afterPhoto ? (
                                <Image source={{ uri: afterPhoto }} style={[styles.image, { borderColor: COLORS.success, borderWidth: 2 }]} resizeMode="cover" />
                            ) : (
                                <View style={styles.placeholder}>
                                    <Ionicons name="time-outline" size={24} color="#ccc" />
                                    <Text style={styles.placeholderText}>Pending</Text>
                                </View>
                            )}
                            <View style={[styles.imageLabel, afterPhoto && { backgroundColor: COLORS.success }]}>
                                <Text style={styles.imageLabelText}>AFTER</Text>
                            </View>
                        </TouchableOpacity>
                    </View>

                    {/* Description */}
                    <Text style={styles.sectionHeader}>Description</Text>
                    <Text style={styles.description}>{ticket.description || "No description provided."}</Text>

                    {/* Resolution Notes */}
                    {isResolved && (
                        <View style={styles.resolutionBox}>
                            <Text style={styles.resTitle}>
                                <Ionicons name="checkmark-circle" size={16} color={COLORS.success} /> Resolution Note
                            </Text>
                            <Text style={styles.resText}>"{ticket.resolutionNotes || 'Fixed.'}"</Text>
                        </View>
                    )}

                    {/* Timeline */}
                    <Text style={styles.sectionHeader}>Timeline</Text>
                    <View style={styles.timeline}>
                        <TimelineItem
                            icon="cloud-upload"
                            color="#666"
                            text={`Submitted`}
                            active
                        />
                        <TimelineItem
                            icon="construct"
                            color={(ticket.status === 'in_progress' || isResolved) ? COLORS.warning : '#ccc'}
                            text="In Progress"
                            active={ticket.status === 'in_progress' || isResolved}
                        />
                        <TimelineItem
                            icon="checkmark-done-circle"
                            color={isResolved ? COLORS.success : '#ccc'}
                            text="Resolved"
                            active={isResolved}
                        />
                    </View>
                </View>
            )}

            {/* --- FULL SCREEN IMAGE MODAL --- */}
            <Modal visible={!!fullScreenImage} transparent={true} animationType="fade" onRequestClose={() => setFullScreenImage(null)}>
                <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setFullScreenImage(null)}>
                    <TouchableOpacity style={styles.closeBtn} onPress={() => setFullScreenImage(null)}>
                        <Ionicons name="close" size={30} color="white" />
                    </TouchableOpacity>
                    {fullScreenImage && (
                        <Image source={{ uri: fullScreenImage }} style={styles.fullScreenImage} resizeMode="contain" />
                    )}
                </TouchableOpacity>
            </Modal>
        </View>
    );
}

// Helper Component for Timeline
const TimelineItem = ({ icon, color, text, active }) => (
    <View style={styles.timelineRow}>
        <Ionicons name={icon} size={14} color={color} style={{ marginRight: 6 }} />
        <Text style={[styles.timelineText, { color: active ? '#333' : '#999' }]}>{text}</Text>
    </View>
);

const styles = StyleSheet.create({
    container: {
        backgroundColor: 'white',
        borderRadius: 12,
        marginBottom: 10,
        ...STYLES.shadow,
        overflow: 'hidden'
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
    },
    statusDot: { width: 10, height: 10, borderRadius: 5, marginRight: 15 },
    infoCol: { flex: 1 },
    title: { fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 2 },
    meta: { fontSize: 12, color: '#999' },

    detailsContainer: {
        paddingHorizontal: 16,
        paddingBottom: 16,
        borderTopWidth: 1,
        borderColor: '#f0f0f0',
        backgroundColor: '#fafafa'
    },
    location: { fontSize: 13, color: '#666', marginVertical: 10, fontStyle: 'italic' },

    imageRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15, gap: 10 },
    imageWrapper: { flex: 1, height: 100, borderRadius: 8, overflow: 'hidden', backgroundColor: '#eee' },
    image: { width: '100%', height: '100%' },
    placeholder: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    placeholderText: { fontSize: 10, color: '#999' },
    imageLabel: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', paddingVertical: 2 },
    imageLabelText: { color: 'white', fontSize: 8, fontWeight: 'bold' },

    sectionHeader: { fontSize: 13, fontWeight: 'bold', color: '#444', marginBottom: 6, marginTop: 10 },
    description: { color: '#666', fontSize: 14, lineHeight: 20 },

    resolutionBox: { backgroundColor: '#E8F6F3', padding: 10, borderRadius: 6, borderColor: COLORS.success, borderWidth: 1, marginTop: 10 },
    resTitle: { fontWeight: 'bold', color: COLORS.success, fontSize: 12, marginBottom: 2 },
    resText: { color: '#333', fontStyle: 'italic', fontSize: 13 },

    timeline: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 5 },
    timelineRow: { flexDirection: 'row', alignItems: 'center' },
    timelineText: { fontSize: 11 },

    modalOverlay: { flex: 1, backgroundColor: 'black', justifyContent: 'center', alignItems: 'center' },
    fullScreenImage: { width: '100%', height: '80%' },
    closeBtn: { position: 'absolute', top: 50, right: 20, zIndex: 10, padding: 10 },
});
