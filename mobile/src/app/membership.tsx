
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const API_BASE_URL = 'http://192.168.1.179:8080/api';

type LoggedInUser = {
  id?: number;
  username?: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  role?: string;
};

type MembershipData = {
  id?: number;
  has_membership?: boolean;
  status?: string;
  plan_name?: string;
  plan?: string;
  membership_type?: string;
  plan_type?: string;
  start_date?: string;
  end_date?: string;
  expires_at?: string;
  price?: number;
  amount?: number;
  payment_status?: string;
  payment_amount?: number;
  payment_reference?: string;
  reference?: string;
};

type MembershipPlan = {
  id: number;
  name: string;
  plan_type: string;
  price: number;
  duration_days: number;
  description?: string;
  is_active: boolean;
};

export default function MembershipScreen() {
  const router = useRouter();

  const [user, setUser] =
    useState<LoggedInUser | null>(null);

  const [membership, setMembership] =
    useState<MembershipData | null>(null);

  const [plans, setPlans] =
    useState<MembershipPlan[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [plansLoading, setPlansLoading] =
    useState(true);

  const [submitting, setSubmitting] =
    useState(false);

  const loadUser = async () => {
    const storedUser =
      await AsyncStorage.getItem(
        'loggedInUser'
      );

    if (!storedUser) {
      router.replace('/');
      return null;
    }

    const parsedUser: LoggedInUser =
      JSON.parse(storedUser);

    setUser(parsedUser);

    return parsedUser;
  };

  const loadMembership = async (
    currentUser?: LoggedInUser | null
  ) => {
    try {
      const activeUser =
        currentUser || user;

      const username =
        activeUser?.username ||
        activeUser?.email ||
        '';

      if (!username) {
        return;
      }

      const response = await fetch(
        `${API_BASE_URL}/membership/?username=${encodeURIComponent(
          username
        )}`
      );

      const text =
        await response.text();

      console.log(
        'Membership response:',
        response.status,
        text
      );

      if (!response.ok) {
        throw new Error(
          `Membership request failed: ${response.status}`
        );
      }

      const data =
        JSON.parse(text);

      setMembership(
        data.membership ||
          data.data ||
          null
      );
    } catch (error) {
      console.error(
        'Load membership error:',
        error
      );
    }
  };

  const loadPlans = async () => {
    try {
      setPlansLoading(true);

      const response = await fetch(
        `${API_BASE_URL}/membership/plans/`
      );

      const text =
        await response.text();

      console.log(
        'Membership plans response:',
        response.status,
        text
      );

      if (!response.ok) {
        throw new Error(
          `Plans request failed: ${response.status}`
        );
      }

      const data =
        JSON.parse(text);

      setPlans(
        data.plans || []
      );
    } catch (error) {
      console.error(
        'Load membership plans error:',
        error
      );

      Alert.alert(
        'Error',
        'Unable to load membership plans.'
      );
    } finally {
      setPlansLoading(false);
    }
  };

  const loadAll = async () => {
    try {
      setLoading(true);

      const currentUser =
        await loadUser();

      if (currentUser) {
        await Promise.all([
          loadMembership(currentUser),
          loadPlans(),
        ]);
      }
    } catch (error) {
      console.error(
        'Load membership page error:',
        error
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const onRefresh = useCallback(
    async () => {
      try {
        setRefreshing(true);

        const currentUser =
          user || (await loadUser());

        if (currentUser) {
          await Promise.all([
            loadMembership(currentUser),
            loadPlans(),
          ]);
        }
      } finally {
        setRefreshing(false);
      }
    },
    [user]
  );

  const getFullName = () => {
    if (!user) {
      return 'Member';
    }

    const firstName =
      user.first_name || '';

    const lastName =
      user.last_name || '';

    const fullName =
      `${firstName} ${lastName}`.trim();

    return fullName || 'Member';
  };

  const getPlanName = () => {
    return (
      membership?.plan_name ||
      membership?.plan ||
      membership?.membership_type ||
      'No Membership'
    );
  };

  const getStatus = () => {
    return (
      membership?.status ||
      'none'
    ).toLowerCase();
  };

  const getPaymentStatus = () => {
    return (
      membership?.payment_status ||
      'pending'
    ).toLowerCase();
  };

  const formatDate = (
    value?: string
  ) => {
    if (!value) {
      return '—';
    }

    const date =
      new Date(value);

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return value;
    }

    return date.toLocaleDateString(
      'en-US',
      {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }
    );
  };

  const formatPrice = (
    value?: number
  ) => {
    if (
      value === undefined ||
      value === null
    ) {
      return '₱0.00';
    }

    return `₱${Number(
      value
    ).toLocaleString(
      'en-PH',
      {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }
    )}`;
  };

  const formatPlanType = (
    value?: string
  ) => {
    if (!value) {
      return '';
    }

    return (
      value.charAt(0).toUpperCase() +
      value.slice(1)
    );
  };

  const formatDuration = (
    days: number
  ) => {
    if (days === 30) {
      return '1 month';
    }

    if (days === 90) {
      return '3 months';
    }

    if (days === 365) {
      return '1 year';
    }

    return `${days} days`;
  };

  const getStatusStyle = () => {
    switch (getStatus()) {
      case 'active':
        return styles.statusActive;

      case 'expired':
        return styles.statusExpired;

      case 'pending':
        return styles.statusPending;

      case 'cancelled':
        return styles.statusCancelled;

      default:
        return styles.statusNone;
    }
  };

  const getStatusLabel = () => {
    switch (getStatus()) {
      case 'active':
        return 'ACTIVE';

      case 'expired':
        return 'EXPIRED';

      case 'pending':
        return 'PENDING APPROVAL';

      case 'cancelled':
        return 'CANCELLED';

      default:
        return 'NO MEMBERSHIP';
    }
  };

  const hasActiveMembership =
    getStatus() === 'active';

  const hasPendingMembership =
    getStatus() === 'pending';

  const handleSelectPlan = (
    plan: MembershipPlan
  ) => {
    if (hasActiveMembership) {
      Alert.alert(
        'Active Membership',
        'You already have an active membership. You can request another plan after your current membership expires.'
      );

      return;
    }

    if (hasPendingMembership) {
      Alert.alert(
        'Pending Request',
        'You already have a pending membership request. Please wait for admin approval.'
      );

      return;
    }

    Alert.alert(
      'Select Membership Plan',
      `Do you want to request the ${plan.name} plan for ${formatPrice(
        plan.price
      )}?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Request Plan',
          onPress: () =>
            submitMembershipRequest(
              plan
            ),
        },
      ]
    );
  };

  const submitMembershipRequest =
    async (
      plan: MembershipPlan
    ) => {
      try {
        setSubmitting(true);

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

        const currentUser:
          LoggedInUser =
          JSON.parse(
            storedUser
          );

        const username =
          currentUser.username ||
          currentUser.email ||
          '';

        if (!username) {
          Alert.alert(
            'Error',
            'Unable to identify your account.'
          );

          return;
        }

        const response =
          await fetch(
            `${API_BASE_URL}/membership/request/`,
            {
              method: 'POST',
              headers: {
                'Content-Type':
                  'application/json',
              },
              body: JSON.stringify({
                username,
                plan_id: plan.id,
              }),
            }
          );

        const text =
          await response.text();

        console.log(
          'Membership request response:',
          response.status,
          text
        );

        let data: any = {};

        try {
          data =
            JSON.parse(text);
        } catch {
          data = {};
        }

        if (!response.ok) {
          Alert.alert(
            'Request Failed',
            data.error ||
              'Unable to submit your membership request.'
          );

          return;
        }

        Alert.alert(
          'Request Submitted',
          'Your membership plan request has been submitted. Please wait for admin approval.',
          [
            {
              text: 'OK',
              onPress: async () => {
                await loadMembership(
                  currentUser
                );
              },
            },
          ]
        );
      } catch (error) {
        console.error(
          'Membership request error:',
          error
        );

        Alert.alert(
          'Error',
          'Unable to connect to the server.'
        );
      } finally {
        setSubmitting(false);
      }
    };

  const getStatusMessage = () => {
    if (!membership) {
      return 'You currently do not have a membership. Choose a plan below to get started.';
    }

    if (
      getStatus() === 'pending'
    ) {
      return 'Your membership request is waiting for admin approval. You will be notified when your membership is approved.';
    }

    if (
      getStatus() === 'active'
    ) {
      return 'Your membership is currently active. Keep training and stay consistent with your fitness goals.';
    }

    if (
      getStatus() === 'expired'
    ) {
      return 'Your membership has expired. Choose a new membership plan below to continue your fitness journey.';
    }

    if (
      getStatus() === 'cancelled'
    ) {
      return 'Your membership has been cancelled. You may request a new membership plan below.';
    }

    return 'Choose a membership plan below.';
  };

  if (loading) {
    return (
      <View
        style={
          styles.loadingContainer
        }
      >
        <ActivityIndicator
          size="large"
          color="#111827"
        />

        <Text
          style={styles.loadingText}
        >
          Loading membership...
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={
          styles.scrollContent
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
          />
        }
        showsVerticalScrollIndicator={
          false
        }
      >
        {/* HEADER */}
        <View style={styles.header}>
          <Text style={styles.title}>
            My Membership
          </Text>

          <Text style={styles.subtitle}>
            Manage your gym membership and
            choose your preferred plan.
          </Text>
        </View>

        {/* GREETING */}
        <View
          style={styles.greetingCard}
        >
          <Text style={styles.greeting}>
            Hello, {getFullName()} 👋
          </Text>

          <Text
            style={styles.greetingText}
          >
            {getStatusMessage()}
          </Text>
        </View>

        {/* CURRENT MEMBERSHIP */}
        {membership && (
          <>
            <Text
              style={styles.sectionTitle}
            >
              Current Membership
            </Text>

            <View
              style={styles.membershipCard}
            >
              {/* PLAN HEADER */}
              <View
                style={styles.planHeader}
              >
                <Text
                  style={
                    styles.membershipLabel
                  }
                >
                  CURRENT PLAN
                </Text>

                <Text
                  style={
                    styles.membershipPlan
                  }
                  numberOfLines={2}
                >
                  {getPlanName()}
                </Text>
              </View>

              {/* STATUS SECTION */}
              <View
                style={[
                  styles.membershipStatusBox,
                  getStatusStyle(),
                ]}
              >
                <View
                  style={
                    styles.statusIndicator
                  }
                />

                <View
                  style={
                    styles.statusContent
                  }
                >
                  <Text
                    style={
                      styles.statusCaption
                    }
                  >
                    MEMBERSHIP STATUS
                  </Text>

                  <Text
                    style={
                      styles.statusText
                    }
                  >
                    {getStatusLabel()}
                  </Text>
                </View>
              </View>

              {/* PENDING APPROVAL MESSAGE */}
              {hasPendingMembership && (
                <View
                  style={
                    styles.pendingNotice
                  }
                >
                  <Text
                    style={
                      styles.pendingNoticeTitle
                    }
                  >
                    ⏳ Awaiting Admin Approval
                  </Text>

                  <Text
                    style={
                      styles.pendingNoticeText
                    }
                  >
                    Your membership request has
                    been submitted successfully.
                    Please wait while the gym
                    administrator reviews and
                    approves your request.
                  </Text>
                </View>
              )}

              <View
                style={styles.divider}
              />

              {/* DATES */}
              <View
                style={styles.membershipRow}
              >
                <View
                  style={
                    styles.membershipColumn
                  }
                >
                  <Text
                    style={
                      styles.membershipSmallLabel
                    }
                  >
                    START DATE
                  </Text>

                  <Text
                    style={
                      styles.membershipValue
                    }
                  >
                    {formatDate(
                      membership.start_date
                    )}
                  </Text>
                </View>

                <View
                  style={
                    styles.membershipColumn
                  }
                >
                  <Text
                    style={
                      styles.membershipSmallLabel
                    }
                  >
                    END DATE
                  </Text>

                  <Text
                    style={
                      styles.membershipValue
                    }
                  >
                    {formatDate(
                      membership.end_date
                    )}
                  </Text>
                </View>
              </View>

              {/* PLAN DETAILS */}
              <View
                style={styles.membershipRow}
              >
                <View
                  style={
                    styles.membershipColumn
                  }
                >
                  <Text
                    style={
                      styles.membershipSmallLabel
                    }
                  >
                    PLAN TYPE
                  </Text>

                  <Text
                    style={
                      styles.membershipValue
                    }
                  >
                    {formatPlanType(
                      membership.plan_type
                    )}
                  </Text>
                </View>

                <View
                  style={
                    styles.membershipColumn
                  }
                >
                  <Text
                    style={
                      styles.membershipSmallLabel
                    }
                  >
                    PLAN PRICE
                  </Text>

                  <Text
                    style={
                      styles.membershipValue
                    }
                  >
                    {formatPrice(
                      membership.price
                    )}
                  </Text>
                </View>
              </View>
            </View>

            {/* PAYMENT INFORMATION */}
            <View
              style={styles.infoCard}
            >
              <Text
                style={styles.cardTitle}
              >
                Payment Information
              </Text>

              <View
                style={styles.infoRow}
              >
                <Text
                  style={styles.infoLabel}
                >
                  Payment Status
                </Text>

                <Text
                  style={[
                    styles.infoValue,
                    getPaymentStatus() ===
                      'paid'
                      ? styles.paidText
                      : styles.pendingText,
                  ]}
                >
                  {getPaymentStatus()
                    .charAt(0)
                    .toUpperCase() +
                    getPaymentStatus().slice(
                      1
                    )}
                </Text>
              </View>

              <View
                style={styles.infoRow}
              >
                <Text
                  style={styles.infoLabel}
                >
                  Amount
                </Text>

                <Text
                  style={styles.infoValue}
                >
                  {formatPrice(
                    membership.payment_amount ||
                      membership.amount ||
                      membership.price
                  )}
                </Text>
              </View>

              <View
                style={[
                  styles.infoRow,
                  styles.lastInfoRow,
                ]}
              >
                <Text
                  style={styles.infoLabel}
                >
                  Reference
                </Text>

                <Text
                  style={styles.infoValue}
                  numberOfLines={2}
                >
                  {membership.payment_reference ||
                    membership.reference ||
                    'Pending'}
                </Text>
              </View>
            </View>
          </>
        )}

        {/* MEMBERSHIP PLANS */}
        <Text
          style={styles.sectionTitle}
        >
          Choose Your Membership Plan
        </Text>

        <Text
          style={styles.sectionDescription}
        >
          Select the membership plan that
          best fits your fitness goals.
        </Text>

        {plansLoading ? (
          <View
            style={styles.plansLoading}
          >
            <ActivityIndicator
              size="small"
              color="#111827"
            />

            <Text
              style={
                styles.plansLoadingText
              }
            >
              Loading plans...
            </Text>
          </View>
        ) : plans.length === 0 ? (
          <View
            style={styles.emptyCard}
          >
            <Text
              style={styles.emptyTitle}
            >
              No Plans Available
            </Text>

            <Text
              style={styles.emptyText}
            >
              There are currently no active
              membership plans available.
            </Text>
          </View>
        ) : (
          plans.map((plan) => (
            <View
              key={plan.id}
              style={styles.planCard}
            >
              <View
                style={styles.planTopRow}
              >
                <View
                  style={
                    styles.planTitleArea
                  }
                >
                  <Text
                    style={styles.planName}
                  >
                    {plan.name}
                  </Text>

                  <Text
                    style={styles.planType}
                  >
                    {formatPlanType(
                      plan.plan_type
                    )}
                  </Text>
                </View>

                <Text
                  style={styles.planPrice}
                >
                  {formatPrice(
                    plan.price
                  )}
                </Text>
              </View>

              <View
                style={styles.planDivider}
              />

              <View
                style={styles.planDetails}
              >
                <Text
                  style={styles.planDuration}
                >
                  ⏱{' '}
                  {formatDuration(
                    plan.duration_days
                  )}
                </Text>

                {plan.description ? (
                  <Text
                    style={
                      styles.planDescription
                    }
                  >
                    {plan.description}
                  </Text>
                ) : null}
              </View>

              <TouchableOpacity
                style={[
                  styles.selectButton,
                  (
                    hasActiveMembership ||
                    hasPendingMembership ||
                    submitting
                  ) &&
                    styles.disabledButton,
                ]}
                disabled={
                  hasActiveMembership ||
                  hasPendingMembership ||
                  submitting
                }
                onPress={() =>
                  handleSelectPlan(
                    plan
                  )
                }
              >
                {submitting ? (
                  <ActivityIndicator
                    size="small"
                    color="#ffffff"
                  />
                ) : (
                  <Text
                    style={
                      styles.selectButtonText
                    }
                  >
                    {hasActiveMembership
                      ? 'Active Membership'
                      : hasPendingMembership
                      ? 'Request Pending'
                      : 'Select This Plan'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          ))
        )}

        {/* STATUS MESSAGE */}
        <View
          style={styles.statusMessageCard}
        >
          <Text
            style={
              styles.statusMessageTitle
            }
          >
            Membership Status
          </Text>

          <Text
            style={
              styles.statusMessageText
            }
          >
            {getStatusMessage()}
          </Text>
        </View>

        {/* REFRESH */}
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={onRefresh}
          disabled={refreshing}
        >
          <Text
            style={
              styles.refreshButtonText
            }
          >
            {refreshing
              ? 'Refreshing...'
              : 'Refresh Membership'}
          </Text>
        </TouchableOpacity>

        {/* BACK */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() =>
            router.push('/dashboard')
          }
        >
          <Text
            style={styles.backButtonText}
          >
            Back to Dashboard
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },

  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },

  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f3f4f6',
  },

  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: '#6b7280',
  },

  header: {
    marginBottom: 18,
  },

  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
  },

  subtitle: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 21,
    color: '#6b7280',
  },

  greetingCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 18,
    marginBottom: 22,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },

  greeting: {
    fontSize: 19,
    fontWeight: '700',
    color: '#111827',
  },

  greetingText: {
    marginTop: 7,
    fontSize: 14,
    lineHeight: 21,
    color: '#6b7280',
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 8,
  },

  sectionDescription: {
    fontSize: 14,
    lineHeight: 20,
    color: '#6b7280',
    marginBottom: 14,
  },

  membershipCard: {
    backgroundColor: '#111827',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
  },

  /*
    The plan is now on its own row.
    The pending badge no longer shares this row.
  */
  planHeader: {
    width: '100%',
  },

  membershipLabel: {
    color: '#9ca3af',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },

  membershipPlan: {
    marginTop: 7,
    color: '#ffffff',
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '800',
  },

  /*
    Dedicated status container.
    This is the correct location for
    ACTIVE / PENDING APPROVAL / EXPIRED.
  */
  membershipStatusBox: {
    width: '100%',
    minHeight: 62,
    marginTop: 16,
    borderRadius: 13,
    paddingHorizontal: 14,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
  },

  statusActive: {
    backgroundColor: '#166534',
  },

  statusExpired: {
    backgroundColor: '#991b1b',
  },

  statusPending: {
    backgroundColor: '#92400e',
  },

  statusCancelled: {
    backgroundColor: '#4b5563',
  },

  statusNone: {
    backgroundColor: '#374151',
  },

  statusIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#ffffff',
    marginRight: 11,
  },

  statusContent: {
    flex: 1,
    minWidth: 0,
  },

  statusCaption: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.8,
  },

  statusText: {
    color: '#ffffff',
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '900',
    marginTop: 2,
  },

  /*
    Extra explanation shown only when
    membership is waiting for approval.
  */
  pendingNotice: {
    width: '100%',
    backgroundColor: '#fff7ed',
    borderRadius: 13,
    padding: 14,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#fed7aa',
  },

  pendingNoticeTitle: {
    color: '#9a3412',
    fontSize: 13,
    fontWeight: '900',
  },

  pendingNoticeText: {
    color: '#9a3412',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 5,
  },

  divider: {
    height: 1,
    backgroundColor: '#374151',
    marginVertical: 18,
  },

  membershipRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },

  membershipColumn: {
    flex: 1,
    minWidth: 0,
  },

  membershipSmallLabel: {
    color: '#9ca3af',
    fontSize: 10,
    fontWeight: '700',
  },

  membershipValue: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 5,
  },

  infoCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 18,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },

  cardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 14,
  },

  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },

  lastInfoRow: {
    borderBottomWidth: 0,
  },

  infoLabel: {
    fontSize: 14,
    color: '#6b7280',
  },

  infoValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    maxWidth: '55%',
    textAlign: 'right',
  },

  paidText: {
    color: '#15803d',
  },

  pendingText: {
    color: '#b45309',
  },

  plansLoading: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 25,
    alignItems: 'center',
    marginBottom: 18,
  },

  plansLoadingText: {
    marginTop: 8,
    color: '#6b7280',
    fontSize: 14,
  },

  planCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },

  planTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },

  planTitleArea: {
    flex: 1,
    paddingRight: 12,
  },

  planName: {
    fontSize: 21,
    fontWeight: '800',
    color: '#111827',
  },

  planType: {
    marginTop: 4,
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '600',
  },

  planPrice: {
    fontSize: 21,
    fontWeight: '800',
    color: '#111827',
  },

  planDivider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: 15,
  },

  planDetails: {
    marginBottom: 16,
  },

  planDuration: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
  },

  planDescription: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 19,
    color: '#6b7280',
  },

  selectButton: {
    backgroundColor: '#111827',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
  },

  disabledButton: {
    opacity: 0.55,
  },

  selectButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },

  emptyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },

  emptyTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#111827',
  },

  emptyText: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
    color: '#6b7280',
  },

  statusMessageCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 18,
    marginTop: 6,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },

  statusMessageTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
  },

  statusMessageText: {
    marginTop: 7,
    fontSize: 14,
    lineHeight: 21,
    color: '#6b7280',
  },

  refreshButton: {
    backgroundColor: '#111827',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 10,
  },

  refreshButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },

  backButton: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },

  backButtonText: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '800',
  },
});
