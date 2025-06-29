"use client";

import { useState } from "react";
import { api } from "~/trpc/react";

export default function CreateTable({ baseId }: { baseId: string }) {
  const utils = api.useUtils();
  const [name, setName] = useState("");
  const [isOpen, setOpen] = useState(false);
  const createTable = api.table.create.useMutation({
    onSuccess: async () => {
      await utils.table.invalidate();
      await utils.base.getTables.invalidate({ baseId });
      setName("");
    },
  });
  const handleDropDown = () => {
    setOpen(!isOpen);
  };

  return (
    <div className="w-full max-w-xs">
      <div className="relative inline-block">
        <button
          onClick={handleDropDown}
          className="py-2 px-4 text-gray-600 text-xl hover:text-gray-700 focus:outline-none cursor-pointer gap-2"
        >
          Create Table
          <svg className="ml-2 w-6 h-6 fill-current inline-block" viewBox="0 0 22 22">
            <use href="/icon_definitions.svg#Plus" />
          </svg>
        </button>
        <div
          className={`absolute right-0 w-70 mt-2 p-3 bg-white border border-gray-200 rounded-md shadow-lg z-10 ${
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
                    createTable.mutate({ baseId, name });
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