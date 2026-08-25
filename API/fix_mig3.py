with open('API/Migrations/20260824070012_Project paper.cs', 'r', encoding='utf8') as f:
    content = f.read()

content = content.replace('migrationBuilder.DropIndex(\n                name: \"IX_Papers_PaperCode\",\n                table: \"Papers\");', '')
content = content.replace('migrationBuilder.DropIndex(\n                name: \"IX_Papers_ProjectId\",\n                table: \"Papers\");', '')

with open('API/Migrations/20260824070012_Project paper.cs', 'w', encoding='utf8') as f:
    f.write(content)
