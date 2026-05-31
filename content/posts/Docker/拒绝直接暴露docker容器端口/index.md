---
title: 拒绝直接暴露docker容器端口
slug: avoid-exposing-docker-container-ports
translationKey: avoid-exposing-docker-container-ports
description: "介绍如何将 Docker 容器端口绑定到 127.0.0.1，并通过 Nginx 反向代理和 TLS 对外提供服务，避免端口直接暴露。"
date: 2025-07-27
lastmod: 2025-07-27
draft: false
tags:
categories:
  - Docker
---

# 前言

一般我们在服务器搭建容器后，我们可以直接从外部端口访问映射的端口服务，这样将端口直接暴露是极不安全的！

docker在映射端口时有一个技巧，可以仅允许本机访问端口。所以我们可以使用nginx服务套tls并且反代这个端口，这样既不能从原暴露端口访问容器，也给服务套了tls加密，一举两得。以下使用docker-compose配置文件进行举例。

# docker-compose

原始配置：

```yaml
services:
  web:
    image: myapp
    ports:
      - "8000:8000"
```

改为仅本机访问：

```yaml
services:
  web:
    image: myapp
    ports:
      - "127.0.0.1:8000:8000"
```

这样，服务只会绑定在 `127.0.0.1` 上，只有本机用户能通过 `localhost:8000` 访问，外部无法连接。

# 检查绑定效果

你可以用如下命令检查端口绑定情况：

```shell
sudo lsof -i:8000 -P -n | grep LISTEN
```

输出应显示绑定在 `127.0.0.1:8000` 而非 `0.0.0.0:8000`。我们再使用nginx服务反代这个端口，我们就可以从外部使用加密协议访问这个服务，保证安全性。