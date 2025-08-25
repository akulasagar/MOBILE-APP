import React, { useState, useContext } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { AuthContext } from '../context/AuthContext';

const API_URL =  'http://10.0.2.2:5001'; 

const AuthScreen = () => {
    const { signIn } = useContext(AuthContext);

    const [isLogin, setIsLogin] = useState(true);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleAuth = async () => {
        if (!email || !password || (!isLogin && !name)) {
            Alert.alert('Error', 'Please fill in all fields.');
            return;
        }

        setIsLoading(true);
        const endpoint = isLogin ? '/api/users/login' : '/api/users/register';
        const body = isLogin ? { email, password } : { name, email, password };

        try {
            const response = await fetch(API_URL + endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(body),
            });

            const data = await response.json();

            if (response.ok) {
                signIn(data.token);
            } else {
                const errorMessage = data.msg || (data.errors && data.errors[0].msg) || 'An error occurred.';
                Alert.alert('Authentication Failed', errorMessage);
            }
        } catch (error) {
            console.error(error);
            Alert.alert('Network Error', 'Unable to connect to the server. Please check your network and the API_URL.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView 
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.container}
        >
            <View style={styles.innerContainer}>
                <Text style={styles.title}>{isLogin ? 'Welcome Back!' : 'Create Account'}</Text>
                
                {!isLogin && (
                    <TextInput
                        style={styles.input}
                        placeholder="Name"
                        placeholderTextColor="#888" // Explicitly set placeholder color
                        value={name}
                        onChangeText={setName}
                        autoCapitalize="words"
                        editable={!isLoading}
                    />
                )}

                <TextInput
                    style={styles.input}
                    placeholder="Email"
                    placeholderTextColor="#888" // Explicitly set placeholder color
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    editable={!isLoading}
                />
                <TextInput
                    style={styles.input}
                    placeholder="Password"
                    placeholderTextColor="#888" // Explicitly set placeholder color
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    editable={!isLoading}
                />

                <TouchableOpacity style={styles.button} onPress={handleAuth} disabled={isLoading}>
                    {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{isLogin ? 'Login' : 'Register'}</Text>}
                </TouchableOpacity>

                <TouchableOpacity onPress={() => !isLoading && setIsLogin(!isLogin)} disabled={isLoading}>
                    <Text style={styles.toggleText}>
                        {isLogin ? 'Need an account? Register' : 'Have an account? Login'}
                    </Text>
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
};


const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f4f4f8',
    },
    innerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        marginBottom: 40,
        color: '#333',
    },
    input: {
        width: '100%', // <-- CORRECTED: Removed the typo 's-'
        height: 50,
        backgroundColor: '#fff',
        borderRadius: 8,
        paddingHorizontal: 15,
        marginBottom: 15,
        borderWidth: 1,
        borderColor: '#ddd',
        fontSize: 16, // Added font size for better readability
        color: '#333', // Ensures typed text is visible
    },
    button: {
        width: '100%',
        height: 50,
        backgroundColor: '#6200ee',
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 8,
        marginTop: 10,
    },
    buttonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    toggleText: {
        marginTop: 20,
        color: '#6200ee',
        fontWeight: '600',
    }
});

export default AuthScreen;