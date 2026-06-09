---
title: Create a Debian 12 Account That Can Only Forward a Specific SSH Port
slug: debian12-ssh-tunnel-only-user
translationKey: debian12-ssh-tunnel-only-user
description: "Records how to create a dedicated password-based SSH tunnel account on a Debian 12 VPS that can only forward one or more specified ports and cannot log in to a shell."
date: 2026-06-09
lastmod: 2026-06-09
draft: false
tags:
  - Debian
  - SSH
  - Port Forwarding
  - VPS
  - Security Hardening
categories:
  - Linux
---

Sometimes a service on a VPS only listens on a local address, or its port is not exposed to the public Internet, for example:

```text
Internal service on the VPS: 127.0.0.1:8080
Not directly accessible externally: VPS_PUBLIC_IP:8080
```

In this case, you can access it through SSH local port forwarding:

```text
Local computer 127.0.0.1:18080 -> SSH -> VPS 127.0.0.1:8080
```

This note records how to create a dedicated account on a Debian 12 VPS so that it can only establish this SSH tunnel with password authentication. It cannot log in to a shell, execute commands, or forward ports that are not explicitly allowed.

> The example below uses internal VPS service port `8080`, local mapped port `18080`, and dedicated user `tunnel-user`. Replace them as needed.

## 1. Create a dedicated user

Run the following command on the VPS:

```shell
sudo adduser --gecos "" --shell /usr/sbin/nologin tunnel-user
```

The command will ask you to set a password. Use a sufficiently strong random password.

If the user already exists, you can change its password separately:

```shell
sudo passwd tunnel-user
```

The shell is set to `/usr/sbin/nologin` to prevent this user from getting a normal interactive shell.

## 2. Configure SSH to only allow forwarding the specified port

Edit the SSH server configuration:

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
    PermitOpen 127.0.0.1:8080 localhost:8080

    AllowStreamLocalForwarding no
    X11Forwarding no
    AllowAgentForwarding no
    PermitTunnel no
    PermitTTY no
    PermitUserRC no

    MaxSessions 0
```

Key options:

- `AuthenticationMethods password`: this user can only use password authentication.
- `PasswordAuthentication yes`: allow password authentication for this user.
- `PubkeyAuthentication no`: disable public key authentication for this user.
- `AllowTcpForwarding local`: only allow local port forwarding, that is, `ssh -L`.
- `PermitOpen 127.0.0.1:8080`: only allow connecting to `127.0.0.1:8080` on the VPS.
- `PermitOpen localhost:8080`: also allow the case where the client command uses `localhost:8080`.
- `MaxSessions 0`: disable shell sessions, remote commands, and SFTP, while still allowing port forwarding.
- `PermitTTY no`: disable terminal allocation.

After this configuration, the account can only be used to establish an SSH tunnel to the specified port.

## 3. Check the configuration and reload SSH

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

> When changing SSH configuration, do not close the current SSH session. Open a new terminal to test the new configuration first, and only close the old connection after confirming that everything works.

## 4. Establish the port forwarding from your local computer

Run this on your local computer:

```shell
ssh -N \
  -o PubkeyAuthentication=no \
  -o PreferredAuthentications=password \
  -o ExitOnForwardFailure=yes \
  -L 18080:127.0.0.1:8080 \
  tunnel-user@your_server_ip
```

After entering the password for `tunnel-user`, if the connection stays open, the tunnel has been established.

Now access this address on your local computer:

```text
http://127.0.0.1:18080
```

This is equivalent to accessing the following address on the VPS:

```text
http://127.0.0.1:8080
```

If the forwarded service is not a web service, but a database, API, or another TCP service, connect to the local endpoint instead:

```text
127.0.0.1:18080
```

## 5. Verify that the account cannot log in to a shell

Try logging in directly with SSH:

```shell
ssh \
  -o PubkeyAuthentication=no \
  -o PreferredAuthentications=password \
  tunnel-user@your_server_ip
```

Normally, it should not enter a shell.

The port forwarding command should still work:

```shell
ssh -N \
  -o PubkeyAuthentication=no \
  -o PreferredAuthentications=password \
  -o ExitOnForwardFailure=yes \
  -L 18080:127.0.0.1:8080 \
  tunnel-user@your_server_ip
```

## 6. If the service is not listening on 127.0.0.1

Check the listening address on the VPS:

```shell
ss -lntp
```

If you see something like:

```text
LISTEN 0 128 127.0.0.1:8080
```

continue using:

```sshconfig
PermitOpen 127.0.0.1:8080
```

If the service only listens on an internal IP, for example:

```text
LISTEN 0 128 10.0.0.5:8080
```

change the configuration to:

```sshconfig
PermitOpen 10.0.0.5:8080
```

The local forwarding command should also be changed accordingly:

```shell
ssh -N \
  -o PubkeyAuthentication=no \
  -o PreferredAuthentications=password \
  -o ExitOnForwardFailure=yes \
  -L 18080:10.0.0.5:8080 \
  tunnel-user@your_server_ip
```

## 7. Forward multiple ports

If the same dedicated account needs to access multiple internal services on the VPS, allow multiple target ports on the server side and add multiple `-L` options when connecting from the local computer.

For example, assume the VPS has three internal services:

```text
127.0.0.1:8080   # Web service
127.0.0.1:5432   # PostgreSQL
127.0.0.1:6379   # Redis
```

You want to map them locally as:

```text
127.0.0.1:18080  -> VPS 127.0.0.1:8080
127.0.0.1:15432  -> VPS 127.0.0.1:5432
127.0.0.1:16379  -> VPS 127.0.0.1:6379
```

The corresponding `Match User` block can be written as:

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

Note that `PermitOpen` restricts the destination address and port that the SSH server may connect to, which is the `target-address:target-port` part in `-L local-port:target-address:target-port`. The local ports `18080`, `15432`, and `16379` are chosen by the client and are not restricted by `PermitOpen`.

The OpenSSH documented syntax for multiple `PermitOpen` targets is to put multiple `host:port` values after the same directive, separated by spaces, for example:

```sshconfig
PermitOpen 127.0.0.1:8080 localhost:8080 127.0.0.1:5432 localhost:5432
```

On the local computer, add multiple `-L` options:

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

The local access relationship is then:

```text
127.0.0.1:18080  -> VPS 127.0.0.1:8080
127.0.0.1:15432  -> VPS 127.0.0.1:5432
127.0.0.1:16379  -> VPS 127.0.0.1:6379
```

If different services listen on different addresses, keep the targets in `PermitOpen` and `-L` consistent. For example:

```sshconfig
PermitOpen 127.0.0.1:8080 10.0.0.5:5432 172.17.0.2:6379
```

The local connection command should be written accordingly:

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

## 8. Security suggestions for password login

If you explicitly want to use password authentication, at least do the following:

1. Use a sufficiently long random strong password.
2. Do not leave SSH on the default port `22`; see the existing note about changing the SSH port.
3. Install `fail2ban` to reduce password brute-force attempts.

Install `fail2ban`:

```shell
sudo apt update
sudo apt install fail2ban
sudo systemctl enable --now fail2ban
```

## Common template

If the internal service is `127.0.0.1:8080` on the VPS, the commonly used final configuration is:

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

Local connection command:

```shell
ssh -N \
  -o PubkeyAuthentication=no \
  -o PreferredAuthentications=password \
  -o ExitOnForwardFailure=yes \
  -L 18080:127.0.0.1:8080 \
  tunnel-user@your_server_ip
```
