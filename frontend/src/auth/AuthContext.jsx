import { createContext, lazy, Suspense, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { onAuthStateChanged, signOut as firebaseSignOut } from "firebase/auth";
import { auth as firebaseAuth, firebaseEnabled } from "../firebase";

// One auth state for the whole app, backed by:
//  - Firebase Authentication (existing accounts; default), and/or
//  - Clerk (new sign-in UI), only when VITE_CLERK_PUBLISHABLE_KEY is set.
// If both sessions exist, Clerk is used for API calls; the backend maps
// both identities to one SHOES profile only after an explicit link.

import { clerkEnabled } from "./config";
const ClerkRoot = clerkEnabled ? lazy(() => import("./ClerkRoot.jsx")) : null;

const AuthContext = createContext(null);

function fromFirebase(u) {
  if (!u) return null;
  return {
    provider: "firebase",
    uid: u.uid,
    displayName: u.displayName || "",
    email: u.email || "",
    photoURL: u.photoURL || "",
    emailVerified: Boolean(u.emailVerified),
    methods: (u.providerData || []).map((p) =>
      p.providerId === "google.com" ? "Google" : p.providerId === "password" ? "Email / Password" : p.providerId
    ),
  };
}

export function AuthProvider({ children }) {
  const [fbUser, setFbUser] = useState(null);
  const [fbReady, setFbReady] = useState(!firebaseEnabled);
  const [clerkState, setClerkState] = useState({ ready: !clerkEnabled, user: null });
  const clerkApi = useRef({ getToken: null, signOut: null, clerk: null });

  useEffect(() => {
    if (!firebaseEnabled) return undefined;
    return onAuthStateChanged(
      firebaseAuth,
      (u) => {
        setFbUser(u);
        setFbReady(true);
      },
      (err) => {
        console.error("Firebase auth state error:", err?.code || err);
        setFbReady(true);
      }
    );
  }, []);

  const onClerkState = useCallback((state) => {
    clerkApi.current = { getToken: state.getToken, signOut: state.signOut, clerk: state.clerk };
    setClerkState({ ready: state.ready, user: state.user });
  }, []);

  const getFirebaseToken = useCallback(async (forceRefresh = false) => {
    const u = firebaseAuth?.currentUser;
    return u ? u.getIdToken(forceRefresh) : null;
  }, []);

  const getClerkToken = useCallback(async () => {
    const fn = clerkApi.current.getToken;
    return fn ? fn() : null;
  }, []);

  const clerkUser = clerkState.user;
  const firebaseUser = fromFirebase(fbUser);
  const user = clerkUser || firebaseUser;

  const getToken = useCallback(async () => {
    if (clerkUser) return getClerkToken();
    if (fbUser) return getFirebaseToken();
    return null;
  }, [clerkUser, fbUser, getClerkToken, getFirebaseToken]);

  const signOut = useCallback(async () => {
    const tasks = [];
    if (firebaseAuth?.currentUser) tasks.push(firebaseSignOut(firebaseAuth));
    if (clerkApi.current.signOut && clerkUser) tasks.push(clerkApi.current.signOut());
    await Promise.all(tasks);
  }, [clerkUser]);

  const value = useMemo(
    () => ({
      ready: fbReady && clerkState.ready,
      user,
      firebaseUser,
      clerkUser,
      firebaseEnabled,
      clerkEnabled,
      getToken,
      getFirebaseToken,
      getClerkToken,
      signOut,
      signOutFirebase: () => (firebaseAuth?.currentUser ? firebaseSignOut(firebaseAuth) : Promise.resolve()),
      openClerkProfile: () => clerkApi.current.clerk?.openUserProfile?.(),
      rawFirebaseUser: fbUser,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fbReady, clerkState, fbUser, getToken, getFirebaseToken, getClerkToken, signOut]
  );

  const tree = <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
  if (!ClerkRoot) return tree;
  return (
    <Suspense fallback={<div className="app-loading" role="status">Loading SHOES…</div>}>
      <ClerkRoot onState={onClerkState}>{tree}</ClerkRoot>
    </Suspense>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
