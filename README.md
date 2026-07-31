# ZiYyun Blog

用 Astro + React 搭建的个人 Markdown 笔记博客。

## 工作流

1. 在 Obsidian 中编写 Markdown 笔记。
2. 在 Obsidian 仓库中新建或更新 `Blog_Pages.base`。
3. 给要发布的笔记添加 `#blog` 标签。
4. 提交并推送博客仓库的 `main` 分支。
5. 构建时执行 `npm run sync:notes`，从 Obsidian 仓库同步发布笔记。
6. GitHub Actions 自动构建并发布到 GitHub Pages。

## 发布视图

推荐在 Obsidian vault 中创建 `Blog_Pages.base`：

```yaml
filters:
  and:
    - file.tags.contains("#blog")
views:
  - type: table
    name: 表格
```

脚本也兼容手写清单，例如 `blog_pages.database`：

```md
[[I_知识节点/STM32-GPIO寄存器]]
[[II_代码实操/IC-ES8311]]
```

也支持普通路径：

```md
I_知识节点/STM32-GPIO寄存器.md
```

构建脚本只发布 `Blog_Pages.base` 查询命中的笔记，或手写清单里的笔记，不会扫描整个 vault 自动公开内容。

## 本地开发

```sh
npm install
npm run sync:notes
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
