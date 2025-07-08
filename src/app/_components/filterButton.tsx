import React, { useState, useRef, useEffect } from 'react';
import { api } from '~/trpc/react';
import { useQueryClient } from '@tanstack/react-query';

const textOperators = [
  { value: 'contains', label: 'contains' },
  { value: 'not_contains', label: 'does not contain' },
  { value: 'equal_to', label: 'equals' },
  { value: 'not_equal_to', label: 'does not equal' },
  { value: 'is_empty', label: 'is empty' },
  { value: 'is_not_empty', label: 'is not empty' }
];

const numberOperators = [
  { value: 'equal_to', label: 'equals' },
  { value: 'not_equal_to', label: 'does not equal' },
  { value: 'greater_than', label: 'greater than' },
  { value: 'greater_than_equal', label: 'greater than or equal' },
  { value: 'less_than', label: 'less than' },
  { value: 'less_than_equal', label: 'less than or equal' },
  { value: 'is_empty', label: 'is empty' },
  { value: 'is_not_empty', label: 'is not empty' }
];

export default function FilterButton({ tableId, viewId }: { tableId: string, viewId: string }) {
  const queryClient = useQueryClient();
  const utils = api.useUtils();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  let { data: filters } = api.view.getFilters.useQuery({ viewId }); // "columnId:operator:value"
  let { data: columns } = api.table.getColumns.useQuery({ tableId });
  const [newFilter, setNewFilter] = useState({
    columnId: '',
    operator: '',
    value: '',
    type: '',
  });
  
  // Local state for existing filters to handle intermediate changes
  const [localFilters, setLocalFilters] = useState<Array<{columnId: string, operator: string, value: string}>>([]);
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);
  
  // Default values
  filters ??= [];
  columns ??= [];
  const formattedFilters = filters
    ? filters.map((filter) => ({
        columnId: filter.split(":")[0] ?? "",
        operator: filter.split(":")[1] ?? "",
        value: filter.split(":")[2] ?? ""
      }))
    : []

  useEffect(() => {
    setLocalFilters(formattedFilters);
  }, [filters]);

  const availableOperators = newFilter.type === "number" ? numberOperators : textOperators;
  const needsValueInput = newFilter.operator && !['is_empty', 'is_not_empty'].includes(newFilter.operator);
  
  const getFilteredColumnNames = () => {
    const uniqueColumnIds = [...new Set(formattedFilters.map(f => f.columnId))];
    return uniqueColumnIds
      .map(columnId => columns.find(col => col.id === columnId)?.name)
      .filter(Boolean)
      .join(', ');
  };
  
  const updateFilter = api.view.updateFilter.useMutation({
    onSuccess: () => {
      void utils.view.getViewRows.invalidate({ viewId });
      void utils.view.getFilters.invalidate({ viewId });
      void queryClient.resetQueries({ 
        queryKey: ['viewRows', viewId] 
      });
      void queryClient.refetchQueries({ 
        queryKey: ['viewRows', viewId] 
      });
    },
  });

  const removeFilter = api.view.removeFilter.useMutation({
    onSuccess: () => {
      void utils.view.getViewRows.invalidate({ viewId });
      void utils.view.getFilters.invalidate({ viewId });
      void queryClient.resetQueries({ 
        queryKey: ['viewRows', viewId] 
      });
      void queryClient.refetchQueries({ 
        queryKey: ['viewRows', viewId] 
      });
    },
  });

  const handleFilterChange = (filterIndex: number, field: 'columnId' | 'operator' | 'value', value: string) => {
    setLocalFilters(prev => prev.map((filter, index) => 
      index === filterIndex ? { ...filter, [field]: value } : filter
    ));
  };

  const handleFilterBlur = (filterIndex: number) => {
    const currentFilter = localFilters[filterIndex];
    if (!currentFilter) return;

    let updatedFilter = { ...currentFilter };
    
    if (!columns.find(col => col.id === currentFilter.columnId)) {
      updatedFilter = { ...updatedFilter, operator: '', value: '' };
    }
    
    if (['is_empty', 'is_not_empty'].includes(updatedFilter.operator)) {
      updatedFilter = { ...updatedFilter, value: '' };
    }

    const isValidFilter = updatedFilter.columnId && updatedFilter.operator && 
      (updatedFilter.value || ['is_empty', 'is_not_empty'].includes(updatedFilter.operator));

    if (isValidFilter) {
      const originalFilter = filters[filterIndex]; 
      
      updateFilter.mutate({
        viewId: viewId,
        originalFilter: originalFilter, 
        columnId: updatedFilter.columnId,
        operator: updatedFilter.operator,
        value: updatedFilter.value,
      });
    }
  };

  const handleNewFilterBlur = () => {
    const isValidFilter = newFilter.columnId && newFilter.operator && 
      (newFilter.value || ['is_empty', 'is_not_empty'].includes(newFilter.operator));

    if (isValidFilter) {
      updateFilter.mutate({
        viewId: viewId,
        columnId: newFilter.columnId,
        operator: newFilter.operator,
        value: newFilter.value,
      });
      setNewFilter({
        columnId: '',
        operator: '',
        value: '',
        type: '',
      });
    }
  };

  const handleRemoveFilter = (filterIndex: number) => {
    const filter = filters[filterIndex];
    if (filter) {
      removeFilter.mutate({
        viewId: viewId,
        filter: filter,
      });
    };
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Filter Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`rounded-xs py-2 px-4 hover:bg-gray-100 text-xs hover:text-gray-700 text-gray-600 focus:outline-none cursor-pointer gap-2 ${filters.length > 0 ? 'bg-green-100' : ''}`}
      >
        <svg className="w-4 h-4 mr-1 fill-current inline-block" viewBox="0 0 22 22">
          <use href="/icon_definitions.svg#FunnelSimple"/>
        </svg>
        {filters.length === 0 ? 'Filter' : `Filtered by ${getFilteredColumnNames()}`}
      </button>

      {/* Filter Dropdown */}
      <div
        className={`absolute right-0 w-96 mt-2 p-2 bg-white border border-gray-200 rounded-md shadow-lg z-50 ${
          isOpen ? 'block' : 'hidden'
        }`}
      >
        <div className="space-y-2">
          {/* Existing Filters */}
          {localFilters.map((filter, index) => {
            const foundCol = columns.find(c => c.id === filter.columnId);
            const colType = foundCol?.type ?? '';
            const operatorsForCol = colType === "number" ? numberOperators : textOperators;
            const needsValue = filter.operator && !['is_empty', 'is_not_empty'].includes(filter.operator);
            
            return (
              <div key={`filter-${index}`} className="flex items-center gap-1">
                <select
                  value={filter.columnId}
                  onChange={(e) => handleFilterChange(index, 'columnId', e.target.value)}
                  onBlur={() => handleFilterBlur(index)}
                  className="w-24 flex-shrink-0 px-2 py-1 border border-gray-200 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-xs"
                >
                  <option value="">Column...</option>
                  {columns.map((column) => (
                    <option key={column.id} value={column.id}>
                      {column.name}
                    </option>
                  ))}
                </select>
                
                <select
                  value={filter.operator}
                  onChange={(e) => handleFilterChange(index, 'operator', e.target.value)}
                  onBlur={() => handleFilterBlur(index)}
                  className="w-32 flex-shrink-0 px-2 py-1 border border-gray-200 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-xs"
                >
                  <option value="">Operator...</option>
                  {operatorsForCol.map((operator) => (
                    <option key={operator.value} value={operator.value}>
                      {operator.label}
                    </option>
                  ))}
                </select>
                
                {needsValue && (
                  <input
                    type={colType}
                    value={filter.value}
                    onChange={(e) => handleFilterChange(index, 'value', e.target.value)}
                    onBlur={() => handleFilterBlur(index)}
                    placeholder="Value..."
                    className="flex-1 min-w-0 px-2 py-1 border border-gray-200 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-xs"
                  />
                )}
                
                <button
                  onClick={() => handleRemoveFilter(index)}
                  className="p-1 flex-shrink-0 cursor-pointer"
                >
                  <svg className="w-4 h-4 mr-1 fill-current inline-block" viewBox="0 0 22 22">
                    <use href="/icon_definitions.svg#Trash"/>
                  </svg>
                </button>
              </div>
            );
          })}
          
          {/* New Filter Row */}
          <div className="flex items-center gap-1 border-t border-gray-100 pt-2">
            <select
              value={newFilter.columnId}
              onChange={(e) => {
                const col = columns.find((col) => col.id === e.target.value);
                const colType = col ? col.type : "";
                setNewFilter(prev => ({ 
                  ...prev, 
                  columnId: e.target.value, 
                  operator: '', 
                  value: '',
                  type: colType
                }));
              }}
              onBlur={handleNewFilterBlur}
              className="w-24 flex-shrink-0 px-2 py-1 border border-gray-200 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-xs"
            >
              <option value="">Field...</option>
              {columns.map((column) => (
                <option key={column.id} value={column.id}>
                  {column.name}
                </option>
              ))}
            </select>
            
            <select
              value={newFilter.operator}
              onChange={(e) => {
                setNewFilter(prev => ({ 
                  ...prev, 
                  operator: e.target.value,
                  value: '',
                }));
              }}
              onBlur={handleNewFilterBlur}
              className="w-32 flex-shrink-0 px-2 py-1 border border-gray-200 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-xs"
            >
              <option value="">Operator...</option>
              {availableOperators.map((operator) => (
                <option key={operator.value} value={operator.value}>
                  {operator.label}
                </option>
              ))}
            </select>
            
            {needsValueInput && (
              <input
                type={newFilter.type}
                value={newFilter.value}
                onChange={(e) => setNewFilter(prev => ({ ...prev, value: e.target.value }))}
                onBlur={handleNewFilterBlur}
                placeholder="Value..."
                className="flex-1 min-w-0 px-2 py-1 border border-gray-200 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-xs"
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}