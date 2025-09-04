import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Settings, 
  Users, 
  FileText, 
  CheckCircle,
  BarChart3,
  Shield,
  LogOut,
  Search,
  Filter,
  Plus,
  Edit,
  Eye,
  Trash2,
  Download,
  Upload,
  TrendingUp,
  Clock,
  Award
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { useAuth } from '../contexts/AuthContext';
import { adminAPI } from '../lib/api';

const AdminPage = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [systemStats, setSystemStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [surveyConfigs, setSurveyConfigs] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  
  const [activeTab, setActiveTab] = useState('dashboard');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    // 检查管理员权限
    if (!user || user.role !== 'admin') {
      navigate('/login');
      return;
    }
    
    fetchData();
  }, [user, navigate]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      const [statsResponse] = await Promise.all([
        adminAPI.getSystemStats()
      ]);

      setSystemStats(statsResponse.data);
      
    } catch (error) {
      console.error('Fetch admin data error:', error);
      setError('获取管理数据失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  // 获取用户列表
  const fetchUsers = async () => {
    try {
      const response = await adminAPI.getUsers({ 
        page: 1, 
        limit: 50, 
        search: searchTerm,
        status: statusFilter !== 'all' ? statusFilter : undefined 
      });
      setUsers(response.data.users || []);
    } catch (error) {
      setError('获取用户列表失败');
    }
  };

  // 获取问卷配置
  const fetchSurveyConfigs = async () => {
    try {
      const response = await adminAPI.getSurveyConfigs({ page: 1, limit: 50 });
      setSurveyConfigs(response.data.configs || []);
    } catch (error) {
      setError('获取问卷配置失败');
    }
  };

  // 获取任务列表
  const fetchTasks = async () => {
    try {
      const response = await adminAPI.getTasks({ 
        page: 1, 
        limit: 50,
        status: statusFilter !== 'all' ? statusFilter : undefined 
      });
      setTasks(response.data.tasks || []);
    } catch (error) {
      setError('获取任务列表失败');
    }
  };

  // 获取提交记录
  const fetchSubmissions = async () => {
    try {
      const [surveySubmissions, taskSubmissions] = await Promise.all([
        adminAPI.getSurveySubmissions({ page: 1, limit: 25 }),
        adminAPI.getTaskSubmissions({ page: 1, limit: 25 })
      ]);
      
      const allSubmissions = [
        ...(surveySubmissions.data.submissions || []).map(s => ({ ...s, type: 'survey' })),
        ...(taskSubmissions.data.submissions || []).map(s => ({ ...s, type: 'task' }))
      ];
      
      setSubmissions(allSubmissions.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
    } catch (error) {
      setError('获取提交记录失败');
    }
  };

  // 标签页切换时加载数据
  useEffect(() => {
    switch (activeTab) {
      case 'users':
        fetchUsers();
        break;
      case 'surveys':
        fetchSurveyConfigs();
        break;
      case 'tasks':
        fetchTasks();
        break;
      case 'submissions':
        fetchSubmissions();
        break;
    }
  }, [activeTab, searchTerm, statusFilter]);

  const handleLogout = async () => {
    await logout();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="lg" text="加载管理后台中..." />
      </div>
    );
  }

  const statCards = [
    {
      title: '总用户数',
      value: systemStats?.total_users || 0,
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      title: '问卷提交',
      value: systemStats?.total_survey_submissions || 0,
      icon: FileText,
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      title: '任务完成',
      value: systemStats?.total_task_submissions || 0,
      icon: CheckCircle,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    },
    {
      title: '系统收益',
      value: `¥${systemStats?.total_revenue || 0}`,
      icon: Award,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50'
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
              <span className="text-xl font-bold text-gray-900">管理后台</span>
            </div>
            
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                欢迎，{user?.name} (管理员)
              </span>
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                <LogOut className="w-4 h-4" />
                退出
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 错误提示 */}
        {error && (
          <Alert className="mb-6 border-red-200 bg-red-50">
            <AlertDescription className="text-red-800">
              {error}
            </AlertDescription>
          </Alert>
        )}

        {/* 主要内容 */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="dashboard">仪表板</TabsTrigger>
            <TabsTrigger value="users">用户管理</TabsTrigger>
            <TabsTrigger value="surveys">问卷管理</TabsTrigger>
            <TabsTrigger value="tasks">任务管理</TabsTrigger>
            <TabsTrigger value="submissions">提交记录</TabsTrigger>
          </TabsList>

          {/* 仪表板 */}
          <TabsContent value="dashboard" className="mt-6">
            <div className="space-y-6">
              {/* 统计卡片 */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {statCards.map((stat, index) => (
                  <Card key={index}>
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

              {/* 快速操作 */}
              <Card>
                <CardHeader>
                  <CardTitle>快速操作</CardTitle>
                  <CardDescription>常用的管理操作</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Button className="h-20 flex flex-col items-center justify-center gap-2">
                      <Plus className="w-6 h-6" />
                      <span>创建问卷</span>
                    </Button>
                    <Button variant="outline" className="h-20 flex flex-col items-center justify-center gap-2">
                      <Plus className="w-6 h-6" />
                      <span>创建任务</span>
                    </Button>
                    <Button variant="outline" className="h-20 flex flex-col items-center justify-center gap-2">
                      <Download className="w-6 h-6" />
                      <span>导出数据</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* 最近活动 */}
              <Card>
                <CardHeader>
                  <CardTitle>最近活动</CardTitle>
                  <CardDescription>系统最新的用户活动</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {systemStats?.recent_activities?.map((activity, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                          <div>
                            <p className="font-medium">{activity.description}</p>
                            <p className="text-sm text-gray-500">{activity.user_name}</p>
                          </div>
                        </div>
                        <span className="text-sm text-gray-500">
                          {new Date(activity.created_at).toLocaleString()}
                        </span>
                      </div>
                    )) || (
                      <div className="text-center py-8 text-gray-500">
                        <Clock className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                        <p>暂无最近活动</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* 用户管理 */}
          <TabsContent value="users" className="mt-6">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>用户管理</CardTitle>
                    <CardDescription>管理系统中的所有用户</CardDescription>
                  </div>
                  <Button>
                    <Download className="w-4 h-4 mr-2" />
                    导出用户
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {/* 搜索和过滤 */}
                <div className="flex gap-4 mb-6">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        placeholder="搜索用户..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">全部状态</SelectItem>
                      <SelectItem value="active">正常</SelectItem>
                      <SelectItem value="suspended">已暂停</SelectItem>
                      <SelectItem value="banned">已封禁</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* 用户列表 */}
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>用户信息</TableHead>
                      <TableHead>注册时间</TableHead>
                      <TableHead>状态</TableHead>
                      <TableHead>统计</TableHead>
                      <TableHead>操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{user.name}</div>
                            <div className="text-sm text-gray-500">ID: {user.id}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {new Date(user.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Badge variant={user.status === 'active' ? 'default' : 'destructive'}>
                            {user.status === 'active' ? '正常' : 
                             user.status === 'suspended' ? '暂停' : '封禁'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div>问卷: {user.survey_count || 0}</div>
                            <div>任务: {user.task_count || 0}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button variant="ghost" size="sm">
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Edit className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {users.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>暂无用户数据</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 问卷管理 */}
          <TabsContent value="surveys" className="mt-6">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>问卷管理</CardTitle>
                    <CardDescription>管理问卷配置和提交记录</CardDescription>
                  </div>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    创建问卷
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>问卷标题</TableHead>
                      <TableHead>状态</TableHead>
                      <TableHead>提交数量</TableHead>
                      <TableHead>创建时间</TableHead>
                      <TableHead>操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {surveyConfigs.map((config) => (
                      <TableRow key={config.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{config.title}</div>
                            <div className="text-sm text-gray-500">{config.description}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={config.status === 'active' ? 'default' : 'secondary'}>
                            {config.status === 'active' ? '活跃' : 
                             config.status === 'draft' ? '草稿' : '已停用'}
                          </Badge>
                        </TableCell>
                        <TableCell>{config.submission_count || 0}</TableCell>
                        <TableCell>
                          {new Date(config.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button variant="ghost" size="sm">
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Download className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {surveyConfigs.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>暂无问卷配置</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 任务管理 */}
          <TabsContent value="tasks" className="mt-6">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>任务管理</CardTitle>
                    <CardDescription>管理SM任务和提交记录</CardDescription>
                  </div>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    创建任务
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>任务标题</TableHead>
                      <TableHead>分类</TableHead>
                      <TableHead>奖励</TableHead>
                      <TableHead>参与/上限</TableHead>
                      <TableHead>状态</TableHead>
                      <TableHead>操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tasks.map((task) => (
                      <TableRow key={task.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{task.title}</div>
                            <div className="text-sm text-gray-500">{task.description}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{task.category}</Badge>
                        </TableCell>
                        <TableCell>¥{task.reward}</TableCell>
                        <TableCell>
                          {task.current_participants}/{task.max_participants || '∞'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={task.status === 'active' ? 'default' : 'secondary'}>
                            {task.status === 'active' ? '活跃' : 
                             task.status === 'draft' ? '草稿' : '已停用'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button variant="ghost" size="sm">
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Download className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {tasks.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <CheckCircle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>暂无任务数据</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 提交记录 */}
          <TabsContent value="submissions" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>提交记录</CardTitle>
                <CardDescription>查看所有问卷和任务的提交记录</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>用户</TableHead>
                      <TableHead>类型</TableHead>
                      <TableHead>标题</TableHead>
                      <TableHead>提交时间</TableHead>
                      <TableHead>状态</TableHead>
                      <TableHead>操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {submissions.map((submission) => (
                      <TableRow key={`${submission.type}-${submission.id}`}>
                        <TableCell>{submission.user_name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {submission.type === 'survey' ? '问卷' : '任务'}
                          </Badge>
                        </TableCell>
                        <TableCell>{submission.title}</TableCell>
                        <TableCell>
                          {new Date(submission.submitted_at || submission.created_at).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Badge variant={
                            submission.status === 'approved' ? 'default' :
                            submission.status === 'submitted' ? 'secondary' : 'destructive'
                          }>
                            {submission.status === 'submitted' ? '已提交' :
                             submission.status === 'approved' ? '已通过' : '已拒绝'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button variant="ghost" size="sm">
                              <Eye className="w-4 h-4" />
                            </Button>
                            {submission.type === 'task' && submission.status === 'submitted' && (
                              <Button variant="ghost" size="sm">
                                <CheckCircle className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {submissions.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <BarChart3 className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>暂无提交记录</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminPage;

