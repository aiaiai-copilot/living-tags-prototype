import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

/**
 * Props for ProtectedRoute component
 */
interface ProtectedRouteProps {
  children: ReactNode;
}

/**
 * Route guard component that protects routes requiring authentication
 *
 * - Shows loading state while checking authentication
 * - Redirects to landing page if user is not authenticated
 * - Renders children if user is authenticated
 *
 * @param children - The protected content to render when authenticated
 */
export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, loading } = useAuth();

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect to landing page if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  // Render protected content
  return <>{children}</>;
}
