import os

def replace_in_file(path, old, new):
    with open(path, 'r', encoding='utf8') as f:
        content = f.read()
    content = content.replace(old, new)
    with open(path, 'w', encoding='utf8') as f:
        f.write(content)

# ApplicationDbContext.cs
replace_in_file('Data/ApplicationDbContext.cs', '.HasMany(p => p.Scripts)\n                .WithOne(s => s.Paper)', '')
replace_in_file('Data/ApplicationDbContext.cs', '.HasForeignKey(s => s.PaperId)\n                .OnDelete(DeleteBehavior.Cascade);', '')

# MarkingController.cs
replace_in_file('Controllers/MarkingController.cs', 's.Paper.', 's.ProjectPaper.Paper.')
replace_in_file('Controllers/MarkingController.cs', 'script.Paper.', 'script.ProjectPaper.Paper.')
replace_in_file('Controllers/MarkingController.cs', 'script.PaperId', 'script.ProjectPaper.PaperId')

# ProjectController.cs
replace_in_file('Controllers/ProjectController.cs', 'p.ProjectId', 'p.ProjectPapers.FirstOrDefault().ProjectId') 

# SectionController.cs
replace_in_file('Controllers/SectionController.cs', 'Section.ProjectPaper', 'Section.Paper')
replace_in_file('Controllers/SectionController.cs', 'section.ProjectPaper', 'section.Paper')
replace_in_file('Controllers/SectionController.cs', 's.ProjectPaper.Paper', 's.Paper')
replace_in_file('Controllers/SectionController.cs', 's.ProjectPaper', 's.Paper')

# ScriptsController.cs
replace_in_file('Controllers/ScriptsController.cs', 's.ProjectPaper.Paper.IsActive', 's.ProjectPaper?.Paper?.IsActive ?? false')

# UsersController.cs
replace_in_file('Controllers/UsersController.cs', 'Paper.ProjectId', 'ProjectPaper.ProjectId')

# PapersController.cs
replace_in_file('Controllers/PapersController.cs', 'p.CatchNo', 'p.ProjectPapers.FirstOrDefault().CatchNo')
replace_in_file('Controllers/PapersController.cs', 'p.Project != null', 'p.ProjectPapers.Any()')
replace_in_file('Controllers/PapersController.cs', 'QuestionPaperPdfUrl = \"\",\n', '')
replace_in_file('Controllers/PapersController.cs', 'paper.ProjectId = 0;', '')
replace_in_file('Controllers/PapersController.cs', 'paper.CatchNo =', '//')
replace_in_file('Controllers/PapersController.cs', 'paper.QuestionPaperPdfUrl =', '//')
replace_in_file('Controllers/PapersController.cs', 'Section.ProjectPaper', 'Section.Paper')
replace_in_file('Controllers/PapersController.cs', 'ProjectId = 0,\n', '')
replace_in_file('Controllers/PapersController.cs', 'CatchNo = \"\",\n', '')

