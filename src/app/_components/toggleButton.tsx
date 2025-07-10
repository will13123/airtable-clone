"use client";

interface ToggleButtonProps {
  onToggle: () => void;
}

export default function ToggleButton({ onToggle }: ToggleButtonProps) {
  return (
    <button 
      onClick={onToggle}
      className="p-2 rounded-l focus:outline-none cursor-pointer hover:bg-gray-100"
    >
      <svg className="w-6 h-6 fill-gray-500 inline-block" viewBox="0 0 22 22">
        <use href="/icon_definitions.svg#List"/>
      </svg>
    </button>
  );
}