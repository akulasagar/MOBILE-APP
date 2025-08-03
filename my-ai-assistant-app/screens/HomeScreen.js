import React, { useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar, Platform, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
// Import the context from its new, separate file
import { AuthContext } from '../context/AuthContext'; 

export default function HomeScreen({ navigation }) {
    const { signOut } = useContext(AuthContext);

    const onProfilePress = () => {
        Alert.alert(
            'Profile Options',
            'What would you like to do?',
            [
                {
                    text: 'Sign Out',
                    onPress: () => signOut(),
                    style: 'destructive',
                },
                {
                    text: 'Cancel',
                    style: 'cancel',
                },
            ],
            { cancelable: true }
        );
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" />
            <View style={styles.header}>
                <Text style={styles.appName}>Aura</Text>
                <TouchableOpacity onPress={onProfilePress}>
                    <Ionicons name="person-circle-outline" size={40} color="#333" />
                </TouchableOpacity>
            </View>
            <View style={styles.body}>
                <Text style={styles.welcomeMessage}>How can I help you today?</Text>
                <TouchableOpacity style={[styles.card, styles.auraCard]} onPress={() => navigation.navigate('Chat')} activeOpacity={0.8}>
                    <Ionicons name="chatbubbles-outline" size={48} color="#fff" />
                    <Text style={styles.cardTitle}>Chat with Aura</Text>
                    <Text style={styles.cardDescription}>Ask questions and schedule tasks.</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.card, styles.plansCard]} onPress={() => navigation.navigate('PlansList')} activeOpacity={0.8}>
                    <Ionicons name="calendar-outline" size={48} color="#333" />
                    <Text style={[styles.cardTitle, { color: '#333' }]}>My Plans</Text>
                    <Text style={[styles.cardDescription, { color: '#777' }]}>View your daily schedule.</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f9f9f9' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 10 : 50, paddingBottom: 10 },
    appName: { fontSize: 32, fontWeight: 'bold', color: '#222' },
    body: { flex: 1, padding: 20 },
    welcomeMessage: { fontSize: 22, color: '#666', marginBottom: 30 },
    card: { borderRadius: 20, padding: 25, marginBottom: 20, elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8 },
    auraCard: { backgroundColor: '#007AFF' },
    plansCard: { backgroundColor: '#ffffff' },
    cardTitle: { fontSize: 24, fontWeight: 'bold', marginTop: 15, color: '#fff' },
    cardDescription: { fontSize: 16, marginTop: 5, color: 'rgba(255, 255, 255, 0.8)' },
});