import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const PRIVACY_POINTS = [
    {
        icon: 'cloud-offline-outline' as const,
        title: 'No External Servers',
        description: 'Data is fetched directly from the college API portal. No data is stored on or routed through any other external servers.',
    },
    {
        icon: 'phone-portrait-outline' as const,
        title: 'On-Device Storage Only',
        description: 'Your roll number and attendance data remain encrypted on your device. Nothing is uploaded anywhere.',
    },
    {
        icon: 'eye-off-outline' as const,
        title: 'No User Tracking',
        description: 'The app does not track users, collect usage analytics, or profile behavior in any way.',
    },
    {
        icon: 'shield-checkmark-outline' as const,
        title: 'No Third-Party Services',
        description: 'No analytics, advertising, or third-party tracking SDKs are used in this application.',
    },
    {
        icon: 'trash-outline' as const,
        title: 'Full Data Control',
        description: 'You can delete all stored data at any time from Settings. This removes everything from your device.',
    },
];

export default function PrivacyScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();

    return (
        <View style={s.screen}>
            {/* Header */}
            <View style={[s.header, { paddingTop: Math.max(insets.top + 10, 58) }]}>
                <TouchableOpacity style={s.iconBtn} onPress={() => router.back()} activeOpacity={0.8}>
                    <Ionicons name="arrow-back" size={20} color="white" />
                </TouchableOpacity>
                <Text style={s.screenTitle}>Privacy Notice</Text>
                <View style={{ width: 38 }} />
            </View>

            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingBottom: Math.max(insets.bottom + 40, 60) }}
                showsVerticalScrollIndicator={false}
            >
                {/* Intro */}
                <View style={s.section}>
                    <BlurView intensity={30} tint="dark" style={s.introCard}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                            <Ionicons name="shield-checkmark" size={20} color="rgb(52,199,89)" />
                            <Text style={s.introTitle}>Your Privacy Matters</Text>
                        </View>
                        <Text style={s.introText}>
                            AttendEase is designed with privacy as a core principle. Here is exactly how your data is handled.
                        </Text>
                    </BlurView>
                </View>

                {/* Privacy Points */}
                <View style={s.section}>
                    {PRIVACY_POINTS.map((point, idx) => (
                        <BlurView
                            key={idx}
                            intensity={40}
                            tint="dark"
                            style={[s.pointCard, idx < PRIVACY_POINTS.length - 1 && { marginBottom: 10 }]}
                        >
                            <View style={s.pointIcon}>
                                <Ionicons name={point.icon} size={20} color="rgba(255,255,255,0.7)" />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={s.pointTitle}>{point.title}</Text>
                                <Text style={s.pointDescription}>{point.description}</Text>
                            </View>
                        </BlurView>
                    ))}
                </View>

                {/* Disclaimer Footer */}
                <View style={[s.section, { alignItems: 'center', paddingTop: 16 }]}>
                    <Text style={s.disclaimer}>
                        AttendEase is an unofficial, independent student tool.{'\n'}
                        Not affiliated with St. Xavier's College Ranchi.
                    </Text>
                </View>
            </ScrollView>
        </View>
    );
}

const s = StyleSheet.create({
    screen: { flex: 1, backgroundColor: '#000' },
    header: {
        paddingHorizontal: 24, paddingBottom: 16,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.07)',
    },
    screenTitle: { fontSize: 18, fontWeight: '700', color: '#fff', letterSpacing: -0.5 },
    iconBtn: {
        width: 38, height: 38, borderRadius: 19,
        backgroundColor: 'rgba(255,255,255,0.08)',
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
    },
    section: { paddingHorizontal: 24, paddingTop: 24 },
    introCard: {
        backgroundColor: 'rgba(255,255,255,0.09)',
        borderRadius: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)',
        overflow: 'hidden', padding: 20,
    },
    introTitle: { fontSize: 17, fontWeight: '700', color: '#fff', letterSpacing: -0.3 },
    introText: { fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 19, letterSpacing: -0.1 },
    pointCard: {
        backgroundColor: 'rgba(255,255,255,0.09)',
        borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)',
        overflow: 'hidden', padding: 16,
        flexDirection: 'row', alignItems: 'flex-start', gap: 14,
    },
    pointIcon: {
        width: 40, height: 40, borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.06)',
        alignItems: 'center', justifyContent: 'center',
    },
    pointTitle: { fontSize: 15, fontWeight: '600', color: '#fff', letterSpacing: -0.3, marginBottom: 4 },
    pointDescription: { fontSize: 12, color: 'rgba(255,255,255,0.4)', lineHeight: 17, letterSpacing: 0.1 },
    disclaimer: {
        fontSize: 11, color: 'rgba(255,255,255,0.25)',
        textAlign: 'center', lineHeight: 17, letterSpacing: 0.2,
    },
});
