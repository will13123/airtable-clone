"use client";

import React, { useState, useEffect } from "react";

type SearchButtonProps = {
  onSearch: (searchTerm: string) => void;
}

export default function SearchButton({ onSearch }: SearchButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Debounce search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      onSearch(searchTerm);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchTerm, onSearch]);


  return (
    <div className="relative inline-block">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="py-2 px-4 text-gray-600 hover:text-gray-700 focus:outline-none cursor-pointer text-sm flex items-center gap-2"
      >
        Search
      </button>
      
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-60 bg-white border border-gray-200 rounded-md shadow-lg z-20">
          <div className="p-3">
            <div className="relative">
              <input
                type="text"
                placeholder="Search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                autoFocus
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}