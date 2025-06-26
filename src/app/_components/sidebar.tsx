"use client";

import { useEffect } from "react";

export default function Sidebar() {
  // useEffect(() => {
  //   const handleClickOutside = (event: MouseEvent) => {
  //     const sidebar = document.querySelector(".sidebar-panel");
  //     if (sidebar && !sidebar.contains(event.target as Node)) {
  //       sidebar.classList.remove("translate-x-0");
  //       sidebar.classList.add("-translate-x-full");
  //     }
  //   };

  //   document.addEventListener("mousedown", handleClickOutside);
  //   return () => document.removeEventListener("mousedown", handleClickOutside);
  // }, []);

  return (
    <div className="relative">
      <div
        className="fixed top-105.33 left-0 h-full bg-white shadow-md transition-all duration-300 sidebar-panel p-2 -translate-x-full z-0 pr-30 justify-items-center justify-center bg-neutral-500"
      >
        <h2 className="text-xl font-bold mb-4">Sidebar</h2>
        <button
          className="w-full bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          onClick={() => console.log("Create clicked")} // Placeholder
        >
          Create
        </button>
      </div>
    </div>
  );
}