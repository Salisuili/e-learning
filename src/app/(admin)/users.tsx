import { useTheme } from '@/hooks/use-theme';
import { userService } from '@/services/users';
import { User, UserRole } from '@/types';
import { useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

export default function AdminUsers() {
  const theme = useTheme();

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Load users
  const loadUsers = async () => {
    setLoading(true);
    setMessage(null);

    const { users: loadedUsers, error } = await userService.getAllUsers();

    if (error) {
      setMessage(error);
    } else {
      setUsers(loadedUsers || []);
    }

    setLoading(false);
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const refreshUsers = async () => {
    setRefreshing(true);
    await loadUsers();
    setRefreshing(false);
  };

  // Filter users
  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const q = search.toLowerCase();

      return (
        user.full_name.toLowerCase().includes(q) ||
        user.email.toLowerCase().includes(q) ||
        user.role.toLowerCase().includes(q)
      );
    });
  }, [users, search]);

  // Change role
  const changeRole = (user: User) => {
    Alert.alert('Change Role', `Change role for ${user.full_name}`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Make Lecturer',
        onPress: async () => updateRole(user.id, 'lecturer'),
      },
      {
        text: 'Make Student',
        onPress: async () => updateRole(user.id, 'student'),
      },
      {
        text: 'Make Admin',
        onPress: async () => updateRole(user.id, 'admin'),
      },
    ]);
  };

  const updateRole = async (id: string, role: UserRole) => {
    setActionLoading(true);

    const { error } = await userService.updateUserRole(id, role);

    if (error) {
      setMessage(error);
    } else {
      setMessage('Role updated successfully');
      loadUsers();
    }

    setActionLoading(false);
  };

  // Delete user
  const deleteUser = (user: User) => {
    Alert.alert('Delete User', `Delete ${user.full_name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setActionLoading(true);

          const { error } = await userService.deleteUser(user.id);

          if (error) {
            setMessage(error);
          } else {
            setMessage('User deleted');
            setUsers((prev) => prev.filter((u) => u.id !== user.id));
          }

          setActionLoading(false);
        },
      },
    ]);
  };

  
  // Render user
  const renderUserItem = ({ item }: { item: User }) => (
    <View style={[styles.card, { backgroundColor: theme.cardBackground }]}>
      <Text style={[styles.name, { color: theme.text }]}>
        {item.full_name}
      </Text>

      <Text style={{ color: theme.textSecondary }}>{item.email}</Text>

      <Text style={{ color: theme.primary, marginTop: 4 }}>
        {item.role} • {item.department}
      </Text>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.btn, { backgroundColor: theme.primary }]}
          onPress={() => changeRole(item)}
        >
          <Text style={styles.btnText}>Role</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.btn, { backgroundColor: theme.error }]}
          onPress={() => deleteUser(item)}
        >
          <Text style={styles.btnText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={[styles.title, { color: theme.text }]}>
        User Management
      </Text>

      {/* Search */}
      <TextInput
        style={[styles.search, { borderColor: theme.border, color: theme.text }]}
        placeholder="Search users..."
        placeholderTextColor={theme.textSecondary}
        value={search}
        onChangeText={setSearch}
      />

      {/* Message */}
      {message && <Text style={{ color: theme.textSecondary }}>{message}</Text>}

      {/* Loading */}
      {loading ? (
        <ActivityIndicator size="large" color={theme.primary} />
      ) : (
        <FlatList
          data={filteredUsers}
          keyExtractor={(item) => item.id}
          renderItem={renderUserItem}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={refreshUsers} />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },

  title: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 12,
  },

  search: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
  },

  card: {
    padding: 16,
    borderRadius: 14,
    marginBottom: 12,
  },

  name: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },

  actions: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 10,
  },

  btn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },

  btnText: {
    color: '#fff',
    fontWeight: '700',
  },
});