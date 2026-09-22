
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = 'http://192.168.1.179:8080/api';

type LoggedInUser = {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  phone?: string;
  address?: string;
};

export default function ProfileScreen() {
  const [user, setUser] = useState<LoggedInUser | null>(null);
  const [loading, setLoading] = useState(true);

  const [editingProfile, setEditingProfile] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const storedUser = await AsyncStorage.getItem('loggedInUser');

      if (storedUser) {
        const parsedUser: LoggedInUser = JSON.parse(storedUser);

        setUser(parsedUser);

        setFirstName(parsedUser.first_name || '');
        setLastName(parsedUser.last_name || '');
        setEmail(parsedUser.email || '');
        setPhone(parsedUser.phone || '');
        setAddress(parsedUser.address || '');
      } else {
        Alert.alert(
          'Session Expired',
          'Please login again.',
          [
            {
              text: 'OK',
              onPress: () => router.replace('/'),
            },
          ]
        );
      }
    } catch (error) {
      console.log('Error loading user:', error);

      Alert.alert(
        'Error',
        'Unable to load your profile information.'
      );
    } finally {
      setLoading(false);
    }
  };

  const getInitial = () => {
    if (user?.first_name?.trim()) {
      return user.first_name.trim().charAt(0).toUpperCase();
    }

    if (user?.email?.trim()) {
      return user.email.trim().charAt(0).toUpperCase();
    }

    return 'U';
  };

  const getFullName = () => {
    const name = `${user?.first_name || ''} ${
      user?.last_name || ''
    }`.trim();

    return name || 'Member';
  };

  const handleEditProfile = () => {
    setChangingPassword(false);

    setFirstName(user?.first_name || '');
    setLastName(user?.last_name || '');
    setEmail(user?.email || '');
    setPhone(user?.phone || '');
    setAddress(user?.address || '');

    setEditingProfile(true);
  };

  const handleCancelEdit = () => {
    setEditingProfile(false);

    setFirstName(user?.first_name || '');
    setLastName(user?.last_name || '');
    setEmail(user?.email || '');
    setPhone(user?.phone || '');
    setAddress(user?.address || '');
  };

  const handleSaveProfile = async () => {
    if (!user) {
      return;
    }

    if (!firstName.trim()) {
      Alert.alert(
        'Missing Information',
        'Please enter your first name.'
      );
      return;
    }

    if (!lastName.trim()) {
      Alert.alert(
        'Missing Information',
        'Please enter your last name.'
      );
      return;
    }

    if (!email.trim()) {
      Alert.alert(
        'Missing Information',
        'Please enter your email.'
      );
      return;
    }

    setSavingProfile(true);

    try {
      const response = await fetch(
        `${API_BASE_URL}/profile/update/`,
        {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            username: user.username,
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            email: email.trim().toLowerCase(),
            phone: phone.trim(),
            address: address.trim(),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        Alert.alert(
          'Update Failed',
          data.message ||
            data.error ||
            'Unable to update your profile.'
        );
        return;
      }

      const updatedUser: LoggedInUser = {
        ...user,
        ...data.user,
      };

      await AsyncStorage.setItem(
        'loggedInUser',
        JSON.stringify(updatedUser)
      );

      setUser(updatedUser);

      setEditingProfile(false);

      Alert.alert(
        'Profile Updated',
        'Your personal information has been updated successfully.'
      );
    } catch (error) {
      console.log('Profile update error:', error);

      Alert.alert(
        'Connection Error',
        'Unable to connect to the FitTrack AI server. Make sure Django is running.'
      );
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = () => {
    setEditingProfile(false);

    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');

    setChangingPassword(true);
  };

  const handleCancelPassword = () => {
    setChangingPassword(false);

    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  const handleSavePassword = async () => {
    if (!user) {
      return;
    }

    if (!currentPassword) {
      Alert.alert(
        'Missing Information',
        'Please enter your current password.'
      );
      return;
    }

    if (!newPassword) {
      Alert.alert(
        'Missing Information',
        'Please enter your new password.'
      );
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert(
        'Invalid Password',
        'Your new password must be at least 6 characters long.'
      );
      return;
    }

    if (newPassword === currentPassword) {
      Alert.alert(
        'Invalid Password',
        'Your new password must be different from your current password.'
      );
      return;
    }

    if (!confirmPassword) {
      Alert.alert(
        'Missing Information',
        'Please confirm your new password.'
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert(
        'Password Mismatch',
        'The new password and confirmation password do not match.'
      );
      return;
    }

    setSavingPassword(true);

    try {
      console.log('Changing password for:', user.username);

      const response = await fetch(
        `${API_BASE_URL}/change-password/`,
        {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            username: user.username,

            // IMPORTANT:
            // Django expects "old_password", not "current_password".
            old_password: currentPassword,

            new_password: newPassword,
          }),
        }
      );

      const data = await response.json();

      console.log('Change password response:', response.status, data);

      if (!response.ok) {
        Alert.alert(
          'Password Change Failed',
          data.message ||
            data.error ||
            'Unable to change your password.'
        );
        return;
      }

      setChangingPassword(false);

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');

      Alert.alert(
        'Password Changed',
        'Your password has been changed successfully.'
      );
    } catch (error) {
      console.log('Password change error:', error);

      Alert.alert(
        'Connection Error',
        'Unable to connect to the FitTrack AI server. Make sure Django is running.'
      );
    } finally {
      setSavingPassword(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.removeItem(
              'loggedInUser'
            );

            router.replace('/');
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator
          size="large"
          color="#173F35"
        />

        <Text style={styles.loadingText}>
          Loading your profile...
        </Text>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>
          No user information found.
        </Text>

        <Pressable
          style={styles.loginButton}
          onPress={() => router.replace('/')}
        >
          <Text style={styles.loginButtonText}>
            LOGIN
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.backButton}>‹</Text>
        </Pressable>

        <Text style={styles.headerTitle}>
          My Profile
        </Text>

        <View style={{ width: 35 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {getInitial()}
            </Text>
          </View>

          <Text style={styles.name}>
            {getFullName()}
          </Text>

          <Text style={styles.email}>
            {user.email}
          </Text>

          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>
              ACTIVE MEMBER
            </Text>
          </View>
        </View>

        {/* Edit Profile Form */}
        {editingProfile && (
          <>
            <Text style={styles.sectionTitle}>
              Edit Personal Information
            </Text>

            <View style={styles.formCard}>
              <Text style={styles.inputLabel}>
                First Name
              </Text>

              <TextInput
                style={styles.input}
                value={firstName}
                onChangeText={setFirstName}
                placeholder="Enter first name"
                placeholderTextColor="#9CA3AF"
                editable={!savingProfile}
              />

              <Text style={styles.inputLabel}>
                Last Name
              </Text>

              <TextInput
                style={styles.input}
                value={lastName}
                onChangeText={setLastName}
                placeholder="Enter last name"
                placeholderTextColor="#9CA3AF"
                editable={!savingProfile}
              />

              <Text style={styles.inputLabel}>
                Email
              </Text>

              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="Enter email"
                placeholderTextColor="#9CA3AF"
                keyboardType="email-address"
                autoCapitalize="none"
                editable={!savingProfile}
              />

              <Text style={styles.inputLabel}>
                Phone
              </Text>

              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                placeholder="Enter phone number"
                placeholderTextColor="#9CA3AF"
                keyboardType="phone-pad"
                editable={!savingProfile}
              />

              <Text style={styles.inputLabel}>
                Address
              </Text>

              <TextInput
                style={[
                  styles.input,
                  styles.textArea,
                ]}
                value={address}
                onChangeText={setAddress}
                placeholder="Enter address"
                placeholderTextColor="#9CA3AF"
                multiline
                editable={!savingProfile}
              />

              <View style={styles.formButtons}>
                <Pressable
                  style={styles.cancelButton}
                  onPress={handleCancelEdit}
                  disabled={savingProfile}
                >
                  <Text style={styles.cancelButtonText}>
                    CANCEL
                  </Text>
                </Pressable>

                <Pressable
                  style={styles.saveButton}
                  onPress={handleSaveProfile}
                  disabled={savingProfile}
                >
                  {savingProfile ? (
                    <ActivityIndicator
                      color="#FFFFFF"
                    />
                  ) : (
                    <Text style={styles.saveButtonText}>
                      SAVE
                    </Text>
                  )}
                </Pressable>
              </View>
            </View>
          </>
        )}

        {/* Change Password Form */}
        {changingPassword && (
          <>
            <Text style={styles.sectionTitle}>
              Change Password
            </Text>

            <View style={styles.formCard}>
              <Text style={styles.inputLabel}>
                Current Password
              </Text>

              <TextInput
                style={styles.input}
                value={currentPassword}
                onChangeText={setCurrentPassword}
                placeholder="Enter current password"
                placeholderTextColor="#9CA3AF"
                secureTextEntry
                autoCapitalize="none"
                editable={!savingPassword}
              />

              <Text style={styles.inputLabel}>
                New Password
              </Text>

              <TextInput
                style={styles.input}
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="Enter new password"
                placeholderTextColor="#9CA3AF"
                secureTextEntry
                autoCapitalize="none"
                editable={!savingPassword}
              />

              <Text style={styles.inputLabel}>
                Confirm New Password
              </Text>

              <TextInput
                style={styles.input}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Confirm new password"
                placeholderTextColor="#9CA3AF"
                secureTextEntry
                autoCapitalize="none"
                editable={!savingPassword}
              />

              <Text style={styles.passwordHint}>
                Password must be at least 6 characters.
              </Text>

              <View style={styles.formButtons}>
                <Pressable
                  style={styles.cancelButton}
                  onPress={handleCancelPassword}
                  disabled={savingPassword}
                >
                  <Text style={styles.cancelButtonText}>
                    CANCEL
                  </Text>
                </Pressable>

                <Pressable
                  style={styles.saveButton}
                  onPress={handleSavePassword}
                  disabled={savingPassword}
                >
                  {savingPassword ? (
                    <ActivityIndicator
                      color="#FFFFFF"
                    />
                  ) : (
                    <Text style={styles.saveButtonText}>
                      CHANGE PASSWORD
                    </Text>
                  )}
                </Pressable>
              </View>
            </View>
          </>
        )}

        {/* Personal Information */}
        {!editingProfile && !changingPassword && (
          <>
            <Text style={styles.sectionTitle}>
              Personal Information
            </Text>

            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>
                  Full Name
                </Text>

                <Text style={styles.infoValue}>
                  {getFullName()}
                </Text>
              </View>

              <View style={styles.divider} />

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>
                  Username
                </Text>

                <Text style={styles.infoValue}>
                  {user.username}
                </Text>
              </View>

              <View style={styles.divider} />

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>
                  Email
                </Text>

                <Text style={styles.infoValue}>
                  {user.email}
                </Text>
              </View>

              <View style={styles.divider} />

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>
                  Phone
                </Text>

                <Text style={styles.infoValue}>
                  {user.phone || 'Not provided'}
                </Text>
              </View>

              <View style={styles.divider} />

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>
                  Account Type
                </Text>

                <Text style={styles.infoValue}>
                  {user.role
                    ? user.role.charAt(0).toUpperCase() +
                      user.role.slice(1)
                    : 'Member'}
                </Text>
              </View>

              <View style={styles.divider} />

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>
                  Membership
                </Text>

                <Text style={styles.infoValue}>
                  Monthly Plan
                </Text>
              </View>

              <View style={styles.divider} />

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>
                  Status
                </Text>

                <Text style={styles.activeValue}>
                  Active
                </Text>
              </View>
            </View>

            {/* Account Options */}
            <Text style={styles.sectionTitle}>
              Account
            </Text>

            <Pressable
              style={styles.optionCard}
              onPress={handleEditProfile}
            >
              <Text style={styles.optionIcon}>
                ✎
              </Text>

              <View style={styles.optionContent}>
                <Text style={styles.optionTitle}>
                  Edit Profile
                </Text>

                <Text style={styles.optionSubtitle}>
                  Update your personal information
                </Text>
              </View>

              <Text style={styles.arrow}>
                ›
              </Text>
            </Pressable>

            <Pressable
              style={styles.optionCard}
              onPress={handleChangePassword}
            >
              <Text style={styles.optionIcon}>
                🔒
              </Text>

              <View style={styles.optionContent}>
                <Text style={styles.optionTitle}>
                  Change Password
                </Text>

                <Text style={styles.optionSubtitle}>
                  Update your account password
                </Text>
              </View>

              <Text style={styles.arrow}>
                ›
              </Text>
            </Pressable>
          </>
        )}

        {/* Logout */}
        <Pressable
          style={styles.logoutButton}
          onPress={handleLogout}
        >
          <Text style={styles.logoutText}>
            LOGOUT
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FB',
  },

  loadingContainer: {
    flex: 1,
    backgroundColor: '#F5F7FB',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },

  loadingText: {
    marginTop: 12,
    color: '#173F35',
    fontSize: 15,
    fontWeight: '600',
  },

  loginButton: {
    backgroundColor: '#173F35',
    paddingHorizontal: 30,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 20,
  },

  loginButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },

  header: {
    height: 100,
    backgroundColor: '#173F35',
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 18,
  },

  backButton: {
    color: '#FFFFFF',
    fontSize: 38,
    lineHeight: 38,
  },

  headerTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '700',
  },

  content: {
    padding: 20,
    paddingBottom: 40,
  },

  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 24,
    alignItems: 'center',
    marginBottom: 25,
    elevation: 2,
  },

  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#D9F2E7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },

  avatarText: {
    fontSize: 32,
    fontWeight: '800',
    color: '#173F35',
  },

  name: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
  },

  email: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },

  statusBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 12,
  },

  statusText: {
    color: '#166534',
    fontSize: 11,
    fontWeight: '800',
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 12,
  },

  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 16,
    marginBottom: 25,
    elevation: 2,
  },

  infoRow: {
    paddingVertical: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  infoLabel: {
    fontSize: 14,
    color: '#6B7280',
  },

  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    maxWidth: '62%',
    textAlign: 'right',
  },

  activeValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#16A34A',
  },

  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
  },

  optionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 2,
  },

  optionIcon: {
    fontSize: 22,
    width: 40,
  },

  optionContent: {
    flex: 1,
  },

  optionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },

  optionSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 3,
  },

  arrow: {
    fontSize: 28,
    color: '#9CA3AF',
  },

  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    marginBottom: 25,
    elevation: 2,
  },

  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 6,
    marginTop: 10,
  },

  input: {
    height: 48,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    paddingHorizontal: 14,
    color: '#111827',
    backgroundColor: '#FAFAFA',
    fontSize: 14,
  },

  textArea: {
    height: 85,
    paddingTop: 12,
    textAlignVertical: 'top',
  },

  passwordHint: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 8,
  },

  formButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
  },

  cancelButton: {
    flex: 1,
    height: 48,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#9CA3AF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  cancelButtonText: {
    color: '#4B5563',
    fontSize: 12,
    fontWeight: '800',
  },

  saveButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 10,
    backgroundColor: '#173F35',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },

  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    textAlign: 'center',
  },

  logoutButton: {
    backgroundColor: '#DC2626',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 15,
  },

  logoutText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
});

