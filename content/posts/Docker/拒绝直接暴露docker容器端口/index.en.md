---
title: Avoid Directly Exposing Docker Container Ports
slug: avoid-exposing-docker-container-ports
translationKey: avoid-exposing-docker-container-ports
description: "Explains how to bind Docker container ports to 127.0.0.1 and expose services through an Nginx reverse proxy with TLS instead of exposing container ports directly."
date: 2025-07-27
draft: false
tags:
categories:
  - Docker
---

# Introduction

After deploying containers on a server, we often access the mapped service port directly from the outside. Exposing ports this way is very unsafe.

Docker has a useful trick when mapping ports: you can bind a port so that it is only accessible from the local machine. Then you can use Nginx with TLS as a reverse proxy for that local port. This prevents direct access to the original exposed container port and also adds TLS encryption to the service. The following example uses a `docker-compose` configuration file.

# docker-compose

Original configuration:

```yaml
services:
  web:
    image: myapp
    ports:
      - "8000:8000"
```

Change it to local-only access:

```yaml
services:
  web:
    image: myapp
    ports:
      - "127.0.0.1:8000:8000"
```

With this configuration, the service only binds to `127.0.0.1`. Only local users can access it through `localhost:8000`, and external clients cannot connect to it directly.

# Check the binding result

You can use the following command to check how the port is bound:

```shell
sudo lsof -i:8000 -P -n | grep LISTEN
```

The output should show that the service is bound to `127.0.0.1:8000`, not `0.0.0.0:8000`. Then we can use Nginx to reverse proxy this port and access the service externally over an encrypted protocol, improving security.
