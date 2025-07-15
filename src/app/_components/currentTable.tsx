"use client";

import { api } from "~/trpc/react";
import CreateView from "./createView";
import CurrentView from "./currentView";
import { useState, useEffect } from "react";
import SortButton from "./sortButton";
import FilterButton from "./filterButton";
import HideButton from "./hideButton";
import SearchButton from "./searchButton";
import { useQueryClient } from "@tanstack/react-query";

export default function CurrentTable({ tableId, hasInitialised, setHasInitialised }: { tableId: string, hasInitialised: boolean, setHasInitialised: (value: boolean) => void }) {
  const utils = api.useUtils();
  const queryClient = useQueryClient();
  const { data: views } = api.table.getViews.useQuery({ tableId });
  const { data: currViewId, isLoading: currViewIsLoading } = api.table.getCurrView.useQuery({ tableId });
  const { data: earliestView } = api.table.earliestView.useQuery({ tableId });
  const { data: tableColumns } = api.table.getColumns.useQuery({ tableId });
  const [searchTerm, setSearchTerm] = useState<string>("");
  const { data: hiddenColumns } = api.view.getHiddenColumns.useQuery(
    { viewId: currViewId ?? "" },
    { enabled: !!currViewId }
  );
  const [searchIsOpen, setSearchIsOpen] = useState(false); // For search dropdown
  const [isOpen, setOpen] = useState(false); // For the createView dropdown
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null); // For view dropdown menus
  const [editingViewId, setEditingViewId] = useState<string | null>(null); // For renaming views
  const [editingViewName, setEditingViewName] = useState<string>("");
  
  // Close search bar when switching views and tables
  useEffect(() => {
    setSearchTerm("");
    setSearchIsOpen(false)
  }, [tableId, currViewId])

  const setCurrView = api.table.setCurrView.useMutation({
    onSuccess: () => {
      setHasInitialised(false)
      void utils.table.getCurrView.invalidate({ tableId });
      void utils.view.searchCells.invalidate({ viewId: currViewId });
      void queryClient.resetQueries({ 
        queryKey: ['viewRows', currViewId] 
      });
      void queryClient.refetchQueries({ 
        queryKey: ['viewRows', currViewId] 
      });
      void utils.view.getViewRows.invalidate({ viewId: currViewId });
    },
  });
  
  const renameView = api.table.renameView.useMutation({
    onSuccess: () => {
      void utils.table.getViews.invalidate({ tableId });
      setEditingViewId(null);
      setEditingViewName("");
    },
  });
  
  const deleteView = api.table.deleteView.useMutation({
    onSuccess: () => {
      void utils.table.getViews.invalidate({ tableId });
      void utils.table.getCurrView.invalidate({ tableId });
    },
  });
  
  const updateHiddenColumns = api.view.updateHiddenColumns.useMutation({
    onSuccess: () => {
      void utils.view.getHiddenColumns.invalidate({ viewId: currViewId ?? "" });
      void utils.view.searchCells.invalidate({ viewId: currViewId });
    },
  });
  
  const hideAll = api.view.hideAll.useMutation({
    onSuccess: () => {
      void utils.view.getHiddenColumns.invalidate({ viewId: currViewId ?? "" });
      void utils.view.searchCells.invalidate({ viewId: currViewId });
    },
  });
  
  const showAll = api.view.showAll.useMutation({
    onSuccess: () => {
      void utils.view.getHiddenColumns.invalidate({ viewId: currViewId ?? "" });
      void utils.view.searchCells.invalidate({ viewId: currViewId });
    },
  });
  
  const currView = views?.find(v => v.id === currViewId);
  const currentViewName = currView?.name ?? "Default View";
  const [viewSearchTerm, setViewSearchTerm] = useState<string>("");
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const [numSearchResults, setNumSearchResults] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Search for matching cells
  let { data: matchingCells } = api.view.searchCells.useQuery({ viewId: currViewId ?? "", searchTerm });
  if (searchTerm.length === 0) matchingCells = [];
  // Pass in num of search results

  // Reset current match index when search results change
  useEffect(() => {
    setCurrentMatchIndex(0);
  }, [matchingCells]);

  useEffect(() => {
    if (views && earliestView && !currViewId && !currViewIsLoading) {
      void setCurrView.mutate({ tableId, viewId: earliestView.id });
    }
  }, [views, currViewId, earliestView, currViewIsLoading, tableId]);

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

  const handleRenameView = (viewId: string, newName: string) => {
    if (newName.trim()) {
      renameView.mutate({ viewId, name: newName.trim() });
    }
  };

  const handleDeleteView = (viewId: string) => {
    if (views && views.length > 1) {
      deleteView.mutate({ viewId, tableId });
    }
  };

  const startEditing = (viewId: string, currentName: string) => {
    setEditingViewId(viewId);
    setEditingViewName(currentName);
    setOpenDropdownId(null);
  };

  const handleViewClick = (viewId: string) => {
    void setCurrView.mutate({ tableId, viewId });
    // Reset search when switching views
    setSearchTerm("");
    setCurrentMatchIndex(0);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openDropdownId && !(event.target as Element).closest('.view-dropdown')) {
        setOpenDropdownId(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openDropdownId]);

  return (
    <div className="flex flex-col h-full">
      {/* Top bar for table */}
      <header className="flex justify-center items-center bg-white border-b border-gray-200 p-1 pr-5 h-[5vh]">
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
        <div className="flex-2"></div>
        <div className="flex flex-row justify-between items-center flex-2 gap-1.5">
          <HideButton 
            columns={tableColumns ?? []} 
            hiddenColumns={hiddenColumns ?? []}
            onToggleColumn={handleToggleColumn}
            onHideAll={handleHideAll}
            onShowAll={handleShowAll}
          />
          <FilterButton viewId={currViewId ?? ""} tableId={tableId}/>
          <button
            className={`rounded-md flex items-center hover:bg-gray-100 py-2 px-3 hover:text-gray-700 focus:outline-none text-gray-600 cursor-pointer text-xs`}
          >
            <svg className="w-4 h-4 mr-1 fill-current inline-block" viewBox="0 0 22 22">
              <use href="/icon_definitions.svg#Group"/>
            </svg>
            Group
          </button>
          <SortButton viewId={currViewId ?? ""} tableId={tableId}/>
          <button
            className={`rounded-md flex items-center hover:bg-gray-100 py-2 px-3 hover:text-gray-700 focus:outline-none text-gray-600 cursor-pointer text-xs`}
          >
            <svg className="w-4 h-4 mr-1 fill-current inline-block" viewBox="0 0 22 22">
              <use href="/icon_definitions.svg#PaintBucket"/>
            </svg>
            Colour
          </button>
          <button
            className={`rounded-md hover:bg-gray-100 py-2 px-3 hover:text-gray-700 focus:outline-none text-gray-600 cursor-pointer text-xs`}
          >
            <svg className="w-4 h-4 mr-1 fill-current inline-block" viewBox="0 0 22 22">
              <use href="/icon_definitions.svg#RowHeightSmall"/>
            </svg>
          </button>
          <button
            className={`rounded-md flex items-center hover:bg-gray-100 py-2 px-3 hover:text-gray-700 focus:outline-none text-gray-600 cursor-pointer text-xs`}
          >
            <svg className="w-4 h-4 mr-1 fill-current inline-block" viewBox="0 0 22 22">
              <use href="/icon_definitions.svg#ArrowSquareOut"/>
            </svg>
            Share and sync
          </button>
          <SearchButton 
            onSearch={handleSearch}
            numSearchResults={numSearchResults}
            currentMatchIndex={currentMatchIndex}
            onNavigateMatch={handleNavigateMatch}
            isOpen={searchIsOpen}
            setIsOpen={setSearchIsOpen}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
          />
        </div>
      </header>
      {/*Main Box*/}
      <div className="flex w-full h-[85vh]">
        {/* Sidebar */}
        <div className={`h-full text-gray-600 flex-shrink-0 flex-col justify-between border-gray-200 border-r transition-all duration-200 ease-in-out z-40 ${isOpen ? 'overflow-visible' : 'overflow-hidden'} ${
          !sidebarOpen ? 'w-0' : 'w-[300px]'
        }`}>
          <div className="p-2 flex flex-col w-full">
            <div className="w-full">
              <CreateView tableId={tableId} isOpen={isOpen} setOpen={setOpen}/>
            </div>
            
            {/* Search bar for views */}
            <div className="w-full mt-2 mb-2">
              <div className="relative">
                <svg className="w-4 h-4 fill-current inline-block absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" viewBox="0 0 22 22">
                  <use href="/icon_definitions.svg#MagnifyingGlass"/>
                </svg>
                <input
                  type="text"
                  placeholder="Find a view..."
                  value={viewSearchTerm}
                  onChange={(e) => setViewSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-3 py-1.5 text-sm focus:outline-blue-500 rounded-md"
                />
              </div>
            </div>
            
            {views?.filter(view => 
              view.name.toLowerCase().includes(viewSearchTerm.toLowerCase())
            ).map((view) => (
              <div key={view.id} className="relative view-dropdown w-full">
                {editingViewId === view.id ? (
                  <div className="w-full p-1.5 bg-gray-100 rounded">
                    <input
                      type="text"
                      value={editingViewName}
                      onChange={(e) => setEditingViewName(e.target.value)}
                      onBlur={() => handleRenameView(view.id, editingViewName)}
                      className="w-full px-2 py-1 text-sm border border-gray-200 rounded focus:outline-none focus:border-blue-500"
                      autoFocus
                    />
                  </div>
                ) : (
                  <div className="flex items-center group w-full">
                    <button
                      className={`flex-1 p-2 text-sm cursor-pointer text-left whitespace-nowrap transition-colors duration-200 flex items-center w-full ${
                        currViewId === view.id
                          ? 'bg-gray-100'
                          : 'hover:bg-gray-100 bg-white'
                      }`}
                      onClick={() => handleViewClick(view.id)}
                    >
                      <svg className="w-4 h-4 mr-2 fill-blue-500 inline-block" viewBox="0 0 22 22">
                        <use href="/icon_definitions.svg#GridFeature"/>
                      </svg>
                      {view.name}
                      <div className="flex-1"></div>
                      <button
                        className="opacity-0 group-hover:opacity-100 p-1 rounded transition-opacity duration-200 cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation(); // Doesnt change the current view as well
                          setOpenDropdownId(openDropdownId === view.id ? null : view.id);
                        }}
                      >
                        <svg className="w-4 h-4 mr-2 fill-gray-500 hover:fill-gray-600 inline-block" viewBox="0 0 22 22">
                          <use href="/icon_definitions.svg#ChevronDown"/>
                        </svg>
                      </button>
                    </button>
                    
                  </div>
                )}
                
                {/* Dropdown menu */}
                {openDropdownId === view.id && (
                  <div className="absolute right-0 top-full mt-1 w-40 bg-white border border-gray-200 rounded-md shadow-lg z-50">
                    <button
                      onClick={() => startEditing(view.id, view.name)}
                      className="w-full cursor-pointer px-3 py-2 text-left text-sm hover:bg-gray-100 transition-colors duration-200"
                    >
                      Rename View
                    </button>
                    <button
                      onClick={() => handleDeleteView(view.id)}
                      disabled={views?.length === 1}
                      className={`w-full cursor-pointer px-3 py-2 text-left text-sm transition-colors duration-200 ${
                        views?.length === 1
                          ? 'text-gray-400 cursor-not-allowed'
                          : 'text-gray-600'
                      }`}
                    >
                      Delete View
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>            
        </div>
        {/* Main Table */}
        {currViewId && (
          <CurrentView 
            viewId={currViewId} 
            tableId={tableId}
            currentMatchIndex={currentMatchIndex}
            matchingCells={matchingCells ?? []}
            setNumMatchingCells={setNumSearchResults}
            hasInitialised={hasInitialised}
            setHasInitialised={setHasInitialised}
          />
        )}
      </div>
    </div>
  )
}