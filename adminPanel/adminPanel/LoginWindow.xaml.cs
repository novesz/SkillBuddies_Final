using adminPanel.Data;
using MySql.Data.MySqlClient;
using System;
using System.Windows;

namespace adminPanel
{
    public partial class LoginWindow : Window
    {
        public LoginWindow()
        {
            InitializeComponent();
        }

        private void BtnExit_Click(object sender, RoutedEventArgs e)
        {
            Application.Current.Shutdown();
        }

        private void BtnLogin_Click(object sender, RoutedEventArgs e)
        {
            string email = TxtEmail.Text.Trim();
            string password = TxtPassword.Password; // plain text for now

            if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(password))
            {
                ShowError("Please enter email and password.");
                return;
            }

            try
            {
                using (var conn = Database.GetConnection())
                {
                    conn.Open();

                    // ⚠️ A tábla/oszlopnevek nálad lehetnek mások!
                    // Feltételezés: users(email, password, role)
                    string sql = @"
                        SELECT id, role
                        FROM users
                        WHERE email = @email AND password = @password
                        LIMIT 1;";

                    using (var cmd = new MySqlCommand(sql, conn))
                    {
                        cmd.Parameters.AddWithValue("@email", email);
                        cmd.Parameters.AddWithValue("@password", password);

                        using (var reader = cmd.ExecuteReader())
                        {
                            if (!reader.Read())
                            {
                                ShowError("Invalid email or password.");
                                return;
                            }

                            string role = reader.GetString("role");

                            // Only admins can log in
                            if (!role.Equals("admin", StringComparison.OrdinalIgnoreCase))
                            {
                                ShowError("This account is not an admin.");
                                return;
                            }
                        }
                    }
                }

                // Success -> open main window
                var main = new MainWindow();
                main.Show();
                this.Close();
            }
            catch (Exception ex)
            {
                ShowError("Database error: " + ex.Message);
            }
        }

        private void ShowError(string message)
        {
            LblError.Text = message;
            LblError.Visibility = Visibility.Visible;
        }
    }
}
