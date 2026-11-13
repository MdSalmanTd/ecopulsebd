import Topbar from "@/components/Topbar";
import SideMenu from "@/components/SideMenu";
import ProfileCard from "@/components/ProfileCard";
import Communities from "@/components/Communities";
import AssistantChat from "@/components/AssistantChat";

export const metadata = { title: "AI Assistant" };

export default function AssistantPage() {
  return (
    <>
      <Topbar active="assistant" />

      <main className="layout layout--assistant">
        <aside className="sidebar sidebar--left">
          <ProfileCard
            subtitle="Level 4 · Eco Champion"
            percent={78}
            caption="1,240 / 1,600 ECO SCORE"
          />
          <SideMenu active="assistant" />
          <Communities />
        </aside>

        <section className="assistant">
          <header className="page-head">
            <span className="eyebrow">USES LIVE DATA FOR MIRPUR 10, DHAKA</span>
            <h1>AI Assistant</h1>
          </header>

          <AssistantChat />

          <p className="notice">
            <img className="ic" src="/icons/alert.svg" alt="" />
            The assistant gives guidance, not official warnings. Follow alerts from BWDB
            and local authorities.
          </p>
        </section>
      </main>
    </>
  );
}
