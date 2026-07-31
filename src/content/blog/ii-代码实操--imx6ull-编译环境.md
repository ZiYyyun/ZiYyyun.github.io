---
title: 'IMX6ULL-编译环境'
description: 'Obsidian note: IMX6ULL-编译环境'
pubDate: '2026-07-31'
sourcePath: 'II_代码实操/IMX6ULL-编译环境.md'
tags: ['实操/开发/嵌入式/LINUX/NixOS', 'Linux', 'nixos']
---

本文为ARMv7架构，故使用`armv7l-unknown-linux-gnueabihf-*`工具(PS:其他架构可在[https://github.com/NixOS/nixpkgs/blob/master/lib/systems/examples.nix]查到)

创建
```nix
let
  pkgs = import <nixpkgs> {
    crossSystem = (import <nixpkgs/lib>).systems.examples.armv7l-hf-multiplatform;
  };
in
pkgs.mkShell {
  buildInputs = with pkgs; [
    gcc
    binutils
    zlib
  ];
  shellHook = ''
    echo "Welcome to ARMv7 (gnueabihf) cross-compiling shell"
    export CROSS_COMPILE=armv7l-unknown-linux-gnueabihf-
  '';
}

```

```nix
nix-shell crossShell.nix  //进入创建好的编译环境
```

```nix
$ armv7l-unknown-linux-gnueabihf-gcc --version
$ echo $CROSS_COMPILE
armv7l-unknown-linux-gnueabihf-
```
