
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
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

const API_BASE = 'http://192.168.1.179:8080/api';

type DashboardStats = {
  total_members: number;
  active_members: number;
  expired_members: number;
  today_attendance: number;
  total_workouts: number;
  total_goals: number;
  active_goals: number;
  completed_goals: number;
};

type RecentMember = {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  date_joined: string;
};

type RecentWorkout = {
  id: number;
  member: string;
  workout_name: string;
  workout_date: string;
  duration_minutes: number;
  completed: boolean;
};

type DashboardResponse = {
  dashboard: DashboardStats;
  recent_members: RecentMember[];
  recent_workouts: RecentWorkout[];
};

export default function AdminDashboard() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [adminName, setAdminName] = useState('Administrator');

  const [stats, setStats] = useState<DashboardStats>({
    total_members: 0,
    active_members: 0,
    expired_members: 0,
    today_attendance: 0,
    total_workouts: 0,
    total_goals: 0,
    active_goals: 0,
    completed_goals: 0,
  });

  const [recentMembers, setRecentMembers] = useState<RecentMember[]>([]);
  const [recentWorkouts, setRecentWorkouts] = useState<RecentWorkout[]>([]);

  const loadDashboard = useCallback(async () => {
    try {
      const storedUser = await AsyncStorage.getItem('loggedInUser');

      if (!storedUser) {
        Alert.alert('Session Expired', 'Please log in again.');
        router.replace('/');
        return;
      }

      const user = JSON.parse(storedUser);

      if (user.role !== 'admin') {
        Alert.alert(
          'Access Denied',
          'Only administrators can access the admin dashboard.'
        );
        router.replace('/dashboard');
        return;
      }

      setAdminName(
        user.first_name
          ? `${user.first_name} ${user.last_name || ''}`.trim()
          : 'Administrator'
      );

      const username = encodeURIComponent(user.username);

      const response = await fetch(
        `${API_BASE}/admin/dashboard/?username=${username}`
      );

      const text = await response.text();

      console.log('ADMIN DASHBOARD STATUS:', response.status);
      console.log('ADMIN DASHBOARD RESPONSE:', text);

      let data: DashboardResponse;

      try {
        data = JSON.parse(text);
      } catch {
        throw new Error('Invalid response from the server.');
      }

      if (!response.ok) {
        throw new Error(
          data && 'detail' in data
            ? String((data as any).detail)
            : 'Failed to load dashboard.'
        );
      }

      setStats(
        data.dashboard || {
          total_members: 0,
          active_members: 0,
          expired_members: 0,
          today_attendance: 0,
          total_workouts: 0,
          total_goals: 0,
          active_goals: 0,
          completed_goals: 0,
        }
      );

      setRecentMembers(data.recent_members || []);
      setRecentWorkouts(data.recent_workouts || []);
    } catch (error: any) {
      console.error('ADMIN DASHBOARD ERROR:', error);

      Alert.alert(
        'Error',
        error?.message || 'Unable to load the admin dashboard.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [router]);

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
      'Are you sure you want to log out?',
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

  const formatDate = (dateString: string) => {
    if (!dateString) {
      return 'N/A';
    }

    const date = new Date(dateString);

    if (isNaN(date.getTime())) {
      return dateString;
    }

    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Loading admin dashboard...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
          />
        }
      >
        {/* HEADER */}
        <View style={styles.header}>
          <View>
            <Text style={styles.smallTitle}>FITTRACK AI</Text>
            <Text style={styles.title}>Admin Dashboard</Text>
            <Text style={styles.welcomeText}>
              Welcome, {adminName}
            </Text>
          </View>

          <View style={styles.adminBadge}>
            <Text style={styles.adminBadgeText}>ADMIN</Text>
          </View>
        </View>

        {/* MANAGE MEMBERS BUTTON */}
        <TouchableOpacity
          style={styles.manageMembersButton}
          onPress={() => router.push('/admin-members')}
          activeOpacity={0.8}
        >
          <View style={styles.manageMembersIcon}>
            <Text style={styles.manageMembersIconText}>👥</Text>
          </View>

          <View style={styles.manageMembersContent}>
            <Text style={styles.manageMembersTitle}>
              Manage Members
            </Text>

            <Text style={styles.manageMembersSubtitle}>
              View, search, edit, and manage gym members
            </Text>
          </View>

          <Text style={styles.arrow}>›</Text>
        </TouchableOpacity>

        {/* RETENTION REPORTS BUTTON */}
        <TouchableOpacity
          style={styles.retentionButton}
          onPress={() => router.push('/retention-reports')}
          activeOpacity={0.8}
        >
          <View style={styles.retentionIcon}>
            <Text style={styles.retentionIconText}>📊</Text>
          </View>

          <View style={styles.retentionContent}>
            <Text style={styles.retentionTitle}>
              Retention Reports
            </Text>

            <Text style={styles.retentionSubtitle}>
              View member retention, engagement, payments, and renewal statistics
            </Text>
          </View>

          <Text style={styles.retentionArrow}>›</Text>
        </TouchableOpacity>

        {/* DASHBOARD STATISTICS */}
        <Text style={styles.sectionTitle}>Gym Overview</Text>

        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>
              {stats.total_members}
            </Text>
            <Text style={styles.statLabel}>Total Members</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statNumber}>
              {stats.active_members}
            </Text>
            <Text style={styles.statLabel}>Active Members</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statNumber}>
              {stats.expired_members}
            </Text>
            <Text style={styles.statLabel}>Expired Members</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statNumber}>
              {stats.today_attendance}
            </Text>
            <Text style={styles.statLabel}>Today's Attendance</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statNumber}>
              {stats.total_workouts}
            </Text>
            <Text style={styles.statLabel}>Total Workouts</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statNumber}>
              {stats.total_goals}
            </Text>
            <Text style={styles.statLabel}>Total Goals</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statNumber}>
              {stats.active_goals}
            </Text>
            <Text style={styles.statLabel}>Active Goals</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statNumber}>
              {stats.completed_goals}
            </Text>
            <Text style={styles.statLabel}>Completed Goals</Text>
          </View>
        </View>

        {/* QUICK ACTIONS */}
        <Text style={styles.sectionTitle}>Management</Text>

        <View style={styles.managementCard}>
          <TouchableOpacity
            style={styles.managementButton}
            onPress={() => router.push('/admin-members')}
            activeOpacity={0.8}
          >
            <Text style={styles.managementIcon}>👤</Text>

            <View style={styles.managementTextContainer}>
              <Text style={styles.managementTitle}>
                Member Management
              </Text>

              <Text style={styles.managementDescription}>
                Manage member accounts and membership information.
              </Text>
            </View>

            <Text style={styles.managementArrow}>›</Text>
          </TouchableOpacity>
        </View>

        {/* RECENT MEMBERS */}
        <Text style={styles.sectionTitle}>Recent Members</Text>

        <View style={styles.listCard}>
          {recentMembers.length === 0 ? (
            <Text style={styles.emptyText}>
              No recent members found.
            </Text>
          ) : (
            recentMembers.map((member) => (
              <View
                key={member.id}
                style={styles.listItem}
              >
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {member.first_name
                      ? member.first_name.charAt(0).toUpperCase()
                      : 'M'}
                  </Text>
                </View>

                <View style={styles.listItemContent}>
                  <Text style={styles.listItemTitle}>
                    {member.first_name} {member.last_name}
                  </Text>

                  <Text style={styles.listItemSubtitle}>
                    {member.email || member.username}
                  </Text>

                  <Text style={styles.listItemDate}>
                    Joined: {formatDate(member.date_joined)}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>

        {/* RECENT WORKOUTS */}
        <Text style={styles.sectionTitle}>Recent Workouts</Text>

        <View style={styles.listCard}>
          {recentWorkouts.length === 0 ? (
            <Text style={styles.emptyText}>
              No recent workouts found.
            </Text>
          ) : (
            recentWorkouts.map((workout) => (
              <View
                key={workout.id}
                style={styles.listItem}
              >
                <View style={styles.workoutIcon}>
                  <Text style={styles.workoutIconText}>🏋️</Text>
                </View>

                <View style={styles.listItemContent}>
                  <Text style={styles.listItemTitle}>
                    {workout.workout_name || 'Workout'}
                  </Text>

                  <Text style={styles.listItemSubtitle}>
                    Member: {workout.member || 'Unknown Member'}
                  </Text>

                  <Text style={styles.listItemDate}>
                    {formatDate(workout.workout_date)}
                    {workout.duration_minutes
                      ? ` • ${workout.duration_minutes} min`
                      : ''}
                    {typeof workout.completed === 'boolean'
                      ? ` • ${workout.completed ? 'Completed' : 'Not Completed'}`
                      : ''}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>

        {/* REFRESH BUTTON */}
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={handleRefresh}
          activeOpacity={0.8}
        >
          <Text style={styles.refreshButtonText}>
            Refresh Dashboard
          </Text>
        </TouchableOpacity>

        {/* LOGOUT */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          activeOpacity={0.8}
        >
          <Text style={styles.logoutButtonText}>
            Logout
          </Text>
        </TouchableOpacity>

        <Text style={styles.footerText}>
          FitTrack AI • Admin Management System
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fb',
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

  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },

  smallTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.5,
    color: '#666',
    marginBottom: 4,
  },

  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111',
  },

  welcomeText: {
    marginTop: 5,
    fontSize: 14,
    color: '#666',
  },

  adminBadge: {
    backgroundColor: '#111',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
  },

  adminBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
  },

  /* MANAGE MEMBERS */

  manageMembersButton: {
    backgroundColor: '#111',
    borderRadius: 18,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },

  manageMembersIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },

  manageMembersIconText: {
    fontSize: 24,
  },

  manageMembersContent: {
    flex: 1,
  },

  manageMembersTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
  },

  manageMembersSubtitle: {
    color: '#ccc',
    fontSize: 12,
    marginTop: 4,
    lineHeight: 17,
  },

  arrow: {
    color: '#fff',
    fontSize: 30,
    fontWeight: '300',
    marginLeft: 8,
  },

  /* RETENTION REPORTS */

  retentionButton: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 25,
    borderWidth: 1,
    borderColor: '#e3e3e3',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    elevation: 2,
  },

  retentionIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },

  retentionIconText: {
    fontSize: 24,
  },

  retentionContent: {
    flex: 1,
  },

  retentionTitle: {
    color: '#111',
    fontSize: 18,
    fontWeight: '800',
  },

  retentionSubtitle: {
    color: '#666',
    fontSize: 12,
    marginTop: 4,
    lineHeight: 17,
  },

  retentionArrow: {
    color: '#777',
    fontSize: 30,
    fontWeight: '300',
    marginLeft: 8,
  },

  /* SECTIONS */

  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111',
    marginBottom: 12,
    marginTop: 5,
  },

  /* STATISTICS */

  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 25,
  },

  statCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    elevation: 2,
  },

  statNumber: {
    fontSize: 27,
    fontWeight: '800',
    color: '#111',
  },

  statLabel: {
    marginTop: 5,
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
  },

  /* MANAGEMENT */

  managementCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 25,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    elevation: 2,
  },

  managementButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
  },

  managementIcon: {
    fontSize: 25,
    marginRight: 14,
  },

  managementTextContainer: {
    flex: 1,
  },

  managementTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111',
  },

  managementDescription: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 17,
    color: '#777',
  },

  managementArrow: {
    fontSize: 28,
    color: '#777',
  },

  /* LISTS */

  listCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 25,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    elevation: 2,
  },

  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },

  avatar: {
    width: 45,
    height: 45,
    borderRadius: 23,
    backgroundColor: '#e9e9e9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 13,
  },

  avatarText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#333',
  },

  workoutIcon: {
    width: 45,
    height: 45,
    borderRadius: 23,
    backgroundColor: '#e9e9e9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 13,
  },

  workoutIconText: {
    fontSize: 21,
  },

  listItemContent: {
    flex: 1,
  },

  listItemTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111',
  },

  listItemSubtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 3,
  },

  listItemDate: {
    fontSize: 11,
    color: '#999',
    marginTop: 4,
  },

  emptyText: {
    textAlign: 'center',
    paddingVertical: 25,
    color: '#888',
    fontSize: 14,
  },

  /* BUTTONS */

  refreshButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    marginBottom: 12,
  },

  refreshButtonText: {
    color: '#111',
    fontSize: 15,
    fontWeight: '700',
  },

  logoutButton: {
    backgroundColor: '#111',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
  },

  logoutButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },

  footerText: {
    textAlign: 'center',
    marginTop: 20,
    color: '#aaa',
    fontSize: 11,
  },
});

