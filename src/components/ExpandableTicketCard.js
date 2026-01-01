import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, LayoutAnimation, Platform, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, STYLES } from '../constants/theme';

export default function ExpandableTicketCard({ ticket }) {
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
    // Robustly find the image source
    const firstPhoto = Array.isArray(ticket.photos) ? ticket.photos[0] : ticket.photos;
    const beforePhoto = firstPhoto || ticket.image || ticket.photoUrl;
    const afterPhoto = ticket.afterPhoto;
    const [imageLoadingError, setImageLoadingError] = useState(false);

    return (
        <View style={styles.card}>
            {/* ... (Header) ... */}

            {/* --- IMAGES (Side by Side) --- */}
            <View style={styles.imageRow}>
                {/* Before Image */}
                <TouchableOpacity
                    style={styles.imageWrapper}
                    onPress={() => beforePhoto && setFullScreenImage(beforePhoto)}
                    disabled={!beforePhoto}
                >
                    {beforePhoto && !imageLoadingError ? (
                        <Image
                            source={{ uri: beforePhoto }}
                            style={styles.image}
                            resizeMode="cover"
                            onError={(e) => {
                                console.log("Image load error:", e.nativeEvent.error);
                                setImageLoadingError(true);
                            }}
                        />
                    ) : (
                        <View style={styles.placeholder}>
                            <Ionicons name="image-outline" size={24} color="#ccc" />
                            <Text style={styles.placeholderText}>No Photo</Text>
                        </View>
                    )}
                    <View style={styles.imageLabel}><Text style={styles.imageLabelText}>BEFORE</Text></View>
                </TouchableOpacity>

                {/* Arrow-ish separator */}
                <View style={styles.arrowContainer}>
                    <Ionicons name="arrow-forward" size={20} color="#ccc" />
                </View>

                {/* After Image */}
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
                            <Text style={styles.placeholderText}>Pending...</Text>
                        </View>
                    )}
                    <View style={[styles.imageLabel, afterPhoto && { backgroundColor: COLORS.success }]}>
                        <Text style={styles.imageLabelText}>AFTER</Text>
                    </View>
                </TouchableOpacity>
            </View>

            {/* --- EXPAND BUTTON --- */}
            <TouchableOpacity onPress={toggleExpand} style={styles.expandBtn}>
                <Text style={styles.expandText}>{expanded ? "Hide Details" : "View Details & Timeline"}</Text>
                <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={20} color={COLORS.primary} />
            </TouchableOpacity>

            {/* --- EXPANDED DETAILS --- */}
            {expanded && (
                <View style={styles.detailsContainer}>
                    {/* Description */}
                    <Text style={styles.sectionHeader}>Report Description</Text>
                    <Text style={styles.description}>{ticket.description || "No description provided."}</Text>

                    {/* Resolution Notes (If Resolved) */}
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
                            text={`Submitted on ${new Date(ticket.createdAt).toLocaleDateString()}`}
                            active
                        />
                        <TimelineItem
                            icon="glasses"
                            color={ticket.status !== 'open' ? COLORS.info : '#ccc'}
                            text="Under Review"
                            active={ticket.status !== 'open'}
                        />
                        <TimelineItem
                            icon="construct"
                            color={(ticket.status === 'in_progress' || isResolved) ? COLORS.warning : '#ccc'}
                            text="Work In Progress"
                            active={ticket.status === 'in_progress' || isResolved}
                        />
                        <TimelineItem
                            icon="checkmark-done-circle"
                            color={isResolved ? COLORS.success : '#ccc'}
                            text="Issue Resolved"
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
        <View style={{ width: 24, alignItems: 'center' }}>
            <Ionicons name={icon} size={18} color={color} />
            {active && <View style={[styles.timelineLine, { backgroundColor: color }]} />}
        </View>
        <Text style={[styles.timelineText, { color: active ? '#333' : '#999' }]}>{text}</Text>
    </View>
);

const styles = StyleSheet.create({
    card: {
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        ...STYLES.shadow,
    },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    badgeText: { color: 'white', fontWeight: 'bold', fontSize: 10 },
    date: { color: '#999', fontSize: 12 },

    title: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 4 },
    location: { fontSize: 14, color: '#666', marginBottom: 16 },

    imageRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    imageWrapper: { flex: 1, height: 120, borderRadius: 12, overflow: 'hidden', backgroundColor: '#f0f0f0', position: 'relative' },
    image: { width: '100%', height: '100%' },
    placeholder: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    placeholderText: { fontSize: 12, color: '#999', marginTop: 4 },
    imageLabel: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        backgroundColor: 'rgba(0,0,0,0.6)', paddingVertical: 4, alignItems: 'center'
    },
    imageLabelText: { color: 'white', fontSize: 10, fontWeight: 'bold' },
    arrowContainer: { paddingHorizontal: 10 },

    expandBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 8, borderTopWidth: 1, borderColor: '#f0f0f0' },
    expandText: { color: COLORS.primary, fontWeight: '600', marginRight: 5 },

    detailsContainer: { marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderColor: '#f0f0f0' },
    sectionHeader: { fontSize: 14, fontWeight: 'bold', color: '#333', marginBottom: 8, marginTop: 10 },
    description: { color: '#666', lineHeight: 20 },

    resolutionBox: { backgroundColor: '#E8F6F3', padding: 12, borderRadius: 8, borderColor: COLORS.success, borderWidth: 1, marginTop: 12 },
    resTitle: { fontWeight: 'bold', color: COLORS.success, marginBottom: 4 },
    resText: { color: '#333', fontStyle: 'italic' },

    timeline: { marginTop: 8 },
    timelineRow: { flexDirection: 'row', marginBottom: 12 },
    timelineLine: { width: 2, height: 20, position: 'absolute', top: 22, left: '50%', transform: [{ translateX: -1 }] }, // Simple line
    timelineText: { marginLeft: 10, fontSize: 14 },

    modalOverlay: { flex: 1, backgroundColor: 'black', justifyContent: 'center', alignItems: 'center' },
    fullScreenImage: { width: '100%', height: '80%' },
    closeBtn: { position: 'absolute', top: 50, right: 20, zIndex: 10, padding: 10 },
});
