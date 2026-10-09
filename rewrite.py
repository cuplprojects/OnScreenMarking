import os

with open('UI/src/pages/ImportPapers.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Change the main flex layout
content = content.replace('flex flex-col xl:flex-row min-h-[70vh]', 'flex flex-col min-h-[70vh]')

# 2. Change the LEFT SIDEBAR to a horizontal top bar
content = content.replace(
    'w-full md:w-full xl:w-96 bg-gray-50/50 border-r border-gray-200 overflow-y-auto z-10 custom-scrollbar flex flex-col w-full md:w-96',
    'w-full bg-gray-50/50 border-b border-gray-200 z-10 flex flex-col lg:flex-row gap-4 p-4 lg:px-8 lg:py-6 items-start lg:items-center justify-between'
)
content = content.replace(
    '<div className="p-6 md:p-8 shrink-0">', 
    '<div className="p-4 md:p-6 shrink-0 flex flex-col lg:flex-row gap-6 items-start lg:items-center w-full lg:w-auto">'
)

content = content.replace(
    '<div className="flex-1 overflow-y-auto custom-scrollbar pb-8 space-y-8 px-4 md:px-8">', 
    '<div className="flex flex-col lg:flex-row items-center gap-6 w-full">'
)

content = content.replace(
    '<div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">', 
    '<div className="animate-in fade-in slide-in-from-bottom-4 duration-500 flex flex-col lg:flex-row gap-6 items-center w-full flex-1">'
)

# Move the import bar up
import_bar = '''                  <div className="border-t border-gray-100 p-6 bg-gray-50/50 flex flex-col sm:flex-row items-center justify-between gap-4 mt-auto">
                    <div className="flex items-center gap-2">
                      <span className="bg-white border border-gray-200 text-teal-700 font-black px-3 py-1.5 rounded-lg text-lg shadow-sm">
                        {selectedPaperIds.length}
                      </span>
                      <span className="text-sm font-bold text-gray-600">papers selected</span>
                    </div>
                    
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                      <button
                        onClick={handleCancel}
                        disabled={importing}
                        className="px-6 py-3 rounded-xl text-sm font-bold text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 transition-colors w-full sm:w-auto"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleImport}
                        disabled={importing || selectedPaperIds.length === 0}
                        className={`px-8 py-3 rounded-xl text-sm font-black text-white shadow-lg transition-all w-full sm:w-auto flex items-center justify-center gap-2 ${
                          importing || selectedPaperIds.length === 0
                            ? 'bg-gray-300 shadow-none cursor-not-allowed'
                            : 'bg-teal-600 hover:bg-teal-700 hover:shadow-teal-600/20 hover:-translate-y-0.5'
                        }`}
                      >
                        {importing ? (
                          <Loader size={16} className="animate-spin" />
                        ) : (
                          <Download size={16} />
                        )}
                        {importing ? 'IMPORTING...' : 'IMPORT PAPERS'}
                      </button>
                    </div>
                  </div>'''

content = content.replace(import_bar, '')

top_action_bar = '''                {/* Top Action Bar */}
                <div className="sm:px-10 pt-10 pb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-gray-100 md:px-6 px-4">
                  <div>
                    <h3 className="text-xl font-black text-gray-900 flex items-center gap-3">
                      Available Papers
                      <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-md text-xs font-bold">
                        {totalCount} Total
                      </span>
                    </h3>
                  </div>
                  
                  <button 
                    onClick={handleSelectAll}
                    className="group flex items-center justify-center gap-2 text-sm font-bold text-gray-600 hover:text-teal-700 transition-colors bg-white border border-gray-200 hover:border-teal-200 px-5 py-2.5 rounded-md shadow-sm"
                  >
                    <div className="relative w-5 h-5 flex items-center justify-center">
                      {selectedPaperIds.length === allProjectPapers.length && allProjectPapers.length > 0 ? (
                        <CheckSquare size={18} className="text-teal-700 absolute transition-all scale-100 opacity-100" />
                      ) : (
                        <>
                          <Square size={18} className="text-gray-300 absolute transition-all scale-100 opacity-100 group-hover:opacity-0" />
                          <CheckSquare size={18} className="text-teal-500 absolute transition-all scale-50 opacity-0 group-hover:scale-100 group-hover:opacity-100" />
                        </>
                      )}
                    </div>
                    {selectedPaperIds.length === allProjectPapers.length && allProjectPapers.length > 0 ? "Deselect All" : "Select All"}
                  </button>
                </div>'''

new_top_action = top_action_bar + '''
                {/* INJECTED IMPORT BAR */}
                <div className="p-4 sm:px-10 bg-teal-50/30 flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-gray-100 md:px-6 px-4">
                    <div className="flex items-center gap-2">
                      <span className="bg-white border border-gray-200 text-teal-700 font-black px-3 py-1.5 rounded-lg text-lg shadow-sm">
                        {selectedPaperIds.length}
                      </span>
                      <span className="text-sm font-bold text-gray-600">papers selected to import</span>
                    </div>
                    <button
                        onClick={handleImport}
                        disabled={importing || selectedPaperIds.length === 0}
                        className={`px-8 py-3 rounded-xl text-sm font-black text-white shadow-lg transition-all w-full sm:w-auto flex items-center justify-center gap-2 ${
                          importing || selectedPaperIds.length === 0
                            ? 'bg-gray-300 shadow-none cursor-not-allowed'
                            : 'bg-teal-600 hover:bg-teal-700 hover:shadow-teal-600/20 hover:-translate-y-0.5'
                        }`}
                      >
                        {importing ? (
                          <Loader size={16} className="animate-spin" />
                        ) : (
                          <Download size={16} />
                        )}
                        {importing ? 'IMPORTING...' : 'IMPORT PAPERS'}
                    </button>
                </div>
'''

content = content.replace(top_action_bar, new_top_action)

with open('UI/src/pages/ImportPapers.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
print('Done!')
