import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Platform } from 'react-native';
import { COLORS } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';

export default function Toast({ message, visible, onHide }) {
    const opacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            // Fade In
            Animated.timing(opacity, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true
            }).start();

            // Auto Hide
            const timer = setTimeout(() => {
                hide();
            }, 3000);

            return () => clearTimeout(timer);
        } else {
            hide();
        }
    }, [visible]);

    const hide = () => {
        Animated.timing(opacity, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true
        }).start(() => {
            if (onHide) onHide();
        });
    };

    if (!visible && opacity._value === 0) return null;

    return (
        <Animated.View style={[styles.container, { opacity }]}>
            <View style={styles.content}>
                <Ionicons name="checkmark-circle" size={24} color="white" />
                <Text style={styles.text}>{message}</Text>
            </View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: 100, // Above tab bar
        left: 20,
        right: 20,
        alignItems: 'center',
        zIndex: 9999,
        pointerEvents: 'none' // Let touches pass through if needed, but we want it visible
    },
    content: {
        backgroundColor: 'rgba(0,0,0,0.8)',
        borderRadius: 25,
        paddingHorizontal: 20,
        paddingVertical: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5
    },
    text: {
        color: 'white',
        fontWeight: '600',
        fontSize: 14
    }
});
