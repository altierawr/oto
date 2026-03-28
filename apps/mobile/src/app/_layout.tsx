import { useAuthState } from "@/hooks/use-auth-state";
import { Stack } from "expo-router";

const RootLayout = () => {
  const { isLoggedIn, isLoading } = useAuthState();

  if (isLoading) {
    return null;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={isLoggedIn}>
        <Stack.Screen name="(tabs)" />
      </Stack.Protected>

      <Stack.Protected guard={!isLoggedIn}>
        <Stack.Screen name="login" />
      </Stack.Protected>
    </Stack>
  );
};

export default RootLayout;
