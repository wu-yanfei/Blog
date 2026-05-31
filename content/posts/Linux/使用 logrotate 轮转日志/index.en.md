---
title: Rotate Logs with logrotate
slug: logrotate-rotate-logs
translationKey: logrotate-rotate-logs
description: "Records how to install and configure logrotate on Debian 12, including custom log rotation, copytruncate, and manual configuration testing."
date: 2026-03-24
lastmod: 2026-03-24
draft: false
tags:
categories:
  - Linux
---

> This example uses Debian 12.

## Installation

First, check whether it is installed:

```shell
sudo apt update
sudo apt install logrotate
```

Check the version:

```shell
logrotate --version
```

## Global configuration locations

Main configuration file:

```
/etc/logrotate.conf
```

Configuration directory for individual services or programs:

```
/etc/logrotate.d/
```

In general, do not edit the main configuration file directly. Usually, you create a separate configuration file for your program under `/etc/logrotate.d/`.

## **Example: configure rotation for custom logs**

Assume your application logs are located at:

```
/var/log/myapp/*.log
```

Create a configuration file:

```
sudo nano /etc/logrotate.d/myapp
```

Write the following content:

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

### **Parameter explanations**

-   `daily`: rotate once per day
-   `rotate 7`: keep 7 old log files
-   `compress`: compress old logs
-   `delaycompress`: compress the previous log on the next rotation
-   `missingok`: do not report an error if the log file does not exist
-   `notifempty`: do not rotate empty logs
-   `create 0640 root adm`: create a new log file after rotation and set its permissions, owner, and group

## **If the program keeps the log file open**

Some programs do not automatically reopen log files. In this case, you can add:

```
copytruncate
```

For example:

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

### What `copytruncate` **does**

It first copies the current log and then truncates the original file. This is suitable for programs that do not support reopening log files.

## **Manually test the configuration**

Check whether the syntax is correct:

```shell
sudo logrotate -d /etc/logrotate.conf
```

Force one rotation:

```
sudo logrotate -f /etc/logrotate.conf
```

If there are no errors, it is basically working.

Check the log directory:

```
ls -lh /var/log/myapp/
```

You will see something like:

```
app.log  
app.log.1  
app.log.2.gz
```
