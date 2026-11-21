import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ClerkProvider, useAuth, useClerk, useUser } from "@clerk/react";
import { shoesClerkAppearance } from "./clerkAppearance";

function ClerkSync({ onState }) {
  const { isLoaded, isSignedIn, getToken, signOut } = useAuth();
  const { user } = useUser();
  const clerk = useClerk();

  useEffect(() => {
    const email = user?.primaryEmailAddress;
    onState({
      ready: isLoaded,
      clerk,
      getToken: () => getToken(),
      signOut: () => signOut(),
      user:
        isLoaded && isSignedIn && user
          ? {
              provider: "clerk",
              uid: user.id,
              displayName: user.fullName || user.username || "",
              email: email?.emailAddress || "",
              photoURL: user.imageUrl || "",
              emailVerified: email?.verification?.status === "verified",
              methods: [
                ...(user.passwordEnabled ? ["Email / Password"] : []),
                ...(user.externalAccounts || []).map((a) => (a.provider === "google" ? "Google" : a.provider)),
              ],
            }
          : null,
    });
  }, [isLoaded, isSignedIn, user, getToken, signOut, clerk, onState]);
  return null;
}

export default function ClerkRoot({ onState, children }) {
  const navigate = useNavigate();
  return (
    <ClerkProvider
      publishableKey={import.meta.env.VITE_CLERK_PUBLISHABLE_KEY}
      routerPush={(to) => navigate(to)}
      routerReplace={(to) => navigate(to, { replace: true })}
      signInUrl="/login"
      signUpUrl="/register"
      afterSignOutUrl="/"
      appearance={shoesClerkAppearance}
    >
      <ClerkSync onState={onState} />
      {children}
    </ClerkProvider>
  );
}
