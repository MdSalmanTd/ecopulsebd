import { redirect } from "next/navigation";

// Rewards now live on the profile page.
export default function RewardsPage() {
  redirect("/profile?tab=rewards");
}
