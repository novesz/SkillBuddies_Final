import { Navigate } from "react-router-dom";

export default function PrivateRoute({ isLoggedIn, authLoading, children }) {
  if (authLoading) return null; // Várj amíg az auth betöltődik
  if (!isLoggedIn) return <Navigate to="/login" replace />;
  return children;
}
