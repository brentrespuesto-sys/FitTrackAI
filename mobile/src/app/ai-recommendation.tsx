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

type Goal = {
  id: number;
  goal_type?: string;
  title: string;
  description?: string;
  target_value?: number | null;
  current_value?: number;
  status?: string;
  percentage?: number;
  progress_percentage?: number;
};

type Recommendation = {
  title: string;
  text: string;
  icon: string;
};

type Suggestion = {
  title: string;
  description: string;
};

export default function AIRecommendationScreen() {
  const [user, setUser] = useState<LoggedInUser | null>(null);
  const [workouts, setWorkouts] = useState<WorkoutLog[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAIData();
  }, []);

  async function loadAIData() {
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

      const requests = await Promise.allSettled([
        fetch(`${API_BASE_URL}/workouts/?username=${username}`),
        fetch(`${API_BASE_URL}/attendance/?username=${username}`),
        fetch(`${API_BASE_URL}/goals/?username=${username}`),
      ]);

      /* ======================================================
         WORKOUTS
      ====================================================== */

      if (
        requests[0].status === 'fulfilled' &&
        requests[0].value.ok
      ) {
        const workoutData = await requests[0].value.json();

        const workoutList = Array.isArray(workoutData)
          ? workoutData
          : workoutData.workouts || [];

        setWorkouts(workoutList);
      } else {
        setWorkouts([]);
      }

      /* ======================================================
         ATTENDANCE
      ====================================================== */

      if (
        requests[1].status === 'fulfilled' &&
        requests[1].value.ok
      ) {
        const attendanceData = await requests[1].value.json();

        const attendanceList = Array.isArray(attendanceData)
          ? attendanceData
          : attendanceData.attendance || [];

        setAttendance(attendanceList);
      } else {
        setAttendance([]);
      }

      /* ======================================================
         GOALS
      ====================================================== */

      if (
        requests[2].status === 'fulfilled' &&
        requests[2].value.ok
      ) {
        const goalData = await requests[2].value.json();

        const goalList = Array.isArray(goalData)
          ? goalData
          : goalData.goals || [];

        setGoals(goalList);
      } else {
        setGoals([]);
      }
    } catch (error) {
      console.log('AI data loading error:', error);
    } finally {
      setLoading(false);
    }
  }

  /* ======================================================
     COMPLETED WORKOUTS
  ====================================================== */

  const completedWorkouts = useMemo(() => {
    return workouts.filter(
      (workout) => workout.completed !== false
    );
  }, [workouts]);

  /* ======================================================
     CURRENT WEEK WORKOUTS
  ====================================================== */

  const weeklyWorkoutCount = useMemo(() => {
    const today = new Date();

    const startOfWeek = getStartOfWeek(today);

    return completedWorkouts.filter((workout) => {
      const date = parseDate(workout.workout_date);

      if (!date) {
        return false;
      }

      date.setHours(0, 0, 0, 0);

      const difference =
        (date.getTime() - startOfWeek.getTime()) /
        (1000 * 60 * 60 * 24);

      return difference >= 0 && difference <= 6;
    }).length;
  }, [completedWorkouts]);

  /* ======================================================
     LAST 7 DAYS WORKOUTS
  ====================================================== */

  const recentWorkoutCount = useMemo(() => {
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    return completedWorkouts.filter((workout) => {
      const date = parseDate(workout.workout_date);

      if (!date) {
        return false;
      }

      date.setHours(0, 0, 0, 0);

      return date >= sevenDaysAgo && date <= today;
    }).length;
  }, [completedWorkouts]);

  /* ======================================================
     WORKOUT MINUTES
  ====================================================== */

  const totalWorkoutMinutes = useMemo(() => {
    return completedWorkouts.reduce(
      (sum, workout) =>
        sum + Number(workout.duration_minutes || 0),
      0
    );
  }, [completedWorkouts]);

  const weeklyWorkoutMinutes = useMemo(() => {
    const today = new Date();
    const startOfWeek = getStartOfWeek(today);

    return completedWorkouts
      .filter((workout) => {
        const date = parseDate(workout.workout_date);

        if (!date) {
          return false;
        }

        date.setHours(0, 0, 0, 0);

        const difference =
          (date.getTime() - startOfWeek.getTime()) /
          (1000 * 60 * 60 * 24);

        return difference >= 0 && difference <= 6;
      })
      .reduce(
        (sum, workout) =>
          sum + Number(workout.duration_minutes || 0),
        0
      );
  }, [completedWorkouts]);

  /* ======================================================
     CALORIES
  ====================================================== */

  const totalCalories = useMemo(() => {
    return completedWorkouts.reduce(
      (sum, workout) =>
        sum + Number(workout.calories_burned || 0),
      0
    );
  }, [completedWorkouts]);

  const weeklyCalories = useMemo(() => {
    const today = new Date();
    const startOfWeek = getStartOfWeek(today);

    return completedWorkouts
      .filter((workout) => {
        const date = parseDate(workout.workout_date);

        if (!date) {
          return false;
        }

        date.setHours(0, 0, 0, 0);

        const difference =
          (date.getTime() - startOfWeek.getTime()) /
          (1000 * 60 * 60 * 24);

        return difference >= 0 && difference <= 6;
      })
      .reduce(
        (sum, workout) =>
          sum + Number(workout.calories_burned || 0),
        0
      );
  }, [completedWorkouts]);

  /* ======================================================
     WORKOUT CONSISTENCY
  ====================================================== */

  const consistencyScore = useMemo(() => {
    /*
     * Four workouts per week is the reference activity target.
     */
    return Math.min(
      100,
      Math.round((weeklyWorkoutCount / 4) * 100)
    );
  }, [weeklyWorkoutCount]);

  /* ======================================================
     ATTENDANCE
  ====================================================== */

  const attendanceCount = attendance.length;

  const attendanceScore = useMemo(() => {
    /*
     * Four recorded visits is treated as the
     * basic weekly activity target.
     */
    return Math.min(
      100,
      Math.round((attendanceCount / 4) * 100)
    );
  }, [attendanceCount]);

  /* ======================================================
     GOAL ANALYSIS
  ====================================================== */

  const activeGoals = useMemo(() => {
    return goals.filter(
      (goal) =>
        goal.status !== 'completed' &&
        goal.status !== 'paused'
    );
  }, [goals]);

  const completedGoals = useMemo(() => {
    return goals.filter(
      (goal) => goal.status === 'completed'
    );
  }, [goals]);

  const goalCompletion = useMemo(() => {
    if (goals.length === 0) {
      return 0;
    }

    const percentages = goals.map((goal) => {
      if (
        typeof goal.percentage === 'number'
      ) {
        return Math.min(
          100,
          Math.max(0, goal.percentage)
        );
      }

      if (
        typeof goal.progress_percentage === 'number'
      ) {
        return Math.min(
          100,
          Math.max(
            0,
            goal.progress_percentage
          )
        );
      }

      if (goal.status === 'completed') {
        return 100;
      }

      const target = Number(
        goal.target_value || 0
      );

      const current = Number(
        goal.current_value || 0
      );

      if (target <= 0) {
        return 0;
      }

      return Math.min(
        100,
        Math.max(
          0,
          Math.round(
            (current / target) * 100
          )
        )
      );
    });

    return Math.round(
      percentages.reduce(
        (sum, value) => sum + value,
        0
      ) / percentages.length
    );
  }, [goals]);

  /* ======================================================
     PRIMARY GOAL
  ====================================================== */

  const primaryGoal = useMemo(() => {
    if (activeGoals.length === 0) {
      return null;
    }

    const sortedGoals = [...activeGoals].sort(
      (a, b) =>
        getGoalPercentage(a) -
        getGoalPercentage(b)
    );

    return sortedGoals[0];
  }, [activeGoals]);

  /* ======================================================
     ACTIVITY STREAK
  ====================================================== */

  const activityStreak = useMemo(() => {
    const activityDates = new Set<string>();

    completedWorkouts.forEach((workout) => {
      const date = parseDate(workout.workout_date);

      if (date) {
        activityDates.add(
          formatDateKey(date)
        );
      }
    });

    attendance.forEach((record) => {
      const date = parseDate(record.date);

      if (date) {
        activityDates.add(
          formatDateKey(date)
        );
      }
    });

    if (activityDates.size === 0) {
      return 0;
    }

    let streak = 0;
    const current = new Date();

    current.setHours(0, 0, 0, 0);

    /*
     * If there is no activity today, allow the streak
     * to begin from yesterday.
     */
    if (
      !activityDates.has(
        formatDateKey(current)
      )
    ) {
      current.setDate(
        current.getDate() - 1
      );
    }

    while (
      activityDates.has(
        formatDateKey(current)
      )
    ) {
      streak += 1;

      current.setDate(
        current.getDate() - 1
      );
    }

    return streak;
  }, [completedWorkouts, attendance]);

  /* ======================================================
     OVERALL AI ACTIVITY SCORE
  ====================================================== */

  const overallScore = useMemo(() => {
    const workoutScore =
      consistencyScore;

    const attendanceComponent =
      attendanceScore;

    const goalScore =
      goals.length > 0
        ? goalCompletion
        : 50;

    const recentActivityScore =
      Math.min(
        100,
        Math.round(
          (recentWorkoutCount / 4) * 100
        )
      );

    return Math.round(
      (
        workoutScore +
        attendanceComponent +
        goalScore +
        recentActivityScore
      ) / 4
    );
  }, [
    consistencyScore,
    attendanceScore,
    goalCompletion,
    recentWorkoutCount,
    goals.length,
  ]);

  /* ======================================================
     PERSONALIZED RECOMMENDATION
  ====================================================== */

  const recommendation = useMemo(() => {
    return generateRecommendation({
      weeklyWorkouts: weeklyWorkoutCount,
      recentWorkouts: recentWorkoutCount,
      consistency: consistencyScore,
      attendance: attendanceCount,
      attendanceScore,
      goalCompletion,
      activeGoals: activeGoals.length,
      completedGoals: completedGoals.length,
      primaryGoal,
      weeklyMinutes: weeklyWorkoutMinutes,
      activityStreak,
    });
  }, [
    weeklyWorkoutCount,
    recentWorkoutCount,
    consistencyScore,
    attendanceCount,
    attendanceScore,
    goalCompletion,
    activeGoals.length,
    completedGoals.length,
    primaryGoal,
    weeklyWorkoutMinutes,
    activityStreak,
  ]);

  /* ======================================================
     SUGGESTED ACTIONS
  ====================================================== */

  const suggestions = useMemo(() => {
    return generateSuggestions({
      weeklyWorkouts: weeklyWorkoutCount,
      attendance: attendanceCount,
      consistency: consistencyScore,
      goalCompletion,
      activeGoals: activeGoals.length,
      completedGoals: completedGoals.length,
      primaryGoal,
      weeklyMinutes: weeklyWorkoutMinutes,
      activityStreak,
    });
  }, [
    weeklyWorkoutCount,
    attendanceCount,
    consistencyScore,
    goalCompletion,
    activeGoals.length,
    completedGoals.length,
    primaryGoal,
    weeklyWorkoutMinutes,
    activityStreak,
  ]);

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
        {/* =================================================
            HEADER
        ================================================= */}

        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
          >
            <Text style={styles.backButton}>
              ‹ Back
            </Text>
          </Pressable>

          <Text style={styles.headerTitle}>
            AI Coach
          </Text>

          <Pressable
            onPress={loadAIData}
          >
            <Text style={styles.refreshButton}>
              ↻
            </Text>
          </Pressable>
        </View>

        {/* =================================================
            AI HERO
        ================================================= */}

        <View style={styles.aiHero}>
          <View style={styles.aiCircle}>
            <Text style={styles.aiCircleText}>
              AI
            </Text>
          </View>

          <Text style={styles.heroTitle}>
            Your Personal Fitness Companion
          </Text>

          <Text style={styles.heroText}>
            Hi {firstName}! FitTrack AI analyzes
            your workout frequency, attendance,
            workout duration, consistency, goals,
            and recent activity to generate
            personalized fitness suggestions.
          </Text>
        </View>

        {loading ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator
              size="large"
              color="#28705D"
            />

            <Text style={styles.loadingText}>
              Analyzing your fitness activity...
            </Text>
          </View>
        ) : (
          <>
            {/* =================================================
                CURRENT ANALYSIS
            ================================================= */}

            <Text style={styles.sectionTitle}>
              Your Current Activity
            </Text>

            <View style={styles.analysisCard}>
              <AnalysisRow
                label="Workouts This Week"
                value={`${weeklyWorkoutCount} workout${
                  weeklyWorkoutCount === 1
                    ? ''
                    : 's'
                }`}
              />

              <AnalysisRow
                label="Weekly Workout Time"
                value={`${weeklyWorkoutMinutes} min`}
              />

              <AnalysisRow
                label="Workout Consistency"
                value={`${consistencyScore}%`}
              />

              <AnalysisRow
                label="Gym Attendance"
                value={`${attendanceCount} visit${
                  attendanceCount === 1
                    ? ''
                    : 's'
                }`}
              />

              <AnalysisRow
                label="Goal Progress"
                value={`${goalCompletion}%`}
              />

              <AnalysisRow
                label="Activity Streak"
                value={`${activityStreak} day${
                  activityStreak === 1
                    ? ''
                    : 's'
                }`}
              />

              <AnalysisRow
                label="Overall Activity"
                value={`${overallScore}%`}
                last
              />
            </View>

            {/* =================================================
                GOAL FOCUS
            ================================================= */}

            {primaryGoal && (
              <>
                <Text style={styles.sectionTitle}>
                  Current Goal Focus
                </Text>

                <View style={styles.goalFocusCard}>
                  <View style={styles.goalFocusIcon}>
                    <Text style={styles.goalFocusIconText}>
                      🎯
                    </Text>
                  </View>

                  <View style={styles.goalFocusContent}>
                    <Text style={styles.goalFocusTitle}>
                      {primaryGoal.title}
                    </Text>

                    <Text style={styles.goalFocusText}>
                      {getGoalTypeLabel(
                        primaryGoal.goal_type
                      )}
                    </Text>

                    <View style={styles.goalProgressTrack}>
                      <View
                        style={[
                          styles.goalProgressFill,
                          {
                            width: `${getGoalPercentage(
                              primaryGoal
                            )}%`,
                          },
                        ]}
                      />
                    </View>

                    <Text style={styles.goalProgressText}>
                      {getGoalPercentage(
                        primaryGoal
                      )}% completed
                    </Text>
                  </View>
                </View>
              </>
            )}

            {/* =================================================
                PERSONALIZED RECOMMENDATION
            ================================================= */}

            <Text style={styles.sectionTitle}>
              Personalized Recommendation
            </Text>

            <View style={styles.recommendationCard}>
              <View style={styles.recommendationHeader}>
                <Text
                  style={
                    styles.recommendationIcon
                  }
                >
                  {recommendation.icon}
                </Text>

                <View
                  style={
                    styles.recommendationHeaderText
                  }
                >
                  <Text
                    style={
                      styles.recommendationTitle
                    }
                  >
                    {recommendation.title}
                  </Text>

                  <Text
                    style={
                      styles.recommendationSubtitle
                    }
                  >
                    Based on your recorded fitness behavior
                  </Text>
                </View>
              </View>

              <Text
                style={styles.recommendationText}
              >
                {recommendation.text}
              </Text>
            </View>

            {/* =================================================
                SUGGESTED ACTIONS
            ================================================= */}

            <Text style={styles.sectionTitle}>
              Suggested Actions
            </Text>

            {suggestions.map(
              (suggestion, index) => (
                <SuggestionCard
                  key={`${suggestion.title}-${index}`}
                  number={String(index + 1)}
                  title={suggestion.title}
                  description={
                    suggestion.description
                  }
                />
              )
            )}

            {/* =================================================
                ACTIVITY DETAILS
            ================================================= */}

            <Text style={styles.sectionTitle}>
              Activity Details
            </Text>

            <View style={styles.analysisCard}>
              <AnalysisRow
                label="Recent 7-Day Workouts"
                value={`${recentWorkoutCount}`}
              />

              <AnalysisRow
                label="Weekly Calories"
                value={`${Math.round(
                  weeklyCalories
                )} kcal`}
              />

              <AnalysisRow
                label="Total Workout Time"
                value={`${totalWorkoutMinutes} min`}
              />

              <AnalysisRow
                label="Total Calories"
                value={`${Math.round(
                  totalCalories
                )} kcal`}
              />

              <AnalysisRow
                label="Active Goals"
                value={`${activeGoals.length}`}
              />

              <AnalysisRow
                label="Completed Goals"
                value={`${completedGoals.length}`}
                last
              />
            </View>

            {/* =================================================
                SCORE
            ================================================= */}

            <Text style={styles.sectionTitle}>
              AI Activity Score
            </Text>

            <View style={styles.scoreCard}>
              <View style={styles.scoreCircle}>
                <Text style={styles.scoreNumber}>
                  {overallScore}
                </Text>

                <Text style={styles.scoreLabel}>
                  / 100
                </Text>
              </View>

              <View style={styles.scoreInfo}>
                <Text style={styles.scoreTitle}>
                  Current Fitness Activity
                </Text>

                <Text style={styles.scoreText}>
                  The score combines workout consistency,
                  recent activity, attendance, and recorded
                  goal progress. It is designed to help
                  identify areas that may need attention.
                </Text>
              </View>
            </View>

            {/* =================================================
                MOTIVATION
            ================================================= */}

            <View style={styles.motivationCard}>
              <Text style={styles.motivationTitle}>
                🔥 Keep Going!
              </Text>

              <Text style={styles.motivationText}>
                {getMotivation(
                  weeklyWorkoutCount,
                  consistencyScore,
                  attendanceCount,
                  overallScore,
                  activityStreak,
                  goalCompletion
                )}
              </Text>
            </View>
          </>
        )}

        <Text style={styles.footer}>
          FitTrack AI • Personalized Fitness
          Recommendations
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

/* =========================================================
   ANALYSIS ROW
========================================================= */

function AnalysisRow({
  label,
  value,
  last = false,
}: {
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <View
      style={[
        styles.analysisRow,
        last && styles.analysisRowLast,
      ]}
    >
      <Text style={styles.analysisLabel}>
        {label}
      </Text>

      <Text style={styles.analysisValue}>
        {value}
      </Text>
    </View>
  );
}

/* =========================================================
   SUGGESTION CARD
========================================================= */

function SuggestionCard({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <View style={styles.suggestionCard}>
      <View style={styles.numberCircle}>
        <Text style={styles.numberText}>
          {number}
        </Text>
      </View>

      <View style={styles.suggestionContent}>
        <Text style={styles.suggestionTitle}>
          {title}
        </Text>

        <Text
          style={styles.suggestionDescription}
        >
          {description}
        </Text>
      </View>
    </View>
  );
}

/* =========================================================
   AI RECOMMENDATION ENGINE
========================================================= */

function generateRecommendation({
  weeklyWorkouts,
  recentWorkouts,
  consistency,
  attendance,
  attendanceScore,
  goalCompletion,
  activeGoals,
  completedGoals,
  primaryGoal,
  weeklyMinutes,
  activityStreak,
}: {
  weeklyWorkouts: number;
  recentWorkouts: number;
  consistency: number;
  attendance: number;
  attendanceScore: number;
  goalCompletion: number;
  activeGoals: number;
  completedGoals: number;
  primaryGoal: Goal | null;
  weeklyMinutes: number;
  activityStreak: number;
}): Recommendation {
  /* ---------------------------------------------------------
     CASE 1: No activity
  --------------------------------------------------------- */

  if (
    weeklyWorkouts === 0 &&
    attendance === 0 &&
    recentWorkouts === 0
  ) {
    return {
      icon: '🚀',
      title: 'Start Your Fitness Routine',
      text:
        'No recent workout or attendance activity has been recorded. Start with a manageable gym visit and log your first workout. As more activities are recorded, FitTrack AI can identify your activity patterns and provide more personalized recommendations.',
    };
  }

  /* ---------------------------------------------------------
     CASE 2: No workouts but gym attendance exists
  --------------------------------------------------------- */

  if (
    weeklyWorkouts === 0 &&
    attendance > 0
  ) {
    return {
      icon: '🏋️',
      title: 'Turn Gym Visits Into Workouts',
      text:
        `You have ${attendance} recorded gym visit${
          attendance === 1
            ? ''
            : 's'
        }, but no completed workout has been recorded this week. Try logging your workout sessions so FitTrack AI can better understand your exercise pattern and progress.`,
    };
  }

  /* ---------------------------------------------------------
     CASE 3: Very low consistency
  --------------------------------------------------------- */

  if (consistency < 50) {
    return {
      icon: '📈',
      title: 'Build Workout Consistency',
      text:
        `You currently have ${weeklyWorkouts} workout${
          weeklyWorkouts === 1
            ? ''
            : 's'
        } this week. Instead of making a sudden large increase, gradually work toward a regular weekly routine and continue recording each completed session.`,
    };
  }

  /* ---------------------------------------------------------
     CASE 4: Low attendance
  --------------------------------------------------------- */

  if (
    attendanceScore < 50 &&
    weeklyWorkouts > 0
  ) {
    return {
      icon: '📅',
      title: 'Maintain Regular Gym Visits',
      text:
        `Your workout activity is being recorded, but you have only ${attendance} gym visit${
          attendance === 1
            ? ''
            : 's'
        } in your attendance history. Maintaining regular gym visits can help support a more consistent fitness routine.`,
    };
  }

  /* ---------------------------------------------------------
     CASE 5: Goal progress is low
  --------------------------------------------------------- */

  if (
    activeGoals > 0 &&
    goalCompletion < 50
  ) {
    const goalName =
      primaryGoal?.title ||
      'your active fitness goal';

    return {
      icon: '🎯',
      title: 'Focus on Your Fitness Goal',
      text:
        `Your recorded goal progress is currently ${goalCompletion}%. Your active goal "${goalName}" should be a useful focus while you continue logging workouts and updating your progress.`,
    };
  }

  /* ---------------------------------------------------------
     CASE 6: Goal almost complete
  --------------------------------------------------------- */

  if (
    activeGoals > 0 &&
    goalCompletion >= 80 &&
    goalCompletion < 100
  ) {
    return {
      icon: '🏆',
      title: 'You Are Close to a Goal',
      text:
        `Your recorded goal progress is ${goalCompletion}%. You are approaching completion of your active goal. Continue with your current routine and keep your progress records updated.`,
    };
  }

  /* ---------------------------------------------------------
     CASE 7: Good workout volume but low duration
  --------------------------------------------------------- */

  if (
    weeklyWorkouts >= 3 &&
    weeklyMinutes < 90
  ) {
    return {
      icon: '⏱️',
      title: 'Build Sustainable Workout Time',
      text:
        `You have completed ${weeklyWorkouts} workouts this week, but your recorded workout time is ${weeklyMinutes} minutes. Focus on maintaining consistent sessions and gradually building workout duration according to your fitness level.`,
    };
  }

  /* ---------------------------------------------------------
     CASE 8: Strong consistency
  --------------------------------------------------------- */

  if (
    weeklyWorkouts >= 4 &&
    consistency >= 100 &&
    activityStreak >= 3
  ) {
    return {
      icon: '💪',
      title: 'Maintain Your Strong Routine',
      text:
        `You have completed ${weeklyWorkouts} workouts this week and maintained an activity streak of ${activityStreak} day${
          activityStreak === 1
            ? ''
            : 's'
        }. Continue your current routine while allowing enough recovery between sessions.`,
    };
  }

  /* ---------------------------------------------------------
     CASE 9: Completed goals
  --------------------------------------------------------- */

  if (
    completedGoals > 0 &&
    activeGoals === 0
  ) {
    return {
      icon: '🏆',
      title: 'Set Your Next Fitness Target',
      text:
        `You have completed ${completedGoals} fitness goal${
          completedGoals === 1
            ? ''
            : 's'
        } and currently have no active goals. Consider creating another realistic goal so FitTrack AI can continue monitoring your progress.`,
    };
  }

  /* ---------------------------------------------------------
     CASE 10: Default positive recommendation
  --------------------------------------------------------- */

  return {
    icon: '💡',
    title: 'Keep Building Consistency',
    text:
      `Your recent activity shows positive progress with ${weeklyWorkouts} workout${
        weeklyWorkouts === 1
          ? ''
          : 's'
      } this week. Continue logging workouts, maintaining gym attendance, and updating your fitness goals so FitTrack AI can continue learning from your activity history.`,
  };
}

/* =========================================================
   SUGGESTIONS
========================================================= */

function generateSuggestions({
  weeklyWorkouts,
  attendance,
  consistency,
  goalCompletion,
  activeGoals,
  completedGoals,
  primaryGoal,
  weeklyMinutes,
  activityStreak,
}: {
  weeklyWorkouts: number;
  attendance: number;
  consistency: number;
  goalCompletion: number;
  activeGoals: number;
  completedGoals: number;
  primaryGoal: Goal | null;
  weeklyMinutes: number;
  activityStreak: number;
}): Suggestion[] {
  const suggestions: Suggestion[] = [];

  /* ---------------------------------------------------------
     Workout suggestion
  --------------------------------------------------------- */

  if (weeklyWorkouts === 0) {
    suggestions.push({
      title: 'Log Your First Workout',
      description:
        'Start recording completed workout sessions so FitTrack AI can identify your activity pattern.',
    });
  } else if (weeklyWorkouts < 4) {
    suggestions.push({
      title: 'Work Toward Four Weekly Workouts',
      description:
        `You currently have ${weeklyWorkouts} workout${
          weeklyWorkouts === 1
            ? ''
            : 's'
        } this week. Gradually build a consistent weekly routine.`,
    });
  } else {
    suggestions.push({
      title: 'Maintain Your Weekly Routine',
      description:
        'Continue recording workouts consistently while allowing appropriate recovery between sessions.',
    });
  }

  /* ---------------------------------------------------------
     Attendance suggestion
  --------------------------------------------------------- */

  if (attendance < 4) {
    suggestions.push({
      title: 'Maintain Gym Attendance',
      description:
        'Continue recording gym visits so FitTrack AI can monitor your attendance pattern together with your workouts.',
    });
  } else {
    suggestions.push({
      title: 'Keep Attendance Consistent',
      description:
        'Your attendance history is providing a useful activity pattern. Continue maintaining regular gym visits.',
    });
  }

  /* ---------------------------------------------------------
     Goal suggestion
  --------------------------------------------------------- */

  if (
    activeGoals > 0 &&
    goalCompletion < 70
  ) {
    suggestions.push({
      title: 'Work on Your Active Goal',
      description:
        `Your current goal progress is ${goalCompletion}%. Continue recording progress toward ${
          primaryGoal?.title ||
          'your active goal'
        }.`,
    });
  } else if (
    activeGoals > 0 &&
    goalCompletion >= 70
  ) {
    suggestions.push({
      title: 'Finish Your Current Goal',
      description:
        `Your goals are already ${goalCompletion}% complete. Keep tracking your progress and work toward the remaining target.`,
    });
  } else if (completedGoals > 0) {
    suggestions.push({
      title: 'Create a New Fitness Goal',
      description:
        `You have completed ${completedGoals} goal${
          completedGoals === 1
            ? ''
            : 's'
        }. Consider setting another realistic target.`,
    });
  } else {
    suggestions.push({
      title: 'Create a Fitness Goal',
      description:
        'A measurable goal gives FitTrack AI another way to evaluate your progress and personalize recommendations.',
    });
  }

  /* ---------------------------------------------------------
     Replace one suggestion when consistency is weak
  --------------------------------------------------------- */

  if (
    consistency < 75 &&
    suggestions.length >= 3
  ) {
    suggestions[2] = {
      title: 'Improve Workout Consistency',
      description:
        'Focus on maintaining a regular weekly schedule rather than making large changes at once.',
    };
  }

  /* ---------------------------------------------------------
     Replace one suggestion when streak is strong
  --------------------------------------------------------- */

  if (
    activityStreak >= 3 &&
    weeklyMinutes >= 90 &&
    suggestions.length >= 3
  ) {
    suggestions[2] = {
      title: 'Protect Your Recovery',
      description:
        'Your recent activity is consistent. Continue progressing while allowing adequate recovery between demanding sessions.',
    };
  }

  return suggestions.slice(0, 3);
}

/* =========================================================
   MOTIVATION
========================================================= */

function getMotivation(
  weeklyWorkouts: number,
  consistency: number,
  attendance: number,
  overallScore: number,
  activityStreak: number,
  goalCompletion: number
): string {
  if (
    weeklyWorkouts === 0 &&
    attendance === 0
  ) {
    return 'Every fitness journey starts with one step. Record your first workout or gym visit and start building your activity history.';
  }

  if (
    overallScore >= 85 &&
    activityStreak >= 3
  ) {
    return `You are maintaining strong activity indicators and have a ${activityStreak}-day activity streak. Keep building on this consistency while giving your body enough recovery time.`;
  }

  if (
    goalCompletion >= 80 &&
    goalCompletion < 100
  ) {
    return 'You are close to completing your goal. Keep tracking your progress and stay consistent with your routine.';
  }

  if (consistency >= 75) {
    return 'Your workout consistency is developing well. Keep showing up, recording your activities, and working toward your goals.';
  }

  if (attendance >= 4) {
    return 'You are maintaining regular gym attendance. Pair that consistency with recorded workouts to keep progressing.';
  }

  return 'Consistency is built one workout at a time. Keep recording your activities and working toward your goals.';
}

/* =========================================================
   GOAL HELPERS
========================================================= */

function getGoalPercentage(
  goal: Goal
): number {
  if (
    typeof goal.percentage === 'number'
  ) {
    return Math.min(
      100,
      Math.max(0, Math.round(goal.percentage))
    );
  }

  if (
    typeof goal.progress_percentage ===
    'number'
  ) {
    return Math.min(
      100,
      Math.max(
        0,
        Math.round(
          goal.progress_percentage
        )
      )
    );
  }

  if (goal.status === 'completed') {
    return 100;
  }

  const target = Number(
    goal.target_value || 0
  );

  const current = Number(
    goal.current_value || 0
  );

  if (target <= 0) {
    return 0;
  }

  return Math.min(
    100,
    Math.max(
      0,
      Math.round(
        (current / target) * 100
      )
    )
  );
}

function getGoalTypeLabel(
  goalType?: string
): string {
  switch (goalType) {
    case 'weight_loss':
      return 'Weight Loss Goal';

    case 'muscle_gain':
      return 'Muscle Gain Goal';

    case 'strength':
      return 'Strength Goal';

    case 'endurance':
      return 'Endurance Goal';

    case 'consistency':
      return 'Workout Consistency Goal';

    case 'general':
      return 'General Fitness Goal';

    default:
      return 'Fitness Goal';
  }
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
    Number.isNaN(
      parsed.getTime()
    )
  ) {
    return null;
  }

  return parsed;
}

function getStartOfWeek(
  date: Date
): Date {
  const start = new Date(date);

  const currentDay =
    start.getDay();

  const mondayOffset =
    currentDay === 0
      ? -6
      : 1 - currentDay;

  start.setDate(
    start.getDate() +
      mondayOffset
  );

  start.setHours(
    0,
    0,
    0,
    0
  );

  return start;
}

function formatDateKey(
  date: Date
): string {
  const year =
    date.getFullYear();

  const month =
    String(
      date.getMonth() + 1
    ).padStart(2, '0');

  const day =
    String(
      date.getDate()
    ).padStart(2, '0');

  return `${year}-${month}-${day}`;
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

  aiHero: {
    backgroundColor: '#173F35',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 25,
  },

  aiCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#D9F2E7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
  },

  aiCircleText: {
    color: '#173F35',
    fontSize: 22,
    fontWeight: '900',
  },

  heroTitle: {
    color: '#FFFFFF',
    fontSize: 21,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 9,
  },

  heroText: {
    color: '#D7E7E1',
    fontSize: 12,
    lineHeight: 19,
    textAlign: 'center',
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

  sectionTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#1B2A26',
    marginBottom: 12,
    marginTop: 4,
  },

  analysisCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 18,
    elevation: 2,
    marginBottom: 25,
  },

  analysisRow: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#EDF1EF',
  },

  analysisRowLast: {
    borderBottomWidth: 0,
  },

  analysisLabel: {
    fontSize: 13,
    color: '#5F6C67',
    flex: 1,
  },

  analysisValue: {
    fontSize: 13,
    fontWeight: '800',
    color: '#28705D',
  },

  goalFocusCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 17,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 25,
    elevation: 2,
  },

  goalFocusIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E8F3EF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  goalFocusIconText: {
    fontSize: 23,
  },

  goalFocusContent: {
    flex: 1,
    marginLeft: 14,
  },

  goalFocusTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1B2A26',
  },

  goalFocusText: {
    fontSize: 11,
    color: '#6C7773',
    marginTop: 3,
    marginBottom: 9,
  },

  goalProgressTrack: {
    height: 7,
    backgroundColor: '#E8EFEC',
    borderRadius: 5,
    overflow: 'hidden',
  },

  goalProgressFill: {
    height: 7,
    backgroundColor: '#28705D',
    borderRadius: 5,
  },

  goalProgressText: {
    fontSize: 10,
    color: '#28705D',
    fontWeight: '700',
    marginTop: 5,
  },

  recommendationCard: {
    backgroundColor: '#E8F3EF',
    borderRadius: 17,
    padding: 19,
    marginBottom: 25,
  },

  recommendationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },

  recommendationIcon: {
    fontSize: 28,
  },

  recommendationHeaderText: {
    flex: 1,
    marginLeft: 12,
  },

  recommendationTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#173F35',
  },

  recommendationSubtitle: {
    fontSize: 11,
    color: '#6C7773',
    marginTop: 3,
  },

  recommendationText: {
    fontSize: 13,
    lineHeight: 21,
    color: '#40504A',
  },

  suggestionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 11,
    elevation: 2,
  },

  numberCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#173F35',
    alignItems: 'center',
    justifyContent: 'center',
  },

  numberText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },

  suggestionContent: {
    flex: 1,
    marginLeft: 12,
  },

  suggestionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1B2A26',
  },

  suggestionDescription: {
    fontSize: 11,
    lineHeight: 17,
    color: '#6C7773',
    marginTop: 3,
  },

  scoreCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 17,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    elevation: 2,
  },

  scoreCircle: {
    width: 95,
    height: 95,
    borderRadius: 48,
    borderWidth: 8,
    borderColor: '#8CC7B2',
    alignItems: 'center',
    justifyContent: 'center',
  },

  scoreNumber: {
    fontSize: 28,
    fontWeight: '900',
    color: '#173F35',
  },

  scoreLabel: {
    fontSize: 10,
    color: '#6C7773',
  },

  scoreInfo: {
    flex: 1,
    marginLeft: 18,
  },

  scoreTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1B2A26',
    marginBottom: 5,
  },

  scoreText: {
    fontSize: 11,
    lineHeight: 17,
    color: '#6C7773',
  },

  motivationCard: {
    backgroundColor: '#FFF5DD',
    borderRadius: 16,
    padding: 18,
    marginTop: 4,
    marginBottom: 25,
  },

  motivationTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#795C20',
    marginBottom: 7,
  },

  motivationText: {
    fontSize: 12,
    lineHeight: 19,
    color: '#6D5B35',
  },

  footer: {
    textAlign: 'center',
    color: '#8A9591',
    fontSize: 11,
  },
});