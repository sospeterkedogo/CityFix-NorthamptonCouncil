import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { Video, ResizeMode } from 'expo-av';
import { COLORS, SPACING, STYLES } from '../constants/theme';

export default function BeforeAfterViewer({ beforeMedia = [], afterMedia, onOpenMedia }) {
  // afterMedia is a single string (URL) based on our current data model
  // beforeMedia is an array of strings (URLs)

  const [beforeIndex, setBeforeIndex] = useState(0);

  const renderMedia = (url, label) => {
    if (!url) return (
      <View style={styles.emptyBox}>
        <Text style={styles.emptyText}>No {label} Evidence</Text>
      </View>
    );

    const isVideo = url.includes('video') || url.includes('.mp4');

    return (
      <View style={styles.mediaContainer}>
        <Text style={styles.label}>{label}</Text>
        <TouchableOpacity
          style={styles.touchable}
          onPress={() => onOpenMedia(url)}
        >
          {isVideo ? (
            <Video
              style={styles.media}
              source={{ uri: url }}
              useNativeControls
              resizeMode={ResizeMode.CONTAIN}
              shouldPlay={false} // Don't auto-play in comparison mode
            />
          ) : (
            <ExpoImage source={{ uri: url }} style={styles.media} contentFit="contain" transition={200} />
          )}
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>

      {/* LEFT SIDE: BEFORE */}
      <View style={styles.half}>
        {renderMedia(beforeMedia[beforeIndex], "BEFORE")}

        {/* Simple pagination for multiple before photos */}
        {beforeMedia.length > 1 && (
          <View style={styles.pagination}>
            <TouchableOpacity
              onPress={() => setBeforeIndex(i => Math.max(0, i - 1))}
              disabled={beforeIndex === 0}
            >
              <Text style={styles.arrow}>‹</Text>
            </TouchableOpacity>
            <Text style={styles.pageText}>{beforeIndex + 1}/{beforeMedia.length}</Text>
            <TouchableOpacity
              onPress={() => setBeforeIndex(i => Math.min(beforeMedia.length - 1, i + 1))}
              disabled={beforeIndex === beforeMedia.length - 1}
            >
              <Text style={styles.arrow}>›</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* DIVIDER */}
      <View style={styles.divider} />

      {/* RIGHT SIDE: AFTER */}
      <View style={styles.half}>
        {renderMedia(afterMedia, "AFTER")}
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    height: 400,
    backgroundColor: 'transparent', // Blend in
    overflow: 'hidden',
    // marginBottom: SPACING.m, // Removed to tighten layout
  },
  half: {
    flex: 1,
    padding: 0, // No padding
    justifyContent: 'center',
  },
  divider: {
    width: 2,
    backgroundColor: '#fff', // White divider if background is white/light
  },
  mediaContainer: {
    flex: 1,
    width: '100%',
    overflow: 'hidden',
  },
  label: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 10,
    marginBottom: 5,
    textAlign: 'center',
    position: 'absolute', // Overlay properly
    top: 10,
    left: 10,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    zIndex: 10,
  },
  touchable: {
    flex: 1,
  },
  media: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f0f0f0', // Light placeholder
  },
  emptyBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
  },
  emptyText: {
    color: '#ccc',
    fontSize: 12,
  },
  emptyText: {
    color: '#666',
    fontStyle: 'italic',
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 5,
    gap: 15,
  },
  arrow: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
  pageText: {
    color: '#999',
    fontSize: 12,
  }
});