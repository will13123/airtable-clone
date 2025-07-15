"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";

export default function CreateBase({ isExpanded, isClicked, setBaseIsCreating }: { isExpanded: boolean, isClicked: boolean, baseIsCreating: boolean, setBaseIsCreating: (value: boolean) => void }) {
  const utils = api.useUtils();
  const [name, setName] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  
  const createBase = api.base.create.useMutation({
    onSuccess: async (newBase) => {
      await utils.base.invalidate();
      
      // Create default table
      createTable.mutate({ 
        name: 'Default Table', 
        baseId: newBase.id
      });
      
      setName("");
      setIsModalOpen(false);
      setBaseIsCreating(false)
      router.push(`/base?id=${newBase.id}&name=${newBase.name}`);
    },
  });

  const createTable = api.table.create.useMutation({
    onSuccess: async (newTable) => {
      await utils.table.invalidate();
      
      const tableId = newTable.id;
      const baseId = newTable.baseId; 
      
      if (tableId) {
        // Create default columns
        createColumn.mutate({ 
          tableId, 
          type: "text", 
          name: "Name" 
        });
        
        createColumn.mutate({ 
          tableId, 
          type: "number", 
          name: "Value" 
        });
        
        createColumn.mutate({ 
          tableId, 
          type: "text", 
          name: "Notes" 
        });
        
        // Create default rows
        createRow.mutate({ tableId });
        createRow.mutate({ tableId });
        createRow.mutate({ tableId });
        createRow.mutate({ tableId });
        createRow.mutate({ tableId });
        
        // Set as current table
        setCurrTable.mutate({ baseId, tableId });
        
      }
    },
  });

  const createRow = api.row.create.useMutation({
    onSuccess: () => {
      void utils.table.invalidate();
    },
  });
  
  const createColumn = api.column.create.useMutation({
    onSuccess: () => {
      void utils.table.invalidate();
    }
  });

  const setCurrTable = api.base.setCurrTable.useMutation({
    
  });

  // Handle clicking outside modal to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        setIsModalOpen(false);
        setName("");
      }
    };

    if (isModalOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isModalOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      setBaseIsCreating(true)
      createBase.mutate({ name });
    }
  };

  const handleCancel = () => {
    setIsModalOpen(false);
    setName("");
  };

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className={`flex items-center justify-center cursor-pointer rounded transition-colors duration-200 ${
          (isExpanded || isClicked) 
            ? 'bg-blue-500 text-white hover:bg-blue-600' 
            : 'border border-gray-300 text-gray-600 hover:bg-gray-100'
        } ${
          (!isExpanded && !isClicked) ? 'w-5 h-5' : 'w-full px-3 py-2'
        }`}
      >
        <svg className={`w-4 h-4 flex-shrink-0 ${(isExpanded || isClicked)  ? 'fill-white' : 'fill-gray-600'}`} viewBox="0 0 22 22">
          <use href="/icon_definitions.svg#Plus"/>
        </svg>
        {(isExpanded || isClicked) && (
          <span className="ml-3 text-sm whitespace-nowrap">
            Create
          </span>
        )}
      </button>

      {isModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="absolute inset-0 bg-gray-900 opacity-40 backdrop-blur-sm"></div>
          <div 
            ref={modalRef}
            className="bg-white rounded-xl p-6 w-full border border-gray-500 max-w-md mx-4 z-51"
          >
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Create New Base</h2>
            
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <input
                type="text"
                placeholder="Enter base name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-md border border-neutral-300 px-4 py-3 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
              
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-md bg-blue-500 text-white px-6 py-2 font-medium transition cursor-pointer hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  disabled={createBase.isPending || !name.trim()}
                >
                  {createBase.isPending ? "Creating..." : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}