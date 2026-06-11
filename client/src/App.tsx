import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuctionProvider, AuthProvider, useAuthContext } from './context/AuctionContext';
import { LoginPage } from './pages/LoginPage';
import { AdminDashboard } from './pages/AdminDashboard';
import { LiveAuctionPage } from './pages/LiveAuctionPage';
import { ResultsPage } from './pages/ResultsPage';
import './index.css';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { role } = useAuthContext();

  if (!role) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  const { role } = useAuthContext();

  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            {role === 'admin' ? <AdminDashboard /> : <Navigate to="/" />}
          </ProtectedRoute>
        }
      />
      <Route
        path="/auction"
        element={
          <ProtectedRoute>
            <LiveAuctionPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/results"
        element={
          <ProtectedRoute>
            <ResultsPage />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export function App() {
  return (
    <AuctionProvider>
      <AuthProvider>
        <Router>
          <AppRoutes />
        </Router>
      </AuthProvider>
    </AuctionProvider>
  );
}

export default App;
