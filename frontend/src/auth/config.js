// Clerk is an opt-in feature flag: enabled only when the publishable key is set.
export const clerkEnabled = Boolean(import.meta.env.VITE_CLERK_PUBLISHABLE_KEY);
