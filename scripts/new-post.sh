#!/bin/bash
# [AGC:FILE] tool=Cc author=fangkun date=2026-08-27
# [AGC:START] tool=Cc author=fangkun

# 新建文章脚手架脚本
# 用法: npm run new-post -- <category> <slug> [--en]
# 示例: npm run new-post -- javascript my-first-post
#       npm run new-post -- react hooks-basics --en

set -euo pipefail

# ---- 参数解析 ----
LANG="zh"
CATEGORY=""
SLUG=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --en)
      LANG="en"
      shift
      ;;
    *)
      if [[ -z "$CATEGORY" ]]; then
        CATEGORY="$1"
      elif [[ -z "$SLUG" ]]; then
        SLUG="$1"
      fi
      shift
      ;;
  esac
done

if [[ -z "$CATEGORY" || -z "$SLUG" ]]; then
  echo "用法: npm run new-post -- <category> <slug> [--en]"
  echo "  中文示例: npm run new-post -- javascript my-first-post"
  echo "  英文示例: npm run new-post -- react hooks-basics --en"
  echo ""
  echo "可用分类（中文）:"
  for dir in docs/posts/*/; do
    [[ -d "$dir" ]] && echo "  - $(basename "$dir")"
  done
  echo "可用分类（英文）:"
  for dir in docs/en/posts/*/; do
    [[ -d "$dir" ]] && echo "  - $(basename "$dir")"
  done
  exit 1
fi

# ---- 决定目录 ----
if [[ "$LANG" == "zh" ]]; then
  CATEGORY_DIR="docs/posts/$CATEGORY"
else
  CATEGORY_DIR="docs/en/posts/$CATEGORY"
fi

# ---- 分类不存在时自动创建 ----
if [[ ! -d "$CATEGORY_DIR" ]]; then
  echo "⚠ 分类目录不存在，自动创建: $CATEGORY_DIR"
  mkdir -p "$CATEGORY_DIR"

  # 同时创建分类首页 index.md
  if [[ "$LANG" == "zh" ]]; then
    LABEL="$CATEGORY"
  else
    LABEL="$CATEGORY"
  fi
  cat > "$CATEGORY_DIR/index.md" << EOL
---
title: $LABEL
description: $LABEL 相关文章
---

# $LABEL

<PostList />
EOL
  echo "  已生成分类首页: $CATEGORY_DIR/index.md"
fi

# ---- 检查文件是否已存在 ----
FILE_PATH="$CATEGORY_DIR/$SLUG.md"
if [[ -f "$FILE_PATH" ]]; then
  echo "文件已存在: $FILE_PATH"
  exit 1
fi

# ---- 生成日期 ----
DATE=$(date +%Y-%m-%d)

# ---- 生成 frontmatter ----
if [[ "$LANG" == "zh" ]]; then
  LANG_LABEL="zh"
  I18N_LINK="/en/posts/$CATEGORY/$SLUG"
  DESCRIPTION="在这里填写文章摘要"
else
  LANG_LABEL="en"
  I18N_LINK="/posts/$CATEGORY/$SLUG"
  DESCRIPTION="Fill in the article summary here"
fi

cat > "$FILE_PATH" << EOL
---
title: $SLUG
date: $DATE
description: $DESCRIPTION
category: $CATEGORY
tags: []
lang: $LANG_LABEL
i18n-link: $I18N_LINK
cover: ''
draft: true
sticky: false
---

# $SLUG

<!-- [AGC:START] tool=Cc author=fangkun -->

> 这是一篇草稿文章。发布前请将 frontmatter 中的 \`draft\` 改为 \`false\`。

## 第一节

在这里开始写...

<!-- [AGC:END] -->
EOL

echo "文章已创建: $FILE_PATH"
echo ""
echo "下一步:"
echo "  1. 编辑文章: $FILE_PATH"
echo "  2. 发布文章: 将 draft: true 改为 draft: false"
echo "  3. 本地预览: npm run dev"
echo "  4. 提交部署: git add . && git commit -m 'feat: add $SLUG' && git push"

# [AGC:END]
