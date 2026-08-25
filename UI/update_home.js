const fs = require('fs');
const path = 'd:/OnScreenMarking/UI/src/pages/Home.jsx';

let content = fs.readFileSync(path, 'utf8');

if (!content.includes('import RequestScriptsModal')) {
    content = content.replace(
        "import ColumnFilter from '../components/ColumnFilter';", 
        "import ColumnFilter from '../components/ColumnFilter';\nimport RequestScriptsModal from '../components/RequestScriptsModal';"
    );
}

if (!content.includes('const [assignedPapers, setAssignedPapers] = useState([]);')) {
    content = content.replace(
        "const [subjectWorkloads, setSubjectWorkloads] = useState([]);",
        "const [subjectWorkloads, setSubjectWorkloads] = useState([]);\n  const [assignedPapers, setAssignedPapers] = useState([]);\n  const [requestModalPaper, setRequestModalPaper] = useState(null);"
    );
}

if (!content.includes('apiCall(/PaperExaminers/examiner/)')) {
    const hookStart = "const loadStats = async () => {";
    const hookEnd = "if (!user?.id) return;";
    content = content.replace(
        hookStart + "\n" + "      " + hookEnd,
        hookStart + "\n" + "      " + hookEnd + "\n" + 
        "      try {\n" +
        "        const papers = await apiCall(/PaperExaminers/examiner/ + user.id);\n" +
        "        if (Array.isArray(papers)) setAssignedPapers(papers);\n" +
        "      } catch(e) { console.error('Failed to load papers:', e); }\n"
    );
}

if (!content.includes('RequestScriptsModal isOpen={!!requestModalPaper}')) {
    const modalMarkup = 
      <RequestScriptsModal 
        isOpen={!!requestModalPaper}
        onClose={() => setRequestModalPaper(null)}
        paper={requestModalPaper}
        examinerId={user?.id}
        onRequested={() => {
          refreshTable();
          // reload stats to update pending count
          const timer = setTimeout(() => window.location.reload(), 1500);
        }}
      />
    </div>
  );
};;
    content = content.replace(
        "    </div>\n  );\n};",
        modalMarkup
    );
}

// Add request script button next to expertise subjects... wait, if papers are distinct from expertise subject cards, maybe I should render assignedPapers separately?
// Let's just render it inside the Subject Expertise section.
const expertiseSectionReplace = \
              <div className="col-span-3 text-center py-4 text-slate-400 text-[10px] font-bold uppercase tracking-wider border border-dashed border-slate-200 rounded-xl">
                No Expertise Subjects configured for your profile
              </div>
\;
const assignedPapersMarkup = \
          </div>
          
          {/* Assigned Papers for Requesting Scripts */}
          {assignedPapers.length > 0 && (
            <div className="mt-8">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                <FileText size={16} className="text-blue-500" />
                <span>Assigned Papers (Request Scripts)</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {assignedPapers.map((paper, idx) => (
                  <div key={idx} className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm hover:border-blue-300 transition-colors flex flex-col justify-between">
                    <div>
                      <div className="text-xs font-bold text-slate-400 uppercase">{paper.paperCode}</div>
                      <div className="text-sm font-bold text-slate-800 mt-1">{paper.paperName}</div>
                    </div>
                    <button 
                      onClick={() => setRequestModalPaper(paper)}
                      className="mt-4 w-full py-2 bg-blue-50 hover:bg-blue-600 text-blue-600 hover:text-white text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      <Zap size={14} /> Request Scripts
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
\;

if (!content.includes('Assigned Papers (Request Scripts)')) {
    content = content.replace(
        "            )}\\n          </div>\\n        </div>",
        "            )}\n          </div>\n" + assignedPapersMarkup + "\n        </div>"
    );
}

fs.writeFileSync(path, content, 'utf8');
