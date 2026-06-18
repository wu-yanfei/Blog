---
title: 使用 venv 创建 Python 虚拟环境
slug: python-venv-virtual-environment
translationKey: python-venv-virtual-environment
description: "记录使用 Python 内置 venv 创建虚拟环境、激活环境、安装依赖、指定 Python 版本和管理 requirements.txt 的方法。"
date: 2026-06-18
lastmod: 2026-06-18
draft: false
tags:
  - Python
  - venv
  - pip
  - 虚拟环境
  - 环境配置
categories:
  - Python
---

`venv` 是 Python 官方自带的虚拟环境工具，可以为每个项目创建相对独立的 Python 运行环境，避免不同项目之间的依赖版本互相影响。

## 为什么需要虚拟环境

如果所有 Python 包都安装到系统 Python 中，不同项目可能会发生依赖冲突。

例如，一个项目需要：

```text
Django 4.x
```

另一个项目需要：

```text
Django 5.x
```

如果都安装到同一个 Python 环境中，就很难同时满足两个项目的版本要求。使用虚拟环境后，每个项目都可以单独管理自己的依赖。

## 创建虚拟环境

进入项目目录：

```shell
cd your-project
```

创建虚拟环境：

```shell
python3 -m venv .venv
```

如果系统中的 `python` 已经指向 Python 3，也可以使用：

```shell
python -m venv .venv
```

这里的 `.venv` 是虚拟环境目录名。常见做法是把它放在项目根目录下：

```text
your-project/
├── .venv/
├── main.py
└── requirements.txt
```

## 激活虚拟环境

### macOS / Linux

```shell
source .venv/bin/activate
```

激活后，终端前面通常会出现类似标记：

```text
(.venv)
```

### Windows PowerShell

```powershell
.\.venv\Scripts\Activate.ps1
```

### Windows CMD

```cmd
.venv\Scripts\activate.bat
```

## 检查虚拟环境是否生效

激活后，可以检查当前使用的是哪个 Python。

macOS / Linux：

```shell
which python
```

如果虚拟环境已经生效，应该看到类似：

```text
/path/to/your-project/.venv/bin/python
```

Windows：

```powershell
where python
```

也可以检查 Python 和 pip 版本：

```shell
python --version
python -m pip --version
```

如果 `pip` 路径位于 `.venv` 目录下，就说明当前正在使用虚拟环境中的 pip。

## 安装第三方包

推荐使用：

```shell
python -m pip install 包名
```

例如安装 `requests`：

```shell
python -m pip install requests
```

不太推荐直接写：

```shell
pip install requests
```

因为电脑上可能同时存在多个 Python 和多个 pip。使用 `python -m pip install` 可以确保这个 pip 属于当前正在使用的 Python 环境，避免把包安装到错误的位置。

## 保存和恢复项目依赖

安装完依赖后，可以导出依赖列表：

```shell
python -m pip freeze > requirements.txt
```

生成的 `requirements.txt` 可能类似：

```text
requests==2.32.3
urllib3==2.2.2
```

以后在新环境中恢复依赖时，可以运行：

```shell
python -m pip install -r requirements.txt
```

## 退出虚拟环境

如果不再使用当前虚拟环境，可以退出：

```shell
deactivate
```

退出后，终端前面的 `(.venv)` 标记会消失。

## 指定 Python 版本创建虚拟环境

`venv` 创建虚拟环境时，使用的是调用它的那个 Python 解释器。

例如：

```shell
python3.11 -m venv .venv
```

创建出来的虚拟环境就是 Python 3.11。

```shell
python3.12 -m venv .venv
```

创建出来的虚拟环境就是 Python 3.12。

也就是说，`venv` 不是通过下面这种方式指定版本：

```shell
python -m venv --python 3.11 .venv
```

而是通过调用指定版本的 Python 来创建：

```shell
python3.11 -m venv .venv
```

Windows 上可以使用 `py` 启动器：

```powershell
py -3.11 -m venv .venv
```

查看已安装的 Python 版本：

```powershell
py -0p
```

## venv 不会自动安装 Python

如果运行：

```shell
python3.11 -m venv .venv
```

但是系统提示找不到 `python3.11`，说明本机还没有安装 Python 3.11。

`venv` 只负责基于已有的 Python 创建虚拟环境，不负责下载和安装 Python 本身。

如果需要管理多个 Python 版本，可以考虑使用：

- `pyenv`
- Homebrew 安装不同 Python 版本
- 官方 Python 安装包
- Conda / Miniconda

## 更换虚拟环境的 Python 版本

已经创建好的虚拟环境，一般不建议直接修改 Python 版本。

如果想从 Python 3.12 换到 Python 3.11，推荐重新创建虚拟环境。

先导出依赖：

```shell
python -m pip freeze > requirements.txt
```

退出虚拟环境：

```shell
deactivate
```

删除旧虚拟环境：

```shell
rm -rf .venv
```

使用指定版本重新创建：

```shell
python3.11 -m venv .venv
```

重新激活：

```shell
source .venv/bin/activate
```

重新安装依赖：

```shell
python -m pip install -r requirements.txt
```

## 不要把 .venv 提交到 Git

虚拟环境目录通常比较大，而且和本机环境相关，不应该提交到 Git 仓库。

可以在 `.gitignore` 中加入：

```gitignore
.venv/
```

项目中应该提交的是依赖说明文件，例如：

```text
requirements.txt
```

而不是整个 `.venv` 目录。

## 常用命令总结

创建虚拟环境：

```shell
python3 -m venv .venv
```

激活虚拟环境：

```shell
source .venv/bin/activate
```

检查 Python 路径：

```shell
which python
```

安装依赖：

```shell
python -m pip install requests
```

导出依赖：

```shell
python -m pip freeze > requirements.txt
```

安装依赖文件：

```shell
python -m pip install -r requirements.txt
```

退出虚拟环境：

```shell
deactivate
```

指定 Python 版本创建虚拟环境：

```shell
python3.11 -m venv .venv
```

## 一个简单工作流

初始化项目：

```shell
mkdir my-project
cd my-project

python3 -m venv .venv
source .venv/bin/activate

python -m pip install --upgrade pip
python -m pip install requests

python -m pip freeze > requirements.txt
```

以后重新进入项目时，只需要：

```shell
cd my-project
source .venv/bin/activate
```

如果是别人拿到这个项目，可以这样恢复环境：

```shell
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
```

## venv 和 conda 的简单区别

`venv` 适合大多数普通 Python 项目。

`conda` 更适合需要管理复杂二进制依赖的场景，例如：

- 科学计算
- 机器学习
- 生物信息学
- 需要安装非 Python 依赖的软件包

简单选择：

```text
普通 Python 项目：venv
科学计算 / 生信 / 机器学习：conda 可以考虑
```

## 总结

使用 `venv` 创建 Python 虚拟环境的核心命令是：

```shell
python3 -m venv .venv
```

激活后，推荐始终使用：

```shell
python -m pip install 包名
```

这样可以确保依赖安装到当前虚拟环境中。

如果需要指定 Python 版本，就使用对应版本的解释器创建虚拟环境：

```shell
python3.11 -m venv .venv
```

`venv` 不会自动下载 Python，它只能基于本机已经安装好的 Python 来创建虚拟环境。
