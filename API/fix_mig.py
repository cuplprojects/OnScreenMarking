with open('API/Migrations/20260824070012_Project paper.cs', 'r', encoding='utf8') as f:
    content = f.read()

content = content.replace('migrationBuilder.DropForeignKey(\n                name: \"FK_Papers_Projects_ProjectId\",\n                table: \"Papers\");', '')

# We should also empty the Scripts table before the FK is applied so it doesn't crash on the constraint
sql = 'migrationBuilder.Sql(\"DELETE FROM Scripts\");\n            migrationBuilder.AddForeignKey('
content = content.replace('migrationBuilder.AddForeignKey(', sql, 1)

with open('API/Migrations/20260824070012_Project paper.cs', 'w', encoding='utf8') as f:
    f.write(content)
