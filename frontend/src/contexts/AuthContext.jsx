import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiClient } from '../lib/api';

const AuthContext = createContext();

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('auth_token'));

  // 初始化认证状态
  useEffect(() => {
    const initializeAuth = async () => {
      const savedToken = localStorage.getItem('auth_token');
      const savedUserType = localStorage.getItem('user_type');
      
      if (savedToken) {
        try {
          // 设置API客户端的token
          apiClient.setToken(savedToken);
          
          // 获取用户信息
          const response = await apiClient.get('/user/profile');
          
          if (savedUserType === 'admin') {
            setAdmin(response.data);
          } else {
            setUser(response.data);
          }
          
          setToken(savedToken);
        } catch (error) {
          console.error('Initialize auth error:', error);
          // Token无效，清除本地存储
          logout();
        }
      }
      
      setLoading(false);
    };

    initializeAuth();
  }, []);

  // 用户登录
  const login = async (credentials, isAdmin = false) => {
    try {
      setLoading(true);
      
      const endpoint = isAdmin ? '/auth/admin/login' : '/auth/login';
      const response = await apiClient.post(endpoint, credentials);
      
      const { user: userData, token: authToken } = response.data;
      
      // 保存到本地存储
      localStorage.setItem('auth_token', authToken);
      localStorage.setItem('user_type', isAdmin ? 'admin' : 'user');
      
      // 设置API客户端的token
      apiClient.setToken(authToken);
      
      // 更新状态
      setToken(authToken);
      if (isAdmin) {
        setAdmin(userData);
        setUser(null);
      } else {
        setUser(userData);
        setAdmin(null);
      }
      
      return { success: true, data: userData };
    } catch (error) {
      console.error('Login error:', error);
      return { 
        success: false, 
        error: error.response?.data?.error?.message || '登录失败' 
      };
    } finally {
      setLoading(false);
    }
  };

  // 用户注册
  const register = async (registrationData) => {
    try {
      setLoading(true);
      
      const response = await apiClient.post('/auth/register', registrationData);
      const { user: userData, token: authToken } = response.data;
      
      // 保存到本地存储
      localStorage.setItem('auth_token', authToken);
      localStorage.setItem('user_type', 'user');
      
      // 设置API客户端的token
      apiClient.setToken(authToken);
      
      // 更新状态
      setToken(authToken);
      setUser(userData);
      setAdmin(null);
      
      return { success: true, data: userData };
    } catch (error) {
      console.error('Register error:', error);
      return { 
        success: false, 
        error: error.response?.data?.error?.message || '注册失败' 
      };
    } finally {
      setLoading(false);
    }
  };

  // 登出
  const logout = async () => {
    try {
      if (token) {
        await apiClient.post('/auth/logout');
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // 清除本地存储
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user_type');
      
      // 清除API客户端的token
      apiClient.setToken(null);
      
      // 重置状态
      setUser(null);
      setAdmin(null);
      setToken(null);
    }
  };

  // 刷新Token
  const refreshToken = async () => {
    try {
      const response = await apiClient.post('/auth/refresh');
      const { token: newToken } = response.data;
      
      localStorage.setItem('auth_token', newToken);
      apiClient.setToken(newToken);
      setToken(newToken);
      
      return true;
    } catch (error) {
      console.error('Refresh token error:', error);
      logout();
      return false;
    }
  };

  // 更新用户信息
  const updateUser = (userData) => {
    if (admin) {
      setAdmin({ ...admin, ...userData });
    } else {
      setUser({ ...user, ...userData });
    }
  };

  // 检查是否已认证
  const isAuthenticated = () => {
    return !!(user || admin) && !!token;
  };

  // 检查是否为管理员
  const isAdmin = () => {
    return !!admin;
  };

  // 获取当前用户
  const getCurrentUser = () => {
    return admin || user;
  };

  const value = {
    user,
    admin,
    token,
    loading,
    login,
    register,
    logout,
    refreshToken,
    updateUser,
    isAuthenticated,
    isAdmin,
    getCurrentUser
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

