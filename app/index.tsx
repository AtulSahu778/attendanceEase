import { Redirect } from 'expo-router';
import { useAppStore } from '../store/useAppStore';

export default function Index() {
    const { isOnboarded } = useAppStore();
    if (isOnboarded) return <Redirect href="/home" />;
    return <Redirect href="/setup" />;
}
