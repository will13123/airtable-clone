"use client";

import Link from "next/link";
import { useState } from "react";
import { api } from "~/trpc/react";

export default function BaseList({ userId }: { userId: string }) {
  const utils = api.useUtils();
  const { data: bases, isLoading } = api.base.getAll.useQuery({ userId });
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [editingBase, setEditingBase] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const deleteBase = api.base.delete.useMutation({
    onSuccess: () => {
      void utils.base.getAll.invalidate()
    }
  });

  const renameBase = api.base.rename.useMutation({
    onSuccess: () => {
      setEditingBase(null);
      setEditName("");
      void utils.base.getAll.invalidate()
    }
  });

  const handleRename = (baseId: string, currentName: string) => {
    setEditingBase(baseId);
    setEditName(currentName);
    setOpenDropdown(null);
  };

  const handleSaveRename = (baseId: string) => {
    if (editName.trim()) {
      renameBase.mutate({ baseId, name: editName.trim() });
    } else {
      setEditingBase(null);
      setEditName("");
    }
  };

  const handleDelete = (baseId: string) => {
    deleteBase.mutate({ baseId });
    setOpenDropdown(null);
  };

  const handleDropdownClick = (e: React.MouseEvent, baseId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setOpenDropdown(openDropdown === baseId ? null : baseId);
  };

  if (isLoading) {
    return <div className="text-center">Loading bases...</div>;
  }

  if (!bases || bases.length === 0) {
    return <div className="text-center">No bases found.</div>;
  }

  return (
    <div className="grid grid-cols-5 gap-8 mb-4 items-center">
      {bases.map((base) => (
        <div key={base.id} className="relative group">
          <Link href={`/base?id=${base.id}&name=${base.name}`}>
            <div className="bg-white rounded-lg border border-neutral-200 px-5 py-4 hover:shadow-md transition-shadow duration-200 cursor-pointer relative min-h-[100px]">
              <div className="flex items-center">
                <div className="w-16 h-16 bg-red-900 opacity-90 rounded-lg flex items-center justify-center mr-4 flex-shrink-0">
                  <span className="text-white text-2xl font-semibold">
                    {base.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                
                {editingBase === base.id ? (
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onBlur={() => handleSaveRename(base.id)}
                    className="flex-1 bg-transparent border-none outline-none focus:ring-2 focus:ring-blue-500 rounded px-1"
                    autoFocus
                    onClick={(e) => e.preventDefault()}
                  />
                ) : (
                  <span className="flex-1 pr-8">{base.name}</span>
                )}
              </div>
              
              <button
                onClick={(e) => handleDropdownClick(e, base.id)}
                className="cursor-pointer absolute right-2 top-1/2 transform -translate-y-1/2 p-1 hover:bg-gray-100 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200"
              >
                <svg className="w-4 h-4 fill-gray-500 hover:fill-gray-600 inline-block" viewBox="0 0 22 22">
                  <use href="/icon_definitions.svg#ChevronDown"/>
                </svg>
              </button>
            </div>
          </Link>
          {openDropdown === base.id && (
            <div className="absolute right-0 top-full mt-1 w-32 bg-white border border-neutral-200 rounded-lg shadow-lg z-10">
              <button
                onClick={() => handleRename(base.id, base.name)}
                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 rounded-t-lg cursor-pointer"
              >
                Rename
              </button>
              <button
                onClick={() => handleDelete(base.id)}
                className="w-full px-4 py-2 text-left text-sm rounded-b-lg cursor-pointer hover:bg-gray-50"
              >
                Delete
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}