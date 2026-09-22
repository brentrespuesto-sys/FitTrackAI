from django.urls import path

from .views import (
    RegisterView,
    LoginView,
    UpdateProfileView,
    ChangePasswordView,
    MembershipView,
    MembershipPlansView,
    MembershipRequestView,
    WorkoutLogView,
    AttendanceView,
    FitnessGoalView,
    NotificationView,
    NotificationReadView,
    NotificationReadAllView,
    AdminDashboardView,
    AdminMembersView,
    AdminMembershipView,
)

from .retention_views import (
    AdminRetentionReportView,
)


urlpatterns = [
    path(
        "register/",
        RegisterView.as_view(),
        name="register"
    ),

    path(
        "login/",
        LoginView.as_view(),
        name="login"
    ),

    path(
        "profile/update/",
        UpdateProfileView.as_view(),
        name="profile-update"
    ),

    path(
        "change-password/",
        ChangePasswordView.as_view(),
        name="change-password"
    ),

    path(
        "membership/",
        MembershipView.as_view(),
        name="membership"
    ),

    path(
        "membership/plans/",
        MembershipPlansView.as_view()
    ),

    path(
        "membership/request/",
        MembershipRequestView.as_view()
    ),

    path(
        "workouts/",
        WorkoutLogView.as_view(),
        name="workouts"
    ),

    path(
        "attendance/",
        AttendanceView.as_view(),
        name="attendance"
    ),

    path(
        "goals/",
        FitnessGoalView.as_view(),
        name="goals"
    ),

    path(
        "notifications/",
        NotificationView.as_view(),
        name="notifications"
    ),

    path(
        "notifications/<int:notification_id>/read/",
        NotificationReadView.as_view(),
        name="notification-read"
    ),

    path(
        "notifications/read-all/",
        NotificationReadAllView.as_view(),
        name="notifications-read-all"
    ),

    # ---------------------------------------------------------
    # ADMIN
    # ---------------------------------------------------------

    path(
        "admin/dashboard/",
        AdminDashboardView.as_view(),
        name="admin-dashboard"
    ),

    path(
        "admin/members/",
        AdminMembersView.as_view(),
        name="admin-members"
    ),

    path(
        "admin/membership/",
        AdminMembershipView.as_view(),
        name="admin-membership"
    ),

    path(
        "admin/retention-report/",
        AdminRetentionReportView.as_view(),
        name="admin-retention-report"
    ),
]