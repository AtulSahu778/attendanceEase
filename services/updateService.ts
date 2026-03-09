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
 * Downloads the update but does NOT prompt an immediate reload.
 * The update will be applied automatically on the next cold start,
 * avoiding the risk of reloading into a broken version mid-session.
 */
export async function checkForUpdates(): Promise<UpdateStatus> {
    if (__DEV__) {
        return { available: false, downloaded: false };
    }

    try {
        const update = await Updates.checkForUpdateAsync();

        if (update.isAvailable) {
            await Updates.fetchUpdateAsync();
            // Update downloaded — it will apply on next app launch.
            // No reload prompt shown to avoid breaking the active session.
            return { available: true, downloaded: true };
        }

        return { available: false, downloaded: false };
    } catch (error: any) {
        // Silently fail — don't disrupt the user
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
