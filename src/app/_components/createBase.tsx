"use client";

import { useState, useEffect, useRef } from "react";
import { api } from "~/trpc/react";

export default function CreateBase({ isExpanded, isClicked }: { isExpanded: boolean, isClicked: boolean }) {
  const utils = api.useUtils();
  const [name, setName] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const createBase = api.base.create.useMutation({
    onSuccess: async () => {
      await utils.base.invalidate();
      setName("");
      setIsDropdownOpen(false);
    },
  });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
        setName("");
      }
    };

    if (isDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isDropdownOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      createBase.mutate({ name });
    }
  };

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <button
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        className={`flex items-center justify-center cursor-pointer rounded transition-colors duration-200 ${
          (isExpanded || isClicked) 
            ? 'bg-blue-500 text-white hover:bg-blue-600' 
            : 'border border-gray-300 text-gray-600 hover:bg-gray-100'
        } ${
          (!isExpanded && !isClicked) ? 'w-5 h-5' : 'w-full px-3 py-2'
        }`}
      >
        <svg className={`w-4 h-4 flex-shrink-0 ${(isExpanded || isClicked)  ? 'fill-white' : 'fill-gray-600'}`} viewBox="0 0 22 22">
          <use href="/icon_definitions.svg#Plus"/>
        </svg>
        {(isExpanded || isClicked) && (
          <span className="ml-3 text-sm whitespace-nowrap">
            Create
          </span>
        )}
      </button>

      {isDropdownOpen && (
        <div className="absolute bottom-full mb-2 left-0 w-64 bg-white border border-neutral-200 rounded-lg shadow-lg z-20 p-4">
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <input
              type="text"
              placeholder="Enter base name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-md border border-neutral-300 px-4 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                type="submit"
                className="flex-1 rounded-md bg-blue-500 text-white px-4 py-2 font-medium transition cursor-pointer hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
                disabled={createBase.isPending || !name.trim()}
              >
                {createBase.isPending ? "Creating..." : "Create"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsDropdownOpen(false);
                  setName("");
                }}
                className="px-4 py-2 text-gray-500 hover:text-gray-700 transition cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}