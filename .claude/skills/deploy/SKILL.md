---
name: deploy
description: 打包和部署博客到 GitHub Pages。当用户想要发布博客、部署上线、打包构建、推送到生产环境时使用此技能。触发词包括：部署、发布、打包、deploy、publish、build、上线。即使用户只是说"帮我发布一下"或"推送到线上"，也应使用此技能。
---

<!-- [AGC:FILE] tool=Cc author=fangkun date=2026-08-28 -->
<!-- [AGC:START] tool=Cc author=fangkun -->

# 打包部署

本技能用于将博客打包并部署到 GitHub Pages。支持自动部署（推荐）和手动部署两种方式。

## 部署流程概览

```
本地开发 → 提交代码 → 推送到 main → GitHub Actions 自动构建 → 部署到 GitHub Pages
```

## 方式一：自动部署（推荐）

### 前提条件

1. **GitHub Pages 已配置**：
   - 进入仓库 Settings → Pages
   - Source 选择 "GitHub Actions"

2. **GitHub Actions 已启用**：
   - 仓库 Settings → Actions → General
   - 确保 "Allow all actions" 或相关选项已勾选

### 部署步骤

```bash
# 1. 添加所有更改
git add .

# 2. 提交（使用有意义的提交信息）
git commit -m "feat: add new post about JavaScript"

# 3. 推送到 main 分支
git push origin main
```

推送后，GitHub Actions 会自动：
1. 校验所有文章的 frontmatter 格式
2. 安装依赖并构建站点
3. 部署到 GitHub Pages

### 查看部署状态

1. 进入仓库的 **Actions** 标签页
2. 找到最新的 workflow run
3. 查看构建日志和部署结果

部署成功后，博客将在几分钟内可访问：`https://<username>.github.io/<repo>/`

## 方式二：手动构建与部署

### 本地构建

```bash
# 安装依赖（首次或依赖变更时）
npm install

# 构建生产版本
npm run build

# 构建产物位于
ls docs/.vitepress/dist/
```

### 本地预览

```bash
# 预览构建结果
npm run preview
```

访问终端输出的 URL（通常是 `http://localhost:4173`）查看效果。

### 手动上传部署

如果不使用 GitHub Actions，可以手动上传构建产物：

```bash
# 1. 构建
npm run build

# 2. 上传 docs/.vitepress/dist/ 到托管服务
# 例如：GitHub Pages、Netlify、Vercel、Cloudflare Pages 等
```

## 部署前检查清单

在推送前，按此清单验证：

- [ ] 所有新文章的 `draft: false`（如果要发布）
- [ ] 运行 `npm run validate` 无错误
- [ ] 运行 `npm run dev` 本地预览正常
- [ ] 检查所有链接是否正确
- [ ] 检查图片是否正常显示
- [ ] 提交信息清晰有意义

## 常见问题

### 问题 1：部署失败 - frontmatter 校验错误

**症状**：GitHub Actions 第一步 validate 失败

**检查步骤**：
```bash
# 本地运行校验
npm run validate
```

**常见错误**：
- 缺少必填字段（title、date、description、category）
- date 格式不正确（应为 YYYY-MM-DD）
- category 与目录名不一致

**解决**：根据错误信息修正 frontmatter

### 问题 2：部署失败 - 构建错误

**症状**：GitHub Actions 第二步 build 失败

**检查步骤**：
```bash
# 本地构建，查看错误信息
npm run build
```

**常见错误**：
- Markdown 语法错误
- 组件引用错误
- 依赖缺失

**解决**：
1. 查看构建日志中的具体错误
2. 本地复现并修复
3. 重新提交

### 问题 3：部署成功但页面 404

**可能原因**：
1. GitHub Pages 未正确配置
2. 仓库名称与 base 路径不匹配

**检查步骤**：
1. 确认 Settings → Pages → Source 是 "GitHub Actions"
2. 检查 `docs/.vitepress/config.ts` 中的 `base` 配置

**解决**：
```typescript
// docs/.vitepress/config.ts
export default defineConfig({
  base: '/<repo-name>/',  // 确保与仓库名一致
  // ...
})
```

### 问题 4：部署后内容未更新

**可能原因**：
1. 浏览器缓存
2. CDN 缓存
3. 构建未包含最新更改

**检查步骤**：
```bash
# 1. 检查 GitHub Actions 是否成功
# 2. 查看构建日志确认文件已包含

# 3. 清除缓存访问
# 浏览器硬刷新：Ctrl+Shift+R (Windows) / Cmd+Shift+R (Mac)
```

**解决**：
- 等待几分钟让 CDN 刷新
- 或在 URL 后加 `?v=1` 强制刷新

## 部署到其他平台

### Netlify

```bash
# 1. 构建
npm run build

# 2. 设置构建命令
# Build command: npm run build
# Publish directory: docs/.vitepress/dist

# 3. 推送到 GitHub，Netlify 会自动部署
```

### Vercel

```bash
# 1. 安装 Vercel CLI
npm i -g vercel

# 2. 部署
vercel

# 3. 按提示配置
# - Framework Preset: VitePress
# - Root Directory: docs
# - Build Command: npm run build
# - Output Directory: .vitepress/dist
```

### Cloudflare Pages

```bash
# 1. 连接 GitHub 仓库
# 2. 设置构建配置
# - Framework preset: VitePress
# - Build command: npm run build
# - Build output directory: docs/.vitepress/dist
```

## 回滚部署

如果需要回滚到之前的版本：

```bash
# 1. 查看历史提交
git log --oneline

# 2. 回退到指定版本
git revert <commit-hash>

# 3. 推送
git push origin main
```

GitHub Actions 会自动重新部署旧版本。

## 相关命令

```bash
npm run dev              # 本地开发预览
npm run build            # 生产构建
npm run preview          # 预览构建结果
npm run validate         # 校验 frontmatter
npm run generate-posts   # 重新生成文章数据
```