import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/hooks/use-theme';
import { announcementService } from '@/services/announcements';
import { Announcement } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  Modal,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

export default function AdminAnnouncements() {
  const { user } = useAuth();
  const theme = useTheme();

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formPriority, setFormPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [formPinned, setFormPinned] = useState(false);
  const [formErrors, setFormErrors] = useState<string | null>(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, []);

  const loadAnnouncements = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    const { announcements: data, error } = await announcementService.getAllAnnouncements();
    if (error) {
      setMessage(error);
    } else {
      setAnnouncements(data || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadAnnouncements();
  }, [loadAnnouncements]);

  const refreshData = async () => {
    setRefreshing(true);
    await loadAnnouncements();
    setRefreshing(false);
  };

  const openCreateModal = () => {
    setEditingAnnouncement(null);
    setFormTitle('');
    setFormContent('');
    setFormPriority('medium');
    setFormPinned(false);
    setFormErrors(null);
    setModalVisible(true);
  };

  const openEditModal = (announcement: Announcement) => {
    setEditingAnnouncement(announcement);
    setFormTitle(announcement.title);
    setFormContent(announcement.content);
    setFormPriority(announcement.priority || 'medium');
    setFormPinned(announcement.is_pinned || false);
    setFormErrors(null);
    setModalVisible(true);
  };

  const validateForm = (): boolean => {
    if (!formTitle.trim()) {
      setFormErrors('Title is required');
      return false;
    }
    if (!formContent.trim()) {
      setFormErrors('Content is required');
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;
    setActionLoading(true);
    setFormErrors(null);

    const data = {
      title: formTitle.trim(),
      content: formContent.trim(),
      priority: formPriority,
      is_pinned: formPinned,
      posted_by: user?.id || '',
    };

    if (editingAnnouncement) {
      const { error } = await announcementService.updateAnnouncement(editingAnnouncement.id, data);
      if (error) {
        setFormErrors(error);
      } else {
        setMessage('Announcement updated successfully');
        setModalVisible(false);
        loadAnnouncements();
      }
    } else {
      const { error } = await announcementService.createAnnouncement(data);
      if (error) {
        setFormErrors(error);
      } else {
        setMessage('Announcement created successfully');
        setModalVisible(false);
        loadAnnouncements();
      }
    }
    setActionLoading(false);
  };

  const confirmDelete = (announcement: Announcement) => {
    Alert.alert(
      'Delete Announcement',
      `Are you sure you want to delete "${announcement.title}"?\n\nThis action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(true);
            const { error } = await announcementService.deleteAnnouncement(announcement.id);
            if (error) {
              setMessage(error);
            } else {
              setMessage('Announcement deleted');
              setAnnouncements((prev) => prev.filter((a) => a.id !== announcement.id));
            }
            setActionLoading(false);
          },
        },
      ],
    );
  };

  const togglePin = async (announcement: Announcement) => {
    setActionLoading(true);
    const { error } = await announcementService.pinAnnouncement(announcement.id, !announcement.is_pinned);
    if (error) {
      setMessage(error);
    } else {
      setMessage(announcement.is_pinned ? 'Announcement unpinned' : 'Announcement pinned');
      loadAnnouncements();
    }
    setActionLoading(false);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return '#EF4444';
      case 'medium': return '#F59E0B';
      case 'low': return '#10B981';
      default: return '#F59E0B';
    }
  };

  const renderAnnouncementItem = ({ item }: { item: Announcement }) => {
    const priorityColor = getPriorityColor(item.priority || 'medium');
    const postedByName = (item as any).posted_by?.full_name || 'Unknown';

    return (
      <Animated.View style={{ opacity: fadeAnim }}>
        <View style={[styles.card, { backgroundColor: theme.cardBackground, borderColor: item.is_pinned ? priorityColor + '40' : theme.border }]}>
          <View style={styles.cardTop}>
            <View style={[styles.priorityDot, { backgroundColor: priorityColor }]} />
            <View style={styles.cardInfo}>
              <Text style={[styles.cardTitle, { color: theme.text }]} numberOfLines={2}>{item.title}</Text>
              <Text style={[styles.cardMeta, { color: theme.textSecondary }]}>
                {postedByName} · {formatDate(item.posted_at)}
              </Text>
            </View>
            {item.is_pinned && (
              <View style={[styles.pinBadge, { backgroundColor: priorityColor + '20' }]}>
                <Ionicons name="pin" size={14} color={priorityColor} />
              </View>
            )}
          </View>
          <Text style={[styles.cardContent, { color: theme.textSecondary }]} numberOfLines={3}>
            {item.content}
          </Text>
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <View style={styles.cardActions}>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: theme.primary + '12' }]}
              onPress={() => openEditModal(item)}
            >
              <Ionicons name="create-outline" size={16} color={theme.primary} />
              <Text style={[styles.actionBtnText, { color: theme.primary }]}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: theme.warning + '20' }]}
              onPress={() => togglePin(item)}
            >
              <Ionicons name={item.is_pinned ? 'unlink-outline' : 'pin-outline'} size={16} color={theme.warning} />
              <Text style={[styles.actionBtnText, { color: theme.warning }]}>{item.is_pinned ? 'Unpin' : 'Pin'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: theme.error + '12' }]}
              onPress={() => confirmDelete(item)}
            >
              <Ionicons name="trash-outline" size={16} color={theme.error} />
              <Text style={[styles.actionBtnText, { color: theme.error }]}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.primary }]}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerTitle}>Announcements</Text>
            <Text style={styles.headerSubtitle}>{announcements.length} total</Text>
          </View>
          <TouchableOpacity style={styles.addButton} onPress={openCreateModal}>
            <Ionicons name="add" size={22} color="#fff" />
            <Text style={styles.addButtonText}>New</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Message */}
      {message && (
        <View style={[styles.messageBar, {
          backgroundColor: message.includes('success') || message.includes('updated') || message.includes('pinned') ? theme.success + '20' : theme.error + '20',
          borderColor: message.includes('success') || message.includes('updated') || message.includes('pinned') ? theme.success + '40' : theme.error + '40',
        }]}>
          <Ionicons name={message.includes('success') || message.includes('updated') || message.includes('pinned') ? 'checkmark-circle' : 'alert-circle'} size={18} color={message.includes('success') || message.includes('updated') || message.includes('pinned') ? theme.success : theme.error} />
          <Text style={[styles.messageText, { color: message.includes('success') || message.includes('updated') || message.includes('pinned') ? theme.success : theme.error }]}>{message}</Text>
          <TouchableOpacity onPress={() => setMessage(null)}>
            <Ionicons name="close" size={18} color={theme.textSecondary} />
          </TouchableOpacity>
        </View>
      )}

      {/* Content */}
      {loading ? (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : announcements.length === 0 ? (
        <View style={styles.centerContent}>
          <Ionicons name="megaphone-outline" size={64} color={theme.textSecondary} style={{ opacity: 0.4 }} />
          <Text style={[styles.emptyTitle, { color: theme.text }]}>No announcements</Text>
          <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>Tap "+" to create a new announcement</Text>
        </View>
      ) : (
        <FlatList
          data={announcements}
          keyExtractor={(item) => item.id}
          renderItem={renderAnnouncementItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={refreshData} tintColor={theme.primary} colors={[theme.primary]} />
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Loading overlay */}
      {actionLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      )}

      {/* Create/Edit Modal */}
      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setModalVisible(false)}>
        <View style={[styles.modalContainer, { backgroundColor: theme.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Ionicons name="close" size={24} color={theme.text} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: theme.text }]}>
              {editingAnnouncement ? 'Edit Announcement' : 'New Announcement'}
            </Text>
            <TouchableOpacity onPress={handleSave} disabled={actionLoading}>
              <Text style={[styles.saveBtn, { color: actionLoading ? theme.textSecondary : theme.primary, opacity: actionLoading ? 0.5 : 1 }]}>
                {actionLoading ? 'Saving...' : 'Save'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.modalBody}>
            {formErrors && (
              <View style={[styles.formError, { backgroundColor: theme.error + '15' }]}>
                <Ionicons name="alert-circle" size={18} color={theme.error} />
                <Text style={[styles.formErrorText, { color: theme.error }]}>{formErrors}</Text>
              </View>
            )}

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: theme.text }]}>Title *</Text>
              <TextInput
                style={[styles.formInput, { borderColor: theme.border, color: theme.text, backgroundColor: theme.cardBackground }]}
                placeholder="Announcement title"
                placeholderTextColor={theme.textSecondary}
                value={formTitle}
                onChangeText={setFormTitle}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: theme.text }]}>Content *</Text>
              <TextInput
                style={[styles.formInput, styles.formTextArea, { borderColor: theme.border, color: theme.text, backgroundColor: theme.cardBackground }]}
                placeholder="Write your announcement..."
                placeholderTextColor={theme.textSecondary}
                value={formContent}
                onChangeText={setFormContent}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: theme.text }]}>Priority</Text>
              <View style={styles.chipRow}>
                {(['low', 'medium', 'high'] as const).map((p) => (
                  <TouchableOpacity
                    key={p}
                    style={[styles.chip, {
                      backgroundColor: formPriority === p ? getPriorityColor(p) + '20' : theme.backgroundElement,
                      borderColor: formPriority === p ? getPriorityColor(p) : theme.border,
                    }]}
                    onPress={() => setFormPriority(p)}
                  >
                    <Text style={[styles.chipText, { color: formPriority === p ? getPriorityColor(p) : theme.textSecondary }]}>
                      {p.charAt(0).toUpperCase() + p.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.formGroup}>
              <TouchableOpacity
                style={[styles.pinToggle, { backgroundColor: formPinned ? theme.primary + '15' : theme.backgroundElement, borderColor: formPinned ? theme.primary : theme.border }]}
                onPress={() => setFormPinned(!formPinned)}
              >
                <Ionicons name={formPinned ? 'pin' : 'pin-outline'} size={20} color={formPinned ? theme.primary : theme.textSecondary} />
                <Text style={[styles.pinToggleText, { color: formPinned ? theme.primary : theme.textSecondary }]}>
                  {formPinned ? 'Pinned' : 'Pin this announcement'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: 60, paddingBottom: 20, paddingHorizontal: 20, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontSize: 26, fontWeight: '800', color: '#fff', marginBottom: 4 },
  headerSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.75)', fontWeight: '500' },
  addButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, gap: 6 },
  addButtonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  messageBar: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginTop: 8, padding: 10, borderRadius: 10, borderWidth: 1, gap: 8 },
  messageText: { flex: 1, fontSize: 13, fontWeight: '500' },
  listContent: { padding: 16, paddingBottom: 40 },
  centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyTitle: { fontSize: 18, fontWeight: '700', marginTop: 16 },
  emptySubtitle: { fontSize: 14, marginTop: 6 },
  card: { padding: 16, borderRadius: 16, borderWidth: 1, marginBottom: 12, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  priorityDot: { width: 8, height: 8, borderRadius: 4, marginTop: 6, marginRight: 10 },
  cardInfo: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: '700', marginBottom: 2 },
  cardMeta: { fontSize: 12, fontWeight: '500' },
  pinBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, marginLeft: 8 },
  cardContent: { fontSize: 14, lineHeight: 20, marginBottom: 8 },
  divider: { height: 1, marginVertical: 10, opacity: 0.5 },
  cardActions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  actionBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, gap: 4 },
  actionBtnText: { fontSize: 12, fontWeight: '700' },
  loadingOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.3)' },
  modalContainer: { flex: 1 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12, borderBottomWidth: 1 },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  saveBtn: { fontSize: 16, fontWeight: '700' },
  modalBody: { padding: 20 },
  formError: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 10, marginBottom: 16, gap: 8 },
  formErrorText: { flex: 1, fontSize: 14 },
  formGroup: { marginBottom: 18 },
  formLabel: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  formInput: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  formTextArea: { minHeight: 120, textAlignVertical: 'top' },
  chipRow: { flexDirection: 'row', gap: 8 },
  chip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, borderWidth: 1 },
  chipText: { fontSize: 13, fontWeight: '600' },
  pinToggle: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12, borderWidth: 1, gap: 10 },
  pinToggleText: { fontSize: 15, fontWeight: '600' },
});