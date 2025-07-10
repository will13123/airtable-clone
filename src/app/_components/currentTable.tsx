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
  const { data: hiddenColumns } = api.view.getHiddenColumns.useQuery(
    { viewId: currViewId ?? "" },
    { enabled: !!currViewId }
  );
  
  const [isOpen, setOpen] = useState(false); // For the createView dropdown
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null); // For view dropdown menus
  const [editingViewId, setEditingViewId] = useState<string | null>(null); // For renaming views
  const [editingViewName, setEditingViewName] = useState<string>("");
  
  const setCurrView = api.table.setCurrView.useMutation({
    onSuccess: () => {
      void utils.table.getCurrView.invalidate({ tableId });
      void utils.view.searchCells.invalidate({ viewId: currViewId });
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
  let name = currView?.name;
  const [currentViewIdState, setCurrentViewIdState] = useState<string>(currViewId ?? "");
  const [currentViewName, setCurrentViewName] = useState(name);
  const [searchTerm, setSearchTerm] = useState<string>("");
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

  // Close dropdown when clicking outside
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
            viewId={currViewId ?? ""}
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
                  className="w-full pl-10 pr-3 py-2 text-sm focus:outline-blue-500 rounded-md"
                />
              </div>
            </div>
            
            {views?.filter(view => 
              view.name.toLowerCase().includes(viewSearchTerm.toLowerCase())
            ).map((view) => (
              <div key={view.id} className="relative view-dropdown">
                {editingViewId === view.id ? (
                  <div className="w-full p-2 bg-gray-100 rounded">
                    <input
                      type="text"
                      value={editingViewName}
                      onChange={(e) => setEditingViewName(e.target.value)}
                      onBlur={() => handleRenameView(view.id, editingViewName)}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                      autoFocus
                    />
                  </div>
                ) : (
                  <div className="flex items-center group">
                    <button
                      className={`flex-1 p-3 text-sm cursor-pointer text-left whitespace-nowrap transition-colors duration-200 flex items-center ${
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
          />
        )}
      </div>
    </div>
  )
}