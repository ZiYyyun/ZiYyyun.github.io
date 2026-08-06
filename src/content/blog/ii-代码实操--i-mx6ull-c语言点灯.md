---
title: 'i.MX6ULL-C语言点灯'
description: 'Obsidian note: i.MX6ULL-C语言点灯'
pubDate: '2026-08-05'
sourcePath: 'II_代码实操/i.MX6ULL-C语言点灯.md'
tags: ['NXP']
---

> [!NOTE] 点灯流程
```
开时钟 → 配置引脚复用 → 设置电气属性 → 设置 GPIO 方向 → 输出高低电平。
```

---

### 寄存器配置
#### 时钟
点灯需要首先使能时钟，用到的寄存器有`CCM_CCGR0`到`CCM_CCGR6`，在手册中我们可以看到地址：
> (NXP-IMX6ULLRM, p.700<!-- [[NXP-IMX6ULLRM.pdf]] -->)
> Address: 20C_4000h base + 6Ch offset = 20C_406Ch

于是宏定义：
```c
#define CCM_CCGR1 *((volatile unsigned int *)0X020C406C)
#define CCM_CCGR2 *((volatile unsigned int *)0x020C4070)
#define CCM_CCGR3 *((volatile unsigned int *)0x020C4074)
#define CCM_CCGR4 *((volatile unsigned int *)0x020C4078)
#define CCM_CCGR5 *((volatile unsigned int *)0X020C407C)
#define CCM_CCGR6 *((volatile unsigned int *)0x020C4080)
```

### 引脚复用
引脚复用由`IOMUX`寄存器控制。我们这里需要配置`GPIO1_PIN3`，那么就对应`IOMUXC_SW_MUX_CTL_PAD_GPIO1_IO03`这个寄存器，它的地址在：
> (NXP-IMX6ULLRM, p.1571<!-- [[NXP-IMX6ULLRM.pdf]] -->)
> Address: 20E_0000h base + 68h offset = 20E_0068h

```c
#define SW_MUX_GPIO1_IO03 *((volatile unsigned int *)0x020E0068)
```

### 电气特性
电气特性指的是这些：
- 驱动能力（强弱）
- 上下拉电阻 / 高阻
- 信号速率（高速 / 低速）
- 施密特滞回 HYS（抗干扰）
也需要在`IOMUX`寄存器中配置。我们目标寄存器是`IOMUXC_SW_PAD_CTL_PAD_GPIO1_IO03`
```c
#define SW_PAD_GPIO1_IO03 *((volatile unsigned int *)0X020E02F4)
```

#### 使能GPIO输出

```c
#define GPIO1_GDIR   *((volatile unsigned int *)0x0209C004) //[!DESCRIBE] GPIO1 方向寄存器：配置输入0 / 输出1
#define GPIO1_DR     *((volatile unsigned int *)0x0209C000)  //[!DESCRIBE]GPIO1 数据寄存器：控制引脚输出高低电平
```


### 编写主程序
```c
void clk_enable(void) {
  CCM_CCGR1 = 0xffffffff;
  CCM_CCGR2 = 0xffffffff;
  CCM_CCGR3 = 0xffffffff;
  CCM_CCGR4 = 0xffffffff;
  CCM_CCGR5 = 0xffffffff;
  CCM_CCGR6 = 0xffffffff;
}

void led_init(void) {
  SW_MUX_GPIO1_IO03 = 0x05; // 配置引脚复用：gpio1pin3
  SW_PAD_GPIO1_IO03 = 0x10B0;
  GPIO1_GDIR = 0x0000008;
  GPIO1_DR = 0x0;
}

void led_on(void) { GPIO1_DR = ~(1 << 3); }
void led_off(void) { GPIO1_DR |= (1 << 3); }
void delay_short(volatile unsigned int n) {
  while (n--) { }
}
```

### Makefile文件

```makefile
objs := start.o main.o
ledc.bin:$(objs)
    arm-linux-gnueabihf-ld -Ttext 0X87800000 -o ledc.elf $^
    arm-linux-gnueabihf-objcopy -O binary -S ledc.elf $@
    arm-linux-gnueabihf-objdump -D -m arm ledc.elf > ledc.dis
%.o:%.s
    arm-linux-gnueabihf-gcc -Wall -nostdlib -c -o $@ $<
%.o:%.S
    arm-linux-gnueabihf-gcc -Wall -nostdlib -c -o $@ $<
%.o:%.c
    arm-linux-gnueabihf-gcc -Wall -nostdlib -c -o $@ $<
clean:
    rm -rf *.o ledc.bin ledc.elf ledc.dis
```
