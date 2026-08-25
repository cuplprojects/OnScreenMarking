using System;
using MySqlConnector;

class Program
{
    static void Main()
    {
        string connStr = "Server=192.168.1.27;Database=osm;User=VM5;Password=MARKS@123a;Port=3306;";
        using var conn = new MySqlConnection(connStr);
        conn.Open();
        
        try
        {
            using var cmd = new MySqlCommand("ALTER TABLE Allocations ADD COLUMN Deadline datetime(6) NULL;", conn);
            cmd.ExecuteNonQuery();
            Console.WriteLine("Added Deadline column");
        }
        catch(Exception ex)
        {
            Console.WriteLine("Error adding column: " + ex.Message);
        }

        try
        {
            using var cmd = new MySqlCommand("INSERT INTO __EFMigrationsHistory (MigrationId, ProductVersion) VALUES ('20260824070012_Project paper', '8.0.8') ON DUPLICATE KEY UPDATE ProductVersion='8.0.8';", conn);
            cmd.ExecuteNonQuery();
            Console.WriteLine("Marked Project paper as applied");
        }
        catch(Exception ex)
        {
            Console.WriteLine("Error inserting into history: " + ex.Message);
        }

        try
        {
            using var cmd = new MySqlCommand("INSERT INTO __EFMigrationsHistory (MigrationId, ProductVersion) VALUES ('20260824130432_AddAllocationDeadline', '8.0.8') ON DUPLICATE KEY UPDATE ProductVersion='8.0.8';", conn);
            cmd.ExecuteNonQuery();
            Console.WriteLine("Marked AddAllocationDeadline as applied");
        }
        catch(Exception ex)
        {
            Console.WriteLine("Error inserting into history: " + ex.Message);
        }
    }
}
