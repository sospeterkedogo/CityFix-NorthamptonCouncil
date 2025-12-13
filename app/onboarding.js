import React, { useState, useRef } from 'react';
import {
    View, Text, FlatList, StyleSheet, Dimensions, TouchableOpacity, Image, StatusBar
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS } from '../src/constants/theme';

const { width } = Dimensions.get('window');

const SLIDES = [
    {
        id: '1',
        emoji: '📸',
        title: 'Spot the Issue',
        subtitle: 'See a pothole, graffiti, or fly-tipping? Snap a photo instantly.',
    },
    {
        id: '2',
        emoji: '📍',
        title: 'Pin the Location',
        subtitle: 'Our GPS integration pinpoints the exact location for our engineers.',
    },
    {
        id: '3',
        emoji: '✅',
        title: 'Track the Fix',
        subtitle: 'Get live updates as our team resolves the issue in your community.',
    },
];

export default function OnboardingScreen() {
    const router = useRouter();
    const [currentIndex, setCurrentIndex] = useState(0);
    const ref = useRef(null);

    const handleFinish = async () => {
        await AsyncStorage.setItem('hasOnboarded', 'true');
        router.replace('/(auth)'); // Go to Welcome Screen
    };

    const nextSlide = () => {
        const nextSlideIndex = currentIndex + 1;
        if (nextSlideIndex < SLIDES.length) {
            const offset = nextSlideIndex * width;
            ref?.current?.scrollToOffset({ offset });
            setCurrentIndex(nextSlideIndex);
        } else {
            handleFinish();
        }
    };

    const Slide = ({ item }) => (
        <View style={styles.slide}>
            <Text style={styles.emoji}>{item.emoji}</Text>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.subtitle}>{item.subtitle}</Text>
        </View>
    );

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />
            <FlatList
                ref={ref}
                data={SLIDES}
                renderItem={({ item }) => <Slide item={item} />}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={(e) => {
                    const contentOffsetX = e.nativeEvent.contentOffset.x;
                    const currentIndex = Math.round(contentOffsetX / width);
                    setCurrentIndex(currentIndex);
                }}
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

                {/* Buttons */}
                <View style={styles.btnWrapper}>
                    {currentIndex === SLIDES.length - 1 ? (
                        <TouchableOpacity style={styles.btn} onPress={handleFinish}>
                            <Text style={styles.btnText}>GET STARTED</Text>
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity style={styles.btn} onPress={nextSlide}>
                            <Text style={styles.btnText}>NEXT</Text>
                        </TouchableOpacity>
                    )}

                    <TouchableOpacity onPress={handleFinish} style={{ marginTop: 20 }}>
                        <Text style={{ color: 'rgba(255,255,255,0.7)' }}>Skip</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.primary },
    slide: { width, alignItems: 'center', justifyContent: 'center', padding: 20 },
    emoji: { fontSize: 100, marginBottom: 40 },
    title: { fontSize: 32, fontWeight: 'bold', color: 'white', marginBottom: 10, textAlign: 'center' },
    subtitle: { fontSize: 16, color: 'rgba(255,255,255,0.8)', textAlign: 'center', lineHeight: 24, maxWidth: '80%' },
    footer: { height: 200, justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 50 },
    pagination: { flexDirection: 'row', justifyContent: 'center', height: 20 },
    dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: 'rgba(255,255,255,0.3)', marginHorizontal: 5 },
    activeDot: { backgroundColor: 'white' },
    btnWrapper: { alignItems: 'center' },
    btn: { backgroundColor: 'white', paddingVertical: 15, paddingHorizontal: 50, borderRadius: 30 },
    btnText: { color: COLORS.primary, fontWeight: 'bold', fontSize: 16 },
});