---
title: Change the SSH Port and Disable Password Login on a Server
slug: change-ssh-port-disable-password-login
translationKey: change-ssh-port-disable-password-login
description: "Records the safe steps for configuring SSH keys, changing the SSH port, disabling password login, and verifying the new configuration on a Debian 12 server."
date: 2026-01-31
lastmod: 2026-01-31
draft: false
tags:
  - SSH
  - Security Hardening
  - Debian
  - Key-based Login
  - Server Administration
categories:
  - Linux
---

**Warning:** Do **not close your current SSH terminal window** until the entire configuration has been completed and verified successfully. It is recommended to open another terminal and keep the existing connection alive, so that you do not lock yourself out of the server if the configuration is wrong. The following example uses Debian 12.

## 1. Configure SSH keys

-   **Generate a key on the client**

Run the following command on your **local computer** in a Mac/Windows/Linux terminal. If you already have a key such as `~/.ssh/id_rsa` or `id_ed25519`, **you can skip the key generation step**.

```shell
ssh-keygen -t ed25519 -C "your_email@example.com"
```

Press Enter all the way through.

-   **Upload the public key to the server**

Use `ssh-copy-id` to send the public key to the server. This assumes the server is still using the default port 22:

```shell
# Replace user and ip
ssh-copy-id user@your_server_ip
```

**Verification:** Try logging in with `ssh user@your_server_ip`. You should be able to enter the system without typing a password.

## 2. Modify the SSH configuration file

-   **Back up the configuration file**

```shell
sudo cp /etc/ssh/sshd_config /etc/ssh/sshd_config.bak
```

-   **Edit the configuration**

```shell
sudo nano /etc/ssh/sshd_config
```

Find and modify the following parameters. If you cannot find them, add them directly at the end of the file:

1.  **Change the port**: uncomment `Port` and change it to a non-standard port, preferably between 1024 and 65535, such as `22222`.
2.  **Disable password login**: set `PasswordAuthentication` to `no`.

**The key configuration snippet should look like this:**

```
# /etc/ssh/sshd_config  
  
# 1. Change the port (choose an unused high port)  
Port 22222  
  
# 2. Make sure public key authentication is enabled (usually yes by default)  
PubkeyAuthentication yes  
  
# 3. Completely disable password login  
PasswordAuthentication no  
  
# Optional: disable ChallengeResponse as an extra safety setting  
ChallengeResponseAuthentication no
```

Save and exit. In Nano, use `Ctrl+O` to save and `Ctrl+X` to exit.

## 3. Allow the port through the firewall

If you change the port but do not allow it through the firewall, you may immediately lose access after restarting the service.

## 4. Restart and verify

-   **Restart the SSH service**

```shell
sudo systemctl restart ssh
```

-   **Verify the connection**

**Do not close the current terminal window. Open a new terminal window and try connecting with the specified port:**

```
ssh -p 22222 user@your_server_ip
```

If the login succeeds, the configuration is complete. You can now remove the old firewall rule for port 22.

## 5. Test whether password login is really disabled

Try logging in with a password:

```
ssh -p 22222 -o PubkeyAuthentication=no -o PreferredAuthentications=password user@your_server_ip
```

**Expected result:**

-   **Safe**: it directly reports `Permission denied (publickey)` or `No supported authentication methods available`.
-   **Unsafe**: if the terminal shows a `password:` prompt, your configuration still has a gap. Check whether `ChallengeResponseAuthentication` is set to `no`, or whether another configuration file is overriding your settings.
