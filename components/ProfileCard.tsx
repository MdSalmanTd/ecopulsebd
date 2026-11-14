"use client";

import Link from "next/link";
import { useUserName } from "@/lib/useUser";
import Avatar from "./Avatar";
import { useMe } from "@/lib/app-state";
import { levelFor } from "@/lib/levels";

export default function ProfileCard() {
  const name = useUserName();
  const { user, isOrganizer } = useMe();
  const lv = levelFor(user?.ecoScore ?? 0);
  const subtitle = user ? `Level ${lv.level} · ${lv.name}` : "";
  const percent = user ? lv.percent : 0;
  const caption = user
    ? lv.next == null
      ? `${lv.score.toLocaleString("en-US")} ECO SCORE`
      : `${lv.score.toLocaleString("en-US")} / ${lv.next.toLocaleString("en-US")} ECO SCORE`
    : "";
  return (
    <Link href="/profile" className="card profile profile--link">
      <div className="profile__head">
        <Avatar name={name} src={user?.avatarUrl} />
        <div>
          <strong>{name}</strong>
          <small>{isOrganizer ? user?.organization || "Organizer" : subtitle}</small>
          {user && <span className={`role-tag${isOrganizer ? " role-tag--org" : ""}`}>{isOrganizer ? "Organizer" : "Citizen"}</span>}
        </div>
      </div>
      <div className="level">
        <div className="level__bar">
          <span style={{ width: `${percent}%` }}></span>
        </div>
        <small>{caption}</small>
      </div>
    </Link>
  );
}
