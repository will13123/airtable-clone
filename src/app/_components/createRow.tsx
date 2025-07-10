import React, { useState, useRef, useEffect } from "react";
import { api } from "~/trpc/react";
import { useQueryClient } from "@tanstack/react-query";

export default function CreateRow({ tableId, viewId }: { tableId: string, viewId: string }) {
  const queryClient = useQueryClient();
  const utils = api.useUtils();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const createRow = api.row.create.useMutation({
    onSuccess: () => {
      void queryClient.resetQueries({ 
        queryKey: ['viewRows', viewId] 
      });
      void queryClient.refetchQueries({ 
        queryKey: ['viewRows', viewId] 
      });
      void utils.view.getViewRows.invalidate({ viewId });
    },
  });

  const createManyRows = api.row.createMany.useMutation({
    onSuccess: () => {
      void queryClient.resetQueries({ 
        queryKey: ['viewRows', viewId] 
      });
      void queryClient.refetchQueries({ 
        queryKey: ['viewRows', viewId] 
      });
      void utils.view.getViewRows.invalidate({ viewId });
    },
  });

  const handleCreateRow = () => {
    createRow.mutate({ tableId });
    createRow.mutate({ tableId: '' });
    setIsDropdownOpen(false);
  };

  const handleCreateManyRows = () => {
    createManyRows.mutate({ tableId });
    createManyRows.mutate({ tableId: '' });
    setIsDropdownOpen(false);
  };

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const isLoading = createRow.isPending || createManyRows.isPending;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Dropdown Menu */}
      {isDropdownOpen && (
        <div className="absolute bottom-full left-0 mb-2 bg-white border border-gray-200 rounded-md shadow-lg z-50 min-w-[150px]">
          <div className="py-1">
            <button
              className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900"
              onClick={handleCreateRow}
              disabled={isLoading}
            >
              Create 1 Row
            </button>
            <button
              className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900"
              onClick={handleCreateManyRows}
              disabled={isLoading}
            >
              Create 100K Rows
            </button>
          </div>
        </div>
      )}
      
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm flex items-center">
        <button
          className="py-2 px-3 text-gray-600 hover:text-gray-700 focus:outline-none cursor-pointer flex items-center justify-center"
          onClick={toggleDropdown}
          disabled={isLoading}
        >
          <svg className="w-4 h-4 fill-gray-600 hover:fill-gray-700" viewBox="0 0 22 22">
            <use href="/icon_definitions.svg#Plus"/>
          </svg>
        </button>
        
        <div className="w-px h-6 bg-gray-200"></div>
        
        <button
          className="py-2 px-3 text-gray-600 hover:text-gray-700 focus:outline-none cursor-pointer text-sm flex items-center"
          onClick={toggleDropdown}
          disabled={isLoading}
        >
          Add...
        </button>
      </div>
    </div>
  );
}