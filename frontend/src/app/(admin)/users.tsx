import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/hooks/use-theme';
import { userService } from '@/services/users';
import { User, UserRole } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  Linking,
  Modal,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

const ROLE_COLORS: Record<string, string> = {
  admin: '#8B5CF6',
  lecturer: '#6366F1',
  student: '#10B981',
};

type TabType = 'all' | 'pending' | 'approved';

export default function AdminUsers() {
  const { user: currentUser } = useAuth();
  const theme = useTheme();

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [rejectUser, setRejectUser] = useState<User | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [detailUser, setDetailUser] = useState<User | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, []);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    const { users: loadedUsers, error } = await userService.getAllUsers();
    if (error) {
      setMessage(error);
    } else {
      setUsers(loadedUsers || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const refreshUsers = async () => {
    setRefreshing(true);
    await loadUsers();
    setRefreshing(false);
  };

  const userStats = useMemo(() => {
    const total = users.length;
    const pending = users.filter((u) => u.status === 'pending' || u.status === undefined);
    const rejected = users.filter((u) => u.status === 'rejected');
    const admins = users.filter((u) => u.role === 'admin');
    const lecturers = users.filter((u) => u.role === 'lecturer');
    const students = users.filter((u) => u.role === 'student');
    return { total, pending: pending.length, rejected: rejected.length, admins: admins.length, lecturers: lecturers.length, students: students.length };
  }, [users]);

  const filteredUsers = useMemo(() => {
    let result = [...users];
    if (activeTab === 'pending') {
      result = result.filter((u) => u.status === 'pending' || u.status === 'rejected' || u.status === undefined);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((user) => {
        const searchable = [
          user.full_name, user.email, user.role, user.department,
          user.identification_number || '', user.status || 'approved',
        ];
        return searchable.some((s) => s.toLowerCase().includes(q));
      });
    }
    return result;
  }, [users, search, activeTab]);

  const changeRole = (user: User) => {
    Alert.alert('Change Role', `Change role for ${user.full_name}`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Make Lecturer', onPress: async () => updateRole(user.id, 'lecturer') },
      { text: 'Make Student', onPress: async () => updateRole(user.id, 'student') },
      { text: 'Make Admin', onPress: async () => updateRole(user.id, 'admin') },
    ]);
  };

  const updateRole = async (id: string, role: UserRole) => {
    setActionLoading(true);
    const { error } = await userService.updateUserRole(id, role);
    if (error) setMessage(error);
    else { setMessage('Role updated successfully'); loadUsers(); }
    setActionLoading(false);
  };

  const handleApprove = (user: User) => {
    if (!currentUser) return;
    Alert.alert('Approve User', `Approve ${user.full_name} for access?\n\nRole: ${user.role}\nDepartment: ${user.department}${user.identification_number ? `\nID: ${user.identification_number}` : ''}`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Approve',
        onPress: async () => {
          setActionLoading(true);
          const { error } = await userService.approveUser(user.id, currentUser.id);
          if (error) setMessage(error);
          else { setMessage(`${user.full_name} approved successfully`); loadUsers(); }
          setActionLoading(false);
        },
      },
    ]);
  };

  const openRejectModal = (user: User) => {
    setRejectUser(user);
    setRejectReason('');
    setRejectModalVisible(true);
  };

  const handleReject = async () => {
    if (!currentUser || !rejectUser) return;
    if (!rejectReason.trim()) { Alert.alert('Error', 'Please provide a reason for rejection'); return; }
    setActionLoading(true);
    const { error } = await userService.rejectUser(rejectUser.id, currentUser.id, rejectReason.trim());
    if (error) setMessage(error);
    else { setMessage(`${rejectUser.full_name} rejected`); setRejectModalVisible(false); loadUsers(); }
    setActionLoading(false);
  };

  const deleteUser = (user: User) => {
    Alert.alert('Delete User', `Are you sure you want to delete ${user.full_name}?\n\nThis action cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          setActionLoading(true);
          const { error } = await userService.deleteUser(user.id);
          if (error) setMessage(error);
          else { setMessage('User deleted'); setUsers((prev) => prev.filter((u) => u.id !== user.id)); }
          setActionLoading(false);
        },
      },
    ]);
  };

  const openUserDetail = (user: User) => {
    setDetailUser(user);
    setDetailModalVisible(true);
  };

  const openDocument = (url: string) => {
    Linking.openURL(url).catch(() => Alert.alert('Error', 'Could not open document URL'));
  };

  const getInitials = (name: string) => {
    return name.split(' ').map((n) => n.charAt(0)).join('').toUpperCase().slice(0, 2);
  };

  const getStatusBadge = (user: User) => {
    const status = user.status || 'approved';
    const isApproved = status === 'approved' || user.is_approved;
    if (isApproved) return { label: 'Approved', color: '#10B981', bgColor: '#10B98120' };
    if (status === 'rejected') return { label: 'Rejected', color: '#EF4444', bgColor: '#EF444420' };
    return { label: 'Pending', color: '#F59E0B', bgColor: '#F59E0B20' };
  };

  const renderUserItem = ({ item }: { item: User }) => {
    const roleColor = ROLE_COLORS[item.role] || theme.primary;
    const statusBadge = getStatusBadge(item);
    const isPending = item.status === 'pending' || item.status === undefined;
    const isRejected = item.status === 'rejected';
    const canApprove = isPending || isRejected;
    const hasDocument = !!item.document_url;

    return (
      <Animated.View style={{ opacity: fadeAnim }}>
        <TouchableOpacity activeOpacity={0.7} onPress={() => openUserDetail(item)}>
          <View style={[styles.card, { backgroundColor: theme.cardBackground, borderColor: isPending ? '#F59E0B40' : isRejected ? '#EF444440' : theme.border }]}>
            <View style={styles.cardTop}>
              <View style={[styles.avatarContainer, { backgroundColor: roleColor + '20' }]}>
                <Text style={[styles.avatarText, { color: roleColor }]}>{getInitials(item.full_name)}</Text>
              </View>
              <View style={styles.cardInfo}>
                <Text style={[styles.name, { color: theme.text }]} numberOfLines={1}>{item.full_name}</Text>
                <Text style={[styles.email, { color: theme.textSecondary }]} numberOfLines={1}>{item.email}</Text>
                <View style={styles.metaRow}>
                  <View style={[styles.roleBadge, { backgroundColor: roleColor + '20' }]}>
                    <Text style={[styles.roleText, { color: roleColor }]}>{item.role.charAt(0).toUpperCase() + item.role.slice(1)}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: statusBadge.bgColor }]}>
                    <Text style={[styles.statusText, { color: statusBadge.color }]}>{statusBadge.label}</Text>
                  </View>
                </View>
                {item.identification_number && <Text style={[styles.idNumber, { color: theme.textSecondary }]}>ID: {item.identification_number}</Text>}
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
            </View>
            <View style={[styles.divider, { backgroundColor: theme.border }]} />
            <View style={styles.actions}>
              {canApprove && (
                <>
                  <TouchableOpacity style={[styles.btn, { backgroundColor: '#10B981' }]} onPress={() => handleApprove(item)}>
                    <Ionicons name="checkmark-circle-outline" size={16} color="#fff" />
                    <Text style={[styles.btnText, { color: '#fff' }]}>Approve</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.btn, { backgroundColor: '#EF4444' }]} onPress={() => openRejectModal(item)}>
                    <Ionicons name="close-circle-outline" size={16} color="#fff" />
                    <Text style={[styles.btnText, { color: '#fff' }]}>Reject</Text>
                  </TouchableOpacity>
                </>
              )}
              {hasDocument && (
                <TouchableOpacity style={[styles.btn, { backgroundColor: theme.primary }]} onPress={() => openDocument(item.document_url!)}>
                  <Ionicons name="document-outline" size={16} color="#fff" />
                  <Text style={[styles.btnText, { color: '#fff' }]}>View Doc</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={[styles.btn, styles.btnOutline, { borderColor: roleColor }]} onPress={() => changeRole(item)}>
                <Ionicons name="swap-horizontal-outline" size={16} color={roleColor} />
                <Text style={[styles.btnText, { color: roleColor }]}>Role</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btn, { backgroundColor: theme.error }]} onPress={() => deleteUser(item)}>
                <Ionicons name="trash-outline" size={16} color="#fff" />
                <Text style={[styles.btnText, { color: '#fff' }]}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderTabs = () => (
    <View style={styles.tabRow}>
      {(['all', 'pending', 'approved'] as TabType[]).map((tab) => {
        const isActive = activeTab === tab;
        const count = tab === 'all' ? userStats.total : tab === 'pending' ? userStats.pending : userStats.total - userStats.pending;
        return (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, isActive && { backgroundColor: theme.primary + '20', borderColor: theme.primary }]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, { color: isActive ? theme.primary : theme.textSecondary }]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
            <View style={[styles.tabCount, { backgroundColor: isActive ? theme.primary + '20' : theme.backgroundElement }]}>
              <Text style={[styles.tabCountText, { color: isActive ? theme.primary : theme.textSecondary }]}>{count}</Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.headerContainer, { backgroundColor: theme.primary }]}>
        <Text style={styles.headerTitle}>User Management</Text>
        <Text style={styles.headerSubtitle}>{userStats.total} user{userStats.total !== 1 ? 's' : ''} registered</Text>
        {userStats.pending > 0 && (
          <View style={styles.pendingAlert}>
            <Ionicons name="time-outline" size={14} color="#fff" />
            <Text style={styles.pendingAlertText}>{userStats.pending} pending approval</Text>
          </View>
        )}
      </View>

      {renderTabs()}

      <View style={styles.searchRow}>
        <View style={[styles.searchContainer, { borderColor: theme.border, backgroundColor: theme.cardBackground }]}>
          <Ionicons name="search-outline" size={18} color={theme.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Search users..."
            placeholderTextColor={theme.textSecondary}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color={theme.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {message && (
        <View style={[styles.messageBar, { backgroundColor: (message.includes('success') || message.includes('approved')) ? theme.success + '20' : theme.error + '20', borderColor: (message.includes('success') || message.includes('approved')) ? theme.success + '40' : theme.error + '40' }]}>
          <Ionicons name={(message.includes('success') || message.includes('approved')) ? 'checkmark-circle' : 'alert-circle'} size={18} color={(message.includes('success') || message.includes('approved')) ? theme.success : theme.error} />
          <Text style={[styles.messageText, { color: (message.includes('success') || message.includes('approved')) ? theme.success : theme.error }]}>{message}</Text>
          <TouchableOpacity onPress={() => setMessage(null)}><Ionicons name="close" size={18} color={theme.textSecondary} /></TouchableOpacity>
        </View>
      )}

      {loading ? (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Loading users...</Text>
        </View>
      ) : filteredUsers.length === 0 ? (
        <View style={styles.centerContent}>
          <Ionicons name="people-outline" size={64} color={theme.textSecondary} style={{ opacity: 0.4 }} />
          <Text style={[styles.emptyTitle, { color: theme.text }]}>{search ? 'No users found' : activeTab === 'pending' ? 'No pending users' : 'No users yet'}</Text>
          <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>{search ? 'Try adjusting your search' : activeTab === 'pending' ? 'All users have been approved' : 'Users will appear here once they register'}</Text>
        </View>
      ) : (
        <FlatList
          data={filteredUsers}
          keyExtractor={(item) => item.id}
          renderItem={renderUserItem}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refreshUsers} tintColor={theme.primary} colors={[theme.primary]} />}
          showsVerticalScrollIndicator={false}
        />
      )}

      {actionLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      )}

      {/* Reject Modal */}
      <Modal visible={rejectModalVisible} animationType="fade" transparent={true} onRequestClose={() => setRejectModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.cardBackground }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Reject User</Text>
            <Text style={[styles.modalSubtitle, { color: theme.textSecondary }]}>Please provide a reason for rejecting {rejectUser?.full_name}</Text>
            <TextInput
              style={[styles.rejectInput, { borderColor: theme.border, color: theme.text, backgroundColor: theme.background }]}
              placeholder="Reason for rejection..."
              placeholderTextColor={theme.textSecondary}
              value={rejectReason}
              onChangeText={setRejectReason}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]} onPress={() => setRejectModalVisible(false)}>
                <Text style={[styles.modalBtnText, { color: theme.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: '#EF4444' }]} onPress={handleReject}>
                <Text style={[styles.modalBtnText, { color: '#fff' }]}>Reject</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* User Detail Modal */}
      <Modal visible={detailModalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setDetailModalVisible(false)}>
        {detailUser && (
          <View style={[styles.detailContainer, { backgroundColor: theme.background }]}>
            <View style={[styles.detailHeader, { borderBottomColor: theme.border }]}>
              <TouchableOpacity onPress={() => setDetailModalVisible(false)}><Ionicons name="close" size={24} color={theme.text} /></TouchableOpacity>
              <Text style={[styles.detailHeaderTitle, { color: theme.text }]}>User Details</Text>
              <View style={{ width: 24 }} />
            </View>

            <View style={styles.detailBody}>
              {/* Avatar */}
              <View style={styles.detailAvatarSection}>
                <View style={[styles.detailAvatar, { backgroundColor: (ROLE_COLORS[detailUser.role] || theme.primary) + '20' }]}>
                  <Text style={[styles.detailAvatarText, { color: ROLE_COLORS[detailUser.role] || theme.primary }]}>{getInitials(detailUser.full_name)}</Text>
                </View>
                <Text style={[styles.detailName, { color: theme.text }]}>{detailUser.full_name}</Text>
                <View style={styles.detailBadgeRow}>
                  <View style={[styles.roleBadge, { backgroundColor: (ROLE_COLORS[detailUser.role] || theme.primary) + '20' }]}>
                    <Text style={[styles.roleText, { color: ROLE_COLORS[detailUser.role] || theme.primary }]}>{detailUser.role.charAt(0).toUpperCase() + detailUser.role.slice(1)}</Text>
                  </View>
                  {(() => { const b = getStatusBadge(detailUser); return <View style={[styles.roleBadge, { backgroundColor: b.bgColor }]}><Text style={[styles.roleText, { color: b.color }]}>{b.label}</Text></View>; })()}
                </View>
              </View>

              {/* Profile Info */}
              <View style={[styles.detailCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
                <View style={styles.detailInfoRow}>
                  <Ionicons name="person-outline" size={18} color={theme.textSecondary} />
                  <View style={styles.detailInfoCol}>
                    <Text style={[styles.detailInfoLabel, { color: theme.textSecondary }]}>Full Name</Text>
                    <Text style={[styles.detailInfoValue, { color: theme.text }]}>{detailUser.full_name}</Text>
                  </View>
                </View>
                <View style={[styles.detailDivider, { backgroundColor: theme.border }]} />
                <View style={styles.detailInfoRow}>
                  <Ionicons name="mail-outline" size={18} color={theme.textSecondary} />
                  <View style={styles.detailInfoCol}>
                    <Text style={[styles.detailInfoLabel, { color: theme.textSecondary }]}>Email</Text>
                    <Text style={[styles.detailInfoValue, { color: theme.text }]}>{detailUser.email}</Text>
                  </View>
                </View>
                <View style={[styles.detailDivider, { backgroundColor: theme.border }]} />
                <View style={styles.detailInfoRow}>
                  <Ionicons name="business-outline" size={18} color={theme.textSecondary} />
                  <View style={styles.detailInfoCol}>
                    <Text style={[styles.detailInfoLabel, { color: theme.textSecondary }]}>Department</Text>
                    <Text style={[styles.detailInfoValue, { color: theme.text }]}>{detailUser.department}</Text>
                  </View>
                </View>
                {detailUser.identification_number && (
                  <>
                    <View style={[styles.detailDivider, { backgroundColor: theme.border }]} />
                    <View style={styles.detailInfoRow}>
                      <Ionicons name="card-outline" size={18} color={theme.textSecondary} />
                      <View style={styles.detailInfoCol}>
                        <Text style={[styles.detailInfoLabel, { color: theme.textSecondary }]}>{detailUser.role === 'student' ? 'Registration Number' : 'Staff ID'}</Text>
                        <Text style={[styles.detailInfoValue, { color: theme.text }]}>{detailUser.identification_number}</Text>
                      </View>
                    </View>
                  </>
                )}
              </View>

              {/* Verification Document Card - ALWAYS VISIBLE */}
              <View style={[styles.detailCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
                <View style={styles.detailInfoRow}>
                  <Ionicons name="document-text-outline" size={18} color={theme.primary} />
                  <View style={styles.detailInfoCol}>
                    <Text style={[styles.detailInfoLabel, { color: theme.textSecondary }]}>Verification Document</Text>
                    {detailUser.document_url ? (
                      <>
                        <Text style={[styles.detailInfoValue, { color: theme.text }]} numberOfLines={2}>{detailUser.document_file_name || 'Uploaded document'}</Text>
                        <TouchableOpacity style={[styles.viewDocLink, { backgroundColor: theme.primary + '12' }]} onPress={() => openDocument(detailUser.document_url!)}>
                          <Ionicons name="eye-outline" size={16} color={theme.primary} />
                          <Text style={[styles.viewDocLinkText, { color: theme.primary }]}>Open Document</Text>
                        </TouchableOpacity>
                      </>
                    ) : (
                      <>
                        <Text style={[styles.detailInfoValue, { color: theme.textSecondary }]}>No document uploaded</Text>
                        <Text style={[styles.detailInfoLabel, { color: theme.textSecondary, marginTop: 4 }]}>
                          {detailUser.role === 'student' ? 'Student did not upload admission letter or ID' : 'Lecturer did not upload staff ID or appointment letter'}
                        </Text>
                      </>
                    )}
                  </View>
                </View>
              </View>

              {/* Rejection Reason */}
              {detailUser.rejection_reason && (
                <View style={[styles.detailCard, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}>
                  <View style={styles.detailInfoRow}>
                    <Ionicons name="alert-circle-outline" size={18} color="#EF4444" />
                    <View style={styles.detailInfoCol}>
                      <Text style={[styles.detailInfoLabel, { color: '#EF4444' }]}>Rejection Reason</Text>
                      <Text style={[styles.detailInfoValue, { color: '#991B1B' }]}>{detailUser.rejection_reason}</Text>
                    </View>
                  </View>
                </View>
              )}

              {/* Dates */}
              <View style={[styles.detailCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
                <View style={styles.detailInfoRow}>
                  <Ionicons name="time-outline" size={18} color={theme.textSecondary} />
                  <View style={styles.detailInfoCol}>
                    <Text style={[styles.detailInfoLabel, { color: theme.textSecondary }]}>Registered</Text>
                    <Text style={[styles.detailInfoValue, { color: theme.text }]}>{new Date(detailUser.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</Text>
                  </View>
                </View>
                {detailUser.reviewed_at && (
                  <>
                    <View style={[styles.detailDivider, { backgroundColor: theme.border }]} />
                    <View style={styles.detailInfoRow}>
                      <Ionicons name="checkmark-done-outline" size={18} color={theme.textSecondary} />
                      <View style={styles.detailInfoCol}>
                        <Text style={[styles.detailInfoLabel, { color: theme.textSecondary }]}>Reviewed</Text>
                        <Text style={[styles.detailInfoValue, { color: theme.text }]}>{new Date(detailUser.reviewed_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</Text>
                      </View>
                    </View>
                  </>
                )}
              </View>

              {/* Actions */}
              {detailUser.status !== 'approved' && (
                <View style={styles.detailActions}>
                  <TouchableOpacity style={[styles.detailActionBtn, { backgroundColor: '#10B981' }]} onPress={() => { setDetailModalVisible(false); handleApprove(detailUser); }}>
                    <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
                    <Text style={styles.detailActionText}>Approve User</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.detailActionBtn, { backgroundColor: '#EF4444' }]} onPress={() => { setDetailModalVisible(false); openRejectModal(detailUser); }}>
                    <Ionicons name="close-circle-outline" size={20} color="#fff" />
                    <Text style={styles.detailActionText}>Reject User</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        )}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerContainer: { paddingTop: 60, paddingBottom: 20, paddingHorizontal: 20, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  headerTitle: { fontSize: 26, fontWeight: '800', color: '#fff', marginBottom: 4 },
  headerSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.75)', fontWeight: '500' },
  pendingAlert: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, marginTop: 10, gap: 6, alignSelf: 'flex-start' },
  pendingAlertText: { fontSize: 13, color: '#fff', fontWeight: '600' },
  tabRow: { flexDirection: 'row', paddingHorizontal: 16, marginTop: 12, marginBottom: 10, gap: 8 },
  tab: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1, borderColor: 'transparent', gap: 6 },
  tabText: { fontSize: 13, fontWeight: '600' },
  tabCount: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  tabCountText: { fontSize: 11, fontWeight: '700' },
  searchRow: { paddingHorizontal: 16, marginBottom: 10 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4 },
  searchInput: { flex: 1, fontSize: 15, marginLeft: 10, fontWeight: '500' },
  messageBar: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginBottom: 10, padding: 12, borderRadius: 12, borderWidth: 1, gap: 8 },
  messageText: { flex: 1, fontSize: 13, fontWeight: '600' },
  listContent: { paddingHorizontal: 16, paddingBottom: 100 },
  card: { padding: 16, borderRadius: 18, borderWidth: 1.5, marginBottom: 12, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 },
  cardTop: { flexDirection: 'row', alignItems: 'center' },
  avatarContainer: { width: 48, height: 48, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  avatarText: { fontSize: 18, fontWeight: '700' },
  cardInfo: { flex: 1 },
  name: { fontSize: 17, fontWeight: '700', marginBottom: 2 },
  email: { fontSize: 13, fontWeight: '400', marginBottom: 6 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  roleBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8 },
  roleText: { fontSize: 12, fontWeight: '700' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8 },
  statusText: { fontSize: 12, fontWeight: '700' },
  idNumber: { fontSize: 12, fontWeight: '500', marginTop: 4 },
  divider: { height: 1, marginVertical: 14, opacity: 0.5 },
  actions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  btn: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 10, borderRadius: 12, gap: 6, minWidth: 80 },
  btnOutline: { borderWidth: 1.5, backgroundColor: 'transparent' },
  btnText: { fontWeight: '700', fontSize: 13 },
  centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingBottom: 80 },
  loadingText: { marginTop: 12, fontSize: 14, fontWeight: '500' },
  emptyTitle: { fontSize: 18, fontWeight: '700', marginTop: 16 },
  emptySubtitle: { fontSize: 14, marginTop: 6 },
  loadingOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.3)' },
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)', padding: 24 },
  modalContent: { width: '100%', borderRadius: 20, padding: 24, elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12 },
  modalTitle: { fontSize: 20, fontWeight: '700', marginBottom: 6 },
  modalSubtitle: { fontSize: 14, marginBottom: 18, lineHeight: 20 },
  rejectInput: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, minHeight: 100, marginBottom: 18 },
  modalActions: { flexDirection: 'row', gap: 12 },
  modalBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 1, alignItems: 'center' },
  modalBtnText: { fontSize: 15, fontWeight: '700' },
  detailContainer: { flex: 1 },
  detailHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12, borderBottomWidth: 1 },
  detailHeaderTitle: { fontSize: 18, fontWeight: '700' },
  detailBody: { padding: 20 },
  detailAvatarSection: { alignItems: 'center', marginBottom: 24 },
  detailAvatar: { width: 72, height: 72, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  detailAvatarText: { fontSize: 28, fontWeight: '700' },
  detailName: { fontSize: 22, fontWeight: '800', marginBottom: 8 },
  detailBadgeRow: { flexDirection: 'row', gap: 8 },
  detailCard: { borderRadius: 18, borderWidth: 1, padding: 16, marginBottom: 16 },
  detailInfoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 12 },
  detailInfoCol: { flex: 1 },
  detailInfoLabel: { fontSize: 12, fontWeight: '500', marginBottom: 2 },
  detailInfoValue: { fontSize: 15, fontWeight: '700' },
  detailDivider: { height: 1, marginLeft: 30, opacity: 0.5 },
  viewDocLink: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, marginTop: 8, gap: 6, alignSelf: 'flex-start' },
  viewDocLinkText: { fontSize: 14, fontWeight: '600' },
  detailActions: { gap: 12, marginTop: 8 },
  detailActionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 14, gap: 8 },
  detailActionText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});