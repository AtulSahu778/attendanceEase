import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, Text, Linking, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useAppStore } from '../store/useAppStore';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
    const { loadProfile, isOnboarded } = useAppStore();
    const router = useRouter();
    const segments = useSegments();

    useEffect(() => {
        loadProfile().then(() => {
            SplashScreen.hideAsync();
        });
    }, []);

    useEffect(() => {
        const inSetup = segments[0] === 'setup';
        if (!isOnboarded && !inSetup) {
            router.replace('/setup');
        } else if (isOnboarded && inSetup) {
            router.replace('/home');
        }
    }, [isOnboarded, segments]);

    return (
        <View style={{ flex: 1, backgroundColor: '#000' }}>
            <StatusBar style="light" />
            <Stack
                screenOptions={{
                    headerShown: false,
                    contentStyle: { backgroundColor: '#000' },
                    animation: 'slide_from_right',
                }}
            >
                <Stack.Screen name="setup" />
                <Stack.Screen name="home" />
                <Stack.Screen name="result" />
                <Stack.Screen name="settings" />
            </Stack>

            {/* Global Footer */}
            <View pointerEvents="box-none" style={{ position: 'absolute', bottom: 16, left: 0, right: 0, alignItems: 'center' }}>
                <BlurView intensity={20} tint="dark" style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', paddingHorizontal: 18, paddingVertical: 10, borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' }}>
                    <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, letterSpacing: 0.3, fontWeight: '500', marginRight: 16 }}>
                        Built by Atul
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                        <TouchableOpacity onPress={() => Linking.openURL('https://github.com/AtulSahu778')} activeOpacity={0.6}>
                            <Ionicons name="logo-github" size={16} color="rgba(255,255,255,0.5)" />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => Linking.openURL('https://instagram.com/ofc_atul')} activeOpacity={0.6}>
                            <Ionicons name="logo-instagram" size={16} color="rgba(255,255,255,0.5)" />
                        </TouchableOpacity>
                    </View>
                </BlurView>
            </View>
        </View>
    );
}
