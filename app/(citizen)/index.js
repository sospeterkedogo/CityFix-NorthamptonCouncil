import React, { useState, useCallback, useRef, useEffect } from 'react';
import { View, SectionList, Text, StyleSheet, SafeAreaView, TouchableOpacity, Modal, TextInput, Image, Alert, Platform, ActivityIndicator } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { COLORS, STYLES, SPACING } from '../../src/constants/theme';
import { SocialService } from '../../src/services/socialService';
import { ImageService } from '../../src/services/ImageService';
import { UserService } from '../../src/services/userService'; // Import UserService
import FeedCard from '../../src/components/FeedCard';
import Toast from '../../src/components/Toast';
import LocationPickerModal from '../../src/components/LocationPickerModal'; // Import Picker
import { useAuth } from '../../src/context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import TutorialOverlay from '../../src/components/TutorialOverlay';

export default function HomeScreen() {
    const { user } = useAuth();
    const router = useRouter();
    const [activeTab, setActiveTab] = useState('neighborhood');
    const [feed, setFeed] = useState([]);
    const [loading, setLoading] = useState(false);
    const [toastVisible, setToastVisible] = useState(false);

    // Create Post State
    const [showPostModal, setShowPostModal] = useState(false);
    const [postText, setPostText] = useState('');
    const [postMedia, setPostMedia] = useState(null);
    const [mediaType, setMediaType] = useState('image');
    const [uploading, setUploading] = useState(false);

    // Location State
    const [showLocationPicker, setShowLocationPicker] = useState(false);
    const [selectedLocation, setSelectedLocation] = useState(null); // { latitude, longitude, address }
    const [detectedAddress, setDetectedAddress] = useState(null); // Auto-detected for display

    const sectionListRef = useRef(null);

    useFocusEffect(
        useCallback(() => {
            loadFeed();
        }, [activeTab])
    );

    // Reset location when modal opens
    useEffect(() => {
        if (showPostModal) {
            setSelectedLocation(null);
            detectCurrentLocationName();
        }
    }, [showPostModal]);

    // Dynamic Tagline State
    const [tagline, setTagline] = useState("What's happening in Northampton?");

    useEffect(() => {
        determineUserLocation();
    }, [user]);

    const determineUserLocation = async () => {
        // 1. Try GPS first
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status === 'granted') {
                const loc = await Location.getCurrentPositionAsync({});
                const reverse = await Location.reverseGeocodeAsync({
                    latitude: loc.coords.latitude,
                    longitude: loc.coords.longitude
                });
                if (reverse.length > 0) {
                    const place = reverse[0];
                    const town = place.city || place.subregion || place.district || place.region;
                    if (town) {
                        setTagline(`What's happening in ${town}?`);
                        return;
                    }
                }
            }
        } catch (e) {
            console.log("GPS Tagline Error:", e);
        }

        // 2. Fallback to Profile Address
        if (user) {
            try {
                // We need to fetch the fresh profile data since AuthContext doesn't have 'address' yet
                // Importing UserService here dynamically or we can assume it's available in scope
                // Using SocialService as a bridge or direct import if available. 
                // Let's assume UserService.getEngineerProfile is importable.
                // Wait, I need to make sure UserService is imported. I'll add the import in a separate tool call if needed or assume it.
                // Actually, I'll fetch the doc directly to be safe or just use the imported UserService if I add it.
                // I will add the import in the next step.
                const profile = await UserService.getEngineerProfile(user.uid);

                // 2a. Use specific City field if available (New Structured Input)
                if (profile && profile.city) {
                    setTagline(`What's happening in ${profile.city}?`);
                    return;
                }

                // 2b. (Removed) Legacy fallback was unreliable (picking street names).
                // If profile.city is missing, we fall through to the default below.
            } catch (e) {
                console.log("Profile Tagline Error:", e);
            }
        }

        // 3. Final Fallback (Default for this Council)
        setTagline("What's happening in Northampton?");
    };

    const detectCurrentLocationName = async () => {
        setDetectedAddress("Detecting location...");
        try {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                setDetectedAddress("Location permission denied");
                return;
            }
            let loc = await Location.getCurrentPositionAsync({});
            const reverse = await Location.reverseGeocodeAsync({
                latitude: loc.coords.latitude,
                longitude: loc.coords.longitude
            });
            if (reverse.length > 0) {
                const p = reverse[0];
                setDetectedAddress(`${p.street || p.name}, ${p.city}`);
            } else {
                setDetectedAddress("Current Location");
            }
        } catch (e) {
            setDetectedAddress("Unknown Location");
        }
    };

    const loadFeed = async () => {
        setLoading(true);
        setFeed([]);
        let result;
        if (activeTab === 'official') {
            result = await SocialService.getVerifiedFeed();
        } else {
            result = await SocialService.getNeighborhoodFeed();
        }
        setFeed(result.data);
        setLoading(false);
    };

    const pickMedia = async (type) => {
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: type === 'video' ? ImagePicker.MediaTypeOptions.Videos : ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true, quality: 0.5,
        });
        if (!result.canceled) {
            setPostMedia(result.assets[0].uri);
            setMediaType(type);
        }
    };

    const takePhoto = async () => {
        let { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') return alert('Camera permission needed');
        let result = await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true, quality: 0.5,
        });
        if (!result.canceled) {
            setPostMedia(result.assets[0].uri);
            setMediaType('image');
        }
    };

    const handleLocationSelect = (loc) => {
        setSelectedLocation(loc); // { latitude, longitude, address? }
        setDetectedAddress(loc.address || "Pinned Location");
    };

    const handlePost = async () => {
        if (!postText.trim() && !postMedia) return alert("Please add some text or media!");
        if (uploading) return;
        setUploading(true);

        try {
            let locCoords = null;
            let manualAddr = null;

            if (selectedLocation) {
                // User manually selected
                locCoords = { latitude: selectedLocation.latitude, longitude: selectedLocation.longitude };
                manualAddr = selectedLocation.address || "Pinned Location"; // Use address from picker if available
            } else {
                // Auto-detect
                let { status } = await Location.requestForegroundPermissionsAsync();
                if (status !== 'granted') return alert("Location permission needed to post.");
                let loc = await Location.getCurrentPositionAsync({});
                locCoords = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
            }

            let downloadUrl = null;
            if (postMedia) {
                const ext = mediaType === 'video' ? 'mp4' : 'jpg';
                const path = `posts/${user.uid}/${Date.now()}.${ext}`;
                downloadUrl = await ImageService.uploadImage(postMedia, path);
            }

            await SocialService.createPost(
                user.uid,
                user.photoURL || null,
                user.displayName || user.email?.split('@')[0] || 'Citizen',
                user.email,
                postText,
                downloadUrl,
                locCoords,
                postMedia ? mediaType : 'text',
                manualAddr // Pass manual address if set
            );

            setShowPostModal(false);
            setPostText('');
            setPostMedia(null);
            loadFeed();
        } catch (error) {
            console.error(error);
            Alert.alert("Error", "Failed to post. Please try again.");
        } finally {
            setUploading(false);
        }
    };

    // Header Component
    const renderHeader = () => (
        <View style={styles.headerContainer}>
            <View>
                <Text style={styles.greeting}>Hello, {user?.displayName?.split(' ')[0] || 'Neighbor'}</Text>
                <Text style={styles.subGreeting}>{tagline}</Text>
            </View>
            <TouchableOpacity onPress={() => router.push('/profile')}>
                {user?.photoURL ? (
                    <Image source={{ uri: user.photoURL }} style={styles.avatar} />
                ) : (
                    <View style={[styles.avatar, styles.avatarPlaceholder]}>
                        <Text style={styles.avatarText}>
                            {(user?.displayName?.trim() || user?.email || '?').charAt(0).toUpperCase()}
                        </Text>
                    </View>
                )}
            </TouchableOpacity>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <TutorialOverlay role="citizen" page="feed" />
            <View style={styles.contentContainer}>

                <SectionList
                    ref={sectionListRef}
                    sections={[{ data: feed }]}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={{ paddingBottom: 100 }}
                    stickySectionHeadersEnabled={true}
                    ListHeaderComponent={renderHeader}
                    renderSectionHeader={() => (
                        <View style={styles.tabContainer}>
                            <View style={styles.segmentControl}>
                                <TouchableOpacity
                                    onPress={() => setActiveTab('neighborhood')}
                                    style={[styles.segment, activeTab === 'neighborhood' && styles.activeSegment]}
                                >
                                    <Text style={[styles.segmentText, activeTab === 'neighborhood' && styles.activeSegmentText]}>Neighborhood</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={() => setActiveTab('official')}
                                    style={[styles.segment, activeTab === 'official' && styles.activeSegment]}
                                >
                                    <Text style={[styles.segmentText, activeTab === 'official' && styles.activeSegmentText]}>Council Fixes</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}
                    renderItem={({ item }) => <FeedCard ticket={item} />}
                    onRefresh={loadFeed}
                    refreshing={loading}
                    ListEmptyComponent={
                        !loading && (
                            <View style={styles.emptyState}>
                                <Ionicons name="documents-outline" size={50} color="#ccc" />
                                <Text style={styles.emptyText}>No posts yet. Be the first!</Text>
                            </View>
                        )
                    }
                />

                {/* FAB */}
                {activeTab === 'neighborhood' && (
                    <TouchableOpacity style={styles.fab} onPress={() => setShowPostModal(true)}>
                        <Ionicons name="add" size={32} color="white" />
                        <Text style={styles.fabLabel}>New Post</Text>
                    </TouchableOpacity>
                )}

            </View>

            {/* CREATE POST MODAL */}
            <Modal visible={showPostModal} animationType="slide" presentationStyle="pageSheet">
                <View style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>New Post</Text>
                        <TouchableOpacity onPress={() => setShowPostModal(false)}>
                            <Ionicons name="close" size={28} color={COLORS.text.primary} />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.userInfoRow}>
                        {user?.photoURL ? (
                            <Image source={{ uri: user.photoURL }} style={styles.smallAvatar} />
                        ) : (
                            <View style={[styles.smallAvatar, styles.avatarPlaceholder]}>
                                <Text style={styles.smallAvatarText}>{user?.email?.charAt(0).toUpperCase()}</Text>
                            </View>
                        )}
                        <View>
                            <Text style={styles.userName}>{user?.displayName || 'Citizen'}</Text>
                            <TouchableOpacity style={styles.locationChip} onPress={() => setShowLocationPicker(true)}>
                                <Ionicons name="location-sharp" size={12} color={COLORS.primary} />
                                <Text style={styles.locationText} numberOfLines={1}>
                                    {selectedLocation?.address || detectedAddress || "Locating..."}
                                </Text>
                                <Ionicons name="chevron-down" size={12} color="#666" />
                            </TouchableOpacity>
                        </View>
                    </View>

                    <TextInput
                        placeholder="What's happening nearby?"
                        value={postText}
                        onChangeText={setPostText}
                        style={styles.input}
                        multiline
                        autoFocus
                    />

                    {/* Media Preview */}
                    {postMedia && (
                        <View style={styles.mediaPreview}>
                            {mediaType === 'video' ? (
                                <View style={styles.videoPlaceholder}>
                                    <Ionicons name="videocam" size={40} color="white" />
                                </View>
                            ) : (
                                Platform.OS === 'web' ? (
                                    <img
                                        src={postMedia}
                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                        alt="Preview"
                                    />
                                ) : (
                                    <Image source={{ uri: postMedia }} style={styles.imagePreview} />
                                )
                            )}
                            <TouchableOpacity onPress={() => setPostMedia(null)} style={styles.removeMediaBtn}>
                                <Ionicons name="close-circle" size={24} color="white" />
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* Actions */}
                    <View style={styles.modalFooter}>
                        <View style={styles.mediaActions}>
                            <TouchableOpacity onPress={takePhoto} style={styles.iconBtn}>
                                <Ionicons name="camera-outline" size={28} color={COLORS.primary} />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => pickMedia('image')} style={styles.iconBtn}>
                                <Ionicons name="image-outline" size={28} color={COLORS.primary} />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => pickMedia('video')} style={styles.iconBtn}>
                                <Ionicons name="videocam-outline" size={28} color={COLORS.primary} />
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity
                            onPress={handlePost}
                            style={[styles.postButton, (!postText.trim() && !postMedia) && styles.disabledBtn]}
                            disabled={!postText.trim() && !postMedia || uploading}
                        >
                            {uploading ? <ActivityIndicator color="white" /> : <Text style={styles.postBtnText}>Post</Text>}
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Location Picker */}
                <LocationPickerModal
                    visible={showLocationPicker}
                    onClose={() => setShowLocationPicker(false)}
                    onSelectLocation={handleLocationSelect}
                />
            </Modal>

            <Toast visible={toastVisible} message="You're all caught up!" onHide={() => setToastVisible(false)} />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F2F4F8' },
    contentContainer: { flex: 1, maxWidth: 600, width: '100%', alignSelf: 'center' },

    // Header
    headerContainer: { padding: 20, paddingTop: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F2F4F8' },
    greeting: { fontSize: 24, fontWeight: 'bold', color: '#1A1A1A' },
    subGreeting: { fontSize: 14, color: '#666', marginTop: 2 },
    avatar: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: 'white' },
    avatarPlaceholder: { backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
    avatarText: { color: 'white', fontSize: 18, fontWeight: 'bold' },

    // Tabs
    tabContainer: { paddingHorizontal: 20, paddingBottom: 15, backgroundColor: '#F2F4F8' },
    segmentControl: { flexDirection: 'row', backgroundColor: '#E0E4EB', borderRadius: 25, padding: 4 },
    segment: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 20 },
    activeSegment: { backgroundColor: 'white', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
    segmentText: { color: '#666', fontWeight: '600' },
    activeSegmentText: { color: COLORS.primary, fontWeight: 'bold' },

    // Empty State
    emptyState: { alignItems: 'center', marginTop: 50, opacity: 0.6 },
    emptyText: { marginTop: 10, fontSize: 16 },

    // FAB
    fab: {
        position: 'absolute', bottom: 110, right: 20,
        backgroundColor: COLORS.primary, borderRadius: 30,
        flexDirection: 'row', alignItems: 'center',
        paddingVertical: 12, paddingHorizontal: 20,
        elevation: 8, shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 6,
        zIndex: 999
    },
    fabLabel: { color: 'white', fontWeight: 'bold', fontSize: 16, marginLeft: 8 },

    // Modal
    modalContainer: {
        flex: 1,
        backgroundColor: 'white',
        padding: 20,
        ...Platform.select({
            web: {
                maxWidth: 600,
                width: '100%',
                alignSelf: 'center',
                marginVertical: 20,
                borderRadius: 12,
                maxHeight: '90vh',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.25,
                shadowRadius: 3.84,
                elevation: 5,
            }
        })
    },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 20, fontWeight: 'bold' },
    userInfoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
    smallAvatar: { width: 40, height: 40, borderRadius: 20, marginRight: 12 },
    smallAvatarText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
    userName: { fontWeight: 'bold', fontSize: 16, color: '#333' },

    // Location Chip
    locationChip: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0F2F5',
        paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, marginTop: 4, alignSelf: 'flex-start'
    },
    locationText: { fontSize: 12, color: '#555', marginLeft: 4, marginRight: 4, maxWidth: 200 },

    input: { fontSize: 18, color: '#333', minHeight: 120, textAlignVertical: 'top' },

    // Media Preview
    mediaPreview: { marginTop: 20, borderRadius: 12, overflow: 'hidden', height: 200, backgroundColor: '#000' },
    imagePreview: { width: '100%', height: '100%', resizeMode: 'cover' },
    videoPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    removeMediaBtn: { position: 'absolute', top: 10, right: 10 },

    // Component Buttons
    modalFooter: { position: 'absolute', bottom: 30, left: 20, right: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    mediaActions: { flexDirection: 'row', gap: 20 },
    postButton: { backgroundColor: COLORS.primary, paddingVertical: 12, paddingHorizontal: 30, borderRadius: 25 },
    disabledBtn: { opacity: 0.5 },
    postBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },

    // Caught Up
    caughtUpContainer: { alignItems: 'center', padding: 30, opacity: 0.7 },
    caughtUpText: { marginTop: 10, color: '#666', fontWeight: 'bold' }
});
