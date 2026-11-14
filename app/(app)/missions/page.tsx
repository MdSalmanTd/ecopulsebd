import { Suspense } from "react";
import Topbar from "@/components/Topbar";
import SideMenu from "@/components/SideMenu";
import ProfileCard from "@/components/ProfileCard";
import Communities from "@/components/Communities";
import MissionsBoard from "@/components/app/MissionsBoard";

export const metadata = { title: "Missions" };

export default function MissionsPage() {
  return (
    <>
      <Topbar active="missions" />
      <main className="layout layout--assistant">
        <aside className="sidebar sidebar--left">
          <ProfileCard subtitle="Level 4 · Eco Champion" percent={78} caption="1,240 / 1,600 ECO SCORE" />
          <SideMenu active="missions" />
          <Communities />
        </aside>
        {/* MissionsBoard reads the URL (?view, ?open, ?q), so it renders on the client */}
        <Suspense fallback={<p className="loading">Loading missions…</p>}>
          <MissionsBoard />
        </Suspense>
      </main>
    </>
  );
}
