"use client";

import Link from "next/link";
import { useUserName } from "@/lib/useUser";
import Avatar from "./Avatar";
import { useMe } from "@/lib/app-state";

export default function ProfileCard({ subtitle, percent, caption }) {
  const name = useUserName();
  const { user, isOrganizer } = useMe();
  return (
    <Link href="/profile" className="card profile profile--link">
      <div className="profile__head">
        <Avatar name={name} src={user?.avatarUrl} />
        <div>
          <strong>{name}</strong>
          <small>{isOrganizer ? user.organization || "Organizer" : subtitle}</small>
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
