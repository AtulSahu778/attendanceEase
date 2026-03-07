import React, { useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, Animated, Linking, Image, Alert } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';

export function usePressScale(to = 0.96) {
    const scale = useRef(new Animated.Value(1)).current;
    const onPressIn = () => Animated.timing(scale, { toValue: to, duration: 120, useNativeDriver: true }).start();
    const onPressOut = () => Animated.spring(scale, { toValue: 1, damping: 15, useNativeDriver: true }).start();
    return { scale, onPressIn, onPressOut };
}

export function DonationModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(20)).current;

    useEffect(() => {
        if (visible) {
            Animated.parallel([
                Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
                Animated.timing(slideAnim, { toValue: 0, duration: 300, useNativeDriver: true })
            ]).start();
        } else {
            fadeAnim.setValue(0);
            slideAnim.setValue(20);
        }
    }, [visible]);

    // Replace this with your actual UPI ID later
    const upiId = "your_upi_id@upi";
    const upiLink = `upi://pay?pa=${upiId}&pn=Atul%20Sahu&cu=INR`;

    // Auto-generate QR code via API
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(upiLink)}&bgcolor=255-255-255`;

    const handlePayPhonePe = async () => {
        const url = `phonepe://pay?pa=${upiId}&pn=Atul%20Sahu&cu=INR`;
        try {
            const supported = await Linking.canOpenURL(url);
            if (supported) {
                await Linking.openURL(url);
            } else {
                await Linking.openURL(upiLink);
            }
        } catch (e) {
            Alert.alert("Error", "Could not open PhonePe or any UPI app.");
        }
    };

    const handlePayGPay = async () => {
        const url = `tez://upi/pay?pa=${upiId}&pn=Atul%20Sahu&cu=INR`;
        try {
            const supported = await Linking.canOpenURL(url);
            if (supported) {
                await Linking.openURL(url);
            } else {
                // fallback to general UPI which shows intent chooser
                await Linking.openURL(upiLink);
            }
        } catch (e) {
            Alert.alert("Error", "Could not open Google Pay or any UPI app.");
        }
    };

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <View style={s.overlay}>
                <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFillObject} />

                <Animated.View style={[s.modalContainer, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
                    <TouchableOpacity style={s.closeBtn} onPress={onClose} activeOpacity={0.7}>
                        <Ionicons name="close" size={22} color="rgba(255,255,255,0.7)" />
                    </TouchableOpacity>

                    <View style={s.iconWrap}>
                        <Text style={{ fontSize: 32 }}>☕</Text>
                    </View>

                    <Text style={s.title}>Buy me a Coffee</Text>
                    <Text style={s.subtitle}>If you find this app helpful, consider buying me a coffee to support development!</Text>

                    <View style={s.qrBox}>
                        <Image source={{ uri: qrUrl }} style={s.qrImage} />
                    </View>
                    <Text style={s.upiText}>{upiId}</Text>

                    <View style={s.buttonRow}>
                        <TouchableOpacity style={[s.payBtn, { backgroundColor: '#5f259f' }]} onPress={handlePayPhonePe} activeOpacity={0.8}>
                            <Text style={s.btnText}>PhonePe</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[s.payBtn, { backgroundColor: '#fff' }]} onPress={handlePayGPay} activeOpacity={0.8}>
                            <Image source={{ uri: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f2/Google_Pay_Logo.svg/1024px-Google_Pay_Logo.svg.png' }} style={{ width: 38, height: 16, resizeMode: 'contain' }} />
                        </TouchableOpacity>
                    </View>
                </Animated.View>
            </View>
        </Modal>
    );
}

export function DonationBanner({ onPress }: { onPress: () => void }) {
    const scale = usePressScale(0.97);

    return (
        <Animated.View style={{ transform: [{ scale: scale.scale }], marginHorizontal: 24, marginTop: 16 }}>
            <TouchableOpacity onPress={onPress} onPressIn={scale.onPressIn} onPressOut={scale.onPressOut} activeOpacity={1}>
                <BlurView intensity={30} tint="dark" style={s.bannerCard}>
                    <View style={s.bannerIcon}>
                        <Text style={{ fontSize: 20 }}>☕</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={s.bannerTitle}>Buy me a Coffee</Text>
                        <Text style={s.bannerSub}>Support app development</Text>
                    </View>
                    <View style={s.bannerArr}>
                        <Ionicons name="chevron-forward" size={16} color="rgba(255,159,10,0.8)" />
                    </View>
                </BlurView>
            </TouchableOpacity>
        </Animated.View>
    );
}

const s = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 24 },
    modalContainer: { width: '100%', backgroundColor: 'rgba(20,20,20,0.95)', borderRadius: 28, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    closeBtn: { position: 'absolute', top: 16, right: 16, width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center', zIndex: 10 },
    iconWrap: { width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(255,159,10,0.15)', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
    title: { fontSize: 22, fontWeight: '700', color: '#fff', letterSpacing: -0.5, marginBottom: 8 },
    subtitle: { fontSize: 13, color: 'rgba(255,255,255,0.6)', textAlign: 'center', lineHeight: 20, marginBottom: 24, paddingHorizontal: 10 },
    qrBox: { width: 180, height: 180, backgroundColor: '#fff', borderRadius: 16, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', padding: 10, marginBottom: 14 },
    qrImage: { width: '100%', height: '100%' },
    upiText: { fontSize: 13, color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace', marginBottom: 24 },
    buttonRow: { flexDirection: 'row', gap: 12, width: '100%' },
    payBtn: { flex: 1, height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    btnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
    bannerCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,159,10,0.12)', borderRadius: 18, padding: 14, borderWidth: 1, borderColor: 'rgba(255,159,10,0.25)' },
    bannerIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(255,159,10,0.2)', alignItems: 'center', justifyContent: 'center', marginRight: 14 },
    bannerTitle: { color: '#fff', fontSize: 15, fontWeight: '600', letterSpacing: -0.2 },
    bannerSub: { color: 'rgba(255,255,255,0.6)', fontSize: 12, marginTop: 2 },
    bannerArr: { width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(255,159,10,0.15)', alignItems: 'center', justifyContent: 'center' }
});
