import { useMemo } from "react";
import { SignIn, SignUp } from "@clerk/react";
import { shoesClerkAppearanceForTheme } from "./clerkAppearance";

function useSiteTheme() {
  return document.documentElement.dataset.theme || "dark";
}

// Clerk's prebuilt sign-in / sign-up (email + password, Google, e-mail
// verification and password reset are configured in the Clerk dashboard).
export default function ClerkAuthPanel({ mode, redirectTo = "/account" }) {
  const theme = useSiteTheme();
  const appearance = useMemo(() => shoesClerkAppearanceForTheme(theme), [theme]);
  const common = { appearance, fallbackRedirectUrl: redirectTo };
  return mode === "register" ? (
    <SignUp routing="path" path="/register" signInUrl="/login" {...common} />
  ) : (
    <SignIn routing="path" path="/login" signUpUrl="/register" {...common} />
  );
}
