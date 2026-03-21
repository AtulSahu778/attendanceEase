import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Animated, TextInput, Linking, Platform, Modal } from 'react-native';

import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../store/useAppStore';
import { ViewMode, SubjectRow } from '../types';
import { DonationBanner, DonationModal } from '../components/Donation';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const VIEW_MODES: { key: ViewMode; label: string; icon: string }[] = [
    { key: 'overall', label: 'Overall', icon: 'stats-chart' },
    { key: 'daily', label: 'Daily', icon: 'today' },
    { key: 'monthly', label: 'Monthly', icon: 'calendar' },
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

function classesNeededFor75(totalClasses: number, totalPresent: number): number {
    if (totalClasses === 0) return 0;
    const required = Math.ceil((0.75 * totalClasses - totalPresent) / 0.25);
    return Math.max(0, required);
}

function AnimatedProgressBar({ percentage }: { percentage: number }) {
    const color = pctColor(percentage);
    return (
        <View style={st.progressBarTrack}>
            <View style={[st.progressBarFill, { width: `${percentage}%`, backgroundColor: color }]} />
        </View>
    );
}

// -- Pure JS Calendar Component --
function CustomDatePickerModal({ visible, onClose, onSelect, initialDate }: { visible: boolean, onClose: () => void, onSelect: (date: string) => void, initialDate: string }) {
    const [currentMonth, setCurrentMonth] = useState(new Date());

    useEffect(() => {
        if (visible) {
            const d = initialDate ? new Date(initialDate) : new Date();
            if (!isNaN(d.getTime())) setCurrentMonth(d);
        }
    }, [visible, initialDate]);

    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    const getDaysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
    const getFirstDayOfMonth = (y: number, m: number) => new Date(y, m, 1).getDay();

    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);

    const days = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(i);

    const handlePrev = () => setCurrentMonth(new Date(year, month - 1, 1));
    const handleNext = () => setCurrentMonth(new Date(year, month + 1, 1));

    const handleSelect = (day: number) => {
        const d = new Date(year, month, day);
        const fmt = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        onSelect(fmt);
    };

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
                <View style={{ width: '100%', maxWidth: 340, backgroundColor: '#1A1A1A', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}>
                    
                    {/* Header */}
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                        <TouchableOpacity onPress={handlePrev} style={{ padding: 8 }}>
                            <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
                        </TouchableOpacity>
                        <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '700' }}>
                            {currentMonth.toLocaleString('default', { month: 'long' })} {year}
                        </Text>
                        <TouchableOpacity onPress={handleNext} style={{ padding: 8 }}>
                            <Ionicons name="chevron-forward" size={24} color="#FFFFFF" />
                        </TouchableOpacity>
                    </View>

                    {/* Weekdays */}
                    <View style={{ flexDirection: 'row', marginBottom: 12 }}>
                        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
                            <Text key={d} style={{ flex: 1, textAlign: 'center', color: '#9CA3AF', fontSize: 13, fontWeight: '600' }}>{d}</Text>
                        ))}
                    </View>

                    {/* Grid */}
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                        {days.map((day, idx) => {
                            if (!day) return <View key={idx} style={{ width: '14.28%', aspectRatio: 1 }} />;
                            
                            const isSelected = initialDate === `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                            const isToday = new Date().toDateString() === new Date(year, month, day).toDateString();

                            return (
                                <TouchableOpacity
                                    key={idx}
                                    onPress={() => handleSelect(day)}
                                    style={{
                                        width: '14.28%', aspectRatio: 1, justifyContent: 'center', alignItems: 'center',
                                    }}
                                >
                                    <View style={{
                                        width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center',
                                        backgroundColor: isSelected ? '#FFFFFF' : isToday ? 'rgba(255,255,255,0.1)' : 'transparent'
                                    }}>
                                        <Text style={{ color: isSelected ? '#000000' : isToday ? '#FFFFFF' : '#D1D5DB', fontSize: 14, fontWeight: isSelected || isToday ? '700' : '400' }}>
                                            {day}
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    {/* Cancel Btn */}
                    <View style={{ marginTop: 24, alignItems: 'flex-end' }}>
                        <TouchableOpacity onPress={onClose} style={{ paddingHorizontal: 16, paddingVertical: 8 }}>
                            <Text style={{ color: '#9CA3AF', fontWeight: '600', fontSize: 14 }}>Cancel</Text>
                        </TouchableOpacity>
                    </View>

                </View>
            </View>
        </Modal>
    );
}

function SubjectCard({ s, showIndicator }: { s: SubjectRow; showIndicator?: boolean }) {
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
                    <Text style={[st.pctValue, { color }]}>{Number(s.percentage.toFixed(2))}%</Text>
                </View>

                {showIndicator && (() => {
                    const needed = classesNeededFor75(s.totalClasses, s.totalPresent);
                    return needed > 0 ? (
                        <Text style={{ fontSize: 12, color: '#F59E0B', marginTop: 8 }}>
                            Need {needed} more {needed === 1 ? 'class' : 'classes'} to reach 75%
                        </Text>
                    ) : (
                        <Text style={{ fontSize: 12, color: '#22C55E', marginTop: 8 }}>
                            Above 75% attendance ✓
                        </Text>
                    );
                })()}
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
    const [dateMode, setDateMode] = useState<'today' | 'yesterday' | 'custom'>('today');
    const [showPicker, setShowPicker] = useState(false);
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
                            <Ionicons name={m.icon as any} size={16} color={viewMode === m.key ? '#FFFFFF' : '#9CA3AF'} />
                            <Text style={[st.tabText, viewMode === m.key && st.tabTextActive]}>{m.label}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {viewMode === 'daily' && (() => {
                    const today = new Date();
                    const yesterday = new Date(today);
                    yesterday.setDate(today.getDate() - 1);
                    const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
                    const DATE_PILLS: { key: 'today' | 'yesterday' | 'custom'; label: string }[] = [
                        { key: 'today', label: 'Today' },
                        { key: 'yesterday', label: 'Yesterday' },
                        { key: 'custom', label: 'Custom' },
                    ];
                    const applyDate = (mode: 'today' | 'yesterday' | 'custom', custom?: string) => {
                        setDateMode(mode);
                        if (mode === 'today') { setSelectedDate(fmt(today)); setTimeout(() => fetchAttendance(true), 100); }
                        else if (mode === 'yesterday') { setSelectedDate(fmt(yesterday)); setTimeout(() => fetchAttendance(true), 100); }
                        else if (mode === 'custom' && custom) { setSelectedDate(custom); setTimeout(() => fetchAttendance(true), 100); }
                    };
                    return (
                        <View style={{ marginTop: 12, gap: 8 }}>
                            <View style={{ flexDirection: 'row', gap: 8 }}>
                                {DATE_PILLS.map(p => (
                                    <TouchableOpacity
                                        key={p.key}
                                        onPress={() => applyDate(p.key === 'custom' ? 'custom' : p.key)}
                                        style={[st.datePill, dateMode === p.key && st.datePillActive]}
                                        activeOpacity={0.8}
                                    >
                                        <Text style={[st.datePillText, dateMode === p.key && st.datePillTextActive]}>{p.label}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                            {dateMode === 'custom' && (
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                    <TouchableOpacity
                                        style={[{ flex: 1, backgroundColor: '#141414', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' }]}
                                        onPress={() => setShowPicker(true)}
                                    >
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                            <Ionicons name="calendar-outline" size={16} color="#9CA3AF" />
                                            <Text style={{ fontSize: 14, color: selectedDate.length > 0 ? '#FFFFFF' : '#4B5563' }}>
                                                {selectedDate || 'Select Date...'}
                                            </Text>
                                        </View>
                                    </TouchableOpacity>
                                </View>
                            )}
                            
                            {showPicker && (
                                <CustomDatePickerModal
                                    visible={showPicker}
                                    initialDate={selectedDate || fmt(new Date())}
                                    onClose={() => setShowPicker(false)}
                                    onSelect={(selectedStr) => {
                                        applyDate('custom', selectedStr);
                                        setShowPicker(false);
                                    }}
                                />
                            )}
                        </View>
                    );
                })()}
            </Animated.View>

            {/* Cached Banner */}
            {isCachedData && attendanceResult && (
                <Animated.View style={{ opacity: fade }}>
                    <View style={[st.banner, { backgroundColor: 'rgba(255,159,10,0.15)', borderColor: 'rgba(255,159,10,0.35)' }]}>
                        <Ionicons name="cloud-offline-outline" size={16} color="rgb(255,159,10)" />
                        <Text style={{ color: 'rgb(255,159,10)', fontSize: 11, flex: 1, marginLeft: 8 }}>
                            Cached from {timeAgo(attendanceResult.fetchedAt)}
                        </Text>
                        <TouchableOpacity onPress={handleRetry} disabled={retryCooldown}>
                            <Text style={{ color: retryCooldown ? 'rgba(255,159,10,0.4)' : 'rgb(255,159,10)', fontWeight: '700', fontSize: 12 }}>{retryCooldown ? 'Wait…' : 'Retry'}</Text>
                        </TouchableOpacity>
                    </View>
                </Animated.View>
            )}

            {/* Error */}
            {error && !isCachedData && (
                <Animated.View style={{ opacity: fade }}>
                    <View style={[st.banner, { backgroundColor: 'rgba(255,59,48,0.12)', borderColor: 'rgba(255,59,48,0.30)' }]}>
                        <Text style={{ color: 'rgb(255,59,48)', fontWeight: '600', marginBottom: 6 }}>Error</Text>
                        <Text style={{ color: 'rgba(255,100,90,0.9)', fontSize: 13, marginBottom: 10 }}>{error.message}</Text>
                        <TouchableOpacity style={{ backgroundColor: retryCooldown ? 'rgba(255,59,48,0.1)' : 'rgba(255,59,48,0.2)', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 7, alignSelf: 'flex-start' }} onPress={handleRetry} disabled={retryCooldown}>
                            <Text style={{ color: retryCooldown ? 'rgba(255,59,48,0.4)' : 'rgb(255,59,48)', fontWeight: '600', fontSize: 12 }}>{retryCooldown ? 'Wait 5s…' : 'Retry'}</Text>
                        </TouchableOpacity>
                    </View>
                </Animated.View>
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
                <ScrollView style={{ flex: 1, paddingHorizontal: 16, marginTop: 16 }} contentContainerStyle={{ flexGrow: 1, paddingBottom: Math.max(insets.bottom + 120, 140) }} showsVerticalScrollIndicator={false}>

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
                            <Text style={[st.textSecondary, { fontSize: 11, fontWeight: '700', color: '#6B7280', marginBottom: 4, letterSpacing: 0.8 }]}>
                                {viewMode === 'overall' ? 'ALL-TIME' : 
                                 viewMode === 'daily' ? 'TODAY' : 
                                 'THIS MONTH'}
                            </Text>
                            <Text style={[st.heroPct, { color: pctColor(overallPct) }]}>{Number(overallPct.toFixed(2))}%</Text>
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
                    {attendanceResult.subjects.map((sub, i) => <SubjectCard key={sub.subjectCode + i} s={sub} showIndicator={viewMode !== 'daily'} />)}

                    <View style={{ flex: 1, minHeight: 80 }} />
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

    tabContainer: { flexDirection: 'row', backgroundColor: '#141414', borderRadius: 30, padding: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
    tab: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 24, flexDirection: 'row', gap: 6 },
    tabActive: { backgroundColor: '#1F1F1F' },
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

    datePill: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 20, backgroundColor: '#141414', borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
    datePillActive: { backgroundColor: '#232323', borderColor: 'rgba(255,255,255,0.18)' },
    datePillText: { fontSize: 13, color: '#6B7280', fontWeight: '500' },
    datePillTextActive: { color: '#FFFFFF', fontWeight: '600' },
});
