import React from 'react';
import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="register" />
      <Stack.Screen name="dashboard" />
      <Stack.Screen name="admin-dashboard" />
      <Stack.Screen name="profile" />
      <Stack.Screen name="workout" />
      <Stack.Screen name="attendance" />
      <Stack.Screen name="goals" />
      <Stack.Screen name="progress" />
      <Stack.Screen name="ai-recommendation" />
      <Stack.Screen name="notifications" />
    </Stack>
  );
}