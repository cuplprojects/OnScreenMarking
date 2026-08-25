using System;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace API.Migrations
{
    /// <inheritdoc />
    public partial class Projectpaper : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            

            





            migrationBuilder.RenameColumn(
                name: "PaperId",
                table: "Scripts",
                newName: "ProjectPaperId");

            migrationBuilder.RenameIndex(
                name: "IX_Scripts_PaperId",
                table: "Scripts",
                newName: "IX_Scripts_ProjectPaperId");

            migrationBuilder.AlterColumn<string>(
                name: "Description",
                table: "Papers",
                type: "longtext",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "longtext")
                .Annotation("MySql:CharSet", "utf8mb4")
                .OldAnnotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "ProjectPapers",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    ProjectId = table.Column<int>(type: "int", nullable: false),
                    PaperId = table.Column<int>(type: "int", nullable: false),
                    CatchNo = table.Column<string>(type: "longtext", nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    QuestionPaperPdfUrl = table.Column<string>(type: "longtext", nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    IsActive = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProjectPapers", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ProjectPapers_Papers_PaperId",
                        column: x => x.PaperId,
                        principalTable: "Papers",
                        principalColumn: "PaperId",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ProjectPapers_Projects_ProjectId",
                        column: x => x.ProjectId,
                        principalTable: "Projects",
                        principalColumn: "ProjectId",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateIndex(
                name: "IX_Papers_PaperCode_UniversityId",
                table: "Papers",
                columns: new[] { "PaperCode", "UniversityId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ProjectPapers_PaperId",
                table: "ProjectPapers",
                column: "PaperId");

            migrationBuilder.CreateIndex(
                name: "IX_ProjectPapers_ProjectId_PaperId",
                table: "ProjectPapers",
                columns: new[] { "ProjectId", "PaperId" },
                unique: true);

            migrationBuilder.Sql("DELETE FROM Scripts");
            migrationBuilder.AddForeignKey(
                name: "FK_Scripts_ProjectPapers_ProjectPaperId",
                table: "Scripts",
                column: "ProjectPaperId",
                principalTable: "ProjectPapers",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Scripts_ProjectPapers_ProjectPaperId",
                table: "Scripts");

            migrationBuilder.DropTable(
                name: "ProjectPapers");

            migrationBuilder.DropIndex(
                name: "IX_Papers_PaperCode_UniversityId",
                table: "Papers");

            migrationBuilder.RenameColumn(
                name: "ProjectPaperId",
                table: "Scripts",
                newName: "PaperId");

            migrationBuilder.RenameIndex(
                name: "IX_Scripts_ProjectPaperId",
                table: "Scripts",
                newName: "IX_Scripts_PaperId");

            migrationBuilder.UpdateData(
                table: "Papers",
                keyColumn: "Description",
                keyValue: null,
                column: "Description",
                value: "");

            migrationBuilder.AlterColumn<string>(
                name: "Description",
                table: "Papers",
                type: "longtext",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "longtext",
                oldNullable: true)
                .Annotation("MySql:CharSet", "utf8mb4")
                .OldAnnotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "CatchNo",
                table: "Papers",
                type: "longtext",
                nullable: false)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<int>(
                name: "ProjectId",
                table: "Papers",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "QuestionPaperPdfUrl",
                table: "Papers",
                type: "longtext",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateIndex(
                name: "IX_Papers_PaperCode",
                table: "Papers",
                column: "PaperCode",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Papers_ProjectId",
                table: "Papers",
                column: "ProjectId");

            migrationBuilder.AddForeignKey(
                name: "FK_Papers_Projects_ProjectId",
                table: "Papers",
                column: "ProjectId",
                principalTable: "Projects",
                principalColumn: "ProjectId",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_Scripts_Papers_PaperId",
                table: "Scripts",
                column: "PaperId",
                principalTable: "Papers",
                principalColumn: "PaperId",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
