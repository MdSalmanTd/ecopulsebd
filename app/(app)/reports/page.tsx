import Topbar from "@/components/Topbar";
import SideMenu from "@/components/SideMenu";
import ProfileCard from "@/components/ProfileCard";
import Communities from "@/components/Communities";
import ReportsBoard from "@/components/app/ReportsBoard";

export const metadata = { title: "My reports" };

export default function ReportsPage() {
  return (
    <>
      <Topbar active="reports" />
      <main className="layout">
        <aside className="sidebar sidebar--left" aria-label="Your account">
          <ProfileCard />
          <SideMenu active="reports" />
          <Communities />
        </aside>
        <ReportsBoard />
      </main>
    </>
  );
}
