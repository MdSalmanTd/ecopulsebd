"use client";

// App data hooks backed by the REST API (see app/api/*).
import { useEffect } from "react";
import { api, mutate, revalidate, useApi } from "./api-client";
import { notifyProfileChanged } from "./useUser";

/** Reports can create/remove feed posts, so reload any loaded feed lists afterwards. */
const refreshFeeds = () =>
  ["all", "nearby", "saved", "mine"].forEach((f) =>
    revalidate(`/api/posts?filter=${f}`),
  );

const NONE = [];

/** The signed-in user from the server: { id, name, login, role, organization }. */
export function useMe() {
  const { data, error } = useApi("/api/me");
  const user = data?.user;

  async function update(input) {
    const res = await api("/api/me", { method: "PATCH", json: input });
    mutate("/api/me", () => res);
    notifyProfileChanged();
    // names appear on posts, comments and missions — reload those lists
    refreshFeeds();
    revalidate("/api/missions");
    return res.user;
  }

  /** blob: a cropped JPEG; null removes the photo. */
  async function setAvatar(blob) {
    let res;
    if (blob) {
      const fd = new FormData();
      fd.set("photo", blob, "avatar.jpg");
      res = await api("/api/me/avatar", { method: "PUT", form: fd });
    } else {
      res = await api("/api/me/avatar", { method: "DELETE" });
    }
    mutate("/api/me", (d) => ({ ...(d ?? {}), user: res.user }));
    refreshFeeds(); // posts & comments show the new photo
    return res.user;
  }

  return {
    user,
    error,
    setAvatar,
    retry: () => revalidate("/api/me"),
    areas: data?.areas ?? NONE,
    isOrganizer: user?.role === "organizer",
    loaded: Boolean(user),
    update,
  };
}

export function useReports() {
  const { data, error, loading } = useApi("/api/reports");
  const reports = data?.reports ?? NONE;

  /** formData: issue, location, description, photo (Blob) */
  async function add(formData) {
    const { report } = await api("/api/reports", {
      method: "POST",
      form: formData,
    });
    mutate("/api/reports", (d) => ({
      reports: [report, ...(d?.reports ?? [])],
    }));
    if (report.shared) refreshFeeds();
    return report;
  }

  async function remove(id) {
    await api(`/api/reports/${encodeURIComponent(id)}`, { method: "DELETE" });
    mutate("/api/reports", (d) => ({
      reports: (d?.reports ?? []).filter((r) => r.id !== id),
    }));
    refreshFeeds();
  }

  return { reports, loading, error, add, remove };
}

export function useMissions() {
  const { data, error, loading } = useApi("/api/missions");
  const missions = data?.missions ?? NONE;
  const joined = missions.filter((m) => m.isJoined).map((m) => m.id);

  const replace = (mission) =>
    mutate("/api/missions", (d) => ({
      missions: (d?.missions ?? []).map((m) =>
        m.id === mission.id ? mission : m,
      ),
    }));

  async function toggle(id) {
    const m = missions.find((x) => x.id === id);
    const { mission } = await api(
      `/api/missions/${encodeURIComponent(id)}/join`,
      { method: m?.isJoined ? "DELETE" : "POST" },
    );
    replace(mission);
    return mission;
  }

  async function toggleSaved(id) {
    const m = missions.find((x) => x.id === id);
    // Optimistic: flip the bookmark immediately, then apply the server's answer.
    if (m) replace({ ...m, isSaved: !m.isSaved });
    try {
      const { mission } = await api(
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

  async function create(input) {
    const { mission } = await api("/api/missions", {
      method: "POST",
      json: input,
    });
    mutate("/api/missions", (d) => ({
      missions: [mission, ...(d?.missions ?? [])],
    }));
    return mission;
  }

  return {
    missions,
    joined,
    loading,
    error,
    isJoined: (id) => joined.includes(id),
    isSaved: (id) => missions.some((m) => m.id === id && m.isSaved),
    toggle,
    toggleSaved,
    create,
    refresh: () => revalidate("/api/missions"),
  };
}

export function useNotifications() {
  const { data } = useApi("/api/notifications");
  const notifications = data?.notifications ?? NONE;

  async function markRead(ids) {
    mutate("/api/notifications", (d) => ({
      notifications: (d?.notifications ?? []).map((n) =>
        ids.includes(n.id) ? { ...n, read: true } : n,
      ),
    }));
    const res = await api("/api/notifications", {
      method: "POST",
      json: { read: ids },
    }).catch(() => null);
    if (res) mutate("/api/notifications", () => res);
  }

  return {
    notifications,
    unread: notifications.filter((n) => !n.read).length,
    markRead,
  };
}

// ---------------- Feed ----------------

const feedKey = (filter) => `/api/posts?filter=${filter}`;
const FEED_KEYS = ["all", "nearby", "saved", "mine"].map(feedKey);

/** Applies an updated post to every cached feed list. */
function patchPost(post) {
  for (const key of FEED_KEYS) {
    mutate(key, (d) =>
      d ? { posts: d.posts.map((p) => (p.id === post.id ? post : p)) } : d,
    );
  }
}

export function useFeed(filter = "all") {
  const { data, error, loading } = useApi(feedKey(filter));
  const posts = data?.posts ?? NONE;

  async function create(formData) {
    const { post } = await api("/api/posts", {
      method: "POST",
      form: formData,
    });
    for (const f of ["all", "mine"])
      mutate(feedKey(f), (d) => (d ? { posts: [post, ...d.posts] } : d));
    revalidate(feedKey("nearby"));
    return post;
  }

  async function toggleLike(post) {
    // optimistic
    patchPost({
      ...post,
      liked: !post.liked,
      likes: post.likes + (post.liked ? -1 : 1),
    });
    try {
      const res = await api(`/api/posts/${post.id}/like`, {
        method: post.liked ? "DELETE" : "POST",
      });
      patchPost(res.post);
    } catch (e) {
      patchPost(post);
      throw e;
    }
  }

  async function toggleSave(post) {
    patchPost({ ...post, saved: !post.saved });
    try {
      const res = await api(`/api/posts/${post.id}/save`, {
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

  async function share(post) {
    const res = await api(`/api/posts/${post.id}/share`, { method: "POST" });
    patchPost(res.post);
  }

  async function remove(post) {
    await api(`/api/posts/${post.id}`, { method: "DELETE" });
    for (const key of FEED_KEYS)
      mutate(key, (d) =>
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

export function useComments(postId, enabled) {
  const key = `/api/posts/${postId}/comments`;
  const { data, error, loading } = useApi(enabled ? key : null);
  const comments = data?.comments ?? NONE;

  async function add(body) {
    const res = await api(key, { method: "POST", json: { body } });
    mutate(key, (d) => ({ comments: [...(d?.comments ?? []), res.comment] }));
    patchPost(res.post);
  }

  async function remove(commentId) {
    const res = await api(`${key}/${commentId}`, { method: "DELETE" });
    mutate(key, (d) => ({
      comments: (d?.comments ?? []).filter((c) => c.id !== commentId),
    }));
    patchPost(res.post);
  }

  return { comments, loading: enabled && loading, error, add, remove };
}

export function useVolunteers() {
  const { data } = useApi("/api/volunteers");
  const volunteers = data?.volunteers ?? NONE;
  async function toggle(v) {
    mutate("/api/volunteers", (d) => ({
      volunteers: (d?.volunteers ?? []).map((x) =>
        x.id === v.id ? { ...x, following: !x.following } : x,
      ),
    }));
    try {
      const res = await api(`/api/volunteers/${v.id}/follow`, {
        method: v.following ? "DELETE" : "POST",
      });
      mutate("/api/volunteers", () => res);
    } catch (e) {
      revalidate("/api/volunteers");
      throw e;
    }
  }
  return { volunteers, toggle };
}

// ---------------- Help requests (SOS) ----------------

/**
 * Active help requests with live locations. `pollMs` re-fetches on an interval while the tab is visible,
 * so markers move and responder counts update without reloading.
 */
export function useHelp(pollMs = 0) {
  const { data, error, loading } = useApi("/api/help");

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

  const apply = (help) =>
    mutate("/api/help", (d) => {
      const others = (d?.requests ?? []).filter((r) => r.id !== help.id);
      const live = help.status === "active";
      return {
        requests: live ? [help, ...others] : others,
        mine: help.mine ? (live ? help : null) : (d?.mine ?? null),
      };
    });

  async function create(input) {
    const { help } = await api("/api/help", { method: "POST", json: input });
    apply(help);
    return help;
  }

  async function updateLocation(id, coords) {
    const { help } = await api(`/api/help/${id}`, {
      method: "PATCH",
      json: coords,
    });
    apply(help);
    return help;
  }

  async function finish(id, status) {
    const { help } = await api(`/api/help/${id}`, {
      method: "PATCH",
      json: { status },
    });
    apply(help);
    return help;
  }

  async function respond(help) {
    const res = await api(`/api/help/${help.id}/respond`, {
      method: help.responding ? "DELETE" : "POST",
    });
    apply(res.help);
    return res.help;
  }

  return {
    requests: data?.requests ?? NONE,
    mine: data?.mine ?? null,
    loading,
    error,
    create,
    updateLocation,
    finish,
    respond,
  };
}
