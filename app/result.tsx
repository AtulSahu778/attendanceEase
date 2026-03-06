import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Animated, TextInput, Linking } from 'react-native';
import { BlurView } from 'expo-blur';

import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../store/useAppStore';
import { ViewMode, SubjectRow } from '../types';

const VIEW_MODES: { key: ViewMode; label: string }[] = [
    { key: 'overall', label: 'Overall' },
    { key: 'daily', label: 'Daily' },
    { key: 'monthly', label: 'Monthly' },
];

function pctColor(p: number) { return p >= 75 ? 'rgb(52,199,89)' : p >= 65 ? 'rgb(255,159,10)' : 'rgb(255,59,48)'; }
function pctGlow(p: number) { return p >= 75 ? 'rgba(52,199,89,0.25)' : p >= 65 ? 'rgba(255,159,10,0.20)' : 'rgba(255,59,48,0.20)'; }
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

function AnimatedProgressBar({ percentage, delay = 0 }: { percentage: number; delay?: number }) {
    const anim = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        Animated.timing(anim, { toValue: percentage, duration: 800, delay: 300 + delay, useNativeDriver: false }).start();
    }, [percentage]);
    const color = pctColor(percentage);
    return (
        <View style={{ height: 4, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden', marginTop: 10 }}>
            <Animated.View style={{
                height: '100%', borderRadius: 2, backgroundColor: color,
                width: anim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }),
                shadowColor: color, shadowOpacity: 0.7, shadowRadius: 4,
            }} />
        </View>
    );
}

function SubjectCard({ s, index }: { s: SubjectRow; index: number }) {
    const cardScale = usePressScale(0.985);
    const color = pctColor(s.percentage);
    const glow = pctGlow(s.percentage);
    return (
        <Animated.View style={[{ marginBottom: 12, transform: [{ scale: cardScale.scale }] }]}>
            <BlurView intensity={40} tint="dark" style={[st.glassCard, { shadowColor: color, shadowOpacity: 0.12, shadowRadius: 16 }]}>
                <View style={st.shimmerLine} />
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View style={{ flex: 1, marginRight: 14 }}>
                        <Text style={st.cardHeading} numberOfLines={2}>{s.subjectTitle}</Text>
                        <Text style={[st.caption, { fontFamily: 'monospace', marginTop: 4 }]}>{s.subjectCode}</Text>
                    </View>
                    <View style={[st.pctBadge, { backgroundColor: glow, borderColor: color + '44' }]}>
                        <Text style={[st.pctValue, { color }]}>{s.percentage.toFixed(1)}%</Text>
                    </View>
                </View>
                <AnimatedProgressBar percentage={s.percentage} delay={index * 50} />
                <View style={{ flexDirection: 'row', marginTop: 12, gap: 18 }}>
                    {[
                        { label: 'Total', val: s.totalClasses, color: 'rgba(255,255,255,0.45)' },
                        { label: 'Present', val: s.totalPresent, color: 'rgb(52,199,89)' },
                        { label: 'Absent', val: s.totalClasses - s.totalPresent, color: 'rgb(255,59,48)' },
                    ].map((x) => (
                        <View key={x.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                            <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: x.color, shadowColor: x.color, shadowOpacity: 0.8, shadowRadius: 4 }} />
                            <Text style={st.caption}>{x.label}: <Text style={{ color: 'rgba(255,255,255,0.75)', fontWeight: '600' }}>{x.val}</Text></Text>
                        </View>
                    ))}
                </View>
            </BlurView>
        </Animated.View>
    );
}

export default function ResultScreen() {
    const router = useRouter();
    const { attendanceResult, viewMode, setViewMode, selectedDate, setSelectedDate, fetchAttendance, isLoading, error, isCachedData, clearError } = useAppStore();
    const [showDateInput, setShowDateInput] = useState(false);
    const [dateInput, setDateInput] = useState(selectedDate);
    const backScale = usePressScale();
    const refreshScale = usePressScale();

    // Mount animation
    const fade = useRef(new Animated.Value(0)).current;
    const slide = useRef(new Animated.Value(16)).current;
    useEffect(() => {
        Animated.parallel([
            Animated.timing(fade, { toValue: 1, duration: 480, useNativeDriver: true }),
            Animated.timing(slide, { toValue: 0, duration: 480, useNativeDriver: true }),
        ]).start();
    }, []);

    useEffect(() => { fetchAttendance(); }, [viewMode]);

    const openPortal = () => Linking.openURL('https://sxcran.ac.in/Student/AttendanceSummary');

    const overallPct = attendanceResult?.overallPercentage ?? 0;

    return (
        <View style={st.screen}>


            {/* Header */}
            <Animated.View style={[st.header, { opacity: fade, transform: [{ translateY: slide }] }]}>
                <Animated.View style={{ transform: [{ scale: backScale.scale }] }}>
                    <TouchableOpacity style={st.iconBtn} onPress={() => router.back()} onPressIn={backScale.onPressIn} onPressOut={backScale.onPressOut} activeOpacity={1}>
                        <Ionicons name="arrow-back" size={20} color="white" />
                    </TouchableOpacity>
                </Animated.View>
                <Text style={st.screenTitle}>Attendance</Text>
                <Animated.View style={{ transform: [{ scale: refreshScale.scale }] }}>
                    <TouchableOpacity style={st.iconBtn} onPress={() => fetchAttendance()} onPressIn={refreshScale.onPressIn} onPressOut={refreshScale.onPressOut} activeOpacity={1}>
                        <Ionicons name="refresh" size={20} color="rgba(255,255,255,0.5)" />
                    </TouchableOpacity>
                </Animated.View>
            </Animated.View>

            {/* Tabs */}
            <Animated.View style={[{ paddingHorizontal: 24, paddingTop: 12 }, { opacity: fade }]}>
                <BlurView intensity={40} tint="dark" style={[st.glassCard, { flexDirection: 'row', padding: 4 }]}>
                    {VIEW_MODES.map((m) => (
                        <TouchableOpacity key={m.key} style={[st.tab, viewMode === m.key && st.tabActive]} onPress={() => setViewMode(m.key)} activeOpacity={0.8}>
                            <Text style={[st.tabText, viewMode === m.key && st.tabTextActive]}>{m.label}</Text>
                        </TouchableOpacity>
                    ))}
                </BlurView>

                {viewMode === 'daily' && (
                    <TouchableOpacity onPress={() => setShowDateInput(!showDateInput)} style={{ marginTop: 10 }}>
                        <BlurView intensity={30} tint="dark" style={[st.glassCard, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 }]}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <Ionicons name="calendar-outline" size={16} color="rgba(255,255,255,0.4)" />
                                <Text style={st.bodyText}>{selectedDate}</Text>
                            </View>
                            <Ionicons name="chevron-down" size={14} color="rgba(255,255,255,0.3)" />
                        </BlurView>
                    </TouchableOpacity>
                )}
                {viewMode === 'daily' && showDateInput && (
                    <BlurView intensity={40} tint="dark" style={[st.glassCard, { marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12 }]}>
                        <TextInput
                            style={[st.bodyText, { flex: 1, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 }]}
                            placeholder="YYYY-MM-DD" placeholderTextColor="rgba(255,255,255,0.25)"
                            value={dateInput} onChangeText={setDateInput}
                        />
                        <TouchableOpacity
                            style={{ backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 10, paddingHorizontal: 18, paddingVertical: 9 }}
                            onPress={() => { setSelectedDate(dateInput); setShowDateInput(false); setTimeout(() => fetchAttendance(), 100); }}
                        >
                            <Text style={{ color: '#000', fontWeight: '700', fontSize: 13 }}>Go</Text>
                        </TouchableOpacity>
                    </BlurView>
                )}
            </Animated.View>

            {/* Cached Banner */}
            {isCachedData && attendanceResult && (
                <View style={[st.banner, { backgroundColor: 'rgba(255,159,10,0.15)', borderColor: 'rgba(255,159,10,0.35)' }]}>
                    <Ionicons name="cloud-offline-outline" size={16} color="rgb(255,159,10)" />
                    <Text style={{ color: 'rgb(255,159,10)', fontSize: 11, flex: 1, marginLeft: 8 }}>
                        Cached from {timeAgo(attendanceResult.fetchedAt)}
                    </Text>
                    <TouchableOpacity onPress={() => fetchAttendance()}>
                        <Text style={{ color: 'rgb(255,159,10)', fontWeight: '700', fontSize: 12 }}>Retry</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Error */}
            {error && !isCachedData && (
                <View style={[st.banner, { backgroundColor: 'rgba(255,59,48,0.12)', borderColor: 'rgba(255,59,48,0.30)' }]}>
                    <Text style={{ color: 'rgb(255,59,48)', fontWeight: '600', marginBottom: 6 }}>Error</Text>
                    <Text style={{ color: 'rgba(255,100,90,0.9)', fontSize: 13, marginBottom: 10 }}>{error.message}</Text>
                    <TouchableOpacity style={{ backgroundColor: 'rgba(255,59,48,0.2)', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 7, alignSelf: 'flex-start' }} onPress={() => { clearError(); fetchAttendance(); }}>
                        <Text style={{ color: 'rgb(255,59,48)', fontWeight: '600', fontSize: 12 }}>Retry</Text>
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
                <ScrollView style={{ flex: 1, paddingHorizontal: 24, marginTop: 12 }} showsVerticalScrollIndicator={false}>

                    {/* Student Card */}
                    <BlurView intensity={40} tint="dark" style={[st.glassCard, { marginBottom: 12 }]}>
                        <View style={st.shimmerLine} />
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <BlurView intensity={30} tint="dark" style={st.avatarCircle}>
                                <Ionicons name="person" size={22} color="white" />
                            </BlurView>
                            <View style={{ marginLeft: 14, flex: 1 }}>
                                <Text style={st.cardHeading}>{attendanceResult.student.name}</Text>
                                <Text style={st.caption}>Roll: {attendanceResult.student.classRollNumber} · Sem {attendanceResult.student.semester}</Text>
                                <Text style={[st.caption, { marginTop: 2 }]}>{attendanceResult.student.courseName}</Text>
                            </View>
                        </View>
                    </BlurView>

                    {/* Overall % Hero */}
                    <BlurView intensity={40} tint="dark" style={[st.glassCard, {
                        marginBottom: 16, flexDirection: 'row', alignItems: 'center',
                        shadowColor: pctColor(overallPct), shadowOpacity: 0.2, shadowRadius: 20,
                    }]}>
                        <View style={st.shimmerLine} />
                        <View style={[st.heroPctBox, { backgroundColor: pctGlow(overallPct), borderColor: pctColor(overallPct) + '44' }]}>
                            <Text style={[st.heroPct, { color: pctColor(overallPct) }]}>{overallPct.toFixed(1)}%</Text>
                        </View>
                        <View style={{ marginLeft: 16, flex: 1 }}>
                            <Text style={st.cardHeading}>Overall Attendance</Text>
                            <Text style={st.caption}>
                                {attendanceResult.subjects.reduce((a, r) => a + r.totalPresent, 0)}/
                                {attendanceResult.subjects.reduce((a, r) => a + r.totalClasses, 0)} classes
                            </Text>
                            <Text style={st.caption}>{attendanceResult.subjects.length} subjects</Text>
                        </View>
                    </BlurView>

                    <Text style={[st.sectionLabel, { marginBottom: 12 }]}>SUBJECT-WISE BREAKDOWN</Text>
                    {attendanceResult.subjects.map((sub, i) => <SubjectCard key={sub.subjectCode + i} s={sub} index={i} />)}

                    {/* Open in Browser */}
                    <TouchableOpacity onPress={openPortal} activeOpacity={0.8}>
                        <BlurView intensity={30} tint="dark" style={[st.glassCard, { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 40, paddingVertical: 14 }]}>
                            <Ionicons name="open-outline" size={17} color="rgba(255,255,255,0.45)" />
                            <Text style={{ color: 'rgba(255,255,255,0.55)', fontWeight: '500', letterSpacing: -0.1 }}>Open in Browser</Text>
                        </BlurView>
                    </TouchableOpacity>
                    <View style={{ height: 20 }} />
                </ScrollView>
            )}
        </View>
    );
}

const st = StyleSheet.create({
    screen: { flex: 1, backgroundColor: '#000' },

    header: { paddingTop: 58, paddingHorizontal: 24, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.07)' },
    screenTitle: { fontSize: 18, fontWeight: '700', color: '#fff', letterSpacing: -0.5 },
    iconBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
    glassCard: { backgroundColor: 'rgba(255,255,255,0.10)', borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)', overflow: 'hidden', padding: 18 },
    shimmerLine: { position: 'absolute', top: 0, left: 0, right: 0, height: 1, backgroundColor: 'rgba(255,255,255,0.20)' },
    tab: { flex: 1, alignItems: 'center', paddingVertical: 11, borderRadius: 12 },
    tabActive: { backgroundColor: 'rgba(255,255,255,0.18)' },
    tabText: { fontSize: 13, fontWeight: '500', color: 'rgba(255,255,255,0.35)', letterSpacing: -0.1 },
    tabTextActive: { color: '#fff', fontWeight: '600' },
    banner: { marginHorizontal: 24, marginTop: 10, borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', borderWidth: 1 },
    avatarCircle: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', overflow: 'hidden' },
    heroPctBox: { width: 72, height: 72, borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
    heroPct: { fontSize: 22, fontWeight: '700', letterSpacing: -0.8 },
    pctBadge: { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1 },
    pctValue: { fontWeight: '700', fontSize: 15, letterSpacing: -0.4 },
    cardHeading: { fontSize: 16, fontWeight: '600', color: '#fff', letterSpacing: -0.4 },
    sectionLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 0.8, color: 'rgba(255,255,255,0.35)' },
    bodyText: { fontSize: 15, color: 'rgba(255,255,255,0.75)', letterSpacing: -0.2 },
    caption: { fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 2, letterSpacing: 0.1 },
});
