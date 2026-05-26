---
title: Debain12开启BBR+FQ
slug: debian12-enable-bbr-fq
translationKey: debian12-enable-bbr-fq
description: "记录在 Debian 12 中通过 sysctl 开启 BBR 拥塞控制与 FQ 队列，并验证配置是否生效。"
date: 2026-01-31
draft: false
tags:
categories:
  - Linux
---

## 1. 修改系统变量

需要将配置写入 `/etc/sysctl.conf` 文件中。使用以下命令一次性添加：

```shell
echo "net.core.default_qdisc=fq" >> /etc/sysctl.conf
echo "net.ipv4.tcp_congestion_control=bbr" >> /etc/sysctl.conf
```

## 2. 使配置生效

执行以下命令刷新系统内核参数：

```shell
sysctl -p
```

## 3. 验证是否开启成功

可以通过以下几个命令来确认配置是否生效：

-   **验证 Qdisc 算法：**

```shell
sysctl net.core.default_qdisc
```

输出应为：`net.core.default_qdisc = fq`

-   **验证拥塞控制算法：**

```shell
sysctl net.ipv4.tcp_congestion_control
```

输出应为：`net.ipv4.tcp_congestion_control = bbr`

-   **检查内核模块是否运行：**

```shell
lsmod | grep bbr
```

如果看到 `tcp_bbr` 相关的输出，说明 BBR 正在运行。

## 为什么选择 BBR + FQ？

-   **BBR** 不像传统的 CUBIC 算法那样通过“丢包”来判断拥塞，而是通过测量**最大带宽**和**最小延迟**来决定发送速率。这在有一定丢包率的远程网络（如你的 VPS 跨境连接）中能显著提升吞吐量。
-   **FQ (Fair Queuing)** 是 BBR 的最佳拍档，它负责流量整形，能有效减少数据包的排队抖动。