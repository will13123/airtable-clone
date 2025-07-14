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
  const [isClicked, setIsClicked] = useState(false);

  const toggleClick = () => {
    setIsClicked(!isClicked);
    setIsSidebarExpanded(false);
  }

  return (
    <div className="bg-neutral-300 h-full">
      <header className="flex justify-center items-center bg-white border-b-1 border-solid border-neutral-300 py-1 px-3 z-50 h-[6.5%]">
        <div className="flex flex-1 justify-start items-center gap-2">
          <ToggleButton onToggle={toggleClick} />
          <Image
            src="/airtable-logo.webp" 
            alt="Airtable Logo"
            width={30}
            height={30}
            className="object-contain"
          />
          <p className="text-lg font-bold">Airtable</p>
        </div>
        <div className="flex justify-center items-center">
          <button className="flex items-center justify-between bg-white hover:shadow-md text-neutral-600 py-2 px-3 rounded-full border border-gray-100 shadow-sm cursor-pointer min-w-[330px]">
            <div className="flex items-left gap-1">
              <svg className="w-4 h-4 fill-current" viewBox="0 0 22 22">
                <use href="/icon_definitions.svg#MagnifyingGlass"/>
              </svg>
              <span className='text-xs text-neutral-600'>Search...</span>
            </div>
            <span className="text-xs text-neutral-500 text-right">ctrl K</span>
          </button>
        </div>
        <div className="flex justify-end flex-1 items-center gap-4">
          <button className="flex items-center gap-1 bg-white hover:bg-gray-50 text-neutral-600 py-2 px-3 rounded-full shadow-sm cursor-pointer transition-colors duration-150">
            <svg className="w-4 h-4 fill-current" viewBox="0 0 22 22">
              <use href="/icon_definitions.svg#Question"/>
            </svg>
            <span className="text-xs">Help</span>
          </button>
          
          <button className="flex items-center justify-center bg-white hover:bg-gray-50 text-neutral-600 w-8 h-8 rounded-full shadow-sm cursor-pointer transition-colors duration-150">
            <svg className="w-4 h-4 fill-current" viewBox="0 0 22 22">
              <use href="/icon_definitions.svg#Bell"/>
            </svg>
          </button>
          
          <Dropdown profileImage={profileImage} name={name} email={email} dashboard={true}/>
        </div>
      </header>
      <Sidebar userId={userId} isExpanded={isSidebarExpanded} setIsExpanded={setIsSidebarExpanded} isClicked={isClicked}/>
    </div>
  );
}