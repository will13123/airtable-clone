"use client";

import { useState } from 'react';
import Image from "next/image";
import Dropdown from "../_components/dropdown";
import Sidebar from "../_components/sidebar";
import ToggleButton from "../_components/toggleButton";

interface DashboardWrapperProps {
  name: string;
  profileImage: string;
  email: string;
  userId: string;
}

export default function DashboardWrapper({ name, profileImage, email, userId }: DashboardWrapperProps) {
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarExpanded(!isSidebarExpanded);
  };

  return (
    <div className="bg-neutral-300">
      <header className="flex justify-center items-center bg-white border-b-2 border-solid border-neutral-300 p-2 pl-3 z-50">
        <div className="flex flex-1 justify-start items-center gap-2 cursor-pointer">
          <ToggleButton onToggle={toggleSidebar} />
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
      <Sidebar userId={userId} isExpanded={isSidebarExpanded} />
    </div>
  );
}