import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Animated, TextInput, Linking } from 'react-native';

import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../store/useAppStore';
import { ViewMode, SubjectRow } from '../types';
import { DonationBanner, DonationModal } from '../components/Donation';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const VIEW_MODES: { key: ViewMode; label: string }[] = [
    { key: 'overall', label: 'Overall' },
    { key: 'daily', label: 'Daily' },
    { key: 'monthly', label: 'Monthly' },
];

function pctColor(p: number) {
    if (p >= 85) return '#22C55E';
    if (p >= 75) return '#9CA3AF';
    return '#F59E0B';
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

function AnimatedProgressBar({ percentage }: { percentage: number }) {
    const color = pctColor(percentage);
    return (
        <View style={st.progressBarTrack}>
            <View style={[st.progressBarFill, { width: `${percentage}%`, backgroundColor: color }]} />
        </View>
    );
}

function SubjectCard({ s }: { s: SubjectRow }) {
    const cardScale = usePressScale(0.99);
    const color = pctColor(s.percentage);
    return (
        <Animated.View style={{ transform: [{ scale: cardScale.scale }], marginBottom: 16 }}>
            <View style={st.card}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <View style={{ flex: 1, marginRight: 16 }}>
                        <Text style={st.subjectTitle} numberOfLines={2}>{s.subjectTitle}</Text>
                        <Text style={st.subjectCode}>{s.subjectCode}</Text>
                    </View>
                </View>

                <AnimatedProgressBar percentage={s.percentage} />

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, alignItems: 'center' }}>
                    <Text style={st.statsText}>
                        Total: {s.totalClasses}   Present: {s.totalPresent}   Absent: {s.totalClasses - s.totalPresent}
                    </Text>
                    <Text style={[st.pctValue, { color }]}>{s.percentage.toFixed(1)}%</Text>
                </View>
            </View>
        </Animated.View>
    );
}

export default function ResultScreen() {
    const router = useRouter();
    const { attendanceResult, viewMode, setViewMode, selectedDate, setSelectedDate, fetchAttendance, isLoading, error, isCachedData, clearError } = useAppStore();
    const [showDateInput, setShowDateInput] = useState(false);
    const [dateInput, setDateInput] = useState(selectedDate);
    const [showDonation, setShowDonation] = useState(false);
    const [retryCooldown, setRetryCooldown] = useState(false);
    const insets = useSafeAreaInsets();
    const backScale = usePressScale();
    const refreshScale = usePressScale();

    const handleRetry = () => {
        if (retryCooldown) return;
        setRetryCooldown(true);
        clearError();
        fetchAttendance(true);
        setTimeout(() => setRetryCooldown(false), 5000);
    };

    const fade = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        Animated.timing(fade, { toValue: 1, duration: 300, useNativeDriver: true }).start();
    }, []);

    useEffect(() => { fetchAttendance(false); }, [viewMode]);

    const openPortal = () => Linking.openURL('https://sxcran.ac.in/Student/AttendanceSummary');

    const overallPct = attendanceResult?.overallPercentage ?? 0;

    return (
        <View style={st.screen}>


            {/* Header */}
            <Animated.View style={[st.header, { opacity: fade, paddingTop: Math.max(insets.top + 16, 64) }]}>
                <Animated.View style={{ transform: [{ scale: backScale.scale }] }}>
                    <TouchableOpacity style={st.iconBtn} onPress={() => router.back()} onPressIn={backScale.onPressIn} onPressOut={backScale.onPressOut} activeOpacity={0.8}>
                        <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
                    </TouchableOpacity>
                </Animated.View>
                <Text style={st.screenTitle}>Attendance</Text>
                <Animated.View style={{ transform: [{ scale: refreshScale.scale }] }}>
                    <TouchableOpacity style={st.iconBtn} onPress={() => fetchAttendance(true)} onPressIn={refreshScale.onPressIn} onPressOut={refreshScale.onPressOut} activeOpacity={0.8} disabled={isLoading || retryCooldown}>
                        <Ionicons name="refresh" size={20} color={isLoading ? "rgba(255,255,255,0.2)" : "#FFFFFF"} />
                    </TouchableOpacity>
                </Animated.View>
            </Animated.View>

            {/* Tabs */}
            <Animated.View style={[{ paddingHorizontal: 16, paddingTop: 16 }, { opacity: fade }]}>
                <View style={st.tabContainer}>
                    {VIEW_MODES.map((m) => (
                        <TouchableOpacity key={m.key} style={[st.tab, viewMode === m.key && st.tabActive]} onPress={() => setViewMode(m.key)} activeOpacity={0.8}>
                            <Text style={[st.tabText, viewMode === m.key && st.tabTextActive]}>{m.label}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {viewMode === 'daily' && (
                    <TouchableOpacity onPress={() => setShowDateInput(!showDateInput)} style={{ marginTop: 12 }}>
                        <View style={[st.card, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 }]}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <Ionicons name="calendar-outline" size={16} color="#9CA3AF" />
                                <Text style={st.textSecondary}>{selectedDate}</Text>
                            </View>
                            <Ionicons name="chevron-down" size={14} color="#9CA3AF" />
                        </View>
                    </TouchableOpacity>
                )}
                {viewMode === 'daily' && showDateInput && (
                    <View style={[st.card, { marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12 }]}>
                        <TextInput
                            style={[st.bodyText, { flex: 1, backgroundColor: '#1A1A1A', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10 }]}
                            placeholder="YYYY-MM-DD" placeholderTextColor="#6B7280"
                            value={dateInput} onChangeText={setDateInput}
                        />
                        <TouchableOpacity
                            style={{ backgroundColor: '#FFFFFF', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 10 }}
                            onPress={() => { setSelectedDate(dateInput); setShowDateInput(false); setTimeout(() => fetchAttendance(true), 100); }}
                        >
                            <Text style={{ color: '#000000', fontWeight: '600', fontSize: 13 }}>Go</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </Animated.View>

            {/* Cached Banner */}
            {isCachedData && attendanceResult && (
                <View style={[st.banner, { backgroundColor: 'rgba(255,159,10,0.15)', borderColor: 'rgba(255,159,10,0.35)' }]}>
                    <Ionicons name="cloud-offline-outline" size={16} color="rgb(255,159,10)" />
                    <Text style={{ color: 'rgb(255,159,10)', fontSize: 11, flex: 1, marginLeft: 8 }}>
                        Cached from {timeAgo(attendanceResult.fetchedAt)}
                    </Text>
                    <TouchableOpacity onPress={handleRetry} disabled={retryCooldown}>
                        <Text style={{ color: retryCooldown ? 'rgba(255,159,10,0.4)' : 'rgb(255,159,10)', fontWeight: '700', fontSize: 12 }}>{retryCooldown ? 'Wait…' : 'Retry'}</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Error */}
            {error && !isCachedData && (
                <View style={[st.banner, { backgroundColor: 'rgba(255,59,48,0.12)', borderColor: 'rgba(255,59,48,0.30)' }]}>
                    <Text style={{ color: 'rgb(255,59,48)', fontWeight: '600', marginBottom: 6 }}>Error</Text>
                    <Text style={{ color: 'rgba(255,100,90,0.9)', fontSize: 13, marginBottom: 10 }}>{error.message}</Text>
                    <TouchableOpacity style={{ backgroundColor: retryCooldown ? 'rgba(255,59,48,0.1)' : 'rgba(255,59,48,0.2)', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 7, alignSelf: 'flex-start' }} onPress={handleRetry} disabled={retryCooldown}>
                        <Text style={{ color: retryCooldown ? 'rgba(255,59,48,0.4)' : 'rgb(255,59,48)', fontWeight: '600', fontSize: 12 }}>{retryCooldown ? 'Wait 5s…' : 'Retry'}</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Loading */}
            {isLoading && (
                <View style={{ alignItems: 'center', paddingVertical: 80 }}>
                    <Ionicons name="sync" size={38} color="rgba(255,255,255,0.3)" />
                    <Text style={[st.bodyText, { marginTop: 14, color: 'rgba(255,255,255,0.4)' }]}>Fetching attendance…</Text>
                </View>
            )}

            {/* Results */}
            {attendanceResult && !isLoading && (
                <ScrollView style={{ flex: 1, paddingHorizontal: 16, marginTop: 16 }} contentContainerStyle={{ paddingBottom: Math.max(insets.bottom + 40, 80) }} showsVerticalScrollIndicator={false}>

                    {/* Student Card */}
                    <View style={[st.card, { marginBottom: 16 }]}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <View style={st.avatarWrap}>
                                <Ionicons name="person" size={20} color="#FFFFFF" />
                            </View>
                            <View style={{ marginLeft: 16, flex: 1 }}>
                                <Text style={st.studentName}>{attendanceResult.student.name}</Text>
                                <Text style={st.textSecondary}>Roll: {attendanceResult.student.classRollNumber} • Sem {attendanceResult.student.semester}</Text>
                                <Text style={[st.textSecondary, { fontSize: 12, marginTop: 2 }]}>{attendanceResult.student.courseName}</Text>
                            </View>
                        </View>
                    </View>

                    {/* Overall % Hero */}
                    <View style={[st.card, { marginBottom: 24, flexDirection: 'row', alignItems: 'center' }]}>
                        <View style={{ flex: 1 }}>
                            <Text style={[st.heroPct, { color: pctColor(overallPct) }]}>{overallPct.toFixed(1)}%</Text>
                            <Text style={st.textSecondary}>
                                {attendanceResult.subjects.reduce((a, r) => a + r.totalPresent, 0)} / {attendanceResult.subjects.reduce((a, r) => a + r.totalClasses, 0)} classes
                            </Text>
                            <Text style={st.textSecondary}>{attendanceResult.subjects.length} subjects</Text>
                        </View>
                        <View style={{ width: 100, height: 6, backgroundColor: '#1F1F1F', borderRadius: 3, overflow: 'hidden' }}>
                            <View style={{ width: `${overallPct}%`, height: '100%', backgroundColor: pctColor(overallPct) }} />
                        </View>
                    </View>

                    {/* Subjects list */}
                    {attendanceResult.subjects.map((sub, i) => <SubjectCard key={sub.subjectCode + i} s={sub} />)}

                    {/* Open in Browser */}
                    <TouchableOpacity onPress={openPortal} activeOpacity={0.8} style={{ marginTop: 8 }}>
                        <View style={[st.card, { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 40, paddingVertical: 16 }]}>
                            <Ionicons name="open-outline" size={16} color="#9CA3AF" />
                            <Text style={{ color: '#9CA3AF', fontWeight: '500', fontSize: 14 }}>Open in Browser</Text>
                        </View>
                    </TouchableOpacity>
                    <View style={{ height: 80 }} />
                </ScrollView>
            )}

            <DonationModal visible={showDonation} onClose={() => setShowDonation(false)} />
        </View>
    );
}

const st = StyleSheet.create({
    screen: { flex: 1, backgroundColor: '#0B0B0B' },

    header: { paddingHorizontal: 16, paddingBottom: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
    screenTitle: { fontSize: 18, fontWeight: '600', color: '#FFFFFF', letterSpacing: -0.3 },
    iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#121212', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },

    card: { backgroundColor: '#121212', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', padding: 16 },
    avatarWrap: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#1F1F1F', alignItems: 'center', justifyContent: 'center' },
    studentName: { fontSize: 18, fontWeight: '600', color: '#FFFFFF', letterSpacing: -0.3 },

    heroPct: { fontSize: 42, fontWeight: '700', letterSpacing: -1 },

    tabContainer: { flexDirection: 'row', backgroundColor: '#121212', borderRadius: 12, padding: 4, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    tab: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 8 },
    tabActive: { backgroundColor: '#262626' },
    tabText: { fontSize: 14, fontWeight: '500', color: '#9CA3AF' },
    tabTextActive: { color: '#FFFFFF', fontWeight: '600' },

    banner: { marginHorizontal: 16, marginTop: 16, borderRadius: 12, padding: 16, flexDirection: 'row', alignItems: 'center', borderWidth: 1 },

    subjectTitle: { fontSize: 16, fontWeight: '600', color: '#FFFFFF', letterSpacing: -0.2 },
    subjectCode: { fontSize: 12, color: '#9CA3AF', marginTop: 4 },
    statsText: { fontSize: 12, color: '#9CA3AF' },
    pctValue: { fontWeight: '700', fontSize: 14 },

    progressBarTrack: { height: 6, backgroundColor: '#1F1F1F', borderRadius: 3, marginTop: 16, overflow: 'hidden' },
    progressBarFill: { height: '100%', borderRadius: 3 },

    bodyText: { fontSize: 15, color: '#FFFFFF' },
    textSecondary: { fontSize: 14, color: '#9CA3AF', marginTop: 2 },
});
