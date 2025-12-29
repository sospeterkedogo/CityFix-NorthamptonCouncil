import React, { useState, useRef, useEffect } from 'react';
import {
    View, Text, FlatList, StyleSheet, Dimensions, TouchableOpacity, StatusBar, Switch, Image, Platform, useWindowDimensions
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS } from '../src/constants/theme';

// --- SLIDES DATA ---
const SLIDES = [
    {
        id: '1',
        image: require('../assets/images/onboarding/app_icon.png'),
        title: 'Welcome to City Fix',
        subtitle: 'The all-in-one platform for city maintenance. This demo lets you test the app from three different perspectives.',
    },
    {
        id: '2',
        image: require('../assets/images/onboarding/citizen.png'),
        title: 'Citizen View',
        subtitle: 'Report potholes, broken lights, and graffiti. Pin the location on a map, upload photos, and track the fix in real-time.',
    },
    {
        id: '3',
        image: require('../assets/images/onboarding/dispatcher.png'),
        title: 'Dispatcher Console',
        subtitle: 'The Command Center. View incoming tickets on a live map, detect duplicates, and assign jobs to the nearest field engineer.',
    },
    {
        id: '4',
        image: require('../assets/images/onboarding/engineer.png'),
        title: 'Field Engineer',
        subtitle: 'Receive push notifications for new jobs. Sort tasks by GPS proximity, upload "After" photos, and resolve tickets on-site.',
    },
];

export default function OnboardingScreen() {
    const router = useRouter();
    const { width, height } = useWindowDimensions(); // Use hook for dynamic resizing
    const [currentIndex, setCurrentIndex] = useState(0);
    const [dontShowAgain, setDontShowAgain] = useState(false);
    const ref = useRef(null);

    // Desktop constraint: maintain a max width for the slide content so it doesn't stretch too wide
    const isDesktop = width > 768;
    const slideWidth = width;

    // Calculate image height dynamically based on screen space
    // On mobile, we want 60-70% of screen. On desktop, maybe less to fit content.
    const imageHeight = isDesktop ? height * 0.5 : height * 0.55;

    const handleFinish = async () => {
        if (dontShowAgain) {
            await AsyncStorage.setItem('hasOnboarded', 'true');
        } else {
            await AsyncStorage.removeItem('hasOnboarded');
        }
        router.replace('/(auth)/login');
    };

    const nextSlide = () => {
        const nextSlideIndex = currentIndex + 1;
        if (nextSlideIndex < SLIDES.length) {
            ref?.current?.scrollToIndex({ index: nextSlideIndex, animated: true });
            setCurrentIndex(nextSlideIndex);
        } else {
            handleFinish();
        }
    };

    const prevSlide = () => {
        const prevSlideIndex = currentIndex - 1;
        if (prevSlideIndex >= 0) {
            ref?.current?.scrollToIndex({ index: prevSlideIndex, animated: true });
            setCurrentIndex(prevSlideIndex);
        }
    };

    const Slide = ({ item }) => (
        <View style={[styles.slide, { width: slideWidth }]}>
            <View style={[styles.contentContainer, isDesktop && { maxWidth: 600 }]}>
                <View style={styles.textContainer}>
                    <Text style={styles.title}>{item.title}</Text>
                    <Text style={styles.subtitle}>{item.subtitle}</Text>
                </View>
                <View style={[styles.imageContainer, { height: imageHeight }]}>
                    <Image source={item.image} style={styles.image} resizeMode="contain" />
                </View>
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />
            <FlatList
                ref={ref}
                data={SLIDES}
                style={{ flex: 1 }}
                renderItem={({ item }) => <Slide item={item} />}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                keyExtractor={(item) => item.id}
                onMomentumScrollEnd={(e) => {
                    const contentOffsetX = e.nativeEvent.contentOffset.x;
                    const index = Math.round(contentOffsetX / width);
                    setCurrentIndex(index);
                }}
                getItemLayout={(data, index) => (
                    { length: width, offset: width * index, index }
                )}
            />

            {/* FIXED FOOTER */}
            <View style={styles.footer}>
                {/* Pagination Dots */}
                <View style={styles.pagination}>
                    {SLIDES.map((_, index) => (
                        <View
                            key={index}
                            style={[
                                styles.dot,
                                currentIndex === index && styles.activeDot,
                            ]}
                        />
                    ))}
                </View>

                {/* Buttons */}
                <View style={styles.btnRow}>
                    {/* BACK BUTTON */}
                    <TouchableOpacity
                        style={[
                            styles.btn,
                            styles.btnSecondary,
                            currentIndex === 0 && { borderColor: 'rgba(255,255,255,0.3)' } // Dim border
                        ]}
                        onPress={prevSlide}
                        disabled={currentIndex === 0}
                    >
                        <Text style={[
                            styles.btnText,
                            styles.btnTextSecondary,
                            currentIndex === 0 && { color: 'rgba(255,255,255,0.3)' } // Dim text
                        ]}>BACK</Text>
                    </TouchableOpacity>

                    {/* NEXT / START BUTTON */}
                    <TouchableOpacity style={[styles.btn, styles.btnPrimary]} onPress={currentIndex === SLIDES.length - 1 ? handleFinish : nextSlide}>
                        <Text style={styles.btnText}>{currentIndex === SLIDES.length - 1 ? "START DEMO" : "NEXT"}</Text>
                    </TouchableOpacity>
                </View>

                {/* Toggle & Options (Last Slide Only) */}
                {currentIndex === SLIDES.length - 1 ? (
                    <View style={styles.optionsRow}>
                        <Switch
                            value={dontShowAgain}
                            onValueChange={setDontShowAgain}
                            trackColor={{ false: "#767577", true: COLORS.action }}
                            thumbColor={dontShowAgain ? "#f4f3f4" : "#f4f3f4"}
                        />
                        <Text style={styles.toggleText}>Don't show next time</Text>
                    </View>
                ) : (
                    <TouchableOpacity onPress={handleFinish} style={styles.skipBtn}>
                        <Text style={styles.skipText}>Skip Intro</Text>
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.primary },
    slide: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    contentContainer: { width: '100%', alignItems: 'center', paddingHorizontal: 20, paddingTop: 60 }, // Added top spacing
    imageContainer: { width: '100%', marginBottom: 25, marginTop: 25, justifyContent: 'center', alignItems: 'center' },
    image: { width: '100%', height: '100%' },
    textContainer: { width: '100%', alignItems: 'center', minHeight: 100 }, // Reserve space for text
    title: { fontSize: 28, fontWeight: 'bold', color: 'white', marginBottom: 25, textAlign: 'center' },
    subtitle: { fontSize: 16, color: 'rgba(255,255,255,0.9)', textAlign: 'center', lineHeight: 24 },

    footer: { padding: 20, paddingBottom: 40, alignItems: 'center', backgroundColor: COLORS.primary }, // Blend with bg
    pagination: { flexDirection: 'row', height: 20, marginBottom: 20 },
    dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.3)', marginHorizontal: 4 },
    activeDot: { backgroundColor: 'white', width: 12, height: 12, borderRadius: 6, marginTop: -2 },

    btnRow: { flexDirection: 'row', width: '100%', maxWidth: 500, justifyContent: 'space-between', gap: 15 },
    btn: { flex: 1, paddingVertical: 15, borderRadius: 30, alignItems: 'center', justifyContent: 'center' },
    btnPrimary: { backgroundColor: 'white' },
    btnSecondary: { backgroundColor: 'transparent', borderWidth: 1, borderColor: 'white' },
    btnText: { color: COLORS.primary, fontWeight: 'bold', fontSize: 16 },
    btnTextSecondary: { color: 'white' },

    optionsRow: { flexDirection: 'row', alignItems: 'center', marginTop: 20, gap: 10 },
    toggleText: { color: 'rgba(255,255,255,0.8)', fontSize: 14 },
    skipBtn: { marginTop: 20 },
    skipText: { color: 'rgba(255,255,255,0.7)', fontSize: 14, textDecorationLine: 'underline' }
});