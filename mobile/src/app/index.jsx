import { Redirect } from 'expo-router';
import { useAuth } from '@/utils/auth/useAuth';

export default function Index() {
  const { isReady, isAuthenticated, auth } = useAuth();

  if (!isReady) return null;

  if (!isAuthenticated) {
    return <Redirect href="/signin" />;
  }

  if (auth?.user?.role === 'admin') {
    return <Redirect href="/(admin-tabs)" />;
  }

  return <Redirect href="/(tabs)" />;
}
