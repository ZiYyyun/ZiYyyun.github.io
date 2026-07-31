---
title: 'IC-Ebyte-E220x-LORA收发功能'
description: 'Obsidian note: IC-Ebyte-E220x-LORA收发功能'
pubDate: '2026-07-31'
sourcePath: 'II_代码实操/IC-Ebyte-E220x-LORA收发功能.md'
tags: ['实操/开发/嵌入式/STM32/项目/牛马定位器', '理论/嵌入式/STM32', 'IC']
---

下面三个方法来源于`Int_LoRa.c`文件，看起来很简单，这是在移植了亿佰特的驱动后实现的。
驱动移植参考：IC-Ebytee -E220x驱动移植<!-- [[IC-Ebytee -E220x驱动移植]] -->


### 初始化
	void Int_LoRa_Init(void)

>初始化
```c
    Ebyte_RF.Init();
    Ebyte_E220x_SetLoraSyncWord(0xabcd);
```


### 发送数据
	void Int_LoRa_Send(uint8e_t *buffers, uint8e_t sizes)
>发送数据
```c
    Ebyte_RF.Send(buffers, sizes, 0);
```


### 接受数据
	void Int_LoRa_Poll(void)
>接收数据
```c
    Ebyte_RF.StartPollTask();
```
