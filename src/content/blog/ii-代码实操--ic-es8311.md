---
title: 'IC-ES8311'
description: 'Obsidian note: IC-ES8311'
pubDate: '2026-07-31'
sourcePath: 'II_代码实操/IC-ES8311.md'
tags: ['IC', 'esp32']
---

对于esp32来讲，我们驱动ES8311需要使用[espressif/esp_codec_dev](https://components.espressif.com/components/espressif/esp_codec_dev/versions/1.5.11/readme)组件来实现

---

## 📦 一、 核心组件依赖（**必须添加**）

> **组件**：`espressif/esp_codec_dev` (版本 1.5.11+)  
> **作用**：乐鑫官方提供的音频编解码器抽象层，屏蔽了底层 I2C/I2S 的繁琐配置，统一了 ES8311、ES7210、ES8388 等常见音频芯片的 API。

### ✅ 安装方式
在项目的 `idf_component.yml` 中添加：
```yaml
dependencies:
  espressif/esp_codec_dev: "==1.5.11"
```

---

## 🔧 二、 硬件接口初始化（**需根据硬件修改**）

> **文件**：`xiaozhi_audio.c` (或你的音频驱动文件)  
> **作用**：配置 ESP32 的 I2C（用于控制 ES8311 寄存器）和 I2S（用于传输音频 PCM 数据）。

### ✅ I2C 与 I2S 底层配置
> 初始化函数
	esp_err_t xiaozhi_audio_init(void)
```c
#include "esp_codec_dev.h"
#include "es8311.h"
#include "driver/i2s_std.h"
#include "driver/i2c_master.h"

// 全局句柄
i2s_chan_handle_t tx_handle;
i2s_chan_handle_t rx_handle;
i2c_master_bus_handle_t i2c_bus_handle;
esp_codec_dev_handle_t codec_dev;

esp_err_t xiaozhi_audio_init(void) {
    // 1. 初始化 I2C 总线 (用于配置 ES8311 内部寄存器)
    i2c_master_bus_config_t i2c_mst_config = {
        .clk_source = I2C_CLK_SRC_DEFAULT,
        .i2c_port = I2C_NUM_0,
        .sda_io_num = GPIO_NUM_0,   // ⚠️ 根据你的原理图修改
        .scl_io_num = GPIO_NUM_1,   // ⚠️ 根据你的原理图修改
        .glitch_ignore_cnt = 7,
        .flags.enable_internal_pullup = true,
    };
    i2c_new_master_bus(&i2c_mst_config, &i2c_bus_handle);

    // 2. 初始化 I2S 通道 (用于收发音频 PCM 数据)
    i2s_std_config_t std_cfg = {
        .clk_cfg = I2S_STD_CLK_DEFAULT_CONFIG(16000), // ⚠️ 注意：语音识别通常用 16kHz，别用 48kHz
        .slot_cfg = I2S_STD_PHILIPS_SLOT_DEFAULT_CONFIG( // ES8311 默认使用 Philips (I2S) 协议
            I2S_DATA_BIT_WIDTH_16BIT, I2S_SLOT_MODE_STEREO), // 16位宽，立体声(实际单声道也占两个槽)
        .gpio_cfg = {
            .bclk = GPIO_NUM_2,  // ⚠️ 根据你的原理图修改
            .mclk = GPIO_NUM_3,  // ⚠️ 根据你的原理图修改
            .din  = GPIO_NUM_4,  // ⚠️ 根据你的原理图修改 (ESP32 接收数据)
            .dout = GPIO_NUM_6,  // ⚠️ 根据你的原理图修改 (ESP32 发送数据)
            .ws   = GPIO_NUM_5,  // ⚠️ 根据你的原理图修改
            .invert_flags = { .bclk_inv = false, .mclk_inv = false, .ws_inv = false },
        },
    };

    i2s_chan_config_t i2s_chan_cfg = {
        .id = I2S_NUM_0,
        .role = I2S_ROLE_MASTER, // ESP32 作为主设备，输出 BCLK 和 WS 时钟
        .dma_desc_num = 6,       // DMA 描述符数量
        .dma_frame_num = 240,    // 每个 DMA 块的帧数 (单块大小 = 240 * 2声道 * 2字节 = 960字节)
        .auto_clear = true,      // 发送空闲时自动填 0 (静音)
    };
    
    // 同时创建 TX 和 RX 通道
    i2s_new_channel(&i2s_chan_cfg, &tx_handle, &rx_handle);
    i2s_channel_init_std_mode(tx_handle, &std_cfg);
    i2s_channel_init_std_mode(rx_handle, &std_cfg);
    
    // 启用通道
    i2s_channel_enable(tx_handle);
    i2s_channel_enable(rx_handle);

    // ... (接第三部分 Codec 初始化)
```

---

## 🎵 三、 Codec 驱动层绑定（**无需修改引脚，直接抄**）

> **作用**：将上一步初始化的 I2S（数据流）和 I2C（控制流）绑定到 `esp_codec_dev` 框架，并实例化 ES8311 驱动。

```c
    // 3. 将 I2S 句柄绑定到 Codec 数据接口
    audio_codec_i2s_cfg_t i2s_cfg = {
        .tx_handle = tx_handle,
        .rx_handle = rx_handle,
    };
    const audio_codec_data_if_t *data_if = audio_codec_new_i2s_data(&i2s_cfg);

    // 4. 将 I2C 句柄绑定到 Codec 控制接口
    audio_codec_i2c_cfg_t i2c_cfg = {
        .bus_handle = i2c_bus_handle,
        .addr = ES8311_CODEC_DEFAULT_ADDR // 默认地址通常是 0x18 或 0x19，取决于硬件拉高/拉低
    };
    const audio_codec_ctrl_if_t *ctrl_if = audio_codec_new_i2c_ctrl(&i2c_cfg);
    const audio_codec_gpio_if_t *gpio_if = audio_codec_new_gpio();

    // 5. 实例化 ES8311 芯片驱动
    es8311_codec_cfg_t es8311_cfg = {
        .ctrl_if = ctrl_if,
        .gpio_if = gpio_if,
        .codec_mode = ESP_CODEC_DEV_WORK_MODE_BOTH, // 同时支持 ADC(录音) 和 DAC(播放)
        .pa_pin = GPIO_NUM_7, // ⚠️ 功放(PA)使能引脚，如果没有功放可设为 GPIO_NUM_NC
    };
    const audio_codec_if_t *es8311_if = es8311_codec_new(&es8311_cfg);

    // 6. 组装最终的 Codec 设备句柄
    esp_codec_dev_cfg_t dev_cfg = {
        .codec_if = es8311_if,
        .data_if = data_if,
        .dev_type = ESP_CODEC_DEV_TYPE_IN_OUT,
    };
    codec_dev = esp_codec_dev_new(&dev_cfg);

    // 7. 打开设备并设置基础参数
    esp_codec_dev_sample_info_t fs = {
        .sample_rate = 16000, // 采样率：16kHz (小智AI语音对话标准采样率)
        .channel = 1,         // 实际有效声道数 (单声道)
        .bits_per_sample = 16,// 16位深
    };
    esp_codec_dev_open(codec_dev, &fs);
    
    // 设置默认音量和麦克风增益
    esp_codec_dev_set_out_vol(codec_dev, 60.0); // 扬声器音量 0~100
    esp_codec_dev_set_in_gain(codec_dev, 30.0); // 麦克风增益 (dB)，如果录音声音小可以调大

    return ESP_OK;
}
```

---

## 🎙️ 四、 业务层 API（**直接调用**）

> **作用**：封装好录音和播放接口，供上层（如小智 AI 的主循环、WebSocket 任务）直接调用。

### ✅ 音频读写与反初始化
> 录音
	esp_err_t xiaozhi_audio_read(int16_t *buffer, size_t samples)
```c
// 录音：从 ES8311 读取 PCM 数据
 {
    // samples 是采样点个数，需要乘以每个采样点的字节数 (16bit = 2 bytes)
    size_t bytes = samples * sizeof(int16_t);
    return esp_codec_dev_read(codec_dev, buffer, bytes);

```

> 播放
	esp_err_t xiaozhi_audio_play(int16_t *buffer, size_t samples)
```c
// 播放：将 PCM 数据写入 ES8311 输出
    size_t bytes = samples * sizeof(int16_t);
    return esp_codec_dev_write(codec_dev, buffer, bytes);
```

> 
	void xiaozhi_audio_deinit(void)
```c
    if (codec_dev) {
        esp_codec_dev_close(codec_dev);
        esp_codec_dev_delete(codec_dev);
        codec_dev = NULL;
    }
    // 释放 I2S 和 I2C 句柄 (略，按需补充)
```

---

> ⚠️ **关键提示（牛马防坑指南）**：
> 
> 1. **采样率必须统一**：  
>    你原代码里 I2S 配置的是 `48000`，但 `esp_codec_dev_open` 里写的是 `16000`。**这会导致录音播放全是杂音或变调！** 做语音对话（如小智）统一改成 `16000`。
> 2. **I2C 地址与速率**：  
>    原代码 `scl_speed_hz = 10000.` 带了小数点且速率太慢，建议改成 `400000` (400kHz)。另外 ES8311 的默认地址通常是 `0x18`（ADDR 引脚接地）或 `0x19`（ADDR 接高），如果初始化报错 `ESP_ERR_NOT_FOUND`，用逻辑分析仪抓一下 I2C 看看地址对不对。
> 3. **I2S 协议选择**：  
>    ES8311 默认走的是 **Philips (标准 I2S)** 协议，原代码里用了 `I2S_STD_MSB_SLOT` (MSB Justified)，这会导致左右声道数据错位！一定要改成 `I2S_STD_PHILIPS_SLOT_DEFAULT_CONFIG`。
> 4. **单声道 vs 立体声**：  
>    虽然麦克风是单声道，但 I2S 传输时通常占满左右两个槽（Stereo）。在 `esp_codec_dev_sample_info_t` 中 `.channel = 1` 告诉驱动只处理左声道（或右声道）的有效数据，底层 I2S 依然按 Stereo 跑，这样最稳定。
