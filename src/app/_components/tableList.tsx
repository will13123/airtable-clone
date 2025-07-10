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
  const { data: currTableId, isLoading: currTableIsLoading } = api.base.getCurrTable.useQuery({ baseId });

  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [editingTableId, setEditingTableId] = useState<string | null>(null);
  const [editingTableName, setEditingTableName] = useState<string>("");

  const setCurrTable = api.base.setCurrTable.useMutation({
    onSuccess: (data, variables) => {
      // Use the tableId from the mutation variables instead of state
      const currTable = tables?.find(t => t.id === variables.tableId);
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

  const handleRenameTable = (tableId: string, newName: string) => {
    if (newName.trim()) {
      renameTable.mutate({ tableId, name: newName.trim() });
    } else {
      // Reset editing state if name is empty
      setEditingTableId(null);
      setEditingTableName("");
    }
  };

  const handleDeleteTable = (tableId: string) => {
    if (tables && tables.length > 1) {
      deleteTable.mutate({ tableId, baseId });
    }
  };

  const handleTableClick = (tableId: string) => {
    // Only set current table if it's different from the current one
    if (currTableId !== tableId) {
      setCurrTable.mutate({ baseId, tableId });
    }
  };

  const startEditing = (tableId: string, currentName: string) => {
    setEditingTableId(tableId);
    setEditingTableName(currentName);
    setOpenDropdownId(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent, tableId: string) => {
    if (e.key === 'Enter') {
      handleRenameTable(tableId, editingTableName);
    } else if (e.key === 'Escape') {
      setEditingTableId(null);
      setEditingTableName("");
    }
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

  // Initialize current table if none is set
  useEffect(() => {
    if (tables && tables.length > 0 && !currTableId && !setCurrTable.isPending && !currTableIsLoading) {
      const defaultTable = earliestTable ?? tables[0];
      if (defaultTable) {
        setCurrTable.mutate({ baseId, tableId: defaultTable.id });
      }
    }
  }, [tables, currTableId, earliestTable, baseId, setCurrTable]);

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
    <div className='h-[94%]'>
      {tables.length > 0 && (
        <div className="flex flex-col h-full">
          <div className="relative bg-pink-50 border-b border-gray-200 flex-none">
            <div className="flex items-end relative">
              {tables.map((table, index) => {
                const elements = [];
                
                if (editingTableId === table.id) {
                  elements.push(
                    <div key={`edit-${table.id}`} className="bg-white border-l border-r border-gray-200 border-b-white rounded-t-md px-2 py-0.5 -mb-px z-10">
                      <input
                        type="text"
                        value={editingTableName}
                        onChange={(e) => setEditingTableName(e.target.value)}
                        onBlur={() => handleRenameTable(table.id, editingTableName)}
                        onKeyDown={(e) => handleKeyDown(e, table.id)}
                        className="px-2 py-1 text-sm border border-gray-200 rounded focus:outline-none focus:border-blue-500"
                        autoFocus
                      />
                    </div>
                  );
                } else {
                  elements.push(
                    <div key={`tab-${table.id}`} className="relative table-dropdown group">
                      <button
                        className={`
                          flex items-center gap-1 px-3 py-1.5 text-sm font-medium transition-all duration-200 
                          rounded-t-md border-l border-r relative -mb-px cursor-pointer 
                          ${currTableId === table.id 
                            ? "bg-white text-gray-900 border-gray-200 border-b-white z-10"
                            : "bg-pink-50 text-gray-600 border-transparent hover:bg-pink-100 hover:text-gray-900 border-b border-b-gray-200"
                          }
                        `}
                        onClick={() => handleTableClick(table.id)}
                        disabled={setCurrTable.isPending}
                      >
                        <span>{table.name}</span>
                        <div className='flex-1'></div>
                        <button
                          className="p-0.5 rounded cursor-pointer ml-1"
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
                                : 'text-gray-600 hover:bg-gray-100'
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
          
          {currTableId && (
            <div className="border border-gray-200 border-t-0 bg-white flex-1 flex flex-col">
              <CurrentTable tableId={currTableId} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}