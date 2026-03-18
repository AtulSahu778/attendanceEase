import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Animated, Linking, ActivityIndicator } from 'react-native';

import { useRouter, useFocusEffect } from 'expo-router';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
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

function maskRollNumber(roll: string): string {
    if (roll.length <= 4) return roll;
    return roll.slice(0, -4) + '****';
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

function SkeletonCard() {
    const pulse = useRef(new Animated.Value(0.4)).current;
    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulse, { toValue: 0.9, duration: 700, useNativeDriver: true }),
                Animated.timing(pulse, { toValue: 0.4, duration: 700, useNativeDriver: true }),
            ])
        ).start();
    }, []);
    return (
        <Animated.View style={[{ marginHorizontal: 16, marginTop: 16 }, { opacity: pulse }]}>
            <View style={{ backgroundColor: '#121212', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', padding: 16 }}>
                <View style={{ width: 80, height: 11, backgroundColor: '#1F1F1F', borderRadius: 6, marginBottom: 16 }} />
                <View style={{ width: 120, height: 36, backgroundColor: '#1F1F1F', borderRadius: 8, marginBottom: 10 }} />
                <View style={{ width: 100, height: 11, backgroundColor: '#1F1F1F', borderRadius: 6 }} />
            </View>
        </Animated.View>
    );
}

export default function HomeScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { profile, viewMode, setViewMode, fetchAttendance, isLoading, attendanceResult, isCachedData, cooldownEnd, setSelectedDate } = useAppStore();
    const [lastSynced, setLastSynced] = useState<string | null>(null);
    const [showDonation, setShowDonation] = useState(false);
    const [cooldownRemaining, setCooldownRemaining] = useState(0);
    const ctaScale = usePressScale(0.98);
    const gearScale = usePressScale(0.95);

    const animHeader = useFade(0);
    const animCard = useFade(50);
    const animTabs = useFade(100);
    const animResult = useFade(150);
    const animCta = useFade(200);

    // ─── Card cross-fade when switching tabs ───
    const cardFade = useRef(new Animated.Value(1)).current;
    useEffect(() => {
        Animated.sequence([
            Animated.timing(cardFade, { toValue: 0.4, duration: 120, useNativeDriver: true }),
            Animated.timing(cardFade, { toValue: 1, duration: 250, useNativeDriver: true }),
        ]).start();
    }, [viewMode]);

    useFocusEffect(
        useCallback(() => {
            const today = new Date();
            const fmt = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
            setSelectedDate(fmt);
        }, [setSelectedDate])
    );

    useEffect(() => { getLastCacheTimestamp().then(setLastSynced); }, [attendanceResult]);

    // ─── Re-fetch when view mode changes ───
    useEffect(() => { fetchAttendance(false); }, [viewMode]);

    // ─── Cooldown timer ───
    useEffect(() => {
        if (cooldownEnd <= Date.now()) {
            setCooldownRemaining(0);
            return;
        }
        const update = () => {
            const remaining = Math.max(0, Math.ceil((cooldownEnd - Date.now()) / 1000));
            setCooldownRemaining(remaining);
            if (remaining <= 0) clearInterval(interval);
        };
        update();
        const interval = setInterval(update, 1000);
        return () => clearInterval(interval);
    }, [cooldownEnd]);

    const handleCheck = () => {
        fetchAttendance(true);
        router.push('/result');
    };

    const displayName = profile?.displayName || profile?.rollNumber || 'Student';
    const maskedRoll = profile?.rollNumber ? maskRollNumber(profile.rollNumber) : '';
    const pct = attendanceResult?.overallPercentage ?? 0;
    const isCoolingDown = cooldownRemaining > 0;

    return (
        <View style={s.screen}>


            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1, paddingBottom: Math.max(insets.bottom + 120, 140) }} showsVerticalScrollIndicator={false}>

                {/* Header */}
                <Animated.View style={[s.headerRow, animHeader, { paddingTop: Math.max(insets.top + 16, 64) }]}>
                    <View>
                        <Text style={s.welcomeLabel}>Welcome back</Text>
                        <Text style={s.heroName}>{displayName} 👋</Text>
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
                                <Text style={s.textSecondary}>{maskedRoll} • Sem {profile?.semester}</Text>
                            </View>
                        </View>
                        <View style={s.dateRow}>
                            <Ionicons name="calendar-outline" size={14} color="#9CA3AF" />
                            <Text style={[s.textSecondary, { marginLeft: 8 }]}>{formatDate(new Date())}</Text>
                        </View>
                    </View>
                </Animated.View>

                {/* Cached Data Banner */}
                {isCachedData && attendanceResult && (
                    <Animated.View style={[{ marginHorizontal: 16, marginTop: 12 }, animResult]}>
                        <View style={s.cacheBanner}>
                            <Ionicons name="cloud-offline-outline" size={14} color="#F59E0B" />
                            <Text style={s.cacheBannerText}>
                                Showing cached data{attendanceResult.fetchedAt ? ` (${timeAgo(attendanceResult.fetchedAt)})` : ''}
                            </Text>
                        </View>
                    </Animated.View>
                )}

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
                                <Ionicons 
                                    name={mode.icon as any} 
                                    size={16} 
                                    color={viewMode === mode.key ? '#FFFFFF' : '#9CA3AF'} 
                                />
                                <Text style={[s.tabText, viewMode === mode.key && s.tabTextActive]}>{mode.label}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </Animated.View>

                {/* Quick Result Card or Skeleton */}
                {isLoading && !attendanceResult ? (
                    <SkeletonCard />
                ) : attendanceResult ? (
                    <Animated.View style={[{ marginHorizontal: 16, marginTop: 16 }, animResult, { opacity: cardFade }]}>
                        <View style={s.card}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                <View>
                                    <Text style={s.sectionLabel}>
                                        {viewMode === 'overall' ? 'OVERALL' : 
                                         viewMode === 'daily' ? 'TODAY' : 
                                         'THIS MONTH'}
                                    </Text>
                                    <Text style={[s.caption, { fontSize: 10, marginTop: 2, color: '#6B7280', letterSpacing: 0.2 }]}>
                                        {viewMode === 'overall' ? 'All-time' : 
                                         viewMode === 'daily' ? 'Day view' : 
                                         'Month view'}
                                    </Text>
                                </View>
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
                 ) : null}


                {/* CTA */}
                <Animated.View style={[{ paddingHorizontal: 16, marginTop: 24 }, animCta]}>
                    <Animated.View style={{ transform: [{ scale: ctaScale.scale }] }}>
                        <TouchableOpacity
                            style={[s.ctaButton, (isLoading || isCoolingDown) && { opacity: 0.8 }]}
                            onPress={handleCheck}
                            onPressIn={ctaScale.onPressIn}
                            onPressOut={ctaScale.onPressOut}
                            disabled={isLoading || isCoolingDown}
                            activeOpacity={0.9}
                        >
                            {isLoading ? (
                                <ActivityIndicator size="small" color="#000000" style={{ marginRight: 10 }} />
                            ) : (
                                <Ionicons name="server-outline" size={18} color="#000000" style={{ marginRight: 8 }} />
                            )}
                            <Text style={s.ctaText}>
                                {isLoading
                                    ? 'Checking...'
                                    : isCoolingDown
                                        ? `Wait ${cooldownRemaining}s`
                                        : 'Check Attendance'}
                            </Text>
                        </TouchableOpacity>
                    </Animated.View>

                    {isCoolingDown && (
                        <View style={{ height: 4, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 2, marginTop: 16, overflow: 'hidden', marginHorizontal: 20 }}>
                            <View style={{ width: `${(cooldownRemaining / 30) * 100}%`, height: '100%', backgroundColor: '#FFFFFF', opacity: 0.8 }} />
                        </View>
                    )}

                    {lastSynced && (
                        <Text style={[s.caption, { textAlign: 'center', marginTop: 14 }]}>
                            Last checked: {timeAgo(lastSynced)}
                        </Text>
                    )}
                </Animated.View>

                {/* Flexible Spacer for long screens */}
                <View style={{ flex: 1, minHeight: 60 }} />
            </ScrollView>

            {/* Footer — floating pill at bottom */}
            <View pointerEvents="box-none" style={{ position: 'absolute', bottom: Math.max(insets.bottom, 16), left: 0, right: 0, alignItems: 'center' }}>
                <BlurView intensity={20} tint="dark" style={{ alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', paddingHorizontal: 18, paddingVertical: 10, borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                        <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, letterSpacing: 0.3, fontWeight: '500', marginRight: 16 }}>
                            Built by Atul
                        </Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                            <TouchableOpacity onPress={() => Linking.openURL('https://github.com/AtulSahu778')} activeOpacity={0.6}>
                                <Ionicons name="logo-github" size={16} color="rgba(255,255,255,0.5)" />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => Linking.openURL('https://www.linkedin.com/in/atulsahu/')} activeOpacity={0.6}>
                                <Ionicons name="logo-linkedin" size={16} color="rgba(255,255,255,0.5)" />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => Linking.openURL('https://instagram.com/ofc_atul')} activeOpacity={0.6}>
                                <Ionicons name="logo-instagram" size={16} color="rgba(255,255,255,0.5)" />
                            </TouchableOpacity>
                        </View>
                    </View>
                </BlurView>
            </View>

            <DonationModal visible={showDonation} onClose={() => setShowDonation(false)} />
        </View>
    );
}

const s = StyleSheet.create({
    screen: { flex: 1, backgroundColor: '#0B0B0B' },

    headerRow: { paddingHorizontal: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    welcomeLabel: { fontSize: 14, color: '#9CA3AF', marginBottom: 4 },
    heroName: { fontSize: 24, fontWeight: '600', color: '#FFFFFF', letterSpacing: -0.5 },
    gearBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#121212', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },

    card: { backgroundColor: '#121212', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', padding: 16 },
    avatarWrap: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#1F1F1F', alignItems: 'center', justifyContent: 'center' },
    cardHeading: { fontSize: 18, fontWeight: '600', color: '#FFFFFF', letterSpacing: -0.3 },
    textSecondary: { fontSize: 14, color: '#9CA3AF', marginTop: 2 },
    dateRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1A1A1A', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, marginTop: 4 },

    cacheBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(245,158,11,0.08)', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: 'rgba(245,158,11,0.15)' },
    cacheBannerText: { fontSize: 12, color: '#F59E0B', fontWeight: '500', letterSpacing: -0.2 },

    sectionLabel: { fontSize: 12, fontWeight: '600', letterSpacing: 1, color: '#9CA3AF' },
    tabContainer: { flexDirection: 'row', backgroundColor: '#141414', borderRadius: 30, padding: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
    tab: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 24, flexDirection: 'row', gap: 6 },
    tabActive: { backgroundColor: '#1F1F1F' },
    tabText: { fontSize: 14, color: '#9CA3AF', fontWeight: '500' },
    tabTextActive: { color: '#FFFFFF', fontWeight: '600' },

    bigPct: { fontSize: 36, fontWeight: '700', letterSpacing: -1 },
    ctaButton: { backgroundColor: '#FFFFFF', borderRadius: 40, paddingVertical: 18, paddingHorizontal: 24, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' },
    ctaText: { color: '#000000', fontSize: 18, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase' },
    bodyText: { fontSize: 14, color: '#FFFFFF' },
    caption: { fontSize: 12, color: '#6B7280' },
});
