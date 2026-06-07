---
title: 两台服务器相互挂载目录（NFS）
slug: nfs-mount-between-two-servers
translationKey: nfs-mount-between-two-servers
description: "记录如何使用 NFS 将服务器 A 的目录导出并挂载到服务器 B，实现两台服务器之间的目录共享。"
date: 2026-01-27
lastmod: 2026-01-27
draft: false
tags:
  - NFS
  - 目录挂载
  - 文件共享
  - 服务器运维
  - Linux 存储
categories:
  - Linux
---

例子：把 **服务器A** 的 `/data` 挂载到 **服务器B** 的 `/A_data`

## 服务器A：允许服务器B访问

```shell
sudo vim /etc/exports
```

把 `SERVER_B_IP` 换成服务器B的IP：

```
/data SERVER_B_IP(rw,sync,no_root_squash)
```

> 例如：  
> `/data 10.x.x.x(rw,sync,no_root_squash)`

## 服务器A：使配置生效

```shell
sudo exportfs -ra
```

## 服务器B：挂载服务器A的目录

```shell
sudo mount -t nfs SERVER_A_IP:/data /A_data
```

> `SERVER_A_IP` 换成服务器A的内网 IP