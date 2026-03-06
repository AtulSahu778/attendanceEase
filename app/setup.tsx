import React, { useState, useRef } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, ScrollView,
    KeyboardAvoidingView, Platform, Alert, StyleSheet, Animated,
} from 'react-native';
import { BlurView } from 'expo-blur';

import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../store/useAppStore';
import { SEMESTER_OPTIONS, StudentProfile } from '../types';

// ─── Press-scale animation ───
function usePressScale(to = 0.96) {
    const scale = useRef(new Animated.Value(1)).current;
    const onPressIn = () => Animated.timing(scale, { toValue: to, duration: 120, useNativeDriver: true }).start();
    const onPressOut = () => Animated.spring(scale, { toValue: 1, damping: 15, useNativeDriver: true }).start();
    return { scale, onPressIn, onPressOut };
}

export default function SetupScreen() {
    const [rollNumber, setRollNumber] = useState('');
    const [semester, setSemester] = useState('I');
    const [displayName, setDisplayName] = useState('');
    const [showSemPicker, setShowSemPicker] = useState(false);
    const { setProfile } = useAppStore();
    const router = useRouter();

    const ctaScale = usePressScale(0.97);
    const semScale = usePressScale();

    // Fade-in on mount
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(20)).current;
    React.useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 1, duration: 480, useNativeDriver: true }),
            Animated.timing(slideAnim, { toValue: 0, duration: 480, useNativeDriver: true }),
        ]).start();
    }, []);

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
        <View style={s.screen}>


            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
                    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>

                        {/* Header */}
                        <View style={s.header}>
                            <BlurView intensity={40} tint="dark" style={s.iconWrap}>
                                <Ionicons name="school" size={38} color="white" />
                            </BlurView>
                            <Text style={s.heroTitle}>AttendEase</Text>
                            <Text style={s.heroSub}>Set up once. Check attendance{'\n'}with a single tap.</Text>
                        </View>

                        {/* Form */}
                        <View style={s.formWrap}>

                            {/* Roll Number */}
                            <View style={s.fieldGroup}>
                                <Text style={s.fieldLabel}>ROLL NUMBER</Text>
                                <BlurView intensity={40} tint="dark" style={s.glassInput}>
                                    <Ionicons name="id-card-outline" size={20} color="rgba(255,255,255,0.4)" />
                                    <TextInput
                                        style={s.textInput}
                                        placeholder="e.g. 24VBIT057091"
                                        placeholderTextColor="rgba(255,255,255,0.25)"
                                        value={rollNumber}
                                        onChangeText={setRollNumber}
                                        autoCapitalize="characters"
                                        autoCorrect={false}
                                    />
                                </BlurView>
                            </View>

                            {/* Semester */}
                            <View style={s.fieldGroup}>
                                <Text style={s.fieldLabel}>SEMESTER</Text>
                                <Animated.View style={{ transform: [{ scale: semScale.scale }] }}>
                                    <TouchableOpacity
                                        onPress={() => setShowSemPicker(!showSemPicker)}
                                        onPressIn={semScale.onPressIn}
                                        onPressOut={semScale.onPressOut}
                                        activeOpacity={1}
                                    >
                                        <BlurView intensity={40} tint="dark" style={s.glassInput}>
                                            <Ionicons name="calendar-outline" size={20} color="rgba(255,255,255,0.4)" />
                                            <Text style={[s.textInput, { lineHeight: 22 }]}>{semLabel}</Text>
                                            <Ionicons name={showSemPicker ? 'chevron-up' : 'chevron-down'} size={18} color="rgba(255,255,255,0.4)" />
                                        </BlurView>
                                    </TouchableOpacity>
                                </Animated.View>

                                {showSemPicker && (
                                    <BlurView intensity={50} tint="dark" style={s.glassPicker}>
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
                                                {semester === opt.value && <Ionicons name="checkmark" size={16} color="white" />}
                                            </TouchableOpacity>
                                        ))}
                                    </BlurView>
                                )}
                            </View>

                            {/* Display Name */}
                            <View style={s.fieldGroup}>
                                <Text style={s.fieldLabel}>DISPLAY NAME <Text style={{ color: 'rgba(255,255,255,0.25)' }}>(OPTIONAL)</Text></Text>
                                <BlurView intensity={40} tint="dark" style={s.glassInput}>
                                    <Ionicons name="person-outline" size={20} color="rgba(255,255,255,0.4)" />
                                    <TextInput
                                        style={s.textInput}
                                        placeholder="Your name for greeting"
                                        placeholderTextColor="rgba(255,255,255,0.25)"
                                        value={displayName}
                                        onChangeText={setDisplayName}
                                        autoCorrect={false}
                                    />
                                </BlurView>
                            </View>
                        </View>

                        {/* CTA */}
                        <View style={{ paddingHorizontal: 24, marginTop: 16, marginBottom: 40 }}>
                            <Animated.View style={{ transform: [{ scale: ctaScale.scale }] }}>
                                <TouchableOpacity
                                    style={s.ctaButton}
                                    onPress={handleSave}
                                    onPressIn={ctaScale.onPressIn}
                                    onPressOut={ctaScale.onPressOut}
                                    activeOpacity={1}
                                >
                                    <Text style={s.ctaText}>Get Started</Text>
                                </TouchableOpacity>
                            </Animated.View>

                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 20, gap: 6 }}>
                                <Ionicons name="lock-closed" size={12} color="rgba(255,255,255,0.3)" />
                                <Text style={s.caption}>Stored securely on device. Nothing shared.</Text>
                            </View>
                        </View>

                    </Animated.View>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}

const s = StyleSheet.create({
    screen: { flex: 1, backgroundColor: '#000' },

    header: { paddingTop: 72, paddingBottom: 40, alignItems: 'center', paddingHorizontal: 24 },
    iconWrap: {
        width: 80, height: 80, borderRadius: 22,
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)',
        overflow: 'hidden', marginBottom: 20,
    },
    heroTitle: { fontSize: 28, fontWeight: '700', color: '#fff', letterSpacing: -1.2, marginBottom: 12 },
    heroSub: { fontSize: 15, color: 'rgba(255,255,255,0.55)', textAlign: 'center', lineHeight: 22, letterSpacing: -0.2 },
    formWrap: { paddingHorizontal: 24, gap: 16 },
    fieldGroup: { gap: 8 },
    fieldLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 0.8, color: 'rgba(255,255,255,0.35)', marginLeft: 8 },
    glassInput: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.10)',
        borderRadius: 16, borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.18)',
        overflow: 'hidden', paddingHorizontal: 16, paddingVertical: 2,
    },
    textInput: { flex: 1, paddingVertical: 18, paddingHorizontal: 12, color: '#fff', fontSize: 16, letterSpacing: -0.2 },
    glassPicker: {
        marginTop: 4, borderRadius: 16, borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.18)', overflow: 'hidden',
        backgroundColor: 'rgba(255,255,255,0.08)',
    },
    pickerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14 },
    pickerDivider: { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)' },
    pickerRowActive: { backgroundColor: 'rgba(255,255,255,0.10)' },
    pickerText: { fontSize: 15, color: 'rgba(255,255,255,0.6)', letterSpacing: -0.2 },
    pickerTextActive: { color: '#fff', fontWeight: '600' },
    ctaButton: {
        backgroundColor: 'rgba(255,255,255,0.95)',
        borderRadius: 16, paddingVertical: 18,
        alignItems: 'center',
        shadowColor: '#fff', shadowOpacity: 0.12, shadowRadius: 20, shadowOffset: { width: 0, height: 4 },
        elevation: 8,
    },
    ctaText: { color: '#000', fontSize: 17, fontWeight: '700', letterSpacing: -0.3 },
    caption: { fontSize: 11, color: 'rgba(255,255,255,0.30)', letterSpacing: 0.1 },
});
