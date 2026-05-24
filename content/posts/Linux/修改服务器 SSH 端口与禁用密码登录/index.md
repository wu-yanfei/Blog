---
title: 修改服务器 SSH 端口与禁用密码登录
slug: change-ssh-port-disable-password-login
description: "记录在 Debian 12 服务器上配置 SSH 密钥、修改 SSH 端口、禁用密码登录并验证新配置的安全步骤。"
date: 2026-01-31
draft: false
tags:
categories:
  - Linux
---

**警告：** 在整个配置完成并验证成功之前，**不要关闭你当前的 SSH 终端窗口**。建议多开一个终端保持连接，以防配置错误导致把自己“锁”在服务器外面。下面以debian12为例子

## 1. 配置 SSH 密钥

-   **客户端生成密钥**

在你的**本地电脑**（Mac/Windows/Linux 终端）执行以下命令。如果你已经有密钥（`~/.ssh/id_rsa` 或 `id_ed25519`），**可以跳过生成步骤**。

```shell
ssh-keygen -t ed25519 -C "your_email@example.com"
```

一路回车即可。

-   **上传公钥到服务器**

使用 `ssh-copy-id` 将公钥发送到服务器（假设服务器目前还是默认端口 22）：

```shell
# 替换 user 和 ip
ssh-copy-id user@your_server_ip
```

**验证：** 此时尝试登录 `ssh user@your_server_ip`，应该不需要输入密码即可进入系统。

## 2. 修改 SSH 配置文件

-   **备份配置文件**

```shell
sudo cp /etc/ssh/sshd_config /etc/ssh/sshd_config.bak
```

-   **编辑配置**

```shell
sudo nano /etc/ssh/sshd_config
```

找到以下参数并进行修改（如果找不到，可以直接在文件末尾添加）：

1.  **修改端口**：取消 `Port` 的注释，将其改为一个非标准端口（建议 1024-65535 之间，例如 `22222`）。
2.  **禁用密码**：将 `PasswordAuthentication` 设为 `no`。

**修改后的关键片段如下：**

```
# /etc/ssh/sshd_config  
  
# 1. 修改端口 (选一个没被占用的高位端口)  
Port 22222  
  
# 2. 确保公钥验证开启 (默认通常是 yes)  
PubkeyAuthentication yes  
  
# 3. 彻底禁用密码登录  
PasswordAuthentication no  
  
# (可选) 额外的安全参数，禁用 ChallengeResponse  
ChallengeResponseAuthentication no
```

保存并退出（Nano 操作：`Ctrl+O` 保存，`Ctrl+X` 退出）。

## 3. 放行防火墙

如果你改了端口却没在防火墙放行，重启服务后将立刻失联。

## 4. 重启与验证

-   **重启 SSH 服务**

```shell
sudo systemctl restart ssh
```

-   **验证连接**

**不要关闭当前的终端窗口，打开一个新的终端窗口，指定端口尝试连接：**

```
ssh -p 22222 user@your_server_ip
```

如果成功登录，则配置完成。现在可以把防火墙里旧的 22 端口规则删除了

## 5. 测试密码登录是否真的失效

尝试用密码登录

```
ssh -p 22222 -o PubkeyAuthentication=no -o PreferredAuthentications=password user@your_server_ip
```

**预期的结果：**

-   **安全**：直接报错 `Permission denied (publickey)` 或 `No supported authentication methods available`。
-   **不安全**：如果终端跳出了 `password:` 提示框，说明你的配置有漏洞（检查 `ChallengeResponseAuthentication` 是否为 `no`，或者是否有其他配置文件覆盖了设置）。