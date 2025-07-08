"use client";

import { useState, useRef, useEffect } from "react";
import { api } from "~/trpc/react";
import { useQueryClient } from "@tanstack/react-query";

const textSortOptions = [
  { value: 'asc', label: 'A-Z' },
  { value: 'desc', label: 'Z-A' }
];

const numberSortOptions = [
  { value: 'asc', label: 'Ascending' },
  { value: 'desc', label: 'Descending' }
];

export default function Sortbutton({ viewId, tableId }: { viewId: string, tableId: string }) {
  const queryClient = useQueryClient();
  const utils = api.useUtils();
  const [isOpen, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  let { data: sorts } = api.view.getSorts.useQuery({ viewId });
  const { data: columns } = api.table.getColumns.useQuery({ tableId });
  sorts ??= [];
  const [newSort, setNewSort] = useState({
    columnId: '',
    direction: '',
    type: '',
  });

  const [localSorts, setLocalSorts] = useState<Array<{columnId: string, direction: string}>>([]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const updateSort = api.view.updateSort.useMutation({
    onSuccess: () => {
      void utils.view.getViewRows.invalidate({ viewId });
      void queryClient.resetQueries({ 
        queryKey: ['viewRows', viewId] 
      });
      void queryClient.refetchQueries({ 
        queryKey: ['viewRows', viewId] 
      });
      void utils.view.getSorts.invalidate({ viewId });
    },
  });
  
  const removeSort = api.view.removeSort.useMutation({
    onSuccess: () => {
      void utils.view.getViewRows.invalidate({ viewId });
      void queryClient.resetQueries({ 
      queryKey: ['viewRows', viewId] 
    });
    void queryClient.refetchQueries({ 
      queryKey: ['viewRows', viewId] 
    });
      void utils.view.getSorts.invalidate({ viewId });
    },
  });

  // Default values
  const formattedSorts = sorts
    ? sorts.map((sort) => ({
        columnId: sort.split(":")[0] ?? "",
        direction: sort.split(":")[1] ?? ""
      }))
    : [];

  useEffect(() => {
    setLocalSorts(formattedSorts);
  }, [sorts]);

  const availableSortOptions = newSort.type === "number" ? numberSortOptions : textSortOptions;

  const handleDropDown = () => {
    setOpen(!isOpen);
  };

  const handleSortChange = (sortIndex: number, field: 'columnId' | 'direction', value: string) => {
    setLocalSorts(prev => prev.map((sort, index) => 
      index === sortIndex ? { ...sort, [field]: value } : sort
    ));
  };

  const handleSortBlur = (sortIndex: number) => {
    const currentSort = localSorts[sortIndex];
    if (!currentSort) return;

    let updatedSort = { ...currentSort };
    
    if (!columns?.find(col => col.id === currentSort.columnId)) {
      updatedSort = { ...updatedSort, direction: '' };
    }

    const isValidSort = updatedSort.columnId && updatedSort.direction;

    if (isValidSort) {
      const originalSort = sorts?.[sortIndex]; 
      
      updateSort.mutate({
        viewId: viewId,
        originalSort: originalSort, 
        columnId: updatedSort.columnId,
        direction: updatedSort.direction as "asc" | "desc",
      });
    }
  };

  const handleNewSortBlur = () => {
    const isValidSort = newSort.columnId && newSort.direction;

    if (isValidSort) {
      updateSort.mutate({
        viewId: viewId,
        columnId: newSort.columnId,
        direction: newSort.direction as "asc" | "desc",
      });
      setNewSort({
        columnId: '',
        direction: '',
        type: '',
      });
    }
  };

  const handleRemoveSort = (sortIndex: number) => {
    const sort = localSorts[sortIndex];
    if (sort) {
      removeSort.mutate({
        viewId: viewId,
        columnId: sort.columnId,
      });
    }
  };

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      <button
        onClick={handleDropDown}
        className={`rounded-xs hover:bg-gray-100 py-2 px-4 text-xs hover:text-gray-700 focus:outline-none text-gray-600 cursor-pointer gap-2 ${sorts.length > 0 ? 'bg-orange-100' : ''}`}
      >
        <svg className="w-4 h-4 mr-1 fill-current inline-block" viewBox="0 0 22 22">
          <use href="/icon_definitions.svg#ArrowsDownUp"/>
        </svg>
        {sorts.length === 0 ? 'Sort' : `Sorted by ${sorts.length} field${sorts.length > 1 ? 's' : ''}`}
      </button>
      
      <div
        className={`absolute right-0 w-80 mt-2 p-2 bg-white border border-gray-200 rounded-md shadow-lg z-50 ${
          isOpen ? 'block' : 'hidden'
        }`}
      >
        <div className="space-y-2">
          {/* Existing Sorts */}
          {localSorts.map((sort, index) => {
            const foundCol = columns?.find(c => c.id === sort.columnId);
            const colType = foundCol?.type ?? '';
            const sortOptionsForCol = colType === "number" ? numberSortOptions : textSortOptions;
            
            return (
              <div key={`sort-${index}`} className="flex items-center gap-1">
                <select
                  value={sort.columnId}
                  onChange={(e) => handleSortChange(index, 'columnId', e.target.value)}
                  onBlur={() => handleSortBlur(index)}
                  className="flex-1 px-2 py-1 border border-gray-200 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-xs"
                >
                  {columns?.map((column) => (
                    <option key={column.id} value={column.id}>
                      {column.name}
                    </option>
                  ))}
                </select>
                
                <select
                  value={sort.direction}
                  onChange={(e) => handleSortChange(index, 'direction', e.target.value)}
                  onBlur={() => handleSortBlur(index)}
                  className="w-24 flex-shrink-0 px-2 py-1 border border-gray-200 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-xs"
                >
                  {sortOptionsForCol.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                
                <button
                  onClick={() => handleRemoveSort(index)}
                  className="p-1 flex-shrink-0 cursor-pointer"
                >
                  <svg className="w-4 h-4 mr-1 fill-current inline-block" viewBox="0 0 22 22">
                    <use href="/icon_definitions.svg#Trash"/>
                  </svg>
                </button>
              </div>
            );
          })}
          
          {/* New Sort Row */}
          <div className="flex items-center gap-1 border-t border-gray-100 pt-2">
            <select
              value={newSort.columnId}
              onChange={(e) => {
                const col = columns?.find((col) => col.id === e.target.value);
                const colType = col ? col.type : "";
                setNewSort(prev => ({ 
                  ...prev, 
                  columnId: e.target.value, 
                  direction: '',
                  type: colType
                }));
              }}
              onBlur={handleNewSortBlur}
              className="flex-1 px-2 py-1 border border-gray-200 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-xs"
            >
              <option value="">Field...</option>
              {columns?.map((column) => (
                <option key={column.id} value={column.id}>
                  {column.name}
                </option>
              ))}
            </select>
            
            <select
              value={newSort.direction}
              onChange={(e) => {
                setNewSort(prev => ({ 
                  ...prev, 
                  direction: e.target.value,
                }));
              }}
              onBlur={handleNewSortBlur}
              className="w-24 flex-shrink-0 px-2 py-1 border border-gray-200 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-xs"
            >
              <option value="">Sort...</option>
              {availableSortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}