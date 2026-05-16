// Constants extracted from page.tsx during the file-size sweep.

export const PER_PAGE = 20;

export const EMPTY_FORM = {
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
  swim_level: "Beginner",
  location_preference: "Ikoyi",
  membership_tier: "community",
  city: "",
  country: "Nigeria",
  emergency_contact_name: "",
  emergency_contact_phone: "",
  medical_info: "",
  goals_narrative: "",
};

export const TIER_CLR: Record<string, string> = {
  community: "bg-blue-50 text-blue-700",
  club: "bg-green-50 text-green-700",
  academy: "bg-purple-50 text-purple-700",
};

export const MOBILE_CLR: Record<string, string> = {
  green: "bg-green-100 text-green-700 hover:bg-green-200",
  red: "bg-red-100 text-red-700 hover:bg-red-200",
  purple: "bg-purple-100 text-purple-700 hover:bg-purple-200",
};
