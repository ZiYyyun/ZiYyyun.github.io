---
title: 'PID计算实现'
description: 'Obsidian note: PID计算实现'
pubDate: '2026-07-30'
sourcePath: 'II_代码实操/PID计算实现.md'
---

#实操/开发 
PID的主要输入参数就是`current_speed`和`target_speed`，因为我们要将电机加速到目标速度，然而电机的加速需要`pulse(频率)`来控制，PID公式就是用来输出这个的

---


有关PID公式，参考Math-PID<!-- [[Math-PID]] -->
### 数据声明
```c
typedef struct
{
    float kp;
    float ki;
    float kd;
    float error;
    float last_error;
    float integral;
} PID_t;
```

> 别忘了把PID参数结构体嵌入到电机数据结构体中

```c
typedef struct
{
    float current_speed_rpm; // 当前速度
    float target_speed_rpm;  // 目标速度
    float max_speed_rpm;     // 最大速度
    float accel_rpm_s;       // 加速度
    float decel_rpm_s;       // 减速度
    float target_angle;      // 目标角度（单位：度，支持小数）
    float current_angle;     // 当前角度
    int32_t encoder_cnt;     // 编码器计数
    MotorDir_t direction;    // 方向
    MotorState_t state;      // 状态
	    PID_t speed_pid;              // PID控制器参数
} Motor_t;
```

> 计算误差

```c
PID_t *pid = &motor.speed_pid;
pid->error =  
	motor.target_speed_rpm -  
	motor.current_speed_rpm;
```


> 计算P项
$$
P=Kp⋅e(t)
$$

```c
float p =  
	pid->kp *  
	pid->error;

```


>计算I项
$$
I=Ki​∫e(t)dt
$$

```c
pid->integral += pid->error;  
  
float i =  
	pid->ki *  
	pid->integral;
```
这个integral就代表I，

> 计算D项

$$
D=Kd​(ek​−ek−1​)
$$

```c
float d =  
	pid->kd *  
	(pid->error - pid->last_error);
```


> 三项相加

TODO

Output=Kp​e(t)+Ki​∫e(t)dt+Kd​dtde(t)​
$$
Output=Kp​e(t)+Ki​∫e(t)dt+Kd​dtde(t)​
$$
                 %% 即 output = P + I + D %%
```c    
float output =  p +  i +  d;  

pid->last_error =  
	pid->error;  
return output;
```

### PID计算后处理
	void Motor_PID_Process(void)
```c
    static uint32_t last_tick = 0;
    if (HAL_GetTick() - last_tick < 50)
	    {
	        return;
	    }
    last_tick = HAL_GetTick();
    Motor_UpdateSpeed();
    float pid_output = Motor_CalculatePID();
    uint32_t freq = motor.target_speed_rpm * 200.0f * 16.0f / 60.0f;
    freq += (uint32_t)pid_output;
    BSP_Motor_SetPulseFreq(freq);
```
