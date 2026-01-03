import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, Modal, TouchableOpacity, StyleSheet, Image, ActivityIndicator, Platform, SafeAreaView
} from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { COLORS } from '../constants/theme';

export default function MediaGalleryModal({ visible, onClose, mediaUrls = [], initialIndex = 0 }) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [loading, setLoading] = useState(true);
  const videoRef = useRef(null);

  useEffect(() => {
    if (visible) {
      setCurrentIndex(initialIndex);
      setLoading(true);
    }
  }, [visible, initialIndex]);

  useEffect(() => {
    setLoading(true);
  }, [currentIndex]);

  if (!visible || mediaUrls.length === 0) return null;

  const currentUrl = mediaUrls[currentIndex];
  if (!currentUrl) return null; // Safe guard
  const isVideo = currentUrl.includes('video') || currentUrl.includes('.mp4') || currentUrl.includes('.mov');

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % mediaUrls.length);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + mediaUrls.length) % mediaUrls.length);
  };

  return (
    <Modal visible={visible} transparent={true} animationType="fade" onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>

        {/* --- TOP TOOLBAR (Controls at the Top) --- */}
        <View style={styles.topToolbar}>
          <Text style={styles.counterText}>
            {currentIndex + 1} / {mediaUrls.length}
          </Text>

          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Ionicons name="close" size={24} color="white" />
          </TouchableOpacity>
        </View>

        {/* --- MIDDLE CONTENT AREA --- */}
        <View style={styles.contentArea}>

          {/* Left Arrow (Fixed to Edge) */}
          {mediaUrls.length > 1 && (
            <TouchableOpacity style={[styles.navBtn, styles.leftBtn]} onPress={handlePrev}>
              <Text style={styles.arrowText}>‹</Text>
            </TouchableOpacity>
          )}

          {/* Media Player */}
          <View style={styles.mediaWrapper}>
            {isVideo ? (
              <Video
                ref={videoRef}
                style={styles.media}
                source={{ uri: currentUrl }}
                useNativeControls={true} // Enables Timeline & Scrubbing
                resizeMode={ResizeMode.CONTAIN}
                isLooping={false}
                shouldPlay={true}
                onLoad={() => setLoading(false)}
              />
            ) : (
              <Image
                source={{ uri: currentUrl }}
                style={styles.media}
                resizeMode="contain"
                onLoadEnd={() => setLoading(false)}
              />
            )}

            {loading && (
              <View style={styles.loader}>
                <ActivityIndicator size="large" color={COLORS.action} />
              </View>
            )}
          </View>

          {/* Right Arrow (Fixed to Edge) */}
          {mediaUrls.length > 1 && (
            <TouchableOpacity style={[styles.navBtn, styles.rightBtn]} onPress={handleNext}>
              <Text style={styles.arrowText}>›</Text>
            </TouchableOpacity>
          )}

        </View>

        {/* --- BOTTOM SPACER (To ensure timeline isn't cut off) --- */}
        <View style={styles.bottomSpacer} />

      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
    justifyContent: 'space-between', // Pushes Header to top, Spacer to bottom
  },

  // TOP BAR
  topToolbar: {
    height: 60,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    backgroundColor: 'rgba(0,0,0,0.8)', // Semi-transparent header
    zIndex: 10,
  },
  counterText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  closeBtn: {
    padding: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 8,
  },
  controlText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },

  // MIDDLE AREA
  contentArea: {
    flex: 1, // Takes up all remaining vertical space
    flexDirection: 'row', // Allows arrows to sit on sides
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  mediaWrapper: {
    flex: 1, // Takes up center space between arrows
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 10, // Prevent touching arrows
  },
  media: {
    width: '100%',
    height: '100%',
    backgroundColor: 'black', // Visual check for boundaries
  },

  // NAVIGATION ARROWS
  navBtn: {
    width: 50,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20,
    backgroundColor: 'transparent', // Make the click area large but invisible
  },
  leftBtn: { marginRight: 5 },
  rightBtn: { marginLeft: 5 },
  arrowText: {
    color: 'white',
    fontSize: 50,
    fontWeight: '300',
    backgroundColor: 'rgba(0,0,0,0.5)', // Circle background for just the arrow
    width: 50, height: 50,
    textAlign: 'center',
    lineHeight: 50,
    borderRadius: 25,
    overflow: 'hidden',
  },

  // LOADERS
  loader: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // SPACER
  bottomSpacer: {
    height: 20, // Small buffer at bottom for native iOS swipe bar / Android nav
    backgroundColor: 'black',
  }
});