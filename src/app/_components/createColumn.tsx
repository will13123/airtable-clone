import React, { useState, useCallback, useRef, useEffect } from "react";
import { api } from "~/trpc/react";
import { useQueryClient } from "@tanstack/react-query";

export default function CreateColumn({ tableId, viewId, setHasInitialised }: { tableId: string, viewId: string, setHasInitialised: (input: boolean) => void }) {
  const queryClient = useQueryClient();
  const utils = api.useUtils();

  const [columnDropdownIsOpen, setColumnDropdownIsOpen] = useState(false);
  const [type, setType] = useState("");
  const [columnName, setColumnName] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  const createColumn = api.column.create.useMutation({
    onSuccess: () => {
      setHasInitialised(false);
      void queryClient.resetQueries({ 
        queryKey: ['viewRows', viewId] 
      });
      void queryClient.refetchQueries({ 
        queryKey: ['viewRows', viewId] 
      });
      void utils.view.getViewRows.invalidate({ viewId });
    }
  });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setColumnDropdownIsOpen(false);
      }
    };
    if (columnDropdownIsOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [columnDropdownIsOpen]);

  const handleColumnDropdown = useCallback(() => {
    setColumnDropdownIsOpen(!columnDropdownIsOpen);
  }, [columnDropdownIsOpen]);

  const handleFormSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    setColumnDropdownIsOpen(false);
    
    if (type === "text" || type === "number") {
      createColumn.mutate({ tableId, type, name: columnName });
      createColumn.mutate({ tableId, type, name: ""});
    } else {
      alert("Enter a valid type");
    }
    
    setType("");
    setColumnName("");
  }, [type, columnName, createColumn, tableId]);

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      <button
        onClick={handleColumnDropdown}
        className="py-2 px-4 focus:outline-none cursor-pointer gap-2"
      >
        <svg className="w-4 h-4 fill-gray-600 hover:fill-gray-700 inline-block" viewBox="0 0 22 22">
          <use href="/icon_definitions.svg#Plus"/>
        </svg>
      </button>
      
      <div
        className={`absolute left-0 w-70 mt-2 p-3 bg-white border border-gray-200 rounded-md shadow-lg z-10 ${
          columnDropdownIsOpen ? 'block' : 'hidden'
        }`}
      >
        <ul className="py-1 text-sm text-gray-700">
          <li>
            <form onSubmit={handleFormSubmit} className="flex flex-col gap-2">
              <input
                type="text"
                placeholder="Column Name"
                value={columnName}
                onChange={(e) => setColumnName(e.target.value)}
                className="w-full rounded-md mb-2 bg-white px-4 py-2 text-black border border-gray-200 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                required
              />
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full rounded-md mb-2 bg-white px-4 py-2 text-black border border-gray-200 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 cursor-pointer"
                required
              >
                <option value="text">Text Column</option>
                <option value="number">Number Column</option>
              </select>
              <button
                type="submit"
                className="rounded-md mb-4 bg-blue-400 text-white px-4 py-2 font-semibold transition hover:bg-blue-500 shadow cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={createColumn.isPending}
              >
                {createColumn.isPending ? "Creating..." : "Create"}
              </button>
            </form>
          </li>
        </ul>
      </div>
    </div>
  );
}