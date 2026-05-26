---
title: Mount a Directory Between Two Servers with NFS
slug: nfs-mount-between-two-servers
translationKey: nfs-mount-between-two-servers
description: "Records how to use NFS to export a directory from server A and mount it on server B for directory sharing between two servers."
date: 2026-01-27
draft: false
tags:
categories:
  - Linux
---

Example: mount `/data` from **server A** to `/A_data` on **server B**.

## Server A: allow server B to access the directory

```shell
sudo vim /etc/exports
```

Replace `SERVER_B_IP` with the IP address of server B:

```
/data SERVER_B_IP(rw,sync,no_root_squash)
```

> Example:  
> `/data 10.x.x.x(rw,sync,no_root_squash)`

## Server A: apply the configuration

```shell
sudo exportfs -ra
```

## Server B: mount the directory from server A

```shell
sudo mount -t nfs SERVER_A_IP:/data /A_data
```

> Replace `SERVER_A_IP` with the internal IP address of server A.
