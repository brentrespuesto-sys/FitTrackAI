import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';

const API_URL = 'http://192.168.1.179:8080/api/register/';

export default function RegisterScreen() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (loading) {
      return;
    }

    const cleanName = fullName.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (
      !cleanName ||
      !cleanEmail ||
      !password ||
      !confirmPassword
    ) {
      Alert.alert(
        'Incomplete Information',
        'Please complete all required fields.'
      );
      return;
    }

    if (!cleanEmail.includes('@')) {
      Alert.alert(
        'Invalid Email',
        'Please enter a valid email address.'
      );
      return;
    }

    if (password.length < 6) {
      Alert.alert(
        'Invalid Password',
        'Password must be at least 6 characters long.'
      );
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert(
        'Password Mismatch',
        'Password and confirm password do not match.'
      );
      return;
    }

    const nameParts = cleanName.split(/\s+/);

    const firstName = nameParts[0];

    const lastName =
      nameParts.length > 1
        ? nameParts.slice(1).join(' ')
        : '';

    setLoading(true);

    try {
      const controller = new AbortController();

      const timeout = setTimeout(() => {
        controller.abort();
      }, 10000);

      const requestBody = {
        username: cleanEmail,
        email: cleanEmail,
        password: password,
        first_name: firstName,
        last_name: lastName,
      };

      console.log('REGISTER REQUEST:', {
        ...requestBody,
        password: '********',
      });

      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      const responseText = await response.text();

      console.log(
        'REGISTER HTTP STATUS:',
        response.status
      );

      console.log(
        'REGISTER RAW RESPONSE:',
        responseText
      );

      let data: any = {};

      try {
        data = responseText
          ? JSON.parse(responseText)
          : {};
      } catch {
        data = {
          raw_response: responseText,
        };
      }

      console.log('REGISTER RESPONSE:', data);

      if (response.ok) {
        Alert.alert(
          'Registration Successful',
          'Your FitTrack AI account has been created successfully.',
          [
            {
              text: 'OK',
              onPress: () => {
                router.replace('/');
              },
            },
          ]
        );

        return;
      }

      let errorMessage =
        'Registration failed. Please try again.';

      if (typeof data === 'string') {
        errorMessage = data;
      } else if (data.email) {
        errorMessage = Array.isArray(data.email)
          ? data.email.join('\n')
          : String(data.email);
      } else if (data.username) {
        errorMessage = Array.isArray(data.username)
          ? data.username.join('\n')
          : String(data.username);
      } else if (data.password) {
        errorMessage = Array.isArray(data.password)
          ? data.password.join('\n')
          : String(data.password);
      } else if (data.first_name) {
        errorMessage = Array.isArray(data.first_name)
          ? data.first_name.join('\n')
          : String(data.first_name);
      } else if (data.last_name) {
        errorMessage = Array.isArray(data.last_name)
          ? data.last_name.join('\n')
          : String(data.last_name);
      } else if (data.non_field_errors) {
        errorMessage = Array.isArray(
          data.non_field_errors
        )
          ? data.non_field_errors.join('\n')
          : String(data.non_field_errors);
      } else if (data.detail) {
        errorMessage = String(data.detail);
      } else if (data.message) {
        errorMessage = String(data.message);
      } else if (data.error) {
        errorMessage = String(data.error);
      } else if (data.raw_response) {
        errorMessage = String(data.raw_response);
      }

      Alert.alert(
        `Registration Failed (${response.status})`,
        errorMessage
      );
    } catch (error: any) {
      console.error(
        'REGISTER CONNECTION ERROR:',
        error
      );

      if (error?.name === 'AbortError') {
        Alert.alert(
          'Server Timeout',
          'The FitTrack AI server did not respond within 10 seconds.\n\nMake sure Django is running on port 8080 and your phone and PC are connected to the same Wi-Fi.'
        );
      } else {
        Alert.alert(
          'Connection Error',
          'Unable to connect to the FitTrack AI server.\n\n' +
            'Server:\n' +
            API_URL +
            '\n\n' +
            'Make sure Django is running and your phone and PC are connected to the same Wi-Fi.'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={
          Platform.OS === 'ios'
            ? 'padding'
            : undefined
        }
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <Pressable
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backText}>
              ‹ Back to Login
            </Text>
          </Pressable>

          <View style={styles.header}>
            <View style={styles.logoCircle}>
              <Text style={styles.logoText}>F</Text>
            </View>

            <Text style={styles.appName}>
              FitTrack AI
            </Text>

            <Text style={styles.subtitle}>
              Create your fitness account
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.title}>
              Create Account
            </Text>

            <Text style={styles.description}>
              Register to manage your membership and
              track your fitness progress.
            </Text>

            <Text style={styles.label}>
              Full Name
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Enter your full name"
              placeholderTextColor="#8A8A8A"
              value={fullName}
              onChangeText={setFullName}
              autoCapitalize="words"
              editable={!loading}
            />

            <Text style={styles.label}>
              Email
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Enter your email"
              placeholderTextColor="#8A8A8A"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
            />

            <Text style={styles.label}>
              Password
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Create a password"
              placeholderTextColor="#8A8A8A"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              editable={!loading}
            />

            <Text style={styles.label}>
              Confirm Password
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Confirm your password"
              placeholderTextColor="#8A8A8A"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              editable={!loading}
            />

            <Pressable
              style={({ pressed }) => [
                styles.registerButton,
                pressed && styles.buttonPressed,
                loading && styles.buttonDisabled,
              ]}
              onPress={handleRegister}
              disabled={loading}
            >
              <Text style={styles.registerButtonText}>
                {loading
                  ? 'CREATING ACCOUNT...'
                  : 'CREATE ACCOUNT'}
              </Text>
            </Pressable>

            <View style={styles.loginRow}>
              <Text style={styles.loginPrompt}>
                Already have an account?
              </Text>

              <Pressable
                onPress={() => router.back()}
                disabled={loading}
              >
                <Text style={styles.loginLink}>
                  {' '}
                  Login
                </Text>
              </Pressable>
            </View>
          </View>

          <Text style={styles.footer}>
            FitTrack AI • Fitness Companion
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F4F7F5',
  },

  container: {
    flex: 1,
  },

  scrollContent: {
    flexGrow: 1,
    padding: 24,
  },

  backButton: {
    alignSelf: 'flex-start',
    marginBottom: 14,
  },

  backText: {
    color: '#28705D',
    fontSize: 15,
    fontWeight: '700',
  },

  header: {
    alignItems: 'center',
    marginBottom: 24,
  },

  logoCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#173F35',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },

  logoText: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '800',
  },

  appName: {
    fontSize: 27,
    fontWeight: '800',
    color: '#173F35',
  },

  subtitle: {
    marginTop: 5,
    color: '#66736E',
    fontSize: 13,
  },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },

  title: {
    fontSize: 25,
    fontWeight: '800',
    color: '#1B2A26',
    marginBottom: 8,
  },

  description: {
    fontSize: 14,
    lineHeight: 20,
    color: '#6C7773',
    marginBottom: 22,
  },

  label: {
    fontSize: 14,
    fontWeight: '700',
    color: '#263631',
    marginBottom: 8,
  },

  input: {
    height: 52,
    borderWidth: 1,
    borderColor: '#D6DEDA',
    borderRadius: 12,
    paddingHorizontal: 15,
    fontSize: 15,
    color: '#1B2A26',
    marginBottom: 17,
    backgroundColor: '#FAFCFB',
  },

  registerButton: {
    height: 52,
    borderRadius: 12,
    backgroundColor: '#173F35',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 5,
  },

  buttonPressed: {
    opacity: 0.75,
  },

  buttonDisabled: {
    opacity: 0.6,
  },

  registerButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  loginRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },

  loginPrompt: {
    color: '#6C7773',
    fontSize: 14,
  },

  loginLink: {
    color: '#28705D',
    fontSize: 14,
    fontWeight: '800',
  },

  footer: {
    textAlign: 'center',
    color: '#8A9591',
    fontSize: 12,
    marginTop: 22,
  },
});