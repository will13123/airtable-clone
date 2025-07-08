"use client";

import React, { useState, useEffect, useRef } from "react";

type Column = {
  id: string;
  name: string;
  type: string;
}

type HideButtonProps = {
  columns: Column[];
  hiddenColumns: string[];
  onToggleColumn: (columnId: string) => void;
  onHideAll: () => void;
  onShowAll: () => void;
}

export default function HideButton({ 
  columns, 
  hiddenColumns, 
  onToggleColumn,
  onHideAll,
  onShowAll 
}: HideButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      setSearchTerm(""); 
    }
  };

  const handleColumnToggle = (columnId: string) => {
    onToggleColumn(columnId);
  };

  const handleHideAll = () => {
    onHideAll();
  };

  const handleShowAll = () => {
    onShowAll();
  };

  const allColumnsHidden = hiddenColumns.length === columns.length;
  const allColumnsVisible = hiddenColumns.length === 0;

  // Filter columns based on search term
  const filteredColumns = columns.filter(column => 
    column.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm("");
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      <button
        onClick={toggleDropdown}
        className={`rounded-xs hover:bg-gray-100 py-2 px-4 hover:text-gray-700 focus:outline-none text-gray-600 cursor-pointer text-xs ${hiddenColumns.length > 0 ? 'bg-blue-100' : ''}`}
      >
        <svg className="w-4 h-4 mr-1 fill-current inline-block" viewBox="0 0 22 22">
          <use href="/icon_definitions.svg#EyeSlash"/>
        </svg>
        {hiddenColumns.length === 0 ? 'Hide Fields' : `${hiddenColumns.length} hidden field${hiddenColumns.length === 1 ? '' : 's'}`}
      </button>
      
      {isOpen && (
        <div className="absolute right-0 top-full  text-sm mt-2 w-64 bg-white border-b border-gray-200 rounded-md shadow-lg z-50">
          <div className="p-3">
            <div className="mb-2">
              <input
                type="text"
                placeholder="Find a field"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 text-sm border-b border-gray-300 rounded-md focus:outline-none focus:ring-2"
              />
            </div>
            <div className="max-h-60 overflow-y-auto">
              {filteredColumns.length > 0 ? (
                filteredColumns.map((column) => {
                  const isVisible = !hiddenColumns.includes(column.id);
                  return (
                    <label
                      key={column.id}
                      className="flex items-center space-x-2 py-2 hover:bg-gray-50 cursor-pointer px-1 rounded"
                    >
                      <div className="relative">
                        <input
                          type="checkbox"
                          checked={isVisible}
                          onChange={() => handleColumnToggle(column.id)}
                          className="sr-only"
                        />
                        <div className={`w-4 h-2 rounded-full transition-colors duration-200 ${
                          isVisible ? 'bg-green-600' : 'bg-gray-300'
                        }`}>
                          <div className={`w-1 h-1 bg-white rounded-full shadow-sm transition-transform duration-200 transform ${
                            isVisible ? 'translate-x-2.5' : 'translate-x-0.5'
                          } translate-y-0.5`}></div>
                        </div>
                      </div>
                      <span className="text-sm text-gray-700 flex-1">{column.name}</span>
                    </label>
                  );
                })
              ) : (
                <div className="py-2 text-sm text-gray-500 text-center">
                  No columns found
                </div>
              )}
            </div>
            <div className="flex gap-2 mt-3 pt-2 border-t border-gray-200">
              <button
                onClick={handleHideAll}
                disabled={allColumnsHidden}
                className={`flex-1 px-3 py-1 text-xs rounded border transition-colors ${
                  allColumnsHidden
                    ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                    : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50 hover:text-gray-700'
                }`}
              >
                Hide all
              </button>
              <button
                onClick={handleShowAll}
                disabled={allColumnsVisible}
                className={`flex-1 px-3 py-1 text-xs rounded border transition-colors ${
                  allColumnsVisible
                    ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                    : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50 hover:text-gray-700'
                }`}
              >
                Show all
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}