"use client";


import * as React from 'react'

import { api } from "~/trpc/react";
import CurrentTable from './currentTable';

export default function TableList({ baseId }: { baseId: string }) {
  const utils = api.useUtils();
  const { data: tables, isLoading } = api.base.getTables.useQuery({ baseId });
  const { data: earliestTable } = api.base.earliestTable.useQuery({ baseId });
  const { data: currTableId } = api.base.getCurrTable.useQuery({ baseId });

  const setCurrTable = api.base.setCurrTable.useMutation({
    onSuccess: () => {
      utils.base.getCurrTable.invalidate({ baseId });
    },
  });

  const [currentTableIdState, setCurrentTableIdState] = React.useState<string>(currTableId ?? "");

  // Check to see if there is a current table being viewed, else set it as the earliest made one by default
  React.useEffect(() => {
    if (tables && earliestTable && currentTableIdState === "") {
      setCurrTable.mutate({ baseId, tableId: earliestTable.id });
      setCurrentTableIdState(earliestTable.id);
    } else {
      setCurrentTableIdState(currentTableIdState);
    }
  }, [isLoading, tables, currTableId, baseId]);

  
  if (isLoading) return <div className="text-center">Loading...</div>;

  if (!tables || tables.length === 0) {
    return <div className="text-center">No tables found.</div>;
  }
  
  return (
    <div>
      {tables.length > 0 && (
          <div>
            {tables.map((table) => {
              return (
                <button key={table.id} className="bg-white p-2 rounded shadow mr-2 mb-2 hover:bg-gray-100" onClick={() => {
                  setCurrTable.mutate({ baseId, tableId: table.id });
                  setCurrentTableIdState(table.id);
                }}>
                  {table.name}
                </button>
              );
            })}
            {(currTableId !== "" && currTableId) && (
              <CurrentTable tableId={currTableId}/>
            )}
          </div>
          
        )
      }
      
    </div>
  )
}
