with open('Controllers/MarkingController.cs', 'r', encoding='utf8') as f:
    content = f.read()
content = content.replace('Script?.Paper?.', 'Script?.ProjectPaper?.Paper?.')
with open('Controllers/MarkingController.cs', 'w', encoding='utf8') as f:
    f.write(content)

with open('Controllers/UsersController.cs', 'r', encoding='utf8') as f:
    content = f.read()
content = content.replace('p.Paper.ProjectId', 'p.ProjectPaper.ProjectId')
with open('Controllers/UsersController.cs', 'w', encoding='utf8') as f:
    f.write(content)

with open('Controllers/PapersController.cs', 'r', encoding='utf8') as f:
    content = f.read()
content = content.replace('p.Project != null', 'p.ProjectPapers.Any()')
content = content.replace('QuestionPaperPdfUrl = p.QuestionPaperPdfUrl', 'QuestionPaperPdfUrl = ""')
content = content.replace('paper.QuestionPaperPdfUrl = paperDto.QuestionPaperPdfUrl;', '//paper.QuestionPaperPdfUrl')
content = content.replace('paper.CatchNo = paperDto.CatchNo;', '//paper.CatchNo')
content = content.replace('Section.ProjectPaper', 'Section.Paper')
content = content.replace('paper.ProjectId = paperDto.ProjectId;', '//paper.ProjectId')
content = content.replace('ProjectId = p.ProjectId', 'ProjectId = 0')
content = content.replace('CatchNo = p.CatchNo', 'CatchNo = ""')
with open('Controllers/PapersController.cs', 'w', encoding='utf8') as f:
    f.write(content)

with open('Controllers/SectionController.cs', 'r', encoding='utf8') as f:
    content = f.read()
content = content.replace('Section.ProjectPaper', 'Section.Paper')
content = content.replace('s.ProjectPaper.Paper', 's.Paper')
content = content.replace('section.ProjectPaper', 'section.Paper')
with open('Controllers/SectionController.cs', 'w', encoding='utf8') as f:
    f.write(content)

with open('Controllers/ScriptsController.cs', 'r', encoding='utf8') as f:
    content = f.read()
content = content.replace('s.ProjectPaper.Paper.IsActive', 's.ProjectPaper?.Paper?.IsActive ?? false')
with open('Controllers/ScriptsController.cs', 'w', encoding='utf8') as f:
    f.write(content)
