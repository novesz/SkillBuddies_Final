using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace adminPanel.Models
{
    
    public class User
    {
        public static List<User> users = new List<User>();
        public int Id { get; set; }
        public string Username { get; set; }
        public string Email { get; set; }
        public string Role { get; set; }
        public bool IsBanned { get; set; }
    }
}

