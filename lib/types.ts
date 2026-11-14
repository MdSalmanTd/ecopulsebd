// Shared domain types: the JSON shapes the API returns and the client consumes.

export type Role = "citizen" | "organizer";

/** A user row as returned by getUser() (server-side). */
export interface User {
  id: number;
  name: string;
  login: string;
  role: Role;
  organization: string | null;
  bio?: string | null;
  area?: string | null;
  created_at?: string | Date;
  photo_version?: number;
  has_avatar?: boolean;
  eco_coins?: number;
}

export interface ProfileStats {
  posts: number;
  reports: number;
  resolved: number;
  missions: number;
  inspired: number;
  following: number;
}

export interface Profile {
  id: number;
  name: string;
  login: string;
  role: Role;
  organization: string | null;
  bio: string | null;
  area: string | null;
  joinedAt: string;
  avatarUrl: string | null;
  /** Reward currency spent in the Eco Shop. */
  ecoCoins: number;
  stats: ProfileStats;
}

export type IssueType = "illegal-dumping" | "blocked-drain" | "tree-damage";
export type ReportStatus = "submitted" | "review" | "resolved";

export interface Report {
  id: string;
  issue: IssueType;
  status: ReportStatus;
  place: string;
  description: string | null;
  image: string | null;
  createdAt: string;
  note: string | null;
  detail: string | null;
  canWithdraw: boolean;
  shared?: boolean;
}

export type MissionCategory = "trees" | "waste" | "drainage" | "plastic";

export interface Mission {
  id: string;
  title: string;
  category: MissionCategory;
  description: string;
  location: string;
  start: string;
  end: string;
  capacity: number;
  joined: number;
  xp: number;
  image: string;
  organizer: string;
  isJoined: boolean;
  isSaved: boolean;
  isOrganizer: boolean;
}

export interface Notification {
  id: string;
  text: string;
  time: string;
  href: string;
  read?: boolean;
}

export interface PostAttachment {
  kind: string;
  title: string;
  sub?: string;
  status?: string;
  /** Raw report status, added on report cards so the client can colour them. */
  statusKey?: ReportStatus;
  /** Linked mission on mission-update cards. */
  missionId?: string;
  href?: string;
}

export interface Post {
  id: number;
  author: { name: string; color: string; badge: string | null; avatar: string | null };
  action: string | null;
  area: string | null;
  community: string | null;
  body: string;
  image: string | null;
  mediaLabel: string | null;
  attachment: PostAttachment | null;
  likes: number;
  comments: number;
  shares: number;
  liked: boolean;
  saved: boolean;
  mine: boolean;
  createdAt: string;
}

export interface Comment {
  id: number;
  author: string;
  avatar: string | null;
  body: string;
  createdAt: string;
  mine: boolean;
}

export interface Volunteer {
  id: string;
  name: string;
  sub: string;
  color: string;
  following?: boolean;
}

export type HelpKind = "flood" | "rescue" | "medical" | "supplies" | "other";
export type HelpStatus = "active" | "resolved" | "cancelled";
/** [lng, lat] */
export type LngLat = [number, number];

export interface HelpRequest {
  id: number;
  kind: HelpKind;
  note: string | null;
  people: number | null;
  at: LngLat;
  accuracy: number | null;
  status: HelpStatus;
  createdAt: string;
  locatedAt: string;
  expiresAt: string;
  user: { name: string; avatar: string | null };
  responders: number;
  responding: boolean;
  mine: boolean;
}
