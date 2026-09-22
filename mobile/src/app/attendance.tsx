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

type AttendanceRecord = {
  id: number;
  date: string;
  check_in: string;
  check_out: string | null;
};

export default function AttendanceScreen() {
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);

  const getTodayAttendance = (
    records: AttendanceRecord[]
  ): AttendanceRecord | null => {
    const today = new Date();

    const todayYear = today.getFullYear();
    const todayMonth = today.getMonth();
    const todayDate = today.getDate();

    const record = records.find((item) => {
      if (!item.date) {
        return false;
      }

      const attendanceDate = new Date(item.date);

      return (
        attendanceDate.getFullYear() === todayYear &&
        attendanceDate.getMonth() === todayMonth &&
        attendanceDate.getDate() === todayDate
      );
    });

    return record || null;
  };

  useEffect(() => {
    loadAttendance();
  }, []);

  const getUsername = async (): Promise<string | null> => {
    const storedUser = await AsyncStorage.getItem(
      'loggedInUser'
    );

    if (!storedUser) {
      Alert.alert(
        'Session Expired',
        'Please log in again.'
      );

      router.replace('/');
      return null;
    }

    const user = JSON.parse(storedUser);

    const username = String(
      user.username || user.email || ''
    )
      .trim()
      .toLowerCase();

    if (!username) {
      Alert.alert(
        'Account Error',
        'Your username could not be found.'
      );

      router.replace('/');
      return null;
    }

    return username;
  };

  const loadAttendance = async () => {
    try {
      setLoading(true);

      const username = await getUsername();

      if (!username) {
        return;
      }

      const response = await fetch(
        `${API_BASE_URL}/attendance/?username=${encodeURIComponent(
          username
        )}`
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            'Failed to load attendance.'
        );
      }

      setAttendance(data.attendance || []);
    } catch (error) {
      console.log(
        'Attendance error:',
        error
      );

      Alert.alert(
        'Connection Error',
        'Unable to load attendance records. Please make sure the backend server is running.'
      );
    } finally {
      setLoading(false);
    }
  };

  const checkIn = async () => {
    try {
      const todayAttendance =
        getTodayAttendance(attendance);

      if (todayAttendance) {
        if (!todayAttendance.check_out) {
          Alert.alert(
            'Already Checked In',
            'You are already checked in for today.'
          );
        } else {
          Alert.alert(
            'Attendance Completed',
            'You already completed your attendance for today.'
          );
        }

        return;
      }

      setCheckingIn(true);

      const username = await getUsername();

      if (!username) {
        return;
      }

      const response = await fetch(
        `${API_BASE_URL}/attendance/`,
        {
          method: 'POST',
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
          data.error ||
            'Unable to check in.'
        );
      }

      Alert.alert(
        'Attendance Recorded',
        'Your gym check-in has been recorded for today.'
      );

      await loadAttendance();
    } catch (error: any) {
      console.log(
        'Check-in error:',
        error
      );

      Alert.alert(
        'Check-in Failed',
        error?.message ||
          'Unable to record attendance.'
      );
    } finally {
      setCheckingIn(false);
    }
  };

  const checkOut = async () => {
    try {
      const todayAttendance =
        getTodayAttendance(attendance);

      if (!todayAttendance) {
        Alert.alert(
          'No Check-In',
          'You need to check in before checking out.'
        );

        return;
      }

      if (todayAttendance.check_out) {
        Alert.alert(
          'Already Checked Out',
          'You have already checked out for today.'
        );

        return;
      }

      setCheckingOut(true);

      const username = await getUsername();

      if (!username) {
        return;
      }

      const response = await fetch(
        `${API_BASE_URL}/attendance/`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            username,
            attendance_id:
              todayAttendance.id,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            'Unable to check out.'
        );
      }

      Alert.alert(
        'Check-Out Recorded',
        'Your gym check-out has been recorded successfully.'
      );

      await loadAttendance();
    } catch (error: any) {
      console.log(
        'Check-out error:',
        error
      );

      Alert.alert(
        'Check-Out Failed',
        error?.message ||
          'Unable to record check-out.'
      );
    } finally {
      setCheckingOut(false);
    }
  };

  const totalAttendance = attendance.length;

  const now = new Date();

  const thisMonthAttendance =
    attendance.filter((item) => {
      const date = new Date(item.date);

      return (
        date.getMonth() === now.getMonth() &&
        date.getFullYear() === now.getFullYear()
      );
    }).length;

  const thisWeekAttendance =
    attendance.filter((item) => {
      const date = new Date(item.date);

      const current = new Date();
      const day = current.getDay();

      const mondayOffset =
        day === 0 ? -6 : 1 - day;

      const startOfWeek = new Date(current);

      startOfWeek.setDate(
        current.getDate() + mondayOffset
      );

      startOfWeek.setHours(0, 0, 0, 0);

      const endOfWeek = new Date(
        startOfWeek
      );

      endOfWeek.setDate(
        startOfWeek.getDate() + 6
      );

      endOfWeek.setHours(
        23,
        59,
        59,
        999
      );

      return (
        date >= startOfWeek &&
        date <= endOfWeek
      );
    }).length;

  const getWeeksActive = () => {
    const uniqueWeeks = new Set<string>();

    attendance.forEach((item) => {
      const date = new Date(item.date);

      const firstDay = new Date(date);
      const day = firstDay.getDay();

      const mondayOffset =
        day === 0 ? -6 : 1 - day;

      firstDay.setDate(
        firstDay.getDate() + mondayOffset
      );

      const weekKey = `${firstDay.getFullYear()}-${firstDay.getMonth()}-${firstDay.getDate()}`;

      uniqueWeeks.add(weekKey);
    });

    return uniqueWeeks.size;
  };

  const formatDate = (
    dateString: string
  ) => {
    const date = new Date(dateString);

    return date.toLocaleDateString(
      'en-US',
      {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      }
    );
  };

  const formatTime = (
    timeString: string
  ) => {
    if (!timeString) {
      return '--';
    }

    const [
      hoursString,
      minutesString,
    ] = timeString.split(':');

    const hours = Number(hoursString);
    const minutes = Number(minutesString);

    const date = new Date();

    date.setHours(hours);
    date.setMinutes(minutes);

    return date.toLocaleTimeString(
      'en-US',
      {
        hour: 'numeric',
        minute: '2-digit',
      }
    );
  };

  const todayAttendance =
    getTodayAttendance(attendance);

  const hasCheckedInToday =
    todayAttendance !== null;

  const isCurrentlyCheckedIn =
    todayAttendance !== null &&
    !todayAttendance.check_out;

  const getCheckInButtonText = () => {
    if (checkingIn) {
      return 'CHECKING IN...';
    }

    if (isCurrentlyCheckedIn) {
      return 'CHECKED IN';
    }

    if (hasCheckedInToday) {
      return 'ATTENDANCE COMPLETED';
    }

    return 'CHECK IN NOW';
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={
          styles.container
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
          >
            <Text style={styles.backButton}>
              ‹ Back
            </Text>
          </Pressable>

          <Text style={styles.headerTitle}>
            Attendance
          </Text>

          <View style={{ width: 55 }} />
        </View>

        {/* Summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>
            TOTAL ATTENDANCE
          </Text>

          {loading ? (
            <ActivityIndicator
              size="large"
              color="#FFFFFF"
              style={{ marginVertical: 10 }}
            />
          ) : (
            <Text style={styles.summaryNumber}>
              {thisMonthAttendance}
            </Text>
          )}

          <Text style={styles.summaryText}>
            visits this month
          </Text>
        </View>

        {/* Today's Status */}
        {hasCheckedInToday && (
          <View
            style={[
              styles.todayStatusCard,
              isCurrentlyCheckedIn &&
                styles.todayStatusActive,
            ]}
          >
            <Text style={styles.todayStatusIcon}>
              ✓
            </Text>

            <View style={styles.todayStatusInfo}>
              <Text
                style={styles.todayStatusTitle}
              >
                {isCurrentlyCheckedIn
                  ? 'You are checked in'
                  : 'Attendance completed'}
              </Text>

              <Text
                style={styles.todayStatusText}
              >
                {isCurrentlyCheckedIn
                  ? 'You can check out when you finish your workout.'
                  : 'Your check-in and check-out have both been recorded.'}
              </Text>

              {todayAttendance && (
                <View
                  style={
                    styles.todayTimesContainer
                  }
                >
                  <Text
                    style={styles.todayTimeText}
                  >
                    Check-in:{' '}
                    {formatTime(
                      todayAttendance.check_in
                    )}
                  </Text>

                  {todayAttendance.check_out && (
                    <Text
                      style={
                        styles.todayTimeText
                      }
                    >
                      Check-out:{' '}
                      {formatTime(
                        todayAttendance.check_out
                      )}
                    </Text>
                  )}
                </View>
              )}
            </View>
          </View>
        )}

        {/* Check In */}
        <Pressable
          style={({ pressed }) => [
            hasCheckedInToday
              ? styles.checkedInButton
              : styles.checkInButton,
            pressed &&
              !hasCheckedInToday &&
              styles.buttonPressed,
            (checkingIn ||
              hasCheckedInToday) &&
              styles.disabledButton,
          ]}
          onPress={checkIn}
          disabled={
            checkingIn ||
            hasCheckedInToday
          }
        >
          {checkingIn ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Text style={styles.checkInIcon}>
                ✓
              </Text>

              <Text style={styles.checkInText}>
                {getCheckInButtonText()}
              </Text>
            </>
          )}
        </Pressable>

        {/* Check Out */}
        {isCurrentlyCheckedIn && (
          <Pressable
            style={({ pressed }) => [
              styles.checkOutButton,
              pressed &&
                styles.buttonPressed,
              checkingOut &&
                styles.disabledButton,
            ]}
            onPress={checkOut}
            disabled={checkingOut}
          >
            {checkingOut ? (
              <ActivityIndicator
                color="#FFFFFF"
              />
            ) : (
              <>
                <Text
                  style={styles.checkOutIcon}
                >
                  ↪
                </Text>

                <Text
                  style={styles.checkOutText}
                >
                  CHECK OUT NOW
                </Text>
              </>
            )}
          </Pressable>
        )}

        {/* Attendance Statistics */}
        <Text style={styles.sectionTitle}>
          Attendance Overview
        </Text>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>
              {totalAttendance}
            </Text>

            <Text style={styles.statLabel}>
              Total Visits
            </Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statNumber}>
              {thisWeekAttendance}
            </Text>

            <Text style={styles.statLabel}>
              This Week
            </Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statNumber}>
              {getWeeksActive()}
            </Text>

            <Text style={styles.statLabel}>
              Weeks Active
            </Text>
          </View>
        </View>

        {/* Attendance History */}
        <Text style={styles.sectionTitle}>
          Attendance History
        </Text>

        <View style={styles.historyCard}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator
                size="small"
                color="#28705D"
              />

              <Text style={styles.loadingText}>
                Loading attendance...
              </Text>
            </View>
          ) : attendance.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>
                📅
              </Text>

              <Text style={styles.emptyTitle}>
                No attendance yet
              </Text>

              <Text style={styles.emptyText}>
                Tap "CHECK IN NOW" when you
                arrive at the gym.
              </Text>
            </View>
          ) : (
            attendance.map((item) => (
              <AttendanceItem
                key={item.id}
                date={formatDate(item.date)}
                time={formatTime(
                  item.check_in
                )}
                checkOut={item.check_out}
                formatTime={formatTime}
              />
            ))
          )}
        </View>

        {/* Information */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>
            💡 Keep Your Consistency
          </Text>

          <Text style={styles.infoText}>
            Regular gym attendance can help you
            stay consistent with your fitness
            goals. Keep up your progress!
          </Text>
        </View>

        {/* Refresh */}
        <Pressable
          style={({ pressed }) => [
            styles.refreshButton,
            pressed &&
              styles.buttonPressed,
          ]}
          onPress={loadAttendance}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator
              color="#28705D"
            />
          ) : (
            <Text
              style={styles.refreshButtonText}
            >
              Refresh Attendance
            </Text>
          )}
        </Pressable>

        <Text style={styles.footer}>
          FitTrack AI • Attendance Tracking
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function AttendanceItem({
  date,
  time,
  checkOut,
  formatTime,
}: {
  date: string;
  time: string;
  checkOut: string | null;
  formatTime: (
    timeString: string
  ) => string;
}) {
  return (
    <View style={styles.historyItem}>
      <View style={styles.checkCircle}>
        <Text style={styles.checkText}>
          ✓
        </Text>
      </View>

      <View style={styles.historyInfo}>
        <Text style={styles.historyDate}>
          {date}
        </Text>

        <Text style={styles.historyTime}>
          Check-in: {time}
        </Text>

        {checkOut ? (
          <Text style={styles.historyTime}>
            Check-out:{' '}
            {formatTime(checkOut)}
          </Text>
        ) : (
          <Text style={styles.pendingCheckout}>
            Check-out: Not yet recorded
          </Text>
        )}
      </View>

      <Text
        style={[
          styles.presentText,
          !checkOut &&
            styles.inProgressText,
        ]}
      >
        {checkOut
          ? 'Completed'
          : 'Checked In'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F4F7F5',
  },

  container: {
    padding: 20,
    paddingBottom: 40,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 28,
  },

  backButton: {
    color: '#28705D',
    fontSize: 16,
    fontWeight: '700',
    width: 55,
  },

  headerTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#173F35',
  },

  summaryCard: {
    backgroundColor: '#173F35',
    borderRadius: 18,
    padding: 24,
    alignItems: 'center',
    marginBottom: 15,
  },

  summaryLabel: {
    color: '#B8D2C9',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },

  summaryNumber: {
    color: '#FFFFFF',
    fontSize: 44,
    fontWeight: '800',
    marginTop: 5,
  },

  summaryText: {
    color: '#D7E7E1',
    fontSize: 13,
    marginTop: 2,
  },

  todayStatusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF5DB',
    borderRadius: 15,
    padding: 15,
    marginBottom: 12,
  },

  todayStatusActive: {
    backgroundColor: '#DFF1E9',
  },

  todayStatusIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#28705D',
    color: '#FFFFFF',
    textAlign: 'center',
    textAlignVertical: 'center',
    lineHeight: 38,
    fontSize: 19,
    fontWeight: '800',
  },

  todayStatusInfo: {
    flex: 1,
    marginLeft: 12,
  },

  todayStatusTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#173F35',
  },

  todayStatusText: {
    fontSize: 11,
    color: '#60706A',
    marginTop: 3,
    lineHeight: 16,
  },

  todayTimesContainer: {
    marginTop: 7,
  },

  todayTimeText: {
    fontSize: 11,
    color: '#28705D',
    fontWeight: '700',
    marginTop: 2,
  },

  checkInButton: {
    backgroundColor: '#28705D',
    borderRadius: 14,
    minHeight: 55,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    elevation: 3,
  },

  checkedInButton: {
    backgroundColor: '#6C8580',
    borderRadius: 14,
    minHeight: 55,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    elevation: 1,
  },

  checkOutButton: {
    backgroundColor: '#173F35',
    borderRadius: 14,
    minHeight: 55,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 25,
    elevation: 3,
  },

  buttonPressed: {
    opacity: 0.8,
  },

  disabledButton: {
    opacity: 0.75,
  },

  checkInIcon: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    marginRight: 8,
  },

  checkInText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  checkOutIcon: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    marginRight: 8,
  },

  checkOutText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  sectionTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#1B2A26',
    marginBottom: 12,
    marginTop: 4,
  },

  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 25,
  },

  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 15,
    alignItems: 'center',
    elevation: 2,
  },

  statNumber: {
    fontSize: 23,
    fontWeight: '800',
    color: '#173F35',
  },

  statLabel: {
    fontSize: 10,
    color: '#6C7773',
    textAlign: 'center',
    marginTop: 5,
  },

  historyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 16,
    elevation: 2,
    marginBottom: 20,
  },

  historyItem: {
    minHeight: 82,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#EDF1EF',
  },

  checkCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#DFF1E9',
    alignItems: 'center',
    justifyContent: 'center',
  },

  checkText: {
    color: '#28705D',
    fontSize: 19,
    fontWeight: '800',
  },

  historyInfo: {
    flex: 1,
    marginLeft: 12,
  },

  historyDate: {
    fontSize: 13,
    fontWeight: '700',
    color: '#263631',
  },

  historyTime: {
    fontSize: 11,
    color: '#7A8581',
    marginTop: 4,
  },

  pendingCheckout: {
    fontSize: 11,
    color: '#B07A20',
    marginTop: 4,
    fontWeight: '600',
  },

  presentText: {
    color: '#28705D',
    fontSize: 11,
    fontWeight: '700',
  },

  inProgressText: {
    color: '#B07A20',
  },

  loadingContainer: {
    minHeight: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },

  loadingText: {
    marginTop: 8,
    color: '#6C7773',
    fontSize: 12,
  },

  emptyContainer: {
    paddingVertical: 30,
    alignItems: 'center',
  },

  emptyIcon: {
    fontSize: 32,
    marginBottom: 8,
  },

  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#263631',
  },

  emptyText: {
    fontSize: 12,
    color: '#7A8581',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },

  infoCard: {
    backgroundColor: '#E8F3EF',
    borderRadius: 16,
    padding: 18,
    marginBottom: 15,
  },

  infoTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#173F35',
    marginBottom: 7,
  },

  infoText: {
    fontSize: 12,
    lineHeight: 19,
    color: '#4D5C56',
  },

  refreshButton: {
    minHeight: 50,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#BFD4CC',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 25,
  },

  refreshButtonText: {
    color: '#28705D',
    fontSize: 13,
    fontWeight: '800',
  },

  footer: {
    textAlign: 'center',
    color: '#8A9591',
    fontSize: 11,
  },
});