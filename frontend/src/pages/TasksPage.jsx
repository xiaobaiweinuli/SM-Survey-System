import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  CheckCircle, 
  Clock, 
  Users, 
  Star,
  Filter,
  Search,
  ArrowLeft,
  Eye,
  Play,
  Upload,
  Award,
  TrendingUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { useAuth } from '../contexts/AuthContext';
import { tasksAPI } from '../lib/api';

const TasksPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [availableTasks, setAvailableTasks] = useState([]);
  const [userTasks, setUserTasks] = useState([]);
  const [taskStats, setTaskStats] = useState(null);
  
  const [activeTab, setActiveTab] = useState('available');
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      const [availableResponse, userTasksResponse, statsResponse] = await Promise.all([
        tasksAPI.getAvailable({ page: 1, limit: 20, category: categoryFilter !== 'all' ? categoryFilter : undefined }),
        tasksAPI.getUserTasks({ page: 1, limit: 20, status: statusFilter !== 'all' ? statusFilter : undefined }),
        tasksAPI.getStats()
      ]);

      setAvailableTasks(availableResponse.data.tasks || []);
      setUserTasks(userTasksResponse.data.tasks || []);
      setTaskStats(statsResponse.data);
      
    } catch (error) {
      console.error('Fetch tasks data error:', error);
      setError('获取任务数据失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  // 领取任务
  const claimTask = async (taskId) => {
    try {
      await tasksAPI.claim(taskId);
      
      // 刷新数据
      await fetchData();
      
      // 切换到我的任务标签
      setActiveTab('my-tasks');
      
    } catch (error) {
      setError(error.message || '任务领取失败');
    }
  };

  // 查看任务详情
  const viewTaskDetail = (taskId) => {
    navigate(`/tasks/${taskId}`);
  };

  // 过滤任务
  const filterTasks = (tasks) => {
    return tasks.filter(task => {
      const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           task.description.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCategory = categoryFilter === 'all' || task.category === categoryFilter;
      
      return matchesSearch && matchesCategory;
    });
  };

  // 过滤用户任务
  const filterUserTasks = (tasks) => {
    return tasks.filter(task => {
      const matchesSearch = task.task_title.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  };

  const categories = [
    { value: 'all', label: '全部分类' },
    { value: 'social_media', label: '社交媒体' },
    { value: 'content_creation', label: '内容创作' },
    { value: 'promotion', label: '推广宣传' },
    { value: 'review', label: '评价反馈' },
    { value: 'other', label: '其他' }
  ];

  const statusOptions = [
    { value: 'all', label: '全部状态' },
    { value: 'claimed', label: '已领取' },
    { value: 'submitted', label: '已提交' },
    { value: 'approved', label: '已通过' },
    { value: 'rejected', label: '已拒绝' }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="lg" text="加载任务中..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部导航 */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Button 
                variant="ghost" 
                onClick={() => navigate('/dashboard')}
                className="flex items-center gap-2 mr-4"
              >
                <ArrowLeft className="w-4 h-4" />
                返回用户中心
              </Button>
              <h1 className="text-xl font-bold text-gray-900">SM任务中心</h1>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 错误提示 */}
        {error && (
          <Alert className="mb-6 border-red-200 bg-red-50">
            <AlertDescription className="text-red-800">
              {error}
            </AlertDescription>
          </Alert>
        )}

        {/* 统计卡片 */}
        {taskStats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">已完成任务</p>
                    <p className="text-2xl font-bold text-gray-900">{taskStats.completed_tasks}</p>
                  </div>
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">进行中任务</p>
                    <p className="text-2xl font-bold text-gray-900">{taskStats.active_tasks}</p>
                  </div>
                  <Clock className="w-8 h-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">总收益</p>
                    <p className="text-2xl font-bold text-gray-900">¥{taskStats.total_earnings}</p>
                  </div>
                  <Award className="w-8 h-8 text-yellow-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">通过率</p>
                    <p className="text-2xl font-bold text-gray-900">{taskStats.approval_rate}%</p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* 搜索和过滤 */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="搜索任务..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(category => (
                    <SelectItem key={category.value} value={category.value}>
                      {category.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {activeTab === 'my-tasks' && (
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full md:w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map(status => (
                      <SelectItem key={status.value} value={status.value}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 任务列表 */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="available">可领取任务</TabsTrigger>
            <TabsTrigger value="my-tasks">我的任务</TabsTrigger>
          </TabsList>

          {/* 可领取任务 */}
          <TabsContent value="available" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filterTasks(availableTasks).map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onClaim={() => claimTask(task.id)}
                  onViewDetail={() => viewTaskDetail(task.id)}
                  type="available"
                />
              ))}
            </div>

            {filterTasks(availableTasks).length === 0 && (
              <div className="text-center py-12">
                <CheckCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">暂无可领取任务</h3>
                <p className="text-gray-500">请稍后再来查看新的任务</p>
              </div>
            )}
          </TabsContent>

          {/* 我的任务 */}
          <TabsContent value="my-tasks" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filterUserTasks(userTasks).map((userTask) => (
                <UserTaskCard
                  key={userTask.id}
                  userTask={userTask}
                  onViewDetail={() => navigate(`/tasks/submission/${userTask.id}`)}
                  type="user"
                />
              ))}
            </div>

            {filterUserTasks(userTasks).length === 0 && (
              <div className="text-center py-12">
                <Clock className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">暂无任务记录</h3>
                <p className="text-gray-500">去领取一些任务开始赚取收益吧</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

// 可领取任务卡片
const TaskCard = ({ task, onClaim, onViewDetail, type }) => {
  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'hard': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoryColor = (category) => {
    switch (category) {
      case 'social_media': return 'bg-blue-100 text-blue-800';
      case 'content_creation': return 'bg-purple-100 text-purple-800';
      case 'promotion': return 'bg-orange-100 text-orange-800';
      case 'review': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card className="hover:shadow-lg transition-shadow cursor-pointer">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start mb-2">
          <CardTitle className="text-lg line-clamp-2">{task.title}</CardTitle>
          <Badge className={getDifficultyColor(task.difficulty)}>
            {task.difficulty === 'easy' ? '简单' : 
             task.difficulty === 'medium' ? '中等' : '困难'}
          </Badge>
        </div>
        
        <div className="flex items-center gap-2 mb-2">
          <Badge variant="outline" className={getCategoryColor(task.category)}>
            {task.category_name || task.category}
          </Badge>
          <Badge variant="outline">
            ¥{task.reward}
          </Badge>
        </div>

        <CardDescription className="line-clamp-3">
          {task.description}
        </CardDescription>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              <span>{task.current_participants}/{task.max_participants || '∞'}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              <span>{task.estimated_time}分钟</span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Star className="w-4 h-4 text-yellow-500" />
            <span>{task.rating || '5.0'}</span>
          </div>
        </div>

        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onViewDetail}
            className="flex-1"
          >
            <Eye className="w-4 h-4 mr-1" />
            查看详情
          </Button>
          <Button 
            size="sm" 
            onClick={onClaim}
            className="flex-1"
            disabled={task.max_participants && task.current_participants >= task.max_participants}
          >
            <Play className="w-4 h-4 mr-1" />
            {task.max_participants && task.current_participants >= task.max_participants ? '已满员' : '立即领取'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

// 用户任务卡片
const UserTaskCard = ({ userTask, onViewDetail, type }) => {
  const getStatusColor = (status) => {
    switch (status) {
      case 'claimed': return 'bg-blue-100 text-blue-800';
      case 'submitted': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'claimed': return '已领取';
      case 'submitted': return '已提交';
      case 'approved': return '已通过';
      case 'rejected': return '已拒绝';
      default: return status;
    }
  };

  return (
    <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={onViewDetail}>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start mb-2">
          <CardTitle className="text-lg line-clamp-2">{userTask.task_title}</CardTitle>
          <Badge className={getStatusColor(userTask.status)}>
            {getStatusText(userTask.status)}
          </Badge>
        </div>
        
        <div className="flex items-center gap-2 mb-2">
          <Badge variant="outline">
            ¥{userTask.reward}
          </Badge>
          {userTask.status === 'approved' && (
            <Badge variant="outline" className="bg-green-100 text-green-800">
              已获得收益
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="space-y-2 text-sm text-gray-600 mb-4">
          <div className="flex justify-between">
            <span>领取时间:</span>
            <span>{new Date(userTask.claimed_at).toLocaleDateString()}</span>
          </div>
          {userTask.submitted_at && (
            <div className="flex justify-between">
              <span>提交时间:</span>
              <span>{new Date(userTask.submitted_at).toLocaleDateString()}</span>
            </div>
          )}
          {userTask.reviewed_at && (
            <div className="flex justify-between">
              <span>审核时间:</span>
              <span>{new Date(userTask.reviewed_at).toLocaleDateString()}</span>
            </div>
          )}
        </div>

        <Button variant="outline" size="sm" className="w-full">
          <Eye className="w-4 h-4 mr-1" />
          查看详情
        </Button>
      </CardContent>
    </Card>
  );
};

export default TasksPage;

