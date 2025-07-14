import { useState, useCallback, useEffect } from "react";

interface SearchButtonProps {
  onSearch: (searchTerm: string) => void;
  numSearchResults: number;
  currentMatchIndex: number;
  onNavigateMatch: (index: number) => void;
  isOpen: boolean;
  setIsOpen: (value: boolean) => void;
}

export default function SearchButton({ 
  onSearch, 
  numSearchResults, 
  currentMatchIndex, 
  onNavigateMatch,
  isOpen,
  setIsOpen
}: SearchButtonProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const handleSearch = useCallback((term: string) => {
    setSearchTerm(term);
    onSearch(term);
  }, [onSearch]);

  const handleClearSearch = useCallback(() => {
    setSearchTerm("");
    onSearch("");
    setIsOpen(false);
  }, [onSearch]);

  const handleNavigateNext = useCallback(() => {
    if (numSearchResults > 0) {
      const nextIndex = (currentMatchIndex + 1) % numSearchResults;
      onNavigateMatch(nextIndex);
    }
  }, [numSearchResults, currentMatchIndex, onNavigateMatch]);

  const handleNavigatePrevious = useCallback(() => {
    if (numSearchResults > 0) {
      const prevIndex = currentMatchIndex === 0 ? numSearchResults - 1 : currentMatchIndex - 1;
      onNavigateMatch(prevIndex);
    }
  }, [numSearchResults, currentMatchIndex, onNavigateMatch]);

  const hasResults = numSearchResults > 0;
  const showNavigation = searchTerm.trim() && hasResults;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`p-2 text-gray-600 text-sm hover:bg-gray-100 rounded-xs hover:text-gray-700 focus:outline-none cursor-pointer`}
      >
        <svg className="w-4 h-4 fill-current inline-block" viewBox="0 0 22 22">
          <use href="/icon_definitions.svg#MagnifyingGlass"/>
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-gray-200 rounded-xd shadow-lg z-50">
          <div className="p-1">
            <div className="flex items-center gap-2 mb-3">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Find in view"
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="w-full px-3 py-2 pr-20 text-sm focus:outline-none"
                  autoFocus
                />
                {searchTerm.trim() && showNavigation && (
                  <div className="absolute right-8 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
                    <span className="text-xs text-gray-500">
                      {currentMatchIndex + 1} of {numSearchResults}
                    </span>
                    <div className="flex">
                      <button
                        onClick={handleNavigateNext}
                        disabled={!hasResults}
                        className="p-0.5 text-gray-7 disabled:text-gray-300 disabled:cursor-not-allowed rounded-r bg-gray-200 cursor-pointer hover:bg-gray-100"
                      >
                        <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 22 22">
                          <use href="/icon_definitions.svg#ChevronDown"/>
                        </svg>
                      </button>
                      <button
                        onClick={handleNavigatePrevious}
                        disabled={!hasResults}
                        className="p-0.5 text-gray-700 disabled:text-gray-300 disabled:cursor-not-allowed rounded-l bg-gray-200 cursor-pointer hover:bg-gray-100"
                      >
                        <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 22 22">
                          <use href="/icon_definitions.svg#ChevronUp"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                )}
                <button
                  onClick={handleClearSearch}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  <svg className="w-3 h-3 fill-current" viewBox="0 0 22 22">
                          <use href="/icon_definitions.svg#X"/>
                        </svg>
                </button>
              </div>
            </div>

            {searchTerm.trim() && (
              <div className="text-sm text-gray-600">
                {hasResults ? (
                  <>
                    Found {numSearchResults} matches
                  </>
                ) : (
                  "No matches found"
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}