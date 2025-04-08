export const PUBLIC_PATHS: string[] = [
  "/",
  "/signin",
  "/signup",
  "/forgot-password",
  "/reset-password",
];

export const heroHeading =
  "Capture Costs, Cultivate Wealth\n" + "Your AI Money Mentor";

export const protectedRoutes: string[] = [
  "home",
  "dashboard",
  "receipt/*",
  "settings",
  "dashboard/transactions",
];

export const sideBarLinks = [
  {
    id: "navLink1",
    position: "top",
    label: "Home",
    route: "/home",
    icon: "/icons/home.svg",
  },
  {
    id: "navLink2",
    position: "top",
    label: "Transactions",
    route: "/transactions",
    icon: "/icons/transactions.svg",
  },
  {
    id: "navLink3",
    position: "top",
    label: "Upload Receipt",
    route: "/receipt/upload",
    icon: "/icons/upload.svg",
  },
  {
    id: "navLink4",
    position: "top",
    label: "Pricing",
    route: "/pricing",
    icon: "/icons/pricing.svg",
  },
  {
    id: "navLink5",
    position: "bot",
    label: "Settings",
    route: "/settings",
    icon: "/icons/settings.svg",
  },
  {
    id: "navLink6",
    position: "bot",
    label: "Sign Out",
    route: "/",
    icon: "/icons/signout.svg",
  },
];

// Pricing Plan Definitions
export const pricingPlans = [
  {
    name: "Tier 1",
    price: "5",
    yearlyPrice: "48",
    period: "month",
    features: ["Budget Setting", "Basic Analytics", "Receipt Upload"],
    description: "Essential tools for managing your finances.",
    buttonText: "Get Started",
    href: "/signup?tier=tier1",
    isPopular: false,
  },
  {
    name: "Tier 2",
    price: "10",
    yearlyPrice: "96",
    period: "month",
    features: [
      "All Tier 1 features",
      "AI Chatbot",
      "Financial Goal Setting",
      "Data Export (.csv)",
    ],
    description: "Advanced features for deeper insights and planning.",
    buttonText: "Choose Tier 2",
    href: "/signup?tier=tier2",
    isPopular: true,
  },
  {
    name: "Tier 3",
    price: "25",
    yearlyPrice: "240",
    period: "month",
    features: ["All Tier 2 features", "Family Budgeting", "Priority Support"],
    description: "Comprehensive tools for individuals and families.",
    buttonText: "Choose Tier 3",
    href: "/signup?tier=tier3",
    isPopular: false,
  },
];
