---
title: 'IMX6ULL-汇编LED实验'
description: 'Obsidian note: IMX6ULL-汇编LED实验'
pubDate: '2026-07-30'
sourcePath: 'II_代码实操/IMX6ULL-汇编LED实验.md'
---

#实操/开发/嵌入式/LINUX 
### STM32 GPIO回顾
> 在学习 I.MX6U的 GPIO 之前，我们先来回顾一下 STM32 的 GPIO 初始化
```c
                      示例代码 8.1.1.1 STM32 GPIO 初始化
1 void LED_Init(void)
2 {
3 GPIO_InitTypeDef GPIO_InitStructure;
4
5 RCC_APB2PeriphClockCmd(RCC_APB2Periph_GPIOB, ENABLE);//使能 PB 端口时钟
6
7 GPIO_InitStructure.GPIO_Pin = GPIO_Pin_5;
//PB5 端口配置
8 GPIO_InitStructure.GPIO_Mode = GPIO_Mode_Out_PP; //推挽输出
9 GPIO_InitStructure.GPIO_Speed = GPIO_Speed_50MHz; //IO 口速度
10 GPIO_Init(GPIOB, &GPIO_InitStructure); //根据设定参数初始化 GPIOB.5
11
12 GPIO_SetBits(GPIOB,GPIO_Pin_5); //PB.5 输出高
13 }
```
可以看出上述代码进行的操作有：
- 使能指定GPIO的时钟
- 初始化GPIO
- 配置IO复用
- 配置IO电平高/低
### IMX6U IO命名



从上图可见，IO分为两类：SNVS的和通用的，这两类IO的本质都一样


```assembly
    .global _start           // 入口符号，程序从这里开始执行

/*
 * _start 函数：初始化 GPIO 并点亮 LED
 */
_start:
    // 1. 使能所有时钟（CCGR0 ~ CCGR6）
    ldr r0, =0x020C4068      // CCGR0
    ldr r1, =0xFFFFFFFF
    str r1, [r0]

    ldr r0, =0x020C406C      // CCGR1
    str r1, [r0]

    ldr r0, =0x020C4070      // CCGR2
    str r1, [r0]

    ldr r0, =0x020C4074      // CCGR3
    str r1, [r0]

    ldr r0, =0x020C4078      // CCGR4
    str r1, [r0]

    ldr r0, =0x020C407C      // CCGR5
    str r1, [r0]

    ldr r0, =0x020C4080      // CCGR6
    str r1, [r0]

    // 2. 设置 GPIO1_IO03 的复用为 GPIO 功能（MUX_MODE = 5）
    ldr r0, =0x020E0068      // SW_MUX_CTL_PAD_GPIO1_IO03
    ldr r1, =0x5             // ALT5 = GPIO
    str r1, [r0]

    // 3. 配置 GPIO1_IO03 的电气属性
    ldr r0, =0x020E02F4      // SW_PAD_CTL_PAD_GPIO1_IO03
    ldr r1, =0x10B0          // 电气配置位（见寄存器手册）
    str r1, [r0]

    // 4. 设置 GPIO1_IO03 为输出模式
    ldr r0, =0x0209C004      // GPIO1_GDIR 寄存器
    ldr r1, =0x00000008      // 第3位（GPIO1_IO03）设为输出
    str r1, [r0]

    // 5. 输出低电平 —— 点亮 LED（GPIO1_DR = 0）
    ldr r0, =0x0209C000      // GPIO1_DR 数据寄存器
    ldr r1, =0x00000000
    str r1, [r0]

loop:
    b loop                   // 死循环，防止程序跑飞

```

```cmake
CROSS ?= armv7l-unknown-linux-gnueabihf-
AS     = $(CROSS)as
LD     = $(CROSS)ld
OBJCOPY = $(CROSS)objcopy

ASFLAGS = -mcpu=cortex-a7 -g
LDFLAGS = -Ttext=0x87800000 -nostdlib

SRC = led.s
OBJ = led.o
TARGET = led.elf
BIN = led.bin

all: $(BIN)

$(OBJ): src/$(SRC)
	$(AS) $(ASFLAGS) -o $@ $<

$(TARGET): $(OBJ)
	$(LD) $(LDFLAGS) -o $@ $^

$(BIN): $(TARGET)
	$(OBJCOPY) -O binary $< $@

clean:
	rm -f *.o *.elf *.bin

```
