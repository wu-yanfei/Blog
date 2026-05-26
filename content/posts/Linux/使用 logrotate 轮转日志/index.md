---
title: 使用 logrotate 轮转日志
slug: logrotate-rotate-logs
translationKey: logrotate-rotate-logs
description: "记录 Debian 12 中安装和配置 logrotate 的方法，包括自定义日志轮转、copytruncate 以及手动测试配置。"
date: 2026-03-24
draft: false
tags:
categories:
  - Linux
---

> 以 Debian 12 为例子

## 安装

先确认有没有安装

```shell
sudo apt update
sudo apt install logrotate
```

查看版本

```shell
logrotate --version
```

## 全局配置位置

主配置文件

```
/etc/logrotate.conf
```


单个服务/程序的配置目录

```
/etc/logrotate.d/
```

一般不要直接改主配置，通常是在 `/etc/logrotate.d/` 里给你的程序单独写一个配置文件

## **示例：给自定义日志设置轮转**

假设你的应用日志是

```
/var/log/myapp/*.log
```

创建配置文件

```
sudo nano /etc/logrotate.d/myapp
```

写入

```
/var/log/myapp/*.log {  
    daily  
    rotate 7  
    compress  
    delaycompress  
    missingok  
    notifempty  
    create 0640 root adm  
}
```

### **各参数说明**

-   `daily`：每天轮转一次
-   `rotate 7`：保留 7 份旧日志
-   `compress`：旧日志压缩
-   `delaycompress`：下一次轮转时再压缩上一份
-   `missingok`：日志不存在也不报错
-   `notifempty`：空日志不轮转
-   `create 0640 root adm`：轮转后新建日志文件，并设置权限/属主/属组

## **如果程序一直占用日志文件**

有些程序不会自动重新打开日志文件，这时可以加

```
copytruncate
```

例如

```
/var/log/myapp/*.log {  
    daily  
    rotate 7  
    compress  
    missingok  
    notifempty  
    copytruncate  
}
```

### `copytruncate` **的作用**

先复制当前日志，再把原文件清空。 适合不支持“重开日志文件”的程序。

## **手动测试配置**

检查语法是否正确

```shell
sudo logrotate -d /etc/logrotate.conf
```

强制执行一次轮转

```
sudo logrotate -f /etc/logrotate.conf
```

如果没报错，基本就好了

看日志目录

```
ls -lh /var/log/myapp/
```

你会看到类似

```
app.log  
app.log.1  
app.log.2.gz
```