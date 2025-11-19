import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useAuthStore } from '../../lib/auth-store';
import { Ionicons } from '@expo/vector-icons';

export default function HomePage() {
  const { user } = useAuthStore();

  const quickActions = [
    { id: 1, title: 'My Courses', icon: 'book-outline', color: '#3b82f6' },
    { id: 2, title: 'Continue Learning', icon: 'play-circle-outline', color: '#10b981' },
    { id: 3, title: 'Certificates', icon: 'ribbon-outline', color: '#f59e0b' },
    { id: 4, title: 'Leaderboard', icon: 'trophy-outline', color: '#ef4444' },
  ];

  return (
    <ScrollView style={styles.container}>
      {/* Welcome Section */}
      <View style={styles.header}>
        <Text style={styles.greeting}>Welcome back,</Text>
        <Text style={styles.name}>{user?.firstName} {user?.lastName}</Text>
        <Text style={styles.role}>{user?.role?.replace('_', ' ')}</Text>
      </View>

      {/* Stats Cards */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Ionicons name="book" size={24} color="#3b82f6" />
          <Text style={styles.statNumber}>5</Text>
          <Text style={styles.statLabel}>Active Courses</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="checkmark-circle" size={24} color="#10b981" />
          <Text style={styles.statNumber}>12</Text>
          <Text style={styles.statLabel}>Completed</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="time" size={24} color="#f59e0b" />
          <Text style={styles.statNumber}>24h</Text>
          <Text style={styles.statLabel}>Learning Time</Text>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          {quickActions.map((action) => (
            <TouchableOpacity key={action.id} style={styles.actionCard}>
              <View style={[styles.actionIcon, { backgroundColor: `${action.color}15` }]}>
                <Ionicons name={action.icon as any} size={28} color={action.color} />
              </View>
              <Text style={styles.actionTitle}>{action.title}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Continue Learning */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Continue Learning</Text>
        <View style={styles.courseCard}>
          <View style={styles.courseInfo}>
            <Text style={styles.courseTitle}>Safety Procedures 101</Text>
            <Text style={styles.courseSubtitle}>Lesson 3 of 10</Text>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: '30%' }]} />
            </View>
            <Text style={styles.progressText}>30% Complete</Text>
          </View>
          <TouchableOpacity style={styles.continueButton}>
            <Ionicons name="play-circle" size={24} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Recommended Courses */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recommended for You</Text>
        <View style={styles.courseCard}>
          <View style={styles.courseInfo}>
            <Text style={styles.courseTitle}>Leadership Fundamentals</Text>
            <Text style={styles.courseSubtitle}>8 Lessons • 2h 15m</Text>
          </View>
          <TouchableOpacity style={styles.enrollButton}>
            <Text style={styles.enrollButtonText}>Enroll</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    backgroundColor: '#3b82f6',
    padding: 24,
    paddingTop: 16,
  },
  greeting: {
    fontSize: 16,
    color: '#dbeafe',
  },
  name: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    marginTop: 4,
  },
  role: {
    fontSize: 14,
    color: '#dbeafe',
    marginTop: 4,
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 12,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionCard: {
    width: '48%',
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  actionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1f2937',
    textAlign: 'center',
  },
  courseCard: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  courseInfo: {
    flex: 1,
  },
  courseTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  courseSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#e5e7eb',
    borderRadius: 3,
    marginTop: 12,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#3b82f6',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  continueButton: {
    width: 48,
    height: 48,
    backgroundColor: '#3b82f6',
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  enrollButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginLeft: 12,
  },
  enrollButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
});
