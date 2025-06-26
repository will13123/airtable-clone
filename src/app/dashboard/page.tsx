import { auth } from "~/server/auth";
import Link from "next/link";


export default async function Dashboard() {
  const session = await auth();

  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  const username = session.user?.name || session.user?.email?.split("@")[0] || "User";

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-white text-black p-6">
      <div className="w-full max-w-4xl items-center justify-center">
        <h1 className="text-4xl font-bold text-center mb-6">Dashboard</h1>
        <p className="text-xl text-center mb-6">Welcome, {username}</p>
        <Link
          href={"/api/auth/signout"}
          className="rounded-full bg-teal-300 text-black px-20 py-6 font-semibold no-underline transition hover:bg-teal-200"
        >
          {session ? "Sign out" : "Home"}
        </Link>
      </div>
    </main>
  );
}