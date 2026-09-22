
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  SafeAreaView,
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
  username: string;
  email: string;
  first_name: string;
  last_name: string;
};

type WorkoutRecord = {
  id: number;
  workout_name: string;
  workout_date: string;
  duration_minutes: number;
  calories_burned: number;
  notes: string;
  completed: boolean;
};

export default function WorkoutScreen() {
  const [workoutName, setWorkoutName] = useState('');
  const [duration, setDuration] = useState('');
  const [calories, setCalories] = useState('');
  const [sets, setSets] = useState('');
  const [notes, setNotes] = useState('');

  const [user, setUser] =
    useState<LoggedInUser | null>(null);

  const [recentWorkouts, setRecentWorkouts] =
    useState<WorkoutRecord[]>([]);

  const [loadingWorkouts, setLoadingWorkouts] =
    useState(true);

  const [saving, setSaving] = useState(false);

  // =====================================================
  // GET LOCAL DATE
  // =====================================================

  const getLocalDate = () => {
    const today = new Date();

    const year = today.getFullYear();

    const month = String(
      today.getMonth() + 1
    ).padStart(2, '0');

    const day = String(
      today.getDate()
    ).padStart(2, '0');

    return `${year}-${month}-${day}`;
  };

  // =====================================================
  // LOAD LOGGED-IN USER
  // =====================================================

  const loadUser = async () => {
    try {
      const storedUser =
        await AsyncStorage.getItem(
          'loggedInUser'
        );

      if (!storedUser) {
        Alert.alert(
          'Session Required',
          'Please log in again before recording a workout.',
          [
            {
              text: 'OK',
              onPress: () =>
                router.replace('/'),
            },
          ]
        );

        return null;
      }

      const parsedUser: LoggedInUser =
        JSON.parse(storedUser);

      setUser(parsedUser);

      return parsedUser;

    } catch (error) {
      console.error(
        'Error loading user:',
        error
      );

      Alert.alert(
        'Error',
        'Unable to load your account information.'
      );

      return null;
    }
  };

  // =====================================================
  // LOAD WORKOUT HISTORY
  // =====================================================

  const loadWorkouts = async (
    username: string
  ) => {
    try {
      setLoadingWorkouts(true);

      const response = await fetch(
        `${API_BASE_URL}/workouts/?username=${encodeURIComponent(
          username
        )}`
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            data.message ||
            'Unable to load workouts.'
        );
      }

      setRecentWorkouts(
        data.workouts || []
      );

    } catch (error) {
      console.error(
        'Workout loading error:',
        error
      );

      Alert.alert(
        'Unable to Load Workouts',
        'We could not retrieve your workout history. Please check your connection and try again.'
      );

    } finally {
      setLoadingWorkouts(false);
    }
  };

  // =====================================================
  // INITIAL LOAD
  // =====================================================

  useEffect(() => {
    const initialize = async () => {
      const currentUser =
        await loadUser();

      if (currentUser) {
        await loadWorkouts(
          currentUser.username
        );
      } else {
        setLoadingWorkouts(false);
      }
    };

    initialize();
  }, []);

  // =====================================================
  // SAVE WORKOUT
  // =====================================================

  const handleSaveWorkout = async () => {
    if (!user) {
      Alert.alert(
        'Session Required',
        'Please log in again before recording a workout.'
      );

      return;
    }

    if (
      !workoutName.trim() ||
      !duration.trim()
    ) {
      Alert.alert(
        'Incomplete Information',
        'Please enter the workout name and duration.'
      );

      return;
    }

    const durationNumber =
      Number(duration);

    const caloriesNumber =
      calories.trim()
        ? Number(calories)
        : 0;

    const setsNumber =
      sets.trim()
        ? Number(sets)
        : 0;

    // -----------------------------------------------------
    // VALIDATE DURATION
    // -----------------------------------------------------

    if (
      !Number.isInteger(
        durationNumber
      ) ||
      durationNumber <= 0
    ) {
      Alert.alert(
        'Invalid Duration',
        'Please enter a valid workout duration in minutes.'
      );

      return;
    }

    // -----------------------------------------------------
    // VALIDATE CALORIES
    // -----------------------------------------------------

    if (
      calories.trim() &&
      (
        !Number.isInteger(
          caloriesNumber
        ) ||
        caloriesNumber < 0
      )
    ) {
      Alert.alert(
        'Invalid Calories',
        'Please enter a valid number of calories.'
      );

      return;
    }

    // -----------------------------------------------------
    // VALIDATE SETS
    // -----------------------------------------------------

    if (
      sets.trim() &&
      (
        !Number.isInteger(
          setsNumber
        ) ||
        setsNumber < 0
      )
    ) {
      Alert.alert(
        'Invalid Sets',
        'Please enter a valid number of sets.'
      );

      return;
    }

    try {
      setSaving(true);

      // ---------------------------------------------------
      // BUILD NOTES
      // ---------------------------------------------------

      let finalNotes =
        notes.trim();

      if (setsNumber > 0) {
        const setsText =
          `Sets: ${setsNumber}`;

        finalNotes =
          finalNotes
            ? `${setsText}\n${finalNotes}`
            : setsText;
      }

      // ---------------------------------------------------
      // SEND WORKOUT TO DJANGO
      // ---------------------------------------------------

      const response =
        await fetch(
          `${API_BASE_URL}/workouts/`,
          {
            method: 'POST',

            headers: {
              'Content-Type':
                'application/json',
            },

            body: JSON.stringify({
              username:
                user.username,

              workout_name:
                workoutName.trim(),

              // Use local Philippine/device date
              // instead of UTC date.
              workout_date:
                getLocalDate(),

              duration_minutes:
                durationNumber,

              calories_burned:
                caloriesNumber,

              notes:
                finalNotes,

              completed: true,
            }),
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            data.message ||
            'Unable to save workout.'
        );
      }

      Alert.alert(
        'Workout Saved',
        'Your workout has been recorded successfully.',
        [
          {
            text: 'OK',

            onPress: async () => {
              setWorkoutName('');
              setDuration('');
              setCalories('');
              setSets('');
              setNotes('');

              await loadWorkouts(
                user.username
              );
            },
          },
        ]
      );

    } catch (error) {
      console.error(
        'Workout save error:',
        error
      );

      Alert.alert(
        'Unable to Save Workout',
        error instanceof Error
          ? error.message
          : 'Something went wrong while saving your workout. Please check your connection and try again.'
      );

    } finally {
      setSaving(false);
    }
  };

  // =====================================================
  // FORMAT DATE
  // =====================================================

  const formatWorkoutDate = (
    dateString: string
  ) => {
    const date =
      new Date(
        `${dateString}T00:00:00`
      );

    if (
      isNaN(
        date.getTime()
      )
    ) {
      return dateString;
    }

    const todayString =
      getLocalDate();

    if (
      dateString ===
      todayString
    ) {
      return 'Today';
    }

    return date.toLocaleDateString(
      'en-US',
      {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }
    );
  };

  // =====================================================
  // SCREEN
  // =====================================================

  return (
    <SafeAreaView
      style={styles.safeArea}
    >
      <ScrollView
        contentContainerStyle={
          styles.container
        }
        showsVerticalScrollIndicator={
          false
        }
      >

        {/* HEADER */}

        <View style={styles.header}>

          <Pressable
            onPress={() =>
              router.back()
            }
          >
            <Text
              style={
                styles.backButton
              }
            >
              ‹ Back
            </Text>
          </Pressable>

          <Text
            style={
              styles.headerTitle
            }
          >
            Workout Log
          </Text>

          <View
            style={{
              width: 55,
            }}
          />

        </View>

        {/* INTRO */}

        <View
          style={styles.intro}
        >
          <Text
            style={styles.title}
          >
            Log Your Workout
          </Text>

          <Text
            style={styles.subtitle}
          >
            Record your workout activity to
            help FitTrack AI understand your
            fitness progress.
          </Text>
        </View>

        {/* WORKOUT FORM */}

        <View
          style={styles.card}
        >

          {/* WORKOUT NAME */}

          <Text
            style={styles.label}
          >
            Workout Name
          </Text>

          <TextInput
            style={styles.input}
            placeholder="e.g. Chest Workout"
            placeholderTextColor="#8A9591"
            value={workoutName}
            onChangeText={
              setWorkoutName
            }
          />

          {/* DURATION */}

          <Text
            style={styles.label}
          >
            Duration (minutes)
          </Text>

          <TextInput
            style={styles.input}
            placeholder="e.g. 60"
            placeholderTextColor="#8A9591"
            value={duration}
            onChangeText={
              setDuration
            }
            keyboardType="numeric"
          />

          {/* CALORIES */}

          <Text
            style={styles.label}
          >
            Calories Burned
          </Text>

          <TextInput
            style={styles.input}
            placeholder="e.g. 450"
            placeholderTextColor="#8A9591"
            value={calories}
            onChangeText={
              setCalories
            }
            keyboardType="numeric"
          />

          {/* SETS */}

          <Text
            style={styles.label}
          >
            Number of Sets
          </Text>

          <TextInput
            style={styles.input}
            placeholder="e.g. 4"
            placeholderTextColor="#8A9591"
            value={sets}
            onChangeText={
              setSets
            }
            keyboardType="numeric"
          />

          {/* NOTES */}

          <Text
            style={styles.label}
          >
            Notes
          </Text>

          <TextInput
            style={[
              styles.input,
              styles.notesInput,
            ]}
            placeholder="Add workout details..."
            placeholderTextColor="#8A9591"
            value={notes}
            onChangeText={
              setNotes
            }
            multiline
            textAlignVertical="top"
          />

          {/* SAVE */}

          <Pressable
            style={({
              pressed,
            }) => [
              styles.saveButton,

              pressed &&
                styles.buttonPressed,

              saving &&
                styles.buttonDisabled,
            ]}
            onPress={
              handleSaveWorkout
            }
            disabled={saving}
          >

            {saving ? (
              <ActivityIndicator
                size="small"
                color="#FFFFFF"
              />
            ) : (
              <Text
                style={
                  styles.saveButtonText
                }
              >
                SAVE WORKOUT
              </Text>
            )}

          </Pressable>

        </View>

        {/* RECENT WORKOUTS */}

        <Text
          style={
            styles.sectionTitle
          }
        >
          Recent Workouts
        </Text>

        {loadingWorkouts ? (

          <View
            style={
              styles.loadingContainer
            }
          >

            <ActivityIndicator
              size="small"
              color="#28705D"
            />

            <Text
              style={
                styles.loadingText
              }
            >
              Loading workout history...
            </Text>

          </View>

        ) : recentWorkouts.length === 0 ? (

          <View
            style={
              styles.emptyCard
            }
          >

            <Text
              style={
                styles.emptyIcon
              }
            >
              🏋️
            </Text>

            <Text
              style={
                styles.emptyTitle
              }
            >
              No workouts yet
            </Text>

            <Text
              style={
                styles.emptyText
              }
            >
              Your completed workouts
              will appear here.
            </Text>

          </View>

        ) : (

          recentWorkouts.map(
            (workout) => (

              <View
                key={workout.id}
                style={
                  styles.recentCard
                }
              >

                <View
                  style={
                    styles.recentIcon
                  }
                >

                  <Text
                    style={
                      styles.recentIconText
                    }
                  >
                    🏋️
                  </Text>

                </View>

                <View
                  style={
                    styles.recentInfo
                  }
                >

                  <Text
                    style={
                      styles.recentTitle
                    }
                  >
                    {
                      workout.workout_name
                    }
                  </Text>

                  <Text
                    style={
                      styles.recentDetails
                    }
                  >
                    {
                      workout.duration_minutes
                    }{' '}
                    minutes
                    {workout.calories_burned > 0
                      ? ` • ${workout.calories_burned} kcal`
                      : ''}
                  </Text>

                  {workout.notes ? (
                    <Text
                      style={
                        styles.recentNotes
                      }
                      numberOfLines={2}
                    >
                      {
                        workout.notes
                      }
                    </Text>
                  ) : null}

                  <Text
                    style={
                      styles.recentDate
                    }
                  >
                    {
                      formatWorkoutDate(
                        workout.workout_date
                      )
                    }
                  </Text>

                </View>

              </View>
            )
          )
        )}

      </ScrollView>
    </SafeAreaView>
  );
}


// =========================================================
// STYLES
// =========================================================

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

  intro: {
    marginBottom: 20,
  },

  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1B2A26',
    marginBottom: 7,
  },

  subtitle: {
    fontSize: 13,
    lineHeight: 20,
    color: '#6C7773',
  },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 20,
    elevation: 3,
    marginBottom: 28,
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
    fontSize: 14,
    color: '#1B2A26',
    backgroundColor: '#FAFCFB',
    marginBottom: 18,
  },

  notesInput: {
    height: 100,
    paddingTop: 14,
  },

  saveButton: {
    height: 52,
    borderRadius: 12,
    backgroundColor: '#173F35',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },

  buttonPressed: {
    opacity: 0.75,
  },

  buttonDisabled: {
    opacity: 0.6,
  },

  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.8,
  },

  sectionTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#1B2A26',
    marginBottom: 12,
  },

  loadingContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 25,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
  },

  loadingText: {
    marginTop: 10,
    fontSize: 13,
    color: '#6C7773',
  },

  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 25,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
  },

  emptyIcon: {
    fontSize: 34,
    marginBottom: 10,
  },

  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1B2A26',
  },

  emptyText: {
    fontSize: 12,
    color: '#6C7773',
    marginTop: 5,
    textAlign: 'center',
  },

  recentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    elevation: 2,
    marginBottom: 12,
  },

  recentIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#E8F3EF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  recentIconText: {
    fontSize: 25,
  },

  recentInfo: {
    flex: 1,
    marginLeft: 14,
  },

  recentTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1B2A26',
  },

  recentDetails: {
    fontSize: 12,
    color: '#6C7773',
    marginTop: 4,
  },

  recentNotes: {
    fontSize: 11,
    lineHeight: 16,
    color: '#6C7773',
    marginTop: 4,
  },

  recentDate: {
    fontSize: 11,
    color: '#28705D',
    fontWeight: '700',
    marginTop: 4,
  },

});

