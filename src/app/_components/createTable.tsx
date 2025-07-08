"use client";

import { useState, useRef, useEffect } from "react";
import { api } from "~/trpc/react";

export default function CreateTable({ baseId }: { baseId: string }) {
  const utils = api.useUtils();
  const [name, setName] = useState("");
  const [isOpen, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const createTable = api.table.create.useMutation({
    onSuccess: async () => {
      await utils.table.invalidate();
      await utils.base.getTables.invalidate({ baseId });
      setName("");
    },
  });

  const createRow = api.row.create.useMutation({
    onSuccess: () => {
      void utils.table.invalidate();
    },
  });
  
  const createColumn = api.column.create.useMutation({
    onSuccess: () => {
      void utils.table.invalidate();
    }
  });

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

  const handleDropDown = () => {
    setOpen(!isOpen);
  };

  return (
    <div className="w-full max-w-xs">
      <div className="relative inline-block" ref={dropdownRef}>
        <button
          onClick={handleDropDown}
          className="py-1 px-2 text-sm text-gray-600 hover:text-gray-700 focus:outline-none cursor-pointer gap-2"
        >
          <svg className="mr-1 mb-1 w-5 h-5 fill-current inline-block" viewBox="0 0 22 22">
            <use href="/icon_definitions.svg#Plus" />
          </svg>
          Add or import
        </button>
        <div
          className={`absolute left-0 w-70 mt-2 p-3 bg-white border border-gray-200 rounded-md shadow-lg z-50 ${
            isOpen ? 'block' : 'hidden'
          }`}
        >
          <ul className="py-1 text-sm text-gray-700">
            <li>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  setOpen(!isOpen);
                  if (name.length > 0) {
                    const tableId = await createTable.mutateAsync({ baseId, name });
                    if (tableId) {                      
                      // Create default columns and rows
                      await createColumn.mutateAsync({ 
                        tableId, 
                        type: "text", 
                        name: "Name" 
                      });
                      
                      await createColumn.mutateAsync({ 
                        tableId, 
                        type: "number", 
                        name: "Value" 
                      });
                      
                      await createColumn.mutateAsync({ 
                        tableId, 
                        type: "text", 
                        name: "Notes" 
                      });
                      await createRow.mutateAsync({ tableId });
                      await createRow.mutateAsync({ tableId });
                      await createRow.mutateAsync({ tableId });
                      await createRow.mutateAsync({ tableId });
                      await createRow.mutateAsync({ tableId });
                    }
                  } else {
                    alert("Name must have at least one character");
                  }
                }}
                className="flex flex-col gap-2"
              >
                <input
                  type="text"
                  placeholder="Table Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-md mb-2 bg-white px-4 py-2 text-black border-gray-200 border-1"
                />
                <button
                  type="submit"
                  className="rounded-md mb-4 bg-blue-400 text-white px-4 py-2 font-semibold transition hover:bg-blue-400 shadow cursor-pointer"
                  disabled={createTable.isPending}
                >
                  {createTable.isPending ? "Creating..." : "Create"}
                </button>
              </form>
            </li>
            <li>
              <button
                onClick={handleDropDown}
                className="block w-full rounded-md text-left px-4 py-2 hover:bg-gray-100 border-gray-200 border-1"
              >
                Close
              </button>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}