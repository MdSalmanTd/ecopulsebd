"use client";

import Link from "next/link";
import { SparkleIcon } from "./icons";
import { useT } from "@/lib/hooks";
import { useMe, useMissions, useReports } from "@/lib/app-state";

export default function SideMenu({ active }) {
  const t = useT();
  const { joined } = useMissions();
  const { reports } = useReports();
  const { isOrganizer } = useMe();
  const openReports = reports.filter((r) => r.status !== "resolved").length;

  const items = [
    { key: "profile", href: "/profile", label: "Your profile", icon: "/icons/user.svg" },
    { key: "feed", href: "/feed", label: "Feed", icon: "/icons/chat.svg" },
    { key: "map", href: "/map", label: "Map", icon: "/icons/map.svg" },
    // One entry for missions; the page's All / Joined / Saved tabs cover browsing and "my missions".
    { key: "missions", href: "/missions", label: "Missions", icon: "/icons/flag.svg", count: joined.length },
    { key: "saved", href: "/feed?view=saved", label: "Saved posts", icon: "/icons/bookmark.svg" },
    { key: "reports", href: "/reports", label: "My reports", icon: "/icons/alert.svg", count: openReports },
    { key: "assistant", href: "/assistant", label: "Ask the assistant" },
    // Only organizers can create missions.
    ...(isOrganizer ? [{ key: "tools", href: "/missions?create=1", label: "Organizer tools", icon: "/icons/tool.svg" }] : []),
  ];

  return (
    <nav className="sidemenu" aria-label="Profile navigation">
      {items.map((item) => {
        const isActive = item.key === active;
        return (
          <Link
            key={item.key}
            href={item.href}
            className={isActive ? "active" : undefined}
            aria-current={isActive ? "page" : undefined}
          >
            {item.icon ? <img className="ic" src={item.icon} alt="" /> : <SparkleIcon />}
            {t(item.label)}
            {item.count ? <span className="count">{item.count}</span> : null}
          </Link>
        );
      })}
    </nav>
  );
}
