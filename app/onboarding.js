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
            <View style={[styles.card, isDesktop && { maxWidth: 600, height: '85%' }]}>
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
        <View style={styles.mainContainer}>
            <StatusBar barStyle="light-content" />
            {/* Background Header Strip */}
            <View style={styles.bgHeader} />

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

                {/* Action Area */}
                <View style={[styles.btnWrapper, currentIndex === SLIDES.length - 1 && { width: '100%' }]}>

                    {/* Row Container for Buttons */}
                    <View style={{ flexDirection: 'row', gap: 15, width: '100%', justifyContent: 'center' }}>

                        {/* BACK BUTTON (Hidden on first slide) */}
                        <TouchableOpacity
                            style={[
                                styles.btn,
                                styles.btnSecondary,
                                currentIndex === 0 && { borderColor: 'transparent' } // Hide border if disabled
                            ]}
                            onPress={prevSlide}
                            disabled={currentIndex === 0}
                        >
                            <Text style={[
                                styles.btnText,
                                styles.btnTextSecondary,
                                currentIndex === 0 && { color: 'transparent' } // Hide text
                            ]}>BACK</Text>
                        </TouchableOpacity>

                        {/* NEXT / FINISH BUTTON */}
                        {currentIndex === SLIDES.length - 1 ? (
                            <TouchableOpacity style={[styles.btn, styles.btnPrimary]} onPress={handleFinish}>
                                <Text style={styles.btnText}>START DEMO</Text>
                            </TouchableOpacity>
                        ) : (
                            <TouchableOpacity style={[styles.btn, styles.btnPrimary]} onPress={nextSlide}>
                                <Text style={styles.btnText}>NEXT</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* LAST SLIDE EXTRAS */}
                    {currentIndex === SLIDES.length - 1 && (
                        <View style={styles.toggleRow}>
                            <Switch
                                value={dontShowAgain}
                                onValueChange={setDontShowAgain}
                                trackColor={{ false: "#cbd5e1", true: COLORS.action }}
                                thumbColor={"#f8fafc"}
                            />
                            <Text style={styles.toggleText}>Don't show this intro next time</Text>
                        </View>
                    )}

                    {/* SKIP BUTTON (Hidden on last slide) */}
                    {currentIndex !== SLIDES.length - 1 && (
                        <TouchableOpacity onPress={handleFinish} style={{ marginTop: 20 }}>
                            <Text style={styles.skipText}>Skip Intro</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    mainContainer: { flex: 1, backgroundColor: '#F8FAFC' },
    bgHeader: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '45%', // Cover top half roughly
        backgroundColor: COLORS.primary,
    },
    slide: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },

    // Card Style
    card: {
        width: '100%',
        height: '100%',
        backgroundColor: 'white',
        borderRadius: 24,
        padding: 20,
        paddingTop: 40,
        alignItems: 'center',
        // Shadow
        shadowColor: "#64748B",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 10,
    },

    imageContainer: { width: '100%', marginTop: 'auto', marginBottom: 20, justifyContent: 'center', alignItems: 'center' },
    image: { width: '100%', height: '100%' },

    textContainer: { width: '100%', alignItems: 'center', marginBottom: 20 },
    title: { fontSize: 28, fontWeight: '800', color: '#1E293B', marginBottom: 15, textAlign: 'center' },
    subtitle: { fontSize: 16, color: '#64748B', textAlign: 'center', lineHeight: 24 },

    footer: { padding: 20, paddingBottom: 40, alignItems: 'center' },
    pagination: { flexDirection: 'row', justifyContent: 'center', height: 20, marginBottom: 20 },
    dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#CBD5E1', marginHorizontal: 4 }, // Light grey inactive
    activeDot: { backgroundColor: COLORS.primary, width: 24 }, // Primary active, elongated

    btnWrapper: { alignItems: 'center', width: '100%' },
    btn: { flex: 1, paddingVertical: 16, borderRadius: 14, alignItems: 'center', justifyContent: 'center', maxWidth: 200 },
    btnPrimary: {
        backgroundColor: COLORS.action,
        shadowColor: COLORS.action,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    btnSecondary: { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#94a3b8' },
    btnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
    btnTextSecondary: { color: '#64748B' },

    toggleRow: { flexDirection: 'row', alignItems: 'center', marginTop: 20, gap: 10 },
    toggleText: { color: '#64748B', fontSize: 13, fontWeight: '600' },
    skipText: { color: '#94a3b8', fontSize: 14, fontWeight: '600', textDecorationLine: 'underline' }
});