---
title: 'IC-ATGM336H-六合一卫星定位'
description: 'Obsidian note: IC-ATGM336H-六合一卫星定位'
pubDate: '2026-08-05'
sourcePath: 'II_代码实操/IC-ATGM336H-六合一卫星定位.md'
tags: ['IC']
---

> 全局宏定义&变量声明

```c
#define PI 3.14159265358979324f
#define A 6378245.0f               // 长半轴
#define EE 0.00669342162296594323f // 偏心率平方

// 接收定位数据的缓冲
uint8_t loc_buff[LOC_BUFF_MAX_SIZE] = {0};

// 缓冲中数据的长度
uint16_t loc_len = 10;
```


> 回调函数

	void Inf_ATGM336H_Callback(uint16_t size)
```c
  loc_len = size;
  HAL_UARTEx_ReceiveToIdle_IT(&huart2, loc_buff, LOC_BUFF_MAX_SIZE); //[!DESCRIBE]开启下一次接收
```


> 发送函数

	static void Inf_ATGM336H_Send(uint8_t *cmd, uint8_t size)
```c
  uint8_t crccode = 0;
  for (uint8_t i = 0; i < size; i++) {
    crccode ^= cmd[i];
  }

  uint8_t datas[30] = {0};
  sprintf((char *)datas, "$%s*%X\r\n", cmd, crccode); //[!DESCRIBE]对字符串进行拼接，参考下面格式

  HAL_UART_Transmit(&huart2, datas, strlen((char *)datas), 1000);
```

> [!PDF|yellow] Prot-中科微-CASIC多模卫星导航接收机协议规范-20210301, p.28<!-- [[Prot-中科微-CASIC多模卫星导航接收机协议规范-20210301.pdf]] -->
> 格式
> ```
> $PCAS04,mode*hh<CR><LF>
> ```
> 示例：
> ```c
> $PCAS04,1*18 //[!DESCRIBE]单 GPS 工作模式
> ```

> 初始化函数

```c
  HAL_UARTEx_ReceiveToIdle_IT(&huart2, loc_buff, LOC_BUFF_MAX_SIZE);
  Inf_ATGM336H_Send("PCAS04,3", 8);   //[!DESCRIBE]指定GPS芯片模式: BD+GPS双模式
  Inf_ATGM336H_Send("PCAS02,1000", 11);  //[!DESCRIBE]指定定位频率[1s一次定位数据]
```


> 判断是否在境内

	static bool outOfChina(float lat, float lon)
```c
  if (lon < 72.004f || lon > 137.8347f)
    return true;
  if (lat < 0.8293f || lat > 55.8271f)
    return true;
  return false;
```



> 格式转换

	void wgs84_to_gcj02(float wgLat, float wgLon, float *mgLat, float *mgLon)
```c
  if (outOfChina(wgLat, wgLon)) {    //[!DESCRIBE]不转换境外地址
    *mgLat = wgLat;
    *mgLon = wgLon;
    return;
  }

  float dLat = transformLat(wgLon - 105.0f, wgLat - 35.0f);
  float dLon = transformLon(wgLon - 105.0f, wgLat - 35.0f);

  float radLat = wgLat / 180.0f * PI;
  float magic = sinf(radLat);
  magic = 1.0f - EE * magic * magic;
  float sqrtMagic = sqrtf(magic);

  dLat = (dLat * 180.0f) / ((A * (1.0f - EE)) / (magic * sqrtMagic) * PI);
  dLon = (dLon * 180.0f) / (A / sqrtMagic * cosf(radLat) * PI);
  
  *mgLat = wgLat + dLat;
  *mgLon = wgLon + dLon;
```


> 维度偏移量转换

	static float transformLat(float x, float y)
```c
  float ret = -100.0f + 2.0f * x + 3.0f * y + 0.2f * y * y + 0.1f * x * y +
              0.2f * sqrtf(fabsf(x));
  ret +=
      (20.0f * sinf(6.0f * x * PI) + 20.0f * sinf(2.0f * x * PI)) * 2.0f / 3.0f;
  ret += (20.0f * sinf(y * PI) + 40.0f * sinf(y / 3.0f * PI)) * 2.0f / 3.0f;
  ret += (160.0f * sinf(y / 12.0f * PI) + 320.0f * sinf(y * PI / 30.0f)) *
         2.0f / 3.0f;
  return ret;
```
