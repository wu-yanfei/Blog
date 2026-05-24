---
title: 生信Conda环境配置
slug: bioinformatics-conda-environment
description: "记录生物信息分析中配置 Conda channels、设置代理、创建环境并使用 mamba 加速安装 Python 包的方法。"
date: 2026-01-26
draft: false
tags:
categories:
  - 学术研究
---

## **配置生物信息channels**

```shell
 # 设置官方源
 conda config --add channels defaults
 conda config --add channels bioconda
 conda config --add channels conda-forge
```

## **http代理**

使用代理环境（仅对当前终端适用），`xxxx`是你代理程序开放的端口：

```shell
​export HTTP_PROXY="http://127.0.0.1:xxxx"
export HTTPS_PROXY="http://127.0.0.1:xxxx"
```

查看代理是否设置成功

```shell
echo $HTTP_PROXY
echo $HTTPS_PROXY
```

## 永久将http代理写入当前用户

编辑 `vim ~/.bachrc`，把下面的配置放到最后即可

```
# ---- 代理配置开始 ----  
# 统一写在小写，必要时再导出大写别名  
proxy_host=127.0.0.1  
proxy_port=xxxx  
  
export http_proxy="http://${proxy_host}:${proxy_port}"  
export https_proxy="${http_proxy}"  
  
# 某些老旧程序只识别大写变量  
export HTTP_PROXY="${http_proxy}"  
export HTTPS_PROXY="${https_proxy}"  
# ---- 代理配置结束 ----
```

然后，重新加载配置文件，执行命令`source ~/.bashrc`

## **创建环境 + mamba加速**

创建conda环境

```shell
conda create -n <env_name>
```

安装mamba，后续命令使用mamba代替conda进行加速

```shell
conda install mamba -c conda-forge
```

进入创建的环境

```shell
conda activate <env_name>
```

安装python，推荐该版本

```shell
mamba install python=3.10
```