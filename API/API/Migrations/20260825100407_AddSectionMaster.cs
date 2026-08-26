using System;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace API.Migrations
{
    /// <inheritdoc />
    public partial class AddSectionMaster : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "SectionMasterId",
                table: "Sections",
                type: "int",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "SectionMasters",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    Name = table.Column<string>(type: "varchar(255)", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Description = table.Column<string>(type: "longtext", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    TotalQuestions = table.Column<int>(type: "int", nullable: false),
                    TotalMarks = table.Column<int>(type: "int", nullable: false),
                    StartQuestion = table.Column<int>(type: "int", nullable: false),
                    EndQuestion = table.Column<int>(type: "int", nullable: false),
                    MaxQuestionsToAttempt = table.Column<int>(type: "int", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SectionMasters", x => x.Id);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateIndex(
                name: "IX_Sections_SectionMasterId",
                table: "Sections",
                column: "SectionMasterId");

            migrationBuilder.CreateIndex(
                name: "IX_SectionMasters_Name",
                table: "SectionMasters",
                column: "Name",
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_Sections_SectionMasters_SectionMasterId",
                table: "Sections",
                column: "SectionMasterId",
                principalTable: "SectionMasters",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Sections_SectionMasters_SectionMasterId",
                table: "Sections");

            migrationBuilder.DropTable(
                name: "SectionMasters");

            migrationBuilder.DropIndex(
                name: "IX_Sections_SectionMasterId",
                table: "Sections");

            migrationBuilder.DropColumn(
                name: "SectionMasterId",
                table: "Sections");
        }
    }
}
