import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = 'http://192.168.1.179:8080/api';

type LoggedInUser = {
  id?: number;
  username: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  role?: string;
};

type NotificationItem = {
  id: number;
  title: string;
  message: string;
  notification_type?: string;
  is_read: boolean;
  created_at: string;
};

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      const storedUser = await AsyncStorage.getItem('loggedInUser');

      if (!storedUser) {
        router.replace('/');
        return;
      }

      const user: LoggedInUser = JSON.parse(storedUser);

      const username = user.username || user.email;

      if (!username) {
        Alert.alert('Error', 'Unable to identify your account.');
        return;
      }

      const response = await fetch(
        `${API_BASE_URL}/notifications/?username=${encodeURIComponent(username)}`
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.detail ||
            data?.message ||
            'Failed to load notifications.'
        );
      }

      const notificationList = Array.isArray(data)
        ? data
        : Array.isArray(data?.notifications)
        ? data.notifications
        : [];

      const normalizedNotifications: NotificationItem[] =
        notificationList.map((item: any) => ({
          id: Number(item.id),
          title: String(item.title || 'Notification'),
          message: String(item.message || ''),
          notification_type: String(
            item.notification_type || 'system'
          ),
          is_read: Boolean(item.is_read),
          created_at: String(
            item.created_at || new Date().toISOString()
          ),
        }));

      setNotifications(normalizedNotifications);
    } catch (error) {
      console.error('LOAD NOTIFICATIONS ERROR:', error);

      Alert.alert(
        'Error',
        'Unable to load notifications. Please try again.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadNotifications();
  };

  const markAsRead = async (notificationId: number) => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/notifications/${notificationId}/read/`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.detail ||
            data?.message ||
            'Failed to mark notification as read.'
        );
      }

      setNotifications((currentNotifications) =>
        currentNotifications.map((notification) =>
          notification.id === notificationId
            ? {
                ...notification,
                is_read: true,
              }
            : notification
        )
      );
    } catch (error) {
      console.error('MARK AS READ ERROR:', error);

      Alert.alert(
        'Error',
        'Unable to mark this notification as read.'
      );
    }
  };

  const markAllAsRead = async () => {
    try {
      const storedUser = await AsyncStorage.getItem('loggedInUser');

      if (!storedUser) {
        router.replace('/');
        return;
      }

      const user: LoggedInUser = JSON.parse(storedUser);

      const username = user.username || user.email;

      if (!username) {
        Alert.alert('Error', 'Unable to identify your account.');
        return;
      }

      const response = await fetch(
        `${API_BASE_URL}/notifications/read-all/`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            username,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.detail ||
            data?.message ||
            'Failed to mark notifications as read.'
        );
      }

      setNotifications((currentNotifications) =>
        currentNotifications.map((notification) => ({
          ...notification,
          is_read: true,
        }))
      );
    } catch (error) {
      console.error('MARK ALL AS READ ERROR:', error);

      Alert.alert(
        'Error',
        'Unable to mark all notifications as read.'
      );
    }
  };

  const unreadCount = notifications.filter(
    (notification) => !notification.is_read
  ).length;

  const getNotificationIcon = (type?: string) => {
    switch (type?.toLowerCase()) {
      case 'motivation':
        return '🔥';

      case 'reminder':
        return '⏰';

      case 'membership':
        return 'M';

      case 'workout':
        return '✓';

      case 'goal':
        return '🎯';

      case 'system':
        return 'ℹ';

      default:
        return '🔔';
    }
  };

  const getNotificationBackground = (type?: string) => {
    switch (type?.toLowerCase()) {
      case 'motivation':
        return '#FFF3E0';

      case 'reminder':
        return '#FFF8E1';

      case 'membership':
        return '#E8F5E9';

      case 'workout':
        return '#E3F2FD';

      case 'goal':
        return '#F3E5F5';

      case 'system':
        return '#ECEFF1';

      default:
        return '#F5F5F5';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);

    if (Number.isNaN(date.getTime())) {
      return '';
    }

    const now = new Date();
    const difference = now.getTime() - date.getTime();

    const minutes = Math.floor(difference / (1000 * 60));
    const hours = Math.floor(difference / (1000 * 60 * 60));
    const days = Math.floor(difference / (1000 * 60 * 60 * 24));

    if (minutes < 1) {
      return 'Just now';
    }

    if (minutes < 60) {
      return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
    }

    if (hours < 24) {
      return `${hours} hour${hours === 1 ? '' : 's'} ago`;
    }

    if (days < 7) {
      return `${days} day${days === 1 ? '' : 's'} ago`;
    }

    return date.toLocaleDateString();
  };

  const NotificationCard = ({
    notification,
  }: {
    notification: NotificationItem;
  }) => {
    const unread = !notification.is_read;

    return (
      <Pressable
        onPress={() => {
          if (unread) {
            markAsRead(notification.id);
          }
        }}
        style={({ pressed }) => [
          styles.notificationCard,
          unread && styles.unreadCard,
          pressed && styles.pressedCard,
        ]}
      >
        <View
          style={[
            styles.iconContainer,
            {
              backgroundColor: getNotificationBackground(
                notification.notification_type
              ),
            },
          ]}
        >
          <Text style={styles.notificationIcon}>
            {getNotificationIcon(notification.notification_type)}
          </Text>
        </View>

        <View style={styles.notificationContent}>
          <View style={styles.notificationTitleRow}>
            <Text
              style={[
                styles.notificationTitle,
                unread && styles.unreadTitle,
              ]}
            >
              {notification.title}
            </Text>

            {unread && <View style={styles.unreadDot} />}
          </View>

          <Text style={styles.notificationMessage}>
            {notification.message}
          </Text>

          <Text style={styles.notificationDate}>
            {formatDate(notification.created_at)}
          </Text>
        </View>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Text style={styles.backButtonText}>‹</Text>
          </Pressable>

          <Text style={styles.headerTitle}>Notifications</Text>

          <Pressable
            onPress={handleRefresh}
            style={styles.refreshButton}
          >
            {refreshing ? (
              <ActivityIndicator size="small" color="#111827" />
            ) : (
              <Text style={styles.refreshText}>↻</Text>
            )}
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.summaryCard}>
            <View>
              <Text style={styles.summaryTitle}>
                Your Notifications
              </Text>

              <Text style={styles.summarySubtitle}>
                {unreadCount === 0
                  ? 'You are all caught up.'
                  : `${unreadCount} unread notification${
                      unreadCount === 1 ? '' : 's'
                    }`}
              </Text>
            </View>

            {unreadCount > 0 && (
              <Pressable
                onPress={markAllAsRead}
                style={styles.markAllButton}
              >
                <Text style={styles.markAllButtonText}>
                  Mark all read
                </Text>
              </Pressable>
            )}
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#111827" />

              <Text style={styles.loadingText}>
                Loading notifications...
              </Text>
            </View>
          ) : notifications.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>🔔</Text>

              <Text style={styles.emptyTitle}>
                No notifications yet
              </Text>

              <Text style={styles.emptyMessage}>
                Your workout, attendance, membership, and goal
                updates will appear here.
              </Text>
            </View>
          ) : (
            <View style={styles.notificationList}>
              {notifications.map((notification) => (
                <NotificationCard
                  key={notification.id}
                  notification={notification}
                />
              ))}
            </View>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F7F8FA',
  },

  container: {
    flex: 1,
    backgroundColor: '#F7F8FA',
  },

  header: {
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },

  backButtonText: {
    fontSize: 34,
    lineHeight: 38,
    color: '#111827',
    fontWeight: '300',
  },

  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
  },

  refreshButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },

  refreshText: {
    fontSize: 28,
    color: '#111827',
  },

  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },

  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },

  summaryTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },

  summarySubtitle: {
    marginTop: 5,
    fontSize: 13,
    color: '#6B7280',
  },

  markAllButton: {
    backgroundColor: '#111827',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
  },

  markAllButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },

  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },

  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },

  emptyContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingHorizontal: 24,
    paddingVertical: 60,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },

  emptyIcon: {
    fontSize: 46,
    marginBottom: 16,
  },

  emptyTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 8,
  },

  emptyMessage: {
    fontSize: 14,
    lineHeight: 21,
    color: '#6B7280',
    textAlign: 'center',
  },

  notificationList: {
    gap: 12,
  },

  notificationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 15,
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },

  unreadCard: {
    borderColor: '#D1D5DB',
  },

  pressedCard: {
    opacity: 0.75,
  },

  iconContainer: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 13,
  },

  notificationIcon: {
    fontSize: 21,
    fontWeight: '800',
  },

  notificationContent: {
    flex: 1,
  },

  notificationTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },

  notificationTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: '#374151',
  },

  unreadTitle: {
    color: '#111827',
    fontWeight: '800',
  },

  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#111827',
    marginLeft: 8,
  },

  notificationMessage: {
    fontSize: 14,
    lineHeight: 20,
    color: '#4B5563',
  },

  notificationDate: {
    marginTop: 8,
    fontSize: 12,
    color: '#9CA3AF',
  },
});