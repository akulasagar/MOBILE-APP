import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, Text, View, FlatList, ActivityIndicator, Modal, TouchableOpacity, Alert } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { Ionicons } from '@expo/vector-icons';
// Import our new, authenticated API client
import apiClient from '../api/apiClient';

const parseTime = (timeString) => {
    if (!timeString) return { hours: NaN, minutes: NaN };
    const lowerTimeString = timeString.toLowerCase().trim();
    let hours = 0;
    let minutes = 0;

    if (lowerTimeString.includes('pm') && !lowerTimeString.startsWith('12')) {
        hours = 12;
    }
    if (lowerTimeString.startsWith('12') && lowerTimeString.includes('am')) {
        hours = -12;
    }
    const parts = lowerTimeString.replace('am', '').replace('pm', '').split(':');
    if (parts[0]) {
        const parsedHours = parseInt(parts[0], 10);
        if (!isNaN(parsedHours)) {
           hours += parsedHours;
        }
    }
    if (parts[1]) {
        const parsedMinutes = parseInt(parts[1], 10);
        if (!isNaN(parsedMinutes)) {
            minutes = parsedMinutes;
        }
    }
    return { hours, minutes };
};


const formatDate = (dateString) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const date = new Date(dateString);
    const adjustedDate = new Date(date.getTime() + date.getTimezoneOffset() * 60000);
    adjustedDate.setHours(0, 0, 0, 0);
    
    if (today.getTime() === adjustedDate.getTime()) return "Today";

    const options = { weekday: 'long', month: 'long', day: 'numeric' };
    return adjustedDate.toLocaleDateString(undefined, options);
};

export default function PlansListScreen({ navigation }) {
    const [plans, setPlans] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [isCalendarVisible, setCalendarVisible] = useState(false);

    const today = new Date();
    today.setHours(0, 0, 0, 0); 
    const currentlySelectedDate = new Date(selectedDate);
    currentlySelectedDate.setMinutes(currentlySelectedDate.getMinutes() + currentlySelectedDate.getTimezoneOffset());
    currentlySelectedDate.setHours(0, 0, 0, 0);
    const isDateInPast = currentlySelectedDate < today;

    const fetchData = useCallback((date) => {
        setLoading(true);
        // Use the apiClient which automatically adds the auth token
        apiClient.get(`/api/plans/by-date/${date}`)
            .then(response => setPlans(response.data))
            .catch(error => {
                // The error could be a 401, which is useful to see
                console.error("Error fetching data for date:", error.response?.data || error.message)
            })
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', () => {
            fetchData(selectedDate);
        });
        return unsubscribe;
    }, [navigation, fetchData, selectedDate]);

    const onDayPress = (day) => {
        setSelectedDate(day.dateString);
        fetchData(day.dateString);
        setCalendarVisible(false);
    };

    const handleFabPress = () => {
        if (isDateInPast) {
            Alert.alert("Cannot Add Plan", "You cannot create plans for a past date.");
        } else {
            navigation.navigate('CreatePlan', { date: selectedDate });
        }
    };

    const handleDelete = (planId) => {
        Alert.alert(
            "Confirm Delete",
            "Are you sure you want to delete this plan permanently?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            // Use the apiClient which automatically adds the auth token
                            await apiClient.delete(`/api/plans/${planId}`);
                            Alert.alert("Success", "Plan has been deleted.");
                            fetchData(selectedDate); 
                        } catch (error) {
                            console.error("Delete failed:", error.response?.data || error.message);
                            Alert.alert("Error", error.response?.data?.message || "Could not delete the plan.");
                        }
                    },
                },
            ]
        );
    };

    const handleLongPress = (plan) => {
        const now = new Date();
        if (!plan.tasks || plan.tasks.length === 0) return;

        const { hours, minutes } = parseTime(plan.tasks[0].time);
        if (isNaN(hours)) return;
        
        const planDateTime = new Date(plan.date);
        planDateTime.setHours(hours, minutes, 0, 0);
        
        const fifteenMinutesInMillis = 15 * 60 * 1000;
        if (planDateTime.getTime() - now.getTime() < fifteenMinutesInMillis) {
            Alert.alert("Time Limit Reached", "Plans starting within 15 minutes cannot be modified.");
            return;
        }

        Alert.alert(
            `Manage: ${plan.title}`,
            "What would you like to do?",
            [
                { text: "Delete", onPress: () => handleDelete(plan._id), style: "destructive" },
                { 
                    text: "Edit", 
                    onPress: () => {
                        // We will need to update CreatePlanScreen as well
                        navigation.navigate('CreatePlan', { planToEdit: plan });
                    }
                },
                { text: "Cancel", style: "cancel" },
            ],
            { cancelable: true }
        );
    };

    return (
        <View style={styles.container}>
            <Modal
                animationType="fade"
                transparent={true}
                visible={isCalendarVisible}
                onRequestClose={() => setCalendarVisible(false)}
            >
                 <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                        <Calendar
                            onDayPress={onDayPress}
                            markedDates={{ [selectedDate]: { selected: true, selectedColor: '#007AFF' }}}
                        />
                        <TouchableOpacity style={styles.closeButton} onPress={() => setCalendarVisible(false)}>
                            <Text style={styles.closeButtonText}>Done</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            <FlatList
                data={plans}
                ListHeaderComponent={
                    <TouchableOpacity style={styles.dateHeader} onPress={() => setCalendarVisible(true)}>
                        <Text style={styles.dateHeaderText}>{formatDate(selectedDate)}</Text>
                        <Ionicons name="chevron-down-outline" size={22} color="#555" />
                    </TouchableOpacity>
                }
                renderItem={({ item }) => (
                    <TouchableOpacity 
                        style={styles.planItem} 
                        onPress={() => navigation.navigate('PlanDetail', { plan: item })}
                        onLongPress={() => handleLongPress(item)}
                        delayLongPress={200}
                    >
                        <View style={styles.planItemTextContainer}>
                            <Text style={styles.planTitle}>{item.title}</Text>
                            <Text style={styles.aiSummary} numberOfLines={1}>{item.aiGeneratedSummary || 'No summary available.'}</Text>
                        </View>
                        <Ionicons name="chevron-forward-outline" size={24} color="#c7c7cc" />
                    </TouchableOpacity>
                )}
                keyExtractor={item => item._id}
                contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
                ListEmptyComponent={!loading && <View style={styles.emptyContainer}><Text style={styles.emptyText}>No plans for this date.</Text></View>}
                refreshing={loading}
                onRefresh={() => fetchData(selectedDate)}
            />

            <TouchableOpacity 
                style={[styles.fab, isDateInPast && styles.fabDisabled]} 
                onPress={handleFabPress}
            >
                <Ionicons name="add" size={32} color="#fff" />
            </TouchableOpacity>
        </View>
    );
}

// Styles remain the same
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f9f9f9' },
    dateHeader: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, marginBottom: 10 },
    dateHeaderText: { fontSize: 24, fontWeight: 'bold', color: '#2c2c2e', marginRight: 8 },
    planItem: { flexDirection: 'row', backgroundColor: '#ffffff', padding: 20, borderRadius: 12, marginBottom: 15, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5, elevation: 2, },
    planItemTextContainer: { flex: 1, marginRight: 10 },
    planTitle: { fontSize: 17, fontWeight: '600', marginBottom: 3 },
    aiSummary: { fontSize: 14, color: '#8e8e93' },
    emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 100 },
    emptyText: { fontSize: 16, color: '#8e8e93' },
    fab: { 
        position: 'absolute', 
        right: 25, 
        bottom: 40, 
        width: 60, 
        height: 60, 
        borderRadius: 30, 
        backgroundColor: '#007AFF',
        justifyContent: 'center', 
        alignItems: 'center', 
        elevation: 8, 
        shadowRadius: 8, 
        shadowOpacity: 0.3, 
        shadowOffset: { width: 0, height: 4 } 
    },
    fabDisabled: {
        backgroundColor: '#a9a9a9',
        elevation: 2,
        shadowOpacity: 0.1,
    },
    modalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.4)' },
    modalContent: { backgroundColor: 'white', borderRadius: 20, padding: 20, width: '90%', elevation: 10 },
    closeButton: { backgroundColor: '#007AFF', padding: 12, borderRadius: 10, marginTop: 20, alignItems: 'center' },
    closeButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});