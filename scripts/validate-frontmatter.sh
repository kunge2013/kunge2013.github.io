#!/bin/bash
# [AGC:FILE] tool=Cc author=fangkun date=2026-08-27
# [AGC:START] tool=Cc author=fangkun

# 校验所有文章的 frontmatter 格式
# 用法: npm run validate

set -euo pipefail

ERRORS=0
CHECKED=0

# 必填字段
REQUIRED_FIELDS=("title" "date" "description" "category")

# 遍历所有 .md 文件（排除 index.md / about.md / archives.md / tags.md）
while read -r file; do
  # 跳过非文章文件
  basename=$(basename "$file")
  if [[ "$basename" == "index.md" || "$basename" == "about.md" || \
        "$basename" == "archives.md" || "$basename" == "tags.md" ]]; then
    continue
  fi

  # 只校验 posts 目录下的文件
  if [[ "$file" != docs/posts/* && "$file" != docs/en/posts/* ]]; then
    continue
  fi

  CHECKED=$((CHECKED + 1))

  # 检查是否有 frontmatter（frontmatter 在文件头部，以 --- 包围）
  if ! head -n 1 "$file" | grep -q "^---$"; then
    echo "  $file: 缺少 frontmatter"
    ERRORS=$((ERRORS + 1))
    continue
  fi

  # 读取 frontmatter 内容
  FRONTMATTER=$(awk '/^---$/{n++; next} n==1{print}' "$file")

  # 检查必填字段
  for field in "${REQUIRED_FIELDS[@]}"; do
    if ! echo "$FRONTMATTER" | grep -q "^$field:"; then
      echo "  $file: 缺少字段 '$field'"
      ERRORS=$((ERRORS + 1))
    fi
  done

  # 校验日期格式 (YYYY-MM-DD)
  DATE_VALUE=$(echo "$FRONTMATTER" | grep "^date:" | sed 's/date: *//')
  if [[ -n "$DATE_VALUE" ]] && ! [[ "$DATE_VALUE" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}$ ]]; then
    echo "  $file: 日期格式错误 '$DATE_VALUE' (应为 YYYY-MM-DD)"
    ERRORS=$((ERRORS + 1))
  fi

  # 校验 lang 字段值
  LANG_VALUE=$(echo "$FRONTMATTER" | grep "^lang:" | sed 's/lang: *//')
  if [[ -n "$LANG_VALUE" ]] && [[ "$LANG_VALUE" != "zh" && "$LANG_VALUE" != "en" ]]; then
    echo "  $file: lang 字段值错误 '$LANG_VALUE' (应为 zh 或 en)"
    ERRORS=$((ERRORS + 1))
  fi
done < <(find docs -name "*.md" -type f)

echo ""
if [[ $ERRORS -eq 0 ]]; then
  echo "校验通过，共 $CHECKED 篇文章"
  exit 0
else
  echo "校验失败，共 $ERRORS 个错误"
  exit 1
fi

# [AGC:END]
