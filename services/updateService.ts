/**
 * OTA Update Service for AttendEase
 *
 * Uses expo-updates to check, download, and apply over-the-air updates.
 * Only functional in standalone/EAS builds — no-op in development.
 */

import * as Updates from 'expo-updates';
import { Alert } from 'react-native';

export interface UpdateStatus {
    available: boolean;
    downloaded: boolean;
    error?: string;
}

/**
 * Silently check for updates on app launch.
 * Downloads and prompts user to reload if an update is found.
 */
export async function checkForUpdates(): Promise<UpdateStatus> {
    if (__DEV__) {
        return { available: false, downloaded: false };
    }

    try {
        const update = await Updates.checkForUpdateAsync();

        if (update.isAvailable) {
            await Updates.fetchUpdateAsync();

            Alert.alert(
                'Update Available',
                'A new version has been downloaded. Restart to apply?',
                [
                    { text: 'Later', style: 'cancel' },
                    { text: 'Restart', onPress: () => Updates.reloadAsync() },
                ]
            );

            return { available: true, downloaded: true };
        }

        return { available: false, downloaded: false };
    } catch (error: any) {
        console.log('Update check failed:', error?.message);
        return { available: false, downloaded: false, error: error?.message };
    }
}

/**
 * Manual update check (triggered from Settings).
 * Shows user-facing feedback for all outcomes.
 */
export async function checkForUpdatesManual(): Promise<void> {
    if (__DEV__) {
        Alert.alert(
            'Development Mode',
            'OTA updates are only available in production builds. Use Metro hot reload during development.'
        );
        return;
    }

    try {
        const update = await Updates.checkForUpdateAsync();

        if (update.isAvailable) {
            Alert.alert('Downloading Update…', 'Please wait while the update is downloaded.');
            await Updates.fetchUpdateAsync();

            Alert.alert(
                'Update Ready',
                'Restart the app to apply the update.',
                [
                    { text: 'Later', style: 'cancel' },
                    { text: 'Restart Now', onPress: () => Updates.reloadAsync() },
                ]
            );
        } else {
            Alert.alert('Up to Date', 'You are running the latest version.');
        }
    } catch (error: any) {
        Alert.alert(
            'Update Check Failed',
            'Could not check for updates. Please try again later.'
        );
    }
}
