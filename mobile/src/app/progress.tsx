import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
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
  id: number;
  username: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  role?: string;
};

type WorkoutLog = {
  id: number;
  workout_name?: string;
  workout_date: string;
  duration_minutes: number;
  calories_burned: number;
  notes?: string;
  completed: boolean;
};

type AttendanceRecord = {
  id: number;
  date: string;
  check_in: string;
  check_out?: string | null;
};

type FitnessGoal = {
  id: number;
  goal_type?: string;
  title: string;
  description?: string;
  target_value?: number | null;
  current_value?: number | null;
  percentage?: number;
  start_date?: string;
  target_date?: string;
  status: string;
};

type DailyActivity = {
  day: string;
  count: number;
};

export default function ProgressScreen() {
  const [user, setUser] = useState<LoggedInUser | null>(null);
  const [workouts, setWorkouts] = useState<WorkoutLog[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [goals, setGoals] = useState<FitnessGoal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProgressData();
  }, []);

  async function loadProgressData() {
    try {
      setLoading(true);

      const storedUser = await AsyncStorage.getItem('loggedInUser');

      if (!storedUser) {
        router.replace('/');
        return;
      }

      const loggedUser: LoggedInUser = JSON.parse(storedUser);
      setUser(loggedUser);

      const username = encodeURIComponent(loggedUser.username);

      const [workoutResponse, attendanceResponse, goalsResponse] =
        await Promise.all([
          fetch(`${API_BASE_URL}/workouts/?username=${username}`),
          fetch(`${API_BASE_URL}/attendance/?username=${username}`),
          fetch(`${API_BASE_URL}/goals/?username=${username}`),
        ]);

      if (workoutResponse.ok) {
        const workoutData = await workoutResponse.json();

        const workoutList = Array.isArray(workoutData)
          ? workoutData
          : workoutData.workouts || [];

        setWorkouts(workoutList);
      } else {
        console.log(
          'Workout request failed:',
          workoutResponse.status
        );
      }

      if (attendanceResponse.ok) {
        const attendanceData = await attendanceResponse.json();

        const attendanceList = Array.isArray(attendanceData)
          ? attendanceData
          : attendanceData.attendance || [];

        setAttendance(attendanceList);
      } else {
        console.log(
          'Attendance request failed:',
          attendanceResponse.status
        );
      }

      if (goalsResponse.ok) {
        const goalsData = await goalsResponse.json();

        const goalList = Array.isArray(goalsData)
          ? goalsData
          : goalsData.goals || [];

        setGoals(goalList);
      } else {
        console.log(
          'Goals request failed:',
          goalsResponse.status
        );
      }
    } catch (error) {
      console.log('Progress loading error:', error);
    } finally {
      setLoading(false);
    }
  }

  /* =========================================================
     WORKOUT CALCULATIONS
  ========================================================= */

  const completedWorkouts = useMemo(() => {
    return workouts.filter((workout) => workout.completed !== false);
  }, [workouts]);

  const totalWorkouts = completedWorkouts.length;

  const totalAttendance = attendance.length;

  const totalWorkoutMinutes = useMemo(() => {
    return completedWorkouts.reduce(
      (total, workout) =>
        total + Number(workout.duration_minutes || 0),
      0
    );
  }, [completedWorkouts]);

  const totalCalories = useMemo(() => {
    return completedWorkouts.reduce(
      (total, workout) =>
        total + Number(workout.calories_burned || 0),
      0
    );
  }, [completedWorkouts]);

  /* =========================================================
     GOAL CALCULATIONS
  ========================================================= */

  const activeGoals = useMemo(() => {
    return goals.filter(
      (goal) => String(goal.status).toLowerCase() !== 'completed'
    );
  }, [goals]);

  const completedGoals = useMemo(() => {
    return goals.filter(
      (goal) => String(goal.status).toLowerCase() === 'completed'
    );
  }, [goals]);

  const goalCompletion = useMemo(() => {
    if (goals.length === 0) {
      return 0;
    }

    return Math.round(
      (completedGoals.length / goals.length) * 100
    );
  }, [goals, completedGoals]);

  const averageGoalProgress = useMemo(() => {
    if (goals.length === 0) {
      return 0;
    }

    const total = goals.reduce((sum, goal) => {
      return sum + Number(goal.percentage || 0);
    }, 0);

    return Math.min(
      100,
      Math.round(total / goals.length)
    );
  }, [goals]);

  /* =========================================================
     WEEKLY ACTIVITY
  ========================================================= */

  const weeklyActivity = useMemo(() => {
    const days: DailyActivity[] = [
      { day: 'Mon', count: 0 },
      { day: 'Tue', count: 0 },
      { day: 'Wed', count: 0 },
      { day: 'Thu', count: 0 },
      { day: 'Fri', count: 0 },
      { day: 'Sat', count: 0 },
      { day: 'Sun', count: 0 },
    ];

    const today = new Date();

    const startOfWeek = new Date(today);
    const currentDay = today.getDay();

    const mondayOffset =
      currentDay === 0 ? -6 : 1 - currentDay;

    startOfWeek.setDate(
      today.getDate() + mondayOffset
    );

    startOfWeek.setHours(0, 0, 0, 0);

    completedWorkouts.forEach((workout) => {
      const workoutDate = parseDate(
        workout.workout_date
      );

      if (!workoutDate) {
        return;
      }

      workoutDate.setHours(0, 0, 0, 0);

      const difference = Math.floor(
        (workoutDate.getTime() -
          startOfWeek.getTime()) /
          (1000 * 60 * 60 * 24)
      );

      if (difference >= 0 && difference <= 6) {
        days[difference].count += 1;
      }
    });

    return days;
  }, [completedWorkouts]);

  const weeklyWorkoutCount = useMemo(() => {
    return weeklyActivity.reduce(
      (total, day) => total + day.count,
      0
    );
  }, [weeklyActivity]);

  /* =========================================================
     PROGRESS SCORES
  ========================================================= */

  const workoutCompletion = useMemo(() => {
    if (workouts.length === 0) {
      return 0;
    }

    return Math.round(
      (completedWorkouts.length / workouts.length) * 100
    );
  }, [workouts, completedWorkouts]);

  const attendanceScore = useMemo(() => {
    if (totalAttendance === 0) {
      return 0;
    }

    /*
     * Four or more attendance records represent
     * the current full activity target.
     */
    return Math.min(
      100,
      Math.round((totalAttendance / 4) * 100)
    );
  }, [totalAttendance]);

  const workoutConsistency = useMemo(() => {
    /*
     * Current project target:
     * 4 completed workouts per week.
     */
    return Math.min(
      100,
      Math.round((weeklyWorkoutCount / 4) * 100)
    );
  }, [weeklyWorkoutCount]);

  const overallProgress = useMemo(() => {
    /*
     * Overall progress now includes:
     *
     * 1. Workout completion
     * 2. Attendance
     * 3. Weekly consistency
     * 4. Fitness goal progress
     */
    const values = [
      workoutCompletion,
      attendanceScore,
      workoutConsistency,
      averageGoalProgress,
    ];

    return Math.round(
      values.reduce(
        (sum, value) => sum + value,
        0
      ) / values.length
    );
  }, [
    workoutCompletion,
    attendanceScore,
    workoutConsistency,
    averageGoalProgress,
  ]);

  const maxBarCount = useMemo(() => {
    const maximum = Math.max(
      ...weeklyActivity.map(
        (item) => item.count
      ),
      1
    );

    return maximum;
  }, [weeklyActivity]);

  /* =========================================================
     STREAK
  ========================================================= */

  const streak = useMemo(() => {
    if (
      attendance.length === 0 &&
      completedWorkouts.length === 0
    ) {
      return 0;
    }

    const activeDates = new Set<string>();

    completedWorkouts.forEach((workout) => {
      const date = normalizeDate(
        workout.workout_date
      );

      if (date) {
        activeDates.add(date);
      }
    });

    attendance.forEach((record) => {
      const date = normalizeDate(record.date);

      if (date) {
        activeDates.add(date);
      }
    });

    if (activeDates.size === 0) {
      return 0;
    }

    const sortedDates = Array.from(
      activeDates
    ).sort().reverse();

    let currentStreak = 0;

    const expectedDate = new Date();

    expectedDate.setHours(0, 0, 0, 0);

    const todayString =
      formatDateKey(expectedDate);

    if (!activeDates.has(todayString)) {
      expectedDate.setDate(
        expectedDate.getDate() - 1
      );
    }

    for (
      let i = 0;
      i < sortedDates.length;
      i++
    ) {
      const expectedString =
        formatDateKey(expectedDate);

      if (
        activeDates.has(expectedString)
      ) {
        currentStreak += 1;

        expectedDate.setDate(
          expectedDate.getDate() - 1
        );
      } else {
        break;
      }
    }

    return currentStreak;
  }, [attendance, completedWorkouts]);

  /* =========================================================
     MILESTONES
  ========================================================= */

  const milestones = useMemo(() => {
    const result: {
      icon: string;
      title: string;
      description: string;
    }[] = [];

    if (totalWorkouts >= 10) {
      result.push({
        icon: '🏆',
        title: '10 Workouts Completed',
        description: `You completed ${totalWorkouts} recorded workouts.`,
      });
    } else {
      result.push({
        icon: '🎯',
        title: 'Workout Milestone',
        description: `${totalWorkouts}/10 workouts completed toward your first milestone.`,
      });
    }

    if (completedGoals.length >= 1) {
      result.push({
        icon: '🥇',
        title: 'Fitness Goal Completed',
        description: `You have completed ${completedGoals.length} fitness goal${
          completedGoals.length === 1 ? '' : 's'
        }.`,
      });
    } else if (goals.length > 0) {
      result.push({
        icon: '🎯',
        title: 'Complete Your First Goal',
        description: `You currently have ${activeGoals.length} active goal${
          activeGoals.length === 1 ? '' : 's'
        }.`,
      });
    } else {
      result.push({
        icon: '🎯',
        title: 'Create a Fitness Goal',
        description:
          'Create your first fitness goal to begin tracking goal progress.',
      });
    }

    if (streak >= 3) {
      result.push({
        icon: '🔥',
        title: `${streak} Day Activity Streak`,
        description:
          'You have stayed active for consecutive days.',
      });
    } else {
      result.push({
        icon: '🔥',
        title: 'Build Your Streak',
        description:
          streak === 0
            ? 'Start logging workouts or attendance to begin your activity streak.'
            : `You currently have a ${streak}-day activity streak.`,
      });
    }

    return result;
  }, [
    totalWorkouts,
    completedGoals,
    goals,
    activeGoals,
    streak,
  ]);

  /* =========================================================
     USER
  ========================================================= */

  const firstName =
    user?.first_name?.trim() ||
    user?.username?.split('@')[0] ||
    'Member';

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()}>
            <Text style={styles.backButton}>
              ‹ Back
            </Text>
          </Pressable>

          <Text style={styles.headerTitle}>
            My Progress
          </Text>

          <Pressable
            onPress={loadProgressData}
          >
            <Text style={styles.refreshButton}>
              ↻
            </Text>
          </Pressable>
        </View>

        {/* Introduction */}
        <View style={styles.intro}>
          <Text style={styles.title}>
            Fitness Progress
          </Text>

          <Text style={styles.subtitle}>
            Hi {firstName}! Monitor your actual
            workouts, attendance, goals, activity,
            and fitness milestones.
          </Text>
        </View>

        {loading ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator
              size="large"
              color="#28705D"
            />

            <Text style={styles.loadingText}>
              Loading your progress...
            </Text>
          </View>
        ) : (
          <>
            {/* Overall Progress */}
            <View style={styles.overallCard}>
              <Text style={styles.cardLabel}>
                OVERALL PROGRESS
              </Text>

              <View style={styles.circle}>
                <Text style={styles.circleNumber}>
                  {overallProgress}%
                </Text>

                <Text style={styles.circleLabel}>
                  Complete
                </Text>
              </View>

              <Text style={styles.overallMessage}>
                {getOverallMessage(
                  overallProgress
                )}
              </Text>
            </View>

            {/* Quick Stats */}
            <Text style={styles.sectionTitle}>
              Activity Overview
            </Text>

            <View style={styles.quickStats}>
              <StatCard
                value={String(totalWorkouts)}
                label="Workouts"
                icon="💪"
              />

              <StatCard
                value={String(totalAttendance)}
                label="Attendance"
                icon="📅"
              />

              <StatCard
                value={String(totalWorkoutMinutes)}
                label="Minutes"
                icon="⏱️"
              />

              <StatCard
                value={String(totalCalories)}
                label="Calories"
                icon="🔥"
              />
            </View>

            {/* Goal Overview */}
            <Text style={styles.sectionTitle}>
              Fitness Goals
            </Text>

            <View style={styles.goalSummaryCard}>
              <View style={styles.goalSummaryHeader}>
                <View>
                  <Text style={styles.goalSummaryTitle}>
                    Goal Progress
                  </Text>

                  <Text
                    style={styles.goalSummarySubtitle}
                  >
                    {goals.length === 0
                      ? 'No fitness goals recorded yet.'
                      : `${completedGoals.length} of ${goals.length} goals completed`}
                  </Text>
                </View>

                <Text style={styles.goalPercentage}>
                  {averageGoalProgress}%
                </Text>
              </View>

              <View
                style={styles.progressBackground}
              >
                <View
                  style={[
                    styles.progressBar,
                    {
                      width: `${averageGoalProgress}%`,
                    },
                  ]}
                />
              </View>

              {goals.length > 0 && (
                <View style={styles.goalCounts}>
                  <Text style={styles.goalCountText}>
                    Active: {activeGoals.length}
                  </Text>

                  <Text style={styles.goalCountText}>
                    Completed: {completedGoals.length}
                  </Text>

                  <Text style={styles.goalCountText}>
                    Completion: {goalCompletion}%
                  </Text>
                </View>
              )}
            </View>

            {/* Active Goals */}
            {activeGoals.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>
                  Active Goal Progress
                </Text>

                <View style={styles.activeGoalsCard}>
                  {activeGoals
                    .slice(0, 5)
                    .map((goal) => {
                      const percentage =
                        Math.max(
                          0,
                          Math.min(
                            100,
                            Math.round(
                              Number(
                                goal.percentage || 0
                              )
                            )
                          )
                        );

                      return (
                        <View
                          key={goal.id}
                          style={styles.goalItem}
                        >
                          <View
                            style={
                              styles.goalItemHeader
                            }
                          >
                            <Text
                              style={
                                styles.goalItemTitle
                              }
                            >
                              {goal.title}
                            </Text>

                            <Text
                              style={
                                styles.goalItemPercentage
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
                                  width: `${percentage}%`,
                                },
                              ]}
                            />
                          </View>

                          <Text
                            style={
                              styles.goalItemValues
                            }
                          >
                            Current:{' '}
                            {Number(
                              goal.current_value || 0
                            )}{' '}
                            / Target:{' '}
                            {Number(
                              goal.target_value || 0
                            )}
                          </Text>
                        </View>
                      );
                    })}
                </View>
              </>
            )}

            {/* Weekly Activity */}
            <Text style={styles.sectionTitle}>
              Weekly Activity
            </Text>

            <View style={styles.chartCard}>
              <View style={styles.chartHeader}>
                <View>
                  <Text style={styles.chartTitle}>
                    Workout Activity
                  </Text>

                  <Text
                    style={styles.chartSubtitle}
                  >
                    {weeklyWorkoutCount} workout
                    {weeklyWorkoutCount === 1
                      ? ''
                      : 's'} this week
                  </Text>
                </View>

                <Text
                  style={styles.chartTarget}
                >
                  Target: 4/week
                </Text>
              </View>

              <View style={styles.chart}>
                {weeklyActivity.map((item) => (
                  <Bar
                    key={item.day}
                    day={item.day}
                    count={item.count}
                    maxCount={maxBarCount}
                  />
                ))}
              </View>
            </View>

            {/* Progress Statistics */}
            <Text style={styles.sectionTitle}>
              Progress Summary
            </Text>

            <View style={styles.statsCard}>
              <ProgressRow
                label="Workout Completion"
                value={workoutCompletion}
              />

              <ProgressRow
                label="Attendance"
                value={attendanceScore}
              />

              <ProgressRow
                label="Workout Consistency"
                value={workoutConsistency}
              />

              <ProgressRow
                label="Fitness Goal Progress"
                value={averageGoalProgress}
              />

              <ProgressRow
                label="Overall Progress"
                value={overallProgress}
              />
            </View>

            {/* Milestones */}
            <Text style={styles.sectionTitle}>
              Milestones
            </Text>

            <View style={styles.milestoneCard}>
              {milestones.map(
                (milestone, index) => (
                  <Milestone
                    key={`${milestone.title}-${index}`}
                    icon={milestone.icon}
                    title={milestone.title}
                    description={
                      milestone.description
                    }
                  />
                )
              )}
            </View>

            {/* AI Insight */}
            <View style={styles.aiCard}>
              <Text style={styles.aiTitle}>
                🤖 FitTrack AI Insight
              </Text>

              <Text style={styles.aiText}>
                {getAIInsight(
                  weeklyWorkoutCount,
                  totalAttendance,
                  streak,
                  overallProgress,
                  goals.length,
                  completedGoals.length,
                  averageGoalProgress
                )}
              </Text>
            </View>
          </>
        )}

        <Text style={styles.footer}>
          FitTrack AI • Progress Tracking
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

/* =========================================================
   BAR
========================================================= */

function Bar({
  day,
  count,
  maxCount,
}: {
  day: string;
  count: number;
  maxCount: number;
}) {
  const maxHeight = 105;

  const height =
    count === 0
      ? 15
      : Math.max(
          25,
          (count / maxCount) * maxHeight
        );

  return (
    <View style={styles.barContainer}>
      <Text style={styles.barCount}>
        {count}
      </Text>

      <View
        style={[
          styles.bar,
          {
            height,
          },
        ]}
      />

      <Text style={styles.dayLabel}>
        {day}
      </Text>
    </View>
  );
}

/* =========================================================
   STAT CARD
========================================================= */

function StatCard({
  value,
  label,
  icon,
}: {
  value: string;
  label: string;
  icon: string;
}) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statIcon}>
        {icon}
      </Text>

      <Text style={styles.statValue}>
        {value}
      </Text>

      <Text style={styles.statLabel}>
        {label}
      </Text>
    </View>
  );
}

/* =========================================================
   PROGRESS ROW
========================================================= */

function ProgressRow({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  const percentage = Math.max(
    0,
    Math.min(100, Math.round(value))
  );

  return (
    <View style={styles.progressRow}>
      <View style={styles.progressHeader}>
        <Text style={styles.progressLabel}>
          {label}
        </Text>

        <Text style={styles.progressValue}>
          {percentage}%
        </Text>
      </View>

      <View
        style={styles.progressBackground}
      >
        <View
          style={[
            styles.progressBar,
            {
              width: `${percentage}%`,
            },
          ]}
        />
      </View>
    </View>
  );
}

/* =========================================================
   MILESTONE
========================================================= */

function Milestone({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <View style={styles.milestone}>
      <View style={styles.milestoneIcon}>
        <Text style={styles.milestoneEmoji}>
          {icon}
        </Text>
      </View>

      <View style={styles.milestoneInfo}>
        <Text style={styles.milestoneTitle}>
          {title}
        </Text>

        <Text
          style={styles.milestoneDescription}
        >
          {description}
        </Text>
      </View>
    </View>
  );
}

/* =========================================================
   DATE HELPERS
========================================================= */

function parseDate(
  dateString: string
): Date | null {
  if (!dateString) {
    return null;
  }

  const parts = dateString.split('-');

  if (parts.length === 3) {
    const year = Number(parts[0]);
    const month = Number(parts[1]) - 1;
    const day = Number(parts[2]);

    return new Date(
      year,
      month,
      day
    );
  }

  const parsed = new Date(dateString);

  if (
    Number.isNaN(parsed.getTime())
  ) {
    return null;
  }

  return parsed;
}

function normalizeDate(
  dateString: string
): string | null {
  const date = parseDate(dateString);

  if (!date) {
    return null;
  }

  return formatDateKey(date);
}

function formatDateKey(
  date: Date
): string {
  const year = date.getFullYear();

  const month = String(
    date.getMonth() + 1
  ).padStart(2, '0');

  const day = String(
    date.getDate()
  ).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

/* =========================================================
   MESSAGES
========================================================= */

function getOverallMessage(
  progress: number
): string {
  if (progress === 0) {
    return 'Start recording your workouts, attendance, and goals to track your fitness journey.';
  }

  if (progress < 30) {
    return 'You have started your fitness journey. Keep logging your activities consistently.';
  }

  if (progress < 60) {
    return 'You are building a good routine. Keep showing up and recording your workouts.';
  }

  if (progress < 80) {
    return 'You are making steady progress toward your fitness goals.';
  }

  return 'Excellent consistency! Keep maintaining your fitness routine.';
}

/* =========================================================
   AI INSIGHT
========================================================= */

function getAIInsight(
  weeklyWorkouts: number,
  attendance: number,
  streak: number,
  progress: number,
  totalGoals: number,
  completedGoals: number,
  averageGoalProgress: number
): string {
  if (
    weeklyWorkouts === 0 &&
    attendance === 0 &&
    totalGoals === 0
  ) {
    return 'No recent activity has been recorded yet. Start with a workout, gym attendance entry, or fitness goal so FitTrack AI can learn from your activity.';
  }

  if (
    totalGoals > 0 &&
    completedGoals === totalGoals &&
    totalGoals >= 1
  ) {
    return `You have completed all ${totalGoals} of your recorded fitness goal${
      totalGoals === 1 ? '' : 's'
    }. Consider creating a new goal to continue challenging yourself.`;
  }

  if (
    weeklyWorkouts >= 4 &&
    averageGoalProgress >= 70
  ) {
    return `You completed ${weeklyWorkouts} workouts this week and your average goal progress is ${averageGoalProgress}%. Your activity and goal data show strong consistency. Continue monitoring recovery and gradually progress your routine.`;
  }

  if (streak >= 3) {
    return `You currently have a ${streak}-day activity streak. Maintaining regular activity can help build a consistent fitness routine.`;
  }

  if (
    totalGoals > 0 &&
    averageGoalProgress < 40
  ) {
    return `Your current average fitness goal progress is ${averageGoalProgress}%. Continue recording workouts and updating your goal progress so FitTrack AI can provide more personalized recommendations.`;
  }

  if (attendance >= 4) {
    return `You have ${attendance} recorded gym attendance entries. Continue pairing regular attendance with completed workouts and measurable fitness goals.`;
  }

  if (progress >= 60) {
    return 'Your activity indicators show steady progress. Continue maintaining your current routine and work toward consistent weekly activity.';
  }

  return 'Keep recording your workouts, attendance, and fitness goals. More activity data will allow FitTrack AI to provide more personalized recommendations.';
}

/* =========================================================
   STYLES
========================================================= */

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

  refreshButton: {
    color: '#28705D',
    fontSize: 28,
    fontWeight: '700',
    width: 35,
    textAlign: 'right',
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

  loadingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 35,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 25,
    elevation: 2,
  },

  loadingText: {
    marginTop: 12,
    fontSize: 13,
    color: '#6C7773',
  },

  overallCard: {
    backgroundColor: '#173F35',
    borderRadius: 18,
    padding: 22,
    alignItems: 'center',
    marginBottom: 25,
  },

  cardLabel: {
    color: '#B8D2C9',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },

  circle: {
    width: 145,
    height: 145,
    borderRadius: 73,
    borderWidth: 10,
    borderColor: '#8CC7B2',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 18,
  },

  circleNumber: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '800',
  },

  circleLabel: {
    color: '#D7E7E1',
    fontSize: 11,
    marginTop: 2,
  },

  overallMessage: {
    color: '#D7E7E1',
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },

  sectionTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#1B2A26',
    marginBottom: 12,
    marginTop: 4,
  },

  quickStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 25,
  },

  statCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
  },

  statIcon: {
    fontSize: 20,
    marginBottom: 7,
  },

  statValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#173F35',
  },

  statLabel: {
    fontSize: 11,
    color: '#6C7773',
    marginTop: 3,
  },

  goalSummaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    elevation: 2,
    marginBottom: 25,
  },

  goalSummaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },

  goalSummaryTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#263631',
  },

  goalSummarySubtitle: {
    fontSize: 11,
    color: '#7A8581',
    marginTop: 4,
  },

  goalPercentage: {
    fontSize: 22,
    fontWeight: '800',
    color: '#28705D',
  },

  goalCounts: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },

  goalCountText: {
    fontSize: 10,
    color: '#6C7773',
    fontWeight: '600',
  },

  activeGoalsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    elevation: 2,
    marginBottom: 25,
  },

  goalItem: {
    marginBottom: 18,
  },

  goalItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 7,
  },

  goalItemTitle: {
    flex: 1,
    fontSize: 13,
    fontWeight: '800',
    color: '#263631',
    marginRight: 10,
  },

  goalItemPercentage: {
    fontSize: 12,
    fontWeight: '800',
    color: '#28705D',
  },

  goalItemValues: {
    fontSize: 10,
    color: '#7A8581',
    marginTop: 6,
  },

  progressBackground: {
    height: 8,
    backgroundColor: '#E3EAE7',
    borderRadius: 10,
    overflow: 'hidden',
  },

  progressBar: {
    height: 8,
    backgroundColor: '#28705D',
    borderRadius: 10,
  },

  chartCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    elevation: 2,
    marginBottom: 25,
  },

  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 15,
  },

  chartTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#263631',
  },

  chartSubtitle: {
    fontSize: 11,
    color: '#7A8581',
    marginTop: 4,
  },

  chartTarget: {
    fontSize: 10,
    fontWeight: '700',
    color: '#28705D',
    marginTop: 2,
  },

  chart: {
    height: 155,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 5,
  },

  barContainer: {
    height: 155,
    alignItems: 'center',
    justifyContent: 'flex-end',
    minWidth: 30,
  },

  bar: {
    width: 24,
    backgroundColor: '#28705D',
    borderRadius: 7,
    minHeight: 15,
  },

  barCount: {
    fontSize: 9,
    color: '#28705D',
    fontWeight: '800',
    marginBottom: 4,
  },

  dayLabel: {
    fontSize: 10,
    color: '#7A8581',
    marginTop: 7,
  },

  statsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    elevation: 2,
    marginBottom: 25,
  },

  progressRow: {
    marginBottom: 17,
  },

  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 7,
  },

  progressLabel: {
    fontSize: 12,
    color: '#4D5C56',
  },

  progressValue: {
    fontSize: 12,
    color: '#28705D',
    fontWeight: '800',
  },

  milestoneCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 17,
    elevation: 2,
    marginBottom: 20,
  },

  milestone: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 17,
  },

  milestoneIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#E8F3EF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  milestoneEmoji: {
    fontSize: 22,
  },

  milestoneInfo: {
    flex: 1,
    marginLeft: 12,
  },

  milestoneTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1B2A26',
  },

  milestoneDescription: {
    fontSize: 11,
    lineHeight: 17,
    color: '#6C7773',
    marginTop: 3,
  },

  aiCard: {
    backgroundColor: '#E8F3EF',
    borderRadius: 16,
    padding: 18,
    marginBottom: 25,
  },

  aiTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#173F35',
    marginBottom: 8,
  },

  aiText: {
    fontSize: 12,
    lineHeight: 19,
    color: '#4D5C56',
  },

  footer: {
    textAlign: 'center',
    color: '#8A9591',
    fontSize: 11,
  },
});