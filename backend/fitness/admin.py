from django.contrib import admin

from .models import (
    UserProfile,
    MembershipPlan,
    Membership,
    Payment,
    Attendance,
    WorkoutEventType,
    WorkoutType,
    IntensityLevelType,
    ExtraParticularEventType,
    TrainerList,
    Workout,
    WorkoutLog,
    FitnessGoal,
    ProgressRecord,
    AIRecommendation,
    Notification,
    WorkoutArchive,
    Feedback,
)


# =========================================================
# USER & MEMBERSHIP
# =========================================================

admin.site.register(UserProfile)
admin.site.register(MembershipPlan)
admin.site.register(Membership)
admin.site.register(Payment)


# =========================================================
# ATTENDANCE
# =========================================================

admin.site.register(Attendance)


# =========================================================
# WORKOUT
# =========================================================

admin.site.register(WorkoutEventType)
admin.site.register(WorkoutType)
admin.site.register(IntensityLevelType)
admin.site.register(ExtraParticularEventType)
admin.site.register(TrainerList)
admin.site.register(Workout)
admin.site.register(WorkoutLog)
admin.site.register(WorkoutArchive)


# =========================================================
# FITNESS & PROGRESS
# =========================================================

admin.site.register(FitnessGoal)
admin.site.register(ProgressRecord)


# =========================================================
# AI & NOTIFICATIONS
# =========================================================

admin.site.register(AIRecommendation)
admin.site.register(Notification)


# =========================================================
# FEEDBACK
# =========================================================

admin.site.register(Feedback)