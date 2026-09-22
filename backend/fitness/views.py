from datetime import datetime, timedelta

from django.db.models import Q
from django.contrib.auth.models import User
from django.contrib.auth import authenticate
from django.utils import timezone

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from .models import (
    UserProfile,
    MembershipPlan,
    Membership,
    Payment,
    Attendance,
    Workout,
    WorkoutLog,
    FitnessGoal,
    Notification,
)


# ============================================================
# HELPER
# ============================================================

def get_user_response(user):
    profile, created = UserProfile.objects.get_or_create(
        user=user,
        defaults={"role": "member"}
    )

    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "role": profile.role,
        "phone": profile.phone,
        "date_of_birth": profile.date_of_birth,
        "address": profile.address,
        "profile_picture": profile.profile_picture,
    }


# ============================================================
# REGISTER
# ============================================================

class RegisterView(APIView):

    def post(self, request):
        username = request.data.get(
            "username",
            ""
        ).strip().lower()

        password = request.data.get(
            "password",
            ""
        )

        first_name = request.data.get(
            "first_name",
            ""
        ).strip()

        last_name = request.data.get(
            "last_name",
            ""
        ).strip()

        email = request.data.get(
            "email",
            ""
        ).strip().lower()

        if not username or not password:
            return Response(
                {
                    "error": (
                        "Username and password are required."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        if User.objects.filter(
            username=username
        ).exists():
            return Response(
                {
                    "error": "Username already exists."
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        user = User.objects.create_user(
            username=username,
            password=password,
            first_name=first_name,
            last_name=last_name,
            email=email,
        )

        UserProfile.objects.create(
            user=user,
            role="member"
        )

        return Response(
            {
                "message": "Registration successful.",
                "user": get_user_response(user),
            },
            status=status.HTTP_201_CREATED
        )


# ============================================================
# LOGIN
# ============================================================

class LoginView(APIView):

    def post(self, request):
        username = request.data.get(
            "username",
            ""
        ).strip().lower()

        password = request.data.get(
            "password",
            ""
        )

        if not username or not password:
            return Response(
                {
                    "error": (
                        "Username and password are required."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        user = authenticate(
            username=username,
            password=password
        )

        if user is None:
            return Response(
                {
                    "error": (
                        "Invalid username or password."
                    )
                },
                status=status.HTTP_401_UNAUTHORIZED
            )

        return Response({
            "message": "Login successful.",
            "user": get_user_response(user),
        })


# ============================================================
# UPDATE PROFILE
# ============================================================

class UpdateProfileView(APIView):

    def post(self, request):
        return self._update_profile(request)

    def patch(self, request):
        return self._update_profile(request)

    def _update_profile(self, request):

        username = request.data.get(
            "username",
            ""
        ).strip().lower()

        if not username:
            return Response(
                {
                    "error": "Username is required."
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            user = User.objects.get(
                username=username
            )
        except User.DoesNotExist:
            return Response(
                {
                    "error": "User not found."
                },
                status=status.HTTP_404_NOT_FOUND
            )

        profile, created = UserProfile.objects.get_or_create(
            user=user,
            defaults={"role": "member"}
        )

        if "first_name" in request.data:
            user.first_name = request.data.get(
                "first_name",
                ""
            ).strip()

        if "last_name" in request.data:
            user.last_name = request.data.get(
                "last_name",
                ""
            ).strip()

        if "email" in request.data:
            email = request.data.get(
                "email",
                ""
            ).strip().lower()

            if email:
                user.email = email

        user.save()

        if "phone" in request.data:
            profile.phone = request.data.get(
                "phone",
                ""
            ).strip()

        if "address" in request.data:
            profile.address = request.data.get(
                "address",
                ""
            ).strip()

        if "date_of_birth" in request.data:
            date_of_birth = request.data.get(
                "date_of_birth"
            )

            profile.date_of_birth = (
                date_of_birth
                if date_of_birth
                else None
            )

        if "profile_picture" in request.data:
            profile.profile_picture = request.data.get(
                "profile_picture",
                ""
            ).strip()

        profile.save()

        return Response({
            "message": (
                "Profile updated successfully."
            ),
            "user": get_user_response(user),
        })


# ============================================================
# CHANGE PASSWORD
# ============================================================

class ChangePasswordView(APIView):

    def post(self, request):
        username = request.data.get(
            "username",
            ""
        ).strip().lower()

        old_password = request.data.get(
            "old_password",
            ""
        )

        new_password = request.data.get(
            "new_password",
            ""
        )

        if (
            not username
            or not old_password
            or not new_password
        ):
            return Response(
                {
                    "error": (
                        "All password fields are required."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            user = User.objects.get(
                username=username
            )
        except User.DoesNotExist:
            return Response(
                {
                    "error": "User not found."
                },
                status=status.HTTP_404_NOT_FOUND
            )

        if not user.check_password(old_password):
            return Response(
                {
                    "error": (
                        "Current password is incorrect."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        user.set_password(new_password)
        user.save()

        return Response({
            "message": (
                "Password changed successfully."
            )
        })


# ============================================================
# MEMBERSHIP
# ============================================================

class MembershipView(APIView):

    def get(self, request):
        username = request.query_params.get(
            "username",
            ""
        ).strip().lower()

        if not username:
            return Response(
                {
                    "error": "Username is required."
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            user = User.objects.get(
                username=username
            )
        except User.DoesNotExist:
            return Response(
                {
                    "error": "User not found."
                },
                status=status.HTTP_404_NOT_FOUND
            )

        membership = (
            Membership.objects
            .filter(user=user)
            .select_related("plan")
            .order_by("-created_at")
            .first()
        )

        if not membership:
            return Response({
                "membership": None
            })

        today = timezone.localdate()

        if membership.end_date < today:

            if membership.status != "expired":
                membership.status = "expired"

                membership.save(
                    update_fields=["status"]
                )

            already_notified = (
                Notification.objects
                .filter(
                    user=user,
                    title="Membership Expired",
                    created_at__date=today
                )
                .exists()
            )

            if not already_notified:
                Notification.objects.create(
                    user=user,
                    title="Membership Expired",
                    message=(
                        "Your gym membership has expired. "
                        "Please renew your membership to continue "
                        "using the gym services."
                    ),
                    notification_type="membership",
                )

        elif membership.status == "active":

            days_remaining = (
                membership.end_date - today
            ).days

            if 0 <= days_remaining <= 7:

                if days_remaining == 0:
                    reminder_message = (
                        "Your gym membership expires today. "
                        "Please renew your membership to continue "
                        "your fitness journey."
                    )

                elif days_remaining == 1:
                    reminder_message = (
                        "Your gym membership expires tomorrow. "
                        "Consider renewing your membership soon."
                    )

                else:
                    reminder_message = (
                        f"Your gym membership expires in "
                        f"{days_remaining} days. "
                        "Consider renewing your membership soon."
                    )

                already_notified = (
                    Notification.objects
                    .filter(
                        user=user,
                        title="Membership Reminder",
                        created_at__date=today
                    )
                    .exists()
                )

                if not already_notified:
                    Notification.objects.create(
                        user=user,
                        title="Membership Reminder",
                        message=reminder_message,
                        notification_type="membership",
                    )

        payment = (
            Payment.objects
            .filter(membership=membership)
            .order_by("-payment_date")
            .first()
        )

        return Response({
            "membership": {
                "id": membership.id,
                "plan_name": membership.plan.name,
                "plan_type": membership.plan.plan_type,
                "price": float(
                    membership.plan.price
                ),
                "start_date": membership.start_date,
                "end_date": membership.end_date,
                "status": membership.status,
                "payment_status": (
                    payment.status
                    if payment
                    else "pending"
                ),
                "payment_amount": (
                    float(payment.amount)
                    if payment
                    else 0
                ),
                "payment_reference": (
                    payment.reference_number
                    if payment
                    else ""
                ),
            }
        })


# ============================================================
# MEMBER MEMBERSHIP PLAN SELECTION
# ============================================================

class MembershipPlansView(APIView):

    def get(self, request):

        plans = (
            MembershipPlan.objects
            .filter(is_active=True)
            .order_by("price")
        )

        return Response({
            "plans": [
                {
                    "id": plan.id,
                    "name": plan.name,
                    "plan_type": plan.plan_type,
                    "price": float(plan.price),
                    "duration_days": plan.duration_days,
                    "description": plan.description,
                    "is_active": plan.is_active,
                }
                for plan in plans
            ]
        })


class MembershipRequestView(APIView):

    def post(self, request):

        username = (
            request.data.get(
                "username",
                ""
            )
            .strip()
            .lower()
        )

        plan_id = request.data.get("plan_id")

        if not username:
            return Response(
                {
                    "error": "Username is required."
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        if not plan_id:
            return Response(
                {
                    "error": "Membership plan is required."
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            user = User.objects.get(
                username=username
            )
        except User.DoesNotExist:
            return Response(
                {
                    "error": "User not found."
                },
                status=status.HTTP_404_NOT_FOUND
            )

        try:
            plan = MembershipPlan.objects.get(
                id=plan_id,
                is_active=True
            )
        except MembershipPlan.DoesNotExist:
            return Response(
                {
                    "error": "Membership plan not found or inactive."
                },
                status=status.HTTP_404_NOT_FOUND
            )

        today = timezone.localdate()

        existing_membership = (
            Membership.objects
            .filter(user=user)
            .order_by("-created_at")
            .first()
        )

        if (
            existing_membership
            and existing_membership.status == "pending"
        ):
            return Response(
                {
                    "error": (
                        "You already have a pending "
                        "membership request."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        if (
            existing_membership
            and existing_membership.status == "active"
            and existing_membership.end_date >= today
        ):
            return Response(
                {
                    "error": (
                        "You already have an active membership. "
                        "You can request another plan after "
                        "your current membership expires."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        start_date = today
        end_date = today + timedelta(
            days=plan.duration_days
        )

        membership = Membership.objects.create(
            user=user,
            plan=plan,
            start_date=start_date,
            end_date=end_date,
            status="pending",
        )

        Payment.objects.create(
            membership=membership,
            amount=plan.price,
            status="pending",
            reference_number="",
        )

        Notification.objects.create(
            user=user,
            title="Membership Request Submitted",
            message=(
                f"Your request for the {plan.name} "
                f"membership plan has been submitted. "
                "Please wait for admin approval."
            ),
            notification_type="membership",
        )

        return Response(
            {
                "message": (
                    "Membership request submitted successfully."
                ),
                "membership": {
                    "id": membership.id,
                    "plan_name": plan.name,
                    "plan_type": plan.plan_type,
                    "price": float(plan.price),
                    "duration_days": plan.duration_days,
                    "start_date": membership.start_date,
                    "end_date": membership.end_date,
                    "status": membership.status,
                    "payment_status": "pending",
                },
            },
            status=status.HTTP_201_CREATED
        )


# ============================================================
# WORKOUT LOG
# ============================================================

class WorkoutLogView(APIView):

    def get(self, request):
        username = request.query_params.get(
            "username",
            ""
        ).strip().lower()

        if not username:
            return Response(
                {
                    "error": "Username is required."
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            user = User.objects.get(
                username=username
            )
        except User.DoesNotExist:
            return Response(
                {
                    "error": "User not found."
                },
                status=status.HTTP_404_NOT_FOUND
            )

        workouts = (
            WorkoutLog.objects
            .filter(user=user)
            .select_related("workout")
        )

        workout_list = []

        for workout in workouts:

            workout_list.append({
                "id": workout.id,
                "workout_name": (
                    workout.workout.name
                    if workout.workout
                    else "Workout"
                ),
                "workout_date": workout.workout_date,
                "duration_minutes": (
                    workout.duration_minutes
                ),
                "calories_burned": (
                    workout.calories_burned
                ),
                "notes": workout.notes,
                "completed": workout.completed,
            })

        return Response({
            "workouts": workout_list,
            "total_workouts": workouts.count(),
        })

    def post(self, request):
        username = request.data.get(
            "username",
            ""
        ).strip().lower()

        if not username:
            return Response(
                {
                    "error": "Username is required."
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            user = User.objects.get(
                username=username
            )
        except User.DoesNotExist:
            return Response(
                {
                    "error": "User not found."
                },
                status=status.HTTP_404_NOT_FOUND
            )

        workout_name = request.data.get(
            "workout_name",
            "Workout"
        ).strip()

        workout_date = request.data.get(
            "workout_date"
        )

        duration_minutes = request.data.get(
            "duration_minutes",
            0
        )

        calories_burned = request.data.get(
            "calories_burned",
            0
        )

        notes = request.data.get(
            "notes",
            ""
        )

        completed = request.data.get(
            "completed",
            True
        )

        if not workout_date:
            return Response(
                {
                    "error": (
                        "Workout date is required."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            duration_minutes = int(
                duration_minutes
            )

            calories_burned = int(
                calories_burned
            )

        except (TypeError, ValueError):

            return Response(
                {
                    "error": (
                        "Duration and calories must be numbers."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        workout = (
            Workout.objects
            .filter(
                name__iexact=workout_name
            )
            .first()
        )

        if not workout:
            workout = Workout.objects.create(
                name=workout_name,
                description=(
                    "Workout logged by member."
                ),
                is_published=True,
                schedule=timezone.now(),
            )

        workout_log = WorkoutLog.objects.create(
            user=user,
            workout=workout,
            workout_date=workout_date,
            duration_minutes=duration_minutes,
            calories_burned=calories_burned,
            notes=notes,
            completed=completed,
        )

        Notification.objects.create(
            user=user,
            title="Workout Completed",
            message=(
                f"Great job, "
                f"{user.first_name or user.username}! "
                f"Your {workout_name} workout has been "
                "successfully recorded. Keep up the consistency!"
            ),
            notification_type="workout",
        )

        return Response(
            {
                "message": (
                    "Workout logged successfully."
                ),
                "workout": {
                    "id": workout_log.id,
                    "workout_name": workout_name,
                    "workout_date": (
                        workout_log.workout_date
                    ),
                    "duration_minutes": (
                        workout_log.duration_minutes
                    ),
                    "calories_burned": (
                        workout_log.calories_burned
                    ),
                    "notes": workout_log.notes,
                    "completed": workout_log.completed,
                },
            },
            status=status.HTTP_201_CREATED
        )


# ============================================================
# ATTENDANCE
# ============================================================

class AttendanceView(APIView):

    def get(self, request):
        username = request.query_params.get(
            "username",
            ""
        ).strip().lower()

        if not username:
            return Response(
                {
                    "error": "Username is required."
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            user = User.objects.get(
                username=username
            )
        except User.DoesNotExist:
            return Response(
                {
                    "error": "User not found."
                },
                status=status.HTTP_404_NOT_FOUND
            )

        records = (
            Attendance.objects
            .filter(user=user)
            .order_by(
                "-date",
                "-check_in"
            )
        )

        attendance_list = []

        for record in records:
            attendance_list.append({
                "id": record.id,
                "date": record.date,
                "check_in": record.check_in,
                "check_out": record.check_out,
            })

        return Response({
            "attendance": attendance_list,
            "total_attendance": records.count(),
        })

    def post(self, request):
        username = request.data.get(
            "username",
            ""
        ).strip().lower()

        if not username:
            return Response(
                {
                    "error": "Username is required."
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            user = User.objects.get(
                username=username
            )
        except User.DoesNotExist:
            return Response(
                {
                    "error": "User not found."
                },
                status=status.HTTP_404_NOT_FOUND
            )

        today = timezone.localdate()
        current_time = timezone.localtime().time()

        existing = (
            Attendance.objects
            .filter(
                user=user,
                date=today
            )
            .order_by("-id")
            .first()
        )

        if existing:
            return Response(
                {
                    "error": (
                        "You have already checked in today. "
                        "Only one attendance record is allowed "
                        "per day."
                    ),
                    "attendance": {
                        "id": existing.id,
                        "date": existing.date,
                        "check_in": existing.check_in,
                        "check_out": existing.check_out,
                    },
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        attendance = Attendance.objects.create(
            user=user,
            date=today,
            check_in=current_time,
        )

        Notification.objects.create(
            user=user,
            title="Attendance Recorded",
            message=(
                f"Welcome back, "
                f"{user.first_name or user.username}! "
                "Your gym check-in has been recorded successfully."
            ),
            notification_type="reminder",
        )

        return Response(
            {
                "message": (
                    "Check-in recorded successfully."
                ),
                "attendance": {
                    "id": attendance.id,
                    "date": attendance.date,
                    "check_in": attendance.check_in,
                    "check_out": attendance.check_out,
                },
            },
            status=status.HTTP_201_CREATED
        )

    def patch(self, request):
        username = request.data.get(
            "username",
            ""
        ).strip().lower()

        attendance_id = request.data.get(
            "attendance_id"
        )

        if not username:
            return Response(
                {
                    "error": "Username is required."
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        if not attendance_id:
            return Response(
                {
                    "error": "Attendance ID is required."
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            user = User.objects.get(
                username=username
            )
        except User.DoesNotExist:
            return Response(
                {
                    "error": "User not found."
                },
                status=status.HTTP_404_NOT_FOUND
            )

        try:
            attendance = Attendance.objects.get(
                id=int(attendance_id),
                user=user
            )
        except (Attendance.DoesNotExist, ValueError, TypeError):
            return Response(
                {
                    "error": "Attendance record not found."
                },
                status=status.HTTP_404_NOT_FOUND
            )

        if attendance.check_out:
            return Response(
                {
                    "error": "You have already checked out for this attendance."
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        current_time = timezone.localtime().time()

        attendance.check_out = current_time
        attendance.save(update_fields=["check_out"])

        Notification.objects.create(
            user=user,
            title="Attendance Completed",
            message=(
                f"Great job, "
                f"{user.first_name or user.username}! "
                "Your check-out has been recorded successfully."
            ),
            notification_type="reminder",
        )

        return Response(
            {
                "message": (
                    "Check-out recorded successfully."
                ),
                "attendance": {
                    "id": attendance.id,
                    "date": attendance.date,
                    "check_in": attendance.check_in,
                    "check_out": attendance.check_out,
                },
            },
            status=status.HTTP_200_OK
        )


# ============================================================
# FITNESS GOALS
# ============================================================

class FitnessGoalView(APIView):

    def get(self, request):
        username = request.query_params.get(
            "username",
            ""
        ).strip().lower()

        if not username:
            return Response(
                {
                    "error": "Username is required."
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            user = User.objects.get(
                username=username
            )
        except User.DoesNotExist:
            return Response(
                {
                    "error": "User not found."
                },
                status=status.HTTP_404_NOT_FOUND
            )

        goals = (
            FitnessGoal.objects
            .filter(user=user)
            .order_by("-created_at")
        )

        goal_list = []

        for goal in goals:

            if (
                goal.target_value
                and goal.target_value > 0
            ):
                percentage = (
                    goal.current_value /
                    goal.target_value
                ) * 100
            else:
                percentage = 0

            percentage = max(
                0,
                min(100, percentage)
            )

            goal_list.append({
                "id": goal.id,
                "goal_type": goal.goal_type,
                "title": goal.title,
                "description": goal.description,
                "target_value": goal.target_value,
                "current_value": goal.current_value,
                "start_date": goal.start_date,
                "target_date": goal.target_date,
                "status": goal.status,
                "percentage": round(
                    percentage,
                    1
                ),
            })

        return Response({
            "goals": goal_list
        })

    def post(self, request):
        username = request.data.get(
            "username",
            ""
        ).strip().lower()

        if not username:
            return Response(
                {
                    "error": "Username is required."
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            user = User.objects.get(
                username=username
            )
        except User.DoesNotExist:
            return Response(
                {
                    "error": "User not found."
                },
                status=status.HTTP_404_NOT_FOUND
            )

        title = request.data.get(
            "title",
            ""
        ).strip()

        goal_type = request.data.get(
            "goal_type",
            "general"
        )

        description = request.data.get(
            "description",
            ""
        ).strip()

        target_value = request.data.get(
            "target_value"
        )

        current_value = request.data.get(
            "current_value",
            0
        )

        start_date = request.data.get(
            "start_date"
        )

        target_date = request.data.get(
            "target_date"
        )

        if not title:
            return Response(
                {
                    "error": (
                        "Goal title is required."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        if not start_date:
            start_date = timezone.localdate()

        goal = FitnessGoal.objects.create(
            user=user,
            goal_type=goal_type,
            title=title,
            description=description,
            target_value=target_value,
            current_value=current_value,
            start_date=start_date,
            target_date=target_date or None,
            status="active",
        )

        Notification.objects.create(
            user=user,
            title="New Fitness Goal",
            message=(
                f"Your goal '{title}' has been created "
                "successfully. Stay consistent and keep "
                "working toward it!"
            ),
            notification_type="goal",
        )

        return Response(
            {
                "message": (
                    "Fitness goal created successfully."
                ),
                "goal": {
                    "id": goal.id,
                    "goal_type": goal.goal_type,
                    "title": goal.title,
                    "description": goal.description,
                    "target_value": goal.target_value,
                    "current_value": goal.current_value,
                    "start_date": goal.start_date,
                    "target_date": goal.target_date,
                    "status": goal.status,
                },
            },
            status=status.HTTP_201_CREATED
        )

    def patch(self, request):
        username = request.data.get(
            "username",
            ""
        ).strip().lower()

        goal_id = request.data.get(
            "goal_id"
        )

        if not username:
            return Response(
                {
                    "error": "Username is required."
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        if not goal_id:
            return Response(
                {
                    "error": "Goal ID is required."
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            user = User.objects.get(
                username=username
            )
        except User.DoesNotExist:
            return Response(
                {
                    "error": "User not found."
                },
                status=status.HTTP_404_NOT_FOUND
            )

        try:
            goal = FitnessGoal.objects.get(
                id=goal_id,
                user=user
            )
        except FitnessGoal.DoesNotExist:
            return Response(
                {
                    "error": (
                        "Fitness goal not found or does not "
                        "belong to this user."
                    )
                },
                status=status.HTTP_404_NOT_FOUND
            )

        new_status = request.data.get(
            "status",
            goal.status
        )

        if new_status == "completed":

            was_already_completed = (
                goal.status == "completed"
            )

            goal.status = "completed"

            if goal.target_value is not None:
                goal.current_value = (
                    goal.target_value
                )

            goal.save(
                update_fields=[
                    "status",
                    "current_value"
                ]
            )

            if not was_already_completed:

                Notification.objects.create(
                    user=user,
                    title="Goal Completed",
                    message=(
                        f"Congratulations, "
                        f"{user.first_name or user.username}! "
                        f"You completed your goal "
                        f"'{goal.title}'. Keep up the great work!"
                    ),
                    notification_type="goal",
                )

        elif "current_value" in request.data:

            try:
                goal.current_value = float(
                    request.data.get(
                        "current_value"
                    )
                )

            except (TypeError, ValueError):

                return Response(
                    {
                        "error": (
                            "Current value must be a number."
                        )
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )

            if (
                goal.target_value is not None
                and goal.current_value >= goal.target_value
            ):

                goal.current_value = (
                    goal.target_value
                )

                goal.status = "completed"

                goal.save(
                    update_fields=[
                        "current_value",
                        "status"
                    ]
                )

                if not Notification.objects.filter(
                    user=user,
                    title="Goal Completed",
                    message__icontains=goal.title
                ).exists():

                    Notification.objects.create(
                        user=user,
                        title="Goal Completed",
                        message=(
                            f"Congratulations, "
                            f"{user.first_name or user.username}! "
                            f"You completed your goal "
                            f"'{goal.title}'. Keep up the great work!"
                        ),
                        notification_type="goal",
                    )

            else:

                goal.save(
                    update_fields=[
                        "current_value"
                    ]
                )

        else:

            return Response(
                {
                    "error": (
                        "No valid goal update was provided."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        if (
            goal.target_value
            and goal.target_value > 0
        ):

            percentage = (
                goal.current_value /
                goal.target_value
            ) * 100

        else:
            percentage = 0

        percentage = max(
            0,
            min(100, percentage)
        )

        return Response({
            "message": (
                "Fitness goal updated successfully."
            ),
            "goal": {
                "id": goal.id,
                "goal_type": goal.goal_type,
                "title": goal.title,
                "description": goal.description,
                "target_value": goal.target_value,
                "current_value": goal.current_value,
                "start_date": goal.start_date,
                "target_date": goal.target_date,
                "status": goal.status,
                "percentage": round(
                    percentage,
                    1
                ),
            },
        })


# ============================================================
# NOTIFICATIONS
# ============================================================

class NotificationView(APIView):

    def get(self, request):
        username = request.query_params.get(
            "username",
            ""
        ).strip().lower()

        if not username:
            return Response(
                {
                    "error": "Username is required."
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            user = User.objects.get(
                username=username
            )
        except User.DoesNotExist:
            return Response(
                {
                    "error": "User not found."
                },
                status=status.HTTP_404_NOT_FOUND
            )

        notifications = (
            Notification.objects
            .filter(user=user)
            .order_by("-created_at")
        )

        notification_list = []

        for notification in notifications:

            notification_list.append({
                "id": notification.id,
                "title": notification.title,
                "message": notification.message,
                "notification_type": (
                    notification.notification_type
                ),
                "is_read": notification.is_read,
                "created_at": (
                    notification.created_at.isoformat()
                ),
            })

        return Response({
            "notifications": notification_list,
            "unread_count": notifications.filter(
                is_read=False
            ).count(),
        })

    def post(self, request):
        username = request.data.get(
            "username",
            ""
        ).strip().lower()

        if not username:
            return Response(
                {
                    "error": "Username is required."
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            user = User.objects.get(
                username=username
            )
        except User.DoesNotExist:
            return Response(
                {
                    "error": "User not found."
                },
                status=status.HTTP_404_NOT_FOUND
            )

        title = request.data.get(
            "title",
            ""
        ).strip()

        message = request.data.get(
            "message",
            ""
        ).strip()

        notification_type = request.data.get(
            "notification_type",
            "system"
        )

        valid_types = [
            "motivation",
            "reminder",
            "membership",
            "workout",
            "goal",
            "system",
        ]

        if notification_type not in valid_types:
            notification_type = "system"

        if not title or not message:
            return Response(
                {
                    "error": (
                        "Title and message are required."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        notification = Notification.objects.create(
            user=user,
            title=title,
            message=message,
            notification_type=notification_type,
        )

        return Response(
            {
                "message": (
                    "Notification created successfully."
                ),
                "notification": {
                    "id": notification.id,
                    "title": notification.title,
                    "message": notification.message,
                    "notification_type": (
                        notification.notification_type
                    ),
                    "is_read": notification.is_read,
                    "created_at": (
                        notification.created_at.isoformat()
                    ),
                },
            },
            status=status.HTTP_201_CREATED
        )


# ============================================================
# MARK ONE NOTIFICATION AS READ
# ============================================================

class NotificationReadView(APIView):

    def patch(self, request, notification_id):

        try:
            notification = Notification.objects.get(
                id=notification_id
            )
        except Notification.DoesNotExist:

            return Response(
                {
                    "error": "Notification not found."
                },
                status=status.HTTP_404_NOT_FOUND
            )

        notification.is_read = True

        notification.save(
            update_fields=["is_read"]
        )

        return Response({
            "message": (
                "Notification marked as read."
            )
        })


# ============================================================
# MARK ALL NOTIFICATIONS AS READ
# ============================================================

class NotificationReadAllView(APIView):

    def patch(self, request):
        username = request.data.get(
            "username",
            ""
        ).strip().lower()

        if not username:
            return Response(
                {
                    "error": "Username is required."
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            user = User.objects.get(
                username=username
            )
        except User.DoesNotExist:

            return Response(
                {
                    "error": "User not found."
                },
                status=status.HTTP_404_NOT_FOUND
            )

        updated_count = (
            Notification.objects
            .filter(
                user=user,
                is_read=False
            )
            .update(
                is_read=True
            )
        )

        return Response({
            "message": (
                "All notifications marked as read."
            ),
            "updated_count": updated_count,
        })


# ============================================================
# ADMIN MEMBERS MANAGEMENT
# ============================================================

# ============================================================
# ADMIN MEMBERS MANAGEMENT
# ============================================================

class AdminMembersView(APIView):

    def _get_admin(self, username):

        username = str(
            username or ""
        ).strip().lower()

        if not username:
            return None, Response(
                {
                    "error": "Admin username is required."
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            admin_user = User.objects.get(
                username=username
            )
        except User.DoesNotExist:
            return None, Response(
                {
                    "error": "Admin user not found."
                },
                status=status.HTTP_404_NOT_FOUND
            )

        try:
            profile = admin_user.profile
        except UserProfile.DoesNotExist:
            return None, Response(
                {
                    "error": "Admin profile not found."
                },
                status=status.HTTP_404_NOT_FOUND
            )

        if profile.role != "admin":
            return None, Response(
                {
                    "error": "Admin access required."
                },
                status=status.HTTP_403_FORBIDDEN
            )

        return admin_user, None

    def _get_membership_data(self, user):

        today = timezone.localdate()

        membership = (
            Membership.objects
            .filter(user=user)
            .select_related("plan")
            .order_by("-created_at")
            .first()
        )

        if not membership:
            return None

        membership_status = membership.status

        if (
            membership.end_date
            and membership.end_date < today
        ):
            membership_status = "expired"

            if membership.status != "expired":
                membership.status = "expired"
                membership.save(
                    update_fields=["status"]
                )

        payment = (
            Payment.objects
            .filter(membership=membership)
            .order_by(
                "-payment_date",
                "-id"
            )
            .first()
        )

        return {
            "id": membership.id,
            "plan_name": (
                membership.plan.name
                if membership.plan
                else "Unknown Plan"
            ),
            "plan_type": (
                membership.plan.plan_type
                if membership.plan
                else ""
            ),
            "price": (
                float(membership.plan.price)
                if membership.plan
                else 0
            ),
            "start_date": membership.start_date,
            "end_date": membership.end_date,
            "status": membership_status,
            "payment_status": (
                payment.status
                if payment
                else "none"
            ),
            "payment_reference": (
                payment.reference_number
                if payment
                else None
            ),
        }

    def _serialize_member(self, user):

        profile, created = (
            UserProfile.objects.get_or_create(
                user=user,
                defaults={"role": "member"}
            )
        )

        membership_data = (
            self._get_membership_data(user)
        )

        return {
            "id": user.id,
            "username": user.username,
            "email": user.email or "",
            "first_name": user.first_name or "",
            "last_name": user.last_name or "",
            "phone": profile.phone or "",
            "address": profile.address or "",
            "date_of_birth": profile.date_of_birth,
            "profile_picture": profile.profile_picture,
            "is_active": user.is_active,
            "date_joined": user.date_joined,
            "attendance_count": (
                Attendance.objects
                .filter(user=user)
                .count()
            ),
            "workout_count": (
                WorkoutLog.objects
                .filter(user=user)
                .count()
            ),
            "goal_count": (
                FitnessGoal.objects
                .filter(user=user)
                .count()
            ),
            "completed_goal_count": (
                FitnessGoal.objects
                .filter(
                    user=user,
                    status="completed"
                )
                .count()
            ),
            "membership": membership_data,
        }

    def get(self, request):

        admin_username = request.query_params.get(
            "username",
            ""
        ).strip().lower()

        admin, error_response = self._get_admin(
            admin_username
        )

        if error_response:
            return error_response

        search = request.query_params.get(
            "search",
            ""
        ).strip()

        status_filter = request.query_params.get(
            "status",
            "all"
        ).strip().lower()

        members = (
            User.objects
            .filter(
                profile__role="member"
            )
            .select_related("profile")
            .order_by("-date_joined")
        )

        if search:
            members = members.filter(
                Q(first_name__icontains=search)
                | Q(last_name__icontains=search)
                | Q(username__icontains=search)
                | Q(email__icontains=search)
            )

        result = []

        for member in members:

            member_data = (
                self._serialize_member(member)
            )

            membership = (
                member_data["membership"]
            )

            if status_filter != "all":

                if status_filter == "none":

                    if membership is not None:
                        continue

                elif status_filter == "active":

                    if (
                        membership is None
                        or membership["status"] != "active"
                    ):
                        continue

                elif status_filter == "expired":

                    if (
                        membership is None
                        or membership["status"] != "expired"
                    ):
                        continue

                elif status_filter == "pending":

                    if (
                        membership is None
                        or membership["status"] != "pending"
                    ):
                        continue

                elif status_filter == "cancelled":

                    if (
                        membership is None
                        or membership["status"] != "cancelled"
                    ):
                        continue

            result.append(member_data)

        return Response(
            {
                "count": len(result),
                "total_members": len(result),
                "members": result,
            },
            status=status.HTTP_200_OK
        )

    def patch(self, request):

        # The mobile app sends:
        #
        # admin_username = logged-in administrator
        # username       = member being edited
        #
        # Always use admin_username for administrator
        # authorization.

        admin_username = (
            request.data.get("admin_username")
            or ""
        )

        admin, error_response = self._get_admin(
            admin_username
        )

        if error_response:
            return error_response

        member_id = request.data.get(
            "member_id"
        )

        member_username = (
            request.data.get("username")
            or ""
        ).strip().lower()

        if not member_id and not member_username:
            return Response(
                {
                    "error": (
                        "member_id or member username "
                        "is required."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        try:

            if member_id:

                member = (
                    User.objects
                    .select_related("profile")
                    .get(
                        id=member_id,
                        profile__role="member"
                    )
                )

            else:

                member = (
                    User.objects
                    .select_related("profile")
                    .get(
                        username=member_username,
                        profile__role="member"
                    )
                )

        except (
            User.DoesNotExist,
            ValueError,
            TypeError
        ):
            return Response(
                {
                    "error": "Member not found."
                },
                status=status.HTTP_404_NOT_FOUND
            )

        if "first_name" in request.data:

            member.first_name = str(
                request.data.get(
                    "first_name",
                    ""
                )
            ).strip()

        if "last_name" in request.data:

            member.last_name = str(
                request.data.get(
                    "last_name",
                    ""
                )
            ).strip()

        if "email" in request.data:

            member.email = str(
                request.data.get(
                    "email",
                    ""
                )
            ).strip().lower()

        if "is_active" in request.data:

            is_active_value = (
                request.data.get(
                    "is_active"
                )
            )

            if isinstance(
                is_active_value,
                bool
            ):
                member.is_active = (
                    is_active_value
                )

            elif isinstance(
                is_active_value,
                str
            ):

                member.is_active = (
                    is_active_value.lower()
                    in [
                        "true",
                        "1",
                        "yes",
                        "active"
                    ]
                )

            else:

                member.is_active = bool(
                    is_active_value
                )

        profile, created = (
            UserProfile.objects.get_or_create(
                user=member,
                defaults={"role": "member"}
            )
        )

        if "date_of_birth" in request.data:

            date_of_birth = request.data.get(
                "date_of_birth"
            )

            if date_of_birth:

                try:
                    parsed_date = datetime.strptime(
                        str(date_of_birth),
                        "%Y-%m-%d"
                    ).date()

                except ValueError:

                    return Response(
                        {
                            "error": (
                                "Date of birth must use "
                                "YYYY-MM-DD format."
                            )
                        },
                        status=status.HTTP_400_BAD_REQUEST
                    )

                profile.date_of_birth = (
                    parsed_date
                )

            else:

                profile.date_of_birth = None

        if "phone" in request.data:

            profile.phone = str(
                request.data.get(
                    "phone",
                    ""
                )
            ).strip()

        if "address" in request.data:

            profile.address = str(
                request.data.get(
                    "address",
                    ""
                )
            ).strip()

        member.save()
        profile.save()

        return Response(
            {
                "message": (
                    "Member updated successfully."
                ),
                "member": (
                    self._serialize_member(
                        member
                    )
                ),
            },
            status=status.HTTP_200_OK
        )

    # ========================================================
    # DELETE MEMBER ACCOUNT
    # ========================================================

    def delete(self, request):

        admin_username = (
            request.data.get("admin_username")
            or ""
        ).strip().lower()

        # ----------------------------------------------------
        # Verify administrator
        # ----------------------------------------------------

        admin, error_response = self._get_admin(
            admin_username
        )

        if error_response:
            return error_response

        # ----------------------------------------------------
        # Identify member
        # ----------------------------------------------------

        member_id = request.data.get(
            "member_id"
        )

        member_username = (
            request.data.get("username")
            or ""
        ).strip().lower()

        if not member_id and not member_username:
            return Response(
                {
                    "error": (
                        "member_id or member username "
                        "is required."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        # ----------------------------------------------------
        # Find member
        # ----------------------------------------------------

        try:

            if member_id:

                member = (
                    User.objects
                    .select_related("profile")
                    .get(
                        id=int(member_id),
                        profile__role="member"
                    )
                )

            else:

                member = (
                    User.objects
                    .select_related("profile")
                    .get(
                        username=member_username,
                        profile__role="member"
                    )
                )

        except (
            User.DoesNotExist,
            ValueError,
            TypeError
        ):

            return Response(
                {
                    "error": "Member not found."
                },
                status=status.HTTP_404_NOT_FOUND
            )

        # ----------------------------------------------------
        # Safety check
        # ----------------------------------------------------
        # This is an extra protection against accidentally
        # deleting the administrator's own account.

        if member.id == admin.id:

            return Response(
                {
                    "error": (
                        "You cannot delete your own "
                        "administrator account."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        deleted_member_id = member.id
        deleted_username = member.username

        # ----------------------------------------------------
        # Delete member account
        # ----------------------------------------------------
        #
        # Django will follow the model relationships using
        # their configured on_delete behavior.
        #
        # UserProfile, Membership, Payment, Attendance,
        # WorkoutLog, FitnessGoal, Notification, etc. that
        # are configured with CASCADE will be removed together
        # with the member account.
        #
        # MembershipPlan records are protected and therefore
        # are NOT deleted.
        # ----------------------------------------------------

        from django.db import transaction

        try:

            with transaction.atomic():

                member.delete()

        except Exception as exc:

            return Response(
                {
                    "error": (
                        "Unable to delete the member "
                        "account."
                    ),
                    "details": str(exc),
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        return Response(
            {
                "message": (
                    "Member account deleted successfully."
                ),
                "deleted_member": {
                    "id": deleted_member_id,
                    "username": deleted_username,
                },
            },
            status=status.HTTP_200_OK
        )
class AdminMembershipView(APIView):
    """
    Admin membership plan management.

    GET:
        Returns all active membership plans.

    POST:
        Assigns or renews a membership for a member.
        Creates the corresponding payment record.
        Creates a membership notification.
    """

    def get(self, request):
        admin_username = (
            request.query_params.get("username", "")
            .strip()
            .lower()
        )

        if not admin_username:
            return Response(
                {"error": "Admin username is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            admin = User.objects.get(username=admin_username)
        except User.DoesNotExist:
            return Response(
                {"error": "Admin user not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        try:
            admin_profile = UserProfile.objects.get(user=admin)
        except UserProfile.DoesNotExist:
            return Response(
                {"error": "Admin profile not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if admin_profile.role != "admin":
            return Response(
                {"error": "Admin access required."},
                status=status.HTTP_403_FORBIDDEN,
            )

        plans = MembershipPlan.objects.filter(
            is_active=True
        ).order_by(
            "price",
            "duration_days",
            "id"
        )

        plan_data = []

        for plan in plans:
            plan_data.append({
                "id": plan.id,
                "name": plan.name,
                "plan_type": plan.plan_type,
                "price": float(plan.price),
                "duration_days": plan.duration_days,
                "description": plan.description or "",
                "active": bool(plan.is_active),
                "is_active": bool(plan.is_active),
            })

        return Response(
            {
                "plans": plan_data,
                "count": len(plan_data),
            },
            status=status.HTTP_200_OK,
        )

    def post(self, request):

        admin_username = (
            request.data.get("admin_username")
            or request.data.get("username")
            or ""
        ).strip().lower()

        member_username = (
            request.data.get("member_username")
            or request.data.get("member")
            or ""
        ).strip().lower()

        member_id = request.data.get("member_id")
        plan_id = request.data.get("plan_id")

        start_date_value = (
            request.data.get("start_date")
            or timezone.localdate().isoformat()
        )

        payment_status = (
            request.data.get("payment_status")
            or "paid"
        ).strip().lower()

        payment_reference = (
            request.data.get("payment_reference")
            or ""
        ).strip()

        if not admin_username:
            return Response(
                {"error": "Admin username is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            admin = User.objects.get(
                username=admin_username
            )
        except User.DoesNotExist:
            return Response(
                {"error": "Admin user not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        try:
            admin_profile = UserProfile.objects.get(
                user=admin
            )
        except UserProfile.DoesNotExist:
            return Response(
                {"error": "Admin profile not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if admin_profile.role != "admin":
            return Response(
                {"error": "Admin access required."},
                status=status.HTTP_403_FORBIDDEN,
            )

        member = None

        if member_id:
            try:
                member = User.objects.get(
                    id=int(member_id)
                )
            except (
                User.DoesNotExist,
                ValueError,
                TypeError,
            ):
                return Response(
                    {"error": "Member not found."},
                    status=status.HTTP_404_NOT_FOUND,
                )

        elif member_username:
            try:
                member = User.objects.get(
                    username=member_username
                )
            except User.DoesNotExist:
                return Response(
                    {"error": "Member not found."},
                    status=status.HTTP_404_NOT_FOUND,
                )

        else:
            return Response(
                {
                    "error": (
                        "Member ID or member username "
                        "is required."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            member_profile = UserProfile.objects.get(
                user=member
            )
        except UserProfile.DoesNotExist:
            return Response(
                {"error": "Member profile not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if member_profile.role != "member":
            return Response(
                {"error": "The selected user is not a member."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not plan_id:
            return Response(
                {"error": "Membership plan is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            plan = MembershipPlan.objects.get(
                id=int(plan_id),
                is_active=True,
            )
        except (
            MembershipPlan.DoesNotExist,
            ValueError,
            TypeError,
        ):
            return Response(
                {
                    "error": (
                        "Membership plan not found "
                        "or inactive."
                    )
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        allowed_payment_statuses = {
            "paid",
            "pending",
            "failed",
        }

        if payment_status not in allowed_payment_statuses:
            return Response(
                {
                    "error": (
                        "Invalid payment status. "
                        "Use paid, pending, or failed."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            start_date = datetime.strptime(
                str(start_date_value),
                "%Y-%m-%d",
            ).date()
        except (ValueError, TypeError):
            return Response(
                {
                    "error": (
                        "Invalid start date. "
                        "Use YYYY-MM-DD."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        end_date = (
            start_date
            + timedelta(days=plan.duration_days)
        )

        if payment_status == "paid":
            membership_status = "active"
        elif payment_status == "pending":
            membership_status = "pending"
        else:
            membership_status = "cancelled"

        from django.db import transaction

        try:
            with transaction.atomic():

                Membership.objects.filter(
                    user=member,
                    status__in=[
                        "active",
                        "pending",
                    ],
                ).update(
                    status="expired"
                )

                membership = Membership.objects.create(
                    user=member,
                    plan=plan,
                    start_date=start_date,
                    end_date=end_date,
                    status=membership_status,
                )

                payment = Payment.objects.create(
                    membership=membership,
                    amount=plan.price,
                    status=payment_status,
                    reference_number=payment_reference,
                )

                if payment_status == "paid":
                    notification_title = (
                        "Membership Activated"
                    )

                    notification_message = (
                        f"Your {plan.name} membership "
                        f"has been activated. "
                        f"It is valid from "
                        f"{start_date.strftime('%B %d, %Y')} "
                        f"until "
                        f"{end_date.strftime('%B %d, %Y')}."
                    )

                elif payment_status == "pending":
                    notification_title = (
                        "Membership Pending"
                    )

                    notification_message = (
                        f"Your {plan.name} membership "
                        f"is pending payment confirmation."
                    )

                else:
                    notification_title = (
                        "Membership Payment Failed"
                    )

                    notification_message = (
                        f"Payment for your {plan.name} "
                        f"membership was marked as failed."
                    )

                Notification.objects.create(
                    user=member,
                    title=notification_title,
                    message=notification_message,
                    notification_type="membership",
                )

        except Exception as exc:
            return Response(
                {
                    "error": (
                        "Unable to assign membership."
                    ),
                    "details": str(exc),
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        return Response(
            {
                "message": (
                    "Membership assigned successfully."
                ),
                "membership": {
                    "id": membership.id,
                    "username": member.username,
                    "plan_id": plan.id,
                    "plan_name": plan.name,
                    "plan_type": plan.plan_type,
                    "price": float(plan.price),
                    "start_date": (
                        membership.start_date.isoformat()
                    ),
                    "end_date": (
                        membership.end_date.isoformat()
                    ),
                    "status": membership.status,
                    "payment_status": payment.status,
                    "payment_reference": (
                        payment.reference_number or ""
                    ),
                },
                "payment": {
                    "id": payment.id,
                    "amount": float(payment.amount),
                    "status": payment.status,
                    "reference": (
                        payment.reference_number or ""
                    ),
                },
            },
            status=status.HTTP_201_CREATED,
        )


# ============================================================
# ADMIN DASHBOARD
# ============================================================

class AdminDashboardView(APIView):

    def get(self, request):

        username = request.query_params.get(
            "username",
            ""
        ).strip().lower()

        if not username:
            return Response(
                {
                    "error": "Username is required."
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            admin_user = User.objects.get(
                username=username
            )
        except User.DoesNotExist:

            return Response(
                {
                    "error": "User not found."
                },
                status=status.HTTP_404_NOT_FOUND
            )

        try:
            profile = admin_user.profile

        except UserProfile.DoesNotExist:

            return Response(
                {
                    "error": (
                        "User profile not found."
                    )
                },
                status=status.HTTP_404_NOT_FOUND
            )

        if profile.role != "admin":

            return Response(
                {
                    "error": (
                        "Admin access required."
                    )
                },
                status=status.HTTP_403_FORBIDDEN
            )

        today = timezone.localdate()

        total_members = (
            UserProfile.objects
            .filter(role="member")
            .count()
        )

        active_members = (
            Membership.objects
            .filter(
                user__profile__role="member",
                status="active",
                end_date__gte=today
            )
            .values("user")
            .distinct()
            .count()
        )

        expired_members = (
            Membership.objects
            .filter(
                user__profile__role="member"
            )
            .filter(
                end_date__lt=today
            )
            .values("user")
            .distinct()
            .count()
        )

        today_attendance = (
            Attendance.objects
            .filter(
                date=today,
                user__profile__role="member"
            )
            .count()
        )

        total_workouts = (
            WorkoutLog.objects
            .filter(
                user__profile__role="member"
            )
            .count()
        )

        total_goals = (
            FitnessGoal.objects
            .filter(
                user__profile__role="member"
            )
            .count()
        )

        active_goals = (
            FitnessGoal.objects
            .filter(
                user__profile__role="member",
                status="active"
            )
            .count()
        )

        completed_goals = (
            FitnessGoal.objects
            .filter(
                user__profile__role="member",
                status="completed"
            )
            .count()
        )

        recent_members = (
            User.objects
            .filter(
                profile__role="member"
            )
            .order_by(
                "-date_joined"
            )[:5]
        )

        recent_member_list = []

        for member in recent_members:

            membership = (
                Membership.objects
                .filter(
                    user=member
                )
                .order_by(
                    "-created_at"
                )
                .first()
            )

            recent_member_list.append({
                "id": member.id,
                "username": member.username,
                "first_name": member.first_name,
                "last_name": member.last_name,
                "date_joined": member.date_joined,
                "membership_status": (
                    membership.status
                    if membership
                    else "none"
                ),
            })

        recent_workouts = (
            WorkoutLog.objects
            .filter(
                user__profile__role="member"
            )
            .select_related(
                "user",
                "workout"
            )
            .order_by(
                "-created_at"
            )[:5]
        )

        recent_workout_list = []

        for workout_log in recent_workouts:

            recent_workout_list.append({
                "id": workout_log.id,
                "member": (
                    workout_log.user.get_full_name()
                    or workout_log.user.username
                ),
                "workout_name": (
                    workout_log.workout.name
                    if workout_log.workout
                    else "Workout"
                ),
                "workout_date": (
                    workout_log.workout_date
                ),
                "duration_minutes": (
                    workout_log.duration_minutes
                ),
                "completed": (
                    workout_log.completed
                ),
            })

        return Response({
            "dashboard": {
                "total_members": total_members,
                "active_members": active_members,
                "expired_members": expired_members,
                "today_attendance": today_attendance,
                "total_workouts": total_workouts,
                "total_goals": total_goals,
                "active_goals": active_goals,
                "completed_goals": completed_goals,
            },
            "recent_members": recent_member_list,
            "recent_workouts": recent_workout_list,
        })