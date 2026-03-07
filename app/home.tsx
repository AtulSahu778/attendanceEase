import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Animated, Linking } from 'react-native';

import { useRouter } from 'expo-router';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../store/useAppStore';
import { ViewMode } from '../types';
import { getLastCacheTimestamp } from '../services/storage';
import { DonationBanner, DonationModal } from '../components/Donation';

const VIEW_MODES: { key: ViewMode; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { key: 'overall', label: 'Overall', icon: 'stats-chart' },
    { key: 'daily', label: 'Daily', icon: 'today' },
    { key: 'monthly', label: 'Monthly', icon: 'calendar' },
];

function pctColor(p: number) {
    if (p >= 85) return '#22C55E';
    if (p >= 75) return '#9CA3AF';
    return '#F59E0B';
}

function formatDate(d: Date) {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}
function timeAgo(iso: string) {
    const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
    if (m < 1) return 'Just now'; if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`; return `${Math.floor(h / 24)}d ago`;
}

function usePressScale(to = 0.98) {
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

export default function HomeScreen() {
    const router = useRouter();
    const { profile, viewMode, setViewMode, fetchAttendance, isLoading, attendanceResult } = useAppStore();
    const [lastSynced, setLastSynced] = useState<string | null>(null);
    const [showDonation, setShowDonation] = useState(false);
    const ctaScale = usePressScale(0.98);
    const gearScale = usePressScale(0.95);

    const animHeader = useFade(0);
    const animCard = useFade(50);
    const animTabs = useFade(100);
    const animResult = useFade(150);
    const animCta = useFade(200);

    useEffect(() => { getLastCacheTimestamp().then(setLastSynced); }, [attendanceResult]);

    const handleCheck = () => {
        fetchAttendance(true);
        router.push('/result');
    };

    const displayName = profile?.displayName || profile?.rollNumber || 'Student';
    const pct = attendanceResult?.overallPercentage ?? 0;

    return (
        <View style={s.screen}>


            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>

                {/* Header */}
                <Animated.View style={[s.headerRow, animHeader]}>
                    <View>
                        <Text style={s.welcomeLabel}>Welcome back</Text>
                        <Text style={s.heroName}>{profile?.displayName || 'Student'}</Text>
                    </View>
                    <Animated.View style={{ transform: [{ scale: gearScale.scale }] }}>
                        <TouchableOpacity
                            style={s.gearBtn}
                            onPress={() => router.push('/settings')}
                            onPressIn={gearScale.onPressIn}
                            onPressOut={gearScale.onPressOut}
                            activeOpacity={0.8}
                        >
                            <Ionicons name="settings-outline" size={20} color="#9CA3AF" />
                        </TouchableOpacity>
                    </Animated.View>
                </Animated.View>

                {/* Student Card */}
                <Animated.View style={[{ marginHorizontal: 16, marginTop: 24 }, animCard]}>
                    <View style={s.card}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                            <View style={s.avatarWrap}>
                                <Ionicons name="person" size={20} color="#FFFFFF" />
                            </View>
                            <View style={{ marginLeft: 16, flex: 1 }}>
                                <Text style={s.cardHeading}>{displayName}</Text>
                                <Text style={s.textSecondary}>{profile?.rollNumber} • Sem {profile?.semester}</Text>
                            </View>
                        </View>
                        <View style={s.dateRow}>
                            <Ionicons name="calendar-outline" size={14} color="#9CA3AF" />
                            <Text style={[s.textSecondary, { marginLeft: 8 }]}>{formatDate(new Date())}</Text>
                        </View>
                    </View>
                </Animated.View>

                {/* View Mode Tabs */}
                <Animated.View style={[{ marginHorizontal: 16, marginTop: 24 }, animTabs]}>
                    <View style={s.tabContainer}>
                        {VIEW_MODES.map((mode) => (
                            <TouchableOpacity
                                key={mode.key}
                                style={[s.tab, viewMode === mode.key && s.tabActive]}
                                onPress={() => setViewMode(mode.key)}
                                activeOpacity={0.8}
                            >
                                <Text style={[s.tabText, viewMode === mode.key && s.tabTextActive]}>{mode.label}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </Animated.View>

                {/* Quick Result Card */}
                {attendanceResult && !isLoading && (
                    <Animated.View style={[{ marginHorizontal: 16, marginTop: 16 }, animResult]}>
                        <View style={s.card}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                <Text style={s.sectionLabel}>OVERALL</Text>
                                {lastSynced && <Text style={s.caption}>{timeAgo(lastSynced)}</Text>}
                            </View>
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                <View style={{ flex: 1 }}>
                                    <Text style={[s.bigPct, { color: pctColor(pct) }]}>{pct.toFixed(1)}%</Text>
                                </View>
                                <View style={{ alignItems: 'flex-end', justifyContent: 'center' }}>
                                    <Text style={s.bodyText}>{attendanceResult.subjects.length} Subjects</Text>
                                </View>
                            </View>
                        </View>
                    </Animated.View>
                )}

                {/* CTA */}
                <Animated.View style={[{ paddingHorizontal: 16, marginTop: 24 }, animCta]}>
                    <Animated.View style={{ transform: [{ scale: ctaScale.scale }] }}>
                        <TouchableOpacity
                            style={[s.ctaButton, isLoading && { opacity: 0.7 }]}
                            onPress={handleCheck}
                            onPressIn={ctaScale.onPressIn}
                            onPressOut={ctaScale.onPressOut}
                            disabled={isLoading}
                            activeOpacity={0.9}
                        >
                            {isLoading ? null : <Ionicons name="server-outline" size={18} color="#000000" style={{ marginRight: 8 }} />}
                            <Text style={s.ctaText}>{isLoading ? 'Loading...' : 'Check Attendance'}</Text>
                        </TouchableOpacity>
                    </Animated.View>

                    {lastSynced && (
                        <Text style={[s.caption, { textAlign: 'center', marginTop: 14 }]}>
                            Last checked: {timeAgo(lastSynced)}
                        </Text>
                    )}
                </Animated.View>

            </ScrollView>

            {/* Footer — pinned at screen bottom */}
            <BlurView intensity={40} tint="dark" style={{ alignItems: 'center', paddingVertical: 16, backgroundColor: 'rgba(255,255,255,0.04)' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                    <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, letterSpacing: 0.5, fontWeight: '500' }}>
                        Built by Atul
                    </Text>
                    <TouchableOpacity onPress={() => Linking.openURL('https://github.com/AtulSahu778')} activeOpacity={0.6}>
                        <Ionicons name="logo-github" size={15} color="rgba(255,255,255,0.4)" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => Linking.openURL('https://instagram.com/ofc_atul')} activeOpacity={0.6}>
                        <Ionicons name="logo-instagram" size={15} color="rgba(255,255,255,0.4)" />
                    </TouchableOpacity>
                </View>
            </BlurView>

            <DonationModal visible={showDonation} onClose={() => setShowDonation(false)} />
        </View>
    );
}

const s = StyleSheet.create({
    screen: { flex: 1, backgroundColor: '#0B0B0B' },

    headerRow: { paddingTop: 64, paddingHorizontal: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    welcomeLabel: { fontSize: 14, color: '#9CA3AF', marginBottom: 4 },
    heroName: { fontSize: 24, fontWeight: '600', color: '#FFFFFF', letterSpacing: -0.5 },
    gearBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#121212', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },

    card: { backgroundColor: '#121212', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', padding: 16 },
    avatarWrap: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#1F1F1F', alignItems: 'center', justifyContent: 'center' },
    cardHeading: { fontSize: 18, fontWeight: '600', color: '#FFFFFF', letterSpacing: -0.3 },
    textSecondary: { fontSize: 14, color: '#9CA3AF', marginTop: 2 },
    dateRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1A1A1A', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, marginTop: 4 },

    sectionLabel: { fontSize: 12, fontWeight: '600', letterSpacing: 1, color: '#9CA3AF' },
    tabContainer: { flexDirection: 'row', backgroundColor: '#121212', borderRadius: 12, padding: 4, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    tab: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 8 },
    tabActive: { backgroundColor: '#262626' },
    tabText: { fontSize: 14, color: '#9CA3AF', fontWeight: '500' },
    tabTextActive: { color: '#FFFFFF', fontWeight: '600' },

    bigPct: { fontSize: 36, fontWeight: '700', letterSpacing: -1 },
    ctaButton: { backgroundColor: '#FFFFFF', borderRadius: 12, paddingVertical: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' },
    ctaText: { color: '#000000', fontSize: 16, fontWeight: '600' },
    bodyText: { fontSize: 14, color: '#FFFFFF' },
    caption: { fontSize: 12, color: '#6B7280' },
});
