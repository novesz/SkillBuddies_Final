using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Data;
using System.Windows.Documents;
using System.Windows.Input;
using System.Windows.Media;
using System.Windows.Media.Imaging;
using System.Windows.Shapes;
using MySql.Data.MySqlClient;
using adminPanel.Data;
using adminPanel.Models;
using adminPanel.Helpers;
using System.IO;

namespace adminPanel
{
    /// <summary>
    /// Interaction logic for Login.xaml
    /// </summary>
    public partial class Login : Window
    {
        public Login()
        {
            InitializeComponent();
        }

        private void LoginButton_Click(object sender, RoutedEventArgs e)
        {
            var username = UsernameTextBox.Text?.Trim();
            var password = PasswordBox.Password ?? string.Empty;

            if (string.IsNullOrEmpty(username) || string.IsNullOrEmpty(password))
            {
                MessageBox.Show("Please enter both username and password.", "Validation", MessageBoxButton.OK, MessageBoxImage.Warning);
                return;
            }

            try
            {
                using (var conn = Database.GetConnection())
                {
                    conn.Open();

                    const string sql = @"
                        SELECT UserID, Username, Email, RankID, Password, pictures.URL 
                        FROM users JOIN pictures ON users.PfpID = pictures.PicID
                        WHERE Username = @username
                        LIMIT 1";

                    using (var cmd = new MySqlCommand(sql, conn))
                    {
                        cmd.Parameters.AddWithValue("@username", username);

                        using (var reader = cmd.ExecuteReader())
                        {
                            if (!reader.Read())
                            {
                                MessageBox.Show("Invalid username or password.", "Login failed", MessageBoxButton.OK, MessageBoxImage.Error);
                                return;
                            }

                            var storedPasswordObj = reader["Password"];
                            var storedHash = storedPasswordObj == DBNull.Value ? null : Convert.ToString(storedPasswordObj);

                            var passwordMatches = false;

                            if (!string.IsNullOrEmpty(storedHash))
                            {
                                // Prefer bcrypt verification if passwords are stored hashed with bcrypt.
                                try
                                {
                                    passwordMatches = BCrypt.Net.BCrypt.Verify(password, storedHash);
                                }
                                catch
                                {
                                    // If verification fails (for example stored value not bcrypt), fall back to direct compare.
                                    passwordMatches = storedHash == password;
                                }
                            }

                            if (!passwordMatches)
                            {
                                MessageBox.Show("Invalid username or password.", "Login failed", MessageBoxButton.OK, MessageBoxImage.Error);
                                return;
                            }

                            var rankId = Convert.ToInt32(reader["RankID"]);
                            
                            if (rankId == 0)
                            {
                                MessageBox.Show("This account is banned.", "Access denied", MessageBoxButton.OK, MessageBoxImage.Stop);
                                return;
                            }

                            if (rankId != 2 && rankId != 3)
                            {
                                MessageBox.Show("You do not have admin privileges.", "Access denied", MessageBoxButton.OK, MessageBoxImage.Stop);
                                return;
                            }
                            // Set logged in flag and close login window
                            MainWindow.isLoggedIn = true;
                            MainWindow.loginRank = rankId;
                            

                            var url = reader["URL"] == DBNull.Value ? null : Convert.ToString(reader["URL"]);
                            var fullPath = string.IsNullOrWhiteSpace(url) ? null : PathHelper.GetAvatarFullPath(url);
                            MainWindow.profilePicture = (!string.IsNullOrEmpty(fullPath) && File.Exists(fullPath)) ? fullPath : null;

                            if (MainWindow.isLoggedIn == true)
                            {
                                MessageBox.Show("Successful login",
                                                "Login",
                                                MessageBoxButton.OK,
                                                MessageBoxImage.Information);
                            }
                            this.Close();
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show("Login error: " + ex.Message, "Error", MessageBoxButton.OK, MessageBoxImage.Error);
            }
        }
    }
}
