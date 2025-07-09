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
    : [];

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

  const isValidFilter = (filter: {columnId: string, operator: string, value: string}) => {
    return filter.columnId && filter.operator && 
      (filter.value || ['is_empty', 'is_not_empty'].includes(filter.operator));
  };

  // This is for updating an existing filter
  const handleFilterChange = (filterIndex: number, field: 'columnId' | 'operator' | 'value', value: string) => {
    setLocalFilters(prev => {
      const updated = prev.map((filter, index) => 
        index === filterIndex ? { ...filter, [field]: value } : filter
      );
      
      const updatedFilter = updated[filterIndex];
      if (!updatedFilter) return updated;

      if (field === 'columnId' && !columns.find(col => col.id === value)) {
        updatedFilter.operator = '';
        updatedFilter.value = '';
      }
      
      if (field === 'operator' && ['is_empty', 'is_not_empty'].includes(value)) {
        updatedFilter.value = '';
      }
      
      return updated;
    });

    const currentFilter = localFilters[filterIndex];
    if (currentFilter) {
      const updatedFilter = { ...currentFilter, [field]: value };
      
      if (field === 'columnId' && !columns.find(col => col.id === value)) {
        updatedFilter.operator = '';
        updatedFilter.value = '';
      }
      
      if (field === 'operator' && ['is_empty', 'is_not_empty'].includes(value)) {
        updatedFilter.value = '';
      }

      if (isValidFilter(updatedFilter)) {
        const originalFilter = filters[filterIndex];
        if (originalFilter) {
          updateFilter.mutate({
            viewId: viewId,
            originalFilter: originalFilter, 
            columnId: updatedFilter.columnId,
            operator: updatedFilter.operator,
            value: updatedFilter.value,
          });
        }
      }
    }
  };
  // This is for handling a new filter being added
  const handleNewFilterChange = (field: 'columnId' | 'operator' | 'value' | 'type', value: string) => {
    let updated = { ...newFilter, [field]: value };
    
    if (field === 'columnId') {
      const col = columns.find((col) => col.id === value);
      const colType = col ? col.type : "";
      updated = { 
        ...updated, 
        operator: '', 
        value: '',
        type: colType
      };
    }
    
    if (field === 'operator') {
      updated = { 
        ...updated, 
        value: '',
      };
    }
    
    if (['is_empty', 'is_not_empty'].includes(updated.operator)) {
      updated.value = '';
    }

    setNewFilter(updated);

    if (isValidFilter(updated)) {
      updateFilter.mutate({
        viewId: viewId,
        columnId: updated.columnId,
        operator: updated.operator,
        value: updated.value,
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
              onChange={(e) => handleNewFilterChange('columnId', e.target.value)}
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
              onChange={(e) => handleNewFilterChange('operator', e.target.value)}
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
                onChange={(e) => handleNewFilterChange('value', e.target.value)}
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