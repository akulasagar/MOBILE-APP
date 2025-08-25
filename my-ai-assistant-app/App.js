import React, { useState, useEffect, useMemo, useContext } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as SecureStore from 'expo-secure-store';

import { AuthContext } from './context/AuthContext'; 

import HomeScreen from './screens/HomeScreen';
import ChatScreen from './screens/ChatScreen';
import PlansListScreen from './screens/PlansListScreen';
import CreatePlanScreen from './screens/CreatePlanScreen';
import PlanDetailScreen from './screens/PlanDetailScreen';
import AuthScreen from './screens/authscreen'; 

import { registerForPushNotificationsAsync } from './services/pushNotifications';

const Stack = createNativeStackNavigator();

function AppStack() {
  // --- [REMOVED] The problematic useEffect is no longer here ---
  return (
    <Stack.Navigator initialRouteName="Home">
      <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Chat" component={ChatScreen} options={{ title: 'Chat with Aura' }} />
      <Stack.Screen name="PlansList" component={PlansListScreen} options={{ title: "My Plans" }} />
      <Stack.Screen name="CreatePlan" component={CreatePlanScreen} options={{ title: 'Create a New Plan' }} />
      <Stack.Screen name="PlanDetail" component={PlanDetailScreen} options={({ route }) => ({ title: route.params.plan.title })} />
    </Stack.Navigator>
  );
}

function AuthStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Auth" component={AuthScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}

function RootNavigator() {
  const { userToken, isLoading } = useContext(AuthContext);

  if (isLoading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return userToken ? <AppStack /> : <AuthStack />;
}


export default function App() {
  const [userToken, setUserToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const bootstrapAsync = async () => {
      let token;
      try {
        token = await SecureStore.getItemAsync('userToken');
      } catch (e) {
        console.error('Restoring token failed', e);
      }
      setUserToken(token);
      setIsLoading(false);
    };

    bootstrapAsync();
  }, []);
  
  // --- [NEW] SAFER useEffect FOR PUSH NOTIFICATIONS ---
  useEffect(() => {
    // This effect runs only when the userToken state changes.
    if (userToken) {
      // If a token exists (user is logged in), THEN we register for notifications.
      // This guarantees the token is in SecureStore before this runs.
      console.log("User logged in. Registering for push notifications...");
      registerForPushNotificationsAsync();
    }
  }, [userToken]); // Dependency array makes this hook watch the userToken state

  const authContext = useMemo(() => ({
    signIn: async (token) => {
      await SecureStore.setItemAsync('userToken', token);
      setUserToken(token);
    },
    signOut: async () => {
      await SecureStore.deleteItemAsync('userToken');
      setUserToken(null);
    },
    userToken,
    isLoading,
  }), [userToken, isLoading]);

  return (
    <AuthContext.Provider value={authContext}>
      <NavigationContainer>
        <RootNavigator />
      </NavigationContainer>
    </AuthContext.Provider>
  );
}

const styles = StyleSheet.create({
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  }
});