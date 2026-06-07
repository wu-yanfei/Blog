---
title: Bioinformatics Conda Environment Setup
slug: bioinformatics-conda-environment
translationKey: bioinformatics-conda-environment
description: "Records how to configure Conda channels, set up proxies, create environments, and use mamba to speed up Python package installation for bioinformatics analysis."
date: 2026-01-26
lastmod: 2026-01-26
draft: false
tags:
  - Bioinformatics
  - Conda
  - mamba
  - Python Environment
  - Environment Setup
categories:
  - Research
---

## **Configure bioinformatics channels**

```shell
 # Set official channels
 conda config --add channels defaults
 conda config --add channels bioconda
 conda config --add channels conda-forge
```

## **HTTP proxy**

Use a proxy environment for the current terminal only. Replace `xxxx` with the port opened by your proxy program:

```shell
export HTTP_PROXY="http://127.0.0.1:xxxx"
export HTTPS_PROXY="http://127.0.0.1:xxxx"
```

Check whether the proxy has been set successfully:

```shell
echo $HTTP_PROXY
echo $HTTPS_PROXY
```

## Persist the HTTP proxy for the current user

Edit `~/.bashrc` and add the following configuration to the end of the file:

```
# ---- Proxy configuration starts ----  
# Use lowercase variables by default, and export uppercase aliases when needed  
proxy_host=127.0.0.1  
proxy_port=xxxx  
  
export http_proxy="http://${proxy_host}:${proxy_port}"  
export https_proxy="${http_proxy}"  
  
# Some older programs only recognize uppercase variables  
export HTTP_PROXY="${http_proxy}"  
export HTTPS_PROXY="${https_proxy}"  
# ---- Proxy configuration ends ----
```

Then reload the configuration file by running `source ~/.bashrc`.

## **Create an environment and speed up with mamba**

Create a Conda environment:

```shell
conda create -n <env_name>
```

Install mamba. Use mamba instead of conda in later commands to speed up package installation:

```shell
conda install mamba -c conda-forge
```

Activate the created environment:

```shell
conda activate <env_name>
```

Install Python. This version is recommended:

```shell
mamba install python=3.10
```
