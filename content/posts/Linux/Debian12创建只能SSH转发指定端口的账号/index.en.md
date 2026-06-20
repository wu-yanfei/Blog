---
title: "Connect to a Lab Server Through frp and a Restricted SSH Jump Account on Debian 12"
slug: debian12-ssh-tunnel-only-user
translationKey: debian12-ssh-tunnel-only-user
description: "Records how to create a restricted SSH jump account on a Debian 12 cloud server after a lab server has been exposed to the cloud server through frp, only allow forwarding to the lab server SSH port, and connect to the lab server from local SSH and VS Code."
date: 2026-06-09
lastmod: 2026-06-20
draft: false
tags:
  - Debian
  - SSH
  - frp
  - Jump Host
  - Port Forwarding
  - VPS
  - Security Hardening
categories:
  - Linux
---

A home computer usually cannot directly access a server inside a lab network. If frp has already been used for intranet penetration so that the cloud server can access the lab server's SSH port, the cloud server can then be used as an SSH jump host.

This note records a safer approach: create a dedicated jump account on a Debian 12 cloud server. This account cannot log in to a shell, cannot execute commands, and cannot freely forward arbitrary ports. It is only allowed to forward SSH traffic to the lab server port exposed by frp.

The final connection path is:

```text
Home computer -> cloud server / jump host -> frp port -> lab server
```

From the local computer, you can simply run:

```shell
ssh lab
```

VS Code Remote - SSH can also connect directly to `lab`.

## 1. Prerequisite: the cloud server can already access lab SSH through frp

This note assumes frp has already been configured. It does not cover the installation and configuration of frp itself.

For example, the following command works on the cloud server:

```shell
ssh -p 2222 labuser@127.0.0.1
```

This means:

```text
Cloud server 127.0.0.1:2222 -> frp -> lab server SSH:22
```

The examples below use the following information:

```text
Cloud server public address: your_server_ip
Cloud server SSH port: 22
Restricted jump account on cloud server: tunnel-user
frp SSH forwarding port on cloud server: 127.0.0.1:2222
Lab server account: labuser
```

If your frp port is not `2222`, or it does not listen on `127.0.0.1`, replace every `127.0.0.1:2222` below with the actual address and port on the cloud server that can access the lab SSH service.

> If the frp remote port is already exposed on the cloud server's public address, use a firewall or frp server-side bind configuration to prevent it from being freely accessible from the public Internet. The restricted SSH jump account in this note only limits connections made through this account; it does not replace access control for the frp port itself.

## 2. Create a restricted jump account on the cloud server

Run this on the cloud server:

```shell
sudo adduser --gecos "" --shell /usr/sbin/nologin tunnel-user
```

The command will ask you to set a password. This is the password used later when connecting from the home computer to the jump host. Use a sufficiently long random strong password.

If the user already exists, you can change its password separately:

```shell
sudo passwd tunnel-user
```

The shell is set to `/usr/sbin/nologin` to prevent this account from getting a normal interactive shell.

## 3. Restrict the jump account to the lab SSH port exposed by frp

Edit the SSH server configuration on the cloud server:

```shell
sudo nano /etc/ssh/sshd_config
```

Add the following block at the end of the file:

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

Key options:

- `Match User tunnel-user`: the restrictions below only apply to `tunnel-user`.
- `AuthenticationMethods password`: this jump account only uses password authentication.
- `PasswordAuthentication yes`: allow this account to log in to SSH with a password.
- `PubkeyAuthentication no`: disable public key authentication for this account. If you later switch the jump account to SSH key authentication, adjust this option accordingly.
- `AllowTcpForwarding local`: only allow local port forwarding, that is, client-initiated `ssh -L` or `ProxyJump`/`-W` style connections.
- `PermitOpen 127.0.0.1:2222 localhost:2222`: only allow the jump account to connect to `127.0.0.1:2222` or `localhost:2222` on the cloud server, which is the lab SSH entry exposed by frp.
- `MaxSessions 0`: disable shell sessions, remote commands, and SFTP, while still allowing port forwarding.
- `PermitTTY no`: disable terminal allocation.

`PermitOpen` restricts the target address and port from the cloud server's perspective. Because frp exposes the lab SSH service at `127.0.0.1:2222` on the cloud server, the allowed target here is `127.0.0.1:2222`, not a local address on the home computer.

Put this `Match` block at the end of `sshd_config`. Do not put normal global SSH settings after it, otherwise they may accidentally be treated as part of this `Match` block.

## 4. Check the configuration and reload SSH

After modifying the SSH configuration, check its syntax first:

```shell
sudo /usr/sbin/sshd -t
```

If there is no output, the syntax is valid.

Then reload SSH:

```shell
sudo systemctl reload ssh
```

On Debian, the SSH service name is usually `ssh`.

> When changing SSH configuration, do not close the current SSH session. Open a new terminal to test the new configuration first, and only close the old connection after confirming that everything works. This avoids locking yourself out of the server.

## 5. Configure the SSH jump host on the local computer

Add the following to `~/.ssh/config` on the home computer:

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

Then run this on the local computer:

```shell
ssh lab
```

This is equivalent to:

```text
Home computer -> tunnel-user@your_server_ip -> cloud server 127.0.0.1:2222 -> frp -> labuser@lab server
```

Here `HostName 127.0.0.1` in `Host lab` is from the cloud server's perspective. With `ProxyJump`, the connection to `127.0.0.1:2222` is initiated from the jump host side, not from the home computer.

To avoid `localhost` being resolved to IPv6 `::1` or another address, explicitly use `127.0.0.1` in `Host lab`.

You can also use a one-off command without writing the config:

```shell
ssh -J tunnel-user@your_server_ip -p 2222 labuser@127.0.0.1
```

For long-term use, however, writing it into `~/.ssh/config` is recommended, because both the command line and VS Code can reuse the same configuration.

## 6. Connect to the lab server in VS Code

Install the VS Code extension:

```text
Remote - SSH
```

Then open the command palette and choose:

```text
Remote-SSH: Connect to Host...
```

Select:

```text
lab
```

VS Code reads the local `~/.ssh/config` and automatically connects through `lab-jump` to the lab server SSH service exposed by frp.

If both the cloud server jump account and the lab server account use password authentication, VS Code may ask for passwords multiple times. This is because VS Code Remote - SSH may create multiple SSH connections, for example to probe the system environment, install VS Code Server, and create forwarding channels.

## 7. Number of password prompts

If both the cloud server and the lab server only use password authentication, running:

```shell
ssh lab
```

usually asks for two passwords:

1. First, enter the password for `tunnel-user` on the cloud server to connect to the jump host.
2. Then, enter the password for `labuser` on the lab server to actually log in to the lab server.

This is not a configuration error. The full path contains two independent SSH authentications.

To reduce password prompts, prefer gradually switching to SSH keys:

```text
Home computer -> use a key to log in to the cloud server -> through frp -> use a key to log in to the lab server
```

If only one side can be changed for now, configure SSH key authentication for the cloud server jump account first. This removes the password prompt for the jump host layer. If the lab server still only supports passwords, you will still need to enter the lab server password once.

You can also enable connection sharing in the local `~/.ssh/config` to reduce repeated password prompts during short-term reconnects:

```sshconfig
Host *
    ServerAliveInterval 60
    ServerAliveCountMax 3
    ControlMaster auto
    ControlPath ~/.ssh/cm-%C
    ControlPersist 10m
```

Connection sharing only reuses already established connections; it does not bypass the server's own password authentication. For VS Code Remote - SSH, it can improve the experience, but the most stable approach is still to configure SSH keys on both the cloud server and the lab server.

Do not write passwords into scripts or use `sshpass`; passwords may end up in shell history, process lists, or logs, which is much less secure.

## 8. If the cloud server can directly access the lab intranet address

If the cloud server does not access the lab server through a local frp port, but can directly access the lab server's intranet address, for example:

```shell
ssh labuser@10.0.0.8
```

then change the server-side `PermitOpen` to the real address and port of the lab server:

```sshconfig
PermitOpen 10.0.0.8:22
```

Also change `Host lab` in the local `~/.ssh/config` accordingly:

```sshconfig
Host lab
    HostName 10.0.0.8
    User labuser
    Port 22
    ProxyJump lab-jump
```

The principle is: `PermitOpen` and the `HostName`/`Port` of `Host lab` must describe the same target that is reachable from the cloud server's perspective.

## 9. Verify the restricted account behavior

Test that the jump account cannot directly log in to a shell:

```shell
ssh tunnel-user@your_server_ip
```

Normally, it should not enter an interactive shell.

Test connecting to the lab server through the jump host:

```shell
ssh lab
```

If this enters the lab server, the jump forwarding works.

If the connection fails, add `-v` to inspect debug information:

```shell
ssh -v lab
```

Common issues:

- `channel 0: open failed: administratively prohibited`: usually means `PermitOpen` does not allow the target address and port, or the `HostName`/`Port` of `Host lab` does not match `PermitOpen`.
- `Connection refused`: usually means the frp port on the cloud server is not listening, the port number is wrong, or the frp link to the lab server is down.
- It keeps asking for the jump host password: the jump account is still using password authentication. To avoid this, configure SSH keys and adjust the server-side authentication restrictions.
- VS Code repeatedly asks for passwords: this is common with password-only authentication. Configure SSH keys or enable connection sharing.

First confirm on the cloud server that the frp port can connect to the lab server:

```shell
ssh -p 2222 labuser@127.0.0.1
```

Only when this step works on the cloud server does the local `ProxyJump` configuration have a valid target.

## 10. Security suggestions

If you explicitly want to use password authentication, at least do the following:

1. Use a sufficiently long random strong password.
2. Do not leave SSH on the cloud server's default port `22`; see the existing note about changing the SSH port.
3. Install `fail2ban` to reduce password brute-force attempts.
4. If the cloud server security group or firewall supports it, only allow your home public IP to access the SSH port.
5. Only put the frp target ports that are actually needed in `PermitOpen`; do not allow unrestricted forwarding for convenience.
6. If the frp lab SSH port does not need to be directly exposed to the public Internet, restrict it to local access on the cloud server or limit its source with a firewall.

