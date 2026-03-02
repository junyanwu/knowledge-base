#!/bin/bash
# 知识库自动提交脚本
# 用法：./auto-commit.sh [提交信息前缀]

cd ~/.openclaw/workspace/knowledge-base

# 检查是否有新文件
git status --porcelain

if [ $? -eq 0 ]; then
    # 添加所有新文件
    git add -A
    
    # 获取变更统计
    CHANGED=$(git status --porcelain | wc -l)
    
    if [ $CHANGED -gt 0 ]; then
        # 生成提交信息
        PREFIX=${1:-"feat"}
        TIMESTAMP=$(date +"%Y-%m-%d %H:%M")
        FILES=$(git status --porcelain | grep "^??" | wc -l)
        MODIFIED=$(git status --porcelain | grep "^ M" | wc -l)
        
        COMMIT_MSG="$PREFIX: 自动提交 - $TIMESTAMP
        
新增文件：$FILES 个
修改文件：$MODIFIED 个

自动学习产出提交"
        
        # 提交
        git commit -m "$COMMIT_MSG"
        
        if [ $? -eq 0 ]; then
            echo "✅ 自动提交成功！"
            echo "📊 新增：$FILES 个文件"
            echo "📝 修改：$MODIFIED 个文件"
            echo ""
            git log --oneline -1
        else
            echo "❌ 提交失败"
        fi
    else
        echo "ℹ️  没有变更，跳过提交"
    fi
else
    echo "❌ Git 状态检查失败"
fi
