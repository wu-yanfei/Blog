---
title: TensorBoard使用
slug: tensorboard-usage
translationKey: tensorboard-usage
description: "记录使用 nohup 后台启动 TensorBoard、读取训练日志并通过指定端口访问可视化页面的方法。"
date: 2026-01-30
lastmod: 2026-01-30
draft: false
tags:
  - TensorBoard
  - 深度学习
  - 模型训练
  - 可视化
  - nohup
categories:
  - 学术研究
---

**后台启动** TensorBoard，让它读取 `./runs/` 里的日志，并把输出写进log文件里，即使退出终端也继续跑

```shell
nohup tensorboard --logdir ./runs/ --host 0.0.0.0 --port 56006 > tensorboard_log.txt 2>&1 &
```

然后就可以通过访问`http://ip:56006`打开TensorBoard的网页查看模型训练情况