"use client";

import React, { useState } from "react";

type Column = {
  id: string;
  name: string;
  type: string;
}

type HideButtonProps = {
  columns: Column[];
  hiddenColumns: string[];
  onToggleColumn: (columnId: string) => void;
}

export default function HideButton({ columns, hiddenColumns, onToggleColumn }: HideButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  const handleColumnToggle = (columnId: string) => {
    onToggleColumn(columnId);
  };

  return (
    <div className="relative inline-block">
      <button
        onClick={toggleDropdown}
        className="py-2 px-4 text-gray-600 hover:text-gray-700 focus:outline-none cursor-pointer text-sm"
      >
        Hide Fields
      </button>
      
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-64 bg-white border border-gray-200 rounded-md shadow-lg z-20">
          <div className="p-3">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Show/Hide Columns</h3>
            <div className="max-h-60 overflow-y-auto">
              {columns.map((column) => {
                const isVisible = !hiddenColumns.includes(column.id);
                return (
                  <label
                    key={column.id}
                    className="flex items-center space-x-2 py-1 hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={isVisible}
                      onChange={() => handleColumnToggle(column.id)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700 flex-1">{column.name}</span>
                    <span className="text-xs text-gray-400 uppercase">{column.type}</span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}