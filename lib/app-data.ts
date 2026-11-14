// Sample data for the citizen app (stands in for a real API until there is a backend).
import type { IssueType, MissionCategory, Notification, ReportStatus } from "./types";

export type { MissionCategory };

export const LIVE = {
  area: "Mirpur 10, Dhaka",
  aqi: 142,
  aqiLabel: "Unhealthy for sensitive groups",
  pm25: 52,
  uv: 8,
  tempC: 29,
  humidity: 71,
  floodRisk: "Moderate",
  rainChance: 40,
  updated: "15 min ago",
};

/** A seeded report (inserted for the demo account). */
export interface SeedReport {
  id: string;
  issue: IssueType;
  status: ReportStatus;
  image: string;
  place: string;
  createdAt: string;
  note: string;
  detail: string;
}

export const SEED_REPORTS: SeedReport[] = [
  {
    id: "R-1042",
    issue: "illegal-dumping",
    status: "submitted",
    image: "/images/report-dumping.svg",
    place: "Road 12/A, Dhanmondi",
    createdAt: "2026-11-06T09:42:00+06:00",
    note: "Submitted online",
    detail: "Awaiting verification by the local team",
  },
  {
    id: "R-1038",
    issue: "blocked-drain",
    status: "review",
    image: "/images/report-drain.svg",
    place: "West Shewrapara, Mirpur",
    createdAt: "2026-11-05T18:20:00+06:00",
    note: "Submitted online",
    detail: "Forwarded to the local ward office",
  },
  {
    id: "R-1019",
    issue: "illegal-dumping",
    status: "resolved",
    image: "/images/report-dumping.svg",
    place: "Agargaon Link Road, near bus stand",
    createdAt: "2026-10-24T10:00:00+06:00",
    note: "Closed Oct 25",
    detail: "Cleanup confirmed by the community team",
  },
];

export const ISSUE_LABELS: Record<IssueType, string> = {
  "illegal-dumping": "Illegal dumping",
  "blocked-drain": "Blocked drain",
  "tree-damage": "Tree damage",
};

export const STATUS_LABELS: Record<ReportStatus, string> = {
  submitted: "Submitted",
  review: "In review",
  resolved: "Resolved",
};

export type LocationKey = "dhanmondi-road-12" | "mirpur-shewrapara" | "agargaon-link-road" | "other";

export const LOCATIONS: Record<LocationKey, string> = {
  "dhanmondi-road-12": "Road 12, Dhanmondi, Dhaka",
  "mirpur-shewrapara": "West Shewrapara, Mirpur",
  "agargaon-link-road": "Agargaon Link Road, Dhaka",
  other: "Another location in Dhaka",
};

export const isLocationKey = (key: unknown): key is LocationKey =>
  typeof key === "string" && Object.prototype.hasOwnProperty.call(LOCATIONS, key);

const U = (id: string): string => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&q=70&w=800&h=450`;

export const MISSION_CATEGORIES: Record<MissionCategory, string> = {
  trees: "Tree Plantation",
  waste: "Waste Cleanup",
  drainage: "Drainage",
  plastic: "Plastic Free",
};

export const isMissionCategory = (key: unknown): key is MissionCategory =>
  typeof key === "string" && Object.prototype.hasOwnProperty.call(MISSION_CATEGORIES, key);

/** A seeded mission (inserted into the missions table on first run). */
export interface SeedMission {
  id: string;
  title: string;
  category: MissionCategory;
  description: string;
  start: string;
  end: string;
  location: string;
  organizer: string;
  joined: number;
  capacity: number;
  xp: number;
  image: string;
}

export const SEED_MISSIONS: SeedMission[] = [
  {
    id: "green-mirpur",
    title: "Green Mirpur Drive",
    category: "trees",
    description: "Planting 100 trees around Mirpur to make our area greener and cooler. Saplings, gloves and water provided.",
    start: "2026-11-15",
    end: "2026-11-20",
    location: "Mirpur, Dhaka",
    organizer: "Mirpur Green Team",
    joined: 1204,
    capacity: 2000,
    xp: 80,
    image: U("1542601906990-b4d3fb778b09"),
  },
  {
    id: "kailshi-canal",
    title: "Kailshi Canal Drain Cleaning",
    category: "drainage",
    description: "Clearing plastic and silt from the canal mouth to reduce flooding and water pollution.",
    start: "2026-11-22",
    end: "2026-11-24",
    location: "Kailshi, Dhaka",
    organizer: "Clean Dhaka",
    joined: 450,
    capacity: 1000,
    xp: 60,
    image: U("1547683905-f686c993aae5"),
  },
  {
    id: "dhanmondi-lake",
    title: "Dhanmondi Lake Clean-up",
    category: "waste",
    description: "Let's keep Dhanmondi Lake clean and green together. Meet at the Rabindra Sarobar steps.",
    start: "2026-12-01",
    end: "2026-12-07",
    location: "Dhanmondi, Dhaka",
    organizer: "Lake Care BD",
    joined: 850,
    capacity: 1500,
    xp: 50,
    image: U("1617953141905-b27fb1f17d88"),
  },
  {
    id: "polythene-week",
    title: "Say No to Polythene Week",
    category: "plastic",
    description: "Swap single-use polythene for cloth and jute bags for one week, and log your swaps.",
    start: "2026-10-20",
    end: "2026-10-26",
    location: "Citywide",
    organizer: "Eco Bangla",
    joined: 700,
    capacity: 700,
    xp: 40,
    image: U("1595278069441-2cf29f8005a4"),
  },
  {
    id: "sector-7",
    title: "Uttara Sector 7 Greening",
    category: "trees",
    description: "Increase green cover along Sector 7 roads with native shade trees.",
    start: "2026-12-12",
    end: "2026-12-17",
    location: "Uttara Sector 7",
    organizer: "Green Future",
    joined: 300,
    capacity: 800,
    xp: 80,
    image: U("1530836369250-ef72a3f5cda8"),
  },
  {
    id: "drain-check",
    title: "Pre-monsoon Drain Check",
    category: "drainage",
    description: "Walk your block, check drains and report blockages before the monsoon arrives.",
    start: "2027-04-01",
    end: "2027-04-05",
    location: "Dhaka",
    organizer: "City Care",
    joined: 200,
    capacity: 400,
    xp: 30,
    image: U("1530587191325-3db32d826c18"),
  },
];

export const SEED_NOTIFICATIONS: Notification[] = [
  { id: "n1", text: "AQI in Mirpur 10 rose to 142. Consider a mask outdoors.", time: "10 min ago", href: "/assistant" },
  { id: "n2", text: "Your report R-1038 is now in review by the ward office.", time: "2 h ago", href: "/reports" },
  { id: "n3", text: "Green Mirpur Drive starts Nov 15. 796 spots left.", time: "Yesterday", href: "/missions" },
  { id: "n4", text: "You earned the “Clean Streets” badge! +120 XP", time: "1 week ago", href: "/profile?tab=rewards" },
];

export interface RecyclingPoint {
  name: string;
  accepts: string;
  hours: string;
  distance: string;
}

export const RECYCLING_POINTS: RecyclingPoint[] = [
  { name: "Mirpur 10 roundabout drop-off", accepts: "plastic, paper, cans", hours: "8am–8pm", distance: "0.6 km" },
  { name: "Shewrapara community bin", accepts: "plastic bottles, glass", hours: "24 h", distance: "1.4 km" },
  { name: "Agargaon e-waste point", accepts: "batteries, phones, small electronics", hours: "10am–6pm (closed Fri)", distance: "3.1 km" },
];
