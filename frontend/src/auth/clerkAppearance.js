// SHOES look for Clerk's hosted components. Clerk remains clearly the auth
// provider ("Secured by Clerk" stays visible); we only apply SHOES colours.
export const shoesClerkAppearance = {
  variables: {
    colorPrimary: "#b7ff35",
    colorText: "#f5f5f5",
    colorTextOnPrimaryBackground: "#111111",
    colorBackground: "#141414",
    colorInputBackground: "#0d0d0d",
    colorInputText: "#f5f5f5",
    colorNeutral: "#f5f5f5",
    borderRadius: "15px",
    fontFamily: "Inter, 'Segoe UI', Arial, sans-serif",
  },
  layout: { logoPlacement: "inside", socialButtonsVariant: "blockButton" },
};
