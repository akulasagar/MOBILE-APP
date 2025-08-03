import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
// Import our new, authenticated API client
import apiClient from '../api/apiClient';

export default function PlanDetailScreen({ route, navigation }) {
    const [plan, setPlan] = useState(route.params.plan);

    useEffect(() => {
        navigation.setOptions({ title: plan.title });
    }, [navigation, plan.title]);

    const handleToggleTask = (taskId) => {
        const originalPlan = JSON.parse(JSON.stringify(plan));

        // Optimistic UI Update
        const updatedTasks = plan.tasks.map(task =>
            task._id === taskId ? { ...task, isCompleted: !task.isCompleted } : task
        );
        setPlan(prevPlan => ({ ...prevPlan, tasks: updatedTasks }));
        
        // --- THIS IS THE UPDATED PART ---
        // Use the apiClient which automatically adds the auth token
        apiClient.patch(`/api/plans/${plan._id}/tasks/${taskId}`)
            .then(response => {
                console.log("Task updated successfully on server.");
                setPlan(response.data);
            })
            .catch(error => {
                console.error("Error updating task:", error);
                Alert.alert("Error", "Could not update task. Please try again.");
                setPlan(originalPlan);
            });
        // --- End of Update ---
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' };
        return date.toLocaleDateString(undefined, options);
    };

    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>{plan.title}</Text>
                <Text style={styles.date}>{formatDate(plan.date)}</Text>
            </View>

            <View style={styles.summaryContainer}>
                <Ionicons name="sparkles-outline" size={20} color="#005f9e" style={{ marginRight: 10 }} />
                <Text style={styles.summaryText}>{plan.aiGeneratedSummary}</Text>
            </View>

            <View style={styles.tasksSection}>
                <Text style={styles.tasksHeader}>Your Tasks for the Day</Text>
                {plan.tasks.map((task) => (
                    <TouchableOpacity key={task._id} onPress={() => handleToggleTask(task._id)} activeOpacity={0.7}>
                        <View style={styles.taskItem}>
                            <Ionicons
                                name={task.isCompleted ? 'checkbox' : 'square-outline'}
                                size={26}
                                color={task.isCompleted ? '#28a745' : '#6c757d'}
                                style={styles.checkboxIcon}
                            />
                            <View style={styles.taskTextContainer}>
                                <Text style={styles.taskTime}>{task.time}</Text>
                                <Text style={[styles.taskDescription, task.isCompleted && styles.completedTask]}>
                                    {task.description}
                                </Text>
                            </View>
                        </View>
                    </TouchableOpacity>
                ))}
            </View>
        </ScrollView>
    );
}

// Styles remain the same
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f9f9f9' },
    header: { padding: 20, backgroundColor: '#007BFF', borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
    title: { fontSize: 26, fontWeight: 'bold', color: '#fff', marginBottom: 5 },
    date: { fontSize: 16, color: '#e0e0e0' },
    summaryContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#e7f3fe', padding: 15, margin: 15, borderRadius: 12, borderWidth: 1, borderColor: '#cce5ff' },
    summaryText: { flex: 1, fontStyle: 'italic', color: '#004085', fontSize: 15 },
    tasksSection: { paddingHorizontal: 15, marginTop: 10, paddingBottom: 40 },
    tasksHeader: { fontSize: 20, fontWeight: 'bold', marginBottom: 15, color: '#333' },
    taskItem: { flexDirection: 'row', backgroundColor: '#fff', paddingVertical: 12, paddingHorizontal: 15, borderRadius: 10, marginBottom: 12, alignItems: 'center', elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5 },
    checkboxIcon: { marginRight: 15 },
    taskTextContainer: { flex: 1 },
    taskTime: { fontWeight: 'bold', color: '#555', fontSize: 14 },
    taskDescription: { fontSize: 16, color: '#212529', marginTop: 3 },
    completedTask: {
        textDecorationLine: 'line-through',
        color: '#6c757d'
    },
});