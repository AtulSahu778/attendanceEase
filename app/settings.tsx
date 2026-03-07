import React, { useRef, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, Linking, StyleSheet, Animated } from 'react-native';
import { BlurView } from 'expo-blur';

import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../store/useAppStore';
import { SEMESTER_OPTIONS, StudentProfile } from '../types';
import { clearAllCache } from '../services/storage';

function usePressScale(to = 0.97) {
    const scale = useRef(new Animated.Value(1)).current;
    const onPressIn = () => Animated.timing(scale, { toValue: to, duration: 120, useNativeDriver: true }).start();
    const onPressOut = () => Animated.spring(scale, { toValue: 1, damping: 15, useNativeDriver: true }).start();
    return { scale, onPressIn, onPressOut };
}

export default function SettingsScreen() {
    const router = useRouter();
    const { profile, setProfile } = useAppStore();
    const [rollNumber, setRollNumber] = useState(profile?.rollNumber || '');
    const [semester, setSemester] = useState(profile?.semester || 'I');
    const [displayName, setDisplayName] = useState(profile?.displayName || '');
    const [showSemPicker, setShowSemPicker] = useState(false);
    const [saved, setSaved] = useState(false);

    const backScale = usePressScale();
    const saveScale = usePressScale();

    const handleSave = async () => {
        if (!rollNumber.trim()) { Alert.alert('Required', 'Roll number cannot be empty.'); return; }
        const updated: StudentProfile = {
            rollNumber: rollNumber.trim().toUpperCase(), semester,
            displayName: displayName.trim() || undefined,
            createdAt: profile?.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        await setProfile(updated);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    const semLabel = SEMESTER_OPTIONS.find((s) => s.value === semester)?.label || '';

    return (
        <View style={s.screen}>


            {/* Header */}
            <View style={s.header}>
                <Animated.View style={{ transform: [{ scale: backScale.scale }] }}>
                    <TouchableOpacity style={s.iconBtn} onPress={() => router.back()} onPressIn={backScale.onPressIn} onPressOut={backScale.onPressOut} activeOpacity={1}>
                        <Ionicons name="arrow-back" size={20} color="white" />
                    </TouchableOpacity>
                </Animated.View>
                <Text style={s.screenTitle}>Settings</Text>
                <View style={{ width: 38 }} />
            </View>

            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>

                {/* Profile Section */}
                <View style={s.section}>
                    <Text style={s.sectionLabel}>PROFILE</Text>

                    {/* Roll Number */}
                    <BlurView intensity={40} tint="dark" style={[s.glassInput, { marginBottom: 12 }]}>
                        <Ionicons name="id-card-outline" size={20} color="rgba(255,255,255,0.4)" />
                        <TextInput
                            style={s.textInput} value={rollNumber} onChangeText={setRollNumber}
                            autoCapitalize="characters" autoCorrect={false}
                            placeholder="Roll Number" placeholderTextColor="rgba(255,255,255,0.25)"
                        />
                    </BlurView>

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

                {/* Data Section */}
                <View style={s.section}>
                    <Text style={s.sectionLabel}>DATA</Text>
                    <TouchableOpacity
                        onPress={() => Alert.alert('Clear Cache', 'Remove cached attendance data?', [
                            { text: 'Cancel' },
                            { text: 'Clear', style: 'destructive', onPress: () => clearAllCache() },
                        ])}
                        activeOpacity={0.8}
                    >
                        <BlurView intensity={40} tint="dark" style={[s.glassCard, { flexDirection: 'row', alignItems: 'center' }]}>
                            <View style={[s.rowIcon, { backgroundColor: 'rgba(255,59,48,0.15)' }]}>
                                <Ionicons name="trash-outline" size={19} color="rgba(255,59,48,0.85)" />
                            </View>
                            <View style={{ marginLeft: 14, flex: 1 }}>
                                <Text style={s.rowTitle}>Clear Cached Data</Text>
                                <Text style={s.caption}>Remove locally stored results</Text>
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

                    {/* Privacy Card */}
                    <BlurView intensity={30} tint="dark" style={[s.glassCard, { marginBottom: 10 }]}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8 }}>
                            <Ionicons name="shield-checkmark" size={16} color="rgb(52,199,89)" />
                            <Text style={{ color: 'rgb(52,199,89)', fontSize: 13, fontWeight: '600', letterSpacing: -0.2 }}>Privacy</Text>
                        </View>
                        <Text style={[s.caption, { lineHeight: 17 }]}>
                            Your roll number is stored encrypted on your device. No data is sent to third-party servers. The app only communicates with the SXC Ranchi portal.
                        </Text>
                    </BlurView>

                    {/* Disclaimer Card */}
                    <BlurView intensity={30} tint="dark" style={s.glassCard}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8 }}>
                            <Ionicons name="information-circle" size={16} color="rgba(255,255,255,0.7)" />
                            <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: 13, fontWeight: '600', letterSpacing: -0.2 }}>Disclaimer</Text>
                        </View>
                        <Text style={[s.caption, { lineHeight: 17 }]}>
                            AttendEase is an unofficial, independent tool created strictly for educational purposes to help students track their own attendance. This application is not affiliated with, endorsed by, or connected to St. Xavier's College, Ranchi. No intellectual property of the college is used or harmed.
                        </Text>
                    </BlurView>
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
    );
}

const s = StyleSheet.create({
    screen: { flex: 1, backgroundColor: '#000' },

    header: { paddingTop: 58, paddingHorizontal: 24, paddingBottom: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.07)' },
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
});
