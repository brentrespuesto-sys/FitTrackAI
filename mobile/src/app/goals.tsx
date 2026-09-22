import React, { useEffect, useState } from 'react';
import {
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
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
};

type Goal = {
  id: number;
  goal_type: string;
  goal_type_display: string;
  title: string;
  description: string;
  target_value: number;
  current_value: number;
  percentage: number;
  start_date: string;
  target_date: string | null;
  status: string;
};

export default function GoalsScreen() {
  const [user, setUser] =
    useState<LoggedInUser | null>(null);

  const [goals, setGoals] = useState<Goal[]>([]);

  const [goal, setGoal] = useState('');
  const [target, setTarget] = useState('');

  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    if (user?.username) {
      loadGoals(user.username);
    }
  }, [user]);

  const loadUser = async () => {
    try {
      const storedUser =
        await AsyncStorage.getItem('loggedInUser');

      if (storedUser) {
        const parsedUser = JSON.parse(
          storedUser
        );

        setUser(parsedUser);
      }
    } catch (error) {
      console.log(
        'Error loading user:',
        error
      );
    }
  };

  const loadGoals = async (
    username: string
  ) => {
    try {
      setLoading(true);

      const response = await fetch(
        `${API_BASE_URL}/goals/?username=${encodeURIComponent(
          username
        )}`
      );

      const data = await response.json();

      console.log(
        'Goals response:',
        data
      );

      if (response.ok) {
        setGoals(data.goals || []);
      } else {
        Alert.alert(
          'Error',
          data.error ||
            'Unable to load goals.'
        );
      }
    } catch (error) {
      console.log(
        'Error loading goals:',
        error
      );

      Alert.alert(
        'Connection Error',
        'Unable to connect to the server.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleAddGoal = async () => {
    if (
      !goal.trim() ||
      !target.trim()
    ) {
      Alert.alert(
        'Incomplete Information',
        'Please enter your fitness goal and target.'
      );

      return;
    }

    if (!user?.username) {
      Alert.alert(
        'Error',
        'User information is missing.'
      );

      return;
    }

    const targetNumber = parseFloat(
      target.replace(/[^\d.-]/g, '')
    );

    if (
      isNaN(targetNumber) ||
      targetNumber <= 0
    ) {
      Alert.alert(
        'Invalid Target',
        'Please enter a valid numeric target, such as 5.'
      );

      return;
    }

    try {
      setAdding(true);

      const response = await fetch(
        `${API_BASE_URL}/goals/`,
        {
          method: 'POST',
          headers: {
            'Content-Type':
              'application/json',
          },
          body: JSON.stringify({
            username:
              user.username,

            title:
              goal.trim(),

            description:
              `Target: ${target.trim()}`,

            goal_type:
              detectGoalType(
                goal.trim()
              ),

            target_value:
              targetNumber,
          }),
        }
      );

      const data =
        await response.json();

      console.log(
        'Create goal response:',
        data
      );

      if (response.ok) {
        Alert.alert(
          'Goal Added',
          'Your fitness goal has been added successfully.'
        );

        setGoal('');
        setTarget('');

        loadGoals(
          user.username
        );
      } else {
        Alert.alert(
          'Unable to Add Goal',
          data.error ||
            'Something went wrong while adding your goal.'
        );
      }
    } catch (error) {
      console.log(
        'Error adding goal:',
        error
      );

      Alert.alert(
        'Connection Error',
        'Unable to connect to the server.'
      );
    } finally {
      setAdding(false);
    }
  };

  const completeGoal = async (
    goalId: number
  ) => {
    if (!user?.username) {
      return;
    }

    try {
      const response = await fetch(
        `${API_BASE_URL}/goals/`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type':
              'application/json',
          },
          body: JSON.stringify({
            username:
              user.username,

            goal_id:
              goalId,

            status:
              'completed',
          }),
        }
      );

      const data =
        await response.json();

      if (response.ok) {
        Alert.alert(
          'Goal Completed',
          'Congratulations! You completed this goal.'
        );

        loadGoals(
          user.username
        );
      } else {
        Alert.alert(
          'Error',
          data.error ||
            'Unable to update goal.'
        );
      }
    } catch (error) {
      console.log(
        'Error completing goal:',
        error
      );

      Alert.alert(
        'Connection Error',
        'Unable to connect to the server.'
      );
    }
  };

  const formatDate = (
    dateString: string | null
  ) => {
    if (!dateString) {
      return 'No target date';
    }

    const date = new Date(
      `${dateString}T00:00:00`
    );

    return date.toLocaleDateString(
      'en-US',
      {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }
    );
  };

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
        {/* Header */}
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
            My Goals
          </Text>

          <View
            style={{
              width: 55,
            }}
          />
        </View>

        {/* Introduction */}
        <View style={styles.intro}>
          <Text style={styles.title}>
            Fitness Goals
          </Text>

          <Text
            style={styles.subtitle}
          >
            Set and monitor your
            fitness goals to stay
            motivated and consistent.
          </Text>
        </View>

        {/* Add Goal */}
        <View
          style={
            styles.formCard
          }
        >
          <Text
            style={
              styles.formTitle
            }
          >
            Add New Goal
          </Text>

          <Text
            style={styles.label}
          >
            Goal
          </Text>

          <TextInput
            style={styles.input}
            placeholder="e.g. Lose weight"
            placeholderTextColor="#8A9591"
            value={goal}
            onChangeText={
              setGoal
            }
          />

          <Text
            style={styles.label}
          >
            Target
          </Text>

          <TextInput
            style={styles.input}
            placeholder="e.g. 5"
            placeholderTextColor="#8A9591"
            value={target}
            onChangeText={
              setTarget
            }
            keyboardType="numeric"
          />

          <Text
            style={
              styles.helperText
            }
          >
            Enter the target
            number only. Example:
            5 for losing 5 kg.
          </Text>

          <Pressable
            style={({
              pressed,
            }) => [
              styles.addButton,

              pressed &&
                styles.buttonPressed,

              adding &&
                styles.disabledButton,
            ]}
            onPress={
              handleAddGoal
            }
            disabled={adding}
          >
            <Text
              style={
                styles.addButtonText
              }
            >
              {adding
                ? 'ADDING...'
                : 'ADD GOAL'}
            </Text>
          </Pressable>
        </View>

        {/* Current Goals */}
        <Text
          style={
            styles.sectionTitle
          }
        >
          Current Goals
        </Text>

        {loading ? (
          <View
            style={
              styles.emptyCard
            }
          >
            <Text
              style={
                styles.emptyText
              }
            >
              Loading your
              goals...
            </Text>
          </View>
        ) : goals.length === 0 ? (
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
              🎯
            </Text>

            <Text
              style={
                styles.emptyTitle
              }
            >
              No Goals Yet
            </Text>

            <Text
              style={
                styles.emptyText
              }
            >
              Add your first
              fitness goal above
              to start tracking
              your progress.
            </Text>
          </View>
        ) : (
          goals.map(
            (item) => (
              <GoalCard
                key={item.id}
                goal={item}
                onComplete={() =>
                  completeGoal(
                    item.id
                  )
                }
                formatDate={
                  formatDate
                }
              />
            )
          )
        )}

        <Text
          style={styles.footer}
        >
          FitTrack AI • Goal
          Tracking
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function detectGoalType(
  title: string
) {
  const text =
    title.toLowerCase();

  if (
    text.includes('weight') ||
    text.includes('lose') ||
    text.includes('fat')
  ) {
    return 'weight_loss';
  }

  if (
    text.includes('muscle') ||
    text.includes('gain')
  ) {
    return 'muscle_gain';
  }

  if (
    text.includes('strength') ||
    text.includes('strong')
  ) {
    return 'strength';
  }

  if (
    text.includes('run') ||
    text.includes('endurance') ||
    text.includes('cardio')
  ) {
    return 'endurance';
  }

  if (
    text.includes('consistent') ||
    text.includes('week') ||
    text.includes('workout')
  ) {
    return 'consistency';
  }

  return 'general';
}

function GoalCard({
  goal,
  onComplete,
  formatDate,
}: {
  goal: Goal;

  onComplete: () => void;

  formatDate: (
    date: string | null
  ) => string;
}) {
  const percentage =
    Math.min(
      Math.max(
        goal.percentage || 0,
        0
      ),
      100
    );

  const isCompleted =
    goal.status ===
    'completed';

  return (
    <View
      style={
        styles.goalCard
      }
    >
      <View
        style={
          styles.goalTop
        }
      >
        <View
          style={
            styles.goalIcon
          }
        >
          <Text
            style={
              styles.goalIconText
            }
          >
            {getGoalIcon(
              goal.goal_type
            )}
          </Text>
        </View>

        <View
          style={
            styles.goalInfo
          }
        >
          <Text
            style={
              styles.goalTitle
            }
          >
            {goal.title}
          </Text>

          <Text
            style={
              styles.goalTarget
            }
          >
            {goal.description ||
              `Target: ${goal.target_value}`}
          </Text>
        </View>

        <Text
          style={
            styles.progressText
          }
        >
          {percentage}%
        </Text>
      </View>

      <View
        style={
          styles.progressBackground
        }
      >
        <View
          style={[
            styles.progressBar,
            {
              width:
                `${percentage}%`,
            },
          ]}
        />
      </View>

      <View
        style={
          styles.goalFooter
        }
      >
        <View>
          <Text
            style={
              styles.progressLabel
            }
          >
            {goal.current_value}{' '}
            /{' '}
            {goal.target_value}{' '}
            completed
          </Text>

          <Text
            style={
              styles.dateText
            }
          >
            Started:{' '}
            {formatDate(
              goal.start_date
            )}
          </Text>
        </View>

        <View
          style={
            isCompleted
              ? styles.completedBadge
              : styles.statusBadge
          }
        >
          <Text
            style={
              isCompleted
                ? styles.completedText
                : styles.statusText
            }
          >
            {isCompleted
              ? 'COMPLETED'
              : goal.status.toUpperCase()}
          </Text>
        </View>
      </View>

      {!isCompleted && (
        <Pressable
          style={
            styles.completeButton
          }
          onPress={
            onComplete
          }
        >
          <Text
            style={
              styles.completeButtonText
            }
          >
            MARK AS COMPLETED
          </Text>
        </Pressable>
      )}
    </View>
  );
}

function getGoalIcon(
  type: string
) {
  switch (type) {
    case 'weight_loss':
      return '⚖️';

    case 'muscle_gain':
      return '💪';

    case 'strength':
      return '🏋️';

    case 'endurance':
      return '🏃';

    case 'consistency':
      return '📅';

    default:
      return '🎯';
  }
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor:
      '#F4F7F5',
  },

  container: {
    padding: 20,
    paddingBottom: 40,
  },

  header: {
    flexDirection: 'row',
    justifyContent:
      'space-between',
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

  formCard: {
    backgroundColor:
      '#FFFFFF',
    borderRadius: 18,
    padding: 20,
    elevation: 3,
    marginBottom: 28,
  },

  formTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#173F35',
    marginBottom: 18,
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
    backgroundColor:
      '#FAFCFB',
    marginBottom: 10,
  },

  helperText: {
    fontSize: 11,
    color: '#7A8581',
    marginBottom: 18,
  },

  addButton: {
    height: 52,
    borderRadius: 12,
    backgroundColor:
      '#173F35',
    alignItems: 'center',
    justifyContent:
      'center',
  },

  disabledButton: {
    opacity: 0.6,
  },

  buttonPressed: {
    opacity: 0.75,
  },

  addButtonText: {
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

  goalCard: {
    backgroundColor:
      '#FFFFFF',
    borderRadius: 16,
    padding: 17,
    marginBottom: 12,
    elevation: 2,
  },

  goalTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },

  goalIcon: {
    width: 45,
    height: 45,
    borderRadius: 23,
    backgroundColor:
      '#E8F3EF',
    alignItems: 'center',
    justifyContent:
      'center',
  },

  goalIconText: {
    fontSize: 22,
  },

  goalInfo: {
    flex: 1,
    marginLeft: 12,
  },

  goalTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1B2A26',
  },

  goalTarget: {
    fontSize: 11,
    color: '#6C7773',
    marginTop: 4,
  },

  progressText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#28705D',
  },

  progressBackground: {
    height: 8,
    backgroundColor:
      '#E3EAE7',
    borderRadius: 10,
    overflow: 'hidden',
  },

  progressBar: {
    height: 8,
    backgroundColor:
      '#28705D',
    borderRadius: 10,
  },

  goalFooter: {
    flexDirection: 'row',
    justifyContent:
      'space-between',
    alignItems: 'center',
    marginTop: 9,
  },

  progressLabel: {
    fontSize: 10,
    color: '#7A8581',
  },

  dateText: {
    fontSize: 10,
    color: '#8A9591',
    marginTop: 3,
  },

  statusBadge: {
    backgroundColor:
      '#E8F3EF',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 12,
  },

  statusText: {
    color: '#28705D',
    fontSize: 9,
    fontWeight: '800',
  },

  completedBadge: {
    backgroundColor:
      '#D9F2E7',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 12,
  },

  completedText: {
    color: '#21634F',
    fontSize: 9,
    fontWeight: '800',
  },

  completeButton: {
    height: 42,
    borderWidth: 1,
    borderColor: '#28705D',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent:
      'center',
    marginTop: 14,
  },

  completeButtonText: {
    color: '#28705D',
    fontSize: 11,
    fontWeight: '800',
  },

  emptyCard: {
    backgroundColor:
      '#FFFFFF',
    borderRadius: 16,
    padding: 25,
    alignItems: 'center',
    elevation: 2,
  },

  emptyIcon: {
    fontSize: 32,
    marginBottom: 8,
  },

  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#173F35',
    marginBottom: 5,
  },

  emptyText: {
    fontSize: 12,
    lineHeight: 18,
    color: '#7A8581',
    textAlign: 'center',
  },

  footer: {
    textAlign: 'center',
    color: '#8A9591',
    fontSize: 11,
    marginTop: 15,
  },
});