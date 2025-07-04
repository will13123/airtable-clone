import React, { useState } from 'react';
import { api } from '~/trpc/react';

const textOperators = [
  { value: 'contains', label: 'Contains' },
  { value: 'not_contains', label: 'Does not contain' },
  { value: 'equal_to', label: 'Equals' },
  { value: 'not_equal_to', label: 'Does not equal' },
  { value: 'is_empty', label: 'Is empty' },
  { value: 'is_not_empty', label: 'Is not empty' }
];

const numberOperators = [
  { value: 'equal_to', label: 'Equals' },
  { value: 'not_equal_to', label: 'Does not equal' },
  { value: 'greater_than', label: 'Greater than' },
  { value: 'greater_than_equal', label: 'Greater than or equal' },
  { value: 'less_than', label: 'Less than' },
  { value: 'less_than_equal', label: 'Less than or equal' },
  { value: 'is_empty', label: 'Is empty' },
  { value: 'is_not_empty', label: 'Is not empty' }
];


export default function FilterButton({ tableId, viewId }: { tableId: string, viewId: string }) {
  const utils = api.useUtils();
  const [isOpen, setIsOpen] = useState(false);
  let { data: filters } = api.view.getFilters.useQuery({ viewId }); // "columnId:operator:value"
  let { data: columns } = api.table.getColumns.useQuery({ tableId });
  const [newFilter, setNewFilter] = useState({
    columnId: '',
    operator: '',
    value: '',
    type: '',
  });
  // Default value
  filters ??= [];
  columns ??= [];
  const formattedFilters = filters
    ? filters.map((filter) => ({
        columnId: filter.split(":")[0] ?? "",
        operator: filter.split(":")[1] ?? "",
        value: filter.split(":")[2] ?? ""
      }))
    : []

  const availableOperators = newFilter.type === "number" ? numberOperators : textOperators;
  
  const needsValueInput = newFilter.operator && !['is_empty', 'is_not_empty'].includes(newFilter.operator);
  const updateFilter = api.view.updateFilter.useMutation({
    onSuccess: () => {
      void utils.view.getViewRows.invalidate({ viewId });
      void utils.view.getFilters.invalidate({ viewId });
    },
  });

  return (
    <div className="relative">
      {/* Filter Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="py-2 px-4 text-gray-600 text-sm hover:text-gray-700 focus:outline-none cursor-pointer gap-2"
      >
       Filter
      </button>

      {/* Filter Dropdown */}
      <div
        className={`absolute right-0 w-70 mt-2 p-3 bg-white border border-gray-200 rounded-md shadow-lg z-10 ${
          isOpen ? 'block' : 'hidden'
        }`}
      >
        <ul className="py-1 text-sm text-gray-700">
          <li>
            {formattedFilters.map((filter) => {
              return (
                <div key={filter.columnId}>
                  {filter.columnId}: {filter.operator}: {filter.value}
                </div>
              )
            })}
          </li>
          <li>
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
                }
              ))}}
              className="w-full p-2 border border-gray-200 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">
                {"Select column..."}
              </option>
              {columns.map((column) => (
                <option key={`option ${column.id}`} value={column.id}>
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
                }))
              }}
              className="w-full p-2 border border-gray-200 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select operator...</option>
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
                placeholder="Enter value..."
                className="w-full p-2 border border-gray-200 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            )}
            <button
              onClick={() => {
                if (newFilter.columnId === "" || newFilter.operator === "" || (newFilter.value === "" && needsValueInput)) {
                  alert("Fill in all the fields")
                } else {
                  updateFilter.mutate({
                    viewId: viewId,
                    columnId: newFilter.columnId,
                    operator: newFilter.operator,
                    value: newFilter.value,
                  })
                  setNewFilter({
                    columnId: '',
                    operator: '',
                    value: '',
                    type: '',
                  })
                  setIsOpen(false);
                }
              }}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Apply Filters
            </button>
            <button
              onClick={() => {
                setNewFilter({
                  columnId: '',
                  operator: '',
                  value: '',
                  type: '',
                })
              }}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Clear
            </button>
          </li>
        </ul>
      </div>
    </div>
  );
}