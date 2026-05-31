---
title: Enable Port Forwarding on Debian 12 with nftables
slug: debian12-nftables-port-forwarding
translationKey: debian12-nftables-port-forwarding
description: "Records how to enable IP forwarding on Debian 12 and use nftables to forward a local port to a target server port."
date: 2026-02-02
lastmod: 2026-02-02
draft: false
tags:
categories:
  - Linux
---

> This example uses nftables to forward local port 10443 to port 443 on another IP address.

## Enable forwarding

1.  Edit the configuration file:

```shell
sudo nano /etc/sysctl.conf
```

Enable the following option:

```
net.ipv4.ip_forward=1
```

2.  Apply the configuration by running `sudo sysctl -p`.

## Configure port forwarding

1.  Edit the configuration file:

```shell
sudo nano /etc/nftables.conf
```

Add the following configuration. Replace `xx.xx.xx.xx` with the destination IP address. Return traffic will also go through the local machine.

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

2.  Apply the configuration:

```shell
sudo nft -f /etc/nftables.conf
```

## Check whether it works

Run the following command to view the relevant forwarding rules:

```shell
sudo nft list ruleset
```
