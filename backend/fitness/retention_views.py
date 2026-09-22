from datetime import timedelta

from django.contrib.auth.models import User
from django.db.models import Max, Q
from django.utils import timezone

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from .models import (
    UserProfile,
    Membership,
    Payment,
    Attendance,
    WorkoutLog,
)


class AdminRetentionReportView(APIView):
    """
    Admin-only retention and member engagement report.

    This endpoint provides:
    - Membership status distribution
    - Current active-member rate
    - Payment status distribution
    - Recent member activity
    - Inactive / at-risk members
    - Upcoming membership expirations
    - Recent membership activity
    - Renewal rate
    """

    def _get_admin(self, username):
        username = (username or "").strip().lower()

        if not username:
            return None, Response(
                {
                    "error": "Admin username is required."
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            admin = (
                User.objects
                .select_related("profile")
                .get(username=username)
            )
        except User.DoesNotExist:
            return None, Response(
                {
                    "error": "Administrator account not found."
                },
                status=status.HTTP_404_NOT_FOUND
            )

        try:
            role = admin.profile.role
        except UserProfile.DoesNotExist:
            role = None

        if role != "admin":
            return None, Response(
                {
                    "error": (
                        "Access denied. "
                        "Administrator privileges are required."
                    )
                },
                status=status.HTTP_403_FORBIDDEN
            )

        return admin, None

    def _member_name(self, user):
        full_name = user.get_full_name().strip()

        if full_name:
            return full_name

        return user.username

    def _serialize_membership(self, membership):
        if not membership:
            return None

        return {
            "id": membership.id,
            "plan_name": (
                membership.plan.name
                if membership.plan
                else "Membership"
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
            "start_date": (
                membership.start_date.isoformat()
                if membership.start_date
                else None
            ),
            "end_date": (
                membership.end_date.isoformat()
                if membership.end_date
                else None
            ),
            "status": membership.status,
        }

    def get(self, request):
        admin_username = (
            request.query_params.get("admin_username")
            or request.query_params.get("username")
            or ""
        )

        admin, error_response = self._get_admin(
            admin_username
        )

        if error_response:
            return error_response

        today = timezone.localdate()
        thirty_days_ago = today - timedelta(days=30)
        thirty_days_from_now = today + timedelta(days=30)
        ninety_days_ago = today - timedelta(days=90)

        # ---------------------------------------------------------
        # MEMBERS
        # ---------------------------------------------------------

        members = (
            User.objects
            .filter(profile__role="member")
            .select_related("profile")
            .order_by("username")
        )

        total_members = members.count()

        # ---------------------------------------------------------
        # MEMBERSHIP STATUS
        # ---------------------------------------------------------

        active_members = 0
        expired_members = 0
        pending_members = 0
        cancelled_members = 0
        no_membership_members = 0

        active_memberships = []
        expiring_memberships = []

        for member in members:
            memberships = (
                Membership.objects
                .filter(user=member)
                .select_related("plan")
                .order_by("-end_date", "-created_at")
            )

            latest_membership = memberships.first()

            if not latest_membership:
                no_membership_members += 1
                continue

            # A membership whose end date has passed is treated
            # as expired even if the stored status has not yet
            # been updated.
            effective_status = latest_membership.status

            if (
                latest_membership.end_date
                and latest_membership.end_date < today
                and latest_membership.status == "active"
            ):
                effective_status = "expired"

            if effective_status == "active":
                active_members += 1
                active_memberships.append(
                    latest_membership
                )

                if (
                    latest_membership.end_date
                    and
                    today <= latest_membership.end_date
                    <= thirty_days_from_now
                ):
                    expiring_memberships.append(
                        latest_membership
                    )

            elif effective_status == "expired":
                expired_members += 1

            elif effective_status == "pending":
                pending_members += 1

            elif effective_status == "cancelled":
                cancelled_members += 1

        # ---------------------------------------------------------
        # RETENTION / ACTIVE RATE
        # ---------------------------------------------------------

        if total_members > 0:
            current_active_rate = round(
                (active_members / total_members) * 100,
                2
            )
        else:
            current_active_rate = 0

        # ---------------------------------------------------------
        # PAYMENT STATUS
        # ---------------------------------------------------------

        member_membership_ids = (
            Membership.objects
            .filter(user__profile__role="member")
            .values_list("id", flat=True)
        )

        paid_payments = (
            Payment.objects
            .filter(
                membership_id__in=member_membership_ids,
                status="paid"
            )
            .count()
        )

        pending_payments = (
            Payment.objects
            .filter(
                membership_id__in=member_membership_ids,
                status="pending"
            )
            .count()
        )

        failed_payments = (
            Payment.objects
            .filter(
                membership_id__in=member_membership_ids,
                status="failed"
            )
            .count()
        )

        # ---------------------------------------------------------
        # MEMBER ACTIVITY
        # ---------------------------------------------------------

        recent_attendance_user_ids = set(
            Attendance.objects
            .filter(
                user__profile__role="member",
                date__gte=thirty_days_ago,
            )
            .values_list("user_id", flat=True)
            .distinct()
        )

        recent_workout_user_ids = set(
            WorkoutLog.objects
            .filter(
                user__profile__role="member",
                workout_date__gte=thirty_days_ago,
            )
            .values_list("user_id", flat=True)
            .distinct()
        )

        recently_active_user_ids = (
            recent_attendance_user_ids
            | recent_workout_user_ids
        )

        recently_active_members = len(
            recently_active_user_ids
        )

        # ---------------------------------------------------------
        # AT-RISK MEMBERS
        # ---------------------------------------------------------

        at_risk_members = []

        for member in members:
            latest_membership = (
                Membership.objects
                .filter(user=member)
                .select_related("plan")
                .order_by("-end_date", "-created_at")
                .first()
            )

            if not latest_membership:
                continue

            effective_status = latest_membership.status

            if (
                latest_membership.end_date
                and latest_membership.end_date < today
                and latest_membership.status == "active"
            ):
                effective_status = "expired"

            if effective_status != "active":
                continue

            latest_attendance = (
                Attendance.objects
                .filter(user=member)
                .order_by("-date", "-check_in")
                .first()
            )

            latest_workout = (
                WorkoutLog.objects
                .filter(user=member)
                .order_by("-workout_date", "-created_at")
                .first()
            )

            last_attendance_date = (
                latest_attendance.date
                if latest_attendance
                else None
            )

            last_workout_date = (
                latest_workout.workout_date
                if latest_workout
                else None
            )

            activity_dates = [
                date
                for date in [
                    last_attendance_date,
                    last_workout_date,
                ]
                if date is not None
            ]

            if activity_dates:
                last_activity = max(activity_dates)
                days_inactive = (
                    today - last_activity
                ).days
            else:
                last_activity = None
                days_inactive = None

            # An active member is considered at-risk when:
            # - there is no recorded activity, or
            # - the last activity was more than 14 days ago.
            if (
                last_activity is None
                or days_inactive > 14
            ):
                at_risk_members.append(
                    {
                        "id": member.id,
                        "username": member.username,
                        "name": self._member_name(member),
                        "email": member.email,
                        "last_activity": (
                            last_activity.isoformat()
                            if last_activity
                            else None
                        ),
                        "days_inactive": days_inactive,
                        "membership": self._serialize_membership(
                            latest_membership
                        ),
                    }
                )

        at_risk_members.sort(
            key=lambda item: (
                item["days_inactive"]
                if item["days_inactive"] is not None
                else 999999
            ),
            reverse=True
        )

        # ---------------------------------------------------------
        # EXPIRING MEMBERSHIPS
        # ---------------------------------------------------------

        expiring_members = []

        for membership in expiring_memberships:
            days_remaining = (
                membership.end_date - today
            ).days

            expiring_members.append(
                {
                    "id": membership.user.id,
                    "username": membership.user.username,
                    "name": self._member_name(
                        membership.user
                    ),
                    "email": membership.user.email,
                    "days_remaining": days_remaining,
                    "membership": self._serialize_membership(
                        membership
                    ),
                }
            )

        expiring_members.sort(
            key=lambda item: item["days_remaining"]
        )

        # ---------------------------------------------------------
        # RENEWAL RATE
        # ---------------------------------------------------------

        recently_ended = list(
            Membership.objects
            .filter(
                user__profile__role="member",
                end_date__gte=ninety_days_ago,
                end_date__lt=today,
            )
            .select_related("user", "plan")
            .order_by("user_id", "end_date")
        )

        renewed_count = 0

        for old_membership in recently_ended:
            renewal_exists = (
                Membership.objects
                .filter(
                    user=old_membership.user,
                    start_date__gte=old_membership.end_date,
                    start_date__lte=(
                        old_membership.end_date
                        + timedelta(days=30)
                    ),
                )
                .exclude(
                    id=old_membership.id
                )
                .exists()
            )

            if renewal_exists:
                renewed_count += 1

        ended_count = len(recently_ended)

        if ended_count > 0:
            renewal_rate = round(
                (renewed_count / ended_count) * 100,
                2
            )
        else:
            renewal_rate = 0

        # ---------------------------------------------------------
        # RECENT MEMBERSHIP ACTIVITY
        # ---------------------------------------------------------

        recent_memberships = (
            Membership.objects
            .filter(user__profile__role="member")
            .select_related("user", "plan")
            .order_by("-created_at")[:10]
        )

        recent_membership_list = []

        for membership in recent_memberships:
            recent_membership_list.append(
                {
                    "id": membership.id,
                    "member_id": membership.user.id,
                    "member": self._member_name(
                        membership.user
                    ),
                    "username": membership.user.username,
                    "plan_name": (
                        membership.plan.name
                        if membership.plan
                        else "Membership"
                    ),
                    "plan_type": (
                        membership.plan.plan_type
                        if membership.plan
                        else ""
                    ),
                    "status": membership.status,
                    "start_date": (
                        membership.start_date.isoformat()
                        if membership.start_date
                        else None
                    ),
                    "end_date": (
                        membership.end_date.isoformat()
                        if membership.end_date
                        else None
                    ),
                    "created_at": (
                        membership.created_at.isoformat()
                        if membership.created_at
                        else None
                    ),
                }
            )

        # ---------------------------------------------------------
        # RETURN REPORT
        # ---------------------------------------------------------

        return Response(
            {
                "report": {
                    "generated_date": today.isoformat(),
                    "total_members": total_members,
                    "active_members": active_members,
                    "expired_members": expired_members,
                    "pending_members": pending_members,
                    "cancelled_members": cancelled_members,
                    "no_membership_members": (
                        no_membership_members
                    ),
                    "current_active_rate": (
                        current_active_rate
                    ),
                    "recently_active_members": (
                        recently_active_members
                    ),
                    "at_risk_members": len(
                        at_risk_members
                    ),
                    "expiring_within_30_days": len(
                        expiring_members
                    ),
                    "renewed_memberships": renewed_count,
                    "recently_ended_memberships": ended_count,
                    "renewal_rate": renewal_rate,
                },
                "payment_status": {
                    "paid": paid_payments,
                    "pending": pending_payments,
                    "failed": failed_payments,
                },
                "at_risk_members": at_risk_members[:20],
                "expiring_members": expiring_members[:20],
                "recent_memberships": recent_membership_list,
            },
            status=status.HTTP_200_OK
        )