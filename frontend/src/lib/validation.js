// Same rules as the backend (backend/controllers.js parseCustomer).
export function validateCheckout(form) {
  const e = {};
  const t = (v) => (v || "").trim();
  if (t(form.name).length < 2 || t(form.name).length > 120) e.name = "Enter your full name";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t(form.email))) e.email = "Enter a valid email address";
  if (!/^\+?[0-9][0-9 ()-]{5,19}$/.test(t(form.phone))) e.phone = "Enter a valid phone number, e.g. +380 50 123 4567";
  if (t(form.street).length < 3) e.street = "Enter your street address";
  if (t(form.apartment).length > 100) e.apartment = "Apartment is too long";
  if (t(form.city).length < 2) e.city = "Enter your city";
  if (!t(form.country)) e.country = "Select your country";
  if (!/^[A-Za-z0-9][A-Za-z0-9 -]{1,9}$/.test(t(form.postalCode))) e.postalCode = "Enter a valid postal code";
  return e;
}

