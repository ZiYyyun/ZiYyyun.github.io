---
title: 'Linux-第一个内核模块'
description: 'Obsidian note: Linux-第一个内核模块'
pubDate: '2026-08-05'
sourcePath: 'II_代码实操/Linux-第一个内核模块.md'
tags: ['Linux']
---

```c
#include <linux/init.h>
#include <linux/kernel.h>
#include <linux/module.h>

static int __init hello_init(void)
{
    printk(KERN_INFO "Hello Driver Init!\n");
    return 0;
}

static void __exit hello_exit(void)
{
    printk(KERN_INFO "Hello Driver Exit!\n");
}

module_init(hello_init);
module_exit(hello_exit);

MODULE_LICENSE("GPL");
MODULE_AUTHOR("ZiYun");
MODULE_DESCRIPTION("My First Linux Kernel Module");
```


### makefile文件

```makefile
obj-m += hello.o

KDIR := /lib/modules/$(shell uname -r)/build
PWD  := $(shell pwd)

all:
	$(MAKE) -C $(KDIR) M=$(PWD) modules

clean:
	$(MAKE) -C $(KDIR) M=$(PWD) clean
```
