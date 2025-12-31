import React, { useState, useCallback, useRef } from 'react';
import { View, SectionList, FlatList, Text, StyleSheet, SafeAreaView, StatusBar, TouchableOpacity, Modal, TextInput, Image, Alert } from 'react-native';
import { useFocusEffect } from 'expo-router'; // Add useFocusEffect
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { COLORS, STYLES } from '../../src/constants/theme';
import { SocialService } from '../../src/services/socialService';
import { ImageService } from '../../src/services/ImageService';
import FeedCard from '../../src/components/FeedCard';
import Toast from '../../src/components/Toast';
import { useAuth } from '../../src/context/AuthContext';

export default function HomeScreen() {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('neighborhood'); // 'official' or 'neighborhood'
    const [feed, setFeed] = useState([]);
    const [loading, setLoading] = useState(false);
    const [toastVisible, setToastVisible] = useState(false);

    // Create Post State
    const [showPostModal, setShowPostModal] = useState(false);
    const [postText, setPostText] = useState('');
    const [postMedia, setPostMedia] = useState(null); // URI
    const [mediaType, setMediaType] = useState('image'); // 'image' | 'video' | 'text'
    const [uploading, setUploading] = useState(false);

    const sectionListRef = useRef(null);

    useFocusEffect(
        useCallback(() => {
            loadFeed();
        }, [activeTab]) // Reload when tab changes OR when focused
    );

    const loadFeed = async () => {
        setLoading(true);
        setFeed([]); // Clear old

        let result;
        if (activeTab === 'official') {
            result = await SocialService.getVerifiedFeed(); // Your old logic
        } else {
            result = await SocialService.getNeighborhoodFeed(); // The new logic
        }
        setFeed(result.data);
        setLoading(false);
    };

    // --- POST CREATION LOGIC ---
    const pickMedia = async (type) => {
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: type === 'video' ? ImagePicker.MediaTypeOptions.Videos : ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 0.5,
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
            allowsEditing: true,
            quality: 0.5,
        });

        if (!result.canceled) {
            setPostMedia(result.assets[0].uri);
            setMediaType('image');
        }
    };

    const handlePost = async () => {
        if (!postText.trim() && !postMedia) return alert("Please add some text or media!");
        if (uploading) return;

        setUploading(true);
        try {
            // 1. Get Location
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') return alert("Permission denied");
            let loc = await Location.getCurrentPositionAsync({});

            // 2. Upload Media if exists
            let downloadUrl = null;
            if (postMedia) {
                const ext = mediaType === 'video' ? 'mp4' : 'jpg';
                const path = `posts/${user.uid}/${Date.now()}.${ext}`;
                downloadUrl = await ImageService.uploadImage(postMedia, path);
            }

            // 3. Create Post
            await SocialService.createPost(
                user.uid,
                user.photoURL || null, // Pass explicit avatar if exists
                user.displayName || user.email.split('@')[0],
                user.email,
                postText,
                downloadUrl, // Can be null for text-only
                { latitude: loc.coords.latitude, longitude: loc.coords.longitude },
                postMedia ? mediaType : 'text'
            );

            setShowPostModal(false);
            setPostText('');
            setPostMedia(null);
            setMediaType('image');
            loadFeed(); // Refresh
        } catch (error) {
            console.error("Post creation failed:", error);
            alert("Failed to post: " + error.message);
        } finally {
            setUploading(false);
        }
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#f8f9fa' }}>

            {/* MAIN CONTENT CONTAINER */}
            <View style={{ flex: 1, maxWidth: 600, width: '100%', alignSelf: 'center' }}>

                {/* FEED LIST */}
                <SectionList
                    ref={sectionListRef}
                    sections={[{ data: feed }]}
                    onEndReached={() => {
                        if (feed.length > 0 && !loading) {
                            setToastVisible(true);
                            sectionListRef.current?.scrollToLocation({ sectionIndex: 0, itemIndex: 0, animated: true });
                        }
                    }}
                    onEndReachedThreshold={0.1}
                    renderItem={({ item }) => <FeedCard ticket={item} />}
                    renderSectionHeader={() => (
                        <View style={{ backgroundColor: '#f8f9fa', paddingBottom: 10 }}>
                            <View style={styles.tabs}>
                                <TouchableOpacity onPress={() => setActiveTab('official')} style={[styles.tab, activeTab === 'official' && styles.activeTab]}>
                                    <Text style={[styles.tabText, activeTab === 'official' && styles.activeTabText]}>Council Fixes</Text>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => setActiveTab('neighborhood')} style={[styles.tab, activeTab === 'neighborhood' && styles.activeTab]}>
                                    <Text style={[styles.tabText, activeTab === 'neighborhood' && styles.activeTabText]}>Neighborhood</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}
                    stickySectionHeadersEnabled={true}
                    ListHeaderComponent={
                        <View style={styles.header}>
                            <Text style={styles.title}>City Fix</Text>
                        </View>
                    }
                    onRefresh={loadFeed}
                    refreshing={loading}
                    contentContainerStyle={{ paddingBottom: 100 }}
                    style={{ flex: 1 }}
                />

                {/* FLOAT BUTTON (Only on Neighborhood tab) */}
                {activeTab === 'neighborhood' && (
                    <TouchableOpacity style={styles.fab} onPress={() => setShowPostModal(true)}>
                        <Text style={{ fontSize: 24 }}>📷</Text>
                    </TouchableOpacity>
                )}

            </View>

            <Modal visible={showPostModal} animationType="slide">
                <SafeAreaView style={{ flex: 1 }}>
                    <View style={{ flex: 1, maxWidth: 600, width: '100%', alignSelf: 'center', padding: 20 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
                            <TouchableOpacity onPress={() => setShowPostModal(false)} style={{ padding: 10 }}>
                                <Text style={{ fontSize: 18, color: COLORS.primary }}>Back</Text>
                            </TouchableOpacity>
                            <Text style={{ fontSize: 20, fontWeight: 'bold', marginLeft: 10 }}>New Community Post</Text>
                        </View>

                        <TextInput
                            placeholder="What's happening nearby?"
                            value={postText} onChangeText={setPostText}
                            style={styles.input}
                            multiline
                        />

                        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 15 }}>
                            <TouchableOpacity onPress={takePhoto} style={styles.mediaBtn}>
                                <Text>📷 Camera</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => pickMedia('image')} style={styles.mediaBtn}>
                                <Text>🖼️ Gallery</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => pickMedia('video')} style={styles.mediaBtn}>
                                <Text>🎥 Video</Text>
                            </TouchableOpacity>
                        </View>

                        {postMedia && (
                            <View style={{ marginBottom: 15 }}>
                                {mediaType === 'video' ? (
                                    <View style={{ height: 200, backgroundColor: 'black', justifyContent: 'center', alignItems: 'center' }}>
                                        <Text style={{ color: 'white' }}>Video Selected</Text>
                                    </View>
                                ) : (
                                    <Image source={{ uri: postMedia }} style={{ width: '100%', height: 200, borderRadius: 8 }} />
                                )}
                                <TouchableOpacity onPress={() => setPostMedia(null)} style={{ position: 'absolute', top: 5, right: 5, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 15, padding: 5 }}>
                                    <Text style={{ color: 'white' }}>✕</Text>
                                </TouchableOpacity>
                            </View>
                        )}

                        <View style={{ alignItems: 'flex-end', marginTop: 20 }}>
                            <TouchableOpacity onPress={handlePost} style={[styles.postBtn, uploading && { opacity: 0.7 }]} disabled={uploading}>
                                <Text style={{ color: 'white' }}>{uploading ? 'Uploading...' : 'Post'}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </SafeAreaView>
            </Modal>

            <Toast visible={toastVisible} message="You're all caught up!" onHide={() => setToastVisible(false)} />

        </SafeAreaView >
    );
}

const styles = StyleSheet.create({
    header: { backgroundColor: 'white', padding: 15, alignItems: 'center' },
    title: { fontSize: 22, fontWeight: 'bold', color: COLORS.primary, marginBottom: 10 },
    tabs: { flexDirection: 'row', backgroundColor: '#eee', borderRadius: 8, padding: 3 },
    tab: { paddingVertical: 8, paddingHorizontal: 20, borderRadius: 6 },
    activeTab: { backgroundColor: 'white', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 2 },
    tabText: { color: '#888', fontWeight: 'bold' },
    activeTabText: { color: COLORS.primary },

    fab: { position: 'absolute', bottom: 90, right: 20, width: 60, height: 60, borderRadius: 30, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', elevation: 5 },

    input: { borderWidth: 1, borderColor: '#ddd', padding: 15, borderRadius: 8, minHeight: 100, marginBottom: 15 },
    mediaBtn: { padding: 10, backgroundColor: '#f0f0f0', borderRadius: 8, flex: 1, alignItems: 'center' },
    postBtn: { backgroundColor: COLORS.primary, padding: 10, borderRadius: 8, paddingHorizontal: 20 }
});