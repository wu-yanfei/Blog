---
title: 使用 du 查看目录占用空间
slug: du-check-directory-disk-usage
translationKey: du-check-directory-disk-usage
description: "记录 Linux 中使用 du 查看当前目录、子目录和文件占用空间的方法，并按大小排序。"
date: 2026-05-31
lastmod: 2026-05-31
draft: false
tags:
categories:
  - Linux
---

`du` 可以用来查看文件和目录实际占用的磁盘空间。

## 查看当前目录下一层大小

```shell
du -h --max-depth=1 .
```

参数说明：

- `-h`：用更容易阅读的单位显示，例如 `K`、`M`、`G`
- `--max-depth=1`：只统计当前目录下一层文件和文件夹
- `.`：当前目录

输出示例：

```text
4.0K    ./logs
128M    ./data
1.2G    ./backup
1.4G    .
```

最后一行的 `.` 表示当前目录总占用空间。

## 按大小排序

```shell
du -h --max-depth=1 . | sort -h
```

`sort -h` 会按人类可读的容量单位排序，方便找出占用空间最大的目录。

如果想让最大的排在最上面：

```shell
du -h --max-depth=1 . | sort -hr
```

## 只查看当前目录总大小

```shell
du -sh .
```

常用参数：

- `-s`：只显示汇总结果
- `-h`：用更容易阅读的单位显示

## 查看当前目录下每个文件和文件夹大小

```shell
du -sh ./*
```

这个命令会显示当前目录下每个非隐藏文件和文件夹的大小。

## 包含隐藏文件

如果还想把隐藏文件和隐藏目录也统计进去，可以运行：

```shell
du -sh ./* ./.??* 2>/dev/null
```

其中：

- `./*`：匹配普通文件和文件夹
- `./.??*`：匹配隐藏文件和隐藏文件夹，避免匹配 `.` 和 `..`
- `2>/dev/null`：忽略没有匹配到文件时的错误提示

## 常用命令汇总

```shell
# 当前目录下一层大小
du -h --max-depth=1 .

# 当前目录下一层大小，并按大小排序
du -h --max-depth=1 . | sort -h

# 当前目录总大小
du -sh .

# 当前目录下每个非隐藏文件和文件夹大小
du -sh ./*

# 包含隐藏文件和隐藏目录
du -sh ./* ./.??* 2>/dev/null
```
