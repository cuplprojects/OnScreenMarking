using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace API.Migrations
{
    /// <inheritdoc />
    public partial class DecouplePapersFromProjects : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<int>(
                name: "ProjectId",
                table: "Papers",
                type: "int",
                nullable: true,
                oldClrType: typeof(int),
                oldType: "int");

            migrationBuilder.AddColumn<int>(
                name: "UniversityId",
                table: "Papers",
                type: "int",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Papers_UniversityId",
                table: "Papers",
                column: "UniversityId");

            migrationBuilder.AddForeignKey(
                name: "FK_Papers_Universities_UniversityId",
                table: "Papers",
                column: "UniversityId",
                principalTable: "Universities",
                principalColumn: "UniversityId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Papers_Universities_UniversityId",
                table: "Papers");

            migrationBuilder.DropIndex(
                name: "IX_Papers_UniversityId",
                table: "Papers");

            migrationBuilder.DropColumn(
                name: "UniversityId",
                table: "Papers");

            migrationBuilder.AlterColumn<int>(
                name: "ProjectId",
                table: "Papers",
                type: "int",
                nullable: false,
                defaultValue: 0,
                oldClrType: typeof(int),
                oldType: "int",
                oldNullable: true);
        }
    }
}
