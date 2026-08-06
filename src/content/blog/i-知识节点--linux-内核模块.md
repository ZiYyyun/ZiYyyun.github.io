---
title: 'Linux-内核模块'
description: 'Obsidian note: Linux-内核模块'
pubDate: '2026-08-05'
sourcePath: 'I_知识节点/Linux-内核模块.md'
tags: ['Linux']
---

**内核模块**是一种可以在 Linux 内核运行时动态加载和卸载的代码片段（通常是设备驱动、文件系统、网络协议等）。

> 如果没有模块，所有功能必须静态编译进内核，导致内核体积庞大、启动慢、灵活性差。模块机制让内核保持精简，按需扩展。

---

> [!NOTE] 为什么需要内核模块
> | 优势          | 说明                      |
> | ----------- | ----------------------- |
> | **动态加载**    | 不需要重启系统即可添加功能           |
> | **减小内核体积**  | 只保留核心功能，其他作为模块按需加载      |
> | **内存节省**    | 不用的模块可以卸载，释放内存          |
> | **便于开发和调试** | 驱动开发无需每次重新编译整个内核        |
> | **热插拔支持**   | USB、PCIe 等设备插入时自动加载对应模块 |

### 内核文件

- 模块文件是 **ELF 格式的 `.ko` 文件**（Kernel Object）
- 存放路径：`/lib/modules/$(uname -r)/kernel/`
- 按功能分类存放：
    - `drivers/` — 设备驱动
    - `fs/` — 文件系统
    - `net/` — 网络协议
    - `crypto/` — 加密算法


### 相关命令
#### 查看已加载模块
```bash
lsmod
```


> [!NOTE] 输出内容
```bash
Module                  Size  Used by
nvme                   53248  0
ext4                  741376  1
```

#### 加载模块
```bash
sudo insmod /path/to/module.ko    # 直接加载，不处理依赖
sudo modprobe module_name          # 智能加载，自动处理依赖（推荐）
```

#### 卸载模块
```bash
sudo rmmod module_name             # 直接卸载
sudo modprobe -r module_name       # 卸载并清理依赖
```

#### 查看模块信息
```bash
modinfo module_name                # 查看模块的元数据、参数、作者等
modprobe --show-depends module     # 查看模块的依赖关系
```

### 模块依赖与配置
- 依赖信息：`/lib/modules/$(uname -r)/modules.dep`
- 黑名单（禁止自动加载）：`/etc/modprobe.d/blacklist.conf`
