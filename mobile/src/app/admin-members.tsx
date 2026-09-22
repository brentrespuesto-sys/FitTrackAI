
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE = 'http://192.168.1.179:8080/api';

type FilterType =
  | 'all'
  | 'active'
  | 'expired'
  | 'pending'
  | 'none';

type Membership = {
  id: number;
  plan_name: string;
  plan_type: string;
  price: number;
  start_date: string;
  end_date: string;
  status: string;
  payment_status: string;
  payment_amount: number;
  payment_reference: string;
};

type Member = {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  role: string;
  membership: Membership | null;
  workout_count?: number;
  attendance_count?: number;
  goal_count?: number;
};

type EditForm = {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
};

type MembershipPlan = {
  id: number;
  name: string;
  plan_type: string;
  price: number;
  duration_days: number;
  description: string;
  is_active: boolean;
};

type MembershipForm = {
  plan_id: string;
  start_date: string;
  payment_status: string;
  payment_reference: string;
};

const filterButtons: {
  value: FilterType;
  label: string;
}[] = [
  { value: 'all', label: 'ALL' },
  { value: 'active', label: 'ACTIVE' },
  { value: 'expired', label: 'EXPIRED' },
  { value: 'pending', label: 'PENDING' },
  { value: 'none', label: 'NO PLAN' },
];

export default function AdminMembersScreen() {
  const [adminUsername, setAdminUsername] = useState('');

  const [members, setMembers] = useState<Member[]>([]);
  const [plans, setPlans] = useState<MembershipPlan[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');

  const [editModalVisible, setEditModalVisible] = useState(false);
  const [membershipModalVisible, setMembershipModalVisible] =
    useState(false);

  const [selectedMember, setSelectedMember] =
    useState<Member | null>(null);

  const [deletingMemberId, setDeletingMemberId] =
    useState<number | null>(null);

  const [editForm, setEditForm] = useState<EditForm>({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
  });

  const [membershipForm, setMembershipForm] =
    useState<MembershipForm>({
      plan_id: '',
      start_date: new Date().toISOString().split('T')[0],
      payment_status: 'paid',
      payment_reference: '',
    });

  const [savingEdit, setSavingEdit] = useState(false);
  const [savingMembership, setSavingMembership] = useState(false);

  const loadAdmin = useCallback(async () => {
    try {
      const storedUser = await AsyncStorage.getItem('loggedInUser');

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
          'Only administrators can access this page.'
        );
        router.replace('/dashboard');
        return;
      }

      setAdminUsername(
        String(user.username || user.email || '')
          .trim()
          .toLowerCase()
      );
    } catch (error) {
      console.error('Load admin error:', error);

      Alert.alert(
        'Error',
        'Unable to load administrator session.'
      );

      router.replace('/');
    }
  }, []);

  const loadData = useCallback(
    async (showLoading = true) => {
      if (!adminUsername) return;

      try {
        if (showLoading) {
          setLoading(true);
        }

        const [membersResponse, plansResponse] =
          await Promise.all([
            fetch(
              `${API_BASE}/admin/members/?username=${encodeURIComponent(
                adminUsername
              )}`
            ),

            fetch(
              `${API_BASE}/admin/membership/?username=${encodeURIComponent(
                adminUsername
              )}`
            ),
          ]);

        const membersData = await membersResponse.json();
        const plansData = await plansResponse.json();

        if (!membersResponse.ok) {
          throw new Error(
            membersData.error ||
              'Failed to load members.'
          );
        }

        if (!plansResponse.ok) {
          throw new Error(
            plansData.error ||
              'Failed to load membership plans.'
          );
        }

        setMembers(
          Array.isArray(membersData.members)
            ? membersData.members
            : []
        );

        setPlans(
          Array.isArray(plansData.plans)
            ? plansData.plans
            : []
        );
      } catch (error: any) {
        console.error(
          'Load admin members error:',
          error
        );

        Alert.alert(
          'Error',
          error?.message ||
            'Unable to load member information.'
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [adminUsername]
  );

  useEffect(() => {
    loadAdmin();
  }, [loadAdmin]);

  useEffect(() => {
    if (adminUsername) {
      loadData();
    }
  }, [adminUsername, loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData(false);
  };

  const openEditModal = (member: Member) => {
    setSelectedMember(member);

    setEditForm({
      first_name: member.first_name || '',
      last_name: member.last_name || '',
      email: member.email || '',
      phone: member.phone || '',
    });

    setEditModalVisible(true);
  };

  const saveMember = async () => {
    if (!selectedMember) return;

    if (!editForm.first_name.trim()) {
      Alert.alert(
        'Required',
        'First name is required.'
      );
      return;
    }

    if (!editForm.last_name.trim()) {
      Alert.alert(
        'Required',
        'Last name is required.'
      );
      return;
    }

    if (!editForm.email.trim()) {
      Alert.alert(
        'Required',
        'Email is required.'
      );
      return;
    }

    try {
      setSavingEdit(true);

      const response = await fetch(
        `${API_BASE}/admin/members/`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            admin_username: adminUsername,
            username: selectedMember.username,
            first_name: editForm.first_name.trim(),
            last_name: editForm.last_name.trim(),
            email: editForm.email.trim(),
            phone: editForm.phone.trim(),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            'Failed to update member.'
        );
      }

      Alert.alert(
        'Success',
        'Member information updated successfully.'
      );

      setEditModalVisible(false);
      setSelectedMember(null);

      await loadData(false);
    } catch (error: any) {
      console.error(
        'Save member error:',
        error
      );

      Alert.alert(
        'Update Failed',
        error?.message ||
          'Unable to update member.'
      );
    } finally {
      setSavingEdit(false);
    }
  };

  const deleteMember = (member: Member) => {
    if (!adminUsername) {
      Alert.alert(
        'Session Error',
        'Administrator session could not be verified.'
      );
      return;
    }

    Alert.alert(
      'Delete Account',
      `Are you sure you want to permanently delete the account for ${member.first_name || ''} ${member.last_name || ''} (@${member.username})?\n\nThis will remove the member account and its related membership, payment, attendance, workout, goal, and notification records.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete Account',
          style: 'destructive',
          onPress: async () => {
            try {
              setDeletingMemberId(member.id);

              const response = await fetch(
                `${API_BASE}/admin/members/`,
                {
                  method: 'DELETE',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    admin_username: adminUsername,
                    member_id: member.id,
                  }),
                }
              );

              const text = await response.text();

              let data: any = {};

              try {
                data = text
                  ? JSON.parse(text)
                  : {};
              } catch {
                data = {};
              }

              if (!response.ok) {
                throw new Error(
                  data.error ||
                    'Failed to delete member account.'
                );
              }

              if (
                selectedMember &&
                selectedMember.id === member.id
              ) {
                setSelectedMember(null);
                setEditModalVisible(false);
                setMembershipModalVisible(false);
              }

              Alert.alert(
                'Account Deleted',
                `${member.username}'s member account has been permanently deleted.`
              );

              await loadData(false);
            } catch (error: any) {
              console.error(
                'Delete member error:',
                error
              );

              Alert.alert(
                'Delete Failed',
                error?.message ||
                  'Unable to delete the member account.'
              );
            } finally {
              setDeletingMemberId(null);
            }
          },
        },
      ]
    );
  };

  const openMembershipModal = (member: Member) => {
    setSelectedMember(member);

    const existingPlanId = member.membership
      ? plans.find(
          (plan) =>
            plan.name ===
            member.membership?.plan_name
        )?.id
      : undefined;

    setMembershipForm({
      plan_id: existingPlanId
        ? String(existingPlanId)
        : '',

      start_date:
        member.membership?.start_date ||
        new Date().toISOString().split('T')[0],

      payment_status:
        member.membership?.payment_status ||
        'paid',

      payment_reference:
        member.membership?.payment_reference ||
        '',
    });

    setMembershipModalVisible(true);
  };

  const saveMembership = async () => {
    if (!selectedMember) {
      Alert.alert(
        'Member Required',
        'Please select a member before saving the membership.'
      );
      return;
    }

    const memberId = Number(selectedMember.id);

    const memberUsername = String(
      selectedMember.username || ''
    )
      .trim()
      .toLowerCase();

    if (!memberId && !memberUsername) {
      console.error(
        'Membership save blocked: selected member has no ID or username.',
        selectedMember
      );

      Alert.alert(
        'Member Information Missing',
        'The selected member does not have a valid member ID or username. Please refresh the member list and try again.'
      );

      return;
    }

    if (!membershipForm.plan_id) {
      Alert.alert(
        'Required',
        'Please select a membership plan.'
      );
      return;
    }

    if (!membershipForm.start_date.trim()) {
      Alert.alert(
        'Required',
        'Please enter a start date.'
      );
      return;
    }

    try {
      setSavingMembership(true);

      const requestBody = {
        admin_username: adminUsername,

        member_id: memberId || undefined,

        member_username:
          memberUsername || undefined,

        username: memberUsername || undefined,

        plan_id: Number(
          membershipForm.plan_id
        ),

        start_date:
          membershipForm.start_date.trim(),

        payment_status:
          membershipForm.payment_status,

        payment_reference:
          membershipForm.payment_reference.trim(),
      };

      console.log(
        'Saving membership request:',
        requestBody
      );

      const response = await fetch(
        `${API_BASE}/admin/membership/`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(
            requestBody
          ),
        }
      );

      const data = await response.json();

      console.log(
        'Save membership response:',
        data
      );

      if (!response.ok) {
        throw new Error(
          data.error ||
            'Failed to save membership.'
        );
      }

      Alert.alert(
        'Success',
        'Membership has been assigned successfully.'
      );

      setMembershipModalVisible(false);
      setSelectedMember(null);

      await loadData(false);
    } catch (error: any) {
      console.error(
        'Save membership error:',
        error
      );

      Alert.alert(
        'Membership Failed',
        error?.message ||
          'Unable to save membership.'
      );
    } finally {
      setSavingMembership(false);
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem(
        'loggedInUser'
      );

      router.replace('/');
    } catch (error) {
      console.error(
        'Logout error:',
        error
      );
    }
  };

  const getMembershipStatus = (
    member: Member
  ): string => {
    if (!member.membership) {
      return 'none';
    }

    return String(
      member.membership.status || ''
    ).toLowerCase();
  };

  const filteredMembers = members.filter(
    (member) => {
      const searchText =
        search.trim().toLowerCase();

      const fullName =
        `${member.first_name || ''} ${
          member.last_name || ''
        }`.trim();

      const matchesSearch =
        !searchText ||
        fullName
          .toLowerCase()
          .includes(searchText) ||
        String(member.username || '')
          .toLowerCase()
          .includes(searchText) ||
        String(member.email || '')
          .toLowerCase()
          .includes(searchText) ||
        String(member.phone || '')
          .toLowerCase()
          .includes(searchText);

      const membershipStatus =
        getMembershipStatus(member);

      const matchesFilter =
        filter === 'all' ||
        membershipStatus === filter;

      return (
        matchesSearch &&
        matchesFilter
      );
    }
  );

  const formatDate = (
    dateString?: string
  ) => {
    if (!dateString) return '—';

    const date = new Date(dateString);

    if (Number.isNaN(date.getTime())) {
      return dateString;
    }

    return date.toLocaleDateString(
      'en-US',
      {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }
    );
  };

  const formatCurrency = (
    value?: number
  ) => {
    const amount = Number(
      value || 0
    );

    return `₱${amount.toLocaleString(
      'en-PH',
      {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }
    )}`;
  };

  const getStatusColor = (
    status: string
  ) => {
    switch (
      status.toLowerCase()
    ) {
      case 'active':
        return '#1f8f4d';

      case 'expired':
        return '#c0392b';

      case 'pending':
        return '#c98200';

      default:
        return '#666';
    }
  };

  const getStatusBackground = (
    status: string
  ) => {
    switch (
      status.toLowerCase()
    ) {
      case 'active':
        return '#e7f7ed';

      case 'expired':
        return '#fdecea';

      case 'pending':
        return '#fff5dd';

      default:
        return '#eeeeee';
    }
  };

  const renderMember = ({
    item,
  }: {
    item: Member;
  }) => {
    const membership =
      item.membership;

    const status =
      getMembershipStatus(item);

    const fullName =
      `${item.first_name || ''} ${
        item.last_name || ''
      }`.trim() ||
      'Unnamed Member';

    const isDeleting =
      deletingMemberId === item.id;

    return (
      <View style={styles.memberCard}>
        <View style={styles.memberHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(
                item.first_name?.charAt(0) ||
                item.username?.charAt(0) ||
                'M'
              ).toUpperCase()}
            </Text>
          </View>

          <View style={styles.memberIdentity}>
            <Text
              style={styles.memberName}
              numberOfLines={1}
            >
              {fullName}
            </Text>

            <Text
              style={styles.memberUsername}
              numberOfLines={1}
            >
              @{item.username}
            </Text>
          </View>

          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor:
                  getStatusBackground(
                    status
                  ),
              },
            ]}
          >
            <Text
              style={[
                styles.statusText,
                {
                  color:
                    getStatusColor(
                      status
                    ),
                },
              ]}
            >
              {status === 'none'
                ? 'NO PLAN'
                : status.toUpperCase()}
            </Text>
          </View>
        </View>

        <View style={styles.memberInfo}>
          <Text
            style={styles.infoText}
            numberOfLines={1}
          >
            {item.email || 'No email'}
          </Text>

          <Text
            style={styles.infoText}
            numberOfLines={1}
          >
            {item.phone ||
              'No phone number'}
          </Text>
        </View>

        {membership ? (
          <View style={styles.membershipBox}>
            <View
              style={
                styles.membershipTopRow
              }
            >
              <View
                style={
                  styles.membershipInfo
                }
              >
                <Text
                  style={
                    styles.membershipLabel
                  }
                >
                  MEMBERSHIP
                </Text>

                <Text
                  style={
                    styles.membershipPlan
                  }
                  numberOfLines={1}
                >
                  {membership.plan_name}
                </Text>
              </View>

              <Text
                style={
                  styles.membershipPrice
                }
              >
                {formatCurrency(
                  membership.price
                )}
              </Text>
            </View>

            <View
              style={styles.dateRow}
            >
              <View
                style={
                  styles.dateColumn
                }
              >
                <Text
                  style={
                    styles.dateLabel
                  }
                >
                  START
                </Text>

                <Text
                  style={
                    styles.dateValue
                  }
                >
                  {formatDate(
                    membership.start_date
                  )}
                </Text>
              </View>

              <View
                style={
                  styles.dateColumn
                }
              >
                <Text
                  style={
                    styles.dateLabel
                  }
                >
                  END
                </Text>

                <Text
                  style={
                    styles.dateValue
                  }
                >
                  {formatDate(
                    membership.end_date
                  )}
                </Text>
              </View>

              <View
                style={
                  styles.dateColumn
                }
              >
                <Text
                  style={
                    styles.dateLabel
                  }
                >
                  PAYMENT
                </Text>

                <Text
                  style={
                    styles.dateValue
                  }
                >
                  {String(
                    membership.payment_status ||
                      'pending'
                  ).toUpperCase()}
                </Text>
              </View>
            </View>
          </View>
        ) : (
          <View
            style={
              styles.noMembershipBox
            }
          >
            <Text
              style={
                styles.noMembershipText
              }
            >
              No membership plan assigned
            </Text>
          </View>
        )}

        <View
          style={styles.statsRow}
        >
          <View
            style={styles.statItem}
          >
            <Text
              style={styles.statNumber}
            >
              {item.workout_count || 0}
            </Text>

            <Text
              style={styles.statLabel}
            >
              WORKOUTS
            </Text>
          </View>

          <View
            style={styles.statDivider}
          />

          <View
            style={styles.statItem}
          >
            <Text
              style={styles.statNumber}
            >
              {item.attendance_count || 0}
            </Text>

            <Text
              style={styles.statLabel}
            >
              ATTENDANCE
            </Text>
          </View>

          <View
            style={styles.statDivider}
          />

          <View
            style={styles.statItem}
          >
            <Text
              style={styles.statNumber}
            >
              {item.goal_count || 0}
            </Text>

            <Text
              style={styles.statLabel}
            >
              GOALS
            </Text>
          </View>
        </View>

        <View
          style={styles.actionRow}
        >
          <TouchableOpacity
            style={styles.editButton}
            onPress={() =>
              openEditModal(item)
            }
            disabled={isDeleting}
            activeOpacity={0.8}
          >
            <Text
              style={styles.editButtonText}
            >
              Edit Member
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={
              styles.membershipButton
            }
            onPress={() =>
              openMembershipModal(item)
            }
            disabled={isDeleting}
            activeOpacity={0.8}
          >
            <Text
              style={
                styles.membershipButtonText
              }
            >
              {membership
                ? 'Manage Membership'
                : 'Assign Membership'}
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[
            styles.deleteButton,
            isDeleting &&
              styles.deleteButtonDisabled,
          ]}
          onPress={() =>
            deleteMember(item)
          }
          disabled={isDeleting}
          activeOpacity={0.8}
        >
          {isDeleting ? (
            <View
              style={
                styles.deleteLoadingContent
              }
            >
              <ActivityIndicator
                size="small"
                color="#fff"
              />

              <Text
                style={
                  styles.deleteButtonText
                }
              >
                Deleting...
              </Text>
            </View>
          ) : (
            <Text
              style={
                styles.deleteButtonText
              }
            >
              Delete Account
            </Text>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView
        style={styles.loadingScreen}
      >
        <ActivityIndicator
          size="large"
          color="#111"
        />

        <Text
          style={styles.loadingText}
        >
          Loading members...
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={styles.container}
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>
            Member Management
          </Text>

          <Text
            style={styles.headerSubtitle}
          >
            Manage gym members and memberships
          </Text>
        </View>

        <TouchableOpacity
          style={styles.logoutButton}
          onPress={logout}
          activeOpacity={0.8}
        >
          <Text
            style={styles.logoutText}
          >
            Logout
          </Text>
        </TouchableOpacity>
      </View>

      <View
        style={styles.searchContainer}
      >
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search members..."
          placeholderTextColor="#888"
          style={styles.searchInput}
          autoCapitalize="none"
          clearButtonMode="while-editing"
        />
      </View>

      <View style={styles.filterBar}>
        {filterButtons.map(
          ({ value, label }) => (
            <TouchableOpacity
              key={value}
              style={[
                styles.filterButton,
                filter === value &&
                  styles.filterButtonActive,
              ]}
              onPress={() =>
                setFilter(value)
              }
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.filterText,
                  filter === value &&
                    styles.filterTextActive,
                ]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.75}
              >
                {label}
              </Text>
            </TouchableOpacity>
          )
        )}
      </View>

      <View
        style={styles.resultRow}
      >
        <Text
          style={styles.resultText}
        >
          {filteredMembers.length}{' '}
          member
          {filteredMembers.length !==
          1
            ? 's'
            : ''}
        </Text>

        <Text
          style={styles.resultText}
        >
          {filter === 'all'
            ? 'All members'
            : filter === 'none'
            ? 'No plan'
            : `${
                filter.charAt(0).toUpperCase() +
                filter.slice(1)
              } memberships`}
        </Text>
      </View>

      <FlatList
        data={filteredMembers}
        keyExtractor={(item) =>
          String(item.id)
        }
        renderItem={renderMember}
        contentContainerStyle={
          styles.listContent
        }
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
          />
        }
        ListEmptyComponent={
          <View
            style={styles.emptyContainer}
          >
            <Text
              style={styles.emptyTitle}
            >
              No members found
            </Text>

            <Text
              style={styles.emptyText}
            >
              Try changing your search or
              membership filter.
            </Text>
          </View>
        }
      />

      {/* EDIT MEMBER MODAL */}
      <Modal
        visible={editModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() =>
          setEditModalVisible(false)
        }
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={
            Platform.OS === 'ios'
              ? 'padding'
              : undefined
          }
        >
          <View
            style={styles.modalCard}
          >
            <ScrollView
              showsVerticalScrollIndicator={
                false
              }
              keyboardShouldPersistTaps="handled"
            >
              <View
                style={styles.modalHeader}
              >
                <View>
                  <Text
                    style={
                      styles.modalTitle
                    }
                  >
                    Edit Member
                  </Text>

                  <Text
                    style={
                      styles.modalSubtitle
                    }
                  >
                    Update member information
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={() =>
                    setEditModalVisible(
                      false
                    )
                  }
                >
                  <Text
                    style={
                      styles.closeButton
                    }
                  >
                    ×
                  </Text>
                </TouchableOpacity>
              </View>

              <Text
                style={styles.inputLabel}
              >
                First Name
              </Text>

              <TextInput
                value={
                  editForm.first_name
                }
                onChangeText={(value) =>
                  setEditForm(
                    (previous) => ({
                      ...previous,
                      first_name: value,
                    })
                  )
                }
                style={styles.input}
                placeholder="First name"
                placeholderTextColor="#999"
              />

              <Text
                style={styles.inputLabel}
              >
                Last Name
              </Text>

              <TextInput
                value={
                  editForm.last_name
                }
                onChangeText={(value) =>
                  setEditForm(
                    (previous) => ({
                      ...previous,
                      last_name: value,
                    })
                  )
                }
                style={styles.input}
                placeholder="Last name"
                placeholderTextColor="#999"
              />

              <Text
                style={styles.inputLabel}
              >
                Email
              </Text>

              <TextInput
                value={editForm.email}
                onChangeText={(value) =>
                  setEditForm(
                    (previous) => ({
                      ...previous,
                      email: value,
                    })
                  )
                }
                style={styles.input}
                placeholder="Email"
                placeholderTextColor="#999"
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <Text
                style={styles.inputLabel}
              >
                Phone
              </Text>

              <TextInput
                value={editForm.phone}
                onChangeText={(value) =>
                  setEditForm(
                    (previous) => ({
                      ...previous,
                      phone: value,
                    })
                  )
                }
                style={styles.input}
                placeholder="Phone number"
                placeholderTextColor="#999"
                keyboardType="phone-pad"
              />

              <TouchableOpacity
                style={
                  styles.primaryButton
                }
                onPress={saveMember}
                disabled={savingEdit}
                activeOpacity={0.8}
              >
                {savingEdit ? (
                  <ActivityIndicator
                    color="#fff"
                  />
                ) : (
                  <Text
                    style={
                      styles.primaryButtonText
                    }
                  >
                    Save Changes
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={
                  styles.cancelButton
                }
                onPress={() =>
                  setEditModalVisible(
                    false
                  )
                }
                activeOpacity={0.8}
              >
                <Text
                  style={
                    styles.cancelButtonText
                  }
                >
                  Cancel
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* MEMBERSHIP MODAL */}
      <Modal
        visible={membershipModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() =>
          setMembershipModalVisible(
            false
          )
        }
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={
            Platform.OS === 'ios'
              ? 'padding'
              : undefined
          }
        >
          <View
            style={styles.modalCard}
          >
            <ScrollView
              showsVerticalScrollIndicator={
                false
              }
              keyboardShouldPersistTaps="handled"
            >
              <View
                style={styles.modalHeader}
              >
                <View>
                  <Text
                    style={
                      styles.modalTitle
                    }
                  >
                    Membership
                  </Text>

                  <Text
                    style={
                      styles.modalSubtitle
                    }
                  >
                    Assign or renew a membership
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={() =>
                    setMembershipModalVisible(
                      false
                    )
                  }
                >
                  <Text
                    style={
                      styles.closeButton
                    }
                  >
                    ×
                  </Text>
                </TouchableOpacity>
              </View>

              {selectedMember && (
                <View
                  style={
                    styles.selectedMemberBox
                  }
                >
                  <Text
                    style={
                      styles.selectedMemberName
                    }
                  >
                    {
                      selectedMember.first_name
                    }{' '}
                    {
                      selectedMember.last_name
                    }
                  </Text>

                  <Text
                    style={
                      styles.selectedMemberUsername
                    }
                  >
                    @{selectedMember.username}
                  </Text>
                </View>
              )}

              <Text
                style={styles.inputLabel}
              >
                Membership Plan
              </Text>

              <View
                style={styles.planList}
              >
                {plans.length === 0 ? (
                  <View
                    style={
                      styles.noPlansBox
                    }
                  >
                    <Text
                      style={
                        styles.noPlansText
                      }
                    >
                      No active membership
                      plans available.
                    </Text>
                  </View>
                ) : (
                  plans.map((plan) => {
                    const selected =
                      membershipForm.plan_id ===
                      String(plan.id);

                    return (
                      <TouchableOpacity
                        key={plan.id}
                        style={[
                          styles.planCard,
                          selected &&
                            styles.planCardSelected,
                        ]}
                        onPress={() =>
                          setMembershipForm(
                            (
                              previous
                            ) => ({
                              ...previous,
                              plan_id:
                                String(
                                  plan.id
                                ),
                            })
                          )
                        }
                        activeOpacity={0.8}
                      >
                        <View
                          style={
                            styles.planCardTop
                          }
                        >
                          <View
                            style={
                              styles.planTextContainer
                            }
                          >
                            <Text
                              style={[
                                styles.planName,
                                selected &&
                                  styles.planNameSelected,
                              ]}
                              numberOfLines={1}
                            >
                              {plan.name}
                            </Text>

                            <Text
                              style={[
                                styles.planDescription,
                                selected &&
                                  styles.planDescriptionSelected,
                              ]}
                              numberOfLines={2}
                            >
                              {plan.description ||
                                `${
                                  plan.duration_days
                                } day membership`}
                            </Text>
                          </View>

                          <Text
                            style={[
                              styles.planPrice,
                              selected &&
                                styles.planPriceSelected,
                            ]}
                          >
                            {formatCurrency(
                              plan.price
                            )}
                          </Text>
                        </View>

                        <Text
                          style={[
                            styles.planDuration,
                            selected &&
                              styles.planDurationSelected,
                          ]}
                        >
                          {plan.duration_days}{' '}
                          days
                        </Text>
                      </TouchableOpacity>
                    );
                  })
                )}
              </View>

              <Text
                style={styles.inputLabel}
              >
                Start Date
              </Text>

              <TextInput
                value={
                  membershipForm.start_date
                }
                onChangeText={(value) =>
                  setMembershipForm(
                    (previous) => ({
                      ...previous,
                      start_date: value,
                    })
                  )
                }
                style={styles.input}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#999"
              />

              <Text
                style={styles.inputLabel}
              >
                Payment Status
              </Text>

              <View
                style={
                  styles.paymentStatusRow
                }
              >
                {[
                  'paid',
                  'pending',
                  'failed',
                ].map((status) => (
                  <TouchableOpacity
                    key={status}
                    style={[
                      styles.paymentStatusButton,
                      membershipForm.payment_status ===
                        status &&
                        styles.paymentStatusButtonActive,
                    ]}
                    onPress={() =>
                      setMembershipForm(
                        (
                          previous
                        ) => ({
                          ...previous,
                          payment_status:
                            status,
                        })
                      )
                    }
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.paymentStatusText,
                        membershipForm.payment_status ===
                          status &&
                          styles.paymentStatusTextActive,
                      ]}
                    >
                      {status.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text
                style={styles.inputLabel}
              >
                Payment Reference
              </Text>

              <TextInput
                value={
                  membershipForm.payment_reference
                }
                onChangeText={(value) =>
                  setMembershipForm(
                    (previous) => ({
                      ...previous,
                      payment_reference:
                        value,
                    })
                  )
                }
                style={styles.input}
                placeholder="Optional reference number"
                placeholderTextColor="#999"
              />

              <TouchableOpacity
                style={
                  styles.primaryButton
                }
                onPress={
                  saveMembership
                }
                disabled={savingMembership}
                activeOpacity={0.8}
              >
                {savingMembership ? (
                  <ActivityIndicator
                    color="#fff"
                  />
                ) : (
                  <Text
                    style={
                      styles.primaryButtonText
                    }
                  >
                    Save Membership
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={
                  styles.cancelButton
                }
                onPress={() =>
                  setMembershipModalVisible(
                    false
                  )
                }
                activeOpacity={0.8}
              >
                <Text
                  style={
                    styles.cancelButtonText
                  }
                >
                  Cancel
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fb',
  },

  loadingScreen: {
    flex: 1,
    backgroundColor: '#f5f7fb',
    justifyContent: 'center',
    alignItems: 'center',
  },

  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#555',
  },

  header: {
    minHeight: 82,
    paddingHorizontal: 18,
    paddingVertical: 14,
    backgroundColor: '#111',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  headerTitle: {
    color: '#fff',
    fontSize: 21,
    fontWeight: '800',
  },

  headerSubtitle: {
    color: '#bbb',
    fontSize: 12,
    marginTop: 3,
  },

  logoutButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#2a2a2a',
  },

  logoutText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },

  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 8,
  },

  searchInput: {
    height: 46,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e3e8',
    borderRadius: 12,
    paddingHorizontal: 15,
    fontSize: 14,
    color: '#111',
  },

  filterBar: {
    height: 58,
    width: '100%',
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f7fb',
  },

  filterButton: {
    flex: 1,
    height: 40,
    marginHorizontal: 2,
    paddingHorizontal: 2,
    borderRadius: 20,
    backgroundColor: '#e1e4e8',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'visible',
  },

  filterButtonActive: {
    backgroundColor: '#111',
  },

  filterText: {
    color: '#333',
    fontSize: 10,
    fontWeight: '800',
    textAlign: 'center',
    includeFontPadding: false,
  },

  filterTextActive: {
    color: '#fff',
  },

  resultRow: {
    paddingHorizontal: 18,
    paddingTop: 2,
    paddingBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  resultText: {
    color: '#777',
    fontSize: 11,
    fontWeight: '600',
  },

  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 30,
  },

  memberCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 15,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#e7e9ed',
  },

  memberHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#111',
    justifyContent: 'center',
    alignItems: 'center',
  },

  avatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
  },

  memberIdentity: {
    flex: 1,
    minWidth: 0,
    marginLeft: 11,
    marginRight: 8,
  },

  memberName: {
    color: '#111',
    fontSize: 16,
    fontWeight: '800',
  },

  memberUsername: {
    color: '#777',
    fontSize: 12,
    marginTop: 2,
  },

  statusBadge: {
    flexShrink: 0,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 14,
    maxWidth: 100,
  },

  statusText: {
    fontSize: 9,
    fontWeight: '900',
    textAlign: 'center',
  },

  memberInfo: {
    marginTop: 12,
    gap: 4,
  },

  infoText: {
    color: '#666',
    fontSize: 12,
  },

  membershipBox: {
    marginTop: 13,
    backgroundColor: '#f7f8fa',
    borderRadius: 12,
    padding: 12,
  },

  membershipTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  membershipInfo: {
    flex: 1,
    minWidth: 0,
    marginRight: 8,
  },

  membershipLabel: {
    color: '#888',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.6,
  },

  membershipPlan: {
    color: '#111',
    fontSize: 14,
    fontWeight: '800',
    marginTop: 3,
  },

  membershipPrice: {
    color: '#111',
    fontSize: 14,
    fontWeight: '800',
  },

  dateRow: {
    marginTop: 12,
    flexDirection: 'row',
  },

  dateColumn: {
    flex: 1,
  },

  dateLabel: {
    color: '#999',
    fontSize: 8,
    fontWeight: '800',
  },

  dateValue: {
    color: '#333',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 3,
  },

  noMembershipBox: {
    marginTop: 13,
    backgroundColor: '#f2f2f2',
    borderRadius: 12,
    padding: 12,
  },

  noMembershipText: {
    color: '#777',
    fontSize: 12,
    fontWeight: '600',
  },

  statsRow: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },

  statItem: {
    flex: 1,
    alignItems: 'center',
  },

  statNumber: {
    color: '#111',
    fontSize: 16,
    fontWeight: '800',
  },

  statLabel: {
    color: '#999',
    fontSize: 8,
    fontWeight: '800',
    marginTop: 2,
  },

  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: '#e3e3e3',
  },

  actionRow: {
    marginTop: 14,
    flexDirection: 'row',
    gap: 8,
  },

  editButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: 10,
    backgroundColor: '#eeeeee',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },

  editButtonText: {
    color: '#222',
    fontSize: 11,
    fontWeight: '800',
    textAlign: 'center',
  },

  membershipButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: 10,
    backgroundColor: '#111',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },

  membershipButtonText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
    textAlign: 'center',
  },

  deleteButton: {
    minHeight: 42,
    borderRadius: 10,
    backgroundColor: '#c0392b',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 10,
    marginTop: 9,
  },

  deleteButtonDisabled: {
    backgroundColor: '#999',
  },

  deleteButtonText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
    textAlign: 'center',
  },

  deleteLoadingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  emptyContainer: {
    paddingVertical: 60,
    alignItems: 'center',
  },

  emptyTitle: {
    color: '#333',
    fontSize: 17,
    fontWeight: '800',
  },

  emptyText: {
    color: '#888',
    fontSize: 12,
    marginTop: 6,
    textAlign: 'center',
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },

  modalCard: {
    width: '100%',
    maxHeight: '90%',
    backgroundColor: '#fff',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 28,
  },

  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 18,
  },

  modalTitle: {
    color: '#111',
    fontSize: 21,
    fontWeight: '800',
  },

  modalSubtitle: {
    color: '#888',
    fontSize: 12,
    marginTop: 3,
  },

  closeButton: {
    color: '#555',
    fontSize: 30,
    lineHeight: 30,
    fontWeight: '300',
  },

  inputLabel: {
    color: '#333',
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 6,
    marginTop: 11,
  },

  input: {
    height: 46,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 13,
    color: '#111',
    fontSize: 14,
    backgroundColor: '#fafafa',
  },

  primaryButton: {
    height: 48,
    borderRadius: 11,
    backgroundColor: '#111',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },

  primaryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },

  cancelButton: {
    height: 46,
    borderRadius: 11,
    backgroundColor: '#eeeeee',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 9,
  },

  cancelButtonText: {
    color: '#333',
    fontSize: 14,
    fontWeight: '800',
  },

  selectedMemberBox: {
    backgroundColor: '#f5f6f8',
    borderRadius: 11,
    padding: 12,
    marginBottom: 4,
  },

  selectedMemberName: {
    color: '#111',
    fontSize: 15,
    fontWeight: '800',
  },

  selectedMemberUsername: {
    color: '#777',
    fontSize: 11,
    marginTop: 2,
  },

  planList: {
    gap: 9,
  },

  planCard: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 12,
    backgroundColor: '#fff',
  },

  planCardSelected: {
    backgroundColor: '#111',
    borderColor: '#111',
  },

  planCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  planTextContainer: {
    flex: 1,
    minWidth: 0,
    marginRight: 8,
  },

  planName: {
    color: '#111',
    fontSize: 14,
    fontWeight: '800',
  },

  planNameSelected: {
    color: '#fff',
  },

  planDescription: {
    color: '#777',
    fontSize: 10,
    marginTop: 3,
  },

  planDescriptionSelected: {
    color: '#ccc',
  },

  planPrice: {
    color: '#111',
    fontSize: 14,
    fontWeight: '900',
  },

  planPriceSelected: {
    color: '#fff',
  },

  planDuration: {
    color: '#888',
    fontSize: 10,
    marginTop: 8,
    fontWeight: '700',
  },

  planDurationSelected: {
    color: '#ccc',
  },

  noPlansBox: {
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    padding: 14,
  },

  noPlansText: {
    color: '#777',
    fontSize: 12,
  },

  paymentStatusRow: {
    flexDirection: 'row',
    gap: 7,
  },

  paymentStatusButton: {
    flex: 1,
    height: 40,
    borderRadius: 9,
    backgroundColor: '#eeeeee',
    justifyContent: 'center',
    alignItems: 'center',
  },

  paymentStatusButtonActive: {
    backgroundColor: '#111',
  },

  paymentStatusText: {
    color: '#555',
    fontSize: 10,
    fontWeight: '800',
  },

  paymentStatusTextActive: {
    color: '#fff',
  },
});

