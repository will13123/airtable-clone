"use client";

import { api } from "~/trpc/react";
import CreateView from "./createView";
import CurrentView from "./currentView";
import { useState, useEffect } from "react";
import SortButton from "./sortButton";
import FilterButton from "./filterButton";
import HideButton from "./hideButton";
import SearchButton from "./searchButton";

export default function CurrentTable({ tableId }: { tableId: string }) {
  const utils = api.useUtils();
  const { data: views } = api.table.getViews.useQuery({ tableId });
  const { data: currViewId } = api.table.getCurrView.useQuery({ tableId });
  const { data: earliestView } = api.table.earliestView.useQuery({ tableId });
  const { data: tableColumns } = api.table.getColumns.useQuery({ tableId });

  const setCurrView = api.table.setCurrView.useMutation({
    onSuccess: () => {
      void utils.table.getCurrView.invalidate({ tableId });
    },
  });
  
  const currView = views?.find(v => v.id === currViewId);
  let name = currView?.name;
  const [currentViewIdState, setCurrentViewIdState] = useState<string>(currViewId ?? "");
  const [currentViewName, setCurrentViewName] = useState(name);
  
  // State for hidden columns
  const [hiddenColumns, setHiddenColumns] = useState<string[]>([]);
  
  // State for search
  const [searchTerm, setSearchTerm] = useState<string>("");

  // Function to toggle column visibility
  const handleToggleColumn = (columnId: string) => {
    setHiddenColumns(prev => 
      prev.includes(columnId) 
        ? prev.filter(id => id !== columnId)
        : [...prev, columnId]
    );
  };

  // Function to handle search
  const handleSearch = (search: string) => {
    setSearchTerm(search);
  };

  useEffect(() => {
      if (views && earliestView && currViewId === "") {
        void setCurrView.mutate({ tableId, viewId: earliestView.id });
        setCurrentViewIdState(earliestView.id);
        setCurrentViewName("Default View");
      } else {
        setCurrentViewIdState(currentViewIdState);
        setCurrentViewName(name);
      }
    }, [views, currViewId, currentViewIdState, earliestView]);

  return (
    <div className="flex flex-col h-full">
      {/* Top bar for table */}
      <header className="flex justify-center items-center bg-white border-b-1 border-solid border-neutral-300 p-1 pr-5">
        <div className="flex flex-1 justify-start items-center gap-2">
          <p className="text-sm font-semibold">{currentViewName}</p>
        </div>
        <div className="flex-1"></div>
        <div className="flex flex-row justify-between items-center flex-1">
          <HideButton 
            columns={tableColumns ?? []} 
            hiddenColumns={hiddenColumns}
            onToggleColumn={handleToggleColumn}
          />
          <FilterButton viewId={currViewId ?? ""} tableId={tableId}/>
          <SortButton viewId={currViewId ?? ""}/>
          <SearchButton onSearch={handleSearch}/>
        </div>
      </header>
      {/*Main Box*/}
      <div className="flex w-full">
        {/* Sidebar */}
        <div className=" text-gray-600 flex-shrink-0 flex-col justify-between border-neutral-500 border-r-1">
          <div className="p-2 flex flex-col">
            <CreateView tableId={tableId}/>
            
            {views?.map((view) => (
              <button
                key={view.id}
                className={`p-3 text-sm cursor-pointer pr-15 text-left ${
                  currViewId === view.id
                    ? 'bg-gray-100'
                    : 'hover:bg-gray-100 bg-white'
                }`}
                onClick={() => {
                  void setCurrView.mutate({ tableId, viewId: view.id });
                  setCurrentViewIdState(view.id);
                  setCurrentViewName(view.name);
                  name = view.name;
                }}
              >
                {view.name}
              </button>
            ))}
          </div>            
        </div>
        {/* Main Table */}
        {currViewId && (
          <CurrentView 
            viewId={currViewId} 
            tableId={tableId}
            hiddenColumns={hiddenColumns}
            searchTerm={searchTerm}
          />
        )}
      </div>
    </div>
  )
}