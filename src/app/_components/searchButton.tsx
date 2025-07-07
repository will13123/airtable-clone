import { useState, useCallback } from "react";

interface SearchButtonProps {
  onSearch: (searchTerm: string) => void;
  numSearchResults: number;
  currentMatchIndex: number;
  onNavigateMatch: (index: number) => void;
}

export default function SearchButton({ 
  onSearch, 
  numSearchResults, 
  currentMatchIndex, 
  onNavigateMatch 
}: SearchButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
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
        className={`p-2 text-gray-600 text-sm hover:text-gray-700 focus:outline-none rounded-md cursor-pointer`}
        title="Search"
      >
        <svg className="w-4 h-4 mr-1 fill-current inline-block" viewBox="0 0 22 22">
          <use href="/icon_definitions.svg#MagnifyingGlass"/>
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-gray-200 rounded-md shadow-lg z-50">
          <div className="p-3">
            <div className="flex items-center gap-2 mb-3">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Search"
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  autoFocus
                />
                {searchTerm && (
                  <button
                    onClick={handleClearSearch}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {searchTerm.trim() && (
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  {hasResults ? (
                    <>
                      {currentMatchIndex + 1} of {numSearchResults} matches
                    </>
                  ) : (
                    "No matches found"
                  )}
                </div>

                {showNavigation && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={handleNavigatePrevious}
                      disabled={!hasResults}
                      className="p-1 text-gray-500 hover:text-gray-700 disabled:text-gray-300 disabled:cursor-not-allowed rounded cursor-pointer"
                      title="Previous match"
                    >
                      Previous
                    </button>
                    <button
                      onClick={handleNavigateNext}
                      disabled={!hasResults}
                      className="p-1 text-gray-500 hover:text-gray-700 disabled:text-gray-300 disabled:cursor-not-allowed rounded cursor-pointer"
                      title="Next match"
                    >
                      Next
                    </button>
                  </div>
                )}
              </div>
            )}

            <div className="mt-3 pt-3 border-t border-gray-100">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-100"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}