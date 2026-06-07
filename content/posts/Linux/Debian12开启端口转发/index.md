---
title: Debian12开启端口转发
slug: debian12-nftables-port-forwarding
translationKey: debian12-nftables-port-forwarding
description: "记录在 Debian 12 中开启 IP 转发，并使用 nftables 将本机端口转发到目标服务器端口的配置方法。"
date: 2026-02-02
lastmod: 2026-02-02
draft: false
tags:
  - Debian
  - 端口转发
  - nftables
  - IP 转发
  - 网络配置
categories:
  - Linux
---

> 使用nftables转发10443端口到某个ip的443端口为例子

## 开启转发功能

1.  编辑文件

```shell
sudo nano /etc/sysctl.conf
```

打开下面的选项

```
net.ipv4.ip_forward=1
```

2.  使配置生效，运行命令`sudo sysctl -p`

## 进行端口转发

1.  编辑配置文件

```shell
sudo nano /etc/nftables.conf
```

加入如下配置，`xx.xx.xx.xx`是你要转入的ip，回程也同样经过本机

```
table ip nat {  
        chain prerouting {  
                type nat hook prerouting priority -100;  
  
                tcp dport 10443 dnat to xx.xx.xx.xx:443  
        }  
  
        chain postrouting {  
                type nat hook postrouting priority 100;  
  
                ip daddr xx.xx.xx.xx tcp dport 443 masquerade  
        }  
}
```

2.  使配置生效

```shell
sudo nft -f /etc/nftables.conf
```

## 查看是否成功

运行下面的命令，即可看到相关转发规则

```shell
sudo nft list ruleset
```