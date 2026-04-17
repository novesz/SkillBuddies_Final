import { Navigate } from "react-router-dom";

/**
 * Only allows access for logged-in users with admin rank (rankID >= 2).
 * Others are redirected to home.
 */
export default function AdminRoute({ isLoggedIn, userRank = 1, children }) {
  if (!isLoggedIn) return <Navigate to="/login" replace />;
  if (userRank < 2) return <Navigate to="/" replace />;
  return children;
}
