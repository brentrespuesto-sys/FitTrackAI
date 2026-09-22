from django.db import models
from django.contrib.auth.models import User


# =========================================================
# USER PROFILE
# =========================================================

class UserProfile(models.Model):
    ROLE_CHOICES = [
        ('admin', 'Admin'),
        ('member', 'Member'),
        ('trainer', 'Trainer'),
    ]

    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='profile'
    )
    role = models.CharField(
        max_length=20,
        choices=ROLE_CHOICES,
        default='member'
    )
    phone = models.CharField(max_length=20, blank=True)
    date_of_birth = models.DateField(null=True, blank=True)
    address = models.TextField(blank=True)
    profile_picture = models.CharField(max_length=255, blank=True)

    def __str__(self):
        return f"{self.user.username} - {self.role}"


# =========================================================
# MEMBERSHIP
# =========================================================

class MembershipPlan(models.Model):
    PLAN_CHOICES = [
        ('monthly', 'Monthly'),
        ('quarterly', 'Quarterly'),
        ('annual', 'Annual'),
    ]

    name = models.CharField(max_length=100)
    plan_type = models.CharField(
        max_length=20,
        choices=PLAN_CHOICES
    )
    price = models.DecimalField(
        max_digits=10,
        decimal_places=2
    )
    duration_days = models.PositiveIntegerField()
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name


class Membership(models.Model):
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('expired', 'Expired'),
        ('pending', 'Pending'),
        ('cancelled', 'Cancelled'),
    ]

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='memberships'
    )
    plan = models.ForeignKey(
        MembershipPlan,
        on_delete=models.PROTECT,
        related_name='memberships'
    )
    start_date = models.DateField()
    end_date = models.DateField()
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='active'
    )

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.username} - {self.plan.name}"


# =========================================================
# PAYMENTS
# =========================================================

class Payment(models.Model):
    STATUS_CHOICES = [
        ('paid', 'Paid'),
        ('pending', 'Pending'),
        ('failed', 'Failed'),
    ]

    membership = models.ForeignKey(
        Membership,
        on_delete=models.CASCADE,
        related_name='payments'
    )
    amount = models.DecimalField(
        max_digits=10,
        decimal_places=2
    )
    payment_date = models.DateTimeField(auto_now_add=True)
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='pending'
    )
    reference_number = models.CharField(
        max_length=100,
        blank=True
    )

    def __str__(self):
        return f"{self.membership.user.username} - {self.amount}"


# =========================================================
# ATTENDANCE
# =========================================================

class Attendance(models.Model):
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='attendance_records'
    )
    date = models.DateField()
    check_in = models.TimeField()
    check_out = models.TimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-date', '-check_in']

    def __str__(self):
        return f"{self.user.username} - {self.date}"


# =========================================================
# WORKOUT REFERENCE TABLES
# =========================================================

class WorkoutEventType(models.Model):
    name = models.CharField(max_length=100)

    def __str__(self):
        return self.name


class WorkoutType(models.Model):
    name = models.CharField(max_length=100)

    def __str__(self):
        return self.name


class IntensityLevelType(models.Model):
    name = models.CharField(max_length=50)

    def __str__(self):
        return self.name


class ExtraParticularEventType(models.Model):
    name = models.CharField(max_length=100)

    def __str__(self):
        return self.name


class TrainerList(models.Model):
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='trainer'
    )
    specialization = models.CharField(
        max_length=150,
        blank=True
    )
    bio = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return self.user.get_full_name() or self.user.username


# =========================================================
# WORKOUTS
# =========================================================

class Workout(models.Model):
    name = models.CharField(max_length=150)

    event_type = models.ForeignKey(
        WorkoutEventType,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='workouts'
    )

    workout_type = models.ForeignKey(
        WorkoutType,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='workouts'
    )

    intensity_level = models.ForeignKey(
        IntensityLevelType,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='workouts'
    )

    extra_event_type = models.ForeignKey(
        ExtraParticularEventType,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='workouts'
    )

    trainer = models.ForeignKey(
        TrainerList,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='workouts'
    )

    schedule = models.DateTimeField()
    location = models.CharField(
        max_length=200,
        blank=True
    )
    cost = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0
    )
    equipment_needed = models.TextField(blank=True)
    description = models.TextField(blank=True)

    is_published = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name


# =========================================================
# WORKOUT LOG
# =========================================================

class WorkoutLog(models.Model):
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='workout_logs'
    )
    workout = models.ForeignKey(
        Workout,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='logs'
    )

    workout_date = models.DateField()
    duration_minutes = models.PositiveIntegerField(
        default=0
    )
    calories_burned = models.PositiveIntegerField(
        default=0
    )
    notes = models.TextField(blank=True)

    completed = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-workout_date']

    def __str__(self):
        return f"{self.user.username} - {self.workout_date}"


# =========================================================
# FITNESS GOALS
# =========================================================

class FitnessGoal(models.Model):
    GOAL_TYPES = [
        ('weight_loss', 'Weight Loss'),
        ('muscle_gain', 'Muscle Gain'),
        ('strength', 'Strength'),
        ('endurance', 'Endurance'),
        ('consistency', 'Workout Consistency'),
        ('general', 'General Fitness'),
    ]

    STATUS_CHOICES = [
        ('active', 'Active'),
        ('completed', 'Completed'),
        ('paused', 'Paused'),
    ]

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='fitness_goals'
    )

    goal_type = models.CharField(
        max_length=30,
        choices=GOAL_TYPES
    )

    title = models.CharField(max_length=150)
    description = models.TextField(blank=True)

    target_value = models.FloatField(
        null=True,
        blank=True
    )

    current_value = models.FloatField(
        default=0
    )

    start_date = models.DateField()
    target_date = models.DateField(
        null=True,
        blank=True
    )

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='active'
    )

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.username} - {self.title}"


# =========================================================
# PROGRESS
# =========================================================

class ProgressRecord(models.Model):
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='progress_records'
    )

    date = models.DateField()

    weight = models.FloatField(
        null=True,
        blank=True
    )

    workout_count = models.PositiveIntegerField(
        default=0
    )

    attendance_count = models.PositiveIntegerField(
        default=0
    )

    goal_completion_rate = models.FloatField(
        default=0
    )

    notes = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['date']

    def __str__(self):
        return f"{self.user.username} - {self.date}"


# =========================================================
# AI RECOMMENDATIONS
# =========================================================

class AIRecommendation(models.Model):
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='ai_recommendations'
    )

    recommendation = models.TextField()

    reason = models.TextField(blank=True)

    workout_frequency = models.FloatField(
        default=0
    )

    consistency_score = models.FloatField(
        default=0
    )

    goal_completion_rate = models.FloatField(
        default=0
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    is_read = models.BooleanField(
        default=False
    )

    def __str__(self):
        return f"AI Recommendation - {self.user.username}"


# =========================================================
# NOTIFICATIONS
# =========================================================

class Notification(models.Model):
    NOTIFICATION_TYPES = [
        ('motivation', 'Motivation'),
        ('reminder', 'Reminder'),
        ('membership', 'Membership'),
        ('workout', 'Workout'),
        ('goal', 'Goal'),
        ('system', 'System'),
    ]

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='notifications'
    )

    title = models.CharField(max_length=150)
    message = models.TextField()

    notification_type = models.CharField(
        max_length=30,
        choices=NOTIFICATION_TYPES,
        default='system'
    )

    is_read = models.BooleanField(default=False)

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    def __str__(self):
        return f"{self.title} - {self.user.username}"


# =========================================================
# WORKOUT ARCHIVE
# =========================================================

class WorkoutArchive(models.Model):
    original_workout = models.ForeignKey(
        Workout,
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )

    workout_name = models.CharField(
        max_length=150
    )

    archived_date = models.DateTimeField(
        auto_now_add=True
    )

    reason = models.CharField(
        max_length=255,
        blank=True
    )

    def __str__(self):
        return self.workout_name


# =========================================================
# FEEDBACK
# =========================================================

class Feedback(models.Model):
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='feedbacks'
    )

    workout = models.ForeignKey(
        Workout,
        on_delete=models.CASCADE,
        related_name='feedbacks'
    )

    rating = models.PositiveIntegerField(
        default=5
    )

    comment = models.TextField(
        blank=True
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    def __str__(self):
        return f"{self.user.username} - {self.rating}/5"