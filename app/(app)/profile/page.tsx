import { Suspense } from "react";
import Topbar from "@/components/Topbar";
import SideMenu from "@/components/SideMenu";
import Communities from "@/components/Communities";
import ProfileBoard from "@/components/app/ProfileBoard";

export const metadata = { title: "Your profile" };

export default function ProfilePage() {
  return (
    <>
      <Topbar />
      <main className="layout layout--assistant">
        <aside className="sidebar sidebar--left">
          <SideMenu active="profile" />
          <Communities />
        </aside>
        {/* ProfileBoard reads ?tab from the URL */}
        <Suspense fallback={<p className="feed__empty">Loading profile…</p>}>
          <ProfileBoard />
        </Suspense>
      </main>
    </>
  );
}
