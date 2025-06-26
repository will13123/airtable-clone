"use client";

import { useEffect } from "react";
import Image from "next/image";

export default function ToggleButton() {
  useEffect(() => {
    const handleToggle = () => {
      const sidebar = document.querySelector(".sidebar-panel");
      if (sidebar) {
        const isOpen = sidebar.classList.contains("translate-x-0");
        sidebar.classList.toggle("translate-x-0", !isOpen);
        sidebar.classList.toggle("-translate-x-full", isOpen);
      }
    };

    const button = document.querySelector(".toggle-button");
    if (button) {
      button.addEventListener("click", handleToggle);
    }

    return () => {
      if (button) {
        button.removeEventListener("click", handleToggle);
      }
    };
  }, []);

  return (
    <button className="p-2 bg-gray-300 rounded-l focus:outline-none toggle-button">
      <Image
        src="/sidebar-logo.png" // Replace with your sidebar toggle image
        alt="Toggle Sidebar"
        width={40}
        height={40}
        className="object-contain"
      />
    </button>
  );
}