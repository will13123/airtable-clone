"use client";

import Link from "next/link";
import { useState } from "react";
import { api } from "~/trpc/react";
import CreateBase from "./createBase";

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
    <div className="grid grid-cols-4 gap-8 mb-4 items-center">
      {bases.map((base) => (
        <div key={base.id} className="relative">
          <Link href={`/base?id=${base.id}&name=${base.name}`}>
            <div className="bg-white rounded-lg border border-neutral-200 p-4 hover:shadow-md transition-shadow duration-200 cursor-pointer relative">
              {editingBase === base.id ? (
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onBlur={() => handleSaveRename(base.id)}
                  className="w-full bg-transparent border-none outline-none focus:ring-2 focus:ring-blue-500 rounded px-1"
                  autoFocus
                  onClick={(e) => e.preventDefault()}
                />
              ) : (
                <span className="pr-8">{base.name}</span>
              )}
              
              <button
                onClick={(e) => handleDropdownClick(e, base.id)}
                className="cursor-pointer absolute right-2 top-1/2 transform -translate-y-1/2 p-1 hover:bg-gray-100 rounded"
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
                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 rounded-t-lg"
              >
                Rename
              </button>
              <button
                onClick={() => handleDelete(base.id)}
                className="w-full px-4 py-2 text-left text-sm rounded-b-lg"
              >
                Delete
              </button>
            </div>
          )}
        </div>
      ))}
      <CreateBase/>
    </div>
  );
}