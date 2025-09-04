import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  User, 
  FileText, 
  CheckCircle, 
  Clock, 
  Award,
  TrendingUp,
  Calendar,
  Settings,
  LogOut,
  Bell,
  Shield
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { useAuth } from '../contexts/AuthContext';
import { userAPI, surveyAPI, tasksAPI } from '../lib/api';

const DashboardPage = () => {
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [recentSubmissions, setRecentSubmissions] = useState([]);
  const [recentTasks, setRecentTasks] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      const [statsResponse, submissionsResponse, tasksResponse] = await Promise.all([
        userAPI.getStats(),
        surveyAPI.getSubmissions({ page: 1, limit: 5 }),
        tasksAPI.getSubmissions({ page: 1, limit: 5 })
      ]);

      setStats(statsResponse.data);
      setRecentSubmissions(submissionsResponse.data.submissions || []);
      setRecentTasks(tasksResponse.data.submissions || []);
    } catch (error) {
      console.error('Fetch dashboard data error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="lg" text="加载中..." />
      </div>
    );
  }

  const statCards = [
    {
      title: '问卷完成',
      value: stats?.surveys_completed || 0,
      icon: FileText,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      title: '任务完成',
      value: stats?.tasks_completed || 0,
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      title: '总时长',
      value: `${Math.round((stats?.total_task_duration || 0) / 60)}小时`,
      icon: Clock,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50'
    },
    {
      title: '文件上传',
      value: stats?.files_uploaded || 0,
      icon: Award,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部导航 */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Shield className="w-8 h-8 text-blue-600 mr-2" />
              <span className="text-xl font-bold text-gray-900">用户中心</span>
            </div>
            
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm">
                <Bell className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm">
                <Settings className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                <LogOut className="w-4 h-4" />
                退出
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 欢迎区域 */}
        <div className="mb-8">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold mb-2">
                  欢迎回来，{user?.name}！
                </h1>
                <p className="text-blue-100">
                  您已注册 {stats?.registration_date ? 
                    Math.floor((new Date() - new Date(stats.registration_date)) / (1000 * 60 * 60 * 24)) 
                    : 0} 天
                </p>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="w-5 h-5" />
                  <span className="text-sm">实名认证</span>
                </div>
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  已认证
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statCards.map((stat, index) => (
            <Card key={index} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                    <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                  </div>
                  <div className={`p-3 rounded-full ${stat.bgColor}`}>
                    <stat.icon className={`w-6 h-6 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* 主要内容区域 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 左侧内容 */}
          <div className="lg:col-span-2 space-y-6">
            {/* 快速操作 */}
            <Card>
              <CardHeader>
                <CardTitle>快速操作</CardTitle>
                <CardDescription>
                  选择您想要进行的操作
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Link to="/survey">
                    <Button className="w-full h-20 flex flex-col items-center justify-center gap-2">
                      <FileText className="w-6 h-6" />
                      <span>填写问卷</span>
                    </Button>
                  </Link>
                  <Link to="/tasks">
                    <Button variant="outline" className="w-full h-20 flex flex-col items-center justify-center gap-2">
                      <CheckCircle className="w-6 h-6" />
                      <span>查看任务</span>
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

            {/* 活动记录 */}
            <Card>
              <CardHeader>
                <CardTitle>最近活动</CardTitle>
                <CardDescription>
                  您最近的问卷和任务记录
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="surveys" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="surveys">问卷记录</TabsTrigger>
                    <TabsTrigger value="tasks">任务记录</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="surveys" className="mt-4">
                    {recentSubmissions.length > 0 ? (
                      <div className="space-y-3">
                        {recentSubmissions.map((submission, index) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-3">
                              <FileText className="w-4 h-4 text-blue-600" />
                              <div>
                                <p className="font-medium">{submission.survey_title}</p>
                                <p className="text-sm text-gray-500">
                                  {new Date(submission.submitted_at).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            <Badge variant="secondary">已完成</Badge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                        <p>暂无问卷记录</p>
                      </div>
                    )}
                  </TabsContent>
                  
                  <TabsContent value="tasks" className="mt-4">
                    {recentTasks.length > 0 ? (
                      <div className="space-y-3">
                        {recentTasks.map((task, index) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-3">
                              <CheckCircle className="w-4 h-4 text-green-600" />
                              <div>
                                <p className="font-medium">{task.task_title}</p>
                                <p className="text-sm text-gray-500">
                                  {new Date(task.submitted_at).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            <Badge variant="secondary">已提交</Badge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <CheckCircle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                        <p>暂无任务记录</p>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>

          {/* 右侧边栏 */}
          <div className="space-y-6">
            {/* 用户信息 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  个人信息
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-sm text-gray-600">姓名</Label>
                  <p className="font-medium">{user?.name}</p>
                </div>
                <div>
                  <Label className="text-sm text-gray-600">年龄</Label>
                  <p className="font-medium">{user?.age}岁</p>
                </div>
                <div>
                  <Label className="text-sm text-gray-600">认证状态</Label>
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-green-600" />
                    <span className="text-green-600 font-medium">已认证</span>
                  </div>
                </div>
                <div>
                  <Label className="text-sm text-gray-600">注册时间</Label>
                  <p className="font-medium">
                    {user?.created_at ? new Date(user.created_at).toLocaleDateString() : '-'}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* 本月统计 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  本月统计
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-600">问卷完成度</span>
                    <span className="text-sm font-medium">80%</span>
                  </div>
                  <Progress value={80} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-600">任务完成度</span>
                    <span className="text-sm font-medium">65%</span>
                  </div>
                  <Progress value={65} className="h-2" />
                </div>
                <div className="pt-2 border-t">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">活跃天数</span>
                    <span className="font-medium">15天</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 系统公告 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="w-5 h-5" />
                  系统公告
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm font-medium text-blue-900">
                      新问卷上线通知
                    </p>
                    <p className="text-xs text-blue-700 mt-1">
                      新的用户体验问卷已上线，欢迎参与
                    </p>
                  </div>
                  <div className="p-3 bg-green-50 rounded-lg">
                    <p className="text-sm font-medium text-green-900">
                      系统维护通知
                    </p>
                    <p className="text-xs text-green-700 mt-1">
                      系统将于本周末进行例行维护
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;

