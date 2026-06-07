---
title: Use du to Check Directory Disk Usage
slug: du-check-directory-disk-usage
translationKey: du-check-directory-disk-usage
description: "Records how to use du on Linux to check disk usage for the current directory, subdirectories, and files, and sort the results by size."
date: 2026-05-31
lastmod: 2026-05-31
draft: false
tags:
  - du
  - Disk Usage
  - File Management
  - Command Line
categories:
  - Linux
---

`du` can be used to check the actual disk space used by files and directories.

## Check one level under the current directory

```shell
du -h --max-depth=1 .
```

Parameter explanations:

- `-h`: display sizes in easier-to-read units, such as `K`, `M`, and `G`
- `--max-depth=1`: only summarize files and directories one level under the current directory
- `.`: the current directory

Example output:

```text
4.0K    ./logs
128M    ./data
1.2G    ./backup
1.4G    .
```

The final `.` line shows the total disk usage of the current directory.

## Sort by size

```shell
du -h --max-depth=1 . | sort -h
```

`sort -h` sorts by human-readable size units, making it easier to find the largest directories.

To show the largest entries first:

```shell
du -h --max-depth=1 . | sort -hr
```

## Check only the total size of the current directory

```shell
du -sh .
```

Common parameters:

- `-s`: show only the summary result
- `-h`: display sizes in easier-to-read units

## Check each file and directory in the current directory

```shell
du -sh ./*
```

This command shows the size of each non-hidden file and directory in the current directory.

## Include hidden files

To include hidden files and hidden directories as well, run:

```shell
du -sh ./* ./.??* 2>/dev/null
```

Where:

- `./*`: matches normal files and directories
- `./.??*`: matches hidden files and hidden directories while avoiding `.` and `..`
- `2>/dev/null`: ignores error messages when no file is matched

## Common command summary

```shell
# Sizes of one level under the current directory
du -h --max-depth=1 .

# Sizes of one level under the current directory, sorted by size
du -h --max-depth=1 . | sort -h

# Total size of the current directory
du -sh .

# Size of each non-hidden file and directory in the current directory
du -sh ./*

# Include hidden files and hidden directories
du -sh ./* ./.??* 2>/dev/null
```
