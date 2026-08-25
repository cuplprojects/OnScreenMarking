with open('Controllers/MarkingController.cs', 'r', encoding='utf8') as f:
    content = f.read()
content = content.replace('s.PaperId', 's.ProjectPaper.PaperId')
content = content.replace('s.Paper.', 's.ProjectPaper.Paper.')
content = content.replace('script.PaperId', 'script.ProjectPaper.PaperId')
content = content.replace('script.Paper.', 'script.ProjectPaper.Paper.')
content = content.replace('script.Paper?.', 'script.ProjectPaper?.Paper?.')
content = content.replace('Script.PaperId', 'Script.ProjectPaper.PaperId')
content = content.replace('Script.Paper.', 'Script.ProjectPaper.Paper.')
content = content.replace('m.Script.Paper', 'm.Script.ProjectPaper.Paper')
with open('Controllers/MarkingController.cs', 'w', encoding='utf8') as f:
    f.write(content)
