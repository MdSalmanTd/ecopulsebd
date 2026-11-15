import Topbar from "@/components/Topbar";
import SideMenu from "@/components/SideMenu";
import ProfileCard from "@/components/ProfileCard";
import PartnerBoard from "@/components/app/PartnerBoard";

export const metadata = { title: "Partner dashboard" };

export default function PartnerPage() {
  return (
    <>
      <Topbar />
      <main className="layout layout--assistant">
        <aside className="sidebar sidebar--left">
          <ProfileCard />
          <SideMenu active="partner" />
        </aside>
        <PartnerBoard />
      </main>
    </>
  );
}
