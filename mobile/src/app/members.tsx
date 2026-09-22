import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';

const API_BASE = 'http://192.168.1.179:8080/api';

type Member = {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  phone: string;
  address: string;
  date_of_birth: string | null;
  profile_picture: string;
  is_active: boolean;
  date_joined: string;

  membership: {
    status: string;
    plan_name: string;
    end_date: string | null;
    payment_status: string;
  };

  activity: {
    attendance_count: number;
    workout_count: number;
    goal_count: number;
    completed_goal_count: number;
  };
};

type AdminUser = {
  id?: number;
  username?: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  role?: string;
};

type FilterType =
  | 'all'
  | 'active'
  | 'expired'
  | 'pending'
  | 'none';

export default function MembersScreen() {
  const router = useRouter();

  const [adminUser, setAdminUser] =
    useState<AdminUser | null>(null);

  const [members, setMembers] =
    useState<Member[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [search, setSearch] =
    useState('');

  const [filter, setFilter] =
    useState<FilterType>('all');

  const [selectedMember, setSelectedMember] =
    useState<Member | null>(null);

  const [editing, setEditing] =
    useState(false);

  const [saving, setSaving] =
    useState(false);

  const [firstName, setFirstName] =
    useState('');

  const [lastName, setLastName] =
    useState('');

  const [email, setEmail] =
    useState('');

  const [phone, setPhone] =
    useState('');

  const [address, setAddress] =
    useState('');

  const loadMembers = useCallback(
    async () => {
      try {
        const storedUser =
          await AsyncStorage.getItem(
            'loggedInUser'
          );

        if (!storedUser) {
          Alert.alert(
            'Session Expired',
            'Please log in again.',
            [
              {
                text: 'OK',
                onPress: () =>
                  router.replace('/'),
              },
            ]
          );

          return;
        }

        const parsedUser: AdminUser =
          JSON.parse(storedUser);

        setAdminUser(parsedUser);

        const username = String(
          parsedUser.username ||
          parsedUser.email ||
          ''
        )
          .trim()
          .toLowerCase();

        const role = String(
          parsedUser.role || ''
        )
          .trim()
          .toLowerCase();

        if (!username) {
          throw new Error(
            'Admin username was not found.'
          );
        }

        if (role !== 'admin') {
          throw new Error(
            'Admin access required.'
          );
        }

        const url =
          `${API_BASE}/admin/members/` +
          `?username=${encodeURIComponent(
            username
          )}`;

        console.log(
          'ADMIN MEMBERS URL:',
          url
        );

        const response =
          await fetch(url);

        const responseText =
          await response.text();

        console.log(
          'ADMIN MEMBERS STATUS:',
          response.status
        );

        console.log(
          'ADMIN MEMBERS RESPONSE:',
          responseText
        );

        let data: any = {};

        try {
          data = JSON.parse(
            responseText
          );
        } catch {
          throw new Error(
            `Server returned an invalid response. HTTP ${response.status}`
          );
        }

        if (!response.ok) {
          throw new Error(
            data.error ||
            `Unable to load members. HTTP ${response.status}`
          );
        }

        setMembers(
          Array.isArray(data.members)
            ? data.members
            : []
        );
      } catch (error: any) {
        console.error(
          'ADMIN MEMBERS ERROR:',
          error
        );

        Alert.alert(
          'Members Error',
          error?.message ||
            'Unable to load members.'
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [router]
  );

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadMembers();
  };

  const filteredMembers = useMemo(() => {
    let result = [...members];

    if (search.trim()) {
      const searchText =
        search.trim().toLowerCase();

      result = result.filter(
        (member) =>
          member.full_name
            .toLowerCase()
            .includes(searchText) ||
          member.username
            .toLowerCase()
            .includes(searchText) ||
          member.email
            .toLowerCase()
            .includes(searchText) ||
          member.phone
            .toLowerCase()
            .includes(searchText)
      );
    }

    if (filter !== 'all') {
      result = result.filter(
        (member) =>
          member.membership.status ===
          filter
      );
    }

    return result;
  }, [
    members,
    search,
    filter,
  ]);

  const openMember = (
    member: Member
  ) => {
    setSelectedMember(member);

    setFirstName(
      member.first_name || ''
    );

    setLastName(
      member.last_name || ''
    );

    setEmail(
      member.email || ''
    );

    setPhone(
      member.phone || ''
    );

    setAddress(
      member.address || ''
    );

    setEditing(false);
  };

  const closeMember = () => {
    setSelectedMember(null);
    setEditing(false);
  };

  const saveMember = async () => {
    if (!selectedMember) {
      return;
    }

    if (!adminUser?.username) {
      Alert.alert(
        'Error',
        'Admin session information is missing.'
      );

      return;
    }

    if (!email.trim()) {
      Alert.alert(
        'Email Required',
        'Please enter the member email.'
      );

      return;
    }

    try {
      setSaving(true);

      const response =
        await fetch(
          `${API_BASE}/admin/members/`,
          {
            method: 'PATCH',
            headers: {
              'Content-Type':
                'application/json',
            },
            body: JSON.stringify({
              admin_username:
                adminUser.username,

              member_id:
                selectedMember.id,

              first_name:
                firstName.trim(),

              last_name:
                lastName.trim(),

              email:
                email.trim().toLowerCase(),

              phone:
                phone.trim(),

              address:
                address.trim(),
            }),
          }
        );

      const responseText =
        await response.text();

      let data: any = {};

      try {
        data = JSON.parse(
          responseText
        );
      } catch {
        throw new Error(
          `Invalid server response. HTTP ${response.status}`
        );
      }

      if (!response.ok) {
        throw new Error(
          data.error ||
          'Unable to update member.'
        );
      }

      Alert.alert(
        'Success',
        'Member information updated successfully.'
      );

      setEditing(false);

      await loadMembers();

      const updatedMember =
        data.member;

      if (updatedMember) {
        setSelectedMember(
          updatedMember
        );

        setFirstName(
          updatedMember.first_name ||
            ''
        );

        setLastName(
          updatedMember.last_name ||
            ''
        );

        setEmail(
          updatedMember.email ||
            ''
        );

        setPhone(
          updatedMember.phone ||
            ''
        );

        setAddress(
          updatedMember.address ||
            ''
        );
      }
    } catch (error: any) {
      console.error(
        'UPDATE MEMBER ERROR:',
        error
      );

      Alert.alert(
        'Update Failed',
        error?.message ||
          'Unable to update member.'
      );
    } finally {
      setSaving(false);
    }
  };

  const toggleMemberStatus = async () => {
    if (!selectedMember) {
      return;
    }

    if (!adminUser?.username) {
      return;
    }

    const newStatus =
      !selectedMember.is_active;

    const actionText =
      newStatus
        ? 'activate'
        : 'deactivate';

    Alert.alert(
      newStatus
        ? 'Activate Member'
        : 'Deactivate Member',
      `Are you sure you want to ${actionText} ${selectedMember.full_name}?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },

        {
          text:
            newStatus
              ? 'Activate'
              : 'Deactivate',

          style:
            newStatus
              ? 'default'
              : 'destructive',

          onPress: async () => {
            try {
              setSaving(true);

              const response =
                await fetch(
                  `${API_BASE}/admin/members/`,
                  {
                    method: 'PATCH',

                    headers: {
                      'Content-Type':
                        'application/json',
                    },

                    body: JSON.stringify({
                      admin_username:
                        adminUser.username,

                      member_id:
                        selectedMember.id,

                      is_active:
                        newStatus,
                    }),
                  }
                );

              const responseText =
                await response.text();

              let data: any = {};

              try {
                data = JSON.parse(
                  responseText
                );
              } catch {
                throw new Error(
                  `Invalid server response. HTTP ${response.status}`
                );
              }

              if (!response.ok) {
                throw new Error(
                  data.error ||
                    'Unable to update member status.'
                );
              }

              Alert.alert(
                'Success',
                newStatus
                  ? 'Member account activated.'
                  : 'Member account deactivated.'
              );

              if (data.member) {
                setSelectedMember(
                  data.member
                );
              }

              await loadMembers();
            } catch (error: any) {
              console.error(
                'TOGGLE MEMBER ERROR:',
                error
              );

              Alert.alert(
                'Update Failed',
                error?.message ||
                  'Unable to update member status.'
              );
            } finally {
              setSaving(false);
            }
          },
        },
      ]
    );
  };

  const membershipLabel = (
    status: string
  ) => {
    switch (status) {
      case 'active':
        return 'Active';

      case 'expired':
        return 'Expired';

      case 'pending':
        return 'Pending';

      case 'cancelled':
        return 'Cancelled';

      default:
        return 'No Membership';
    }
  };

  const membershipBadgeStyle = (
    status: string
  ) => {
    switch (status) {
      case 'active':
        return styles.activeBadge;

      case 'expired':
        return styles.expiredBadge;

      case 'pending':
        return styles.pendingBadge;

      case 'cancelled':
        return styles.cancelledBadge;

      default:
        return styles.noneBadge;
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator
          size="large"
        />

        <Text
          style={styles.loadingText}
        >
          Loading Members...
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={
          styles.content
        }
        refreshControl={
          <RefreshControl
            refreshing={
              refreshing
            }
            onRefresh={
              handleRefresh
            }
          />
        }
      >
        {/* HEADER */}

        <View style={styles.header}>
          <View
            style={
              styles.headerText
            }
          >
            <Text
              style={styles.smallLabel}
            >
              FITTRACK AI
            </Text>

            <Text
              style={styles.title}
            >
              Members Management
            </Text>

            <Text
              style={styles.subtitle}
            >
              Manage registered gym members
            </Text>
          </View>

          <TouchableOpacity
            style={styles.backButton}
            onPress={() =>
              router.replace(
                '/admin-dashboard'
              )
            }
          >
            <Text
              style={
                styles.backButtonText
              }
            >
              Dashboard
            </Text>
          </TouchableOpacity>
        </View>

        {/* SUMMARY */}

        <View
          style={styles.summaryCard}
        >
          <Text
            style={
              styles.summaryNumber
            }
          >
            {members.length}
          </Text>

          <Text
            style={
              styles.summaryLabel
            }
          >
            Registered Members
          </Text>
        </View>

        {/* SEARCH */}

        <Text
          style={styles.sectionTitle}
        >
          Search Members
        </Text>

        <TextInput
          style={styles.searchInput}
          placeholder="Search name, username, email..."
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
        />

        {/* FILTERS */}

        <Text
          style={styles.sectionTitle}
        >
          Membership Filter
        </Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={
            false
          }
          style={
            styles.filterScroll
          }
        >
          <TouchableOpacity
            style={[
              styles.filterButton,
              filter === 'all' &&
                styles.filterButtonActive,
            ]}
            onPress={() =>
              setFilter('all')
            }
          >
            <Text
              style={[
                styles.filterText,
                filter === 'all' &&
                  styles.filterTextActive,
              ]}
            >
              All
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterButton,
              filter === 'active' &&
                styles.filterButtonActive,
            ]}
            onPress={() =>
              setFilter('active')
            }
          >
            <Text
              style={[
                styles.filterText,
                filter === 'active' &&
                  styles.filterTextActive,
              ]}
            >
              Active
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterButton,
              filter === 'expired' &&
                styles.filterButtonActive,
            ]}
            onPress={() =>
              setFilter('expired')
            }
          >
            <Text
              style={[
                styles.filterText,
                filter === 'expired' &&
                  styles.filterTextActive,
              ]}
            >
              Expired
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterButton,
              filter === 'pending' &&
                styles.filterButtonActive,
            ]}
            onPress={() =>
              setFilter('pending')
            }
          >
            <Text
              style={[
                styles.filterText,
                filter === 'pending' &&
                  styles.filterTextActive,
              ]}
            >
              Pending
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterButton,
              filter === 'none' &&
                styles.filterButtonActive,
            ]}
            onPress={() =>
              setFilter('none')
            }
          >
            <Text
              style={[
                styles.filterText,
                filter === 'none' &&
                  styles.filterTextActive,
              ]}
            >
              No Plan
            </Text>
          </TouchableOpacity>
        </ScrollView>

        {/* MEMBER COUNT */}

        <Text
          style={styles.resultText}
        >
          Showing{' '}
          {filteredMembers.length}{' '}
          member
          {filteredMembers.length !==
          1
            ? 's'
            : ''}
        </Text>

        {/* MEMBER LIST */}

        {filteredMembers.length ===
        0 ? (
          <View
            style={styles.emptyCard}
          >
            <Text
              style={
                styles.emptyTitle
              }
            >
              No Members Found
            </Text>

            <Text
              style={
                styles.emptyText
              }
            >
              Try changing your search
              or membership filter.
            </Text>
          </View>
        ) : (
          filteredMembers.map(
            (member) => (
              <TouchableOpacity
                key={member.id}
                style={
                  styles.memberCard
                }
                onPress={() =>
                  openMember(
                    member
                  )
                }
              >
                <View
                  style={
                    styles.memberMain
                  }
                >
                  <View
                    style={
                      styles.avatar
                    }
                  >
                    <Text
                      style={
                        styles.avatarText
                      }
                    >
                      {(
                        member.first_name ||
                        member.username
                      )
                        .charAt(0)
                        .toUpperCase()}
                    </Text>
                  </View>

                  <View
                    style={
                      styles.memberInfo
                    }
                  >
                    <Text
                      style={
                        styles.memberName
                      }
                    >
                      {member.full_name}
                    </Text>

                    <Text
                      style={
                        styles.memberUsername
                      }
                    >
                      {member.username}
                    </Text>

                    <Text
                      style={
                        styles.memberEmail
                      }
                    >
                      {member.email ||
                        'No email'}
                    </Text>

                    <View
                      style={
                        styles.badgeRow
                      }
                    >
                      <View
                        style={[
                          styles.statusBadge,
                          member.is_active
                            ? styles.accountActiveBadge
                            : styles.accountInactiveBadge,
                        ]}
                      >
                        <Text
                          style={
                            styles.badgeText
                          }
                        >
                          {member.is_active
                            ? 'Account Active'
                            : 'Disabled'}
                        </Text>
                      </View>

                      <View
                        style={[
                          styles.statusBadge,
                          membershipBadgeStyle(
                            member
                              .membership
                              .status
                          ),
                        ]}
                      >
                        <Text
                          style={
                            styles.badgeText
                          }
                        >
                          {membershipLabel(
                            member
                              .membership
                              .status
                          )}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>

                <View
                  style={
                    styles.memberArrow
                  }
                >
                  <Text
                    style={
                      styles.arrowText
                    }
                  >
                    ›
                  </Text>
                </View>
              </TouchableOpacity>
            )
          )
        )}

        {/* REFRESH */}

        <TouchableOpacity
          style={
            styles.refreshButton
          }
          onPress={
            handleRefresh
          }
        >
          <Text
            style={
              styles.refreshButtonText
            }
          >
            Refresh Members
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* MEMBER DETAILS MODAL */}

      {selectedMember && (
        <View
          style={styles.modalOverlay}
        >
          <View
            style={styles.modalCard}
          >
            <ScrollView
              contentContainerStyle={
                styles.modalContent
              }
            >
              <View
                style={
                  styles.modalHeader
                }
              >
                <View>
                  <Text
                    style={
                      styles.modalTitle
                    }
                  >
                    Member Details
                  </Text>

                  <Text
                    style={
                      styles.modalSubtitle
                    }
                  >
                    ID #{selectedMember.id}
                  </Text>
                </View>

                <TouchableOpacity
                  style={
                    styles.closeButton
                  }
                  onPress={
                    closeMember
                  }
                >
                  <Text
                    style={
                      styles.closeButtonText
                    }
                  >
                    ×
                  </Text>
                </TouchableOpacity>
              </View>

              {/* ACCOUNT STATUS */}

              <View
                style={
                  styles.detailCard
                }
              >
                <Text
                  style={
                    styles.detailSectionTitle
                  }
                >
                  Account Status
                </Text>

                <View
                  style={
                    styles.accountStatusRow
                  }
                >
                  <Text
                    style={
                      styles.detailLabel
                    }
                  >
                    Login Account
                  </Text>

                  <Text
                    style={
                      styles.detailValue
                    }
                  >
                    {selectedMember.is_active
                      ? 'Active'
                      : 'Disabled'}
                  </Text>
                </View>

                <TouchableOpacity
                  style={
                    selectedMember.is_active
                      ? styles.deactivateButton
                      : styles.activateButton
                  }
                  onPress={
                    toggleMemberStatus
                  }
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator
                      color="#ffffff"
                    />
                  ) : (
                    <Text
                      style={
                        styles.actionButtonText
                      }
                    >
                      {selectedMember.is_active
                        ? 'Deactivate Account'
                        : 'Activate Account'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>

              {/* PERSONAL INFORMATION */}

              <View
                style={
                  styles.detailCard
                }
              >
                <View
                  style={
                    styles.detailHeaderRow
                  }
                >
                  <Text
                    style={
                      styles.detailSectionTitle
                    }
                  >
                    Personal Information
                  </Text>

                  <TouchableOpacity
                    onPress={() =>
                      setEditing(
                        !editing
                      )
                    }
                  >
                    <Text
                      style={
                        styles.editText
                      }
                    >
                      {editing
                        ? 'Cancel'
                        : 'Edit'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {editing ? (
                  <>
                    <Text
                      style={
                        styles.inputLabel
                      }
                    >
                      First Name
                    </Text>

                    <TextInput
                      style={
                        styles.input
                      }
                      value={
                        firstName
                      }
                      onChangeText={
                        setFirstName
                      }
                    />

                    <Text
                      style={
                        styles.inputLabel
                      }
                    >
                      Last Name
                    </Text>

                    <TextInput
                      style={
                        styles.input
                      }
                      value={
                        lastName
                      }
                      onChangeText={
                        setLastName
                      }
                    />

                    <Text
                      style={
                        styles.inputLabel
                      }
                    >
                      Email
                    </Text>

                    <TextInput
                      style={
                        styles.input
                      }
                      value={email}
                      onChangeText={
                        setEmail
                      }
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />

                    <Text
                      style={
                        styles.inputLabel
                      }
                    >
                      Phone
                    </Text>

                    <TextInput
                      style={
                        styles.input
                      }
                      value={phone}
                      onChangeText={
                        setPhone
                      }
                      keyboardType="phone-pad"
                    />

                    <Text
                      style={
                        styles.inputLabel
                      }
                    >
                      Address
                    </Text>

                    <TextInput
                      style={[
                        styles.input,
                        styles.multilineInput,
                      ]}
                      value={address}
                      onChangeText={
                        setAddress
                      }
                      multiline
                    />

                    <TouchableOpacity
                      style={
                        styles.saveButton
                      }
                      onPress={
                        saveMember
                      }
                      disabled={
                        saving
                      }
                    >
                      {saving ? (
                        <ActivityIndicator
                          color="#ffffff"
                        />
                      ) : (
                        <Text
                          style={
                            styles.actionButtonText
                          }
                        >
                          Save Changes
                        </Text>
                      )}
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <View
                      style={
                        styles.infoRow
                      }
                    >
                      <Text
                        style={
                          styles.detailLabel
                        }
                      >
                        Full Name
                      </Text>

                      <Text
                        style={
                          styles.detailValue
                        }
                      >
                        {
                          selectedMember.full_name
                        }
                      </Text>
                    </View>

                    <View
                      style={
                        styles.infoRow
                      }
                    >
                      <Text
                        style={
                          styles.detailLabel
                        }
                      >
                        Username
                      </Text>

                      <Text
                        style={
                          styles.detailValue
                        }
                      >
                        {
                          selectedMember.username
                        }
                      </Text>
                    </View>

                    <View
                      style={
                        styles.infoRow
                      }
                    >
                      <Text
                        style={
                          styles.detailLabel
                        }
                      >
                        Email
                      </Text>

                      <Text
                        style={
                          styles.detailValue
                        }
                      >
                        {selectedMember.email ||
                          'Not provided'}
                      </Text>
                    </View>

                    <View
                      style={
                        styles.infoRow
                      }
                    >
                      <Text
                        style={
                          styles.detailLabel
                        }
                      >
                        Phone
                      </Text>

                      <Text
                        style={
                          styles.detailValue
                        }
                      >
                        {selectedMember.phone ||
                          'Not provided'}
                      </Text>
                    </View>

                    <View
                      style={
                        styles.infoRow
                      }
                    >
                      <Text
                        style={
                          styles.detailLabel
                        }
                      >
                        Address
                      </Text>

                      <Text
                        style={
                          styles.detailValue
                        }
                      >
                        {selectedMember.address ||
                          'Not provided'}
                      </Text>
                    </View>

                    <View
                      style={
                        styles.infoRow
                      }
                    >
                      <Text
                        style={
                          styles.detailLabel
                        }
                      >
                        Joined
                      </Text>

                      <Text
                        style={
                          styles.detailValue
                        }
                      >
                        {new Date(
                          selectedMember.date_joined
                        ).toLocaleDateString()}
                      </Text>
                    </View>
                  </>
                )}
              </View>

              {/* MEMBERSHIP */}

              <View
                style={
                  styles.detailCard
                }
              >
                <Text
                  style={
                    styles.detailSectionTitle
                  }
                >
                  Membership
                </Text>

                <View
                  style={
                    styles.infoRow
                  }
                >
                  <Text
                    style={
                      styles.detailLabel
                    }
                  >
                    Plan
                  </Text>

                  <Text
                    style={
                      styles.detailValue
                    }
                  >
                    {
                      selectedMember
                        .membership
                        .plan_name ||
                      'No Plan'
                    }
                  </Text>
                </View>

                <View
                  style={
                    styles.infoRow
                  }
                >
                  <Text
                    style={
                      styles.detailLabel
                    }
                  >
                    Status
                  </Text>

                  <Text
                    style={
                      styles.detailValue
                    }
                  >
                    {membershipLabel(
                      selectedMember
                        .membership
                        .status
                    )}
                  </Text>
                </View>

                <View
                  style={
                    styles.infoRow
                  }
                >
                  <Text
                    style={
                      styles.detailLabel
                    }
                  >
                    Payment
                  </Text>

                  <Text
                    style={
                      styles.detailValue
                    }
                  >
                    {
                      selectedMember
                        .membership
                        .payment_status
                    }
                  </Text>
                </View>

                <View
                  style={
                    styles.infoRow
                  }
                >
                  <Text
                    style={
                      styles.detailLabel
                    }
                  >
                    End Date
                  </Text>

                  <Text
                    style={
                      styles.detailValue
                    }
                  >
                    {selectedMember
                      .membership
                      .end_date
                      ? new Date(
                          selectedMember
                            .membership
                            .end_date
                        ).toLocaleDateString()
                      : 'N/A'}
                  </Text>
                </View>
              </View>

              {/* ACTIVITY */}

              <View
                style={
                  styles.detailCard
                }
              >
                <Text
                  style={
                    styles.detailSectionTitle
                  }
                >
                  Member Activity
                </Text>

                <View
                  style={
                    styles.activityGrid
                  }
                >
                  <View
                    style={
                      styles.activityBox
                    }
                  >
                    <Text
                      style={
                        styles.activityNumber
                      }
                    >
                      {
                        selectedMember
                          .activity
                          .attendance_count
                      }
                    </Text>

                    <Text
                      style={
                        styles.activityLabel
                      }
                    >
                      Attendance
                    </Text>
                  </View>

                  <View
                    style={
                      styles.activityBox
                    }
                  >
                    <Text
                      style={
                        styles.activityNumber
                      }
                    >
                      {
                        selectedMember
                          .activity
                          .workout_count
                      }
                    </Text>

                    <Text
                      style={
                        styles.activityLabel
                      }
                    >
                      Workouts
                    </Text>
                  </View>

                  <View
                    style={
                      styles.activityBox
                    }
                  >
                    <Text
                      style={
                        styles.activityNumber
                      }
                    >
                      {
                        selectedMember
                          .activity
                          .goal_count
                      }
                    </Text>

                    <Text
                      style={
                        styles.activityLabel
                      }
                    >
                      Goals
                    </Text>
                  </View>

                  <View
                    style={
                      styles.activityBox
                    }
                  >
                    <Text
                      style={
                        styles.activityNumber
                      }
                    >
                      {
                        selectedMember
                          .activity
                          .completed_goal_count
                      }
                    </Text>

                    <Text
                      style={
                        styles.activityLabel
                      }
                    >
                      Completed
                    </Text>
                  </View>
                </View>
              </View>

              <TouchableOpacity
                style={
                  styles.closeBottomButton
                }
                onPress={
                  closeMember
                }
              >
                <Text
                  style={
                    styles.closeBottomButtonText
                  }
                >
                  Close
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fb',
  },

  content: {
    padding: 20,
    paddingTop: 55,
    paddingBottom: 40,
  },

  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
    backgroundColor: '#f5f7fb',
  },

  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },

  headerText: {
    flex: 1,
    paddingRight: 10,
  },

  smallLabel: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 5,
  },

  title: {
    fontSize: 27,
    fontWeight: '800',
  },

  subtitle: {
    marginTop: 5,
    fontSize: 14,
  },

  backButton: {
    backgroundColor: '#111827',
    borderRadius: 9,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },

  backButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },

  summaryCard: {
    backgroundColor: '#ffffff',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    elevation: 2,
  },

  summaryNumber: {
    fontSize: 32,
    fontWeight: '800',
  },

  summaryLabel: {
    marginTop: 4,
    fontSize: 14,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 10,
    marginTop: 8,
  },

  searchInput: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 11,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 14,
    marginBottom: 14,
  },

  filterScroll: {
    marginBottom: 10,
  },

  filterButton: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 9,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },

  filterButtonActive: {
    backgroundColor: '#111827',
    borderColor: '#111827',
  },

  filterText: {
    fontSize: 13,
    fontWeight: '600',
  },

  filterTextActive: {
    color: '#ffffff',
  },

  resultText: {
    fontSize: 13,
    marginBottom: 10,
    marginTop: 5,
  },

  memberCard: {
    backgroundColor: '#ffffff',
    borderRadius: 15,
    padding: 15,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 1,
  },

  memberMain: {
    flexDirection: 'row',
    flex: 1,
  },

  avatar: {
    width: 45,
    height: 45,
    borderRadius: 23,
    backgroundColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },

  avatarText: {
    fontSize: 18,
    fontWeight: '800',
  },

  memberInfo: {
    flex: 1,
  },

  memberName: {
    fontSize: 16,
    fontWeight: '800',
  },

  memberUsername: {
    fontSize: 12,
    marginTop: 2,
  },

  memberEmail: {
    fontSize: 12,
    marginTop: 2,
  },

  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 7,
  },

  statusBadge: {
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 5,
    marginRight: 5,
    marginBottom: 3,
  },

  badgeText: {
    fontSize: 10,
    fontWeight: '700',
  },

  accountActiveBadge: {
    backgroundColor: '#dcfce7',
  },

  accountInactiveBadge: {
    backgroundColor: '#fee2e2',
  },

  activeBadge: {
    backgroundColor: '#dcfce7',
  },

  expiredBadge: {
    backgroundColor: '#fee2e2',
  },

  pendingBadge: {
    backgroundColor: '#fef3c7',
  },

  cancelledBadge: {
    backgroundColor: '#e5e7eb',
  },

  noneBadge: {
    backgroundColor: '#e5e7eb',
  },

  memberArrow: {
    paddingLeft: 10,
  },

  arrowText: {
    fontSize: 30,
    fontWeight: '300',
  },

  emptyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 15,
    padding: 25,
    marginTop: 10,
  },

  emptyTitle: {
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '800',
  },

  emptyText: {
    textAlign: 'center',
    marginTop: 6,
    fontSize: 13,
  },

  refreshButton: {
    backgroundColor: '#111827',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 15,
  },

  refreshButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },

  modalOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },

  modalCard: {
    backgroundColor: '#f5f7fb',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '92%',
  },

  modalContent: {
    padding: 20,
    paddingBottom: 35,
  },

  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },

  modalTitle: {
    fontSize: 24,
    fontWeight: '800',
  },

  modalSubtitle: {
    marginTop: 3,
    fontSize: 12,
  },

  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
  },

  closeButtonText: {
    fontSize: 26,
    lineHeight: 28,
  },

  detailCard: {
    backgroundColor: '#ffffff',
    borderRadius: 15,
    padding: 17,
    marginBottom: 12,
  },

  detailHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  detailSectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 12,
  },

  editText: {
    fontSize: 13,
    fontWeight: '800',
  },

  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },

  accountStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },

  detailLabel: {
    fontSize: 13,
    flex: 1,
  },

  detailValue: {
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'right',
    flex: 1.3,
  },

  activateButton: {
    backgroundColor: '#166534',
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
  },

  deactivateButton: {
    backgroundColor: '#991b1b',
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
  },

  actionButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },

  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 5,
    marginTop: 7,
  },

  input: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 9,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 14,
  },

  multilineInput: {
    minHeight: 75,
    textAlignVertical: 'top',
  },

  saveButton: {
    backgroundColor: '#111827',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 15,
  },

  activityGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },

  activityBox: {
    width: '48%',
    backgroundColor: '#f5f7fb',
    borderRadius: 10,
    padding: 13,
    marginBottom: 8,
    alignItems: 'center',
  },

  activityNumber: {
    fontSize: 23,
    fontWeight: '800',
  },

  activityLabel: {
    fontSize: 11,
    marginTop: 3,
  },

  closeBottomButton: {
    backgroundColor: '#111827',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 5,
  },

  closeBottomButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
});