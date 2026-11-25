// Storefront metadata only — product data always comes from the API database.

const CATEGORY_COPY = {
  Running: {
    path: "/categories/running",
    heroImage: "/images/categories/running-700.webp",
    description:
      "Running sneakers are built for forward motion: responsive foams, breathable uppers, and outsoles tuned for pavement, track, or trail. In this collection you will find daily trainers with stacked cushioning for recovery miles, lightweight tempo shoes for faster sessions, and rugged trail models with aggressive lugs when the route leaves the road. Whether you are logging easy aerobic work or chasing a personal best, the right pair keeps every stride stable and energetic. Explore stack heights, plate options, and brand silhouettes matched to your training goals, gait, and fit preferences.",
    infoBlocks: [
      { icon: "⚡", title: "Responsive Cushioning", text: "Foams and plates tuned for road feedback and long-mile comfort." },
      { icon: "◎", title: "Breathable Uppers", text: "Engineered mesh and knit builds to keep feet cool on hot runs." },
      { icon: "↗", title: "Trail-Ready Options", text: "Lugged outsoles and protective toe caps for unpredictable terrain." },
      { icon: "▣", title: "True-to-Size Fit", text: "Full EU runs on every listing with in-stock sizes highlighted live." },
    ],
  },
  Lifestyle: {
    path: "/categories/lifestyle",
    heroImage: "/images/categories/lifestyle-700.webp",
    description:
      "Lifestyle sneakers bridge heritage sport design and everyday wear. Think court classics, retro runners, and minimal leather icons that look sharp with denim, tailoring, or athleisure. This collection focuses on versatile colorways, premium materials like suede and full-grain leather, and silhouettes that have defined sneaker culture for decades. From terrace trainers to chunky Y2K runners, each pair is chosen for all-day comfort and statement styling. Filter by brand, gender, and price to find the daily rotation pair that fits your wardrobe and your stride off the track.",
    infoBlocks: [
      { icon: "◇", title: "Heritage Icons", text: "Court, terrace, and retro runner shapes with timeless appeal." },
      { icon: "◈", title: "Premium Materials", text: "Leather, suede, and layered mesh selected for daily durability." },
      { icon: "♥", title: "Wardrobe Versatile", text: "Neutrals and bold accents that pair with street or smart casual." },
      { icon: "✦", title: "Curated Colorways", text: "Shop chalk whites, metallics, and seasonal accents in one place." },
    ],
  },
  Basketball: {
    path: "/categories/basketball",
    heroImage: "/images/categories/basketball-700.webp",
    description:
      "Basketball sneakers combine lockdown fit, impact protection, and court-ready traction. This collection spans signature athlete lines, retro Jordans, and accessible team models built for indoor hardwood and outdoor blacktop. Look for Air and foam stacks that absorb jump landings, supportive uppers that resist ankle roll, and herringbone or multidirectional patterns that grip on dusty courts. Whether you play pick-up weekly or collect grails, filter by brand and price to compare silhouettes made for explosive cuts, heel-to-toe transitions, and bold off-court style.",
    infoBlocks: [
      { icon: "⛹", title: "Court Traction", text: "Rubber patterns engineered for quick cuts and confident stops." },
      { icon: "▲", title: "Impact Protection", text: "Air units and foams that soften landings without feeling mushy." },
      { icon: "★", title: "Signature Lines", text: "Player editions and Jordan retros with cultural staying power." },
      { icon: "⚙", title: "Supportive Fit", text: "Mid and high collars plus structured uppers for lateral stability." },
    ],
  },
  Skateboarding: {
    path: "/categories/skateboarding",
    heroImage: "/images/categories/skateboarding-700.webp",
    description:
      "Skate shoes prioritize board feel, durability, and grip tape abuse. Vulcanized soles flex for flick, cupsoles add impact support for stair sets, and suede or reinforced toe caps resist griptape wear. This collection includes low, mid, and high profiles from heritage skate brands and SB divisions, with waffle and herringbone patterns tuned for deck control. Whether you cruise transition or film street lines, filter by silhouette and brand to find the right balance of padding, weight, and classic style that still looks sharp off the board.",
    infoBlocks: [
      { icon: "▷", title: "Board Feel", text: "Thin or flexible outsoles for precise ollies and flip tricks." },
      { icon: "▤", title: "Reinforced Toe", text: "Suede and double-stitching where griptape does the most damage." },
      { icon: "◇", title: "Classic Silhouettes", text: "Old Skool, One Star, Dunks, and cupsole icons built to last." },
      { icon: "◎", title: "All-Day Wear", text: "Padding and collars that stay comfortable far beyond the session." },
    ],
  },
};

export const categories = ["Running", "Lifestyle", "Basketball", "Skateboarding"].map((name) => ({
  name,
  subtitle:
    name === "Running"
      ? "Built for movement"
      : name === "Lifestyle"
        ? "Everyday icons"
        : name === "Basketball"
          ? "Court classics"
          : "Board feel first",
  image: CATEGORY_COPY[name].heroImage,
  path: CATEGORY_COPY[name].path,
  heroImage: CATEGORY_COPY[name].heroImage,
  description: CATEGORY_COPY[name].description,
  infoBlocks: CATEGORY_COPY[name].infoBlocks,
}));

export function categoryBySlug(slug) {
  const map = { running: "Running", lifestyle: "Lifestyle", basketball: "Basketball", skateboarding: "Skateboarding" };
  const name = map[String(slug || "").toLowerCase()];
  return name ? categories.find((c) => c.name === name) : null;
}

export const genders = ["Men's", "Women's", "Unisex"];

export const brandFilters = [
  "Nike",
  "Adidas",
  "New Balance",
  "Jordan",
  "Puma",
  "ASICS",
  "Reebok",
  "Converse",
  "Vans",
  "HOKA",
  "Salomon",
  "Under Armour",
];