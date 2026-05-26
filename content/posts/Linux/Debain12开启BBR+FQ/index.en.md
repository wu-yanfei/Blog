---
title: Enable BBR + FQ on Debian 12
slug: debian12-enable-bbr-fq
translationKey: debian12-enable-bbr-fq
description: "Records how to enable BBR congestion control and the FQ queue discipline on Debian 12 with sysctl, and how to verify that the configuration is active."
date: 2026-01-31
draft: false
tags:
categories:
  - Linux
---

## 1. Modify system variables

Write the configuration into `/etc/sysctl.conf`. You can append both settings with the following commands:

```shell
echo "net.core.default_qdisc=fq" >> /etc/sysctl.conf
echo "net.ipv4.tcp_congestion_control=bbr" >> /etc/sysctl.conf
```

## 2. Apply the configuration

Run the following command to reload kernel parameters:

```shell
sysctl -p
```

## 3. Verify whether it was enabled successfully

You can use the following commands to confirm that the configuration has taken effect:

-   **Verify the Qdisc algorithm:**

```shell
sysctl net.core.default_qdisc
```

The output should be: `net.core.default_qdisc = fq`

-   **Verify the congestion control algorithm:**

```shell
sysctl net.ipv4.tcp_congestion_control
```

The output should be: `net.ipv4.tcp_congestion_control = bbr`

-   **Check whether the kernel module is running:**

```shell
lsmod | grep bbr
```

If you see output related to `tcp_bbr`, BBR is running.

## Why choose BBR + FQ?

-   **BBR** does not detect congestion through packet loss like the traditional CUBIC algorithm. Instead, it measures **maximum bandwidth** and **minimum latency** to determine the sending rate. This can significantly improve throughput on remote networks with some packet loss, such as cross-border VPS connections.
-   **FQ (Fair Queuing)** is the best companion for BBR. It handles traffic shaping and can effectively reduce packet queueing jitter.
