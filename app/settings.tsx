import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../store/useAppStore';
import { SEMESTER_OPTIONS, StudentProfile } from '../types';
import { clearAllCache } from '../services/storage';

export default function SettingsScreen() {
    const router = useRouter();
    const { profile, setProfile } = useAppStore();
    const [rollNumber, setRollNumber] = useState(profile?.rollNumber || '');
    const [semester, setSemester] = useState(profile?.semester || 'I');
    const [displayName, setDisplayName] = useState(profile?.displayName || '');
    const [showSemPicker, setShowSemPicker] = useState(false);
    const [saved, setSaved] = useState(false);

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
        <View style={{ flex: 1, backgroundColor: '#0f172a' }}>
            <View style={{ paddingTop: 56, paddingBottom: 16, paddingHorizontal: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#1e293b' }}>
                <TouchableOpacity style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#1e293b', alignItems: 'center', justifyContent: 'center' }} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={20} color="white" />
                </TouchableOpacity>
                <Text style={{ color: 'white', fontSize: 18, fontWeight: 'bold' }}>Settings</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40 }}>
                <View style={{ paddingHorizontal: 24, paddingTop: 24 }}>
                    <Text style={{ color: '#94a3b8', fontSize: 11, fontWeight: 'bold', letterSpacing: 1, marginBottom: 16 }}>PROFILE</Text>

                    {/* Roll Number */}
                    <View style={{ marginBottom: 16 }}>
                        <Text style={{ fontSize: 13, fontWeight: '600', color: '#cbd5e1', marginBottom: 8 }}>Roll Number</Text>
                        <View style={{ backgroundColor: '#1e293b', borderRadius: 12, borderWidth: 1, borderColor: '#334155', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16 }}>
                            <Ionicons name="id-card-outline" size={20} color="#94a3b8" />
                            <TextInput style={{ flex: 1, paddingVertical: 16, paddingHorizontal: 12, color: 'white', fontSize: 16 }} value={rollNumber} onChangeText={setRollNumber} autoCapitalize="characters" autoCorrect={false} />
                        </View>
                    </View>

                    {/* Semester */}
                    <View style={{ marginBottom: 16 }}>
                        <Text style={{ fontSize: 13, fontWeight: '600', color: '#cbd5e1', marginBottom: 8 }}>Semester</Text>
                        <TouchableOpacity style={{ backgroundColor: '#1e293b', borderRadius: 12, borderWidth: 1, borderColor: '#334155', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 16 }} onPress={() => setShowSemPicker(!showSemPicker)}>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <Ionicons name="calendar-outline" size={20} color="#94a3b8" />
                                <Text style={{ color: 'white', fontSize: 16, marginLeft: 12 }}>{semLabel}</Text>
                            </View>
                            <Ionicons name={showSemPicker ? 'chevron-up' : 'chevron-down'} size={20} color="#94a3b8" />
                        </TouchableOpacity>
                        {showSemPicker && (
                            <View style={{ backgroundColor: '#1e293b', borderRadius: 12, borderWidth: 1, borderColor: '#334155', marginTop: 8, overflow: 'hidden' }}>
                                {SEMESTER_OPTIONS.map((opt) => (
                                    <TouchableOpacity key={opt.value} style={{ paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#334155', flexDirection: 'row', justifyContent: 'space-between', backgroundColor: semester === opt.value ? 'rgba(37,99,235,0.15)' : 'transparent' }} onPress={() => { setSemester(opt.value); setShowSemPicker(false); }}>
                                        <Text style={{ fontSize: 15, color: semester === opt.value ? '#60a5fa' : '#cbd5e1', fontWeight: semester === opt.value ? '600' : '400' }}>{opt.label}</Text>
                                        {semester === opt.value && <Ionicons name="checkmark-circle" size={20} color="#60a5fa" />}
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}
                    </View>

                    {/* Display Name */}
                    <View style={{ marginBottom: 24 }}>
                        <Text style={{ fontSize: 13, fontWeight: '600', color: '#cbd5e1', marginBottom: 8 }}>Display Name</Text>
                        <View style={{ backgroundColor: '#1e293b', borderRadius: 12, borderWidth: 1, borderColor: '#334155', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16 }}>
                            <Ionicons name="person-outline" size={20} color="#94a3b8" />
                            <TextInput style={{ flex: 1, paddingVertical: 16, paddingHorizontal: 12, color: 'white', fontSize: 16 }} placeholder="Your name" placeholderTextColor="#64748b" value={displayName} onChangeText={setDisplayName} autoCorrect={false} />
                        </View>
                    </View>

                    {/* Save */}
                    <TouchableOpacity style={{ borderRadius: 12, paddingVertical: 16, alignItems: 'center', backgroundColor: saved ? '#059669' : '#2563eb', flexDirection: 'row', justifyContent: 'center' }} onPress={handleSave} activeOpacity={0.8}>
                        <Ionicons name={saved ? 'checkmark-circle' : 'save-outline'} size={20} color="white" />
                        <Text style={{ color: 'white', fontSize: 16, fontWeight: 'bold', marginLeft: 8 }}>{saved ? 'Saved!' : 'Save Changes'}</Text>
                    </TouchableOpacity>
                </View>

                {/* Data Section */}
                <View style={{ paddingHorizontal: 24, paddingTop: 32 }}>
                    <Text style={{ color: '#94a3b8', fontSize: 11, fontWeight: 'bold', letterSpacing: 1, marginBottom: 16 }}>DATA</Text>
                    <TouchableOpacity style={{ backgroundColor: '#1e293b', borderRadius: 12, borderWidth: 1, borderColor: '#334155', padding: 16, flexDirection: 'row', alignItems: 'center' }} onPress={() => Alert.alert('Clear Cache', 'Remove cached attendance data?', [{ text: 'Cancel' }, { text: 'Clear', style: 'destructive', onPress: () => clearAllCache() }])}>
                        <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(245,158,11,0.12)', alignItems: 'center', justifyContent: 'center' }}>
                            <Ionicons name="trash-outline" size={20} color="#f59e0b" />
                        </View>
                        <View style={{ marginLeft: 12, flex: 1 }}>
                            <Text style={{ color: 'white', fontWeight: '600' }}>Clear Cached Data</Text>
                            <Text style={{ color: '#64748b', fontSize: 11, marginTop: 2 }}>Remove locally stored results</Text>
                        </View>
                    </TouchableOpacity>
                </View>

                {/* About */}
                <View style={{ paddingHorizontal: 24, paddingTop: 32 }}>
                    <Text style={{ color: '#94a3b8', fontSize: 11, fontWeight: 'bold', letterSpacing: 1, marginBottom: 16 }}>ABOUT</Text>
                    <TouchableOpacity style={{ backgroundColor: '#1e293b', borderRadius: 12, borderWidth: 1, borderColor: '#334155', padding: 16, flexDirection: 'row', alignItems: 'center', marginBottom: 12 }} onPress={() => Linking.openURL('https://sxcran.ac.in/Student/AttendanceSummary')}>
                        <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(37,99,235,0.12)', alignItems: 'center', justifyContent: 'center' }}>
                            <Ionicons name="globe-outline" size={20} color="#3b82f6" />
                        </View>
                        <View style={{ marginLeft: 12, flex: 1 }}>
                            <Text style={{ color: 'white', fontWeight: '600' }}>College Portal</Text>
                            <Text style={{ color: '#64748b', fontSize: 11, marginTop: 2 }}>sxcran.ac.in</Text>
                        </View>
                        <Ionicons name="open-outline" size={18} color="#475569" />
                    </TouchableOpacity>

                    <View style={{ backgroundColor: 'rgba(30,41,59,0.5)', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: 'rgba(51,65,85,0.3)', marginTop: 12 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                            <Ionicons name="shield-checkmark" size={16} color="#10b981" />
                            <Text style={{ color: '#34d399', fontSize: 13, fontWeight: '600', marginLeft: 6 }}>Privacy</Text>
                        </View>
                        <Text style={{ color: '#64748b', fontSize: 11, lineHeight: 18 }}>
                            Your roll number is stored encrypted on your device. No data is sent to third-party servers. The app only communicates with the SXC Ranchi portal.
                        </Text>
                    </View>
                </View>
            </ScrollView>
        </View>
    );
}
