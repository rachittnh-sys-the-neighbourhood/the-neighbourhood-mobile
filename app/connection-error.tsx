import { Body, GhostButton, PrimaryButton, Screen, Title } from "../components/ui";
import { useAuth } from "../lib/AuthProvider";

export default function ConnectionErrorScreen() {
  const { retryConnection, signOut, connectionError } = useAuth();

  return (
    <Screen>
      <Title>We couldn&rsquo;t reach The Neighbourhood.</Title>
      <Body muted>
        {connectionError ??
          "Something on our end isn't responding right now. This isn't anything you did."}
      </Body>
      <Body muted>Please check your connection and try again in a moment.</Body>
      <PrimaryButton title="Try again" onPress={retryConnection} />
      <GhostButton title="Sign out" onPress={signOut} />
    </Screen>
  );
}
