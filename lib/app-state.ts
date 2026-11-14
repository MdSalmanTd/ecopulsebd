"use client";

// App data hooks backed by the REST API (see app/api/*).
import { useEffect } from "react";
import { api, mutate, revalidate, useApi } from "./api-client";
import { notifyProfileChanged } from "./useUser";
import type {
  Comment,
  HelpKind,
  HelpRequest,
  Mission,
  Notification,
  Post,
  Profile,
  Report,
  Volunteer,
} from "@/lib/types";

// ---- Response shapes of the endpoints used here ----
export interface MeResponse {
  user: Profile;
  areas: string[];
}
export interface ReportsResponse {
  reports: Report[];
}
export interface MissionsResponse {
  missions: Mission[];
}
export interface NotificationsResponse {
  notifications: Notification[];
}
export interface FeedResponse {
  posts: Post[];
}
export interface CommentsResponse {
  comments: Comment[];
}
export interface VolunteersResponse {
  volunteers: Volunteer[];
}
export interface HelpResponse {
  requests: HelpRequest[];
  mine: HelpRequest | null;
}

// ---- Action payloads ----
/**
 * PATCH /api/me body. `organization` is only used for organizer accounts.
 * Fields may come straight from FormData.get(); the server coerces them with String() and validates.
 */
export interface ProfileInput {
  name?: FormDataEntryValue | null;
  bio?: FormDataEntryValue | null;
  area?: FormDataEntryValue | null;
  organization?: FormDataEntryValue | null;
}
/** POST /api/missions body (dates are YYYY-MM-DD). */
export interface MissionInput {
  title: string;
  category: string;
  description: string;
  location: string;
  start: string;
  end: string;
  capacity: number;
}
/** A device location as sent to the help endpoints. */
export interface HelpLocation {
  lat: number;
  lng: number;
  accuracy?: number | null;
}
/** POST /api/help body. */
export interface HelpInput extends HelpLocation {
  kind: HelpKind;
  note?: string;
  people?: number;
}
/** How a help request can be ended by its owner. */
export type HelpEndStatus = "resolved" | "cancelled";
/** Feed list filters served by /api/posts?filter=... */
export type FeedFilter = "all" | "nearby" | "saved" | "mine";

/** Reports can create/remove feed posts, so reload any loaded feed lists afterwards. */
const refreshFeeds = () =>
  ["all", "nearby", "saved", "mine"].forEach((f) =>
    revalidate(`/api/posts?filter=${f}`),
  );

// Shared empty list so hook results keep a stable identity before data loads.
const NONE: never[] = [];
const none = <T>(): T[] => NONE;

/** The signed-in user from the server: { id, name, login, role, organization }. */
export function useMe() {
  const { data, error } = useApi<MeResponse>("/api/me");
  const user = data?.user;

  async function update(input: ProfileInput): Promise<Profile> {
    const res = await api<MeResponse>("/api/me", { method: "PATCH", json: input });
    mutate<MeResponse>("/api/me", () => res);
    notifyProfileChanged();
    // names appear on posts, comments and missions — reload those lists
    refreshFeeds();
    revalidate("/api/missions");
    return res.user;
  }

  /** blob: a cropped JPEG; null removes the photo. */
  async function setAvatar(blob: Blob | null): Promise<Profile> {
    let res: { user: Profile };
    if (blob) {
      const fd = new FormData();
      fd.set("photo", blob, "avatar.jpg");
      res = await api<{ user: Profile }>("/api/me/avatar", { method: "PUT", form: fd });
    } else {
      res = await api<{ user: Profile }>("/api/me/avatar", { method: "DELETE" });
    }
    mutate<Partial<MeResponse>>("/api/me", (d) => ({ ...(d ?? {}), user: res.user }));
    refreshFeeds(); // posts & comments show the new photo
    return res.user;
  }

  return {
    user,
    error,
    setAvatar,
    retry: () => revalidate("/api/me"),
    areas: data?.areas ?? none<string>(),
    isOrganizer: user?.role === "organizer",
    loaded: Boolean(user),
    update,
  };
}

export type UseMeResult = ReturnType<typeof useMe>;

export function useReports() {
  const { data, error, loading } = useApi<ReportsResponse>("/api/reports");
  const reports = data?.reports ?? none<Report>();

  /** formData: issue, location, description, photo (Blob) */
  async function add(formData: FormData): Promise<Report> {
    const { report } = await api<{ report: Report }>("/api/reports", {
      method: "POST",
      form: formData,
    });
    mutate<ReportsResponse>("/api/reports", (d) => ({
      reports: [report, ...(d?.reports ?? [])],
    }));
    if (report.shared) refreshFeeds();
    return report;
  }

  async function remove(id: string): Promise<void> {
    await api(`/api/reports/${encodeURIComponent(id)}`, { method: "DELETE" });
    mutate<ReportsResponse>("/api/reports", (d) => ({
      reports: (d?.reports ?? []).filter((r) => r.id !== id),
    }));
    refreshFeeds();
  }

  return { reports, loading, error, add, remove };
}

export type UseReportsResult = ReturnType<typeof useReports>;

export function useMissions() {
  const { data, error, loading } = useApi<MissionsResponse>("/api/missions");
  const missions = data?.missions ?? none<Mission>();
  const joined = missions.filter((m) => m.isJoined).map((m) => m.id);

  const replace = (mission: Mission) =>
    mutate<MissionsResponse>("/api/missions", (d) => ({
      missions: (d?.missions ?? []).map((m) =>
        m.id === mission.id ? mission : m,
      ),
    }));

  async function toggle(id: string): Promise<Mission> {
    const m = missions.find((x) => x.id === id);
    const { mission } = await api<{ mission: Mission }>(
      `/api/missions/${encodeURIComponent(id)}/join`,
      { method: m?.isJoined ? "DELETE" : "POST" },
    );
    replace(mission);
    return mission;
  }

  async function toggleSaved(id: string): Promise<Mission> {
    const m = missions.find((x) => x.id === id);
    // Optimistic: flip the bookmark immediately, then apply the server's answer.
    if (m) replace({ ...m, isSaved: !m.isSaved });
    try {
      const { mission } = await api<{ mission: Mission }>(
        `/api/missions/${encodeURIComponent(id)}/save`,
        { method: m?.isSaved ? "DELETE" : "POST" },
      );
      replace(mission);
      return mission;
    } catch (e) {
      if (m) replace(m);
      throw e;
    }
  }

  async function create(input: MissionInput): Promise<Mission> {
    const { mission } = await api<{ mission: Mission }>("/api/missions", {
      method: "POST",
      json: input,
    });
    mutate<MissionsResponse>("/api/missions", (d) => ({
      missions: [mission, ...(d?.missions ?? [])],
    }));
    return mission;
  }

  return {
    missions,
    joined,
    loading,
    error,
    isJoined: (id: string) => joined.includes(id),
    isSaved: (id: string) => missions.some((m) => m.id === id && m.isSaved),
    toggle,
    toggleSaved,
    create,
    refresh: () => revalidate("/api/missions"),
  };
}

export type UseMissionsResult = ReturnType<typeof useMissions>;

export function useNotifications() {
  const { data } = useApi<NotificationsResponse>("/api/notifications");
  const notifications = data?.notifications ?? none<Notification>();

  async function markRead(ids: string[]): Promise<void> {
    mutate<NotificationsResponse>("/api/notifications", (d) => ({
      notifications: (d?.notifications ?? []).map((n) =>
        ids.includes(n.id) ? { ...n, read: true } : n,
      ),
    }));
    const res = await api<NotificationsResponse>("/api/notifications", {
      method: "POST",
      json: { read: ids },
    }).catch(() => null);
    if (res) mutate<NotificationsResponse>("/api/notifications", () => res);
  }

  return {
    notifications,
    unread: notifications.filter((n) => !n.read).length,
    markRead,
  };
}

export type UseNotificationsResult = ReturnType<typeof useNotifications>;

// ---------------- Feed ----------------

const feedKey = (filter: string) => `/api/posts?filter=${filter}`;
const FEED_KEYS = ["all", "nearby", "saved", "mine"].map(feedKey);

/** Applies an updated post to every cached feed list. */
function patchPost(post: Post): void {
  for (const key of FEED_KEYS) {
    mutate<FeedResponse>(key, (d) =>
      d ? { posts: d.posts.map((p) => (p.id === post.id ? post : p)) } : d,
    );
  }
}

/** `filter` is normally a FeedFilter; any string is passed through to the API. */
export function useFeed(filter: FeedFilter | (string & {}) = "all") {
  const { data, error, loading } = useApi<FeedResponse>(feedKey(filter));
  const posts = data?.posts ?? none<Post>();

  async function create(formData: FormData): Promise<Post> {
    const { post } = await api<{ post: Post }>("/api/posts", {
      method: "POST",
      form: formData,
    });
    for (const f of ["all", "mine"])
      mutate<FeedResponse>(feedKey(f), (d) => (d ? { posts: [post, ...d.posts] } : d));
    revalidate(feedKey("nearby"));
    return post;
  }

  async function toggleLike(post: Post): Promise<void> {
    // optimistic
    patchPost({
      ...post,
      liked: !post.liked,
      likes: post.likes + (post.liked ? -1 : 1),
    });
    try {
      const res = await api<{ post: Post }>(`/api/posts/${post.id}/like`, {
        method: post.liked ? "DELETE" : "POST",
      });
      patchPost(res.post);
    } catch (e) {
      patchPost(post);
      throw e;
    }
  }

  async function toggleSave(post: Post): Promise<Post> {
    patchPost({ ...post, saved: !post.saved });
    try {
      const res = await api<{ post: Post }>(`/api/posts/${post.id}/save`, {
        method: post.saved ? "DELETE" : "POST",
      });
      patchPost(res.post);
      revalidate(feedKey("saved"));
      return res.post;
    } catch (e) {
      patchPost(post);
      throw e;
    }
  }

  async function share(post: Post): Promise<void> {
    const res = await api<{ post: Post }>(`/api/posts/${post.id}/share`, { method: "POST" });
    patchPost(res.post);
  }

  async function remove(post: Post): Promise<void> {
    await api(`/api/posts/${post.id}`, { method: "DELETE" });
    for (const key of FEED_KEYS)
      mutate<FeedResponse>(key, (d) =>
        d ? { posts: d.posts.filter((p) => p.id !== post.id) } : d,
      );
  }

  return {
    posts,
    loading,
    error,
    create,
    toggleLike,
    toggleSave,
    share,
    remove,
    patchPost,
  };
}

export type UseFeedResult = ReturnType<typeof useFeed>;

export function useComments(postId: number | string, enabled: boolean) {
  const key = `/api/posts/${postId}/comments`;
  const { data, error, loading } = useApi<CommentsResponse>(enabled ? key : null);
  const comments = data?.comments ?? none<Comment>();

  async function add(body: string): Promise<void> {
    const res = await api<{ comment: Comment; post: Post }>(key, { method: "POST", json: { body } });
    mutate<CommentsResponse>(key, (d) => ({ comments: [...(d?.comments ?? []), res.comment] }));
    patchPost(res.post);
  }

  async function remove(commentId: number): Promise<void> {
    const res = await api<{ post: Post }>(`${key}/${commentId}`, { method: "DELETE" });
    mutate<CommentsResponse>(key, (d) => ({
      comments: (d?.comments ?? []).filter((c) => c.id !== commentId),
    }));
    patchPost(res.post);
  }

  return { comments, loading: enabled && loading, error, add, remove };
}

export type UseCommentsResult = ReturnType<typeof useComments>;

export function useVolunteers() {
  const { data } = useApi<VolunteersResponse>("/api/volunteers");
  const volunteers = data?.volunteers ?? none<Volunteer>();
  async function toggle(v: Volunteer): Promise<void> {
    mutate<VolunteersResponse>("/api/volunteers", (d) => ({
      volunteers: (d?.volunteers ?? []).map((x) =>
        x.id === v.id ? { ...x, following: !x.following } : x,
      ),
    }));
    try {
      const res = await api<VolunteersResponse>(`/api/volunteers/${v.id}/follow`, {
        method: v.following ? "DELETE" : "POST",
      });
      mutate<VolunteersResponse>("/api/volunteers", () => res);
    } catch (e) {
      revalidate("/api/volunteers");
      throw e;
    }
  }
  return { volunteers, toggle };
}

export type UseVolunteersResult = ReturnType<typeof useVolunteers>;

// ---------------- Help requests (SOS) ----------------

/**
 * Active help requests with live locations. `pollMs` re-fetches on an interval while the tab is visible,
 * so markers move and responder counts update without reloading.
 */
export function useHelp(pollMs = 0) {
  const { data, error, loading } = useApi<HelpResponse>("/api/help");

  useEffect(() => {
    if (!pollMs) return;
    const tick = () => {
      if (document.visibilityState === "visible") revalidate("/api/help");
    };
    const t = setInterval(tick, pollMs);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [pollMs]);

  const apply = (help: HelpRequest) =>
    mutate<HelpResponse>("/api/help", (d) => {
      const others = (d?.requests ?? []).filter((r) => r.id !== help.id);
      const live = help.status === "active";
      return {
        requests: live ? [help, ...others] : others,
        mine: help.mine ? (live ? help : null) : (d?.mine ?? null),
      };
    });

  async function create(input: HelpInput): Promise<HelpRequest> {
    const { help } = await api<{ help: HelpRequest }>("/api/help", { method: "POST", json: input });
    apply(help);
    return help;
  }

  async function updateLocation(id: number, coords: HelpLocation): Promise<HelpRequest> {
    const { help } = await api<{ help: HelpRequest }>(`/api/help/${id}`, {
      method: "PATCH",
      json: coords,
    });
    apply(help);
    return help;
  }

  async function finish(id: number, status: HelpEndStatus): Promise<HelpRequest> {
    const { help } = await api<{ help: HelpRequest }>(`/api/help/${id}`, {
      method: "PATCH",
      json: { status },
    });
    apply(help);
    return help;
  }

  async function respond(help: HelpRequest): Promise<HelpRequest> {
    const res = await api<{ help: HelpRequest }>(`/api/help/${help.id}/respond`, {
      method: help.responding ? "DELETE" : "POST",
    });
    apply(res.help);
    return res.help;
  }

  return {
    requests: data?.requests ?? none<HelpRequest>(),
    mine: data?.mine ?? null,
    loading,
    error,
    create,
    updateLocation,
    finish,
    respond,
  };
}

export type UseHelpResult = ReturnType<typeof useHelp>;
