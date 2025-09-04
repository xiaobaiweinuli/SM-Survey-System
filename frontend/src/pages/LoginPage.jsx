import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Shield, Eye, EyeOff, User, CreditCard, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { useAuth } from '../contexts/AuthContext';
import { useConfig } from '../contexts/ConfigContext';

const LoginPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { config } = useConfig();
  
  const [activeTab, setActiveTab] = useState('user');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // 用户登录表单
  const [userForm, setUserForm] = useState({
    name: '',
    id_card_number: ''
  });

  // 管理员登录表单
  const [adminForm, setAdminForm] = useState({
    username: '',
    password: ''
  });

  // 处理用户登录
  const handleUserLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await login(userForm, false);
      
      if (result.success) {
        navigate('/dashboard');
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('登录失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  // 处理管理员登录
  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await login(adminForm, true);
      
      if (result.success) {
        navigate('/admin');
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('登录失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  // 验证身份证号格式
  const validateIdCard = (idCard) => {
    const pattern = /^[1-9]\d{5}(18|19|20)\d{2}((0[1-9])|(1[0-2]))(([0-2][1-9])|10|20|30|31)\d{3}[0-9Xx]$/;
    return pattern.test(idCard);
  };

  // 格式化身份证号输入
  const formatIdCardInput = (value) => {
    // 移除非数字和X字符
    const cleaned = value.replace(/[^\dXx]/g, '').toUpperCase();
    return cleaned.slice(0, 18);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      {/* 背景装饰 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-32 w-80 h-80 rounded-full bg-gradient-to-br from-blue-400/10 to-purple-400/10 blur-3xl"></div>
        <div className="absolute -bottom-40 -left-32 w-80 h-80 rounded-full bg-gradient-to-br from-green-400/10 to-blue-400/10 blur-3xl"></div>
      </div>

      <div className="w-full max-w-md relative">
        {/* 返回首页链接 */}
        <div className="text-center mb-6">
          <Link 
            to="/" 
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            ← 返回首页
          </Link>
        </div>

        <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="text-center pb-2">
            <div className="flex justify-center mb-4">
              <Shield className="w-12 h-12 text-blue-600" />
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900">
              登录 {config.site_title}
            </CardTitle>
            <CardDescription className="text-gray-600">
              选择您的登录方式
            </CardDescription>
          </CardHeader>

          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="user" className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  用户登录
                </TabsTrigger>
                <TabsTrigger value="admin" className="flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  管理员
                </TabsTrigger>
              </TabsList>

              {/* 错误提示 */}
              {error && (
                <Alert className="mt-4 border-red-200 bg-red-50">
                  <AlertDescription className="text-red-800">
                    {error}
                  </AlertDescription>
                </Alert>
              )}

              {/* 用户登录 */}
              <TabsContent value="user" className="mt-6">
                <form onSubmit={handleUserLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">姓名</Label>
                    <Input
                      id="name"
                      type="text"
                      placeholder="请输入您的真实姓名"
                      value={userForm.name}
                      onChange={(e) => setUserForm(prev => ({ ...prev, name: e.target.value }))}
                      required
                      disabled={loading}
                      className="h-11"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="id_card_number">身份证号</Label>
                    <div className="relative">
                      <CreditCard className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        id="id_card_number"
                        type="text"
                        placeholder="请输入18位身份证号"
                        value={userForm.id_card_number}
                        onChange={(e) => {
                          const formatted = formatIdCardInput(e.target.value);
                          setUserForm(prev => ({ ...prev, id_card_number: formatted }));
                        }}
                        required
                        disabled={loading}
                        className="h-11 pl-10"
                        maxLength={18}
                      />
                    </div>
                    {userForm.id_card_number && !validateIdCard(userForm.id_card_number) && (
                      <p className="text-sm text-red-600">身份证号格式不正确</p>
                    )}
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full h-11"
                    disabled={loading || !userForm.name || !validateIdCard(userForm.id_card_number)}
                  >
                    {loading ? (
                      <LoadingSpinner size="sm" color="white" />
                    ) : (
                      '登录'
                    )}
                  </Button>
                </form>

                <div className="mt-6 text-center">
                  <p className="text-sm text-gray-600">
                    还没有账号？
                    <Link 
                      to="/register" 
                      className="text-blue-600 hover:text-blue-800 font-medium ml-1"
                    >
                      立即注册
                    </Link>
                  </p>
                </div>
              </TabsContent>

              {/* 管理员登录 */}
              <TabsContent value="admin" className="mt-6">
                <form onSubmit={handleAdminLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="username">用户名</Label>
                    <Input
                      id="username"
                      type="text"
                      placeholder="请输入管理员用户名"
                      value={adminForm.username}
                      onChange={(e) => setAdminForm(prev => ({ ...prev, username: e.target.value }))}
                      required
                      disabled={loading}
                      className="h-11"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">密码</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="请输入密码"
                        value={adminForm.password}
                        onChange={(e) => setAdminForm(prev => ({ ...prev, password: e.target.value }))}
                        required
                        disabled={loading}
                        className="h-11 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        disabled={loading}
                      >
                        {showPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full h-11"
                    disabled={loading || !adminForm.username || !adminForm.password}
                  >
                    {loading ? (
                      <LoadingSpinner size="sm" color="white" />
                    ) : (
                      '管理员登录'
                    )}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* 安全提示 */}
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            您的个人信息将被安全加密存储，我们承诺保护您的隐私安全
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;

