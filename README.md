# ZiYyun Blog 项目 Wiki

> 用 Astro + React 搭建的个人 Markdown 笔记博客，基于 Obsidian 笔记工作流。
>
> 仓库地址：[ZiYyyun/ZiYyyun.github.io](https://github.com/ZiYyyun/ZiYyyun.github.io)  
> 在线访问：[ziyyyun.github.io](https://ziyyyun.github.io/)

---

## 目录

1. [项目概览](#1-项目概览)
2. [技术栈](#2-技术栈)
3. [项目结构](#3-项目结构)
4. [工作流与发布机制](#4-工作流与发布机制)
5. [核心脚本解析](#5-核心脚本解析)
6. [配置说明](#6-配置说明)
7. [本地开发指南](#7-本地开发指南)
8. [部署与 CI/CD](#8-部署与-cicd)
9. [笔记内容分类](#9-笔记内容分类)
10. [常见问题](#10-常见问题)

---

## 1. 项目概览

**ZiYyun Blog** 是一个基于 **Astro v7** 构建的静态博客系统，专为嵌入式开发、代码实操和长期笔记管理设计。

| 属性          | 说明                                              |
| ------------- | ------------------------------------------------- |
| **项目名称**  | ziyyun-blog                                       |
| **版本**      | 0.0.1                                             |
| **框架**      | Astro 7.1.6 + React 19                            |
| **内容来源**  | Obsidian Markdown 笔记（通过 Git Submodule 同步） |
| **部署平台**  | GitHub Pages                                      |
| **域名**      | [ziyyyun.github.io](https://ziyyyun.github.io/)   |
| **Node 要求** | >= 22.12.0                                        |

### 博客定位

> "嵌入式、代码与长期笔记。"

博客内容聚焦于：

- **嵌入式开发**：8051、STM32、IMX6ULL、ESP32 等
- **Linux 系统**：NixOS、嵌入式 Linux
- **代码实操**：寄存器操作、位运算、PID 控制等
- **IC 芯片**：ES8311 音频编解码器等

---

## 2. 技术栈

### 核心框架

| 技术      | 版本    | 用途                  |
| --------- | ------- | --------------------- |
| Astro     | ^7.1.6  | 静态站点生成器（SSG） |
| React     | ^19.2.8 | 交互组件              |
| React DOM | ^19.2.8 | React 渲染器          |
| MDX       | ^7.0.5  | 增强 Markdown 支持    |

### Astro 官方集成

| 集成             | 版本    | 功能           |
| ---------------- | ------- | -------------- |
| @astrojs/react   | ^6.0.2  | React 组件支持 |
| @astrojs/mdx     | ^7.0.5  | MDX 内容渲染   |
| @astrojs/rss     | ^4.0.19 | RSS 订阅生成   |
| @astrojs/sitemap | ^3.7.3  | 站点地图生成   |

### 字体与图标

| 资源                       | 版本    | 说明                              |
| -------------------------- | ------- | --------------------------------- |
| @fontsource/jetbrains-mono | ^5.3.0  | JetBrains Mono 等宽字体（代码块） |
| @fontsource/noto-sans-sc   | ^5.3.0  | Noto Sans SC 中文字体             |
| Atkinson (本地)            | -       | 博客正文字体（400/700）           |
| @lucide/astro              | ^1.28.0 | Lucide 图标库                     |

### 其他依赖

| 依赖     | 版本    | 用途                       |
| -------- | ------- | -------------------------- |
| sharp    | ^0.35.0 | 图片优化处理               |
| d3-force | ^3.0.0  | 力导向图（知识图谱可视化） |

---

## 3. 项目结构

```
ZiYyyun.github.io/
├── .github/
│   └── workflows/
│       └── deploy.yml          # GitHub Actions 自动部署配置
├── scripts/
│   └── sync-obsidian-notes.mjs # Obsidian 笔记同步脚本
├── src/
│   ├── assets/
│   │   └── fonts/
│   │       ├── atkinson-regular.woff
│   │       └── atkinson-bold.woff
│   ├── components/             # React/Astro 组件
│   ├── content/                # 博客内容（由同步脚本填充）
│   ├── layouts/                # 页面布局模板
│   ├── pages/                  # 路由页面
│   └── styles/                 # 全局样式
├── public/                     # 静态资源
├── astro.config.mjs            # Astro 配置文件
├── package.json                # 项目依赖
├── README.md                   # 项目说明
└── .gitmodules                 # Git Submodule 配置（Obsidian 笔记仓库）
```

### 关键目录说明

| 目录              | 说明                                                       |
| ----------------- | ---------------------------------------------------------- |
| `src/content/`    | 博客文章存放目录，由 `sync:notes` 脚本从 Obsidian 仓库同步 |
| `src/components/` | React 组件，用于交互式功能（如知识图谱、搜索等）           |
| `src/layouts/`    | Astro 布局文件，定义页面结构                               |
| `src/pages/`      | Astro 路由页面，自动生成路由                               |
| `scripts/`        | 自定义 Node.js 脚本，处理 Obsidian 笔记同步逻辑            |

---

## 4. 工作流与发布机制

### 4.1 整体工作流

```
┌─────────────────┐
│  Obsidian 编写   │  ← 在 Obsidian 中编写 Markdown 笔记
│  Markdown 笔记   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  添加 #blog 标签 │  ← 给要发布的笔记添加 #blog 标签
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  提交 Obsidian   │  ← 提交并推送 Obsidian 仓库
│  仓库 main 分支  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  提交博客仓库    │  ← 提交并推送博客仓库 main 分支
│  main 分支      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  npm run        │  ← 构建时执行同步脚本
│  sync:notes     │     从 Obsidian 仓库拉取并筛选笔记
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  GitHub Actions  │  ← 自动构建并发布到 GitHub Pages
│  自动构建部署    │
└─────────────────┘
```

### 4.2 笔记筛选机制

博客通过 `Blog_Pages.base` 文件控制哪些笔记会被发布：

#### 方式一：Obsidian Dataview 查询（推荐）

在 Obsidian vault 中创建 `Blog_Pages.base`：

```yaml
filters:
  and:
    - file.tags.contains("#blog")
views:
  - type: table
    name: 表格
```

#### 方式二：手写清单

```
[[I_知识节点/STM32-GPIO寄存器]]
[[II_代码实操/IC-ES8311]]
```

#### 方式三：普通路径

```
I_知识节点/STM32-GPIO寄存器.md
```

> **安全提示**：构建脚本**只发布** `Blog_Pages.base` 查询命中的笔记或手写清单里的笔记，不会扫描整个 vault 自动公开内容。这确保了隐私安全。

---

## 5. 核心脚本解析

### 5.1 `sync-obsidian-notes.mjs`

这是项目的核心脚本，负责：

1. **读取 Obsidian 仓库**：通过 Git Submodule 获取 Obsidian vault
2. **解析 `Blog_Pages.base`**：识别需要发布的笔记
3. **筛选带 `#blog` 标签的笔记**：根据 Dataview 查询或清单过滤
4. **复制到 `src/content/`**：将筛选后的笔记复制到 Astro 内容目录
5. **处理内部链接**：转换 Obsidian 的 `[[wikilink]]` 为 Astro 兼容链接
6. **处理图片资源**：同步笔记中引用的图片到 `public/` 目录

### 5.2 脚本执行时机

```json
{
  "scripts": {
    "sync:notes": "node scripts/sync-obsidian-notes.mjs",
    "build": "npm run sync:notes && astro build"
  }
}
```

- `npm run sync:notes`：手动执行同步
- `npm run build`：自动先同步再构建

---

## 6. 配置说明

### 6.1 `astro.config.mjs`

```javascript
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { defineConfig, fontProviders } from 'astro/config';
import react from '@astrojs/react';

const githubOwner = process.env.GITHUB_REPOSITORY_OWNER;
const githubRepo = process.env.GITHUB_REPOSITORY?.split('/')[1];
const isProjectPage = githubRepo && !githubRepo.endsWith('.github.io');

export default defineConfig({
  // 站点地址：优先使用环境变量 SITE_URL，其次是 GitHub Pages 默认域名
  site: process.env.SITE_URL ?? (githubOwner ? `https://${githubOwner}.github.io` : 'http://localhost:4321'),

  // 基础路径：普通仓库使用 /repo-name/，username.github.io 使用根路径
  base: process.env.BASE_PATH ?? (isProjectPage ? `/${githubRepo}` : undefined),

  // 集成插件
  integrations: [mdx(), sitemap(), react()],

  // 本地字体配置
  fonts: [
    {
      provider: fontProviders.local(),
      name: 'Atkinson',
      cssVariable: '--font-atkinson',
      fallbacks: ['sans-serif'],
      options: {
        variants: [
          { src: ['./src/assets/fonts/atkinson-regular.woff'], weight: 400, style: 'normal', display: 'swap' },
          { src: ['./src/assets/fonts/atkinson-bold.woff'], weight: 700, style: 'normal', display: 'swap' },
        ],
      },
    },
  ],
});
```

### 6.2 关键配置项

| 配置项         | 说明                                             |
| -------------- | ------------------------------------------------ |
| `site`         | 站点 URL，支持通过 `SITE_URL` 环境变量自定义域名 |
| `base`         | 基础路径，自动识别仓库类型（用户页 vs 项目页）   |
| `integrations` | MDX 渲染、站点地图、React 组件支持               |
| `fonts`        | Atkinson 字体本地加载，优化首屏性能              |

### 6.3 环境变量

| 变量名                    | 说明              | 默认值                      |
| ------------------------- | ----------------- | --------------------------- |
| `SITE_URL`                | 自定义域名        | `https://{owner}.github.io` |
| `BASE_PATH`               | 自定义基础路径    | 自动检测                    |
| `GITHUB_REPOSITORY_OWNER` | GitHub 仓库所有者 | -                           |
| `GITHUB_REPOSITORY`       | 完整仓库名        | -                           |

---

## 7. 本地开发指南

### 7.1 环境准备

- **Node.js**: >= 22.12.0
- **npm**: 随 Node.js 安装

### 7.2 快速开始

```bash
# 1. 克隆仓库
git clone https://github.com/ZiYyyun/ZiYyyun.github.io.git
cd ZiYyyun.github.io

# 2. 安装依赖
npm install

# 3. 同步 Obsidian 笔记
npm run sync:notes

# 4. 启动开发服务器
npm run dev
```

### 7.3 常用命令

| 命令                 | 说明                            |
| -------------------- | ------------------------------- |
| `npm install`        | 安装项目依赖                    |
| `npm run sync:notes` | 从 Obsidian 仓库同步笔记        |
| `npm run dev`        | 启动开发服务器（默认端口 4321） |
| `npm run build`      | 同步笔记并构建生产版本          |
| `npm run preview`    | 预览生产构建                    |
| `npm run astro`      | Astro CLI                       |

### 7.4 开发服务器

```
http://localhost:4321
```

---

## 8. 部署与 CI/CD

### 8.1 GitHub Pages 配置

1. 进入仓库 **Settings → Pages**
2. 将 **Source** 设置为 **GitHub Actions**
3. 确保 `.github/workflows/deploy.yml` 已配置

### 8.2 自动部署流程

```
推送 main 分支
    │
    ▼
GitHub Actions 触发
    │
    ├── 检出代码（含 submodules）
    ├── 安装 Node.js 依赖
    ├── 执行 npm run build
    │   ├── sync:notes（同步 Obsidian 笔记）
    │   └── astro build（构建静态站点）
    └── 部署到 GitHub Pages
```

### 8.3 路径自适应

`astro.config.mjs` 会自动识别仓库类型：

| 仓库类型             | 部署路径             | 示例                           |
| -------------------- | -------------------- | ------------------------------ |
| `username.github.io` | 根路径 `/`           | `ziyyyun.github.io/`           |
| 普通仓库             | 子路径 `/repo-name/` | `ziyyyun.github.io/repo-name/` |

### 8.4 自定义域名

如需绑定独立域名：

1. 在仓库 **Settings → Variables** 中设置 `SITE_URL`
2. 例如：`https://blog.example.com`
3. 在 DNS 服务商配置 CNAME 记录指向 GitHub Pages

---

## 9. 笔记内容分类

### 9.1 已发布笔记（截至 2026-07-30）

| 标题                                    | 日期       | 分类标签               |
| --------------------------------------- | ---------- | ---------------------- |
| IC-ES8311                               | 2026-07-30 | #IC                    |
| IMX6ULL-汇编LED实验                     | 2026-07-30 | #理论/开发/嵌入式      |
| IMX6ULL-编译环境                        | 2026-07-30 | #理论/开发/嵌入式      |
| PID计算实现                             | 2026-07-30 | #实操/开发             |
| 基于Modbus_HEX指令的ADAM-4150的串口控制 | 2026-07-30 | #实操/开发             |
| 寄存器操作技巧--位运算                  | 2026-07-30 | #理论/开发/嵌入式/8051 |

### 9.2 标签体系

```
理论
├── 开发
│   └── 嵌入式
│       ├── 8051
│       └── LINUX
│           └── NixOS

实操
├── 开发
│   └── 嵌入式
│       └── LINUX
│           └── NixOS

#esp32, #IC, #Linux, #nixos, #Python
```

### 9.3 笔记命名规范

```
I_知识节点/xxx        → 理论知识笔记
II_代码实操/xxx       → 代码实操笔记
```

---

## 10. 常见问题

### Q1: 为什么笔记没有出现在博客上？

**A**: 请检查：

1. 笔记是否添加了 `#blog` 标签
2. `Blog_Pages.base` 是否正确配置
3. Obsidian 仓库是否已推送到远程
4. 博客仓库是否已重新构建部署

### Q2: 如何添加新笔记到博客？

**A**: 

1. 在 Obsidian 中编写笔记
2. 添加 `#blog` 标签
3. 提交并推送 Obsidian 仓库
4. 提交并推送博客仓库触发构建

### Q3: 图片无法显示？

**A**: 确保图片路径使用相对路径，同步脚本会自动处理 `![[image.png]]` 格式的 Obsidian 图片引用。

### Q4: 如何修改博客样式？

**A**: 编辑 `src/styles/` 目录下的样式文件，或修改 Astro 组件中的 Tailwind/SCSS 样式。

### Q5: 如何添加新的页面？

**A**: 在 `src/pages/` 目录下创建新的 `.astro` 或 `.mdx` 文件，Astro 会自动生成对应路由。

### Q6: 构建失败怎么办？

**A**: 

1. 检查 Node.js 版本是否 >= 22.12.0
2. 运行 `npm run sync:notes` 查看同步脚本是否有错误
3. 检查 Obsidian 仓库的 submodule 是否正确初始化：`git submodule update --init --recursive`

---

## 附录

### A. 相关链接

| 资源        | 链接                                                         |
| ----------- | ------------------------------------------------------------ |
| 博客主页    | [ziyyyun.github.io](https://ziyyyun.github.io/)              |
| 博客笔记页  | [ziyyyun.github.io/blog](https://ziyyyun.github.io/blog/)    |
| GitHub 仓库 | [github.com/ZiYyyun/ZiYyyun.github.io](https://github.com/ZiYyyun/ZiYyyun.github.io) |
| Astro 文档  | [astro.build](https://astro.build/)                          |
| Obsidian    | [obsidian.md](https://obsidian.md/)                          |

### B. 许可证

本项目为个人博客项目，代码和配置遵循各自依赖的开源许可证。

---

> **最后更新**: 2026-07-31  
> **维护者**: ZiYyun
