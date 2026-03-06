import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../store/useAppStore';
import { ViewMode } from '../types';
import { getLastCacheTimestamp } from '../services/storage';

const VIEW_MODES: { key: ViewMode; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { key: 'overall', label: 'Overall', icon: 'stats-chart' },
    { key: 'daily', label: 'Daily', icon: 'today' },
    { key: 'monthly', label: 'Monthly', icon: 'calendar' },
];

function formatDate(date: Date): string {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    return `${days[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

function getTimeAgo(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'Just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
}

export default function HomeScreen() {
    const router = useRouter();
    const { profile, viewMode, setViewMode, fetchAttendance, isLoading, attendanceResult } = useAppStore();
    const [lastSynced, setLastSynced] = useState<string | null>(null);

    useEffect(() => { getLastCacheTimestamp().then(setLastSynced); }, [attendanceResult]);

    const handleCheck = async () => {
        await fetchAttendance();
        router.push('/result');
    };

    const displayName = profile?.displayName || profile?.rollNumber || 'Student';

    return (
        <ScrollView style={{ flex: 1, backgroundColor: '#0f172a' }} contentContainerStyle={{ flexGrow: 1 }}>
            {/* Header */}
            <View style={{ paddingTop: 56, paddingHorizontal: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View>
                    <Text style={{ fontSize: 13, color: '#94a3b8' }}>Welcome back,</Text>
                    <Text style={{ fontSize: 24, fontWeight: 'bold', color: 'white', marginTop: 4 }}>
                        Hello, {profile?.displayName || ''} 👋
                    </Text>
                </View>
                <TouchableOpacity
                    style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#1e293b', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#334155' }}
                    onPress={() => router.push('/settings')}
                >
                    <Ionicons name="settings-outline" size={22} color="#94a3b8" />
                </TouchableOpacity>
            </View>

            {/* Student Card */}
            <View style={{ marginHorizontal: 24, marginTop: 24, backgroundColor: '#2563eb', borderRadius: 16, padding: 20 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                    <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }}>
                        <Ionicons name="person" size={20} color="white" />
                    </View>
                    <View style={{ marginLeft: 12, flex: 1 }}>
                        <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 17 }}>{displayName}</Text>
                        <Text style={{ color: '#bfdbfe', fontSize: 13, marginTop: 2 }}>{profile?.rollNumber}</Text>
                    </View>
                    <View style={{ backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 4 }}>
                        <Text style={{ color: 'white', fontWeight: '600', fontSize: 13 }}>Sem {profile?.semester}</Text>
                    </View>
                </View>
                <View style={{ backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 8, padding: 12, flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons name="calendar-outline" size={16} color="#bfdbfe" />
                    <Text style={{ color: '#dbeafe', fontSize: 13, marginLeft: 8 }}>{formatDate(new Date())}</Text>
                </View>
            </View>

            {/* View Mode Selector */}
            <View style={{ marginHorizontal: 24, marginTop: 24 }}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#94a3b8', marginBottom: 12 }}>Attendance View</Text>
                <View style={{ flexDirection: 'row', backgroundColor: '#1e293b', borderRadius: 12, padding: 4, borderWidth: 1, borderColor: '#334155' }}>
                    {VIEW_MODES.map((mode) => (
                        <TouchableOpacity
                            key={mode.key}
                            style={{
                                flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                                paddingVertical: 12, borderRadius: 8,
                                backgroundColor: viewMode === mode.key ? '#2563eb' : 'transparent',
                            }}
                            onPress={() => setViewMode(mode.key)}
                        >
                            <Ionicons name={mode.icon} size={16} color={viewMode === mode.key ? 'white' : '#94a3b8'} />
                            <Text style={{ marginLeft: 6, fontSize: 13, fontWeight: '600', color: viewMode === mode.key ? 'white' : '#94a3b8' }}>
                                {mode.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            {/* Quick Stats */}
            {attendanceResult && !isLoading && (
                <View style={{ marginHorizontal: 24, marginTop: 24, backgroundColor: '#1e293b', borderRadius: 12, borderWidth: 1, borderColor: '#334155', padding: 16 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
                        <Text style={{ color: '#94a3b8', fontSize: 13 }}>Last Result</Text>
                        {lastSynced && <Text style={{ color: '#64748b', fontSize: 11 }}>{getTimeAgo(lastSynced)}</Text>}
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={{ fontSize: 36, fontWeight: 'bold', color: 'white' }}>
                            {attendanceResult.overallPercentage.toFixed(1)}%
                        </Text>
                        <View style={{ marginLeft: 12, flex: 1 }}>
                            <Text style={{ color: '#94a3b8', fontSize: 13 }}>Overall Attendance</Text>
                            <Text style={{ color: '#64748b', fontSize: 11, marginTop: 2 }}>{attendanceResult.subjects.length} subjects</Text>
                        </View>
                        <View style={{
                            width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center',
                            backgroundColor: attendanceResult.overallPercentage >= 75 ? 'rgba(16,185,129,0.15)' : attendanceResult.overallPercentage >= 65 ? 'rgba(245,158,11,0.15)' : 'rgba(239,68,68,0.15)',
                        }}>
                            <Ionicons
                                name={attendanceResult.overallPercentage >= 75 ? 'checkmark-circle' : attendanceResult.overallPercentage >= 65 ? 'alert-circle' : 'close-circle'}
                                size={24}
                                color={attendanceResult.overallPercentage >= 75 ? '#10b981' : attendanceResult.overallPercentage >= 65 ? '#f59e0b' : '#ef4444'}
                            />
                        </View>
                    </View>
                </View>
            )}

            {/* CTA Button */}
            <View style={{ paddingHorizontal: 24, marginTop: 32 }}>
                <TouchableOpacity
                    style={{
                        borderRadius: 16, paddingVertical: 20, alignItems: 'center',
                        backgroundColor: isLoading ? '#1e40af' : '#2563eb', flexDirection: 'row', justifyContent: 'center',
                    }}
                    onPress={handleCheck} disabled={isLoading} activeOpacity={0.8}
                >
                    <Ionicons name={isLoading ? 'sync' : 'search'} size={22} color="white" />
                    <Text style={{ color: 'white', fontSize: 18, fontWeight: 'bold', marginLeft: 8 }}>
                        {isLoading ? 'Fetching...' : 'Check Attendance'}
                    </Text>
                </TouchableOpacity>
            </View>

            {lastSynced && (
                <Text style={{ color: '#475569', fontSize: 11, textAlign: 'center', marginTop: 16, marginBottom: 24 }}>
                    Last checked: {getTimeAgo(lastSynced)}
                </Text>
            )}
            <View style={{ height: 40 }} />
        </ScrollView>
    );
}
