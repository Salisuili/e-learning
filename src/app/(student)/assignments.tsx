import { useTheme } from '@/hooks/use-theme';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

export default function StudentAssignments() {
  const theme = useTheme();

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.padding}>
        <Text style={[styles.title, { color: theme.text }]}>Assignments</Text>
        <Text style={[styles.placeholder, { color: theme.textSecondary }]}>
          View and submit your assignments here
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  padding: {
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  placeholder: {
    fontSize: 14,
  },
});
