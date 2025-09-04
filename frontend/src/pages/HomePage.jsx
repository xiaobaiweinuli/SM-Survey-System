import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Shield, 
  FileText, 
  Users, 
  CheckCircle, 
  ArrowRight,
  Star,
  Clock,
  Award
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useConfig } from '../contexts/ConfigContext';

const HomePage = () => {
  const { config, isFeatureEnabled } = useConfig();

  const features = [
    {
      icon: Shield,
      title: '实名认证',
      description: '基于身份证OCR识别和人脸比对的安全实名认证系统',
      color: 'text-blue-600'
    },
    {
      icon: FileText,
      title: '问卷调研',
      description: '灵活的问卷配置系统，支持多种题型和文件上传',
      color: 'text-green-600'
    },
    {
      icon: Users,
      title: 'SM任务',
      description: '任务发布、领取、提交的完整流程管理',
      color: 'text-purple-600'
    },
    {
      icon: CheckCircle,
      title: '数据安全',
      description: '企业级数据加密存储，确保用户隐私安全',
      color: 'text-orange-600'
    }
  ];

  const stats = [
    {
      icon: Users,
      label: '注册用户',
      value: '10,000+',
      description: '已完成实名认证'
    },
    {
      icon: FileText,
      label: '问卷调研',
      value: '5,000+',
      description: '份问卷已完成'
    },
    {
      icon: Clock,
      label: '任务完成',
      value: '15,000+',
      description: '个任务已提交'
    },
    {
      icon: Award,
      label: '满意度',
      value: '98%',
      description: '用户满意度'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* 导航栏 */}
      <nav className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Shield className="w-8 h-8 text-blue-600 mr-2" />
              <span className="text-xl font-bold text-gray-900">
                {config.site_title}
              </span>
            </div>
            
            <div className="flex items-center space-x-4">
              <Link to="/login">
                <Button variant="ghost">登录</Button>
              </Link>
              {isFeatureEnabled('registration') && (
                <Link to="/register">
                  <Button>注册</Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* 英雄区域 */}
      <section className="relative py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
              安全可信的
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
                实名认证平台
              </span>
            </h1>
            
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              {config.site_description}
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {isFeatureEnabled('registration') && (
                <Link to="/register">
                  <Button size="lg" className="flex items-center gap-2">
                    立即注册
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              )}
              
              <Link to="/login">
                <Button size="lg" variant="outline">
                  用户登录
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* 背景装饰 */}
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute -top-40 -right-32 w-80 h-80 rounded-full bg-gradient-to-br from-blue-400/20 to-purple-400/20 blur-3xl"></div>
          <div className="absolute -bottom-40 -left-32 w-80 h-80 rounded-full bg-gradient-to-br from-green-400/20 to-blue-400/20 blur-3xl"></div>
        </div>
      </section>

      {/* 功能特性 */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              核心功能
            </h2>
            <p className="text-lg text-gray-600">
              为您提供完整的实名认证和任务管理解决方案
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="text-center hover:shadow-lg transition-shadow duration-300">
                <CardHeader>
                  <div className="flex justify-center mb-4">
                    <feature.icon className={`w-12 h-12 ${feature.color}`} />
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-gray-600">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* 数据统计 */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-white mb-4">
              平台数据
            </h2>
            <p className="text-lg text-blue-100">
              用数据说话，见证平台的成长与信任
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center text-white">
                <div className="flex justify-center mb-4">
                  <stat.icon className="w-12 h-12 text-blue-200" />
                </div>
                <div className="text-3xl font-bold mb-2">{stat.value}</div>
                <div className="text-lg font-semibold mb-1">{stat.label}</div>
                <div className="text-sm text-blue-200">{stat.description}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 使用流程 */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              使用流程
            </h2>
            <p className="text-lg text-gray-600">
              简单三步，开始您的认证之旅
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                1
              </div>
              <h3 className="text-xl font-semibold mb-2">实名注册</h3>
              <p className="text-gray-600">
                上传身份证照片和人脸照片，完成实名认证
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-green-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                2
              </div>
              <h3 className="text-xl font-semibold mb-2">参与活动</h3>
              <p className="text-gray-600">
                填写问卷调研或领取SM任务，获得相应奖励
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-purple-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                3
              </div>
              <h3 className="text-xl font-semibold mb-2">获得收益</h3>
              <p className="text-gray-600">
                完成任务后获得奖励，查看个人统计数据
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 页脚 */}
      <footer className="bg-gray-900 text-white py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center mb-4">
                <Shield className="w-8 h-8 text-blue-400 mr-2" />
                <span className="text-xl font-bold">{config.site_title}</span>
              </div>
              <p className="text-gray-400 mb-4">
                {config.site_description}
              </p>
              <div className="flex space-x-4">
                <Star className="w-5 h-5 text-yellow-400" />
                <Star className="w-5 h-5 text-yellow-400" />
                <Star className="w-5 h-5 text-yellow-400" />
                <Star className="w-5 h-5 text-yellow-400" />
                <Star className="w-5 h-5 text-yellow-400" />
                <span className="text-sm text-gray-400 ml-2">5.0 用户评分</span>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4">快速链接</h3>
              <ul className="space-y-2">
                <li>
                  <Link to="/login" className="text-gray-400 hover:text-white transition-colors">
                    用户登录
                  </Link>
                </li>
                {isFeatureEnabled('registration') && (
                  <li>
                    <Link to="/register" className="text-gray-400 hover:text-white transition-colors">
                      用户注册
                    </Link>
                  </li>
                )}
                <li>
                  <a href="#" className="text-gray-400 hover:text-white transition-colors">
                    帮助中心
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4">法律信息</h3>
              <ul className="space-y-2">
                {config.privacy_policy_url && (
                  <li>
                    <a 
                      href={config.privacy_policy_url} 
                      className="text-gray-400 hover:text-white transition-colors"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      隐私政策
                    </a>
                  </li>
                )}
                {config.terms_of_service_url && (
                  <li>
                    <a 
                      href={config.terms_of_service_url} 
                      className="text-gray-400 hover:text-white transition-colors"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      服务条款
                    </a>
                  </li>
                )}
                <li>
                  <a href="#" className="text-gray-400 hover:text-white transition-colors">
                    联系我们
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 mt-8 pt-8 text-center">
            <p className="text-gray-400">
              © 2024 {config.site_title}. 保留所有权利。
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;

