using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace API.Migrations
{
    /// <inheritdoc />
    public partial class AddRollNumberToScript : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // migrationBuilder.AddColumn<string>(
            //     name: "RollNumber",
            //     table: "Scripts",
            //     type: "longtext",
            //     nullable: true)
            //     .Annotation("MySql:CharSet", "utf8mb4");

            // migrationBuilder.AlterColumn<string>(
            //     name: "QuestionNo",
            //     table: "Questions",
            //     type: "longtext",
            //     nullable: false,
            //     oldClrType: typeof(int),
            //     oldType: "int")
            //     .Annotation("MySql:CharSet", "utf8mb4");

            // migrationBuilder.CreateTable(
            //     name: "questiontypes",
            //     columns: table => new
            //     {
            //         QuestiontypeId = table.Column<int>(type: "int", nullable: false)
            //             .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
            //         Questiontype = table.Column<string>(type: "varchar(255)", maxLength: 255, nullable: false)
            //             .Annotation("MySql:CharSet", "utf8mb4")
            //     },
            //     constraints: table =>
            //     {
            //         table.PrimaryKey("PK_questiontypes", x => x.QuestiontypeId);
            //     })
            //     .Annotation("MySql:CharSet", "utf8mb4");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "questiontypes");

            migrationBuilder.DropColumn(
                name: "RollNumber",
                table: "Scripts");

            migrationBuilder.AlterColumn<int>(
                name: "QuestionNo",
                table: "Questions",
                type: "int",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "longtext")
                .OldAnnotation("MySql:CharSet", "utf8mb4");
        }
    }
}
