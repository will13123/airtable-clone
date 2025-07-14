"use client";

import { useState } from "react";
import Link from "next/link";

export default function Dropdown({profileImage, name, email, dashboard}: {profileImage: string, name: string, email: string, dashboard: boolean}) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className={`relative items-center justify-center`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="focus:outline-none cursor-pointer flex items-center justify-center"
      >
        <img
          src={profileImage}
          alt={"Profile picture"}
          width={30}
          height={30}
          className="rounded-full object-cover"
        />
      </button>
      {isOpen && (
        <div className={`dropdown-menu absolute bg-white border border-gray-200 rounded-lg shadow-lg p-4 z-50 min-w-[200px] ${
          dashboard ? 'right-0 mt-2' : 'left-0 mb-2 bottom-full'
        }`}>
          <div className="text-left mb-3">
            <p className="font-semibold text-gray-800 text-sm">{name}</p>
            <p className="text-gray-600 text-xs">{email}</p>
          </div>
          
          <div className="border-t border-gray-200 pt-3 flex flex-row items-center">
            <svg className="w-4 h-4 fill-gray-700 inline-block flex-shrink-0" viewBox="0 0 22 22">
              <use href="/icon_definitions.svg#SignOut"/>
            </svg>
            <Link
              href={"/api/auth/signout"}
              className="inline-block w-full text-left text-gray-700 pl-1 text-sm no-underline cursor-pointer"
            >
              Logout
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}