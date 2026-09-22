import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';

const API_BASE = 'http://192.168.1.179:8080/api';

type UserData = {
  id?: number;
  username?: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  role?: string;
};

type MembershipData = {
  has_membership?: boolean;
  status?: string;
  plan_name?: string;
  plan?: string;
  membership_type?: string;
  start_date?: string;
  end_date?: string;
  expires_at?: string;
  amount?: number;
  price?: number;
  payment_status?: string;
};

export default function MemberDashboard() {
  const [user, setUser] = useState<UserData | null>(null);
  const [membership, setMembership] = useState<MembershipData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadDashboard = useCallback(async () => {
    try {
      const storedUser = await AsyncStorage.getItem('loggedInUser');

      if (!storedUser) {
        router.replace('/');
        return;
      }

      const parsedUser: UserData = JSON.parse(storedUser);

      setUser(parsedUser);

      const username = String(
        parsedUser.username || parsedUser.email || ''
      )
        .trim()
        .toLowerCase();

      if (!username) {
        throw new Error('Member account information was not found.');
      }

      /*
       * Load membership information.
       *
       * The dashboard does not require membership data in order
       * to open. If the membership endpoint is unavailable, the
       * rest of the member dashboard will still work.
       */
      try {
        const response = await fetch(
          `${API_BASE}/membership/?username=${encodeURIComponent(username)}`
        );

        const data = await response.json();

        if (response.ok) {
          setMembership(
            data.membership ||
              data.data ||
              data ||
              null
          );
        }
      } catch (membershipError) {
        console.log(
          'Membership dashboard information unavailable:',
          membershipError
        );
      }
    } catch (error: any) {
      console.error('Member dashboard error:', error);

      Alert.alert(
        'Dashboard Error',
        error?.message ||
          'Unable to load your dashboard.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDashboard();
  };

  const handleLogout = async () => {
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
            await AsyncStorage.removeItem('loggedInUser');
            router.replace('/');
          },
        },
      ]
    );
  };

  const getFirstName = () => {
    if (user?.first_name) {
      return user.first_name;
    }

    if (user?.username) {
      return user.username.split('@')[0];
    }

    return 'Member';
  };

  const getFullName = () => {
    const fullName = `${user?.first_name || ''} ${
      user?.last_name || ''
    }`.trim();

    return fullName || getFirstName();
  };

  const getMembershipStatus = () => {
    const status = String(
      membership?.status || ''
    ).toLowerCase();

    if (status === 'active') {
      return 'Active';
    }

    if (status === 'expired') {
      return 'Expired';
    }

    if (status === 'pending') {
      return 'Pending';
    }

    if (status === 'cancelled') {
      return 'Cancelled';
    }

    return 'No Membership';
  };

  const getMembershipPlan = () => {
    return (
      membership?.plan_name ||
      membership?.plan ||
      membership?.membership_type ||
      'No active plan'
    );
  };

  const getMembershipEndDate = () => {
    const dateString =
      membership?.end_date ||
      membership?.expires_at;

    if (!dateString) {
      return 'No expiration date';
    }

    const date = new Date(dateString);

    if (Number.isNaN(date.getTime())) {
      return dateString;
    }

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getMembershipStyle = () => {
    const status = String(
      membership?.status || ''
    ).toLowerCase();

    if (status === 'active') {
      return styles.membershipActive;
    }

    if (status === 'expired') {
      return styles.membershipExpired;
    }

    if (status === 'pending') {
      return styles.membershipPending;
    }

    return styles.membershipNone;
  };

  const navigateTo = (route: string) => {
    router.push(route as any);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>
          Loading your dashboard...
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* HEADER */}
        <View style={styles.header}>
          <View style={styles.headerTextContainer}>
            <Text style={styles.appLabel}>
              FITTRACK AI
            </Text>

            <Text style={styles.greeting}>
              Hello, {getFirstName()}! 👋
            </Text>

            <Text style={styles.subtitle}>
              Let's keep working toward your fitness goals.
            </Text>
          </View>

          <TouchableOpacity
            style={styles.profileButton}
            onPress={() => navigateTo('/profile')}
          >
            <Text style={styles.profileButtonText}>
              {getFirstName().charAt(0).toUpperCase()}
            </Text>
          </TouchableOpacity>
        </View>

        {/* MEMBER CARD */}
        <View style={styles.memberCard}>
          <View style={styles.memberAvatar}>
            <Text style={styles.memberAvatarText}>
              {getFirstName().charAt(0).toUpperCase()}
            </Text>
          </View>

          <View style={styles.memberInfo}>
            <Text style={styles.memberName}>
              {getFullName()}
            </Text>

            <Text style={styles.memberEmail}>
              {user?.username || user?.email || ''}
            </Text>

            <View style={styles.memberRoleBadge}>
              <Text style={styles.memberRoleText}>
                MEMBER
              </Text>
            </View>
          </View>
        </View>

        {/* MEMBERSHIP */}
        <Text style={styles.sectionTitle}>
          My Membership
        </Text>

        <View style={styles.membershipCard}>
          <View style={styles.membershipTop}>
            <View>
              <Text style={styles.membershipLabel}>
                CURRENT PLAN
              </Text>

              <Text style={styles.membershipPlan}>
                {getMembershipPlan()}
              </Text>
            </View>

            <View
              style={[
                styles.membershipStatus,
                getMembershipStyle(),
              ]}
            >
              <Text style={styles.membershipStatusText}>
                {getMembershipStatus()}
              </Text>
            </View>
          </View>

          <View style={styles.membershipDivider} />

          <View style={styles.membershipDetails}>
            <View style={styles.membershipDetail}>
              <Text style={styles.detailLabel}>
                Valid Until
              </Text>

              <Text style={styles.detailValue}>
                {getMembershipEndDate()}
              </Text>
            </View>

            <View style={styles.membershipDetail}>
              <Text style={styles.detailLabel}>
                Payment
              </Text>

              <Text style={styles.detailValue}>
                {membership?.payment_status
                  ? String(
                      membership.payment_status
                    ).charAt(0).toUpperCase() +
                    String(
                      membership.payment_status
                    ).slice(1)
                  : 'Not Available'}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.membershipButton}
            onPress={() => navigateTo('/membership')}
          >
            <Text style={styles.membershipButtonText}>
              View Membership
            </Text>
          </TouchableOpacity>
        </View>

        {/* QUICK ACTIONS */}
        <Text style={styles.sectionTitle}>
          Quick Actions
        </Text>

        <View style={styles.actionsGrid}>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigateTo('/workout')}
          >
            <View style={styles.actionIcon}>
              <Text style={styles.actionIconText}>
                💪
              </Text>
            </View>

            <Text style={styles.actionTitle}>
              Workout
            </Text>

            <Text style={styles.actionSubtitle}>
              Log your workout
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigateTo('/attendance')}
          >
            <View style={styles.actionIcon}>
              <Text style={styles.actionIconText}>
                📅
              </Text>
            </View>

            <Text style={styles.actionTitle}>
              Attendance
            </Text>

            <Text style={styles.actionSubtitle}>
              Check in or out
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigateTo('/goals')}
          >
            <View style={styles.actionIcon}>
              <Text style={styles.actionIconText}>
                🎯
              </Text>
            </View>

            <Text style={styles.actionTitle}>
              Goals
            </Text>

            <Text style={styles.actionSubtitle}>
              Manage your goals
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigateTo('/progress')}
          >
            <View style={styles.actionIcon}>
              <Text style={styles.actionIconText}>
                📈
              </Text>
            </View>

            <Text style={styles.actionTitle}>
              Progress
            </Text>

            <Text style={styles.actionSubtitle}>
              View your progress
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() =>
              navigateTo('/ai-recommendation')
            }
          >
            <View style={styles.actionIcon}>
              <Text style={styles.actionIconText}>
                🤖
              </Text>
            </View>

            <Text style={styles.actionTitle}>
              AI Coach
            </Text>

            <Text style={styles.actionSubtitle}>
              Get recommendations
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() =>
              navigateTo('/notifications')
            }
          >
            <View style={styles.actionIcon}>
              <Text style={styles.actionIconText}>
                🔔
              </Text>
            </View>

            <Text style={styles.actionTitle}>
              Notifications
            </Text>

            <Text style={styles.actionSubtitle}>
              View reminders
            </Text>
          </TouchableOpacity>
        </View>

        {/* FITNESS SECTION */}
        <Text style={styles.sectionTitle}>
          Your Fitness Journey
        </Text>

        <View style={styles.infoCard}>
          <View style={styles.infoIcon}>
            <Text style={styles.infoIconText}>
              🤖
            </Text>
          </View>

          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>
              Your AI Fitness Companion
            </Text>

            <Text style={styles.infoText}>
              FitTrack AI analyzes your workouts,
              consistency, and goals to help you
              stay motivated and make better
              fitness decisions.
            </Text>

            <TouchableOpacity
              style={styles.aiButton}
              onPress={() =>
                navigateTo('/ai-recommendation')
              }
            >
              <Text style={styles.aiButtonText}>
                View AI Recommendation
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* PROFILE */}
        <TouchableOpacity
          style={styles.profileCard}
          onPress={() => navigateTo('/profile')}
        >
          <View style={styles.profileIcon}>
            <Text style={styles.profileIconText}>
              👤
            </Text>
          </View>

          <View style={styles.profileInfo}>
            <Text style={styles.profileTitle}>
              My Profile
            </Text>

            <Text style={styles.profileSubtitle}>
              Update your personal information
            </Text>
          </View>

          <Text style={styles.arrow}>
            →
          </Text>
        </TouchableOpacity>

        {/* REFRESH */}
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={handleRefresh}
          disabled={refreshing}
        >
          {refreshing ? (
            <ActivityIndicator />
          ) : (
            <Text style={styles.refreshButtonText}>
              Refresh Dashboard
            </Text>
          )}
        </TouchableOpacity>

        {/* LOGOUT */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
        >
          <Text style={styles.logoutButtonText}>
            Logout
          </Text>
        </TouchableOpacity>

        <Text style={styles.footerText}>
          FitTrack AI • Fitness Companion
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f7fb',
  },

  container: {
    flex: 1,
  },

  contentContainer: {
    padding: 20,
    paddingBottom: 45,
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f7fb',
  },

  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: '#666',
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },

  headerTextContainer: {
    flex: 1,
    paddingRight: 15,
  },

  appLabel: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.5,
    color: '#666',
    marginBottom: 5,
  },

  greeting: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111',
  },

  subtitle: {
    marginTop: 5,
    fontSize: 13,
    lineHeight: 19,
    color: '#777',
  },

  profileButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#111',
    justifyContent: 'center',
    alignItems: 'center',
  },

  profileButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
  },

  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111',
    borderRadius: 18,
    padding: 18,
    marginBottom: 24,
  },

  memberAvatar: {
    width: 55,
    height: 55,
    borderRadius: 28,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },

  memberAvatarText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111',
  },

  memberInfo: {
    flex: 1,
    marginLeft: 14,
  },

  memberName: {
    fontSize: 17,
    fontWeight: '800',
    color: '#fff',
  },

  memberEmail: {
    marginTop: 3,
    fontSize: 11,
    color: '#bbb',
  },

  memberRoleBadge: {
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 7,
    backgroundColor: '#fff',
  },

  memberRoleText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#111',
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111',
    marginBottom: 12,
  },

  membershipCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 18,
    marginBottom: 24,
    elevation: 2,
    shadowOpacity: 0.04,
    shadowRadius: 8,
  },

  membershipTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },

  membershipLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    color: '#888',
  },

  membershipPlan: {
    marginTop: 5,
    fontSize: 21,
    fontWeight: '800',
    color: '#111',
  },

  membershipStatus: {
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 8,
  },

  membershipStatusText: {
    fontSize: 10,
    fontWeight: '800',
  },

  membershipActive: {
    backgroundColor: '#e8f7ed',
  },

  membershipExpired: {
    backgroundColor: '#fdeaea',
  },

  membershipPending: {
    backgroundColor: '#fff5db',
  },

  membershipNone: {
    backgroundColor: '#eeeeee',
  },

  membershipDivider: {
    height: 1,
    backgroundColor: '#eeeeee',
    marginVertical: 17,
  },

  membershipDetails: {
    flexDirection: 'row',
  },

  membershipDetail: {
    flex: 1,
  },

  detailLabel: {
    fontSize: 11,
    color: '#888',
  },

  detailValue: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: '700',
    color: '#222',
  },

  membershipButton: {
    marginTop: 17,
    backgroundColor: '#111',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
  },

  membershipButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
  },

  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
  },

  actionCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    minHeight: 135,
    elevation: 2,
    shadowOpacity: 0.04,
    shadowRadius: 8,
  },

  actionIcon: {
    width: 43,
    height: 43,
    borderRadius: 12,
    backgroundColor: '#eeeeee',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 11,
  },

  actionIconText: {
    fontSize: 21,
  },

  actionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111',
  },

  actionSubtitle: {
    marginTop: 4,
    fontSize: 11,
    lineHeight: 16,
    color: '#777',
  },

  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#111',
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
  },

  infoIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },

  infoIconText: {
    fontSize: 22,
  },

  infoContent: {
    flex: 1,
    marginLeft: 14,
  },

  infoTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#fff',
  },

  infoText: {
    marginTop: 7,
    fontSize: 12,
    lineHeight: 18,
    color: '#c5c5c5',
  },

  aiButton: {
    alignSelf: 'flex-start',
    marginTop: 13,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 9,
    backgroundColor: '#fff',
  },

  aiButtonText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#111',
  },

  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginTop: 10,
    elevation: 2,
    shadowOpacity: 0.04,
    shadowRadius: 8,
  },

  profileIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#eeeeee',
    justifyContent: 'center',
    alignItems: 'center',
  },

  profileIconText: {
    fontSize: 20,
  },

  profileInfo: {
    flex: 1,
    marginLeft: 12,
  },

  profileTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111',
  },

  profileSubtitle: {
    marginTop: 3,
    fontSize: 11,
    color: '#777',
  },

  arrow: {
    fontSize: 22,
    color: '#777',
    marginLeft: 8,
  },

  refreshButton: {
    marginTop: 24,
    backgroundColor: '#111',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
  },

  refreshButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },

  logoutButton: {
    marginTop: 10,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },

  logoutButtonText: {
    color: '#333',
    fontSize: 14,
    fontWeight: '800',
  },

  footerText: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 11,
    color: '#999',
  },
});