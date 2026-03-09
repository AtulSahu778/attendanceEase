import React, { useRef, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const PRIVACY_POINTS = [
    {
        icon: 'cloud-offline-outline' as const,
        iconColor: '#22C55E', // Green
        bgColor: 'rgba(34,197,94,0.12)',
        title: 'No External Servers',
        description: 'Data is fetched directly from the college API portal. No data is stored on or routed through any other external servers.',
    },
    {
        icon: 'phone-portrait-outline' as const,
        iconColor: '#3B82F6', // Blue
        bgColor: 'rgba(59,130,246,0.12)',
        title: 'On-Device Storage Only',
        description: 'Your roll number and attendance data remain securely on your device. Nothing is uploaded anywhere.',
    },
    {
        icon: 'analytics-outline' as const,
        iconColor: '#A855F7', // Purple
        bgColor: 'rgba(168,85,247,0.12)',
        title: 'Anonymous Diagnostics',
        description: 'To improve stability, we collect anonymous usage counts (like app opens) and crash reports. We never track your roll number, attendance, or personal behavior.',
    },
    {
        icon: 'shield-checkmark-outline' as const,
        iconColor: '#F59E0B', // Amber
        bgColor: 'rgba(245,158,11,0.12)',
        title: 'No Third-Party Services',
        description: 'No analytics, advertising, or third-party tracking SDKs are used in this application.',
    },
    {
        icon: 'trash-outline' as const,
        iconColor: '#EF4444', // Red
        bgColor: 'rgba(239,68,68,0.12)',
        title: 'Full Data Control',
        description: 'You can delete all stored data at any time from Settings. This atomic action wipes all traces of the app from your device.',
    },
];

function usePressScale(to = 0.95) {
    const scale = useRef(new Animated.Value(1)).current;
    const onPressIn = () => Animated.timing(scale, { toValue: to, duration: 100, useNativeDriver: true }).start();
    const onPressOut = () => Animated.spring(scale, { toValue: 1, damping: 20, useNativeDriver: true }).start();
    return { scale, onPressIn, onPressOut };
}

function useFade(delay = 0) {
    const fade = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        Animated.timing(fade, { toValue: 1, duration: 400, delay, useNativeDriver: true }).start();
    }, []);
    return { opacity: fade };
}

export default function PrivacyScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const backScale = usePressScale();

    const animHeader = useFade(0);
    const animBody = useFade(50);

    return (
        <View style={s.screen}>

            {/* Header matches Home & Settings */}
            <Animated.View style={[s.headerRow, animHeader, { paddingTop: Math.max(insets.top + 16, 64) }]}>
                <Animated.View style={{ transform: [{ scale: backScale.scale }] }}>
                    <TouchableOpacity
                        style={s.iconBtn}
                        onPress={() => router.back()}
                        onPressIn={backScale.onPressIn}
                        onPressOut={backScale.onPressOut}
                        activeOpacity={1}
                    >
                        <Ionicons name="arrow-back" size={20} color="white" />
                    </TouchableOpacity>
                </Animated.View>
                <View>
                    <Text style={s.screenLabel}>Privacy Notice</Text>
                </View>
                <View style={{ width: 40 }} />
            </Animated.View>

            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingBottom: Math.max(insets.bottom + 40, 60) }}
                showsVerticalScrollIndicator={false}
            >
                <Animated.View style={animBody}>

                    {/* Intro Section */}
                    <View style={s.section}>
                        <View style={s.introCard}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                                <Ionicons name="shield-checkmark" size={22} color="#22C55E" />
                                <Text style={s.introTitle}>Your Privacy Matters</Text>
                            </View>
                            <Text style={s.introText}>
                                AttendEase is designed with privacy as a core principle. Here is exactly how your data is handled on-device.
                            </Text>
                        </View>
                    </View>

                    {/* Privacy Points grouped in a single card like Settings */}
                    <View style={s.section}>
                        <Text style={s.sectionLabel}>HOW WE PROTECT YOU</Text>
                        <View style={s.card}>
                            {PRIVACY_POINTS.map((point, idx) => (
                                <View key={idx}>
                                    <View style={s.pointRow}>
                                        <View style={[s.pointIconBox, { backgroundColor: point.bgColor }]}>
                                            <Ionicons name={point.icon} size={20} color={point.iconColor} />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={s.pointTitle}>{point.title}</Text>
                                            <Text style={s.pointDescription}>{point.description}</Text>
                                        </View>
                                    </View>
                                    {idx < PRIVACY_POINTS.length - 1 && <View style={s.divider} />}
                                </View>
                            ))}
                        </View>
                    </View>

                    {/* Disclaimer Footer */}
                    <View style={[s.section, { alignItems: 'center', marginTop: 32 }]}>
                        <Text style={s.disclaimer}>
                            AttendEase is an unofficial, independent student tool.{'\n'}
                            Not affiliated with St. Xavier's College Ranchi.
                        </Text>
                    </View>

                </Animated.View>
            </ScrollView>
        </View>
    );
}

const s = StyleSheet.create({
    screen: { flex: 1, backgroundColor: '#0B0B0B' },

    headerRow: { paddingHorizontal: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 20 },
    screenLabel: { fontSize: 24, fontWeight: '600', color: '#FFFFFF', letterSpacing: -0.5, textAlign: 'center' },
    iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#121212', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },

    section: { paddingHorizontal: 16, marginTop: 24 },
    sectionLabel: { fontSize: 12, fontWeight: '600', letterSpacing: 1, color: '#9CA3AF', marginBottom: 10 },

    introCard: {
        backgroundColor: '#121212',
        borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
        padding: 20,
    },
    introTitle: { fontSize: 18, fontWeight: '700', color: '#fff', letterSpacing: -0.3 },
    introText: { fontSize: 14, color: '#9CA3AF', lineHeight: 22, letterSpacing: -0.1 },

    card: { backgroundColor: '#121212', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', overflow: 'hidden' },
    divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.05)', marginHorizontal: 16 },

    pointRow: {
        flexDirection: 'row', alignItems: 'flex-start', gap: 16,
        paddingHorizontal: 16, paddingVertical: 18,
    },
    pointIconBox: {
        width: 44, height: 44, borderRadius: 12,
        alignItems: 'center', justifyContent: 'center',
    },
    pointTitle: { fontSize: 16, fontWeight: '600', color: '#fff', letterSpacing: -0.3, marginBottom: 4 },
    pointDescription: { fontSize: 13, color: '#6B7280', lineHeight: 18, letterSpacing: 0.1 },

    disclaimer: {
        fontSize: 12, color: '#374151',
        textAlign: 'center', lineHeight: 18, letterSpacing: 0.2,
    },
});
