---
title: TensorBoard使用
date: 2026-01-30
draft: false
tags:
categories:
  - 学术研究
---

**后台启动** TensorBoard，让它读取 `./runs/` 里的日志，并把输出写进log文件里，即使退出终端也继续跑

```shell
nohup tensorboard --logdir ./runs/ --host 0.0.0.0 --port 56006 > tensorboard_log.txt 2>&1 &
```

然后就可以通过访问`http://ip:56006`打开TensorBoard的网页查看模型训练情况