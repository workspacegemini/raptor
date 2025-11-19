import { View, Text, StyleSheet } from 'react-native';

export default function CoursesPage() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Courses Page</Text>
      <Text style={styles.subtext}>Course catalog coming soon...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  text: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  subtext: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 8,
  },
});
