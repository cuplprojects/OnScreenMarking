import os

def process_file(path, replacements):
    with open(path, 'r', encoding='utf8') as f:
        content = f.read()
    for old, new in replacements:
        content = content.replace(old, new)
    with open(path, 'w', encoding='utf8') as f:
        f.write(content)

process_file('Controllers/UsersController.cs', [
    ('Paper.ProjectId', 'ProjectPaper.ProjectId'),
    ('Script.PaperId', 'Script.ProjectPaper.PaperId')
])

process_file('Controllers/MarkingController.cs', [
    ('Script.Paper', 'Script.ProjectPaper.Paper'),
    ('Script.PaperId', 'Script.ProjectPaper.PaperId')
])

process_file('Controllers/ProjectController.cs', [
    ('Paper.ProjectId', 'ProjectPaper.ProjectId')
])

process_file('Controllers/PapersController.cs', [
    ('p => p.ProjectId', 'p => p.ProjectPapers.Any(pp => pp.ProjectId'),
    ('.Include(p => p.Project)', ''),
    ('ProjectId = p.ProjectId', 'ProjectId = 0'),
    ('CatchNo = p.CatchNo', 'CatchNo = \"\"'),
    ('QuestionPaperPdfUrl = p.QuestionPaperPdfUrl', 'QuestionPaperPdfUrl = \"\"'),
    ('paper.CatchNo', '//paper.CatchNo'),
    ('paper.QuestionPaperPdfUrl', '//paper.QuestionPaperPdfUrl'),
    ('paper.ProjectId', '0'),
    ('Section.ProjectPaper', 'Section.Paper')
])

process_file('Controllers/SectionController.cs', [
    ('s.ProjectPaper.PaperId', 's.PaperId'),
    ('s.ProjectPaper.Paper', 's.Paper'),
    ('Section.ProjectPaper', 'Section.Paper')
])

process_file('Controllers/ScriptsController.cs', [
    ('s.ProjectPaper.Paper.', 's.ProjectPaper?.Paper?.'),
    ('script.ProjectPaper.Paper.', 'script.ProjectPaper?.Paper?.'),
    ('s.Paper', 's.ProjectPaper.Paper')
])
