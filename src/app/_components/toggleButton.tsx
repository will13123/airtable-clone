"use client";

import { useEffect } from "react";
import Image from "next/image";

export default function ToggleButton() {
  useEffect(() => {
    const handleToggle = () => {
      const sidebar = document.querySelector(".sidebar-panel");
      const main = document.querySelector(".main-content");
      if (sidebar && main) {
        const isOpen = sidebar.classList.contains("w-72");
        sidebar.classList.toggle("w-72", !isOpen);
        sidebar.classList.toggle("w-16", isOpen);
        main.classList.toggle("ml-72", !isOpen);
        main.classList.toggle("ml-16", isOpen);
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
    <button className="p-2 rounded-l focus:outline-none toggle-button cursor-pointer">
      <svg className="w-6 h-6 fill-current inline-block" viewBox="0 0 22 22">
        <use href="/icon_definitions.svg#List"/>
      </svg>
    </button>
  );
}