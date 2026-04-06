import { Stack, useRouter } from 'expo-router';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function NotFoundScreen() {
  const router = useRouter();
  return (
    <>
      <Stack.Screen options={{ title: 'Not Found', headerShown: false }} />
      <SafeAreaView style={styles.container}>
        <Text style={styles.title}>Page not found</Text>
        <TouchableOpacity onPress={() => router.replace('/')} style={styles.button}>
          <Text style={styles.buttonText}>Go home</Text>
        </TouchableOpacity>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0F1419' },
  title: { fontSize: 20, color: '#fff', marginBottom: 24 },
  button: { backgroundColor: '#C4956A', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  buttonText: { color: '#fff', fontWeight: '600' },
});
