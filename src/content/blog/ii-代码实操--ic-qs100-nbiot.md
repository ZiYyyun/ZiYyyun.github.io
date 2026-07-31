---
title: 'IC-QS100-NBIoT'
description: 'Obsidian note: IC-QS100-NBIoT'
pubDate: '2026-07-31'
sourcePath: 'II_代码实操/IC-QS100-NBIoT.md'
tags: ['实操/开发/嵌入式/STM32/项目/牛马定位器', 'IC']
---

### 初始化
	void Int_QS100_Init(void);
配置 QS100 NB-IoT 模块，唤醒并启动 UART 空闲中断接收。

>唤醒模块，脱离低功耗模式
```c
Int_qs100_WakeUp();
```

>启动 UART3 空闲中断接收，等待第一次数据
```c
HAL_StatusTypeDef status = HAL_ERROR;
while (status != HAL_OK)
{
    status = HAL_UARTEx_ReceiveToIdle_IT(&huart3, qs100_small_buffer, MAXSIZE);
}
```

> [!info]
> 上电后模块需要一定时间联网，后续通过 `Int_QS100_IsNetWork` 等待附着网络。

---

### ==唤醒==
	static void Int_QS100_WakeUp(void);
通过拉高 WAKEUP 引脚 3 秒再拉低，唤醒处于低功耗的 QS100 模块。

```c
HAL_GPIO_WritePin(QS100_WAKEUP_GPIO_Port, QS100_WAKEUP_Pin, GPIO_PIN_SET);
Com_Delay_S(3);
HAL_GPIO_WritePin(QS100_WAKEUP_GPIO_Port, QS100_WAKEUP_Pin, GPIO_PIN_RESET);
```
参考：IC-QS100-NB-IoT<!-- [[IC-QS100-NB-IoT]] -->

---

### 中断回调（接收数据）
	void Int_QS100_CallBack(uint16_t sizes);
UART 空闲中断回调，记录本次接收长度，并重新开启下一次接收。

>保存接收长度
```c
qs100_small_size = sizes;
```

>再次启动接收，维持连续接收
```c
HAL_StatusTypeDef status = HAL_ERROR;
while (status != HAL_OK)
{
    status = HAL_UARTEx_ReceiveToIdle_IT(&huart3, qs100_small_buffer, MAXSIZE);
}
```


这个函数实现地很巧妙，乍一看这个函数好像写了个死循环，但是纵观整个中断逻辑来看，当中断触发时，这个callback函数会被触发，执行中断接收任务，有意思的是：==当接收到数据时，就会再一次触发中断==，如此往复比轮询的效率高得多！

```text
[QS100 模块] 发送: "CONNECT OK\r\n+NSONETID:0\r\n\r\nOK\r\n"
      │
      ├─ 第1批到达 -> 触发空闲中断 -> CallBack() -> 记录size, 重启接收
      │                               │
      │                               └─> 主循环发现 size>0 -> 拷贝到 big_buffer -> 清空 size
      │
      ├─ 第2批到达 -> 触发空闲中断 -> CallBack() -> 记录size, 重启接收
      │                               │
      │                               └─> 主循环发现 size>0 -> 追加到 big_buffer -> 检查有没有"OK"
      │
      └─ 第3批到达 -> ...直到主循环在 big_buffer 中找到 "OK" 或 "ERROR"，结束等待。
```

---

### ==发送 AT 命令并等待响应==
	static void Int_qs100_SendATCMD(char *cmd);
发送 AT 命令，等待模块返回完整响应（以 "OK" 或 "ERROR" 结束），超时约 3 秒。

>清空小缓冲区和长度
```c
memset(qs100_small_buffer, 0, strlen((char *)qs100_small_buffer));
qs100_small_size = 0;
memset(qs100_big_buffer, 0, strlen((char *)qs100_big_buffer));
qs100_big_size = 0;
```
调用`memset()`函数，把`qs100_small_buffer`和`qs100_big_buffer`清零

>发送命令
```c
HAL_UART_Transmit_IT(&huart3, (uint8_t *)cmd, strlen(cmd));
```
把转入的AT命令发送给qs100

>等待&判断接收数据
```c
uint8_t cont = 4;
do
{
    while (qs100_small_size == 0 && HAL_GetTick() < 3000);
    if (qs100_small_size == 0) break;
```
定义了一个`count`变量，用于后面计数
这里调用了SysTick定时器，用来计时。
if用于判断是否收到数据


>存入收到的数据
```c
    memcpy(&qs100_big_buffer[qs100_big_size], qs100_small_buffer, strlen((char *)qs100_small_buffer));
    qs100_big_size += qs100_small_size;
```
这里调用`memcpy()`函数把`qs100_small_buffer`里的数据拷贝到`qs100_big_buffer`里
size也加一下

>清除数据
```c
    memset(qs100_small_buffer, 0, strlen((char *)qs100_small_buffer));
    qs100_small_size = 0;
```
上一步收到数据后，`qs100_small_buffer`这个变量还会被用来进行下一次接受，这里把它清零，size也清零

>判断接收状态
```c
} while (strstr((char *)qs100_big_buffer, "OK") == NULL &&
         strstr((char *)qs100_big_buffer, "ERROR") == NULL &&
         cont--);
```
这里使用while语句，与开头do呼应。一共有三个判断条件：`OK` `ERROR` `count=0(超时)`
`count`变量在这里防止无限等待

>打印完整响应（调试用）
```c
COM_LOGLN("全部响应的数据:%s,全部数据的长度:%d", qs100_big_buffer, qs100_big_size);
```


> [!NOTE] Tip
> `do-while`循环会**无条件地先执行一次**循环体内的代码，然后再去检查条件。如果条件成立，就继续下一轮；如果不成立，就退出。适合“==无论如何都要先做一次==”的情况


---

### 判断 QS100 是否已经联网
	QS100_STATE QS100_STATE Int_QS100_IsNetWork(void);

>查询网络附着状态
```c
Int_qs100_SendATCMD("AT+CGATT?\r\n");
```
发送AT命令，判断网络附着状态，参考：


>检查响应中是否包含 "CGATT:1"
```c
if (strstr((char *)qs100_big_buffer, "CGATT:1") != NULL)
{
    return QS100_OK;
}
return QS100_OK
```

### 创建 Socket 通信通道
	QS100_STATE QS100_STATE Int_QS100_CreateSocket(void);

>发送
```c
Int_qs100_SendATCMD("AT+NSOCR=STREAM,6,0,0\r\n");
```

>判断是否创建成功
```c
if (strstr((char *)qs100_big_buffer, "CGATT:1") != NULL)
{
    return QS100_OK;
}
return QS100_ERROR;
```

> [!warning]
> 实际应检测返回的 socket ID，此处简化处理。若模块返回 "OK" 则视为成功。

---

### 连接远程服务器
	QS100_STATE Int_QS100_ConnectServer(char *server_ip, uint16_t port);
>构造连接 AT 命令
```c
char tmp_array[50] = {0};
sprintf(tmp_array, "AT+NSOCO=0,%s,%d\r\n", server_ip, port);
```

>发送命令
```c
Int_qs100_SendATCMD(tmp_array);
```

>检查结果
```c
if (strstr((char *)qs100_big_buffer, "OK") != NULL)
{
    return QS100_OK;
}
return QS100_ERROR;
```

---

### ==上报数据方法==
	QS100_STATE Int_QS100_UploadData2Server(char *data, uint16_t length);
此函数用于把传感器传入的数据转换为十六进制数据，因为QS100芯片的**发送数据**命令规定：
<data>：以十六进制字符串格式发送的数据。<!-- [[III_资源仓库/参考手册/QS-100模块AT命令手册_V1.0.pdf]] -->

>定义变量
```c
uint8_t hex_array[512] = {0};
uint8_t result_array[512] = {0};
```
`hex_array`用于储存传入的数据
`result_array`用于储存转换好的数据

>将数据转为 HEX 字符串

```c

for (uint16_t i = 0; i < length; i++)
{
    sprintf((char *)&hex_array[i * 2], "%02X", data[i]);
}
```
遍历原始数据的每一个字节，把它变成 2 位的大写十六进制字符

> [!NOTE] 举例
> 假设要发送字符串 `"AB"`（在内存里是十进制的 `65` 和 `66` (ASCII码)，十六进制是 `0x41` 和 `0x42`）。
> - 当 `i = 0` 时：取出 `65`，`%02X` 把它变成字符串 `"41"`，写入 `hex_array` 的第 `0` 和 `1` 个位置。
> - 当 `i = 1` 时：取出 `66`，`%02X` 把它变成字符串 `"42"`，写入 `hex_array` 的第 `2` 和 `3` 个位置。

>构造发送命令
```c
sprintf((char *)result_array, "AT+NSOSD=0,%d,%s,0x200\r\n", length, hex_array);
```

>发送并判断
```c
Int_qs100_SendATCMD((char *)result_array);
if (strstr((char *)qs100_big_buffer, "OK") != NULL)
{
    return QS100_OK;
}
return QS100_ERROR;
```

> [!info]
> `0x200` 表示数据发送标志，按模块手册配置。

---

### ==上报数据（完整流程）==
	QS100_STATE Int_QS100_Upload(char *server_ip, uint16_t port, char *data, uint16_t length);
集成联网、创建通道、连接服务器、上报数据的完整流程，带超时与重试。

>1. 等待联网，最多尝试 10 次
```c
uint8_t count = 11;
while (Int_QS100_IsNetWork() != QS100_OK && --count)
{
    Com_Delay_S(1);
}
if (count == 0)
{
    COM_LOGLN("联网超时");
    return QS100_TIMEOUT;
}
COM_LOGLN("联网成功");
```

>2. 创建 socket 通道，重试 10 次
```c
count = 11;
while (Int_QS100_CreateSocket() != QS100_OK && --count)
{
    Com_Delay_S(1);
}
if (count == 0)
{
    COM_LOGLN("创建通道超时");
    return QS100_TIMEOUT;
}
COM_LOGLN("创建通道成功");
```

>3. 连接远程服务器，重试 10 次
```c
count = 11;
while (Int_QS100_ConnectServer(server_ip, port) != QS100_OK && --count)
{
    COM_LOGLN("链接服务器中......");
    Com_Delay_S(1);
}
if (count == 0)
{
    return QS100_TIMEOUT;
}
COM_LOGLN("链接成功");
```

>4. 上报数据一次
```c
QS100_STATE result = Int_QS100_UploadData2Server(data, length);
if (result == QS100_OK)
{
    COM_LOGLN("QS100上报数据成功");
    return QS100_OK;
}
else
{
    COM_LOGLN("QS100上报数据失败");
    return QS100_ERROR;
}
```

### ==低功耗==
#### 进入低功耗
	void Int_QS100_EnterLP(void);

>发送快速休眠指令
```c
Int_qs100_SendATCMD("AT+FASTOFF=0\r\n");
```

> [!note]
> 模块收到后进入低功耗，可通过唤醒引脚退出。
#### 退出低功耗
	void Int_QS100_LeaveLP(void);

>拉高唤醒引脚 3 秒再拉低，退出低功耗
```c
Int_qs100_WakeUp();
```
