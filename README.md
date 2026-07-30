# ZiYyun Blog

用 Astro + React 搭建的个人 Markdown 笔记博客。

## 工作流

1. 在 Obsidian 中编写 Markdown 笔记。
2. 将需要发布的笔记放入 `src/content/blog`。
3. 提交并推送到 GitHub 的 `main` 分支。
4. GitHub Actions 自动执行 `npm ci` 和 `npm run build`。
5. 构建产物发布到 GitHub Pages。

## 本地开发

```sh
npm install
npm run dev
```

## 构建检查

```sh
npm run build
```

## GitHub Pages

仓库创建后，在 GitHub 仓库的 Settings -> Pages 中，把 Source 设置为 GitHub Actions。

`astro.config.mjs` 会在 GitHub Actions 中自动识别仓库名：

- `username.github.io` 仓库会部署在根路径。
- 普通仓库会部署在 `/repo-name/` 子路径。

如果后续绑定独立域名，可以在仓库变量中设置 `SITE_URL`，例如 `https://blog.example.com`。
