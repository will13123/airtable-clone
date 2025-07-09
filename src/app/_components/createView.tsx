"use client";

import { useState, useRef, useEffect } from "react";
import { api } from "~/trpc/react";

export default function CreateView({ tableId, isOpen, setOpen }: { tableId: string, isOpen: boolean, setOpen: (input: boolean) => void }) {
  const utils = api.useUtils();
  const [name, setName] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const createView = api.table.createView.useMutation({
    onSuccess: async () => {
      await utils.table.invalidate();
      await utils.table.getViews.invalidate({ tableId });
      setName("");
    },
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
  }, [isOpen, setOpen]);

  const handleDropDown = () => {
    setOpen(!isOpen);
  };

  return (
    <div className="w-full">
      <div className="relative w-full" ref={dropdownRef}>
        <button
          onClick={handleDropDown}
          className="w-full p-3 text-sm cursor-pointer text-left whitespace-nowrap transition-colors duration-200 hover:bg-gray-100 bg-white flex items-center"
        >
          <svg className="w-4 h-4 mr-2 fill-current inline-block" viewBox="0 0 22 22">
            <use href="/icon_definitions.svg#Plus"/>
          </svg>
          Create new...
        </button>
        <div
          className={`absolute left-0 w-70 mt-2 p-3 bg-white border border-gray-200 rounded-md shadow-lg z-50 ${
            isOpen ? 'block' : 'hidden'
          }`}
        >
          <ul className="py-1 text-sm text-gray-700">
            <li>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setOpen(!isOpen);
                  if (name.length > 0) {
                    createView.mutate({ tableId, name });
                  } else {
                    alert("Name must have at least one character");
                  }
                }}
                className="flex flex-col gap-2"
              >
                <input
                  type="text"
                  placeholder="View Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-md mb-2 bg-white px-4 py-2 text-black border-gray-200 border-1"
                />
                <button
                  type="submit"
                  className="rounded-md mb-4 bg-blue-400 text-white px-4 py-2 font-semibold transition hover:bg-blue-400 shadow cursor-pointer"
                  disabled={createView.isPending}
                >
                  {createView.isPending ? "Creating..." : "Create"}
                </button>
              </form>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}