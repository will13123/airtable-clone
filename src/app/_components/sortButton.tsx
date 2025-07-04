"use client";

import { useState } from "react";
import { api } from "~/trpc/react";

export default function Sortbutton({ viewId }: { viewId: string }) {
  // const utils = api.useUtils();
  const [isOpen, setOpen] = useState(false);
  const { data: sorts } = api.view.getSorts.useQuery({ viewId });
  // Implement these later
  // const updateSort = api.view.updateSort.useMutation({
  //   onSuccess: () => {
  //     void utils.view.getViewRows.invalidate({ viewId });
  //     void utils.view.getSorts.invalidate({ viewId });
  //   },
  // });
  // const removeSort = api.view.removeSort.useMutation({
  //   onSuccess: () => {
  //     void utils.view.getViewRows.invalidate({ viewId });
  //     void utils.view.getSorts.invalidate({ viewId });
  //   },
  // });

  const formattedSorts = sorts
    ? sorts.map((sort) => ({
        columnId: sort.split(":")[0] ?? "",
        direction: sort.split(":")[1] ?? ""
      }))
    : []


  const handleDropDown = () => {
    setOpen(!isOpen);
  };

  return (
    <div className="relative inline-block">
      <button
        onClick={handleDropDown}
        className="py-2 px-4 text-gray-600 text-sm hover:text-gray-700 focus:outline-none cursor-pointer gap-2"
      >
        Sort
      </button>
      <div
        className={`absolute right-0 w-70 mt-2 p-3 bg-white border border-gray-200 rounded-md shadow-lg z-10 ${
          isOpen ? 'block' : 'hidden'
        }`}
      >
        <ul className="py-1 text-sm text-gray-700">
          <li>
            {formattedSorts.map((sort) => {
              return (
                <div key={sort.columnId}>
                  {sort.columnId}: {sort.direction}
                </div>
              )
            })}
          </li>
        </ul>
      </div>
    </div>
  )
}