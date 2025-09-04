import React, { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Shield, 
  Camera, 
  Upload, 
  CheckCircle, 
  AlertCircle,
  User,
  CreditCard,
  ArrowLeft,
  ArrowRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { useAuth } from '../contexts/AuthContext';
import { useConfig } from '../contexts/ConfigContext';

const RegisterPage = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  const { config } = useConfig();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // 表单数据
  const [formData, setFormData] = useState({
    name: '',
    id_card_number: '',
    id_card_photo: null,
    face_photo: null
  });

  // 文件引用
  const idCardInputRef = useRef(null);
  const facePhotoInputRef = useRef(null);

  // 步骤配置
  const steps = [
    { id: 1, title: '基本信息', description: '填写姓名和身份证号' },
    { id: 2, title: '身份证照片', description: '上传身份证正面照片' },
    { id: 3, title: '人脸照片', description: '上传清晰的人脸照片' },
    { id: 4, title: '完成注册', description: '确认信息并提交' }
  ];

  // 验证身份证号格式
  const validateIdCard = (idCard) => {
    const pattern = /^[1-9]\d{5}(18|19|20)\d{2}((0[1-9])|(1[0-2]))(([0-2][1-9])|10|20|30|31)\d{3}[0-9Xx]$/;
    return pattern.test(idCard);
  };

  // 格式化身份证号输入
  const formatIdCardInput = (value) => {
    const cleaned = value.replace(/[^\dXx]/g, '').toUpperCase();
    return cleaned.slice(0, 18);
  };

  // 处理文件上传
  const handleFileUpload = (file, type) => {
    if (!file) return;

    // 验证文件类型
    if (!file.type.startsWith('image/')) {
      setError('请上传图片文件');
      return;
    }

    // 验证文件大小 (10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('图片文件大小不能超过10MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      setFormData(prev => ({
        ...prev,
        [type]: e.target.result
      }));
      setError('');
    };
    reader.readAsDataURL(file);
  };

  // 下一步
  const nextStep = () => {
    setError('');
    
    if (currentStep === 1) {
      if (!formData.name.trim()) {
        setError('请输入姓名');
        return;
      }
      if (!validateIdCard(formData.id_card_number)) {
        setError('请输入正确的身份证号');
        return;
      }
    } else if (currentStep === 2) {
      if (!formData.id_card_photo) {
        setError('请上传身份证照片');
        return;
      }
    } else if (currentStep === 3) {
      if (!formData.face_photo) {
        setError('请上传人脸照片');
        return;
      }
    }

    setCurrentStep(prev => Math.min(prev + 1, steps.length));
  };

  // 上一步
  const prevStep = () => {
    setError('');
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  // 提交注册
  const handleSubmit = async () => {
    setError('');
    setLoading(true);

    try {
      const result = await register(formData);
      
      if (result.success) {
        setSuccess('注册成功！正在跳转到用户中心...');
        setTimeout(() => {
          navigate('/dashboard');
        }, 2000);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('注册失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  // 计算进度
  const progress = (currentStep / steps.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      {/* 背景装饰 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-32 w-80 h-80 rounded-full bg-gradient-to-br from-blue-400/10 to-purple-400/10 blur-3xl"></div>
        <div className="absolute -bottom-40 -left-32 w-80 h-80 rounded-full bg-gradient-to-br from-green-400/10 to-blue-400/10 blur-3xl"></div>
      </div>

      <div className="w-full max-w-2xl relative">
        {/* 返回链接 */}
        <div className="text-center mb-6">
          <Link 
            to="/" 
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            ← 返回首页
          </Link>
        </div>

        <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="text-center pb-4">
            <div className="flex justify-center mb-4">
              <Shield className="w-12 h-12 text-blue-600" />
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900">
              实名认证注册
            </CardTitle>
            <CardDescription className="text-gray-600">
              {steps[currentStep - 1].description}
            </CardDescription>
          </CardHeader>

          <CardContent>
            {/* 进度条 */}
            <div className="mb-8">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">
                  步骤 {currentStep} / {steps.length}
                </span>
                <span className="text-sm text-gray-500">
                  {Math.round(progress)}% 完成
                </span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>

            {/* 步骤指示器 */}
            <div className="flex justify-between mb-8">
              {steps.map((step, index) => (
                <div 
                  key={step.id}
                  className={`flex flex-col items-center ${
                    index < currentStep - 1 ? 'text-green-600' :
                    index === currentStep - 1 ? 'text-blue-600' : 'text-gray-400'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium mb-2 ${
                    index < currentStep - 1 ? 'bg-green-100 text-green-600' :
                    index === currentStep - 1 ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'
                  }`}>
                    {index < currentStep - 1 ? (
                      <CheckCircle className="w-4 h-4" />
                    ) : (
                      step.id
                    )}
                  </div>
                  <span className="text-xs text-center hidden sm:block">{step.title}</span>
                </div>
              ))}
            </div>

            {/* 错误和成功提示 */}
            {error && (
              <Alert className="mb-6 border-red-200 bg-red-50">
                <AlertCircle className="w-4 h-4" />
                <AlertDescription className="text-red-800">
                  {error}
                </AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert className="mb-6 border-green-200 bg-green-50">
                <CheckCircle className="w-4 h-4" />
                <AlertDescription className="text-green-800">
                  {success}
                </AlertDescription>
              </Alert>
            )}

            {/* 步骤内容 */}
            <div className="min-h-[300px]">
              {/* 步骤1: 基本信息 */}
              {currentStep === 1 && (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      真实姓名
                    </Label>
                    <Input
                      id="name"
                      type="text"
                      placeholder="请输入您的真实姓名"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      className="h-12"
                    />
                    <p className="text-sm text-gray-500">
                      请确保姓名与身份证上的姓名完全一致
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="id_card_number" className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4" />
                      身份证号
                    </Label>
                    <Input
                      id="id_card_number"
                      type="text"
                      placeholder="请输入18位身份证号"
                      value={formData.id_card_number}
                      onChange={(e) => {
                        const formatted = formatIdCardInput(e.target.value);
                        setFormData(prev => ({ ...prev, id_card_number: formatted }));
                      }}
                      className="h-12"
                      maxLength={18}
                    />
                    {formData.id_card_number && !validateIdCard(formData.id_card_number) && (
                      <p className="text-sm text-red-600">身份证号格式不正确</p>
                    )}
                  </div>
                </div>
              )}

              {/* 步骤2: 身份证照片 */}
              {currentStep === 2 && (
                <div className="space-y-6">
                  <div className="text-center">
                    <h3 className="text-lg font-semibold mb-2">上传身份证正面照片</h3>
                    <p className="text-gray-600 mb-6">
                      请确保照片清晰，四角完整，信息可见
                    </p>
                  </div>

                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
                    {formData.id_card_photo ? (
                      <div className="space-y-4">
                        <img 
                          src={formData.id_card_photo} 
                          alt="身份证照片" 
                          className="max-w-full max-h-64 mx-auto rounded-lg shadow-md"
                        />
                        <Button 
                          variant="outline" 
                          onClick={() => idCardInputRef.current?.click()}
                        >
                          重新上传
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <Upload className="w-12 h-12 text-gray-400 mx-auto" />
                        <div>
                          <Button 
                            variant="outline" 
                            onClick={() => idCardInputRef.current?.click()}
                          >
                            选择照片
                          </Button>
                          <p className="text-sm text-gray-500 mt-2">
                            支持 JPG、PNG 格式，文件大小不超过 10MB
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  <input
                    ref={idCardInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileUpload(e.target.files[0], 'id_card_photo')}
                    className="hidden"
                  />
                </div>
              )}

              {/* 步骤3: 人脸照片 */}
              {currentStep === 3 && (
                <div className="space-y-6">
                  <div className="text-center">
                    <h3 className="text-lg font-semibold mb-2">上传人脸照片</h3>
                    <p className="text-gray-600 mb-6">
                      请上传清晰的正面照片，用于与身份证照片进行比对
                    </p>
                  </div>

                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
                    {formData.face_photo ? (
                      <div className="space-y-4">
                        <img 
                          src={formData.face_photo} 
                          alt="人脸照片" 
                          className="max-w-full max-h-64 mx-auto rounded-lg shadow-md"
                        />
                        <Button 
                          variant="outline" 
                          onClick={() => facePhotoInputRef.current?.click()}
                        >
                          重新上传
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <Camera className="w-12 h-12 text-gray-400 mx-auto" />
                        <div>
                          <Button 
                            variant="outline" 
                            onClick={() => facePhotoInputRef.current?.click()}
                          >
                            选择照片
                          </Button>
                          <p className="text-sm text-gray-500 mt-2">
                            支持 JPG、PNG 格式，文件大小不超过 10MB
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  <input
                    ref={facePhotoInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileUpload(e.target.files[0], 'face_photo')}
                    className="hidden"
                  />
                </div>
              )}

              {/* 步骤4: 确认信息 */}
              {currentStep === 4 && (
                <div className="space-y-6">
                  <div className="text-center">
                    <h3 className="text-lg font-semibold mb-2">确认注册信息</h3>
                    <p className="text-gray-600 mb-6">
                      请仔细核对以下信息，确认无误后提交注册
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label className="text-sm text-gray-600">姓名</Label>
                          <p className="font-medium">{formData.name}</p>
                        </div>
                        <div>
                          <Label className="text-sm text-gray-600">身份证号</Label>
                          <p className="font-medium">
                            {formData.id_card_number.replace(/(\d{6})\d{8}(\d{4})/, '$1********$2')}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm text-gray-600 mb-2 block">身份证照片</Label>
                        <img 
                          src={formData.id_card_photo} 
                          alt="身份证照片" 
                          className="w-full h-32 object-cover rounded-lg border"
                        />
                      </div>
                      <div>
                        <Label className="text-sm text-gray-600 mb-2 block">人脸照片</Label>
                        <img 
                          src={formData.face_photo} 
                          alt="人脸照片" 
                          className="w-full h-32 object-cover rounded-lg border"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 操作按钮 */}
            <div className="flex justify-between mt-8">
              <Button 
                variant="outline" 
                onClick={prevStep}
                disabled={currentStep === 1 || loading}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                上一步
              </Button>

              {currentStep < steps.length ? (
                <Button 
                  onClick={nextStep}
                  disabled={loading}
                  className="flex items-center gap-2"
                >
                  下一步
                  <ArrowRight className="w-4 h-4" />
                </Button>
              ) : (
                <Button 
                  onClick={handleSubmit}
                  disabled={loading}
                  className="flex items-center gap-2"
                >
                  {loading ? (
                    <LoadingSpinner size="sm" color="white" />
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      提交注册
                    </>
                  )}
                </Button>
              )}
            </div>

            {/* 登录链接 */}
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                已有账号？
                <Link 
                  to="/login" 
                  className="text-blue-600 hover:text-blue-800 font-medium ml-1"
                >
                  立即登录
                </Link>
              </p>
            </div>
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

export default RegisterPage;

