import React, { useEffect, useRef } from 'react';
import {
    View, Text, TouchableOpacity, ScrollView, Linking, Animated, TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../store/useAppStore';
import { ViewMode, SubjectRow } from '../types';
import { useState } from 'react';

const VIEW_MODES: { key: ViewMode; label: string }[] = [
    { key: 'overall', label: 'Overall' },
    { key: 'daily', label: 'Daily' },
    { key: 'monthly', label: 'Monthly' },
];

function pctColor(p: number) { return p >= 75 ? '#10b981' : p >= 65 ? '#f59e0b' : '#ef4444'; }
function pctBg(p: number) { return p >= 75 ? 'rgba(16,185,129,0.12)' : p >= 65 ? 'rgba(245,158,11,0.12)' : 'rgba(239,68,68,0.12)'; }
function timeAgo(iso: string) {
    const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
    if (m < 1) return 'Just now'; if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`; return `${Math.floor(h / 24)}d ago`;
}

function ProgressBar({ percentage }: { percentage: number }) {
    const anim = useRef(new Animated.Value(0)).current;
    useEffect(() => { Animated.timing(anim, { toValue: percentage, duration: 800, useNativeDriver: false }).start(); }, [percentage]);
    return (
        <View style={{ height: 6, backgroundColor: '#334155', borderRadius: 3, overflow: 'hidden', marginTop: 8 }}>
            <Animated.View style={{
                height: '100%', borderRadius: 3, backgroundColor: pctColor(percentage),
                width: anim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }),
            }} />
        </View>
    );
}

function SubjectCard({ s }: { s: SubjectRow }) {
    return (
        <View style={{ backgroundColor: '#1e293b', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(51,65,85,0.6)', padding: 16, marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <View style={{ flex: 1, marginRight: 12 }}>
                    <Text style={{ color: 'white', fontWeight: '600', fontSize: 15 }} numberOfLines={2}>{s.subjectTitle}</Text>
                    <Text style={{ color: '#64748b', fontSize: 11, marginTop: 4, fontFamily: 'monospace' }}>{s.subjectCode}</Text>
                </View>
                <View style={{ backgroundColor: pctBg(s.percentage), borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 }}>
                    <Text style={{ fontWeight: 'bold', fontSize: 17, color: pctColor(s.percentage) }}>{s.percentage.toFixed(1)}%</Text>
                </View>
            </View>
            <ProgressBar percentage={s.percentage} />
            <View style={{ flexDirection: 'row', marginTop: 12, gap: 16 }}>
                {[
                    { label: 'Total', val: s.totalClasses, color: '#60a5fa' },
                    { label: 'Present', val: s.totalPresent, color: '#34d399' },
                    { label: 'Absent', val: s.totalClasses - s.totalPresent, color: '#f87171' },
                ].map((x) => (
                    <View key={x.label} style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: x.color, marginRight: 6 }} />
                        <Text style={{ color: '#94a3b8', fontSize: 11 }}>{x.label}: <Text style={{ color: '#e2e8f0', fontWeight: '600' }}>{x.val}</Text></Text>
                    </View>
                ))}
            </View>
        </View>
    );
}

export default function ResultScreen() {
    const router = useRouter();
    const { attendanceResult, viewMode, setViewMode, selectedDate, setSelectedDate, fetchAttendance, isLoading, error, isCachedData, clearError } = useAppStore();
    const [showDateInput, setShowDateInput] = useState(false);
    const [dateInput, setDateInput] = useState(selectedDate);

    useEffect(() => { fetchAttendance(); }, [viewMode]);

    const openPortal = () => Linking.openURL('https://sxcran.ac.in/Student/AttendanceSummary');

    if (!attendanceResult && !isLoading && !error) {
        return (
            <View style={{ flex: 1, backgroundColor: '#0f172a', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 }}>
                <Ionicons name="document-text-outline" size={60} color="#475569" />
                <Text style={{ color: '#94a3b8', fontSize: 17, marginTop: 16, textAlign: 'center' }}>No attendance data.</Text>
                <TouchableOpacity style={{ backgroundColor: '#2563eb', borderRadius: 12, paddingHorizontal: 32, paddingVertical: 12, marginTop: 24 }} onPress={() => router.back()}>
                    <Text style={{ color: 'white', fontWeight: '600' }}>Go Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={{ flex: 1, backgroundColor: '#0f172a' }}>
            {/* Header */}
            <View style={{ paddingTop: 56, paddingBottom: 16, paddingHorizontal: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#1e293b' }}>
                <TouchableOpacity style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#1e293b', alignItems: 'center', justifyContent: 'center' }} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={20} color="white" />
                </TouchableOpacity>
                <Text style={{ color: 'white', fontSize: 18, fontWeight: 'bold' }}>Attendance</Text>
                <TouchableOpacity style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#1e293b', alignItems: 'center', justifyContent: 'center' }} onPress={() => fetchAttendance()}>
                    <Ionicons name="refresh" size={20} color="#94a3b8" />
                </TouchableOpacity>
            </View>

            {/* Tabs */}
            <View style={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: 8 }}>
                <View style={{ flexDirection: 'row', backgroundColor: '#1e293b', borderRadius: 12, padding: 4, borderWidth: 1, borderColor: '#334155' }}>
                    {VIEW_MODES.map((m) => (
                        <TouchableOpacity key={m.key} style={{ flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center', backgroundColor: viewMode === m.key ? '#2563eb' : 'transparent' }} onPress={() => setViewMode(m.key)}>
                            <Text style={{ fontSize: 13, fontWeight: '600', color: viewMode === m.key ? 'white' : '#94a3b8' }}>{m.label}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
                {viewMode === 'daily' && (
                    <View style={{ marginTop: 12 }}>
                        <TouchableOpacity style={{ backgroundColor: '#1e293b', borderRadius: 12, borderWidth: 1, borderColor: '#334155', paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }} onPress={() => setShowDateInput(!showDateInput)}>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <Ionicons name="calendar-outline" size={18} color="#94a3b8" />
                                <Text style={{ color: '#cbd5e1', marginLeft: 8, fontSize: 13 }}>{selectedDate}</Text>
                            </View>
                            <Ionicons name="chevron-down" size={16} color="#94a3b8" />
                        </TouchableOpacity>
                        {showDateInput && (
                            <View style={{ backgroundColor: '#1e293b', borderRadius: 12, borderWidth: 1, borderColor: '#334155', marginTop: 8, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                                <TextInput style={{ flex: 1, backgroundColor: '#334155', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, color: 'white', fontSize: 13 }} placeholder="YYYY-MM-DD" placeholderTextColor="#64748b" value={dateInput} onChangeText={setDateInput} />
                                <TouchableOpacity style={{ backgroundColor: '#2563eb', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 8 }} onPress={() => { setSelectedDate(dateInput); setShowDateInput(false); setTimeout(() => fetchAttendance(), 100); }}>
                                    <Text style={{ color: 'white', fontWeight: '600', fontSize: 13 }}>Go</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                )}
            </View>

            {/* Cached Banner */}
            {isCachedData && attendanceResult && (
                <View style={{ marginHorizontal: 24, marginTop: 8, backgroundColor: 'rgba(245,158,11,0.08)', borderRadius: 12, padding: 12, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(245,158,11,0.2)' }}>
                    <Ionicons name="cloud-offline-outline" size={18} color="#f59e0b" />
                    <Text style={{ color: '#fbbf24', fontSize: 11, marginLeft: 8, flex: 1 }}>Showing cached data from {timeAgo(attendanceResult.fetchedAt)}</Text>
                    <TouchableOpacity onPress={() => fetchAttendance()}><Text style={{ color: '#fbbf24', fontWeight: '600', fontSize: 11 }}>Retry</Text></TouchableOpacity>
                </View>
            )}

            {/* Error */}
            {error && !isCachedData && (
                <View style={{ marginHorizontal: 24, marginTop: 8, backgroundColor: 'rgba(239,68,68,0.08)', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)' }}>
                    <Text style={{ color: '#f87171', fontWeight: '600', marginBottom: 8 }}>Error</Text>
                    <Text style={{ color: '#fca5a5', fontSize: 13, marginBottom: 12 }}>{error.message}</Text>
                    <TouchableOpacity style={{ backgroundColor: 'rgba(239,68,68,0.15)', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 8, alignSelf: 'flex-start' }} onPress={() => { clearError(); fetchAttendance(); }}>
                        <Text style={{ color: '#f87171', fontWeight: '600', fontSize: 13 }}>Retry</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Loading */}
            {isLoading && (
                <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 80 }}>
                    <Ionicons name="sync" size={40} color="#3b82f6" />
                    <Text style={{ color: '#94a3b8', fontSize: 15, marginTop: 16 }}>Fetching attendance...</Text>
                </View>
            )}

            {/* Results */}
            {attendanceResult && !isLoading && (
                <ScrollView style={{ flex: 1, paddingHorizontal: 24, paddingTop: 16 }} showsVerticalScrollIndicator={false}>
                    {/* Student Info */}
                    <View style={{ backgroundColor: '#1e293b', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(51,65,85,0.6)', padding: 16, marginBottom: 16 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(37,99,235,0.15)', alignItems: 'center', justifyContent: 'center' }}>
                                <Ionicons name="person" size={24} color="#60a5fa" />
                            </View>
                            <View style={{ marginLeft: 12, flex: 1 }}>
                                <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 16 }}>{attendanceResult.student.name}</Text>
                                <Text style={{ color: '#94a3b8', fontSize: 13, marginTop: 2 }}>Roll: {attendanceResult.student.classRollNumber} • Sem {attendanceResult.student.semester}</Text>
                                <Text style={{ color: '#64748b', fontSize: 11, marginTop: 2 }}>{attendanceResult.student.courseName}</Text>
                            </View>
                        </View>
                    </View>

                    {/* Overall % */}
                    <View style={{ backgroundColor: '#1e293b', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(51,65,85,0.6)', padding: 16, marginBottom: 16, flexDirection: 'row', alignItems: 'center' }}>
                        <View style={{ width: 64, height: 64, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: pctBg(attendanceResult.overallPercentage) }}>
                            <Text style={{ fontSize: 20, fontWeight: 'bold', color: pctColor(attendanceResult.overallPercentage) }}>{attendanceResult.overallPercentage.toFixed(1)}%</Text>
                        </View>
                        <View style={{ marginLeft: 16, flex: 1 }}>
                            <Text style={{ color: 'white', fontWeight: '600', fontSize: 15 }}>Overall Attendance</Text>
                            <Text style={{ color: '#94a3b8', fontSize: 13, marginTop: 4 }}>
                                {attendanceResult.subjects.length} subjects • {attendanceResult.subjects.reduce((a, r) => a + r.totalPresent, 0)}/{attendanceResult.subjects.reduce((a, r) => a + r.totalClasses, 0)} classes
                            </Text>
                        </View>
                    </View>

                    <Text style={{ color: '#94a3b8', fontSize: 13, fontWeight: '600', marginBottom: 12 }}>Subject-wise Breakdown</Text>
                    {attendanceResult.subjects.map((s, i) => <SubjectCard key={s.subjectCode + i} s={s} />)}

                    <TouchableOpacity style={{ backgroundColor: '#1e293b', borderRadius: 12, borderWidth: 1, borderColor: '#334155', padding: 16, marginBottom: 32, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }} onPress={openPortal}>
                        <Ionicons name="open-outline" size={18} color="#94a3b8" />
                        <Text style={{ color: '#94a3b8', fontWeight: '500', marginLeft: 8 }}>Open in Browser</Text>
                    </TouchableOpacity>
                    <View style={{ height: 24 }} />
                </ScrollView>
            )}
        </View>
    );
}
