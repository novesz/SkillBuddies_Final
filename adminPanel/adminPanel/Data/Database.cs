using MySql.Data.MySqlClient;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace adminPanel.Data
{
    public class Database
    {
        private static string connectionString =
            "server=localhost;port=3307;database=skillmegoszt;user=root;password=;";

        public static MySqlConnection GetConnection()
        {
            return new MySqlConnection(connectionString);
        }
    }
}