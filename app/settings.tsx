import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, Linking, StyleSheet, Animated } from 'react-native';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../store/useAppStore';
import { SEMESTER_OPTIONS, StudentProfile } from '../types';
import { clearAllCache, getLastCacheTimestamp } from '../services/storage';
import { getDailyRequestCount, getLastFetchTime } from '../services/rateLimiter';
import { checkForUpdatesManual } from '../services/updateService';

function usePressScale(to = 0.97) {
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
    const [rollLocked, setRollLocked] = useState(true);

    const [dailyCount, setDailyCount] = useState(0);
    const [dailyMax, setDailyMax] = useState(50);
    const [lastFetch, setLastFetch] = useState<string | null>(null);
    const [cacheAge, setCacheAge] = useState<string | null>(null);

    const backScale = usePressScale();
    const saveScale = usePressScale();
    const animHeader = useFade(0);
    const animBody = useFade(60);

    const loadStats = useCallback(async () => {
        const daily = await getDailyRequestCount();
        setDailyCount(daily.count);
        setDailyMax(daily.max);
        setLastFetch(await getLastFetchTime());
        setCacheAge(await getLastCacheTimestamp());
    }, []);

    useEffect(() => { loadStats(); }, [loadStats]);

    const handleSave = async () => {
        if (!rollNumber.trim()) { Alert.alert('Required', 'Roll number cannot be empty.'); return; }
        if (profile?.rollNumber && rollNumber.trim().toUpperCase() !== profile.rollNumber) {
            Alert.alert('Roll Number Changed', 'Changing your roll number will clear cached attendance data. Continue?', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Continue', onPress: async () => { await clearAllCache(); await doSave(); } },
            ]);
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
        Alert.alert('Unlock Roll Number', 'Your roll number is locked for security. Are you sure you want to edit it?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Unlock', style: 'destructive', onPress: () => setRollLocked(false) },
        ]);
    };

    const handleDeleteData = () => {
        Alert.alert('Delete All Data', 'This will permanently delete your profile, cached attendance, and all app data. This cannot be undone.', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete Everything', style: 'destructive',
                onPress: async () => {
                    try {
                        await deleteAllData();
                        setTimeout(() => router.replace('/setup'), 200);
                    } catch (e) {
                        console.error('[Settings] Delete error:', e);
                        Alert.alert('Error', 'Failed to delete data.');
                    }
                },
            },
        ]);
    };

    const semLabel = SEMESTER_OPTIONS.find((s) => s.value === semester)?.label || '';

    return (
        <View style={s.screen}>

            {/* Header */}
            <Animated.View style={[s.headerRow, animHeader, { paddingTop: Math.max(insets.top + 16, 64) }]}>
                <Animated.View style={{ transform: [{ scale: backScale.scale }] }}>
                    <TouchableOpacity
                        style={s.iconBtn}
                        onPress={() => router.back()}
                        onPressIn={backScale.onPressIn}
                        onPressOut={backScale.onPressOut}
                        activeOpacity={1}
                    >
                        <Ionicons name="arrow-back" size={20} color="white" />
                    </TouchableOpacity>
                </Animated.View>
                <View>
                    <Text style={s.screenLabel}>Settings</Text>
                    <Text style={s.screenSub}>{profile?.displayName || profile?.rollNumber || 'Your profile'}</Text>
                </View>
                {/* spacer to balance back btn */}
                <View style={{ width: 40 }} />
            </Animated.View>

            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingBottom: Math.max(insets.bottom + 24, 24) }}
                showsVerticalScrollIndicator={false}
            >
                <Animated.View style={animBody}>

                    {/* ── Profile ── */}
                    <View style={s.section}>
                        <Text style={s.sectionLabel}>PROFILE</Text>
                        <View style={s.card}>

                            {/* Roll Number */}
                            <TouchableOpacity onPress={rollLocked ? handleUnlockRoll : undefined} activeOpacity={rollLocked ? 0.7 : 1}>
                                <View style={s.fieldRow}>
                                    <Ionicons
                                        name={rollLocked ? 'lock-closed-outline' : 'id-card-outline'}
                                        size={18}
                                        color={rollLocked ? '#EF4444' : '#9CA3AF'}
                                    />
                                    <TextInput
                                        style={[s.fieldInput, rollLocked && { color: '#6B7280' }]}
                                        value={rollNumber}
                                        onChangeText={setRollNumber}
                                        autoCapitalize="characters"
                                        autoCorrect={false}
                                        editable={!rollLocked}
                                        placeholder="Roll Number"
                                        placeholderTextColor="#4B5563"
                                    />
                                    {rollLocked && (
                                        <Text style={s.lockedBadge}>LOCKED</Text>
                                    )}
                                </View>
                            </TouchableOpacity>

                            <View style={s.divider} />

                            {/* Semester picker */}
                            <TouchableOpacity onPress={() => setShowSemPicker(!showSemPicker)} activeOpacity={0.8}>
                                <View style={s.fieldRow}>
                                    <Ionicons name="calendar-outline" size={18} color="#9CA3AF" />
                                    <Text style={[s.fieldInput, { lineHeight: 22 }]}>{semLabel}</Text>
                                    <Ionicons name={showSemPicker ? 'chevron-up' : 'chevron-down'} size={16} color="#6B7280" />
                                </View>
                            </TouchableOpacity>

                            {showSemPicker && (
                                <View style={s.pickerWrap}>
                                    {SEMESTER_OPTIONS.map((opt, idx) => (
                                        <TouchableOpacity
                                            key={opt.value}
                                            style={[
                                                s.pickerRow,
                                                idx < SEMESTER_OPTIONS.length - 1 && s.pickerDivider,
                                                semester === opt.value && s.pickerRowActive,
                                            ]}
                                            onPress={() => { setSemester(opt.value); setShowSemPicker(false); }}
                                        >
                                            <Text style={[s.pickerText, semester === opt.value && s.pickerTextActive]}>
                                                {opt.label}
                                            </Text>
                                            {semester === opt.value && <Ionicons name="checkmark" size={16} color="#fff" />}
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            )}

                            <View style={s.divider} />

                            {/* Display Name */}
                            <View style={s.fieldRow}>
                                <Ionicons name="person-outline" size={18} color="#9CA3AF" />
                                <TextInput
                                    style={s.fieldInput}
                                    value={displayName}
                                    onChangeText={setDisplayName}
                                    autoCorrect={false}
                                    placeholder="Display Name (optional)"
                                    placeholderTextColor="#4B5563"
                                />
                            </View>
                        </View>

                        {/* Save */}
                        <Animated.View style={{ transform: [{ scale: saveScale.scale }], marginTop: 12 }}>
                            <TouchableOpacity
                                style={[s.saveBtn, saved && s.saveBtnSuccess]}
                                onPress={handleSave}
                                onPressIn={saveScale.onPressIn}
                                onPressOut={saveScale.onPressOut}
                                activeOpacity={1}
                            >
                                <Ionicons name={saved ? 'checkmark-circle' : 'save-outline'} size={18} color={saved ? '#fff' : '#000'} />
                                <Text style={[s.saveBtnText, saved && { color: '#fff' }]}>{saved ? 'Saved!' : 'Save Changes'}</Text>
                            </TouchableOpacity>
                        </Animated.View>
                    </View>

                    {/* ── Sync Status ── */}
                    <View style={s.section}>
                        <Text style={s.sectionLabel}>SYNC STATUS</Text>
                        <View style={s.card}>
                            <View style={[s.statRow, { alignItems: 'flex-start' }]}>
                                <View>
                                    <Text style={s.statLabel}>Daily Syncs Used</Text>
                                    <Text style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>Resets at midnight</Text>
                                </View>
                                <Text style={[s.statValue, dailyCount >= dailyMax && { color: '#EF4444' }]}>
                                    {dailyCount} / {dailyMax}
                                </Text>
                            </View>
                            <View style={s.divider} />
                            <View style={s.statRow}>
                                <Text style={s.statLabel}>Last Synced</Text>
                                <Text style={s.statValue}>{lastFetch ? timeAgo(lastFetch) : 'Never'}</Text>
                            </View>
                            <View style={s.divider} />
                            <View style={s.statRow}>
                                <Text style={s.statLabel}>Data Saved</Text>
                                <Text style={s.statValue}>{cacheAge ? timeAgo(cacheAge) : 'No offline data'}</Text>
                            </View>
                        </View>
                    </View>

                    {/* ── General ── */}
                    <View style={s.section}>
                        <Text style={s.sectionLabel}>GENERAL</Text>
                        <View style={s.card}>
                            <TouchableOpacity style={s.rowItem} onPress={checkForUpdatesManual} activeOpacity={0.7}>
                                <View style={[s.rowIcon, { backgroundColor: 'rgba(34,197,94,0.15)' }]}>
                                    <Ionicons name="cloud-download-outline" size={18} color="#22C55E" />
                                </View>
                                <View style={{ flex: 1, marginLeft: 14 }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                        <Text style={s.rowTitle}>Check for Updates</Text>
                                        <View style={s.recommendedBadge}>
                                            <Text style={s.recommendedText}>RECOMMENDED</Text>
                                        </View>
                                    </View>
                                    <Text style={s.caption}>Get the latest improvements instantly</Text>
                                </View>
                                <Ionicons name="chevron-forward" size={16} color="#374151" />
                            </TouchableOpacity>
                            <View style={s.divider} />
                            <TouchableOpacity style={s.rowItem} onPress={() => Linking.openURL('https://expo.dev/accounts/ofcatul/projects/atulsahu/builds/c7680a34-3bc4-4128-9eb0-4f5a1159ff11')} activeOpacity={0.7}>
                                <View style={[s.rowIcon, { backgroundColor: 'rgba(59,130,246,0.12)' }]}>
                                    <Ionicons name="download-outline" size={18} color="#3B82F6" />
                                </View>
                                <View style={{ flex: 1, marginLeft: 14 }}>
                                    <Text style={s.rowTitle}>Reinstall App</Text>
                                    <Text style={s.caption}>Download a fresh copy of the app</Text>
                                </View>
                                <Ionicons name="open-outline" size={15} color="#374151" />
                            </TouchableOpacity>
                            <View style={s.divider} />
                            <TouchableOpacity style={s.rowItem} onPress={() => Linking.openURL('https://sxcran.ac.in/Student/AttendanceSummary')} activeOpacity={0.7}>
                                <View style={[s.rowIcon, { backgroundColor: 'rgba(59,130,246,0.12)' }]}>
                                    <Ionicons name="globe-outline" size={18} color="#3B82F6" />
                                </View>
                                <View style={{ flex: 1, marginLeft: 14 }}>
                                    <Text style={s.rowTitle}>College Portal</Text>
                                    <Text style={s.caption}>View your official attendance</Text>
                                </View>
                                <Ionicons name="open-outline" size={15} color="#374151" />
                            </TouchableOpacity>
                            <View style={s.divider} />
                            <TouchableOpacity style={s.rowItem} onPress={() => router.push('/privacy')} activeOpacity={0.7}>
                                <View style={[s.rowIcon, { backgroundColor: 'rgba(168,85,247,0.12)' }]}>
                                    <Ionicons name="shield-checkmark-outline" size={18} color="#A855F7" />
                                </View>
                                <View style={{ flex: 1, marginLeft: 14 }}>
                                    <Text style={s.rowTitle}>Privacy Notice</Text>
                                    <Text style={s.caption}>See how we use your data</Text>
                                </View>
                                <Ionicons name="chevron-forward" size={16} color="#374151" />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* ── Danger Zone ── */}
                    <View style={s.section}>
                        <Text style={s.sectionLabel}>DANGER ZONE</Text>
                        <View style={s.card}>
                            <TouchableOpacity
                                style={s.rowItem}
                                onPress={() => Alert.alert('Refresh Data', 'This will clear offline saved data. The app will fetch fresh data seamlessly on next load.', [
                                    { text: 'Cancel' },
                                    { text: 'Refresh', style: 'destructive', onPress: () => { clearAllCache(); loadStats(); } },
                                ])}
                                activeOpacity={0.7}
                            >
                                <View style={[s.rowIcon, { backgroundColor: 'rgba(245,158,11,0.12)' }]}>
                                    <Ionicons name="refresh-outline" size={18} color="#F59E0B" />
                                </View>
                                <View style={{ flex: 1, marginLeft: 14 }}>
                                    <Text style={s.rowTitle}>Refresh My Data</Text>
                                    <Text style={s.caption}>Force a fresh sync next time you open</Text>
                                </View>
                            </TouchableOpacity>
                            <View style={s.divider} />
                            <TouchableOpacity style={s.rowItem} onPress={handleDeleteData} activeOpacity={0.7}>
                                <View style={[s.rowIcon, { backgroundColor: 'rgba(239,68,68,0.12)' }]}>
                                    <Ionicons name="trash-outline" size={18} color="#EF4444" />
                                </View>
                                <View style={{ flex: 1, marginLeft: 14 }}>
                                    <Text style={[s.rowTitle, { color: '#EF4444' }]}>Reset App</Text>
                                    <Text style={s.caption}>Wipe everything and start over</Text>
                                </View>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* ── Disclaimer ── */}
                    <View style={s.section}>
                        <Text style={s.sectionLabel}>DISCLAIMER</Text>
                        <View style={[s.card, { padding: 16, backgroundColor: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.05)' }]}>
                            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
                                <Ionicons name="shield-half-outline" size={18} color="#6B7280" style={{ marginTop: 2 }} />
                                <Text style={[s.disclaimerText, { flex: 1 }]}>
                                    AttendEase is an independent, unofficial app built to help students track their attendance. It is not affiliated with, authorized by, or officially endorsed by St. Xavier's College, Ranchi.
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* ── Portfolio ── */}
                    <View style={s.section}>
                        <Text style={s.sectionLabel}>PORTFOLIO</Text>
                        <View style={s.card}>
                            <TouchableOpacity style={s.rowItem} onPress={() => Linking.openURL('https://atulsahu.in')} activeOpacity={0.7}>
                                <View style={[s.rowIcon, { backgroundColor: 'rgba(255,255,255,0.06)' }]}>
                                    <Ionicons name="briefcase-outline" size={18} color="#9CA3AF" />
                                </View>
                                <View style={{ flex: 1, marginLeft: 14 }}>
                                    <Text style={s.rowTitle}>My Portfolio</Text>
                                    <Text style={s.caption}>atulsahu.in</Text>
                                </View>
                                <Ionicons name="open-outline" size={15} color="#374151" />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Footer */}
                    <View style={{ alignItems: 'center', marginTop: 32, marginBottom: 16 }}>
                        <View style={{ backgroundColor: '#121212', borderRadius: 100, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10 }}>
                                <Text style={{ color: '#9CA3AF', fontSize: 13, fontWeight: '500', marginRight: 12 }}>Built by Atul</Text>
                                <View style={{ flexDirection: 'row', gap: 12 }}>
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
                        </View>
                    </View>

                </Animated.View>
            </ScrollView>
        </View>
    );
}

const s = StyleSheet.create({
    screen: { flex: 1, backgroundColor: '#0B0B0B' },

    headerRow: { paddingHorizontal: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 20 },
    screenLabel: { fontSize: 24, fontWeight: '600', color: '#FFFFFF', letterSpacing: -0.5, textAlign: 'center' },
    screenSub: { fontSize: 14, color: '#9CA3AF', marginTop: 2, textAlign: 'center' },
    iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#121212', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },

    section: { paddingHorizontal: 16, marginTop: 24 },
    sectionLabel: { fontSize: 12, fontWeight: '600', letterSpacing: 1, color: '#9CA3AF', marginBottom: 10 },

    card: { backgroundColor: '#121212', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', overflow: 'hidden' },
    divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.05)', marginHorizontal: 16 },

    fieldRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 4 },
    fieldInput: { flex: 1, paddingVertical: 16, paddingHorizontal: 12, color: '#FFFFFF', fontSize: 15, letterSpacing: -0.2 },
    lockedBadge: { fontSize: 10, color: '#EF4444', fontWeight: '700', letterSpacing: 0.5 },

    pickerWrap: { backgroundColor: '#1A1A1A', marginHorizontal: 0 },
    pickerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 13 },
    pickerDivider: { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
    pickerRowActive: { backgroundColor: 'rgba(255,255,255,0.05)' },
    pickerText: { fontSize: 15, color: '#6B7280' },
    pickerTextActive: { color: '#fff', fontWeight: '600' },

    saveBtn: { backgroundColor: '#FFFFFF', borderRadius: 40, paddingVertical: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
    saveBtnSuccess: { backgroundColor: '#22C55E' },
    saveBtnText: { color: '#000', fontSize: 16, fontWeight: '600' },

    rowItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
    rowIcon: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    rowTitle: { fontSize: 15, color: '#FFFFFF', fontWeight: '500', letterSpacing: -0.3 },
    caption: { fontSize: 12, color: '#6B7280', marginTop: 2 },
    recommendedBadge: { backgroundColor: 'rgba(34,197,94,0.15)', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
    recommendedText: { fontSize: 9, color: '#22C55E', fontWeight: '700', letterSpacing: 0.5 },

    statRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
    statLabel: { fontSize: 14, color: '#9CA3AF' },
    statValue: { fontSize: 14, color: '#FFFFFF', fontWeight: '600' },

    footerText: { fontSize: 12, color: '#374151', letterSpacing: 0.3 },
    disclaimerText: { fontSize: 12, color: '#6B7280', lineHeight: 18, textAlign: 'justify' },
});
