import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    TextInput,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    Keyboard,
    Animated,
    Platform,
    Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
// Import our new, authenticated API client
import apiClient from '../api/apiClient';

export default function ChatScreen({ navigation }) {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isAiTyping, setIsAiTyping] = useState(false);
    const scrollViewRef = useRef();

    const paddingBottom = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const keyboardDidShowListener = Keyboard.addListener(
            'keyboardDidShow',
            (e) => {
                const offset = Platform.OS === 'android' ? 25 : 0; 
                Animated.timing(paddingBottom, {
                    toValue: e.endCoordinates.height + offset,
                    duration: 200,
                    useNativeDriver: false 
                }).start();
            }
        );

        const keyboardDidHideListener = Keyboard.addListener(
            'keyboardDidHide',
            () => {
                Animated.timing(paddingBottom, {
                    toValue: 0,
                    duration: 200,
                    useNativeDriver: false
                }).start();
            }
        );

        return () => {
            keyboardDidHideListener.remove();
            keyboardDidShowListener.remove();
        };
    }, [paddingBottom]);


    useEffect(() => {
        setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
    }, [messages]);

    
    useEffect(() => {
      setMessages([{ _id: 'initial1', text: 'Hello! How may I assist you?', sender: 'ai' }]);
    }, []);

    const sendMessage = async () => {
        if (!input.trim() || isAiTyping) return;
        Keyboard.dismiss();

        const userMessage = { _id: Date.now().toString(), text: input, sender: 'user' };
        const messageHistory = [...messages, userMessage];

        setMessages(messageHistory);
        setInput('');
        setIsAiTyping(true);

        try {
            const pushToken = await AsyncStorage.getItem('pushToken');
            
            // --- THIS IS THE UPDATED PART ---
            // We now use the apiClient which automatically adds the auth token
            const response = await apiClient.post('/api/chat', { 
                message: userMessage.text,
                history: messageHistory,
                pushToken: pushToken
            });
            // -------------------------------

            const aiReplyText = response.data.reply; 

            const aiMessage = { 
                _id: Date.now().toString() + '_ai', 
                text: aiReplyText, 
                sender: 'ai' 
            };
            
            setMessages(currentMessages => [...currentMessages, aiMessage]);

        } catch (error) {
            console.error("Chat API error:", error.response?.data || error.message);
            const errorMessage = { 
                _id: Date.now().toString() + '_err', 
                text: "Sorry, I'm having trouble connecting right now.", 
                sender: 'ai' 
            };
            setMessages(currentMessages => [...currentMessages, errorMessage]);
        } finally {
            setIsAiTyping(false);
        }
    };


    return (
        <Animated.View style={[styles.container, { paddingBottom: paddingBottom }]}>
            <ScrollView
                ref={scrollViewRef}
                style={styles.messagesList}
                contentContainerStyle={styles.messagesContent}
                keyboardShouldPersistTaps="handled"
            >
                {messages.map(msg => (
                    <View key={msg._id} style={[styles.messageBubble, msg.sender === 'user' ? styles.userBubble : styles.aiBubble]}>
                        <Text style={msg.sender === 'user' ? styles.userMessageText : styles.aiMessageText}>{msg.text}</Text>
                    </View>
                ))}
                 {isAiTyping &&
                    <View style={[styles.messageBubble, styles.aiBubble]}><ActivityIndicator color="#000" /></View>
                }
            </ScrollView>

            <View style={styles.inputContainer}>
                 <TextInput
                    style={styles.input}
                    value={input}
                    onChangeText={setInput}
                    placeholder="Message Aura..."
                    placeholderTextColor="#999"
                    onSubmitEditing={sendMessage}
                />
                <TouchableOpacity 
                    onPress={sendMessage} 
                    style={[styles.sendButton, (!input.trim() || isAiTyping) && styles.disabledButton]}
                    disabled={!input.trim() || isAiTyping}
                >
                    <Ionicons name="send" size={24} color="#fff" />
                </TouchableOpacity>
            </View>
        </Animated.View>
    );
}

// Styles remain unchanged
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    messagesList: {
        flex: 1,
    },
    messagesContent: {
        flexGrow: 1,
        justifyContent: 'flex-end',
        paddingHorizontal: 10,
        paddingVertical: 10,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#e0e0e0',
    },
    input: {
        flex: 1,
        height: 50,
        backgroundColor: '#f0f2f5',
        borderRadius: 25,
        paddingHorizontal: 15,
        marginRight: 10,
        fontSize: 16,
    },
    sendButton: {
        backgroundColor: '#007AFF',
        borderRadius: 25,
        width: 50,
        height: 50,
        alignItems: 'center',
        justifyContent: 'center',
    },
    disabledButton: {
        backgroundColor: '#a9a9a9',
    },
    messageBubble: { maxWidth: '80%', padding: 12, borderRadius: 18, marginBottom: 10 },
    userBubble: { backgroundColor: '#007AFF', alignSelf: 'flex-end' },
    aiBubble: { backgroundColor: '#E5E5EA', alignSelf: 'flex-start' },
    userMessageText: { color: '#fff', fontSize: 16 },
    aiMessageText: { color: '#000', fontSize: 16 },
});