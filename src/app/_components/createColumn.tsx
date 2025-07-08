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
        className="py-2 px-4 text-gray-600 hover:text-gray-700 focus:outline-none border-l-2 border-gray-300 cursor-pointer text-xl gap-2"
      >
        Create Column
      </button>
      
      <div
        className={`absolute left-0 bottom-full w-70 mb-2 p-3 bg-white border border-gray-200 rounded-md shadow-lg z-10 ${
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
                className="w-full rounded-md mb-2 bg-white px-4 py-2 text-black border-gray-200 border-1"
                required
              />
              <input
                type="text"
                placeholder="Enter 'text' or 'number'"
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full rounded-md mb-2 bg-white px-4 py-2 text-black border-gray-200 border-1"
                required
              />
              <button
                type="submit"
                className="rounded-md mb-4 bg-blue-400 text-white px-4 py-2 font-semibold transition hover:bg-blue-400 shadow cursor-pointer"
                disabled={createColumn.isPending}
              >
                {createColumn.isPending ? "Creating..." : "Create"}
              </button>
            </form>
          </li>
          <li>
            <button
              onClick={handleColumnDropdown}
              className="block w-full rounded-md text-left px-4 py-2 hover:bg-gray-100 border-gray-200 border-1"
            >
              Close
            </button>
          </li>
        </ul>
      </div>
    </div>
  );
}