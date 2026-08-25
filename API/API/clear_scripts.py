import mysql.connector

config = {
    'user': 'VM5',
    'password': 'MARKS@123a',
    'host': '192.168.1.27',
    'database': 'osm',
    'port': 3306
}

try:
    conn = mysql.connector.connect(**config)
    cursor = conn.cursor()
    print("Connected to MySQL.")
    
    # Disable foreign key checks temporarily so we can clear tables easily
    cursor.execute("SET FOREIGN_KEY_CHECKS=0;")
    
    # Tables to clear
    tables_to_clear = ['Markings', 'SectionDetails', 'Scripts']
    
    for table in tables_to_clear:
        try:
            cursor.execute(f"TRUNCATE TABLE {table};")
            print(f"Cleared {table}")
        except Exception as e:
            print(f"Failed to clear {table}: {e}")
            
    cursor.execute("SET FOREIGN_KEY_CHECKS=1;")
    conn.commit()
    cursor.close()
    conn.close()
    print("Done!")
except Exception as e:
    print(f"Error: {e}")
