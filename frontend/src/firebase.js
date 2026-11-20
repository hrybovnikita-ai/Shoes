import { initializeApp } from "firebase/app";
import { connectAuthEmulator, getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const missing = Object.entries({
  VITE_FIREBASE_API_KEY: firebaseConfig.apiKey,
  VITE_FIREBASE_AUTH_DOMAIN: firebaseConfig.authDomain,
  VITE_FIREBASE_PROJECT_ID: firebaseConfig.projectId,
  VITE_FIREBASE_APP_ID: firebaseConfig.appId,
})
  .filter(([, v]) => !v)
  .map(([k]) => k);

export const firebaseConfigured = missing.length === 0;

if (!firebaseConfigured) {
  // Names only — never print values.
  console.error(`SHOES: Firebase is not configured. Missing: ${missing.join(", ")}`);
} else if (
  firebaseConfig.authDomain &&
  firebaseConfig.projectId &&
  !firebaseConfig.authDomain.startsWith(firebaseConfig.projectId) &&
  !import.meta.env.VITE_FIREBASE_AUTH_EMULATOR_HOST
) {
  console.warn("SHOES: VITE_FIREBASE_AUTH_DOMAIN does not match VITE_FIREBASE_PROJECT_ID — check that both come from the same Firebase project.");
}

const app = initializeApp(firebaseConfig);

// getAuth() uses persistent (IndexedDB/local) storage by default, so a
// signed-in user survives page refreshes. AuthPage switches to session
// persistence only when "Remember me" is unchecked.
export const auth = getAuth(app);

// Local testing only (Firebase Auth emulator), e.g. 127.0.0.1:9099
const emulatorHost = import.meta.env.VITE_FIREBASE_AUTH_EMULATOR_HOST;
if (emulatorHost) {
  connectAuthEmulator(auth, `http://${emulatorHost}`, { disableWarnings: true });
}

export const googleProvider = new GoogleAuthProvider();

googleProvider.setCustomParameters({
  prompt: "select_account",
});

export default app;
