---
title: Using TensorBoard
slug: tensorboard-usage
translationKey: tensorboard-usage
description: "Records how to start TensorBoard in the background with nohup, read training logs, and access the visualization page through a specified port."
date: 2026-01-30
lastmod: 2026-01-30
draft: false
tags:
  - TensorBoard
  - Deep Learning
  - Model Training
  - Visualization
  - nohup
categories:
  - Research
---

Start TensorBoard **in the background**, let it read logs from `./runs/`, and write output to a log file so that it keeps running even after you exit the terminal:

```shell
nohup tensorboard --logdir ./runs/ --host 0.0.0.0 --port 56006 > tensorboard_log.txt 2>&1 &
```

Then you can open the TensorBoard web page by visiting `http://ip:56006` and view the model training status.
