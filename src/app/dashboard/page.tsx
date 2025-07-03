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

  const name = session.user?.name ?? "User";
  const profileImage = session.user?.image ?? "https://via.placeholder.com/40";
  const email = session.user?.email ?? "No Email"; 

  

  return (
    <div className="bg-neutral-300">
      <header className="flex justify-center items-center bg-white border-b-2 border-solid border-neutral-300 p-3 pl-3">
        <div className="flex flex-1 justify-start items-center gap-2">
          <ToggleButton/>
          <Image
            src="/airtable-logo.webp" 
            alt="Airtable Logo"
            width={30}
            height={30}
            className="object-contain"
          />
          <p className="text-lg font-bold">Airtable</p>
        </div>
        <div className="flex-row justify-items-center justify-center">
          <button className="bg-white hover:shadow-lg text-neutral-400 py-1 px-35 rounded-full border border-solid border-neutral-300">
            Search
          </button>
        </div>
        <div className="flex-row justify-items-end flex-1">
          <Dropdown profileImage={profileImage} name={name} email={email}/>
        </div>
      </header>
      <Sidebar userId={session.user.id}/>
      
    </div>
  );
}