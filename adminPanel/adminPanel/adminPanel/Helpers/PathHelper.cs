using System;
using System.IO;

namespace adminPanel.Helpers
{
    public static class PathHelper
    {
        public static string GetSolutionRoot()
        {
            var exePath = AppDomain.CurrentDomain.BaseDirectory;

            // bin\Debug\  -> adminPanel\adminPanel\
            return Directory.GetParent(exePath)
                            .Parent.Parent
                            .FullName;
        }

        public static string GetAvatarsFolder()
        {
            return Path.Combine(GetSolutionRoot(),
                                "frontend",
                                "public",
                                "avatars");
        }

        /// <summary>
        /// Gets full path to avatar file. fileName can be "BB.png", "avatars/BB.png", or "/avatars/BB.png".
        /// </summary>
        public static string GetAvatarFullPath(string fileName)
        {
            if (string.IsNullOrWhiteSpace(fileName)) return null;
            var nameOnly = Path.GetFileName(fileName.Trim());
            if (string.IsNullOrEmpty(nameOnly)) return null;

            var exePath = AppDomain.CurrentDomain.BaseDirectory;
            DirectoryInfo dir = Directory.GetParent(exePath);
            if (dir == null) return null;
            for (int i = 0; i < 5 && dir != null; i++)
                dir = dir.Parent;
            if (dir == null) return null;
            var skillBuddiesRoot = dir.FullName;

            return Path.Combine(skillBuddiesRoot,
                                "frontend",
                                "public",
                                "avatars",
                                nameOnly);
        }
    }
}