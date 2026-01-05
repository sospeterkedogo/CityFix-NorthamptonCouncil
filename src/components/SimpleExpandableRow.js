import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, LayoutAnimation, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, STYLES } from '../constants/theme';
import { formatRelativeTime } from '../utils/dateUtils';

export default function SimpleExpandableRow({ ticket: item }) {
    const [expanded, setExpanded] = useState(false);
    const [fullScreenImage, setFullScreenImage] = useState(null);

    const toggleExpand = () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setExpanded(!expanded);
    };

    const isSocial = item.type === 'social';

    const getStatusColor = (status) => {
        switch (status) {
            case 'resolved': return COLORS.success;
            case 'verified': return COLORS.success;
            case 'in_progress': return COLORS.warning; // Orange
            case 'draft': return '#95a5a6';
            default: return COLORS.error; // Open
        }
    };

    const statusColor = isSocial ? COLORS.primary : getStatusColor(item.status);
    const isResolved = item.status === 'resolved' || item.status === 'verified';
    const beforePhoto = item.photos?.[0];
    const afterPhoto = item.afterPhoto;

    // Display Logic
    const displayName = isSocial ? (item.userName || "Neighbor") : (item.category || "Report");
    const displayDetail = isSocial ? item.title || item.description : item.title;
    const displayDate = formatRelativeTime(item.createdAt);

    // Notification Icon
    const getIcon = () => {
        if (isSocial) return "chatbubble-ellipses";
        if (isResolved) return "checkmark-circle";
        if (item.status === 'in_progress') return "construct";
        return "alert-circle";
    };

    return (
        <View style={styles.container}>
            {/* --- NOTIFICATION ROW --- */}
            <TouchableOpacity onPress={toggleExpand} style={styles.row} activeOpacity={0.7}>
                {/* 1. Icon / Avatar */}
                <View style={[styles.iconBox, { backgroundColor: isSocial ? '#E3F2FD' : '#F5F5F5' }]}>
                    <Ionicons name={getIcon()} size={24} color={statusColor} />
                </View>

                {/* 2. Content */}
                <View style={styles.contentCol}>
                    <View style={styles.headerRow}>
                        <Text style={styles.nameText} numberOfLines={1}>{displayName}</Text>
                        <Text style={styles.dateText}>{displayDate}</Text>
                    </View>
                    <Text style={styles.detailText} numberOfLines={1}>
                        {displayDetail || "No details provided"}
                    </Text>
                </View>
            </TouchableOpacity>

            {/* --- EXPANDED DETAILS --- */}
            {expanded && (
                <View style={styles.detailsContainer}>

                    {/* Full Description */}
                    <Text style={styles.sectionHeader}>Full Details</Text>
                    <Text style={styles.description}>
                        {item.description || item.title || "No description provided."}
                    </Text>

                    {/* Location */}
                    <View style={styles.metaRow}>
                        <Ionicons name="location-sharp" size={14} color="#666" style={{ marginRight: 4 }} />
                        <Text style={styles.location}>
                            {item.locationName || item.street || item.locationAddress || "Unknown Location"}
                        </Text>
                    </View>

                    {/* IMAGES (Revealed on Expand) */}
                    {(beforePhoto || afterPhoto) && (
                        <View style={styles.imageRow}>
                            {/* Before / Main */}
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
                                {!isSocial && <View style={styles.imageLabel}><Text style={styles.imageLabelText}>Photos</Text></View>}
                            </TouchableOpacity>

                            {/* After (if exists) */}
                            {afterPhoto && (
                                <TouchableOpacity
                                    style={styles.imageWrapper}
                                    onPress={() => setFullScreenImage(afterPhoto)}
                                >
                                    <Image source={{ uri: afterPhoto }} style={[styles.image, { borderColor: COLORS.success, borderWidth: 2 }]} resizeMode="cover" />
                                    <View style={[styles.imageLabel, { backgroundColor: COLORS.success }]}>
                                        <Text style={styles.imageLabelText}>RESOLUTION</Text>
                                    </View>
                                </TouchableOpacity>
                            )}
                        </View>
                    )}

                    {/* Resolution Notes (Tickets Only) */}
                    {isResolved && (
                        <View style={styles.resolutionBox}>
                            <Text style={styles.resTitle}>
                                <Ionicons name="checkmark-circle" size={16} color={COLORS.success} /> Resolution Note
                            </Text>
                            <Text style={styles.resText}>"{item.resolutionNotes || 'Fixed.'}"</Text>
                        </View>
                    )}

                    {/* Timeline (Tickets Only) */}
                    {!isSocial && (
                        <>
                            <Text style={styles.sectionHeader}>Status Timeline</Text>
                            <View style={styles.timeline}>
                                <TimelineItem
                                    icon="cloud-upload"
                                    color="#666"
                                    text={`Submitted`}
                                    active
                                />
                                <TimelineItem
                                    icon="construct"
                                    color={(item.status === 'in_progress' || isResolved) ? COLORS.warning : '#ccc'}
                                    text="In Progress"
                                    active={item.status === 'in_progress' || isResolved}
                                />
                                <TimelineItem
                                    icon="checkmark-done-circle"
                                    color={isResolved ? COLORS.success : '#ccc'}
                                    text="Resolved"
                                    active={isResolved}
                                />
                            </View>
                        </>
                    )}
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
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#f0f0f0'
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
    },
    iconBox: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    contentCol: {
        flex: 1,
        justifyContent: 'center',
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    nameText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#333',
    },
    dateText: {
        fontSize: 12,
        color: '#999',
    },
    detailText: {
        fontSize: 14,
        color: '#666',
    },

    // Expanded Styles
    detailsContainer: {
        paddingHorizontal: 16,
        paddingBottom: 16,
        borderTopWidth: 1,
        borderColor: '#f0f0f0',
        backgroundColor: '#fafafa'
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 15,
    },
    location: { fontSize: 13, color: '#666', },

    imageRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15, gap: 10 },
    imageWrapper: { flex: 1, height: 120, borderRadius: 8, overflow: 'hidden', backgroundColor: '#eee' },
    image: { width: '100%', height: '100%' },
    placeholder: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    placeholderText: { fontSize: 10, color: '#999' },
    imageLabel: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', paddingVertical: 2 },
    imageLabelText: { color: 'white', fontSize: 10, fontWeight: 'bold' },

    sectionHeader: { fontSize: 13, fontWeight: 'bold', color: '#444', marginBottom: 6, marginTop: 10 },
    description: { color: '#666', fontSize: 14, lineHeight: 20, marginBottom: 10 },

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
