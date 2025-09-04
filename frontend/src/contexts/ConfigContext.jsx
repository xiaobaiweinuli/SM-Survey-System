import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiClient } from '../lib/api';

const ConfigContext = createContext();

export function useConfig() {
  const context = useContext(ConfigContext);
  if (!context) {
    throw new Error('useConfig must be used within a ConfigProvider');
  }
  return context;
}

export function ConfigProvider({ children }) {
  const [config, setConfig] = useState({
    site_title: 'SM任务问卷系统',
    site_description: '基于实名认证的问卷调研和SM任务平台',
    registration_enabled: true,
    survey_enabled: true,
    tasks_enabled: true,
    privacy_policy_url: '',
    terms_of_service_url: ''
  });
  const [loading, setLoading] = useState(true);

  // 获取公开配置
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const response = await apiClient.get('/config/public');
        setConfig(prevConfig => ({
          ...prevConfig,
          ...response.data
        }));
      } catch (error) {
        console.error('Fetch config error:', error);
        // 使用默认配置
      } finally {
        setLoading(false);
      }
    };

    fetchConfig();
  }, []);

  // 更新配置
  const updateConfig = (newConfig) => {
    setConfig(prevConfig => ({
      ...prevConfig,
      ...newConfig
    }));
  };

  // 获取配置值
  const getConfig = (key, defaultValue = null) => {
    return config[key] !== undefined ? config[key] : defaultValue;
  };

  // 检查功能是否启用
  const isFeatureEnabled = (feature) => {
    switch (feature) {
      case 'registration':
        return getConfig('registration_enabled', true);
      case 'survey':
        return getConfig('survey_enabled', true);
      case 'tasks':
        return getConfig('tasks_enabled', true);
      default:
        return false;
    }
  };

  const value = {
    config,
    loading,
    updateConfig,
    getConfig,
    isFeatureEnabled
  };

  return (
    <ConfigContext.Provider value={value}>
      {children}
    </ConfigContext.Provider>
  );
}

