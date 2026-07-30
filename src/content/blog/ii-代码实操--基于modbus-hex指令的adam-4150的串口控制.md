---
title: '基于Modbus_HEX指令的ADAM-4150的串口控制'
description: 'Obsidian note: 基于Modbus_HEX指令的ADAM-4150的串口控制'
pubDate: '2026-07-30'
sourcePath: 'II_代码实操/基于Modbus_HEX指令的ADAM-4150的串口控制.md'
---

#Python

### 十六进制指令格式

我们使用Modbus RTU协议，通过串口发送指令来控制设备。指令格式一般如下：
#### DO指令

| 地址  | 功能码 | 寄存器地址high | 寄存器地址low | 数据high | 数据low | CRC16high | CRC16low |
| --- | --- | --------- | -------- | ------ | ----- | --------- | -------- |
| 01  | XX  | 00        | XX       | FF     | 00    | CRC高字节    | CRC低字节   |
| 01  | XX  | 00        | XX       | 00     | 00    | CRC高字节    | CRC低字节   |
- **地址（Address）**：通常是设备的Modbus地址。例如，`01`表示设备地址为1。
- **功能码（Function Code）**：表示执行的操作。例如，`05`表示写单个线圈。
- **寄存器地址（Register Address）**：表示要操作的寄存器。例如，`0005`表示DO5端口。
- **数据（Data）**：`FF 00`表示打开，`00 00`表示关闭。
- **CRC16校验码（CRC16）**：用于错误检测，必须正确计算并附加到指令末尾。

#### DI指令
| 地址  | 功能码 | 起始地址高字节 | 起始地址低字节 | 寄存器长度高字节 | 寄存器长度低字节 | CRC高字节 | CRC低字节 |
| --- | --- | ------- | ------- | -------- | -------- | ------ | ------ |
| 01  | 02  | 00      | 00      | 00       | 07       | CRC高字节 | CRC低字节 |
- **地址 (01)**：设备的Modbus地址（1）。
- **功能码 (02)**：读取离散输入。
- **起始地址高字节 (00)**：读取起始地址的高字节部分。
- **起始地址低字节 (00)**：读取起始地址的低字节部分。
- **寄存器数量高字节 (00)**：读取的寄存器数量的高字节部分。
- **寄存器数量低字节 (07)**：读取的寄存器数量的低字节部分，表示读取7个寄存器。
- **CRC高字节**：CRC校验码的高字节部分。
- **CRC低字节**：CRC校验码的低字节部分。
### 地址
>   地址用于指定通信中的目标设备。每个Modbus设备都有一个唯一的地址，通常范围是1到247。


### 功能码
功能码用于指定要执行的操作类型。不同的功能码代表不同的指令。

| 功能码 | 描述                                |
| --- | --------------------------------- |
| 01  | 读取线圈状态 (Read Coils)               |
| 02  | 读取离散输入 (Read Discrete Inputs)     |
| 03  | 读取保持寄存器 (Read Holding Registers)  |
| 04  | 读取输入寄存器 (Read Input Registers)    |
| 05  | 写单个线圈 (Write Single Coil)         |
| 06  | 写单个保持寄存器 (Write Single Register)  |
| 0F  | 写多个线圈 (Write Multiple Coils)      |
| 10  | 写多个寄存器 (Write Multiple Registers) |


### DO指令
#### 寄存器地址
  下表为ADAM-4150寄存器地址：

| Location | Type | Value | Description |
| -------- | ---- | ----- | ----------- |
| 00017    | Bit  | 0     | DO-0        |
| 00018    | Bit  | 0     | DO-1        |
| 00019    | Bit  | 0     | DO-2        |
| 00020    | Bit  | 0     | DO-3        |
| 00021    | Bit  | 0     | DO-4        |
| 00022    | Bit  | 1     | DO-5        |
| 00023    | Bit  | 0     | DO-6        |
| 00024    | Bit  | 0     | DO-7        |
> 换算公式:  `DO`x  = ( `000xx`-`00001` )DEC  =>  (`xx`)HEX
>   即表中地址减去偏移量再转换为十六进制
#### 数据位
- `FF` `00` 代表打开
- `00` `00` 代表关闭
### DI指令

#### 起始地址
 取决于传感器
#### 寄存器长度
  取决于传感器
### CRC校验码
>   CRC（循环冗余校验）是一种用于检测和校验数据传输中错误的算法。在Modbus协议中，CRC16校验码被广泛应用，以确保数据在传输过程中没有发生错误或被篡改。
#### CRC校验码的计算
```python
import crcmod

def compute_crc(command):
    # 创建一个CRC16 Modbus函数
    crc16 = crcmod.predefined.mkCrcFun('modbus')
    # 计算CRC值
    crc = crc16(command)
    # 将CRC值转换为两个字节的小端格式
    return crc.to_bytes(2, byteorder='little')

# 示例指令：读取DI状态
command_hex = '01 02 00 00 00 07'
command = bytes.fromhex(command_hex)

# 计算CRC并附加到指令末尾
crc = compute_crc(command)
command_with_crc = command + crc

print("原始指令:", command.hex())
print("CRC校验码:", crc.hex())
print("带CRC的完整指令:", command_with_crc.hex())

```
