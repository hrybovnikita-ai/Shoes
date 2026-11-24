// Clerk is enabled only when a valid publishable key is present (avoids a blank app on typos).
const clerkKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
export const clerkEnabled = Boolean(clerkKey && /^pk_(test|live)_[a-zA-Z0-9]+/.test(clerkKey));
