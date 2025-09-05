import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FileText, 
  Upload, 
  CheckCircle, 
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Save,
  Send,
  X,
  Plus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { useAuth } from '../contexts/AuthContext';
import { surveyAPI } from '../lib/api';

const SurveyPage = () => {
  const navigate = useNavigate();
  useAuth();
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [surveyConfig, setSurveyConfig] = useState(null);
  const [formData, setFormData] = useState({});
  const [files, setFiles] = useState({});
  const [currentPage, setCurrentPage] = useState(0);
  const [validationErrors, setValidationErrors] = useState({});



  useEffect(() => {
    fetchSurveyConfig();
  }, []);

  const fetchSurveyConfig = async () => {
    try {
      setLoading(true);
      const response = await surveyAPI.getConfig();
      setSurveyConfig(response.data);
      
      // 初始化表单数据
      const initialData = {};
      if (response.data.config.fields) {
        response.data.config.fields.forEach(field => {
          if (field.type === 'checkbox') {
            initialData[field.name] = [];
          } else {
            initialData[field.name] = field.defaultValue || '';
          }
        });
      }
      setFormData(initialData);
      
    } catch (error) {
      console.error('Fetch survey config error:', error);
      setError('获取问卷配置失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  // 处理表单字段变化
  const handleFieldChange = (fieldName, value) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: value
    }));
    
    // 清除该字段的验证错误
    if (validationErrors[fieldName]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fieldName];
        return newErrors;
      });
    }
  };

  // 处理文件上传
  const handleFileUpload = (fieldName, uploadedFiles) => {
    setFiles(prev => ({
      ...prev,
      [fieldName]: uploadedFiles
    }));
    
    // 更新表单数据
    const fileNames = uploadedFiles.map(file => file.name);
    handleFieldChange(fieldName, fileNames);
  };

  // 验证当前页面
  const validateCurrentPage = () => {
    const errors = {};
    const config = surveyConfig.config;
    
    if (!config.pages || !config.pages[currentPage]) {
      return true;
    }

    const currentPageFields = config.pages[currentPage].fields || [];
    
    currentPageFields.forEach(fieldName => {
      const field = config.fields.find(f => f.name === fieldName);
      if (!field) return;

      // 检查是否应该显示此字段
      if (!shouldShowField(field)) return;

      // 验证必填字段
      if (field.required) {
        const value = formData[fieldName];
        if (!value || (Array.isArray(value) && value.length === 0) || value === '') {
          errors[fieldName] = `${field.label}为必填项`;
        }
      }

      // 验证字段格式
      if (formData[fieldName] && formData[fieldName] !== '') {
        const fieldErrors = validateFieldFormat(formData[fieldName], field);
        if (fieldErrors.length > 0) {
          errors[fieldName] = fieldErrors[0];
        }
      }
    });

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // 检查字段是否应该显示
  const shouldShowField = (field) => {
    if (!field.condition) return true;
    
    try {
      return evaluateCondition(formData, field.condition);
    } catch (error) {
      console.error('Condition evaluation error:', error);
      return true;
    }
  };

  // 验证字段格式
  const validateFieldFormat = (value, field) => {
    const errors = [];

    switch (field.type) {
      case 'email': {
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailPattern.test(value)) {
          errors.push('邮箱格式不正确');
        }
        break;
      }

      case 'phone': {
        const phonePattern = /^1[3-9]\d{9}$/;
        if (!phonePattern.test(value)) {
          errors.push('手机号格式不正确');
        }
        break;
      }

      case 'number': {
        const numValue = Number(value);
        if (isNaN(numValue)) {
          errors.push('必须为数字');
        } else {
          if (field.min !== undefined && numValue < field.min) {
            errors.push(`不能小于${field.min}`);
          }
          if (field.max !== undefined && numValue > field.max) {
            errors.push(`不能大于${field.max}`);
          }
        }
        break;
      }

      case 'text':
      case 'textarea': {
        if (field.minLength && value.length < field.minLength) {
          errors.push(`长度不能少于${field.minLength}个字符`);
        }
        if (field.maxLength && value.length > field.maxLength) {
          errors.push(`长度不能超过${field.maxLength}个字符`);
        }
        break;
    }
  }

    return errors;
  };

  // 评估条件表达式
  const evaluateCondition = (data, condition) => {
    const parts = condition.split(/\s*(==|!=)\s/);
    if (parts.length !== 3) return false;

    const [fieldName, operator, expectedValue] = parts;
    const actualValue = data[fieldName];
    const cleanExpectedValue = expectedValue.replace(/['"]/g, '');

    switch (operator) {
      case '==':
        return actualValue === cleanExpectedValue;
      case '!=':
        return actualValue !== cleanExpectedValue;
      default:
        return false;
    }
  };

  // 下一页
  const nextPage = () => {
    if (!validateCurrentPage()) {
      setError('请完善当前页面的必填信息');
      return;
    }

    setError('');
    setCurrentPage(prev => Math.min(prev + 1, (surveyConfig.config.pages?.length || 1) - 1));
  };

  // 上一页
  const prevPage = () => {
    setError('');
    setCurrentPage(prev => Math.max(prev - 1, 0));
  };

  // 保存草稿
  const saveDraft = async () => {
    try {
      // 这里可以实现保存草稿的逻辑
      setSuccess('草稿已保存');
      setTimeout(() => setSuccess(''), 3000);
    } catch {
      setError('保存草稿失败');
    }
  };

  // 提交问卷
  const submitSurvey = async () => {
    if (!validateCurrentPage()) {
      setError('请完善所有必填信息');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      // 准备文件数据
      const fileList = [];
      Object.values(files).forEach(fieldFiles => {
        fileList.push(...fieldFiles);
      });

      await surveyAPI.submit({
        survey_config_id: surveyConfig.id,
        data: formData,
        files: fileList
      });

      setSuccess('问卷提交成功！');
      
      // 3秒后跳转到用户中心
      setTimeout(() => {
        navigate('/dashboard');
      }, 3000);

    } catch (error) {
      console.error('Submit survey error:', error);
      setError(error.message || '问卷提交失败，请稍后重试');
    } finally {
      setSubmitting(false);
    }
  };

  // 渲染字段
  const renderField = (field) => {
    if (!shouldShowField(field)) {
      return null;
    }

    const hasError = validationErrors[field.name];
    const value = formData[field.name] || '';

    return (
      <div key={field.name} className="space-y-2">
        <Label htmlFor={field.name} className="flex items-center gap-1">
          {field.label}
          {field.required && <span className="text-red-500">*</span>}
        </Label>
        
        {field.description && (
          <p className="text-sm text-gray-600">{field.description}</p>
        )}

        {renderFieldInput(field, value, hasError)}

        {hasError && (
          <p className="text-sm text-red-600">{hasError}</p>
        )}
      </div>
    );
  };

  // 渲染字段输入组件
  const renderFieldInput = (field, value, hasError) => {
    const commonProps = {
      id: field.name,
      className: hasError ? 'border-red-500' : '',
      disabled: submitting
    };

    switch (field.type) {
      case 'text':
      case 'email':
      case 'phone':
        return (
          <Input
            {...commonProps}
            type={field.type === 'email' ? 'email' : field.type === 'phone' ? 'tel' : 'text'}
            placeholder={field.placeholder}
            value={value}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            maxLength={field.maxLength}
          />
        );

      case 'number':
        return (
          <Input
            {...commonProps}
            type="number"
            placeholder={field.placeholder}
            value={value}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            min={field.min}
            max={field.max}
          />
        );

      case 'textarea':
        return (
          <Textarea
            {...commonProps}
            placeholder={field.placeholder}
            value={value}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            maxLength={field.maxLength}
            rows={field.rows || 4}
          />
        );

      case 'select':
        return (
          <Select
            value={value}
            onValueChange={(val) => handleFieldChange(field.name, val)}
            disabled={submitting}
          >
            <SelectTrigger className={hasError ? 'border-red-500' : ''}>
              <SelectValue placeholder={field.placeholder || '请选择'} />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'radio':
        return (
          <RadioGroup
            value={value}
            onValueChange={(val) => handleFieldChange(field.name, val)}
            disabled={submitting}
          >
            {field.options?.map((option) => (
              <div key={option.value} className="flex items-center space-x-2">
                <RadioGroupItem value={option.value} id={`${field.name}_${option.value}`} />
                <Label htmlFor={`${field.name}_${option.value}`}>{option.label}</Label>
              </div>
            ))}
          </RadioGroup>
        );

      case 'checkbox':
        return (
          <div className="space-y-2">
            {field.options?.map((option) => (
              <div key={option.value} className="flex items-center space-x-2">
                <Checkbox
                  id={`${field.name}_${option.value}`}
                  checked={value.includes(option.value)}
                  onCheckedChange={(checked) => {
                    const newValue = checked
                      ? [...value, option.value]
                      : value.filter(v => v !== option.value);
                    handleFieldChange(field.name, newValue);
                  }}
                  disabled={submitting}
                />
                <Label htmlFor={`${field.name}_${option.value}`}>{option.label}</Label>
              </div>
            ))}
          </div>
        );

      case 'file':
        return (
          <FileUploadField
            field={field}
            files={files[field.name] || []}
            onFilesChange={(uploadedFiles) => handleFileUpload(field.name, uploadedFiles)}
            disabled={submitting}
            hasError={hasError}
          />
        );

      case 'date':
        return (
          <Input
            {...commonProps}
            type="date"
            value={value}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            min={field.minDate}
            max={field.maxDate}
          />
        );

      default:
        return (
          <Input
            {...commonProps}
            placeholder={field.placeholder}
            value={value}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
          />
        );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="lg" text="加载问卷中..." />
      </div>
    );
  }

  if (!surveyConfig) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">暂无可用问卷</h1>
          <p className="text-gray-600 mb-4">当前没有可参与的问卷调研</p>
          <Button onClick={() => navigate('/dashboard')}>
            返回用户中心
          </Button>
        </div>
      </div>
    );
  }

  const config = surveyConfig.config;
  const totalPages = config.pages?.length || 1;
  const progress = ((currentPage + 1) / totalPages) * 100;
  const currentPageConfig = config.pages?.[currentPage];
  const isLastPage = currentPage === totalPages - 1;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* 头部 */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <Button 
              variant="ghost" 
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              返回用户中心
            </Button>
            
            <div className="flex items-center gap-4">
              <Button 
                variant="outline" 
                onClick={saveDraft}
                disabled={submitting}
                className="flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                保存草稿
              </Button>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-6 h-6 text-blue-600" />
                {surveyConfig.title}
              </CardTitle>
              {surveyConfig.description && (
                <CardDescription>{surveyConfig.description}</CardDescription>
              )}
            </CardHeader>
            
            {totalPages > 1 && (
              <CardContent>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">
                    第 {currentPage + 1} 页，共 {totalPages} 页
                  </span>
                  <span className="text-sm text-gray-500">
                    {Math.round(progress)}% 完成
                  </span>
                </div>
                <Progress value={progress} className="h-2" />
              </CardContent>
            )}
          </Card>
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

        {/* 问卷内容 */}
        <Card>
          <CardHeader>
            {currentPageConfig?.title && (
              <CardTitle>{currentPageConfig.title}</CardTitle>
            )}
            {currentPageConfig?.description && (
              <CardDescription>{currentPageConfig.description}</CardDescription>
            )}
          </CardHeader>
          
          <CardContent className="space-y-6">
            {currentPageConfig?.fields?.map(fieldName => {
              const field = config.fields?.find(f => f.name === fieldName);
              return field ? renderField(field) : null;
            })}
          </CardContent>
        </Card>

        {/* 操作按钮 */}
        <div className="flex justify-between mt-8">
          <Button 
            variant="outline" 
            onClick={prevPage}
            disabled={currentPage === 0 || submitting}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            上一页
          </Button>

          {isLastPage ? (
            <Button 
              onClick={submitSurvey}
              disabled={submitting}
              className="flex items-center gap-2"
            >
              {submitting ? (
                <LoadingSpinner size="sm" color="white" />
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  提交问卷
                </>
              )}
            </Button>
          ) : (
            <Button 
              onClick={nextPage}
              disabled={submitting}
              className="flex items-center gap-2"
            >
              下一页
              <ArrowRight className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

// 文件上传字段组件
const FileUploadField = ({ field, files, onFilesChange, disabled, hasError }) => {
  const fileInputRef = useRef(null);

  const handleFileSelect = (e) => {
    const selectedFiles = Array.from(e.target.files);
    
    // 验证文件数量
    if (field.maxFiles && files.length + selectedFiles.length > field.maxFiles) {
      alert(`最多只能上传${field.maxFiles}个文件`);
      return;
    }

    // 验证文件大小和类型
    const validFiles = [];
    for (const file of selectedFiles) {
      if (field.maxSize && file.size > field.maxSize) {
        alert(`文件${file.name}大小超过限制`);
        continue;
      }

      if (field.allowedTypes && !field.allowedTypes.includes(file.type)) {
        alert(`文件${file.name}类型不支持`);
        continue;
      }

      validFiles.push(file);
    }

    if (validFiles.length > 0) {
      onFilesChange([...files, ...validFiles]);
    }

    // 清空input
    e.target.value = '';
  };

  const removeFile = (index) => {
    const newFiles = files.filter((_, i) => i !== index);
    onFilesChange(newFiles);
  };

  return (
    <div className="space-y-4">
      <div className={`border-2 border-dashed rounded-lg p-6 text-center ${
        hasError ? 'border-red-500' : 'border-gray-300'
      } ${disabled ? 'opacity-50' : 'hover:border-blue-400'} transition-colors`}>
        <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
        <div>
          <Button 
            variant="outline" 
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
          >
            选择文件
          </Button>
          <p className="text-sm text-gray-500 mt-2">
            {field.allowedTypes && `支持格式: ${field.allowedTypes.join(', ')}`}
            {field.maxSize && ` | 最大: ${Math.round(field.maxSize / 1024 / 1024)}MB`}
            {field.maxFiles && ` | 最多: ${field.maxFiles}个文件`}
          </p>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple={field.maxFiles !== 1}
        accept={field.allowedTypes?.join(',')}
        onChange={handleFileSelect}
        className="hidden"
      />

      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <FileText className="w-4 h-4 text-gray-500" />
                <div>
                  <p className="text-sm font-medium">{file.name}</p>
                  <p className="text-xs text-gray-500">
                    {Math.round(file.size / 1024)} KB
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeFile(index)}
                disabled={disabled}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
export default SurveyPage;
