---
title: Debian12 创建只能通过 SSH 转发指定端口的账号
slug: debian12-ssh-tunnel-only-user
translationKey: debian12-ssh-tunnel-only-user
description: 记录在 Debian 12 VPS 上创建一个只能通过密码登录进行一个或多个指定端口 SSH 本地转发、不能登录 shell 的专用账号。
date: 2026-06-09
lastmod: 2026-06-09
draft: false
tags:
  - Debian
  - SSH
  - 端口转发
  - VPS
  - 安全加固
categories:
  - Linux
---

有时 VPS 上的某个服务只监听在本机地址，或者没有对外开放端口，例如：

```text
VPS 内部服务：127.0.0.1:8080
外网无法直接访问：VPS公网IP:8080
```

这种情况下可以通过 SSH 本地端口转发访问它：

```text
本地电脑 127.0.0.1:18080 -> SSH -> VPS 127.0.0.1:8080
```

本文记录如何在 Debian 12 VPS 上创建一个专用账号，使它只能通过密码登录建立这个 SSH 隧道，不能登录 shell，不能执行命令，也不能转发未允许的端口。

> 下面以 VPS 内部服务端口 `8080`、本地映射端口 `18080`、专用用户 `tunnel-user` 为例。实际使用时按需替换。

## 1. 创建专用用户

在 VPS 上执行：

```shell
sudo adduser --gecos "" --shell /usr/sbin/nologin tunnel-user
```

命令执行过程中会提示设置密码。这里建议使用足够强的随机密码。

如果用户已经存在，可以单独修改密码：

```shell
sudo passwd tunnel-user
```

这里把 shell 设置为 `/usr/sbin/nologin`，目的是避免这个用户获得正常交互式 shell。

## 2. 配置 SSH 只允许转发指定端口

编辑 SSH 服务端配置：

```shell
sudo nano /etc/ssh/sshd_config
```

在文件末尾添加：

```sshconfig
Match User tunnel-user
    AuthenticationMethods password
    PasswordAuthentication yes
    PubkeyAuthentication no
    KbdInteractiveAuthentication no
    PermitEmptyPasswords no

    AllowTcpForwarding local
    PermitOpen 127.0.0.1:8080 localhost:8080

    AllowStreamLocalForwarding no
    X11Forwarding no
    AllowAgentForwarding no
    PermitTunnel no
    PermitTTY no
    PermitUserRC no

    MaxSessions 0
```

关键配置说明：

- `AuthenticationMethods password`：这个用户只使用密码认证。
- `PasswordAuthentication yes`：允许这个用户使用密码登录 SSH。
- `PubkeyAuthentication no`：禁止这个用户使用密钥登录。
- `AllowTcpForwarding local`：只允许本地端口转发，也就是 `ssh -L`。
- `PermitOpen 127.0.0.1:8080`：只允许连接 VPS 上的 `127.0.0.1:8080`。
- `PermitOpen localhost:8080`：兼容客户端转发命令里写 `localhost:8080` 的情况。
- `MaxSessions 0`：禁止 shell、远程命令和 SFTP，但仍允许端口转发。
- `PermitTTY no`：禁止分配终端。

这样配置后，这个账号只能用来建立到指定端口的 SSH 隧道。

## 3. 检查配置并重载 SSH

修改 SSH 配置后，先检查语法：

```shell
sudo /usr/sbin/sshd -t
```

如果没有输出，说明配置语法正常。

然后重载 SSH：

```shell
sudo systemctl reload ssh
```

Debian 上 SSH 服务名通常是 `ssh`。

> 修改 SSH 配置时，建议不要关闭当前已经登录的 SSH 窗口。先开一个新终端测试新配置，确认可用后再关闭旧连接。

## 4. 在本地电脑建立端口转发

在本地电脑执行：

```shell
ssh -N \
  -o PubkeyAuthentication=no \
  -o PreferredAuthentications=password \
  -o ExitOnForwardFailure=yes \
  -L 18080:127.0.0.1:8080 \
  tunnel-user@your_server_ip
```

输入 `tunnel-user` 的密码后，如果连接保持住，就说明隧道已经建立。

此时在本地电脑访问：

```text
http://127.0.0.1:18080
```

就相当于访问 VPS 上的：

```text
http://127.0.0.1:8080
```

如果转发的不是网页服务，而是数据库、API 或其他 TCP 服务，也连接本地的：

```text
127.0.0.1:18080
```

## 5. 验证账号不能登录 shell

尝试直接 SSH 登录：

```shell
ssh \
  -o PubkeyAuthentication=no \
  -o PreferredAuthentications=password \
  tunnel-user@your_server_ip
```

正常情况下不应该进入 shell。

而端口转发命令应该仍然可用：

```shell
ssh -N \
  -o PubkeyAuthentication=no \
  -o PreferredAuthentications=password \
  -o ExitOnForwardFailure=yes \
  -L 18080:127.0.0.1:8080 \
  tunnel-user@your_server_ip
```

## 6. 如果服务不是监听在 127.0.0.1

可以在 VPS 上查看监听地址：

```shell
ss -lntp
```

如果看到类似：

```text
LISTEN 0 128 127.0.0.1:8080
```

则继续使用：

```sshconfig
PermitOpen 127.0.0.1:8080
```

如果服务只监听在某个内网 IP，例如：

```text
LISTEN 0 128 10.0.0.5:8080
```

则需要把配置改成：

```sshconfig
PermitOpen 10.0.0.5:8080
```

本地转发命令也要同步改成：

```shell
ssh -N \
  -o PubkeyAuthentication=no \
  -o PreferredAuthentications=password \
  -o ExitOnForwardFailure=yes \
  -L 18080:10.0.0.5:8080 \
  tunnel-user@your_server_ip
```

## 7. 转发多个端口

如果同一个专用账号需要访问多个 VPS 内部服务，可以在服务端允许多个目标端口，并在本地连接时添加多个 `-L`。

例如 VPS 内部有三个服务：

```text
127.0.0.1:8080   # Web 服务
127.0.0.1:5432   # PostgreSQL
127.0.0.1:6379   # Redis
```

希望本地映射为：

```text
127.0.0.1:18080  -> VPS 127.0.0.1:8080
127.0.0.1:15432  -> VPS 127.0.0.1:5432
127.0.0.1:16379  -> VPS 127.0.0.1:6379
```

对应的 `Match User` 配置可以写成：

```sshconfig
Match User tunnel-user
    AuthenticationMethods password
    PasswordAuthentication yes
    PubkeyAuthentication no
    KbdInteractiveAuthentication no
    PermitEmptyPasswords no

    AllowTcpForwarding local
    PermitOpen 127.0.0.1:8080 localhost:8080 127.0.0.1:5432 localhost:5432 127.0.0.1:6379 localhost:6379

    AllowStreamLocalForwarding no
    X11Forwarding no
    AllowAgentForwarding no
    PermitTunnel no
    PermitTTY no
    PermitUserRC no

    MaxSessions 0
```

注意：`PermitOpen` 限制的是 SSH 服务器允许连接的目标地址和端口，也就是 `-L 本地端口:目标地址:目标端口` 里的 `目标地址:目标端口`。本地端口 `18080`、`15432`、`16379` 由客户端自己选择，不受 `PermitOpen` 限制。

OpenSSH 文档中的 `PermitOpen` 多目标写法是把多个 `host:port` 用空格放在同一条指令后面，例如：

```sshconfig
PermitOpen 127.0.0.1:8080 localhost:8080 127.0.0.1:5432 localhost:5432
```

本地电脑连接时添加多个 `-L`：

```shell
ssh -N \
  -o PubkeyAuthentication=no \
  -o PreferredAuthentications=password \
  -o ExitOnForwardFailure=yes \
  -L 18080:127.0.0.1:8080 \
  -L 15432:127.0.0.1:5432 \
  -L 16379:127.0.0.1:6379 \
  tunnel-user@your_server_ip
```

之后本地访问关系就是：

```text
127.0.0.1:18080  -> VPS 127.0.0.1:8080
127.0.0.1:15432  -> VPS 127.0.0.1:5432
127.0.0.1:16379  -> VPS 127.0.0.1:6379
```

如果不同服务监听在不同地址，也要让 `PermitOpen` 和 `-L` 的目标保持一致。例如：

```sshconfig
PermitOpen 127.0.0.1:8080 10.0.0.5:5432 172.17.0.2:6379
```

本地连接命令则对应写成：

```shell
ssh -N \
  -o PubkeyAuthentication=no \
  -o PreferredAuthentications=password \
  -o ExitOnForwardFailure=yes \
  -L 18080:127.0.0.1:8080 \
  -L 15432:10.0.0.5:5432 \
  -L 16379:172.17.0.2:6379 \
  tunnel-user@your_server_ip
```

## 8. 密码登录的安全建议

如果明确要使用密码登录，建议至少做到：

1. 使用长度足够的随机强密码。
2. VPS 的 SSH 端口不要直接使用默认的 `22`，可以参考已有笔记修改 SSH 端口。
3. 安装 `fail2ban` 降低被暴力尝试密码的风险。

安装 `fail2ban`：

```shell
sudo apt update
sudo apt install fail2ban
sudo systemctl enable --now fail2ban
```

## 常用模板

如果内部服务就是 VPS 上的 `127.0.0.1:8080`，最终常用配置如下：

```sshconfig
Match User tunnel-user
    AuthenticationMethods password
    PasswordAuthentication yes
    PubkeyAuthentication no
    KbdInteractiveAuthentication no
    PermitEmptyPasswords no

    AllowTcpForwarding local
    PermitOpen 127.0.0.1:8080 localhost:8080

    AllowStreamLocalForwarding no
    X11Forwarding no
    AllowAgentForwarding no
    PermitTunnel no
    PermitTTY no
    PermitUserRC no

    MaxSessions 0
```

本地连接命令：

```shell
ssh -N \
  -o PubkeyAuthentication=no \
  -o PreferredAuthentications=password \
  -o ExitOnForwardFailure=yes \
  -L 18080:127.0.0.1:8080 \
  tunnel-user@your_server_ip
```
