"use client";

import { useEffect, useState } from 'react'

import { api } from "~/trpc/react";
import CurrentTable from './currentTable';
import CreateTable from './createTable';

export default function TableList({ baseId }: { baseId: string }) {
  const utils = api.useUtils();
  const { data: tables, isLoading } = api.base.getTables.useQuery({ baseId });
  const { data: earliestTable } = api.base.earliestTable.useQuery({ baseId });
  const { data: currTableId } = api.base.getCurrTable.useQuery({ baseId });

  const setCurrTable = api.base.setCurrTable.useMutation({
    onSuccess: () => {
      void utils.base.getCurrTable.invalidate({ baseId });
    },
  });

  const [currentTableIdState, setCurrentTableIdState] = useState(currTableId ?? "");

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
  }, [tables, currTableId, currentTableIdState, earliestTable]);

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
              elements.push(
                <button
                  key={`tab-${table.id}`}
                  className={`
                    flex items-center gap-2 px-4 py-2 text-sm font-medium transition-all duration-200 
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
                  {table.name}
                </button>
              );
              
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