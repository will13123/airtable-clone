"use client";

import { api } from "~/trpc/react";
import CreateView from "./createView";
import CurrentView from "./currentView";
import { useState, useEffect } from "react";
import SortButton from "./sortButton";
import FilterButton from "./filterButton";


export default function CurrentTable({ tableId }: { tableId: string }) {
  const utils = api.useUtils();
  const { data: name } = api.table.getNameFromId.useQuery({ tableId: tableId });
  const { data: views } = api.table.getViews.useQuery({ tableId });
  const { data: currViewId } = api.table.getCurrView.useQuery({ tableId });
  const { data: earliestView } = api.table.earliestView.useQuery({ tableId });

  const setCurrView = api.table.setCurrView.useMutation({
    onSuccess: () => {
      void utils.table.getCurrView.invalidate({ tableId });
    },
  });
  
  const [currentViewIdState, setCurrentViewIdState] = useState<string>(currViewId ?? "");

  useEffect(() => {
      if (views && earliestView && currViewId === "") {
        void setCurrView.mutate({ tableId, viewId: earliestView.id });
        setCurrentViewIdState(earliestView.id);
      } else {
        setCurrentViewIdState(currentViewIdState);
      }
    }, [views, currViewId, currentViewIdState, earliestView]);

  return (
    <div className="flex flex-col h-full">
      {/* Top bar for table */}
      <header className="flex justify-center items-center bg-white border-b-1 border-solid border-neutral-300 p-1 pr-5">
        <div className="flex flex-1 justify-start items-center gap-2">
          <p className="text-lg font-bold">Name: {name}</p>
        </div>
        <div className="flex-1"></div>
        <div className="flex flex-row justify-between items-center flex-1">
          <p className="text-neutral-600 text-lg">Hide Fields</p>
          <FilterButton viewId={currViewId ?? ""} tableId={tableId}/>
          <SortButton viewId={currViewId ?? ""}/>
          <p className="text-neutral-600 text-lg">Search</p>
        </div>
      </header>
      {/*Main Box*/}
      <div className="flex">
        {/* Sidebar */}
        <div className=" text-gray-600 flex-shrink-0 flex-col justify-between border-neutral-500 border-r-2">
          <div className="p-2 gap-4 flex flex-col">
            <CreateView tableId={tableId}/>
            
            {views?.map((view) => (
              <button
                key={view.id}
                className={`p-3 text-base cursor-pointer pr-10 text-left ${
                  currViewId === view.id
                    ? 'bg-gray-100'
                    : 'hover:bg-gray-100 bg-white'
                }`}
                onClick={() => {
                  void setCurrView.mutate({ tableId, viewId: view.id });
                  setCurrentViewIdState(view.id);
                }}
              >
                {view.name}
              </button>
            ))}

          
          </div>            
        </div>
        {/* Main Table */}
        {currViewId && <CurrentView viewId={currViewId} tableId={tableId}/>}
        
      </div>
      
    </div>
  )
}