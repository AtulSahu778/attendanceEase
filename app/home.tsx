import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Animated } from 'react-native';
import { BlurView } from 'expo-blur';

import { useRouter } from 'expo-router';
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

function pctColor(p: number) { return p >= 75 ? 'rgb(52,199,89)' : p >= 65 ? 'rgb(255,159,10)' : 'rgb(255,59,48)'; }
function pctGlow(p: number) { return p >= 75 ? 'rgba(52,199,89,0.25)' : p >= 65 ? 'rgba(255,159,10,0.20)' : 'rgba(255,59,48,0.20)'; }

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

function usePressScale(to = 0.96) {
    const scale = useRef(new Animated.Value(1)).current;
    const onPressIn = () => Animated.timing(scale, { toValue: to, duration: 120, useNativeDriver: true }).start();
    const onPressOut = () => Animated.spring(scale, { toValue: 1, damping: 15, useNativeDriver: true }).start();
    return { scale, onPressIn, onPressOut };
}

function useFadeSlide(delay = 0) {
    const fade = useRef(new Animated.Value(0)).current;
    const slide = useRef(new Animated.Value(16)).current;
    useEffect(() => {
        Animated.parallel([
            Animated.timing(fade, { toValue: 1, duration: 480, delay, useNativeDriver: true }),
            Animated.timing(slide, { toValue: 0, duration: 480, delay, useNativeDriver: true }),
        ]).start();
    }, []);
    return { opacity: fade, transform: [{ translateY: slide }] };
}

export default function HomeScreen() {
    const router = useRouter();
    const { profile, viewMode, setViewMode, fetchAttendance, isLoading, attendanceResult } = useAppStore();
    const [lastSynced, setLastSynced] = useState<string | null>(null);
    const [showDonation, setShowDonation] = useState(false);
    const ctaScale = usePressScale(0.97);
    const gearScale = usePressScale();

    const animHeader = useFadeSlide(0);
    const animCard = useFadeSlide(50);
    const animTabs = useFadeSlide(100);
    const animResult = useFadeSlide(150);
    const animCta = useFadeSlide(200);

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
                        <Text style={s.welcomeLabel}>Welcome back,</Text>
                        <Text style={s.heroName}>Hello, {profile?.displayName || ''} 👋</Text>
                    </View>
                    <Animated.View style={{ transform: [{ scale: gearScale.scale }] }}>
                        <TouchableOpacity
                            style={s.gearBtn}
                            onPress={() => router.push('/settings')}
                            onPressIn={gearScale.onPressIn}
                            onPressOut={gearScale.onPressOut}
                            activeOpacity={1}
                        >
                            <Ionicons name="settings-outline" size={21} color="rgba(255,255,255,0.4)" />
                        </TouchableOpacity>
                    </Animated.View>
                </Animated.View>

                {/* Student Card */}
                <Animated.View style={[{ marginHorizontal: 24, marginTop: 20 }, animCard]}>
                    <BlurView intensity={40} tint="dark" style={s.glassCard}>
                        <View style={s.shimmerLine} />
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
                            <BlurView intensity={30} tint="dark" style={s.avatarWrap}>
                                <Ionicons name="person" size={20} color="white" />
                            </BlurView>
                            <View style={{ marginLeft: 12, flex: 1 }}>
                                <Text style={s.cardHeading}>{displayName}</Text>
                                <Text style={s.textMuted}>{profile?.rollNumber}</Text>
                            </View>
                            <BlurView intensity={30} tint="dark" style={s.semBadge}>
                                <Text style={s.semBadgeText}>Sem {profile?.semester}</Text>
                            </BlurView>
                        </View>
                        <BlurView intensity={20} tint="dark" style={s.dateRow}>
                            <Ionicons name="calendar-outline" size={14} color="rgba(255,255,255,0.4)" />
                            <Text style={[s.textMuted, { marginLeft: 8 }]}>{formatDate(new Date())}</Text>
                        </BlurView>
                    </BlurView>
                </Animated.View>

                {/* View Mode Tabs */}
                <Animated.View style={[{ marginHorizontal: 24, marginTop: 20 }, animTabs]}>
                    <Text style={s.sectionLabel}>ATTENDANCE VIEW</Text>
                    <BlurView intensity={40} tint="dark" style={[s.glassCard, { flexDirection: 'row', padding: 4 }]}>
                        {VIEW_MODES.map((mode) => (
                            <TouchableOpacity
                                key={mode.key}
                                style={[s.tab, viewMode === mode.key && s.tabActive]}
                                onPress={() => setViewMode(mode.key)}
                                activeOpacity={0.8}
                            >
                                <Ionicons name={mode.icon} size={15} color={viewMode === mode.key ? '#fff' : 'rgba(255,255,255,0.35)'} />
                                <Text style={[s.tabText, viewMode === mode.key && s.tabTextActive]}>{mode.label}</Text>
                            </TouchableOpacity>
                        ))}
                    </BlurView>
                </Animated.View>

                {/* Quick Result Card */}
                {attendanceResult && !isLoading && (
                    <Animated.View style={[{ marginHorizontal: 24, marginTop: 16 }, animResult]}>
                        <BlurView intensity={40} tint="dark" style={s.glassCard}>
                            <View style={s.shimmerLine} />
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                <Text style={s.sectionLabel}>LAST RESULT</Text>
                                {lastSynced && <Text style={s.caption}>{timeAgo(lastSynced)}</Text>}
                            </View>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <Text style={[s.bigPct, { color: pctColor(pct) }]}>{pct.toFixed(1)}%</Text>
                                <View style={{ marginLeft: 12, flex: 1 }}>
                                    <Text style={s.bodyText}>Overall Attendance</Text>
                                    <Text style={s.caption}>{attendanceResult.subjects.length} subjects</Text>
                                </View>
                                <View style={[s.statusDot, { backgroundColor: pctColor(pct), shadowColor: pctColor(pct), shadowOpacity: 0.6, shadowRadius: 8 }]} />
                            </View>
                        </BlurView>
                    </Animated.View>
                )}

                {/* CTA */}
                <Animated.View style={[{ paddingHorizontal: 24, marginTop: 16 }, animCta]}>
                    {/* <DonationBanner onPress={() => setShowDonation(true)} /> */}
                    <View style={{ height: 20 }} />
                    <Animated.View style={{ transform: [{ scale: ctaScale.scale }] }}>
                        <TouchableOpacity
                            style={[s.ctaButton, isLoading && { opacity: 0.7 }]}
                            onPress={handleCheck}
                            onPressIn={ctaScale.onPressIn}
                            onPressOut={ctaScale.onPressOut}
                            disabled={isLoading}
                            activeOpacity={1}
                        >
                            <Ionicons name={isLoading ? 'sync' : 'search'} size={20} color="#000" />
                            <Text style={s.ctaText}>{isLoading ? 'Fetching…' : 'Check Attendance'}</Text>
                        </TouchableOpacity>
                    </Animated.View>

                    {lastSynced && (
                        <Text style={[s.caption, { textAlign: 'center', marginTop: 14 }]}>
                            Last checked: {timeAgo(lastSynced)}
                        </Text>
                    )}
                </Animated.View>

                <View style={{ height: 120 }} />
            </ScrollView>

            <DonationModal visible={showDonation} onClose={() => setShowDonation(false)} />
        </View>
    );
}

const s = StyleSheet.create({
    screen: { flex: 1, backgroundColor: '#000' },

    headerRow: { paddingTop: 64, paddingHorizontal: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    welcomeLabel: { fontSize: 13, color: 'rgba(255,255,255,0.45)', letterSpacing: 0.2 },
    heroName: { fontSize: 24, fontWeight: '700', color: '#fff', letterSpacing: -0.8, marginTop: 4 },
    gearBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
    glassCard: { backgroundColor: 'rgba(255,255,255,0.10)', borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)', overflow: 'hidden', padding: 18 },
    shimmerLine: { position: 'absolute', top: 0, left: 0, right: 0, height: 1, backgroundColor: 'rgba(255,255,255,0.20)' },
    avatarWrap: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)', overflow: 'hidden' },
    semBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)', overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.08)' },
    semBadgeText: { color: '#fff', fontWeight: '600', fontSize: 11, letterSpacing: -0.1 },
    dateRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)', overflow: 'hidden', paddingHorizontal: 12, paddingVertical: 8 },
    sectionLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 0.8, color: 'rgba(255,255,255,0.35)', marginBottom: 10 },
    tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 11, borderRadius: 12, gap: 5 },
    tabActive: { backgroundColor: 'rgba(255,255,255,0.18)' },
    tabText: { fontSize: 13, fontWeight: '500', color: 'rgba(255,255,255,0.35)', letterSpacing: -0.1 },
    tabTextActive: { color: '#fff', fontWeight: '600' },
    bigPct: { fontSize: 38, fontWeight: '700', letterSpacing: -1.5 },
    statusDot: { width: 10, height: 10, borderRadius: 5 },
    ctaButton: { backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 16, paddingVertical: 18, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 10, shadowColor: '#fff', shadowOpacity: 0.10, shadowRadius: 20, shadowOffset: { width: 0, height: 4 }, elevation: 8 },
    ctaText: { color: '#000', fontSize: 17, fontWeight: '700', letterSpacing: -0.3 },
    cardHeading: { fontSize: 17, fontWeight: '600', color: '#fff', letterSpacing: -0.6 },
    bodyText: { fontSize: 15, color: 'rgba(255,255,255,0.75)', letterSpacing: -0.2 },
    textMuted: { fontSize: 12, color: 'rgba(255,255,255,0.45)', marginTop: 2, letterSpacing: -0.1 },
    caption: { fontSize: 11, color: 'rgba(255,255,255,0.30)', letterSpacing: 0.1 },
});
