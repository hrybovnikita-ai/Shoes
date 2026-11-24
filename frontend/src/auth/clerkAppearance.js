// SHOES look for Clerk's hosted components — dark and light themes.
function themeVariables(light) {
  if (light) {
    return {
      colorPrimary: "#9cd624",
      colorText: "#141414",
      colorTextOnPrimaryBackground: "#111111",
      colorBackground: "#ffffff",
      colorInputBackground: "#f1f2f4",
      colorInputText: "#141414",
      colorNeutral: "#141414",
      borderRadius: "15px",
      fontFamily: "Inter, 'Segoe UI', Arial, sans-serif",
    };
  }
  return {
    colorPrimary: "#b7ff35",
    colorText: "#f5f5f5",
    colorTextOnPrimaryBackground: "#111111",
    colorBackground: "#141414",
    colorInputBackground: "#0d0d0d",
    colorInputText: "#f5f5f5",
    colorNeutral: "#f5f5f5",
    borderRadius: "15px",
    fontFamily: "Inter, 'Segoe UI', Arial, sans-serif",
  };
}

export const shoesClerkAppearance = {
  variables: themeVariables(false),
  layout: { logoPlacement: "inside", socialButtonsVariant: "blockButton" },
};

export function shoesClerkAppearanceForTheme(theme) {
  const light = theme === "light";
  return {
    ...shoesClerkAppearance,
    variables: themeVariables(light),
  };
}