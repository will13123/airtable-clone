import { auth } from "~/server/auth";

import Image from "next/image";
import Dropdown from "../_components/dropdown";
import Sidebar from "../_components/sidebar";
import ToggleButton from "../_components/toggleButton";
import CreateBase from "../_components/createBase";
import BaseList from "../_components/baseList";


export default async function Dashboard() {
  const session = await auth();

  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  const username = session.user?.name || session.user?.email?.split("@")[0] || "User";
  const profileImage = session.user?.image || "https://via.placeholder.com/40";
  const name = session.user?.name ?? "";
  const email = session.user?.email ?? ""; 

  

  return (
    <div className="bg-neutral-300">
      <header className="flex justify-center items-center bg-white border-b-2 border-solid border-neutral-300 p-6 pl-10 pr-10">
        <div className="flex flex-1 justify-start items-center gap-2">
          <ToggleButton/>
          <Image
            src="/airtable-logo.webp" 
            alt="Airtable Logo"
            width={40}
            height={40}
            className="object-contain"
          />
          <p className="text-xl font-bold">Airtable</p>
        </div>
        <div className="flex-row justify-items-center justify-center">
          <button className="bg-white hover:shadow-lg text-neutral-400 py-2 px-30 rounded-full border border-solid border-neutral-300">
            Search
          </button>
        </div>
        <div className="flex-row justify-items-end flex-1">
          <Dropdown profileImage={profileImage} name={name} email={email}/>
        </div>
      </header>
      <Sidebar/>
      <main className="flex min-h-screen flex-col bg-neutral-50 text-black p-6 pl-50 pt-20">
          <h1 className="text-4xl font-bold mb-6">Home</h1>
          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Your Bases</h2>
            <BaseList userId={session.user.id}/>
            <CreateBase/>
          </section>
      </main>
    </div>
  );
}