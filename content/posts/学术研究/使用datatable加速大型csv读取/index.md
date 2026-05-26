---
title: 使用datatable加速大型csv读取
slug: datatable-fast-large-csv-reading
translationKey: datatable-fast-large-csv-reading
description: "介绍在 Python 中使用 datatable 快速读取大型 CSV 文件，并将结果转换为 Pandas DataFrame 的基本用法。"
date: 2025-07-18
draft: false
tags:
categories:
  - 学术研究
---

一般读取csv使用pandas就够用了，但是读取大型csv会比较慢。之前在学习R语言时用了fread和fwrite，读取和写入非常快，后来发现python上也有类似的包`datatable`

安装datatable（使用mamba）：

```shell
mamba install conda-forge::datatable
```

例子：

```python
import datatable as dt

# 自动推断文件类型并快速加载
df = dt.fread("path/to/your/data.csv")

# Datatable -> Pandas
pandas_df_new = dt_frame.to_pandas()
```