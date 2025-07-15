import React, { useState } from "react";
import { api } from "~/trpc/react";
import { useQueryClient } from "@tanstack/react-query";

export default function CreateRow({ tableId, viewId }: { tableId: string, viewId: string }) {
  const queryClient = useQueryClient();
  const utils = api.useUtils();
  const [loadingType, setLoadingType] = useState<'single' | 'many' | null>(null);

  const createRow = api.row.create.useMutation({
    onSuccess: () => {
      void queryClient.resetQueries({ 
        queryKey: ['viewRows', viewId] 
      });
      void queryClient.refetchQueries({ 
        queryKey: ['viewRows', viewId] 
      });
      void utils.view.getViewRows.invalidate({ viewId });
      setLoadingType(null);
    },
    onError: () => {
      setLoadingType(null);
    }
  });

  const createManyRows = api.row.createMany.useMutation({
    onSuccess: async (result) => {
      void queryClient.resetQueries({ 
        queryKey: ['viewRows', viewId] 
      });
      void queryClient.refetchQueries({ 
        queryKey: ['viewRows', viewId] 
      });
      void utils.view.getViewRows.invalidate({ viewId });
      if (result === true) setLoadingType(null)
      if (result === false) setLoadingType('many');
    },
  });

  const handleCreateRow = () => {
    setLoadingType('single');
    createRow.mutate({ tableId });
    createRow.mutate({ tableId: '' });
  };

  const handleCreateManyRows = () => {
    setLoadingType('many');
    createManyRows.mutate({ tableId });
    createManyRows.mutate({ tableId: '' });
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm flex items-center">
      <div className="relative group">
        <button
          className="py-2 px-3 text-gray-600 hover:text-gray-700 focus:outline-none cursor-pointer flex items-center justify-center"
          onClick={handleCreateRow}
          disabled={loadingType !== null}
        >
          {loadingType === 'single' ? (
            <span className="text-sm">Creating 1 Row...</span>
          ) : (
            <svg className="w-4 h-4 fill-gray-600 hover:fill-gray-700" viewBox="0 0 22 22">
              <use href="/icon_definitions.svg#Plus"/>
            </svg>
          )}
        </button>
        
        <div className="absolute bottom-full left-3/4 transform -translate-x-1/2 mb-6 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50">
          Create 1 Row
        </div>
      </div>
      
      <div className="w-px h-6 bg-gray-200"></div>
      
      <div className="relative group">
        <button
          className="py-2 px-3 text-gray-600 hover:text-gray-700 focus:outline-none cursor-pointer text-sm flex items-center gap-1"
          onClick={handleCreateManyRows}
          disabled={loadingType !== null}
        >
          {loadingType === 'many' ? (
            "Creating 100K Rows..."
          ) : (
            <div className="flex flex-row items-center">
              <svg className="w-4 h-4 fill-gray-600 mr-0.5 hover:fill-gray-700" viewBox="0 0 22 22">
                <use href="/icon_definitions.svg#MagicWand"/>
              </svg>
              Add...
            </div>
          )}
        </button>
        
        <div className="absolute bottom-full left-3/4 transform -translate-x-1/2 mb-6 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50">
          Create 100K Rows
        </div>
      </div>
    </div>
  );
}