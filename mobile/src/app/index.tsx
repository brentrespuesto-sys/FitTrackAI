import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE = 'http://192.168.1.179:8080/api';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert(
        'Missing Information',
        'Please enter your username/email and password.'
      );
      return;
    }

    setLoading(true);

    try {
      const username = email.trim().toLowerCase();

      console.log('====================================');
      console.log('FITTRACK AI LOGIN');
      console.log('Username:', username);
      console.log('====================================');

      const response = await fetch(
        `${API_BASE}/login/`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            username: username,
            password: password,
          }),
        }
      );

      const responseText = await response.text();

      console.log(
        'LOGIN HTTP STATUS:',
        response.status
      );

      console.log(
        'LOGIN RAW RESPONSE:',
        responseText
      );

      let data: any = {};

      try {
        data = JSON.parse(responseText);
      } catch {
        throw new Error(
          `The server returned an invalid response. HTTP ${response.status}`
        );
      }

      console.log(
        'LOGIN RESPONSE:',
        JSON.stringify(data, null, 2)
      );

      if (!response.ok) {
        throw new Error(
          data.error ||
            data.detail ||
            'Invalid username or password.'
        );
      }

      if (!data.user) {
        throw new Error(
          'Login succeeded, but the server did not return user information.'
        );
      }

      /*
       * --------------------------------------------------
       * GET USER ROLE
       * --------------------------------------------------
       *
       * The backend should return:
       *
       * user.role = "admin"
       *
       * or
       *
       * user.role = "member"
       *
       * We also check a few fallback fields so the
       * routing is more reliable.
       */

      const user = data.user;

      const role = String(
        user.role ||
        data.role ||
        user.user_role ||
        user.account_role ||
        'member'
      )
        .trim()
        .toLowerCase();

      const normalizedUser = {
        ...user,
        role: role,
      };

      console.log(
        'LOGIN USER:',
        JSON.stringify(normalizedUser, null, 2)
      );

      console.log(
        'DETECTED ROLE:',
        role
      );

      /*
       * Save the complete logged-in user.
       */
      await AsyncStorage.setItem(
        'loggedInUser',
        JSON.stringify(normalizedUser)
      );

      console.log(
        'USER SAVED TO ASYNC STORAGE'
      );

      /*
       * --------------------------------------------------
       * ROLE-BASED ROUTING
       * --------------------------------------------------
       */

      if (role === 'admin') {
        console.log(
          'ADMIN DETECTED → /admin-dashboard'
        );

        router.replace('/admin-dashboard');
      } else {
        console.log(
          'MEMBER DETECTED → /dashboard'
        );

        router.replace('/dashboard');
      }
    } catch (error: any) {
      console.error(
        'LOGIN ERROR:',
        error
      );

      Alert.alert(
        'Login Error',
        error?.message ||
          'Unable to connect to the FitTrack AI server.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = () => {
    router.push('/register');
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={
        Platform.OS === 'ios'
          ? 'padding'
          : undefined
      }
    >
      <ScrollView
        contentContainerStyle={
          styles.scrollContent
        }
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.card}>
          {/* LOGO / TITLE */}
          <View style={styles.header}>
            <View style={styles.logoCircle}>
              <Text style={styles.logoText}>
                F
              </Text>
            </View>

            <Text style={styles.title}>
              FitTrack AI
            </Text>

            <Text style={styles.subtitle}>
              Smart Gym Membership & Fitness
              Companion
            </Text>
          </View>

          {/* LOGIN FORM */}
          <View style={styles.form}>
            <Text style={styles.label}>
              Username / Email
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Enter your username or email"
              placeholderTextColor="#999"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              editable={!loading}
            />

            <Text style={styles.label}>
              Password
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Enter your password"
              placeholderTextColor="#999"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
              onSubmitEditing={handleLogin}
            />

            <TouchableOpacity
              style={[
                styles.loginButton,
                loading &&
                  styles.loginButtonDisabled,
              ]}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <View
                  style={styles.loadingRow}
                >
                  <ActivityIndicator
                    size="small"
                    color="#fff"
                  />

                  <Text
                    style={
                      styles.loginButtonText
                    }
                  >
                    Signing in...
                  </Text>
                </View>
              ) : (
                <Text
                  style={styles.loginButtonText}
                >
                  Login
                </Text>
              )}
            </TouchableOpacity>
          </View>

          {/* REGISTER */}
          <View style={styles.registerContainer}>
            <Text style={styles.registerText}>
              Don't have an account?
            </Text>

            <TouchableOpacity
              onPress={handleRegister}
              disabled={loading}
            >
              <Text style={styles.registerLink}>
                Register
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fb',
  },

  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },

  card: {
    width: '100%',
    maxWidth: 450,
    alignSelf: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 22,
    padding: 28,
    shadowOpacity: 0.08,
    shadowRadius: 15,
    shadowOffset: {
      width: 0,
      height: 5,
    },
    elevation: 4,
  },

  header: {
    alignItems: 'center',
    marginBottom: 30,
  },

  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#111111',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },

  logoText: {
    color: '#ffffff',
    fontSize: 34,
    fontWeight: '800',
  },

  title: {
    fontSize: 30,
    fontWeight: '800',
    color: '#111111',
  },

  subtitle: {
    marginTop: 7,
    fontSize: 13,
    color: '#777777',
    textAlign: 'center',
    lineHeight: 19,
  },

  form: {
    width: '100%',
  },

  label: {
    fontSize: 14,
    fontWeight: '700',
    color: '#222222',
    marginBottom: 8,
    marginTop: 14,
  },

  input: {
    width: '100%',
    height: 52,
    borderWidth: 1,
    borderColor: '#dddddd',
    borderRadius: 12,
    paddingHorizontal: 15,
    fontSize: 15,
    color: '#111111',
    backgroundColor: '#fafafa',
  },

  loginButton: {
    width: '100%',
    height: 52,
    marginTop: 25,
    borderRadius: 12,
    backgroundColor: '#111111',
    justifyContent: 'center',
    alignItems: 'center',
  },

  loginButtonDisabled: {
    opacity: 0.7,
  },

  loginButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },

  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 25,
  },

  registerText: {
    color: '#777777',
    fontSize: 14,
  },

  registerLink: {
    marginLeft: 5,
    color: '#111111',
    fontSize: 14,
    fontWeight: '800',
  },
});