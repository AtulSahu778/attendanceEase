import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, Linking, StyleSheet, Animated } from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../store/useAppStore';
import { SEMESTER_OPTIONS, StudentProfile } from '../types';
import { clearAllCache, getLastCacheTimestamp } from '../services/storage';
import { getDailyRequestCount, getLastFetchTime } from '../services/rateLimiter';
import { checkForUpdatesManual } from '../services/updateService';

function usePressScale(to = 0.97) {
    const scale = useRef(new Animated.Value(1)).current;
    const onPressIn = () => Animated.timing(scale, { toValue: to, duration: 120, useNativeDriver: true }).start();
    const onPressOut = () => Animated.spring(scale, { toValue: 1, damping: 15, useNativeDriver: true }).start();
    return { scale, onPressIn, onPressOut };
}

function timeAgo(iso: string) {
    const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
    if (m < 1) return 'Just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
}

export default function SettingsScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { profile, setProfile, deleteAllData } = useAppStore();
    const [rollNumber, setRollNumber] = useState(profile?.rollNumber || '');
    const [semester, setSemester] = useState(profile?.semester || 'I');
    const [displayName, setDisplayName] = useState(profile?.displayName || '');
    const [showSemPicker, setShowSemPicker] = useState(false);
    const [saved, setSaved] = useState(false);
    const [rollLocked, setRollLocked] = useState(true);  // Locked by default after setup

    // Transparency stats
    const [dailyCount, setDailyCount] = useState(0);
    const [dailyMax, setDailyMax] = useState(50);
    const [lastFetch, setLastFetch] = useState<string | null>(null);
    const [cacheAge, setCacheAge] = useState<string | null>(null);

    const backScale = usePressScale();
    const saveScale = usePressScale();

    // Load transparency stats on mount
    const loadStats = useCallback(async () => {
        const daily = await getDailyRequestCount();
        setDailyCount(daily.count);
        setDailyMax(daily.max);
        const fetchTime = await getLastFetchTime();
        setLastFetch(fetchTime);
        const cacheTimestamp = await getLastCacheTimestamp();
        setCacheAge(cacheTimestamp);
    }, []);

    useEffect(() => { loadStats(); }, [loadStats]);

    const handleSave = async () => {
        if (!rollNumber.trim()) { Alert.alert('Required', 'Roll number cannot be empty.'); return; }

        // If roll number changed and was previously set, warn user
        if (profile?.rollNumber && rollNumber.trim().toUpperCase() !== profile.rollNumber) {
            Alert.alert(
                'Roll Number Changed',
                'Changing your roll number will clear cached attendance data. Continue?',
                [
                    { text: 'Cancel', style: 'cancel' },
                    {
                        text: 'Continue',
                        onPress: async () => {
                            await clearAllCache();
                            await doSave();
                        },
                    },
                ]
            );
            return;
        }

        await doSave();
    };

    const doSave = async () => {
        const updated: StudentProfile = {
            rollNumber: rollNumber.trim().toUpperCase(), semester,
            displayName: displayName.trim() || undefined,
            createdAt: profile?.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        await setProfile(updated);
        setRollLocked(true);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    const handleUnlockRoll = () => {
        Alert.alert(
            'Unlock Roll Number',
            'Your roll number is locked for security. Are you sure you want to edit it?',
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Unlock', style: 'destructive', onPress: () => setRollLocked(false) },
            ]
        );
    };

    const handleDeleteData = () => {
        Alert.alert(
            'Delete All Data',
            'This will permanently delete your profile, cached attendance, and all app data. This cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete Everything',
                    style: 'destructive',
                    onPress: async () => {
                        await deleteAllData();
                        router.replace('/setup');
                    },
                },
            ]
        );
    };

    const semLabel = SEMESTER_OPTIONS.find((s) => s.value === semester)?.label || '';

    return (
        <View style={s.screen}>

            {/* Header */}
            <View style={[s.header, { paddingTop: Math.max(insets.top + 10, 58) }]}>
                <Animated.View style={{ transform: [{ scale: backScale.scale }] }}>
                    <TouchableOpacity style={s.iconBtn} onPress={() => router.back()} onPressIn={backScale.onPressIn} onPressOut={backScale.onPressOut} activeOpacity={1}>
                        <Ionicons name="arrow-back" size={20} color="white" />
                    </TouchableOpacity>
                </Animated.View>
                <Text style={s.screenTitle}>Settings</Text>
                <View style={{ width: 38 }} />
            </View>

            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: Math.max(insets.bottom + 100, 120) }} showsVerticalScrollIndicator={false}>

                {/* Profile Section */}
                <View style={s.section}>
                    <Text style={s.sectionLabel}>PROFILE</Text>

                    {/* Roll Number — locked by default */}
                    <TouchableOpacity onPress={rollLocked ? handleUnlockRoll : undefined} activeOpacity={rollLocked ? 0.8 : 1}>
                        <BlurView intensity={40} tint="dark" style={[s.glassInput, { marginBottom: 12 }]}>
                            <Ionicons name={rollLocked ? 'lock-closed' : 'id-card-outline'} size={20} color={rollLocked ? 'rgba(255,59,48,0.6)' : 'rgba(255,255,255,0.4)'} />
                            <TextInput
                                style={[s.textInput, rollLocked && { color: 'rgba(255,255,255,0.4)' }]}
                                value={rollNumber}
                                onChangeText={setRollNumber}
                                autoCapitalize="characters"
                                autoCorrect={false}
                                editable={!rollLocked}
                                placeholder="Roll Number"
                                placeholderTextColor="rgba(255,255,255,0.25)"
                            />
                            {rollLocked && (
                                <Text style={{ fontSize: 10, color: 'rgba(255,59,48,0.5)', fontWeight: '600' }}>LOCKED</Text>
                            )}
                        </BlurView>
                    </TouchableOpacity>

                    {/* Semester */}
                    <TouchableOpacity onPress={() => setShowSemPicker(!showSemPicker)} activeOpacity={1}>
                        <BlurView intensity={40} tint="dark" style={[s.glassInput, { marginBottom: 8 }]}>
                            <Ionicons name="calendar-outline" size={20} color="rgba(255,255,255,0.4)" />
                            <Text style={[s.textInput, { lineHeight: 22 }]}>{semLabel}</Text>
                            <Ionicons name={showSemPicker ? 'chevron-up' : 'chevron-down'} size={18} color="rgba(255,255,255,0.4)" />
                        </BlurView>
                    </TouchableOpacity>

                    {showSemPicker && (
                        <BlurView intensity={50} tint="dark" style={[s.glassPicker, { marginBottom: 12 }]}>
                            {SEMESTER_OPTIONS.map((opt, idx) => (
                                <TouchableOpacity
                                    key={opt.value}
                                    style={[s.pickerRow, idx < SEMESTER_OPTIONS.length - 1 && s.pickerDivider, semester === opt.value && s.pickerRowActive]}
                                    onPress={() => { setSemester(opt.value); setShowSemPicker(false); }}
                                >
                                    <Text style={[s.pickerText, semester === opt.value && s.pickerTextActive]}>{opt.label}</Text>
                                    {semester === opt.value && <Ionicons name="checkmark" size={16} color="white" />}
                                </TouchableOpacity>
                            ))}
                        </BlurView>
                    )}

                    {/* Display Name */}
                    <BlurView intensity={40} tint="dark" style={[s.glassInput, { marginBottom: 20 }]}>
                        <Ionicons name="person-outline" size={20} color="rgba(255,255,255,0.4)" />
                        <TextInput
                            style={s.textInput} value={displayName} onChangeText={setDisplayName}
                            autoCorrect={false} placeholder="Display Name (optional)"
                            placeholderTextColor="rgba(255,255,255,0.25)"
                        />
                    </BlurView>

                    {/* Save Button */}
                    <Animated.View style={{ transform: [{ scale: saveScale.scale }] }}>
                        <TouchableOpacity
                            style={[s.saveBtn, saved && s.saveBtnSuccess]}
                            onPress={handleSave}
                            onPressIn={saveScale.onPressIn}
                            onPressOut={saveScale.onPressOut}
                            activeOpacity={1}
                        >
                            <Ionicons name={saved ? 'checkmark-circle' : 'save-outline'} size={19} color={saved ? '#fff' : '#000'} />
                            <Text style={[s.saveBtnText, saved && { color: '#fff' }]}>{saved ? 'Saved!' : 'Save Changes'}</Text>
                        </TouchableOpacity>
                    </Animated.View>
                </View>

                {/* Request Transparency */}
                <View style={s.section}>
                    <Text style={s.sectionLabel}>USAGE</Text>
                    <BlurView intensity={30} tint="dark" style={s.glassCard}>
                        <View style={{ gap: 8 }}>
                            <View style={s.statRow}>
                                <Text style={s.statLabel}>API Requests Today</Text>
                                <Text style={[s.statValue, dailyCount >= dailyMax && { color: 'rgba(255,59,48,0.85)' }]}>
                                    {dailyCount} / {dailyMax}
                                </Text>
                            </View>
                            <View style={[s.statRow, { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)', paddingTop: 8 }]}>
                                <Text style={s.statLabel}>Last Fetch</Text>
                                <Text style={s.statValue}>{lastFetch ? timeAgo(lastFetch) : 'Never'}</Text>
                            </View>
                            <View style={[s.statRow, { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)', paddingTop: 8 }]}>
                                <Text style={s.statLabel}>Cache Age</Text>
                                <Text style={s.statValue}>{cacheAge ? timeAgo(cacheAge) : 'No cache'}</Text>
                            </View>
                        </View>
                    </BlurView>
                </View>

                {/* App Section */}
                <View style={s.section}>
                    <Text style={s.sectionLabel}>APP</Text>

                    {/* Check for Updates */}
                    <TouchableOpacity onPress={checkForUpdatesManual} activeOpacity={0.8}>
                        <BlurView intensity={40} tint="dark" style={[s.glassCard, { flexDirection: 'row', alignItems: 'center', marginBottom: 10 }]}>
                            <View style={[s.rowIcon, { backgroundColor: 'rgba(52,199,89,0.15)' }]}>
                                <Ionicons name="cloud-download-outline" size={19} color="rgba(52,199,89,0.85)" />
                            </View>
                            <View style={{ marginLeft: 14, flex: 1 }}>
                                <Text style={s.rowTitle}>Check for Updates</Text>
                                <Text style={s.caption}>Download latest version OTA</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.25)" />
                        </BlurView>
                    </TouchableOpacity>

                    {/* Privacy Notice */}
                    <TouchableOpacity onPress={() => router.push('/privacy')} activeOpacity={0.8}>
                        <BlurView intensity={40} tint="dark" style={[s.glassCard, { flexDirection: 'row', alignItems: 'center' }]}>
                            <View style={[s.rowIcon, { backgroundColor: 'rgba(52,199,89,0.15)' }]}>
                                <Ionicons name="shield-checkmark-outline" size={19} color="rgba(52,199,89,0.85)" />
                            </View>
                            <View style={{ marginLeft: 14, flex: 1 }}>
                                <Text style={s.rowTitle}>Privacy Notice</Text>
                                <Text style={s.caption}>How your data is handled</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.25)" />
                        </BlurView>
                    </TouchableOpacity>
                </View>

                {/* Data Section */}
                <View style={s.section}>
                    <Text style={s.sectionLabel}>DATA</Text>
                    <TouchableOpacity
                        onPress={() => Alert.alert('Clear Cache', 'Remove cached attendance data?', [
                            { text: 'Cancel' },
                            { text: 'Clear', style: 'destructive', onPress: () => { clearAllCache(); loadStats(); } },
                        ])}
                        activeOpacity={0.8}
                    >
                        <BlurView intensity={40} tint="dark" style={[s.glassCard, { flexDirection: 'row', alignItems: 'center', marginBottom: 10 }]}>
                            <View style={[s.rowIcon, { backgroundColor: 'rgba(255,149,0,0.15)' }]}>
                                <Ionicons name="trash-outline" size={19} color="rgba(255,149,0,0.85)" />
                            </View>
                            <View style={{ marginLeft: 14, flex: 1 }}>
                                <Text style={s.rowTitle}>Clear Cached Data</Text>
                                <Text style={s.caption}>Remove locally stored results</Text>
                            </View>
                        </BlurView>
                    </TouchableOpacity>

                    {/* Delete All Data */}
                    <TouchableOpacity onPress={handleDeleteData} activeOpacity={0.8}>
                        <BlurView intensity={40} tint="dark" style={[s.glassCard, { flexDirection: 'row', alignItems: 'center' }]}>
                            <View style={[s.rowIcon, { backgroundColor: 'rgba(255,59,48,0.15)' }]}>
                                <Ionicons name="warning-outline" size={19} color="rgba(255,59,48,0.85)" />
                            </View>
                            <View style={{ marginLeft: 14, flex: 1 }}>
                                <Text style={s.rowTitle}>Delete My Data</Text>
                                <Text style={s.caption}>Remove all data and reset app</Text>
                            </View>
                        </BlurView>
                    </TouchableOpacity>
                </View>

                {/* Developer Section */}
                <View style={s.section}>
                    <Text style={s.sectionLabel}>DEVELOPER</Text>

                    <TouchableOpacity onPress={() => Linking.openURL('https://github.com/AtulSahu778')} activeOpacity={0.8}>
                        <BlurView intensity={40} tint="dark" style={[s.glassCard, { flexDirection: 'row', alignItems: 'center', marginBottom: 10 }]}>
                            <View style={[s.rowIcon, { backgroundColor: 'rgba(255,255,255,0.08)' }]}>
                                <Ionicons name="logo-github" size={19} color="rgba(255,255,255,0.7)" />
                            </View>
                            <View style={{ marginLeft: 14, flex: 1 }}>
                                <Text style={s.rowTitle}>GitHub</Text>
                                <Text style={s.caption}>@AtulSahu778</Text>
                            </View>
                            <Ionicons name="open-outline" size={16} color="rgba(255,255,255,0.25)" />
                        </BlurView>
                    </TouchableOpacity>

                    <TouchableOpacity onPress={() => Linking.openURL('https://www.linkedin.com/in/atulsahu/')} activeOpacity={0.8}>
                        <BlurView intensity={40} tint="dark" style={[s.glassCard, { flexDirection: 'row', alignItems: 'center', marginBottom: 10 }]}>
                            <View style={[s.rowIcon, { backgroundColor: 'rgba(255,255,255,0.08)' }]}>
                                <Ionicons name="logo-linkedin" size={19} color="rgba(255,255,255,0.7)" />
                            </View>
                            <View style={{ marginLeft: 14, flex: 1 }}>
                                <Text style={s.rowTitle}>LinkedIn</Text>
                                <Text style={s.caption}>@atulsahu</Text>
                            </View>
                            <Ionicons name="open-outline" size={16} color="rgba(255,255,255,0.25)" />
                        </BlurView>
                    </TouchableOpacity>

                    <TouchableOpacity onPress={() => Linking.openURL('https://instagram.com/ofc_atul')} activeOpacity={0.8}>
                        <BlurView intensity={40} tint="dark" style={[s.glassCard, { flexDirection: 'row', alignItems: 'center' }]}>
                            <View style={[s.rowIcon, { backgroundColor: 'rgba(255,255,255,0.08)' }]}>
                                <Ionicons name="logo-instagram" size={19} color="rgba(255,255,255,0.7)" />
                            </View>
                            <View style={{ marginLeft: 14, flex: 1 }}>
                                <Text style={s.rowTitle}>Instagram</Text>
                                <Text style={s.caption}>@ofc_atul</Text>
                            </View>
                            <Ionicons name="open-outline" size={16} color="rgba(255,255,255,0.25)" />
                        </BlurView>
                    </TouchableOpacity>
                </View>

                {/* About Section */}
                <View style={s.section}>
                    <Text style={s.sectionLabel}>ABOUT</Text>

                    <TouchableOpacity onPress={() => Linking.openURL('https://sxcran.ac.in/Student/AttendanceSummary')} activeOpacity={0.8}>
                        <BlurView intensity={40} tint="dark" style={[s.glassCard, { flexDirection: 'row', alignItems: 'center', marginBottom: 10 }]}>
                            <View style={[s.rowIcon, { backgroundColor: 'rgba(255,255,255,0.08)' }]}>
                                <Ionicons name="globe-outline" size={19} color="rgba(255,255,255,0.7)" />
                            </View>
                            <View style={{ marginLeft: 14, flex: 1 }}>
                                <Text style={s.rowTitle}>College Portal</Text>
                                <Text style={s.caption}>sxcran.ac.in</Text>
                            </View>
                            <Ionicons name="open-outline" size={16} color="rgba(255,255,255,0.25)" />
                        </BlurView>
                    </TouchableOpacity>

                </View>


                {/* Spacer */}
                <View style={{ height: 40 }} />

                {/* Footer — pill at the bottom of scroll content */}
                <View style={{ alignItems: 'center', paddingBottom: 24 }}>
                    <BlurView intensity={20} tint="dark" style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', paddingHorizontal: 18, paddingVertical: 10, borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' }}>
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
                    </BlurView>
                </View>

            </ScrollView>
        </View>
    );
}

const s = StyleSheet.create({
    screen: { flex: 1, backgroundColor: '#000' },

    header: { paddingHorizontal: 24, paddingBottom: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.07)' },
    screenTitle: { fontSize: 18, fontWeight: '700', color: '#fff', letterSpacing: -0.5 },
    iconBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
    section: { paddingHorizontal: 24, paddingTop: 28 },
    sectionLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 0.8, color: 'rgba(255,255,255,0.35)', marginBottom: 12 },
    glassCard: { backgroundColor: 'rgba(255,255,255,0.09)', borderRadius: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)', overflow: 'hidden', padding: 18 },
    glassInput: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.09)', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)', overflow: 'hidden', paddingHorizontal: 16, paddingVertical: 2 },
    textInput: { flex: 1, paddingVertical: 18, paddingHorizontal: 12, color: '#fff', fontSize: 16, letterSpacing: -0.2 },
    glassPicker: { borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)', overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.07)' },
    pickerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 13 },
    pickerDivider: { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.07)' },
    pickerRowActive: { backgroundColor: 'rgba(255,255,255,0.09)' },
    pickerText: { fontSize: 15, color: 'rgba(255,255,255,0.55)', letterSpacing: -0.2 },
    pickerTextActive: { color: '#fff', fontWeight: '600' },
    saveBtn: { backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 16, paddingVertical: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, shadowColor: '#fff', shadowOpacity: 0.10, shadowRadius: 16 },
    saveBtnSuccess: { backgroundColor: 'rgba(52,199,89,0.9)' },
    saveBtnText: { color: '#000', fontSize: 16, fontWeight: '700', letterSpacing: -0.3 },
    rowIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    rowTitle: { fontSize: 16, color: '#fff', fontWeight: '600', letterSpacing: -0.4 },
    caption: { fontSize: 11, color: 'rgba(255,255,255,0.35)', letterSpacing: 0.1, marginTop: 2 },
    statRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    statLabel: { fontSize: 13, color: 'rgba(255,255,255,0.5)', letterSpacing: -0.1 },
    statValue: { fontSize: 13, color: '#fff', fontWeight: '600', letterSpacing: -0.2 },
});
