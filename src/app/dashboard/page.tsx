import { auth } from "~/server/auth";
import Link from "next/link";

import Image from "next/image";
import Dropdown from "../_components/dropdown";
import Sidebar from "../_components/sidebar";
import ToggleButton from "../_components/toggleButton";


export default async function Dashboard() {
  const session = await auth();

  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  const username = session.user?.name || session.user?.email?.split("@")[0] || "User";
  const profileImage = session.user?.image || "https://via.placeholder.com/40";

  

  return (
    <div className="bg-neutral-300">
      <header className="flex justify-center items-center bg-white border-b-2 border-solid border-neutral-300 p-6 pl-10 pr-10">
        <div className="flex flex-1 justify-start items-center gap-2">
          {/* <button
            onClick={() => {
              const sidebar = document.querySelector(".sidebar-panel");
              if (sidebar) {
                const isOpen = sidebar.classList.contains("translate-x-0");
                sidebar.classList.toggle("translate-x-0", !isOpen);
                sidebar.classList.toggle("-translate-x-full", isOpen);
              }
            }}
            className="p-2 bg-gray-300 rounded-l focus:outline-none"
          >
            <Image
              src="/sidebar-logo.png" 
              alt="Sidebar Logo"
              width={40}
              height={40}
              className="object-contain"
            />
          </button> */}
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
          <Dropdown profileImage={profileImage} user={session.user}/>
        </div>
      </header>
      <Sidebar/>
      <main className="flex min-h-screen flex-col bg-neutral-150 text-black p-6">
          <h1 className="text-4xl font-bold mb-6 pt-20 pl-50">Home</h1>
          {/* Bases Section */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Your Bases</h2>
            {/* Placeholder for existing bases - replace with tRPC query later */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
              <div className="bg-white p-4 rounded shadow">Base 1</div>
              <div className="bg-white p-4 rounded shadow">Base 2</div>
              <div className="bg-white p-4 rounded shadow">Base 3</div>
            </div>
            {/* Base Creation */}
            <Base />
          </section>
      </main>
    </div>
  );
}