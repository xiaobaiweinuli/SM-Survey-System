import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';

// 页面组件
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import SurveyPage from './pages/SurveyPage';
import TasksPage from './pages/TasksPage';
import AdminPage from './pages/AdminPage';

// 上下文
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ConfigProvider } from './contexts/ConfigContext';

// 组件
import LoadingSpinner from './components/ui/LoadingSpinner';
import ErrorBoundary from './components/ErrorBoundary';

// 受保护的路由组件
function ProtectedRoute({ children, requireAdmin = false }) {
  const { user, admin, loading } = useAuth();
  
  if (loading) {
    return <LoadingSpinner />;
  }
  
  if (requireAdmin) {
    return admin ? children : <Navigate to="/login" replace />;
  }
  
  return user ? children : <Navigate to="/login" replace />;
}

// 公开路由组件（已登录用户重定向）
function PublicRoute({ children }) {
  const { user, admin, loading } = useAuth();
  
  if (loading) {
    return <LoadingSpinner />;
  }
  
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }
  
  if (admin) {
    return <Navigate to="/admin" replace />;
  }
  
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      {/* 公开路由 */}
      <Route 
        path="/" 
        element={
          <PublicRoute>
            <HomePage />
          </PublicRoute>
        } 
      />
      <Route 
        path="/login" 
        element={
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        } 
      />
      <Route 
        path="/register" 
        element={
          <PublicRoute>
            <RegisterPage />
          </PublicRoute>
        } 
      />
      
      {/* 用户受保护路由 */}
      <Route 
        path="/dashboard" 
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/survey" 
        element={
          <ProtectedRoute>
            <SurveyPage />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/tasks" 
        element={
          <ProtectedRoute>
            <TasksPage />
          </ProtectedRoute>
        } 
      />
      
      {/* 管理员受保护路由 */}
      <Route 
        path="/admin/*" 
        element={
          <ProtectedRoute requireAdmin={true}>
            <AdminPage />
          </ProtectedRoute>
        } 
      />
      
      {/* 404页面 */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 应用初始化
    const initializeApp = async () => {
      try {
        // 这里可以添加应用初始化逻辑
        await new Promise(resolve => setTimeout(resolve, 1000)); // 模拟加载
      } catch (error) {
        console.error('App initialization error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeApp();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600">系统加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <ConfigProvider>
        <AuthProvider>
          <Router>
            <div className="min-h-screen bg-background">
              <AppRoutes />
            </div>
          </Router>
        </AuthProvider>
      </ConfigProvider>
    </ErrorBoundary>
  );
}

export default App;
