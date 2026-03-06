import React, { useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, ScrollView,
    KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAppStore } from '../store/useAppStore';
import { SEMESTER_OPTIONS, StudentProfile } from '../types';
import { Ionicons } from '@expo/vector-icons';

export default function SetupScreen() {
    const [rollNumber, setRollNumber] = useState('');
    const [semester, setSemester] = useState('I');
    const [displayName, setDisplayName] = useState('');
    const [showSemPicker, setShowSemPicker] = useState(false);
    const { setProfile } = useAppStore();
    const router = useRouter();

    const handleSave = async () => {
        if (!rollNumber.trim()) {
            Alert.alert('Required', 'Please enter your Roll Number / Form No.');
            return;
        }
        const profile: StudentProfile = {
            rollNumber: rollNumber.trim().toUpperCase(),
            semester,
            displayName: displayName.trim() || undefined,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        await setProfile(profile);
        router.replace('/home');
    };

    const semLabel = SEMESTER_OPTIONS.find((s) => s.value === semester)?.label || '';

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1, backgroundColor: '#0f172a' }}
        >
            <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
                {/* Header */}
                <View style={{ paddingTop: 64, paddingBottom: 32, alignItems: 'center', paddingHorizontal: 24 }}>
                    <View style={{ width: 80, height: 80, borderRadius: 16, backgroundColor: '#2563eb', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                        <Ionicons name="school" size={40} color="white" />
                    </View>
                    <Text style={{ fontSize: 28, fontWeight: 'bold', color: 'white', marginBottom: 8 }}>AttendEase</Text>
                    <Text style={{ fontSize: 15, color: '#94a3b8', textAlign: 'center', lineHeight: 22 }}>
                        Set up your profile to check attendance{'\n'}with a single tap
                    </Text>
                </View>

                {/* Form */}
                <View style={{ paddingHorizontal: 24, gap: 20 }}>
                    {/* Roll Number */}
                    <View>
                        <Text style={{ fontSize: 13, fontWeight: '600', color: '#cbd5e1', marginBottom: 8, marginLeft: 4 }}>
                            Roll Number / Form No. <Text style={{ color: '#f87171' }}>*</Text>
                        </Text>
                        <View style={{ backgroundColor: '#1e293b', borderRadius: 12, borderWidth: 1, borderColor: '#334155', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16 }}>
                            <Ionicons name="id-card-outline" size={20} color="#94a3b8" />
                            <TextInput
                                style={{ flex: 1, paddingVertical: 16, paddingHorizontal: 12, color: 'white', fontSize: 16 }}
                                placeholder="e.g. 24VBIT057091"
                                placeholderTextColor="#64748b"
                                value={rollNumber}
                                onChangeText={setRollNumber}
                                autoCapitalize="characters"
                                autoCorrect={false}
                            />
                        </View>
                    </View>

                    {/* Semester */}
                    <View>
                        <Text style={{ fontSize: 13, fontWeight: '600', color: '#cbd5e1', marginBottom: 8, marginLeft: 4 }}>Semester</Text>
                        <TouchableOpacity
                            style={{ backgroundColor: '#1e293b', borderRadius: 12, borderWidth: 1, borderColor: '#334155', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 16 }}
                            onPress={() => setShowSemPicker(!showSemPicker)}
                        >
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <Ionicons name="calendar-outline" size={20} color="#94a3b8" />
                                <Text style={{ color: 'white', fontSize: 16, marginLeft: 12 }}>{semLabel}</Text>
                            </View>
                            <Ionicons name={showSemPicker ? 'chevron-up' : 'chevron-down'} size={20} color="#94a3b8" />
                        </TouchableOpacity>

                        {showSemPicker && (
                            <View style={{ backgroundColor: '#1e293b', borderRadius: 12, borderWidth: 1, borderColor: '#334155', marginTop: 8, overflow: 'hidden' }}>
                                {SEMESTER_OPTIONS.map((opt) => (
                                    <TouchableOpacity
                                        key={opt.value}
                                        style={{
                                            paddingHorizontal: 16, paddingVertical: 12,
                                            borderBottomWidth: 1, borderBottomColor: '#334155',
                                            flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                                            backgroundColor: semester === opt.value ? 'rgba(37,99,235,0.15)' : 'transparent',
                                        }}
                                        onPress={() => { setSemester(opt.value); setShowSemPicker(false); }}
                                    >
                                        <Text style={{ fontSize: 15, color: semester === opt.value ? '#60a5fa' : '#cbd5e1', fontWeight: semester === opt.value ? '600' : '400' }}>
                                            {opt.label}
                                        </Text>
                                        {semester === opt.value && <Ionicons name="checkmark-circle" size={20} color="#60a5fa" />}
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}
                    </View>

                    {/* Display Name */}
                    <View>
                        <Text style={{ fontSize: 13, fontWeight: '600', color: '#cbd5e1', marginBottom: 8, marginLeft: 4 }}>
                            Display Name <Text style={{ color: '#64748b' }}>(optional)</Text>
                        </Text>
                        <View style={{ backgroundColor: '#1e293b', borderRadius: 12, borderWidth: 1, borderColor: '#334155', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16 }}>
                            <Ionicons name="person-outline" size={20} color="#94a3b8" />
                            <TextInput
                                style={{ flex: 1, paddingVertical: 16, paddingHorizontal: 12, color: 'white', fontSize: 16 }}
                                placeholder="Your name for greeting"
                                placeholderTextColor="#64748b"
                                value={displayName}
                                onChangeText={setDisplayName}
                                autoCorrect={false}
                            />
                        </View>
                    </View>
                </View>

                {/* Save Button */}
                <View style={{ paddingHorizontal: 24, marginTop: 32, marginBottom: 40 }}>
                    <TouchableOpacity
                        style={{ backgroundColor: '#2563eb', borderRadius: 12, paddingVertical: 16, alignItems: 'center' }}
                        onPress={handleSave}
                        activeOpacity={0.8}
                    >
                        <Text style={{ color: 'white', fontSize: 18, fontWeight: 'bold' }}>Get Started</Text>
                    </TouchableOpacity>
                    <Text style={{ color: '#64748b', fontSize: 12, textAlign: 'center', marginTop: 16, paddingHorizontal: 16 }}>
                        Your data is stored securely on your device only.{'\n'}Nothing is shared except with the college portal.
                    </Text>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}
