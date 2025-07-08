"use client";

import { api } from "~/trpc/react";
import CreateView from "./createView";
import CurrentView from "./currentView";
import { useState, useEffect, useCallback } from "react";
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
  const { data: hiddenColumns } = api.view.getHiddenColumns.useQuery(
    { viewId: currViewId ?? "" },
    { enabled: !!currViewId }
  );
  
  const [isOpen, setOpen] = useState(false); // For the createView dropdown
  const setCurrView = api.table.setCurrView.useMutation({
    onSuccess: () => {
      void utils.table.getCurrView.invalidate({ tableId });
    },
  });
  
  const updateHiddenColumns = api.view.updateHiddenColumns.useMutation({
    onSuccess: () => {
      void utils.view.getHiddenColumns.invalidate({ viewId: currViewId ?? "" });
    },
  });
  
  const hideAll = api.view.hideAll.useMutation({
    onSuccess: () => {
      void utils.view.getHiddenColumns.invalidate({ viewId: currViewId ?? "" });
    },
  });
  
  const showAll = api.view.showAll.useMutation({
    onSuccess: () => {
      void utils.view.getHiddenColumns.invalidate({ viewId: currViewId ?? "" });
    },
  });
  
  const currView = views?.find(v => v.id === currViewId);
  let name = currView?.name;
  const [currentViewIdState, setCurrentViewIdState] = useState<string>(currViewId ?? "");
  const [currentViewName, setCurrentViewName] = useState(name);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const [numSearchResults, setNumSearchResults] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Search for matching cells
  const { data: matchingCells } = api.view.searchCells.useQuery(
    { viewId: currViewId ?? "", searchTerm },
    { enabled: !!searchTerm.trim() && !!currViewId }
  );

  // Pass in num of search results
  const handleSetNumSearchResults = useCallback((value: number) => {
    setNumSearchResults(value);
  }, []);

  // Reset current match index when search results change
  useEffect(() => {
    setCurrentMatchIndex(0);
  }, [matchingCells]);

  const handleToggleColumn = (columnId: string) => {
    if (currViewId) {
      updateHiddenColumns.mutate({ viewId: currViewId, columnId });
    }
  };

  const handleHideAll = () => {
    if (currViewId) {
      hideAll.mutate({ viewId: currViewId });
    }
  }
  
  const handleShowAll = () => {
    if (currViewId) {
      showAll.mutate({ viewId: currViewId });
    }
  }

  const handleSearch = (search: string) => {
    setSearchTerm(search);
  };

  const handleNavigateMatch = (index: number) => {
    setCurrentMatchIndex(index);
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
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
          <button
            onClick={toggleSidebar}
            className="p-2 pt-1 pb-1 hover:bg-gray-100 rounded cursor-pointer"
          >
            <svg className="w-4 h-4 fill-current inline-block" viewBox="0 0 22 22">
              <use href="/icon_definitions.svg#List"/>
            </svg>
          </button>
          <p className="text-sm font-semibold">{currentViewName}</p>
        </div>
        <div className="flex-1"></div>
        <div className="flex flex-row justify-between items-center flex-2 gap-2">
          <HideButton 
            columns={tableColumns ?? []} 
            hiddenColumns={hiddenColumns ?? []}
            onToggleColumn={handleToggleColumn}
            onHideAll={handleHideAll}
            onShowAll={handleShowAll}
          />
          <FilterButton viewId={currViewId ?? ""} tableId={tableId}/>
          <SortButton viewId={currViewId ?? ""} tableId={tableId}/>
          <SearchButton 
            onSearch={handleSearch}
            numSearchResults={numSearchResults}
            currentMatchIndex={currentMatchIndex}
            onNavigateMatch={handleNavigateMatch}
          />
        </div>
      </header>
      {/*Main Box*/}
      <div className="flex w-full">
        {/* Sidebar */}
        <div className={`text-gray-600 flex-shrink-0 flex-col justify-between border-neutral-500 border-r-1 transition-all duration-200 ease-in-out ${isOpen ? 'overflow-visible' : 'overflow-hidden'} ${
          !sidebarOpen ? 'w-0' : 'w-[200px]'
        }`}>
          <div className="p-2 flex flex-col w-[200px]">
            <CreateView tableId={tableId} isOpen={isOpen} setOpen={setOpen}/>
            
            {views?.map((view) => (
              <button
                key={view.id}
                className={`p-3 text-sm cursor-pointer pr-15 text-left whitespace-nowrap transition-colors duration-200 ${
                  currViewId === view.id
                    ? 'bg-gray-100'
                    : 'hover:bg-gray-100 bg-white'
                }`}
                onClick={() => {
                  void setCurrView.mutate({ tableId, viewId: view.id });
                  setCurrentViewIdState(view.id);
                  setCurrentViewName(view.name);
                  name = view.name;
                  // Reset search when switching views
                  setSearchTerm("");
                  setCurrentMatchIndex(0);
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
            searchTerm={searchTerm}
            currentMatchIndex={currentMatchIndex}
            matchingCells={matchingCells ?? []}
            setNumMatchingCells={handleSetNumSearchResults}
          />
        )}
      </div>
    </div>
  )
}