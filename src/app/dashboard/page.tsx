import { auth } from "~/server/auth";
import DashboardWrapper from "../_components/dashboardWrapper";

export default async function Dashboard() {
  const session = await auth();

  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  const name = session.user?.name ?? "User";
  const profileImage = session.user?.image ?? "https://via.placeholder.com/40";
  const email = session.user?.email ?? "No Email"; 

  return (
    <DashboardWrapper 
      name={name}
      profileImage={profileImage}
      email={email}
      userId={session.user.id}
    />
  );
}