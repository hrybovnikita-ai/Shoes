import { SignIn, SignUp } from "@clerk/react";
import { shoesClerkAppearance } from "./clerkAppearance";

// Clerk's prebuilt sign-in / sign-up (email + password, Google, e-mail
// verification and password reset are configured in the Clerk dashboard).
export default function ClerkAuthPanel({ mode, redirectTo = "/account" }) {
  const common = { appearance: shoesClerkAppearance, fallbackRedirectUrl: redirectTo };
  return mode === "register" ? (
    <SignUp routing="path" path="/register" signInUrl="/login" {...common} />
  ) : (
    <SignIn routing="path" path="/login" signUpUrl="/register" {...common} />
  );
}
