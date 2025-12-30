import React, { useState, useRef, useEffect } from 'react';
import {
    View, Text, FlatList, StyleSheet, Dimensions, TouchableOpacity, StatusBar, Switch, Image, Platform, useWindowDimensions, Modal, Animated
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
        subtitle: 'The all-in-one platform for city maintenance. This demo lets you test the app from four different perspectives.',
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
        image: require('../assets/images/onboarding/field_engineer.png'),
        title: 'Field Engineer',
        subtitle: 'Receive push notifications for new jobs. Sort tasks by GPS proximity, upload "After" photos, and resolve tickets on-site.',
    },
    {
        id: '5',
        image: require('../assets/images/onboarding/qa_analyst.png'),
        title: 'QA Analyst',
        subtitle: 'Audit completed jobs, verify fixes with a digital checklist, and ensure city standards are met before closing tickets.',
    },
];

export default function OnboardingScreen() {
    const router = useRouter();
    const { width, height } = useWindowDimensions(); // Use hook for dynamic resizing
    const [currentIndex, setCurrentIndex] = useState(0);
    const [dontShowAgain, setDontShowAgain] = useState(false);

    // Animation Refs
    const scrollX = useRef(new Animated.Value(0)).current;
    const slidesRef = useRef(null);

    // Desktop constraint
    const isDesktop = width > 768;
    const slideWidth = width;
    const imageHeight = isDesktop ? height * 0.5 : height * 0.55;

    const handleFinish = async () => {
        if (dontShowAgain) {
            await AsyncStorage.setItem('hasOnboarded', 'true');
        } else {
            await AsyncStorage.removeItem('hasOnboarded');
        }
        router.replace('/(auth)/signup');
    };

    const nextSlide = () => {
        const nextSlideIndex = currentIndex + 1;
        if (nextSlideIndex < SLIDES.length) {
            slidesRef?.current?.scrollToIndex({ index: nextSlideIndex, animated: true });
            setCurrentIndex(nextSlideIndex);
        } else {
            handleFinish();
        }
    };

    const prevSlide = () => {
        const prevSlideIndex = currentIndex - 1;
        if (prevSlideIndex >= 0) {
            slidesRef?.current?.scrollToIndex({ index: prevSlideIndex, animated: true });
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

    // Button Animations
    // 0 -> 1 : First Slide Buttons Fade OUT
    // 0 -> 1 : Next/Back Buttons Fade IN
    const firstSlideOpacity = scrollX.interpolate({
        inputRange: [0, width * 0.5],
        outputRange: [1, 0],
        extrapolate: 'clamp'
    });

    const otherSlidesOpacity = scrollX.interpolate({
        inputRange: [0, width * 0.5],
        outputRange: [0, 1],
        extrapolate: 'clamp'
    });

    return (
        <View style={styles.mainContainer}>
            <StatusBar barStyle="light-content" />
            <View style={styles.bgHeader} />

            <Animated.FlatList
                ref={slidesRef}
                data={SLIDES}
                style={{ flex: 1 }}
                renderItem={({ item }) => <Slide item={item} />}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                keyExtractor={(item) => item.id}
                onScroll={Animated.event(
                    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
                    { useNativeDriver: false }
                )}
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
                {/* Animated Pagination Dots */}
                <View style={styles.pagination}>
                    {SLIDES.map((_, index) => {
                        const inputRange = [(index - 1) * width, index * width, (index + 1) * width];
                        const dotWidth = scrollX.interpolate({
                            inputRange,
                            outputRange: [10, 30, 10], // Grow to 30 when active
                            extrapolate: 'clamp',
                        });
                        const dotColor = scrollX.interpolate({
                            inputRange,
                            outputRange: ['#CBD5E1', COLORS.primary, '#CBD5E1'],
                            extrapolate: 'clamp',
                        });

                        return (
                            <Animated.View
                                key={index}
                                style={[styles.dot, { width: dotWidth, backgroundColor: dotColor }]}
                            />
                        );
                    })}
                </View>

                {/* ANIMATED BUTTON LAYERS */}
                <View style={[styles.btnWrapper, { width: '100%' }]}>

                    {/* Layer 1: First Slide Buttons */}
                    <Animated.View
                        style={[
                            styles.btnLayer,
                            { opacity: firstSlideOpacity },
                            currentIndex > 0 && { pointerEvents: 'none' } // Disable clicks if not first slide
                        ]}
                    >
                        <View style={{ flexDirection: 'row', gap: 15, width: '100%', maxWidth: 600, justifyContent: 'center' }}>
                            <TouchableOpacity
                                style={[styles.btn, styles.btnSecondary]}
                                onPress={handleFinish}
                            >
                                <Text style={[styles.btnText, styles.btnTextSecondary]}>SKIP TO SIGN UP</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.btn, styles.btnPrimary]}
                                onPress={nextSlide}
                            >
                                <Text style={styles.btnText}>GET STARTED</Text>
                            </TouchableOpacity>
                        </View>
                    </Animated.View>

                    {/* Layer 2: Next/Back Buttons */}
                    <Animated.View
                        style={[
                            styles.btnLayer,
                            { opacity: otherSlidesOpacity },
                            currentIndex === 0 && { pointerEvents: 'none' } // Disable clicks if first slide
                        ]}
                    >
                        <View style={{ flexDirection: 'row', gap: 15, width: '100%', justifyContent: 'center' }}>
                            <TouchableOpacity
                                style={[styles.btn, styles.btnSecondary]}
                                onPress={prevSlide}
                            >
                                <Text style={[styles.btnText, styles.btnTextSecondary]}>BACK</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.btn, styles.btnPrimary]}
                                onPress={currentIndex === SLIDES.length - 1 ? handleFinish : nextSlide}
                            >
                                <Text style={styles.btnText}>
                                    {currentIndex === SLIDES.length - 1 ? "START DEMO" : "NEXT"}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </Animated.View>
                </View>

                {/* Toggle - Only show when reached end */}
                <View style={{ height: 40, marginTop: 10 }}>
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
                </View>

            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    mainContainer: { flex: 1, backgroundColor: '#F8FAFC' },
    bgHeader: {
        position: 'absolute', top: 0, left: 0, right: 0, height: '45%', backgroundColor: COLORS.primary,
    },
    slide: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
    card: {
        width: '100%', height: '100%', backgroundColor: 'white', borderRadius: 24, padding: 20, paddingTop: 40, alignItems: 'center',
        shadowColor: "#64748B", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 10,
    },
    imageContainer: { width: '100%', marginTop: 'auto', marginBottom: 20, justifyContent: 'center', alignItems: 'center' },
    image: { width: '100%', height: '100%' },
    textContainer: { width: '100%', alignItems: 'center', marginBottom: 20 },
    title: { fontSize: 28, fontWeight: '800', color: '#1E293B', marginBottom: 20, textAlign: 'center' },
    subtitle: { fontSize: 16, color: '#64748B', textAlign: 'center', lineHeight: 24 },
    footer: { padding: 20, paddingBottom: 40, alignItems: 'center' },
    pagination: { flexDirection: 'row', justifyContent: 'center', height: 20, marginBottom: 20 },
    dot: { height: 8, borderRadius: 4, marginHorizontal: 4 }, // Width is handled by animation

    btnWrapper: { alignItems: 'center', width: '100%', height: 60, position: 'relative' }, // Fixed height for absolute buttons
    btnLayer: {
        position: 'absolute', left: 0, right: 0, top: 0, // Stack on top of each other
        width: '100%',
        alignItems: 'center'
    },
    btn: { paddingVertical: 16, borderRadius: 14, alignItems: 'center', justifyContent: 'center', flexGrow: 1 },
    btnPrimary: {
        backgroundColor: COLORS.action, shadowColor: COLORS.action, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4,
    },
    btnSecondary: { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#94a3b8' },
    btnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
    btnTextSecondary: { color: '#64748B' },
    toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    toggleText: { color: '#64748B', fontSize: 13, fontWeight: '600' },
});