"use client";

import BaseList from './baseList';
import CreateBase from './createBase';

export default function Sidebar({ userId, isExpanded, setIsExpanded }: { userId: string, isExpanded: boolean, setIsExpanded: (input: boolean) => void}) {
  return (
    <div className="flex h-[93%] bg-gray-100 relative">
      {/* Sidebar */}
      <div className={`sidebar-panel absolute top-0 left-0 h-full bg-white transition-all duration-200 ease-in-out z-10 border-r border-neutral-200 overflow-hidden ${
        isExpanded ? 'w-72' : 'w-13'
      }`}
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
      >
        
        <div className="p-4 items-left content-left flex flex-col h-full">
          <div className="flex-1">
            <div className={`flex items-center mb-3 ${!isExpanded ? 'justify-center' : 'pl-1'}`}>
              <svg className="w-6 h-6 fill-current inline-block flex-shrink-0" viewBox="0 0 22 22">
                <use href="/icon_definitions.svg#House"/>
              </svg>
              {isExpanded && (
                <span className="ml-3 text-sm whitespace-nowrap">
                  Home
                </span>
              )}
            </div>
            <div className={`flex items-center mb-3 ${!isExpanded ? 'justify-center' : 'pl-1'}`}>
              <svg className="w-6 h-6 fill-current inline-block flex-shrink-0" viewBox="0 0 22 22">
                <use href="/icon_definitions.svg#Star"/>
              </svg>
              {isExpanded && (
                <span className="ml-3 text-sm whitespace-nowrap">
                  Starred
                </span>
              )}
            </div>
            <div className={`flex items-center mb-3 ${!isExpanded ? 'justify-center' : 'pl-1'}`}>
              <svg className="w-6 h-6 fill-current inline-block flex-shrink-0" viewBox="0 0 22 22">
                <use href="/icon_definitions.svg#Share"/>
              </svg>
              {isExpanded && (
                <span className="ml-3 text-sm whitespace-nowrap">
                  Shared
                </span>
              )}
            </div>
            <div className={`flex items-center mb-3 ${!isExpanded ? 'justify-center' : 'pl-1'}`}>
              <svg className="w-6 h-6 fill-current inline-block flex-shrink-0" viewBox="0 0 22 22">
                <use href="/icon_definitions.svg#UsersThree"/>
              </svg>
              {isExpanded && (
                <span className="ml-3 text-sm whitespace-nowrap">
                  Workspaces
                </span>
              )}
            </div>
          </div>
          
          <div className="mt-auto">
            <div className={`flex items-center ${!isExpanded ? 'justify-center' : 'pl-1'}`}>
              <CreateBase isExpanded={isExpanded}/>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className={`h-full flex-1 transition-all duration-200 ease-in-out ${
        isExpanded ? 'ml-72' : 'ml-13'
      }`}>
        <main className="flex h-full flex-col bg-neutral-50 text-black p-6 flex-1">
          <h1 className="text-3xl font-bold mb-6">Home</h1>
          
          {/* Starting Cards */}
          <div className="grid grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-lg border border-neutral-200 p-4 hover:shadow-md transition-shadow duration-100 cursor-pointer">
              <div className="flex items-center mb-3">
                <svg className="mr-2 w-5 h-5 text-pink-400 fill-current" viewBox="0 0 22 22">
                  <use href="/icon_definitions.svg#Star"/>
                </svg>
                <h3 className="text-lg font-semibold text-gray-800">Start with Omni</h3>
              </div>
              <p className="text-sm text-gray-600">Use AI to build a custom app tailored to your workflow</p>
            </div>

            <div className="bg-white rounded-lg border border-neutral-200 p-4 hover:shadow-md transition-shadow duration-100 cursor-pointer">
              <div className="flex items-center mb-3">
                <svg className="mr-2 w-5 h-5 text-purple-800 fill-current" viewBox="0 0 22 22">
                  <use href="/icon_definitions.svg#GridFour"/>
                </svg>
                <h3 className="text-lg font-semibold text-gray-800">Start with templates</h3>
              </div>
              <p className="text-sm text-gray-600">Select a template to get started and customize as you go.</p>
            </div>

            <div className="bg-white rounded-lg border border-neutral-200 p-4 hover:shadow-md transition-shadow duration-100 cursor-pointer">
              <div className="flex items-center mb-3">
                <svg className="mr-2 w-5 h-5 text-green-700 fill-current" viewBox="0 0 22 22">
                  <use href="/icon_definitions.svg#ArrowUp"/>
                </svg>
                <h3 className="text-lg font-semibold text-gray-800">Quickly upload</h3>
              </div>
              <p className="text-sm text-gray-600">Easily migrate your existing projects in just a few minutes.</p>
            </div>

            <div className="bg-white rounded-lg border border-neutral-200 p-4 hover:shadow-md transition-shadow duration-100 cursor-pointer">
              <div className="flex items-center mb-3">
                <svg className="mr-2 w-5 h-5 text-blue-600 fill-current" viewBox="0 0 22 22">
                  <use href="/icon_definitions.svg#Table"/>
                </svg>
                <h3 className="text-lg font-semibold text-gray-800">Build an app on your own</h3>
              </div>
              <p className="text-sm text-gray-600">Start with a blank app and build your ideal workflow.</p>
            </div>
          </div>

          <section className="mb-8">
            <div className='flex mb-3 items-center'>
              <p className='text-sm text-gray-500'>Opened anytime</p>
              <svg className="w-3 h-3 fill-gray-500 inline-block" viewBox="0 0 22 22">
                <use href="/icon_definitions.svg#ChevronDown"/>
              </svg>
            </div>
            <BaseList userId={userId}/>
          </section>
        </main>
      </div>
    </div>
  );
}