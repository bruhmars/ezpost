import { useAuth } from "./AuthContext";
import AuthPage from "./AuthPage";
import Dashboard from "./Dashboard";

export default function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return <p className="empty">Loading…</p>;
  }

  if (!user) {
    return <AuthPage />;
  }

  return <Dashboard />;
}
