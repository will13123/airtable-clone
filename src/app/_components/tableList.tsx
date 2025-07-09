"use client";

import { useEffect, useState } from 'react'

import { api } from "~/trpc/react";
import CurrentTable from './currentTable';
import CreateTable from './createTable';
import { useQueryClient } from "@tanstack/react-query";

export default function TableList({ baseId }: { baseId: string }) {
  const utils = api.useUtils();
  const queryClient = useQueryClient();
  const { data: tables, isLoading } = api.base.getTables.useQuery({ baseId });
  const { data: earliestTable } = api.base.earliestTable.useQuery({ baseId });
  const { data: currTableId } = api.base.getCurrTable.useQuery({ baseId });

  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [editingTableId, setEditingTableId] = useState<string | null>(null);
  const [editingTableName, setEditingTableName] = useState<string>("");

  const setCurrTable = api.base.setCurrTable.useMutation({
    onSuccess: () => {
      const currTable = tables?.find(t => t.id === currentTableIdState);
      void utils.view.getViewRows.invalidate({ viewId: currTable?.currView });
      void utils.base.getCurrTable.invalidate({ baseId });
      void queryClient.resetQueries({ queryKey: ['viewRows', currTable?.currView] });
    },
  });

  const renameTable = api.base.renameTable.useMutation({
    onSuccess: () => {
      void utils.base.getTables.invalidate({ baseId });
      setEditingTableId(null);
      setEditingTableName("");
    },
  });

  const deleteTable = api.base.deleteTable.useMutation({
    onSuccess: () => {
      void utils.base.getTables.invalidate({ baseId });
      void utils.base.getCurrTable.invalidate({ baseId });
    },
  });

  const [currentTableIdState, setCurrentTableIdState] = useState(currTableId ?? "");

  const handleRenameTable = (tableId: string, newName: string) => {
    if (newName.trim()) {
      renameTable.mutate({ tableId, name: newName.trim() });
    }
  };

  const handleDeleteTable = (tableId: string) => {
    if (tables && tables.length > 1) {
      deleteTable.mutate({ tableId, baseId });
    }
  };

  const startEditing = (tableId: string, currentName: string) => {
    setEditingTableId(tableId);
    setEditingTableName(currentName);
    setOpenDropdownId(null);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openDropdownId && !(event.target as Element).closest('.table-dropdown')) {
        setOpenDropdownId(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openDropdownId]);

  // Check to see if there is a current table being viewed, else set it as the earliest made one by default
  useEffect(() => {
    // If they dont exist, refresh
    if (!earliestTable) {
      void utils.base.earliestTable.invalidate({ baseId });
    }
    if (tables && earliestTable && currentTableIdState === "") {
      void setCurrTable.mutate({ baseId, tableId: earliestTable.id });
      setCurrentTableIdState(earliestTable.id);
    } else {
      setCurrentTableIdState(currentTableIdState);
    }
  }, [tables, currTableId, currentTableIdState, earliestTable, utils.base.earliestTable, baseId, setCurrTable]);

  // Update local state when currTableId changes
  useEffect(() => {
    if (currTableId) {
      setCurrentTableIdState(currTableId);
    }
  }, [currTableId]);

  if (isLoading) return <div className="text-center text-gray-600 text-xl">Loading...</div>;

  if (!tables || tables.length === 0) {
    return (
      <div className="justify-center justify-items-center">
        <div className="text-center text-gray-600 text-xl">No tables found.</div>
        <div className="justify-center justify-items-center">
          <CreateTable baseId={baseId}/>
        </div>
      </div>
    );
  }
  
  return (
  <div>
    {tables.length > 0 && (
      <div className="flex flex-col">
        <div className="relative bg-pink-50 border-b border-gray-300">
          <div className="flex items-end relative">
            {tables.map((table, index) => {
              const elements = [];
              
              if (editingTableId === table.id) {
                elements.push(
                  <div key={`edit-${table.id}`} className="bg-white border-l border-r border-gray-300 border-b-white rounded-t-md px-2 py-1 -mb-px z-10">
                    <input
                      type="text"
                      value={editingTableName}
                      onChange={(e) => setEditingTableName(e.target.value)}
                      onBlur={() => handleRenameTable(table.id, editingTableName)}
                      className="px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                      autoFocus
                    />
                  </div>
                );
              } else {
                elements.push(
                  <div key={`tab-${table.id}`} className="relative table-dropdown group">
                    <button
                      className={`
                        flex items-center gap-1 px-4 py-2 text-sm font-medium transition-all duration-200 
                        rounded-t-md border-l border-r relative -mb-px cursor-pointer 
                        ${currTableId === table.id 
                          ? "bg-white text-gray-900 border-gray-300 border-b-white z-10"
                          : "bg-pink-50 text-gray-600 border-transparent hover:bg-pink-100 hover:text-gray-900 border-b border-b-gray-300"
                        }
                      `}
                      onClick={() => {
                        void setCurrTable.mutate({ baseId, tableId: table.id });
                        setCurrentTableIdState(table.id);
                      }}
                    >
                      <span>{table.name}</span>
                      <div className='flex-1'></div>
                      <button
                        className="p-1 rounded cursor-pointer ml-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenDropdownId(openDropdownId === table.id ? null : table.id);
                        }}
                      >
                        <svg className="w-3.5 h-3.5 fill-gray-500 hover:fill-gray-600 inline-block" viewBox="0 0 22 22">
                          <use href="/icon_definitions.svg#ChevronDown"/>
                        </svg>
                      </button>
                    </button>
                    
                    {/* Dropdown menu */}
                    {openDropdownId === table.id && (
                      <div className="absolute left-0 top-full mt-1 w-40 bg-white border border-gray-200 rounded-md shadow-lg z-50">
                        <button
                          onClick={() => startEditing(table.id, table.name)}
                          className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 transition-colors duration-200 cursor-pointer"
                        >
                          Rename Table
                        </button>
                        <button
                          onClick={() => handleDeleteTable(table.id)}
                          disabled={tables?.length === 1}
                          className={`w-full cursor-pointer px-3 py-2 text-left text-sm transition-colors duration-200 ${
                            tables?.length === 1
                              ? 'text-gray-400 cursor-not-allowed'
                              : 'text-red-600'
                          }`}
                        >
                          Delete Table
                        </button>
                      </div>
                    )}
                  </div>
                );
              }
              
              // Add divider if needed
              if (index < tables.length - 1 && 
                  currTableId !== table.id && 
                  currTableId !== tables[index + 1]?.id) {
                elements.push(
                  <div key={`divider-${table.id}`} className="h-6 w-px bg-gray-300 mx-1 self-center"></div>
                );
              }
              
              return elements;
            })}
            
            {tables.length > 0 && currTableId !== tables[tables.length - 1]?.id && (
              <div className="h-6 w-px bg-gray-300 mx-1 self-center"></div>
            )}
            
            <CreateTable baseId={baseId}/>
          </div>
        </div>
        
        {(currentTableIdState !== "" && currentTableIdState) && (
          <div className="border border-gray-300 border-t-0 bg-white h-full">
            <CurrentTable tableId={currentTableIdState} />
          </div>
        )}
      </div>
    )}
  </div>
);
}