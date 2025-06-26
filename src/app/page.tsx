import Link from "next/link";

import { LatestPost } from "~/app/_components/post";
import { auth } from "~/server/auth";
import { api, HydrateClient } from "~/trpc/server";
import Image from "next/image"
import { redirect } from "next/navigation";

export default async function Home() {
  const hello = await api.post.hello({ text: "from tRPC" });
  const session = await auth();

  if (session?.user) {
    void api.post.getLatest.prefetch();
    if (session?.user) {
      redirect("/dashboard");
    }
  }

  return (
    <HydrateClient>
      <main className="flex min-h-screen flex-col items-center justify-center bg-white text-black">
        <div className="container flex flex-col items-center justify-center gap-12 px-4 py-16">
          <Image
              src="/airtable-logo.webp" 
              alt="Airtable Logo"
              width={100}
              height={100}
              className="object-contain"
            />
          <h1 className="text-5xl font-extrabold tracking-tight sm:text-[5rem]">
            Airtable Clone
          </h1>
          <div className="flex flex-col items-center gap-2">
            <div className="flex flex-col items-center justify-center gap-4">
              <Link
                href={session ? "/api/auth/signout" : "/api/auth/signin"}
                className="rounded-full bg-teal-300 text-black px-20 py-6 font-semibold no-underline transition hover:bg-teal-200"
              >
              {session ? "Sign out" : "Sign in"}
              </Link>
            </div>
          </div>
        </div>
      </main>
    </HydrateClient>
  );
}
