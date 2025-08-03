import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, ScrollView, TouchableOpacity } from 'react-native';
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


export default function CreatePlanScreen({ navigation, route }) {
    const { planToEdit, date: dateForNewPlan } = route.params;

    const isEditMode = !!planToEdit;

    const [title, setTitle] = useState(planToEdit?.title || '');
    const [tasks, setTasks] = useState(planToEdit?.tasks && planToEdit.tasks.length > 0 ? planToEdit.tasks : [{ description: '', time: '' }]);
    const [isSaving, setIsSaving] = useState(false);
    
    const date = planToEdit?.date || dateForNewPlan;

    const handleAddTask = () => {
        setTasks([...tasks, { description: '', time: '' }]);
    };

    const handleRemoveTask = (index) => {
        if (tasks.length <= 1) return;
        const newTasks = [...tasks];
        newTasks.splice(index, 1);
        setTasks(newTasks);
    };

    const handleTaskChange = (text, index, field) => {
        const newTasks = [...tasks];
        newTasks[index][field] = text;
        setTasks(newTasks);
    };

    const handleSave = () => {
        if (!title.trim()) {
            Alert.alert("Validation Error", "Please enter a title for your plan.");
            return;
        }

        const validTasks = tasks.filter(task => task.description.trim() !== '' && task.time.trim() !== '');

        if (validTasks.length === 0) {
            Alert.alert("Validation Error", "Please add at least one complete task with a description and time.");
            return;
        }
        
        const now = new Date();
        const selectedDate = new Date(date);
        
        for (const task of validTasks) {
            const { hours, minutes } = parseTime(task.time);

            if (isNaN(hours) || isNaN(minutes)) {
                Alert.alert("Invalid Time", `The time format for task "${task.description}" is not recognized. Please use a format like "9:00" or "5pm".`);
                return;
            }

            const taskDateTime = new Date(selectedDate);
            taskDateTime.setHours(hours, minutes, 0, 0); 

            if (!isEditMode && taskDateTime < now) {
                Alert.alert("Invalid Time", `The task "${task.description}" at ${task.time} is in the past. Please select a time in the future.`);
                return; 
            }
        }
        
        setIsSaving(true);
        const planData = { title, tasks: validTasks, date };

        const apiCall = isEditMode 
            ? apiClient.put(`/api/plans/${planToEdit._id}`, planData) // Use apiClient.put
            : apiClient.post('/api/plans', planData);                   // Use apiClient.post

        apiCall
            .then(() => {
                Alert.alert("Success", `Plan ${isEditMode ? 'updated' : 'created'} successfully!`);
                navigation.goBack();
            })
            .catch(error => {
                if (error.response) {
                    if (error.response.status === 409) {
                        Alert.alert("Time Conflict", error.response.data.message);
                    } else {
                        console.error("Server Error:", error.response.data);
                        Alert.alert("Error", error.response.data.message || "An unexpected server error occurred.");
                    }
                } else {
                    console.error("Network or other error:", error.message);
                    Alert.alert("Error", "Could not connect to the server. Please check your network.");
                }
            })
            .finally(() => setIsSaving(false));
    };

    return (
        <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
            <View style={styles.innerContainer}>
                <Text style={styles.dateHeader}>
                    {isEditMode ? 'Editing Plan for: ' : 'Creating Plan for: '} 
                    {new Date(date).toDateString()}
                </Text>

                <Text style={styles.label}>Plan Title</Text>
                <TextInput 
                    style={styles.input} 
                    placeholder="e.g., Conquer Tuesday" 
                    value={title} 
                    onChangeText={setTitle} 
                    placeholderTextColor="#888" 
                />

                <Text style={styles.label}>Tasks</Text>
                {tasks.map((task, index) => (
                    <View key={index} style={styles.taskContainer}>
                        <TextInput
                            style={styles.taskInputDescription}
                            placeholder="Task Description"
                            value={task.description}
                            onChangeText={(text) => handleTaskChange(text, index, 'description')}
                            placeholderTextColor="#888"
                        />
                        <TextInput
                            style={styles.taskInputTime}
                            placeholder="e.g. 9:30"
                            value={task.time}
                            onChangeText={(text) => handleTaskChange(text, index, 'time')}
                            placeholderTextColor="#888"
                        />
                        <TouchableOpacity onPress={() => handleRemoveTask(index)} style={styles.removeButton}>
                            <Ionicons name="remove-circle" size={28} color="#dc3545" />
                        </TouchableOpacity>
                    </View>
                ))}

                <TouchableOpacity onPress={handleAddTask} style={styles.addButton}>
                    <Ionicons name="add-circle" size={32} color="#007BFF" />
                    <Text style={styles.addButtonText}>Add Another Task</Text>
                </TouchableOpacity>

                <View style={styles.saveButtonContainer}>
                   <Button 
                        title={isSaving ? "Saving..." : (isEditMode ? "Update Plan" : "Save Plan")} 
                        onPress={handleSave} 
                        disabled={isSaving} 
                    />
                </View>
            </View>
        </ScrollView>
    );
}

// Styles remain the same
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f9f9f9' },
    innerContainer: { padding: 20 },
    dateHeader: { fontSize: 18, fontWeight: '600', textAlign: 'center', marginBottom: 20, color: '#333' },
    label: { fontSize: 16, fontWeight: 'bold', marginBottom: 8, marginTop: 10 },
    input: { backgroundColor: '#ffffff', padding: 12, borderRadius: 8, fontSize: 16, borderWidth: 1, borderColor: '#ddd' },
    taskContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
    taskInputDescription: { flex: 1, marginRight: 10, backgroundColor: '#fff', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#ddd' },
    taskInputTime: { width: 80, backgroundColor: '#fff', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '##ddd' },
    removeButton: { paddingLeft: 10 },
    addButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 10, marginTop: 10 },
    addButtonText: { marginLeft: 10, fontSize: 16, color: '#007BFF', fontWeight: 'bold' },
    saveButtonContainer: { marginTop: 30, marginBottom: 50 },
});