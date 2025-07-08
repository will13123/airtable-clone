"use client";

import { useState, useEffect, useRef } from "react";
import { api } from "~/trpc/react";
import { useQueryClient } from "@tanstack/react-query";

export default function EditColumn({ 
  columnId, 
  viewId, 
  onUpdate 
}: { 
  columnId: string; 
  viewId: string;
  onUpdate: () => void;
}) {
  const utils = api.useUtils();
  const queryClient = useQueryClient();
  const [isOpen, setOpen] = useState(false);
  const { data: type } = api.column.getType.useQuery({ columnId });
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);
  
  const updateSort = api.view.updateSort.useMutation({
    onSuccess: async () => {
      void utils.view.getSorts.invalidate({ viewId });
      void utils.view.getViewRows.invalidate({ viewId });
      void queryClient.resetQueries({ 
        queryKey: ['viewRows', viewId] 
      });
      void queryClient.refetchQueries({ 
        queryKey: ['viewRows', viewId] 
      });
    },
  });
  
  const removeSort = api.view.removeSort.useMutation({
    onSuccess: async () => {
      void utils.view.getSorts.invalidate({ viewId });
      void utils.view.getViewRows.invalidate({ viewId });
      void queryClient.resetQueries({ 
        queryKey: ['viewRows', viewId] 
      });
      void queryClient.refetchQueries({ 
        queryKey: ['viewRows', viewId] 
      });
    },
  });
  
  
  const handleDropDown = () => {
    setOpen(!isOpen);
  };

  return (
    <div className="relative inline-block align-self-center justify-self-end" ref={dropdownRef}>
      <button
        onClick={handleDropDown}
        className="px-2 text-gray-600 text-xl hover:text-gray-700 hover:bg-gray-100 focus:outline-none cursor-pointer gap-2"
      >
        <svg className="w-5 h-5 fill-current inline-block" viewBox="0 0 22 22">
          <use href="/icon_definitions.svg#ChevronDown"/>
        </svg>
      </button>
      <div
        className={`absolute left-0 w-70 mt-2 p-3 bg-white border border-gray-200 rounded-md shadow-lg z-10 ${
          isOpen ? 'block' : 'hidden'
        }`}
      >
        <ul className="py-1">
          <li>
            <button
              className="flex items-center w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md cursor-pointer"
              onClick={() => {
                updateSort.mutate({ viewId, columnId: columnId, direction: "asc" });
                setOpen(false);
              }}
            >
              <svg className="w-4 h-4 fill-current mr-3" viewBox="0 0 22 22">
                <use href="/icon_definitions.svg#SortDescending"/>
              </svg>
              {type === "text" ? "Sort A->Z" : "Sort Ascending"}
            </button>
            
            <button
              className="flex items-center w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md cursor-pointer"
              onClick={() => {
                updateSort.mutate({ viewId, columnId: columnId, direction: "desc" });
                setOpen(false);
              }}
            >
              <svg className="w-4 h-4 fill-current mr-3" viewBox="0 0 22 22">
                <use href="/icon_definitions.svg#SortAscending"/>
              </svg>
              {type === "text" ? "Sort Z->A" : "Sort Descending"}
            </button>
            
            <button
              className="flex items-center w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md cursor-pointer"
              onClick={() => {
                removeSort.mutate({ viewId, columnId: columnId});
                setOpen(false);
              }}
            >
              <svg className="w-4 h-4 fill-current mr-3" viewBox="0 0 22 22">
                <use href="/icon_definitions.svg#X"/>
              </svg>
              Remove Sort
            </button>
          </li>
        </ul>
      </div>
    </div>
  );
}