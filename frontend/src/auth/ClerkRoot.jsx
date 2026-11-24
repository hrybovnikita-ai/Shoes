import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ClerkProvider, useAuth, useClerk, useUser } from "@clerk/react";
import { shoesClerkAppearanceForTheme } from "./clerkAppearance";

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

function useSiteTheme() {
  const [theme, setTheme] = useState(() => document.documentElement.dataset.theme || "dark");
  useEffect(() => {
    const el = document.documentElement;
    const read = () => setTheme(el.dataset.theme || "dark");
    const obs = new MutationObserver(read);
    obs.observe(el, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, []);
  return theme;
}

export default function ClerkRoot({ onState, children }) {
  const navigate = useNavigate();
  const siteTheme = useSiteTheme();
  const appearance = useMemo(() => shoesClerkAppearanceForTheme(siteTheme), [siteTheme]);
  const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
  return (
    <ClerkProvider
      publishableKey={publishableKey}
      routerPush={(to) => navigate(to)}
      routerReplace={(to) => navigate(to, { replace: true })}
      signInUrl="/login"
      signUpUrl="/register"
      afterSignOutUrl="/"
      appearance={appearance}
    >
      <ClerkSync onState={onState} />
      {children}
    </ClerkProvider>
  );
}
