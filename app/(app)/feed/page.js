import { Suspense } from "react";
import Topbar from "@/components/Topbar";
import SideMenu from "@/components/SideMenu";
import ProfileCard from "@/components/ProfileCard";
import Communities from "@/components/Communities";
import FeedBoard from "@/components/app/FeedBoard";
import FeedSidebar from "@/components/app/FeedSidebar";

export const metadata = { title: "Feed" };

export default function FeedPage() {
  return (
    <>
      <Topbar />
      <main className="layout layout--feed">
        <aside className="sidebar sidebar--left">
          <ProfileCard subtitle="Level 4 · Eco Champion" percent={78} caption="1,240 / 1,600 ECO SCORE" />
          <SideMenu active="feed" />
          <Communities />
        </aside>
        {/* FeedBoard reads ?view and ?post from the URL */}
        <Suspense fallback={<p className="feed__empty">Loading feed…</p>}>
          <FeedBoard />
        </Suspense>
        <FeedSidebar />
      </main>
    </>
  );
}
