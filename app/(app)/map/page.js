import Topbar from "@/components/Topbar";
import SideMenu from "@/components/SideMenu";
import MapView from "@/components/app/MapView";

export const metadata = { title: "Map" };

export default function MapPage() {
  return (
    <>
      <Topbar />
      <main className="layout layout--assistant layout--map">
        <aside className="sidebar sidebar--left">
          <SideMenu active="map" />
        </aside>
        <MapView />
      </main>
    </>
  );
}
