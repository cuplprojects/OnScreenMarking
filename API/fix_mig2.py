with open('API/Migrations/20260824070012_Project paper.cs', 'r', encoding='utf8') as f:
    content = f.read()

content = content.replace('migrationBuilder.DropForeignKey(\n                name: \"FK_Scripts_Papers_PaperId\",\n                table: \"Scripts\");', '')

with open('API/Migrations/20260824070012_Project paper.cs', 'w', encoding='utf8') as f:
    f.write(content)
