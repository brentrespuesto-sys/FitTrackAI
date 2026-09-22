import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, {
  useCallback,
  useEffect,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const API_BASE =
  'http://192.168.1.179:8080/api';

type Report = {
  generated_date: string;
  total_members: number;
  active_members: number;
  expired_members: number;
  pending_members: number;
  cancelled_members: number;
  no_membership_members: number;
  current_active_rate: number;
  recently_active_members: number;
  at_risk_members: number;
  expiring_within_30_days: number;
  renewed_memberships: number;
  recently_ended_memberships: number;
  renewal_rate: number;
};

type PaymentStatus = {
  paid: number;
  pending: number;
  failed: number;
};

type MembershipData = {
  id: number;
  plan_name: string;
  plan_type: string;
  price: number;
  start_date: string | null;
  end_date: string | null;
  status: string;
};

type AtRiskMember = {
  id: number;
  username: string;
  name: string;
  email: string;
  last_activity: string | null;
  days_inactive: number | null;
  membership: MembershipData | null;
};

type ExpiringMember = {
  id: number;
  username: string;
  name: string;
  email: string;
  days_remaining: number;
  membership: MembershipData | null;
};

type RecentMembership = {
  id: number;
  member_id: number;
  member: string;
  username: string;
  plan_name: string;
  plan_type: string;
  status: string;
  start_date: string | null;
  end_date: string | null;
  created_at: string | null;
};

type RetentionResponse = {
  report: Report;
  payment_status: PaymentStatus;
  at_risk_members: AtRiskMember[];
  expiring_members: ExpiringMember[];
  recent_memberships: RecentMembership[];
};

export default function RetentionReportsScreen() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [report, setReport] =
    useState<Report | null>(null);

  const [paymentStatus, setPaymentStatus] =
    useState<PaymentStatus>({
      paid: 0,
      pending: 0,
      failed: 0,
    });

  const [atRiskMembers, setAtRiskMembers] =
    useState<AtRiskMember[]>([]);

  const [expiringMembers, setExpiringMembers] =
    useState<ExpiringMember[]>([]);

  const [recentMemberships, setRecentMemberships] =
    useState<RecentMembership[]>([]);

  const loadReport = useCallback(async () => {
    try {
      const storedUser =
        await AsyncStorage.getItem(
          'loggedInUser'
        );

      if (!storedUser) {
        Alert.alert(
          'Session Expired',
          'Please log in again.'
        );

        router.replace('/');
        return;
      }

      const user = JSON.parse(storedUser);

      if (user.role !== 'admin') {
        Alert.alert(
          'Access Denied',
          'Only administrators can view retention reports.'
        );

        router.replace('/dashboard');
        return;
      }

      const username = encodeURIComponent(
        user.username
      );

      const response = await fetch(
        `${API_BASE}/admin/retention-report/?admin_username=${username}`
      );

      const responseText =
        await response.text();

      console.log(
        'RETENTION REPORT STATUS:',
        response.status
      );

      console.log(
        'RETENTION REPORT RESPONSE:',
        responseText
      );

      let data: RetentionResponse;

      try {
        data = JSON.parse(responseText);
      } catch {
        throw new Error(
          'Invalid response from the server.'
        );
      }

      if (!response.ok) {
        throw new Error(
          (data as any)?.error ||
            (data as any)?.detail ||
            'Failed to load retention report.'
        );
      }

      setReport(data.report);

      setPaymentStatus(
        data.payment_status || {
          paid: 0,
          pending: 0,
          failed: 0,
        }
      );

      setAtRiskMembers(
        data.at_risk_members || []
      );

      setExpiringMembers(
        data.expiring_members || []
      );

      setRecentMemberships(
        data.recent_memberships || []
      );
    } catch (error: any) {
      console.error(
        'RETENTION REPORT ERROR:',
        error
      );

      Alert.alert(
        'Error',
        error?.message ||
          'Unable to load retention report.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [router]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadReport();
  };

  const formatDate = (
    dateString: string | null
  ) => {
    if (!dateString) {
      return 'No activity';
    }

    const date = new Date(dateString);

    if (isNaN(date.getTime())) {
      return dateString;
    }

    return date.toLocaleDateString();
  };

  const getStatusLabel = (
    status: string
  ) => {
    if (!status) {
      return 'Unknown';
    }

    return (
      status.charAt(0).toUpperCase() +
      status.slice(1)
    );
  };

  if (loading) {
    return (
      <SafeAreaView
        style={styles.loadingContainer}
      >
        <ActivityIndicator size="large" />

        <Text style={styles.loadingText}>
          Generating retention report...
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={
          styles.scrollContent
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backText}>
              ‹
            </Text>
          </TouchableOpacity>

          <View style={styles.headerText}>
            <Text style={styles.smallTitle}>
              FITTRACK AI
            </Text>

            <Text style={styles.title}>
              Retention Reports
            </Text>

            <Text style={styles.subtitle}>
              Member retention and engagement
              overview
            </Text>
          </View>
        </View>

        {report && (
          <>
            {/* GENERATED DATE */}
            <View style={styles.generatedCard}>
              <Text style={styles.generatedLabel}>
                REPORT DATE
              </Text>

              <Text style={styles.generatedValue}>
                {formatDate(
                  report.generated_date
                )}
              </Text>
            </View>

            {/* MAIN RETENTION SUMMARY */}
            <Text style={styles.sectionTitle}>
              Retention Summary
            </Text>

            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>
                  {report.total_members}
                </Text>

                <Text style={styles.statLabel}>
                  Total Members
                </Text>
              </View>

              <View style={styles.statCard}>
                <Text style={styles.statNumber}>
                  {report.active_members}
                </Text>

                <Text style={styles.statLabel}>
                  Active Members
                </Text>
              </View>

              <View style={styles.statCard}>
                <Text style={styles.statNumber}>
                  {report.expired_members}
                </Text>

                <Text style={styles.statLabel}>
                  Expired Members
                </Text>
              </View>

              <View style={styles.statCard}>
                <Text style={styles.statNumber}>
                  {report.pending_members}
                </Text>

                <Text style={styles.statLabel}>
                  Pending
                </Text>
              </View>

              <View style={styles.statCard}>
                <Text style={styles.statNumber}>
                  {report.no_membership_members}
                </Text>

                <Text style={styles.statLabel}>
                  No Membership
                </Text>
              </View>

              <View style={styles.statCard}>
                <Text style={styles.statNumber}>
                  {report.cancelled_members}
                </Text>

                <Text style={styles.statLabel}>
                  Cancelled
                </Text>
              </View>
            </View>

            {/* RETENTION RATE */}
            <View style={styles.highlightCard}>
              <Text style={styles.highlightTitle}>
                Current Active Rate
              </Text>

              <Text style={styles.highlightNumber}>
                {report.current_active_rate}%
              </Text>

              <Text style={styles.highlightDescription}>
                Percentage of registered members
                with an active membership.
              </Text>
            </View>

            {/* ENGAGEMENT */}
            <Text style={styles.sectionTitle}>
              Member Engagement
            </Text>

            <View style={styles.engagementCard}>
              <View
                style={styles.engagementRow}
              >
                <View>
                  <Text
                    style={styles.engagementTitle}
                  >
                    Recently Active
                  </Text>

                  <Text
                    style={styles.engagementSubtitle}
                  >
                    Attendance or workout
                    activity in the last 30
                    days
                  </Text>
                </View>

                <Text
                  style={styles.engagementNumber}
                >
                  {report.recently_active_members}
                </Text>
              </View>

              <View
                style={styles.divider}
              />

              <View
                style={styles.engagementRow}
              >
                <View>
                  <Text
                    style={styles.engagementTitle}
                  >
                    At-Risk Members
                  </Text>

                  <Text
                    style={styles.engagementSubtitle}
                  >
                    Active members with no
                    recent activity
                  </Text>
                </View>

                <Text
                  style={styles.engagementNumber}
                >
                  {report.at_risk_members}
                </Text>
              </View>

              <View
                style={styles.divider}
              />

              <View
                style={styles.engagementRow}
              >
                <View>
                  <Text
                    style={styles.engagementTitle}
                  >
                    Expiring Soon
                  </Text>

                  <Text
                    style={styles.engagementSubtitle}
                  >
                    Memberships expiring within
                    30 days
                  </Text>
                </View>

                <Text
                  style={styles.engagementNumber}
                >
                  {report.expiring_within_30_days}
                </Text>
              </View>
            </View>

            {/* RENEWAL */}
            <Text style={styles.sectionTitle}>
              Renewal Performance
            </Text>

            <View style={styles.highlightCard}>
              <Text style={styles.highlightTitle}>
                Renewal Rate
              </Text>

              <Text style={styles.highlightNumber}>
                {report.renewal_rate}%
              </Text>

              <Text style={styles.highlightDescription}>
                {report.renewed_memberships} renewed
                out of{' '}
                {report.recently_ended_memberships}{' '}
                memberships that ended within
                the last 90 days.
              </Text>
            </View>

            {/* PAYMENT STATUS */}
            <Text style={styles.sectionTitle}>
              Payment Status
            </Text>

            <View style={styles.paymentGrid}>
              <View style={styles.paymentCard}>
                <Text style={styles.paymentNumber}>
                  {paymentStatus.paid}
                </Text>

                <Text style={styles.paymentLabel}>
                  Paid
                </Text>
              </View>

              <View style={styles.paymentCard}>
                <Text style={styles.paymentNumber}>
                  {paymentStatus.pending}
                </Text>

                <Text style={styles.paymentLabel}>
                  Pending
                </Text>
              </View>

              <View style={styles.paymentCard}>
                <Text style={styles.paymentNumber}>
                  {paymentStatus.failed}
                </Text>

                <Text style={styles.paymentLabel}>
                  Failed
                </Text>
              </View>
            </View>

            {/* AT-RISK MEMBERS */}
            <Text style={styles.sectionTitle}>
              At-Risk Members
            </Text>

            <View style={styles.listCard}>
              {atRiskMembers.length === 0 ? (
                <Text style={styles.emptyText}>
                  No at-risk members found.
                </Text>
              ) : (
                atRiskMembers.map(
                  (member) => (
                    <View
                      key={member.id}
                      style={styles.listItem}
                    >
                      <View
                        style={styles.avatar}
                      >
                        <Text
                          style={
                            styles.avatarText
                          }
                        >
                          {member.name
                            ? member.name
                                .charAt(0)
                                .toUpperCase()
                            : 'M'}
                        </Text>
                      </View>

                      <View
                        style={
                          styles.listContent
                        }
                      >
                        <Text
                          style={
                            styles.listTitle
                          }
                        >
                          {member.name}
                        </Text>

                        <Text
                          style={
                            styles.listSubtitle
                          }
                        >
                          {member.email ||
                            member.username}
                        </Text>

                        <Text
                          style={
                            styles.listDate
                          }
                        >
                          Last activity:{' '}
                          {formatDate(
                            member.last_activity
                          )}
                        </Text>

                        <Text
                          style={
                            styles.warningText
                          }
                        >
                          {member.days_inactive !==
                          null
                            ? `${member.days_inactive} days inactive`
                            : 'No recorded activity'}
                        </Text>
                      </View>
                    </View>
                  )
                )
              )}
            </View>

            {/* EXPIRING MEMBERS */}
            <Text style={styles.sectionTitle}>
              Expiring Memberships
            </Text>

            <View style={styles.listCard}>
              {expiringMembers.length ===
              0 ? (
                <Text style={styles.emptyText}>
                  No memberships are expiring
                  within 30 days.
                </Text>
              ) : (
                expiringMembers.map(
                  (member) => (
                    <View
                      key={member.id}
                      style={styles.listItem}
                    >
                      <View
                        style={styles.avatar}
                      >
                        <Text
                          style={
                            styles.avatarText
                          }
                        >
                          {member.name
                            ? member.name
                                .charAt(0)
                                .toUpperCase()
                            : 'M'}
                        </Text>
                      </View>

                      <View
                        style={
                          styles.listContent
                        }
                      >
                        <Text
                          style={
                            styles.listTitle
                          }
                        >
                          {member.name}
                        </Text>

                        <Text
                          style={
                            styles.listSubtitle
                          }
                        >
                          {member.membership
                            ?.plan_name ||
                            'Membership'}
                        </Text>

                        <Text
                          style={
                            styles.listDate
                          }
                        >
                          Expires:{' '}
                          {formatDate(
                            member.membership
                              ?.end_date ||
                              null
                          )}
                        </Text>

                        <Text
                          style={
                            styles.warningText
                          }
                        >
                          {member.days_remaining ===
                          0
                            ? 'Expires today'
                            : `${member.days_remaining} days remaining`}
                        </Text>
                      </View>
                    </View>
                  )
                )
              )}
            </View>

            {/* RECENT MEMBERSHIP ACTIVITY */}
            <Text style={styles.sectionTitle}>
              Recent Membership Activity
            </Text>

            <View style={styles.listCard}>
              {recentMemberships.length ===
              0 ? (
                <Text style={styles.emptyText}>
                  No membership activity found.
                </Text>
              ) : (
                recentMemberships.map(
                  (membership) => (
                    <View
                      key={membership.id}
                      style={styles.membershipItem}
                    >
                      <View
                        style={
                          styles.membershipItemTop
                        }
                      >
                        <Text
                          style={
                            styles.listTitle
                          }
                        >
                          {membership.member}
                        </Text>

                        <View
                          style={[
                            styles.statusBadge,
                            membership.status ===
                              'active' &&
                              styles.activeBadge,
                            membership.status ===
                              'expired' &&
                              styles.expiredBadge,
                            membership.status ===
                              'pending' &&
                              styles.pendingBadge,
                            membership.status ===
                              'cancelled' &&
                              styles.cancelledBadge,
                          ]}
                        >
                          <Text
                            style={
                              styles.statusBadgeText
                            }
                          >
                            {getStatusLabel(
                              membership.status
                            )}
                          </Text>
                        </View>
                      </View>

                      <Text
                        style={
                          styles.listSubtitle
                        }
                      >
                        {membership.plan_name}
                      </Text>

                      <Text
                        style={
                          styles.listDate
                        }
                      >
                        {formatDate(
                          membership.start_date
                        )}{' '}
                        →{' '}
                        {formatDate(
                          membership.end_date
                        )}
                      </Text>
                    </View>
                  )
                )
              )}
            </View>

            {/* REFRESH */}
            <TouchableOpacity
              style={styles.refreshButton}
              onPress={handleRefresh}
              activeOpacity={0.8}
            >
              <Text
                style={styles.refreshButtonText}
              >
                Refresh Report
              </Text>
            </TouchableOpacity>

            <Text style={styles.footerText}>
              FitTrack AI • Retention and
              Engagement Report
            </Text>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fb',
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f7fb',
  },

  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: '#666',
  },

  scrollContent: {
    padding: 20,
    paddingBottom: 50,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },

  backText: {
    fontSize: 32,
    color: '#111',
    lineHeight: 35,
  },

  headerText: {
    flex: 1,
  },

  smallTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.5,
    color: '#666',
  },

  title: {
    fontSize: 27,
    fontWeight: '800',
    color: '#111',
    marginTop: 3,
  },

  subtitle: {
    fontSize: 13,
    color: '#777',
    marginTop: 5,
    lineHeight: 18,
  },

  generatedCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    marginBottom: 25,
  },

  generatedLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
    color: '#999',
  },

  generatedValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111',
    marginTop: 5,
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111',
    marginBottom: 12,
    marginTop: 4,
  },

  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 12,
  },

  statCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
  },

  statNumber: {
    fontSize: 26,
    fontWeight: '800',
    color: '#111',
  },

  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
    fontWeight: '600',
  },

  highlightCard: {
    backgroundColor: '#111',
    borderRadius: 18,
    padding: 22,
    marginBottom: 25,
  },

  highlightTitle: {
    color: '#ccc',
    fontSize: 13,
    fontWeight: '700',
  },

  highlightNumber: {
    color: '#fff',
    fontSize: 42,
    fontWeight: '900',
    marginTop: 5,
  },

  highlightDescription: {
    color: '#ccc',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 5,
  },

  engagementCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    paddingHorizontal: 18,
    marginBottom: 25,
  },

  engagementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 18,
  },

  engagementTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111',
  },

  engagementSubtitle: {
    fontSize: 11,
    color: '#777',
    marginTop: 4,
    maxWidth: 240,
    lineHeight: 16,
  },

  engagementNumber: {
    fontSize: 27,
    fontWeight: '900',
    color: '#111',
  },

  divider: {
    height: 1,
    backgroundColor: '#eee',
  },

  paymentGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 25,
  },

  paymentCard: {
    width: '31%',
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
  },

  paymentNumber: {
    fontSize: 25,
    fontWeight: '800',
    color: '#111',
  },

  paymentLabel: {
    marginTop: 5,
    fontSize: 11,
    color: '#666',
    fontWeight: '600',
  },

  listCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingHorizontal: 16,
    marginBottom: 25,
  },

  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },

  avatar: {
    width: 45,
    height: 45,
    borderRadius: 23,
    backgroundColor: '#e9e9e9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 13,
  },

  avatarText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#333',
  },

  listContent: {
    flex: 1,
  },

  listTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111',
  },

  listSubtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 3,
  },

  listDate: {
    fontSize: 11,
    color: '#999',
    marginTop: 4,
  },

  warningText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#777',
    marginTop: 5,
  },

  emptyText: {
    textAlign: 'center',
    paddingVertical: 25,
    color: '#888',
    fontSize: 14,
  },

  membershipItem: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },

  membershipItemTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  statusBadge: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 10,
    backgroundColor: '#eee',
  },

  activeBadge: {
    backgroundColor: '#111',
  },

  expiredBadge: {
    backgroundColor: '#555',
  },

  pendingBadge: {
    backgroundColor: '#777',
  },

  cancelledBadge: {
    backgroundColor: '#999',
  },

  statusBadgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
  },

  refreshButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    marginBottom: 20,
  },

  refreshButtonText: {
    color: '#111',
    fontSize: 15,
    fontWeight: '700',
  },

  footerText: {
    textAlign: 'center',
    color: '#aaa',
    fontSize: 11,
    marginBottom: 10,
  },
});