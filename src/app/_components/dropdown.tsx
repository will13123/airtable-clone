"use client";

import { useState } from "react";
import Link from "next/link";

type DropdownProps = {
  profileImage: string;
  name: string | null | undefined;
  email: string | null | undefined
};

export default function Dropdown({profileImage, name, email}: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="focus:outline-none"
      >
        <img
          src={profileImage}
          alt={"Profile picture"}
          width={40}
          height={40}
          className="rounded-full"
        />
      </button>
      {isOpen && (
        <div className="dropdown-menu absolute right-0 mt-2 bg-white border rounded shadow-lg justify-items-center justify-center gap 2 p-5">
          <p>{name}</p>
          <p>{email}</p>
          <Link
            href={"/api/auth/signout"}
            className="text-black font-semibold no-underline transition "
          >
            Logout
          </Link>
        </div>
      )}
    </div>
  );
}