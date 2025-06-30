"use client";


import * as React from 'react'

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

  const [currentTableIdState, setCurrentTableIdState] = React.useState(currTableId ?? "");

  // Check to see if there is a current table being viewed, else set it as the earliest made one by default
  React.useEffect(() => {
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
            <div className="flex border-b border-gray-300 flex-row bg-gray-100 rounded-sm">
              {tables.map((table) => (
                <button
                  key={table.id}
                  className={`px-4 py-2 border-b-2 transition-colors text-xl ${
                    currTableId === table.id
                      ? 'border-blue-500 bg-white text-black font-medium'
                      : 'border-transparent bg-gray-100 text-gray-600 hover:bg-gray-50 hover:border-gray-200'
                  }`}
                  onClick={() => {
                    void setCurrTable.mutate({ baseId, tableId: table.id });
                    setCurrentTableIdState(table.id);
                  }}
                >
                  {table.name}
                </button>
              ))}
              <CreateTable baseId={baseId}/>
            </div>
            {(currentTableIdState !== "" && currentTableIdState) && (
              <div className="border border-gray-300 border-t-0 bg-white h-full">
                <CurrentTable tableId={currentTableIdState} />
              </div>
            )}
          </div>
          
        )
      }
      
    </div>
  )
}
