import { initializeApp } from "firebase/app";
import { connectAuthEmulator, getAuth, GoogleAuthProvider } from "firebase/auth";

// Firebase Authentication (existing SHOES accounts). If the VITE_FIREBASE_*
// variables are missing the app still loads; Firebase sign-in is simply
// reported as unavailable instead of crashing the whole storefront.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const emulatorHost = import.meta.env.VITE_FIREBASE_AUTH_EMULATOR_HOST;

export const firebaseEnabled = Boolean(
  firebaseConfig.projectId &&
    firebaseConfig.apiKey &&
    (emulatorHost || firebaseConfig.apiKey.startsWith("AIza"))
);

let app = null;
let authInstance = null;
let provider = null;

if (firebaseEnabled) {
  app = initializeApp(firebaseConfig);
  authInstance = getAuth(app);
  if (emulatorHost) {
    connectAuthEmulator(authInstance, `http://${emulatorHost}`, { disableWarnings: true });
  }
  provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
} else if (import.meta.env.DEV) {
  console.warn("SHOES: Firebase is not configured (frontend/.env.local). Firebase sign-in is disabled.");
}

export const auth = authInstance;
export const googleProvider = provider;
export default app;
