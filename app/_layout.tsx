import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
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

        </View>
    );
}
