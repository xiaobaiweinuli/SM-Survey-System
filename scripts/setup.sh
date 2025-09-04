#!/bin/bash

# SM任务问卷系统 - 自动化设置脚本
# 用于快速配置和部署项目

set -e

echo "🚀 SM任务问卷系统 - 自动化设置"
echo "=================================="

# 检查必要工具
check_requirements() {
    echo "📋 检查系统要求..."
    
    if ! command -v node &> /dev/null; then
        echo "❌ Node.js 未安装，请先安装 Node.js"
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        echo "❌ npm 未安装，请先安装 npm"
        exit 1
    fi
    
    if ! command -v git &> /dev/null; then
        echo "❌ Git 未安装，请先安装 Git"
        exit 1
    fi
    
    echo "✅ 系统要求检查通过"
}

# 安装依赖
install_dependencies() {
    echo "📦 安装项目依赖..."
    
    # 安装前端依赖
    echo "安装前端依赖..."
    cd frontend
    npm install
    cd ..
    
    # 安装后端依赖
    echo "安装后端依赖..."
    cd backend
    npm install
    cd ..
    
    echo "✅ 依赖安装完成"
}

# 配置环境变量
setup_environment() {
    echo "⚙️ 配置环境变量..."
    
    # 复制环境变量模板
    if [ ! -f "frontend/.env" ]; then
        cp frontend/.env.example frontend/.env
        echo "📝 已创建前端环境变量文件: frontend/.env"
        echo "请根据需要修改配置"
    fi
    
    echo "✅ 环境变量配置完成"
}

# 构建项目
build_project() {
    echo "🔨 构建项目..."
    
    # 构建前端
    echo "构建前端..."
    cd frontend
    npm run build
    cd ..
    
    echo "✅ 项目构建完成"
}

# 本地测试
test_local() {
    echo "🧪 启动本地测试..."
    
    echo "前端将在 http://localhost:5173 启动"
    echo "后端将在 http://localhost:8787 启动"
    echo ""
    echo "按 Ctrl+C 停止服务"
    
    # 并行启动前端和后端
    cd frontend && npm run dev &
    FRONTEND_PID=$!
    
    cd backend && npm run dev &
    BACKEND_PID=$!
    
    # 等待用户中断
    trap "kill $FRONTEND_PID $BACKEND_PID 2>/dev/null; exit" INT
    wait
}

# 部署到Cloudflare
deploy_cloudflare() {
    echo "☁️ 部署到Cloudflare..."
    
    if [ -z "$CLOUDFLARE_API_TOKEN" ]; then
        echo "❌ 请设置 CLOUDFLARE_API_TOKEN 环境变量"
        exit 1
    fi
    
    if [ -z "$CLOUDFLARE_ACCOUNT_ID" ]; then
        echo "❌ 请设置 CLOUDFLARE_ACCOUNT_ID 环境变量"
        exit 1
    fi
    
    # 部署后端
    echo "部署后端到 Cloudflare Workers..."
    cd backend
    npx wrangler deploy
    cd ..
    
    # 部署前端
    echo "部署前端到 Cloudflare Pages..."
    cd frontend
    npx wrangler pages deploy dist --project-name=sm-auth-survey-frontend
    cd ..
    
    echo "✅ 部署完成"
}

# 显示帮助信息
show_help() {
    echo "使用方法: $0 [选项]"
    echo ""
    echo "选项:"
    echo "  install     安装项目依赖"
    echo "  setup       配置环境变量"
    echo "  build       构建项目"
    echo "  test        启动本地测试服务器"
    echo "  deploy      部署到Cloudflare"
    echo "  all         执行完整设置流程"
    echo "  help        显示此帮助信息"
    echo ""
    echo "示例:"
    echo "  $0 all              # 完整设置"
    echo "  $0 install          # 仅安装依赖"
    echo "  $0 test             # 启动本地测试"
    echo "  $0 deploy           # 部署到Cloudflare"
}

# 主函数
main() {
    case "${1:-all}" in
        "install")
            check_requirements
            install_dependencies
            ;;
        "setup")
            setup_environment
            ;;
        "build")
            build_project
            ;;
        "test")
            check_requirements
            test_local
            ;;
        "deploy")
            check_requirements
            build_project
            deploy_cloudflare
            ;;
        "all")
            check_requirements
            install_dependencies
            setup_environment
            build_project
            echo ""
            echo "🎉 设置完成！"
            echo ""
            echo "下一步:"
            echo "1. 配置 GitHub Secrets (参考 docs/deployment-guide.md)"
            echo "2. 推送代码到 GitHub 触发自动部署"
            echo "3. 或运行 '$0 test' 进行本地测试"
            echo "4. 或运行 '$0 deploy' 手动部署到Cloudflare"
            ;;
        "help"|"-h"|"--help")
            show_help
            ;;
        *)
            echo "❌ 未知选项: $1"
            show_help
            exit 1
            ;;
    esac
}

# 运行主函数
main "$@"

