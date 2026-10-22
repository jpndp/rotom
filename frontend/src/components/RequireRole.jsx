import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContextValue';

function RequireRole({ roles, children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (!roles.includes(user.role)) return <Navigate to="/" replace />;  return children;
}

export default RequireRole;
