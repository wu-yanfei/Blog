---
title: "Debian 12 通过 frp 与受限 SSH 跳板账号连接实验室服务器"
slug: debian12-ssh-tunnel-only-user
translationKey: debian12-ssh-tunnel-only-user
description: "记录在实验室服务器已通过 frp 暴露到云服务器后，如何在 Debian 12 云服务器上创建受限 SSH 跳板账号，只允许转发到实验室服务器的 SSH 端口，并在本地 SSH 和 VS Code 中连接实验室服务器。"
date: 2026-06-09
lastmod: 2026-06-20
draft: false
tags:
  - Debian
  - SSH
  - frp
  - 跳板机
  - 端口转发
  - VPS
  - 安全加固
categories:
  - Linux
---

家里的电脑通常无法直接访问实验室内网服务器。如果已经用 frp 做了内网穿透，让云服务器可以访问实验室服务器的 SSH 端口，那么可以继续把云服务器作为 SSH 跳板机使用。

本文记录一种比较安全的做法：在 Debian 12 云服务器上创建一个专用跳板账号。这个账号不能登录 shell，不能执行命令，也不能随意转发端口，只允许把 SSH 流量转发到 frp 暴露出来的实验室服务器端口。

最终连接关系是：

```text
家里的电脑 -> 云服务器/跳板机 -> frp 端口 -> 实验室服务器
```

本地使用时可以直接执行：

```shell
ssh lab
```

VS Code Remote - SSH 也可以直接选择 `lab` 连接。

## 1. 前提：云服务器已经能通过 frp 访问实验室 SSH

本文默认 frp 已经配置完成，不展开 frp 本身的安装与配置。

例如，在云服务器上执行下面命令可以连接实验室服务器：

```shell
ssh -p 2222 labuser@127.0.0.1
```

这表示：

```text
云服务器 127.0.0.1:2222 -> frp -> 实验室服务器 SSH:22
```

下面的示例信息如下：

```text
云服务器公网地址：your_server_ip
云服务器 SSH 端口：22
云服务器受限跳板账号：tunnel-user
云服务器上的 frp SSH 转发端口：127.0.0.1:2222
实验室服务器账号：labuser
```

如果你的 frp 端口不是 `2222`，或者不是监听在 `127.0.0.1`，后面所有 `127.0.0.1:2222` 都要替换成云服务器上实际可访问实验室 SSH 的地址和端口。

> 如果 frp 的远程端口已经暴露在云服务器公网地址上，建议用防火墙或 frp 服务端绑定配置限制它不要被公网随意访问。本文的受限 SSH 跳板账号只能限制通过这个账号发起的连接，不能替代 frp 端口本身的公网访问控制。

## 2. 在云服务器上创建受限跳板账号

在云服务器上执行：

```shell
sudo adduser --gecos "" --shell /usr/sbin/nologin tunnel-user
```

命令执行过程中会提示设置密码。这个密码就是之后从家里电脑连接跳板机时使用的密码，建议使用足够长的随机强密码。

如果用户已经存在，可以单独修改密码：

```shell
sudo passwd tunnel-user
```

这里把 shell 设置为 `/usr/sbin/nologin`，目的是避免这个账号获得正常交互式 shell。

## 3. 限制跳板账号只能连接 frp 暴露的实验室 SSH 端口

编辑云服务器上的 SSH 服务端配置：

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
    PermitOpen 127.0.0.1:2222 localhost:2222

    AllowStreamLocalForwarding no
    X11Forwarding no
    AllowAgentForwarding no
    PermitTunnel no
    PermitTTY no
    PermitUserRC no

    MaxSessions 0
```

关键配置说明：

- `Match User tunnel-user`：下面的限制只作用于 `tunnel-user`。
- `AuthenticationMethods password`：这个跳板账号只使用密码认证。
- `PasswordAuthentication yes`：允许这个账号用密码登录 SSH。
- `PubkeyAuthentication no`：禁止这个账号使用密钥登录。如果后续要把跳板账号改成密钥登录，需要同步调整这一项。
- `AllowTcpForwarding local`：只允许本地端口转发，也就是客户端发起的 `ssh -L` 或 `ProxyJump`/`-W` 这类连接。
- `PermitOpen 127.0.0.1:2222 localhost:2222`：只允许跳板账号连接云服务器本机的 `127.0.0.1:2222` 或 `localhost:2222`，也就是 frp 暴露出来的实验室 SSH 入口。
- `MaxSessions 0`：禁止 shell、远程命令和 SFTP，但仍允许端口转发。
- `PermitTTY no`：禁止分配终端。

`PermitOpen` 限制的是从云服务器视角看到的目标地址和端口。因为 frp 已经把实验室 SSH 暴露在云服务器的 `127.0.0.1:2222`，所以这里限制的是 `127.0.0.1:2222`，而不是家里电脑的本地地址。

建议把这个 `Match` 块放在 `sshd_config` 文件末尾，不要在它后面继续写普通全局 SSH 配置，避免后续配置被误认为也属于这个 `Match` 块。

## 4. 检查配置并重载 SSH

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

> 修改 SSH 配置时，不要关闭当前已经登录的 SSH 窗口。先开一个新终端测试新配置，确认可用后再关闭旧连接，避免把自己锁在服务器外面。

## 5. 在本地电脑配置 SSH 跳板

在家里电脑的 `~/.ssh/config` 中添加：

```sshconfig
Host lab-jump
    HostName your_server_ip
    User tunnel-user
    Port 22
    PubkeyAuthentication no
    PreferredAuthentications password
    RequestTTY no

Host lab
    HostName 127.0.0.1
    User labuser
    Port 2222
    ProxyJump lab-jump
```

之后在本地电脑执行：

```shell
ssh lab
```

等价于：

```text
家里的电脑 -> tunnel-user@your_server_ip -> 云服务器 127.0.0.1:2222 -> frp -> labuser@实验室服务器
```

这里 `Host lab` 里的 `HostName 127.0.0.1` 是从云服务器视角看的。因为使用 `ProxyJump` 后，连接 `127.0.0.1:2222` 这一步是在跳板机侧发起的，不是在家里电脑本地发起的。

为了避免 `localhost` 被解析成 IPv6 的 `::1` 或其他地址，建议在 `Host lab` 里明确写 `127.0.0.1`。

也可以不写配置，临时使用命令行：

```shell
ssh -J tunnel-user@your_server_ip -p 2222 labuser@127.0.0.1
```

但长期使用时，推荐写进 `~/.ssh/config`，这样命令行和 VS Code 都能复用同一套配置。

## 6. 在 VS Code 中连接实验室服务器

安装 VS Code 插件：

```text
Remote - SSH
```

然后打开命令面板，选择：

```text
Remote-SSH: Connect to Host...
```

选择：

```text
lab
```

VS Code 会读取本地 `~/.ssh/config`，并自动通过 `lab-jump` 连接到 frp 暴露出来的实验室服务器 SSH。

如果云服务器跳板账号和实验室服务器账号都是密码登录，VS Code 可能会多次要求输入密码。原因是 VS Code Remote - SSH 可能会建立多次 SSH 连接，例如探测系统环境、安装 VS Code Server、创建端口转发通道等。

## 7. 密码输入次数

如果云服务器和实验室服务器都只使用密码登录，那么执行：

```shell
ssh lab
```

通常会输入两次密码：

1. 第一次输入 `tunnel-user` 在云服务器上的密码，用于连接跳板机。
2. 第二次输入 `labuser` 在实验室服务器上的密码，用于真正登录实验室服务器。

这不是配置错误，而是因为完整链路里确实有两次独立的 SSH 认证。

如果想减少密码输入，推荐逐步改成 SSH key：

```text
家里电脑 -> 使用 key 登录云服务器 -> 通过 frp -> 使用 key 登录实验室服务器
```

如果暂时只能改一台，优先给云服务器跳板账号配置 SSH key，这样至少跳板机这一层不再需要输入密码；实验室服务器如果仍然只支持密码，则还需要输入一次实验室服务器密码。

也可以在本地 `~/.ssh/config` 里启用连接复用，减少短时间内重复连接时的密码输入：

```sshconfig
Host *
    ServerAliveInterval 60
    ServerAliveCountMax 3
    ControlMaster auto
    ControlPath ~/.ssh/cm-%C
    ControlPersist 10m
```

连接复用只能复用已经建立的连接，不能绕过服务器本身的密码认证。对于 VS Code Remote - SSH，连接复用可以改善体验，但最稳定的方式仍然是给云服务器和实验室服务器都配置 SSH key。

不建议把密码写进脚本或使用 `sshpass`，因为密码可能进入 shell history、进程列表或日志，安全性较差。

## 8. 如果云服务器可以直接访问实验室内网地址

如果不是通过云服务器本机的 frp 端口访问，而是云服务器可以直接访问实验室服务器的内网地址，例如：

```shell
ssh labuser@10.0.0.8
```

则把服务端 `PermitOpen` 改成实验室服务器的真实地址和端口：

```sshconfig
PermitOpen 10.0.0.8:22
```

本地 `~/.ssh/config` 中的 `Host lab` 也对应改成：

```sshconfig
Host lab
    HostName 10.0.0.8
    User labuser
    Port 22
    ProxyJump lab-jump
```

原则是：`PermitOpen` 和 `Host lab` 的 `HostName`、`Port` 必须描述同一个从云服务器视角可访问的目标。

## 9. 验证受限账号的行为

测试跳板账号是否不能直接登录 shell：

```shell
ssh tunnel-user@your_server_ip
```

正常情况下不应该进入交互式 shell。

测试通过跳板连接实验室服务器：

```shell
ssh lab
```

如果能进入实验室服务器，就说明跳板转发正常。

如果连接失败，可以加 `-v` 查看调试信息：

```shell
ssh -v lab
```

常见问题：

- `channel 0: open failed: administratively prohibited`：通常是 `PermitOpen` 没有允许目标地址和端口，或者 `Host lab` 的 `HostName`/`Port` 与 `PermitOpen` 不一致。
- `Connection refused`：通常是云服务器本机的 frp 端口没有监听、端口写错，或者 frp 到实验室服务器的链路断开。
- 一直要求输入跳板机密码：说明跳板账号还在使用密码登录；如果想避免，需要配置 SSH key，并修改服务端的认证限制。
- VS Code 反复弹密码：纯密码登录时比较常见，建议配置 SSH key 或启用连接复用。

可以先在云服务器上确认 frp 端口是否能连接实验室服务器：

```shell
ssh -p 2222 labuser@127.0.0.1
```

只有这一步在云服务器上可用，本地的 `ProxyJump` 配置才有基础。

## 10. 安全建议

如果明确要使用密码登录，建议至少做到：

1. 使用长度足够的随机强密码。
2. 云服务器的 SSH 端口不要直接使用默认的 `22`，可以参考已有笔记修改 SSH 端口。
3. 安装 `fail2ban`，降低被暴力尝试密码的风险。
4. 如果云服务器安全组或防火墙支持，尽量只允许自己的家庭公网 IP 访问 SSH 端口。
5. `PermitOpen` 只写确实需要访问的 frp 目标端口，不要为了省事写成无限制转发。
6. 如果 frp 的实验室 SSH 端口不需要直接暴露给公网，建议把它限制为只在云服务器本机访问，或者用防火墙限制来源。

