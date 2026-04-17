using adminPanel.Data;
using adminPanel.Models;
using Google.Protobuf.WellKnownTypes;
using MySql.Data.MySqlClient;
using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.Data;
using System.Linq;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Controls.Primitives;
using System.Windows.Data;
using System.Windows.Media;
using System.Windows.Media.Imaging;
using static Org.BouncyCastle.Asn1.Cmp.Challenge;
using System.IO;

namespace adminPanel
{
    /// <summary>
    /// Reméljük kész, és működik
    /// </summary>
    public partial class MainWindow : Window
    {

        public static bool isLoggedIn { get; set; }
        public static int loginRank { get; set; }
        public static Action lastClicked { get; set; }
        public static List<int> changedIndexes = new List<int>();
        public static int selectedUserIndex { get; set; }
        public static DataTable dataGridData { get; set; }
        public static string profilePicture { get; set; }
        private void searchBox_TextChanged(object sender, TextChangedEventArgs e)
        {
            DataTable dt = dataGridData;
            if (dt == null) return;

            string filter = searchBox.Text.Trim().Replace("'", "''");
            bool hasUsername = dt.Columns.Contains("Username");
            bool hasEmail = dt.Columns.Contains("Email");

            if (string.IsNullOrEmpty(filter))
            {
                dt.DefaultView.RowFilter = "";
                dataGrid.ItemsSource = dt.DefaultView;
                return;
            }

            if (!hasUsername && !hasEmail)
            {
                dt.DefaultView.RowFilter = "";
                dataGrid.ItemsSource = dt.DefaultView;
                return;
            }

            try
            {
                if (hasUsername && hasEmail)
                    dt.DefaultView.RowFilter = $"Username LIKE '%{filter}%' OR Email LIKE '%{filter}%'";
                else if (hasUsername)
                    dt.DefaultView.RowFilter = $"Username LIKE '%{filter}%'";
                else
                    dt.DefaultView.RowFilter = $"Email LIKE '%{filter}%'";
                dataGrid.ItemsSource = dt.DefaultView;
            }
            catch (Exception ex)
            {
                MessageBox.Show("Error applying filter: " + ex.Message);
            }
        }

        private void Login_Click(object sender, RoutedEventArgs e)
        {
            if (!isLoggedIn)
            {
                Login loginWindow = new Login();
                loginWindow.ShowDialog();
                if (isLoggedIn)
                {
                    LoginOut.Content = "Log out";
                }
                if (!string.IsNullOrEmpty(MainWindow.profilePicture) && File.Exists(MainWindow.profilePicture))
                {
                    ProfilePicture.ImageSource = new BitmapImage(
                    new Uri(MainWindow.profilePicture, UriKind.Absolute));
                }
                else
                {
                    ProfilePicture.ImageSource = null;
                }

            }
            else
            {
                isLoggedIn = false;
                LoginOut.Content = "Login";
                loginRank = 0;
                if (!isLoggedIn)
                {
                    MessageBox.Show("Successfully logged out!");
                }
                ProfilePicture.ImageSource = null;
            }
        }

        private void usersButton_Click(object sender, RoutedEventArgs e)
        {
            
            usersButton.Background = (SolidColorBrush)(new BrushConverter().ConvertFrom("#22FFFFFF"));
            ticketsButton.Background = default;
            dashBoardButton.Background = default;
            banButton.IsEnabled = true;
            unbanButton.IsEnabled = true;
            saveChanges.IsEnabled = true;
            MakeAdmin.IsEnabled = true;
            replyBox.IsEnabled = false;
            resolvedCheck.IsEnabled = false;
            lastClicked = LoadUsers; // store the method

            if (isLoggedIn)
            {
                LoadUsers();
            }
            else
            {
                MessageBox.Show("Please log in to continue");
            }
        }

        private void ticketsButton_Click(object sender, RoutedEventArgs e)
        {
            
            usersButton.Background = default;
            dashBoardButton.Background = default;
            ticketsButton.Background = (SolidColorBrush)(new BrushConverter().ConvertFrom("#22FFFFFF"));
            banButton.IsEnabled = false;
            unbanButton.IsEnabled = false;
            saveChanges.IsEnabled = true;
            MakeAdmin.IsEnabled = false;
            replyBox.IsEnabled = true;
            resolvedCheck.IsEnabled = true;
            lastClicked = LoadTickets; // store the method

            if (isLoggedIn)
            {
                LoadTickets();
            }
            else
            {
                MessageBox.Show("Please log in to continue");
            }
        }
        private void LoadUsers()
        {
            changedIndexes.Clear();
            try
            {
                using (var conn = Database.GetConnection())
                {
                    conn.Open();
                    const string sql = "SELECT UserID, Username, Email, Tokens, RankID FROM users;";

                    using (var cmd = new MySqlCommand(sql, conn))
                    using (var reader = cmd.ExecuteReader())
                    {
                        var dt = new DataTable();
                        dt.Load(reader);
                        dataGrid.AutoGenerateColumns = true;
                        dataGridData = dt;
                        dataGrid.ItemsSource = dataGridData.DefaultView;
                        
                    }
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show("Error loading users: " + ex.Message);
            }
        }

        private void LoadTickets()
        {
            changedIndexes.Clear();
            try
            {
                using (var conn = Database.GetConnection())
                {
                    conn.Open();
                    const string sql = "SELECT * FROM tickets;";

                    using (var cmd = new MySqlCommand(sql, conn))
                    using (var reader = cmd.ExecuteReader())
                    {
                        var dt = new DataTable();
                        dt.Load(reader);
                        dataGrid.AutoGenerateColumns = true;
                        dataGridData = dt;
                        dataGrid.ItemsSource = dataGridData.DefaultView;
                    }
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show("Error loading tickets: " + ex.Message);
            }
        }
        private void refreshButton_Click(object sender, RoutedEventArgs e)
        {
            if (lastClicked != null)
            {
                lastClicked.Invoke(); // rerun the last query
            }
            else
            {
                MessageBox.Show("No previous action to refresh.");
            }
        }

        private void dataGrid_SelectionChanged(object sender, SelectionChangedEventArgs e)
        {
            // Ensure a row is selected
            if (dataGrid.SelectedItem == null) return;

            // Get the selected row (your bound data object)
            var selectedRow = dataGrid.SelectedItem;
            selectedUserIndex = dataGrid.Items.IndexOf(selectedRow);
            replyBox.Text = ""; // Clear the reply box when a new user is selected
            int columnIndex = 1; // e.g., second column
            var cellValue = dataGrid.Columns[columnIndex].GetCellContent(selectedRow) as TextBlock;
            if (cellValue != null)
            {
                selectedUser.Text = cellValue.Text;
            }
        }

        private void dataGrid_RowEditEnding(object sender, DataGridRowEditEndingEventArgs e)
        {
            // Only handle the commit action
            if (e.EditAction != DataGridEditAction.Commit)
                return;

            int rowIndex = dataGrid.Items.IndexOf(e.Row.Item);

            if (!changedIndexes.Contains(rowIndex))
                changedIndexes.Add(rowIndex);

            
        }

        private void banButton_Click(object sender, RoutedEventArgs e)
        {
            if (dataGrid.SelectedItem is DataRowView rowView)
            {
                int selectedRank = Convert.ToInt32(rowView["RankID"]);

                // Check permission
                if (loginRank <= selectedRank)
                {
                    MessageBox.Show("You cannot ban a user with equal or higher rank.");
                    return;
                }

                // Prevent banning already banned users
                if (selectedRank == 0)
                {
                    MessageBox.Show("User is already banned.");
                    return;
                }

                // Ban user
                rowView["RankID"] = 0;

                int rowIndex = dataGridData.Rows.IndexOf(rowView.Row);

                if (!changedIndexes.Contains(rowIndex))
                    changedIndexes.Add(rowIndex);
            }
            else
            {
                MessageBox.Show("Please select a user to ban.");
            }
        }

        private void unbanButton_Click(object sender, RoutedEventArgs e)
        {
            if (dataGrid.SelectedItem is DataRowView rowView)
            {
                if(rowView["RankID"].Equals(0))
                {
                    rowView["RankID"] = 1;

                    int rowIndex = dataGridData.Rows.IndexOf(rowView.Row);

                    if (!changedIndexes.Contains(rowIndex))
                        changedIndexes.Add(rowIndex);
                }
            }
            else
            {
                MessageBox.Show("Please select a user to ban.");
            }
        }
        
        private void MakeAdmin_Click(object sender, RoutedEventArgs e)
        {
            if (dataGrid.SelectedItem is DataRowView rowView)
            {
                if (loginRank == 3)
                {
                    rowView["RankID"] = 2;
                    int rowIndex = dataGridData.Rows.IndexOf(rowView.Row);

                    if (!changedIndexes.Contains(rowIndex))
                        changedIndexes.Add(rowIndex);
                }
                else
                {
                    MessageBox.Show("You don't have permission to make an admin");
                }
            }
            else
            {
                MessageBox.Show("Please select a user to ban.");
            }
        }

        private void saveChanges_Click(object sender, RoutedEventArgs e)
        {
            try
            {
                using (var conn = Database.GetConnection())
                {
                    conn.Open();
                    if (lastClicked == LoadUsers)
                    {
                        foreach (int index in changedIndexes)
                        {
                            var row = dataGridData.Rows[index];
                            int userId = Convert.ToInt32(row["UserID"]);
                            int rankId = Convert.ToInt32(row["RankID"]);
                            string username = row["Username"].ToString();
                            string email = row["Email"].ToString();
                            string updateSql = "UPDATE users SET RankID = @RankID, Username = @Username, Email = @Email WHERE UserID = @UserID;";
                            using (var cmd = new MySqlCommand(updateSql, conn))
                            {
                                cmd.Parameters.AddWithValue("@RankID", rankId);
                                cmd.Parameters.AddWithValue("@UserID", userId);
                                cmd.Parameters.AddWithValue("@Username", username);
                                cmd.Parameters.AddWithValue("@Email", email);
                                cmd.ExecuteNonQuery();
                            }
                            MessageBox.Show($"Updated user {username} with RankID {rankId}");
                        }
                    }
                    else if (lastClicked == LoadTickets)
                    {
                        foreach (int index in changedIndexes)
                        {
                            var row = dataGridData.Rows[index];
                            int ticketId = Convert.ToInt32(row["TicketID"]);
                            bool isResolved = (bool)row["IsResolved"];
                            string reply = row["Reply"].ToString();
                            string updateSql = "UPDATE tickets SET IsResolved = @IsResolved, Reply = @Reply WHERE TicketID = @TicketID;";
                            using (var cmd = new MySqlCommand(updateSql, conn))
                            {
                                cmd.Parameters.AddWithValue("@IsResolved", isResolved);
                                cmd.Parameters.AddWithValue("@TicketID", ticketId);
                                cmd.Parameters.AddWithValue("@Reply", reply);
                                cmd.ExecuteNonQuery();
                            }
                            MessageBox.Show($"Updated ticket {ticketId} with Status {isResolved}");
                        }
                    }
                    else
                    {
                        MessageBox.Show("No changes to save.");
                    }
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show("Error loading users: " + ex.Message);
            }
        }

        private void replyBox_TextChanged(object sender, TextChangedEventArgs e)
        {
            if(dataGrid.SelectedItem is DataRowView rowView && lastClicked == LoadTickets)
            {
                rowView["Reply"] = replyBox.Text;
                int rowIndex = dataGridData.Rows.IndexOf(rowView.Row);
                if (!changedIndexes.Contains(rowIndex))
                    changedIndexes.Add(rowIndex);
            }
        }

        private void replyBox_GotFocus(object sender, RoutedEventArgs e)
        {
            if (dataGrid.SelectedItem is DataRowView rowView && lastClicked == LoadTickets) replyBox.Text = rowView["Reply"].ToString();
        }

        private void resolvedCheck_Checked(object sender, RoutedEventArgs e)
        {
            if (dataGrid.SelectedItem is DataRowView rowView && lastClicked == LoadTickets) rowView["Isresolved"] = true;
        }

        private void resolvedCheck_Unchecked(object sender, RoutedEventArgs e)
        {
            if (dataGrid.SelectedItem is DataRowView rowView && lastClicked == LoadTickets) rowView["Isresolved"] = false;
        }

        private void dashBoardButton_Click(object sender, RoutedEventArgs e)
        {
            usersButton.Background = default;
            dashBoardButton.Background = (SolidColorBrush)(new BrushConverter().ConvertFrom("#22FFFFFF"));
            ticketsButton.Background = default;
            banButton.IsEnabled = false;
            unbanButton.IsEnabled = false;
            saveChanges.IsEnabled = false;
            MakeAdmin.IsEnabled = false;
            replyBox.IsEnabled = false;
            resolvedCheck.IsEnabled = false;
            string sql = "SELECT SUM(RankID = 1) AS TotalUsers, SUM(RankID = 2) AS TotalAdmins, SUM(RankID = 0) AS BannedUsers, (SELECT COUNT(*) FROM tickets WHERE IsResolved = 0) AS UnresolvedTickets, (SELECT COUNT(*) FROM tickets WHERE IsResolved = 1) AS ResolvedTickets FROM users;";
            try
            {
                using (var conn = Database.GetConnection())
                {
                    conn.Open();
                    using (var cmd = new MySqlCommand(sql, conn))
                    using (var reader = cmd.ExecuteReader())
                    {
                        var dt = new DataTable();
                        dt.Load(reader);
                        dataGrid.AutoGenerateColumns = true;
                        dataGridData = dt;
                        dataGrid.ItemsSource = dataGridData?.DefaultView ?? null;
                    }
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show("Error loading dashboard: " + ex.Message);
                dataGrid.ItemsSource = null;
            }
        }
    }
}
