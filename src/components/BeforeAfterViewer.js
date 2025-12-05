import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
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
            <Image source={{ uri: url }} style={styles.media} resizeMode="contain" />
          )}
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      
      {/* LEFT SIDE: BEFORE (Citizen) */}
      <View style={styles.half}>
        {renderMedia(beforeMedia[beforeIndex], "BEFORE (Citizen)")}
        
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

      {/* RIGHT SIDE: AFTER (Engineer) */}
      <View style={styles.half}>
        {renderMedia(afterMedia, "AFTER (Engineer)")}
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    height: 400, // Fixed height for the viewer area
    backgroundColor: '#000',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: SPACING.m,
  },
  half: {
    flex: 1,
    padding: 10,
    justifyContent: 'center',
  },
  divider: {
    width: 2,
    backgroundColor: '#333',
  },
  mediaContainer: {
    flex: 1,
    width: '100%',
  },
  label: {
    color: '#fff',
    fontWeight: 'bold',
    marginBottom: 5,
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 4,
    borderRadius: 4,
    alignSelf: 'center',
  },
  touchable: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  media: {
    width: '100%',
    height: '100%',
    backgroundColor: '#222',
  },
  emptyBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#222',
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