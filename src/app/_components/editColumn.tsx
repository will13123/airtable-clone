"use client";

import { useState } from "react";
import { api } from "~/trpc/react";

export default function EditColumn({ columnId }: { columnId: string }) {
  const utils = api.useUtils();
  const [isOpen, setOpen] = useState(false);
  const { data: type } = api.column.getType.useQuery({ columnId });
  if (columnId === "id") return(<div></div>); // For the row no.
  const handleDropDown = () => {
    setOpen(!isOpen);
  };

  return (
    <div className="relative inline-block align-self-center justify-self-end">
      <button
        onClick={handleDropDown}
        className="py-2 px-4 text-gray-600 text-xl hover:text-gray-700 focus:outline-none cursor-pointer gap-2"
      >
        <svg className="ml-2 w-6 h-6 fill-current inline-block" viewBox="0 0 22 22">
          <use href="/icon_definitions.svg#ChevronDown"/>
        </svg>
      </button>
      <div
        className={`absolute left-0 w-70 mt-2 p-3 bg-white border border-gray-200 rounded-md shadow-lg z-10 ${
          isOpen ? 'block' : 'hidden'
        }`}
      >
        <ul className="py-1 text-sm text-gray-700">
          <li>
            <button
              className="block w-full rounded-md text-left px-4 py-2 hover:bg-gray-100 border-gray-200 cursor-pointer"
            >
              {
                (type === "text")
                  ? <div>Sort A-{'>'}Z</div> 
                  : <div>Sort Ascending</div> 
              }
              <svg className="ml-2 w-6 h-6 fill-current inline-block" viewBox="0 0 22 22">
                <use href="/icon_definitions.svg#SortAscending"/>
              </svg>
            </button>
            
            <button
              className="block w-full rounded-md text-left px-4 py-2 hover:bg-gray-100 border-gray-200 cursor-pointer"
            >
              {
                (type === "text")
                  ? <div>Sort Z-{'>'}A</div> 
                  : <div>Sort Descending</div> 
              }
              <svg className="ml-2 w-6 h-6 fill-current inline-block" viewBox="0 0 22 22">
                <use href="/icon_definitions.svg#SortDescending"/>
              </svg>
            </button>
          </li>
        </ul>
      </div>
    </div>
  )
}