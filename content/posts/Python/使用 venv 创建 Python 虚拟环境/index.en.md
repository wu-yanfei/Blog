---
title: Create Python Virtual Environments with venv
slug: python-venv-virtual-environment
translationKey: python-venv-virtual-environment
description: "Records how to use Python's built-in venv module to create virtual environments, activate them, install dependencies, specify Python versions, and manage requirements.txt."
date: 2026-06-18
lastmod: 2026-06-18
draft: false
tags:
  - Python
  - venv
  - pip
  - Virtual Environment
  - Environment Setup
categories:
  - Python
---

`venv` is Python's built-in virtual environment tool. It creates a relatively isolated Python runtime for each project, helping avoid dependency conflicts between projects.

## Why virtual environments are needed

If all Python packages are installed into the system Python, different projects may run into dependency conflicts.

For example, one project may require:

```text
Django 4.x
```

Another project may require:

```text
Django 5.x
```

If both are installed into the same Python environment, it becomes difficult to satisfy both projects at the same time. With virtual environments, each project can manage its own dependencies independently.

## Create a virtual environment

Enter the project directory:

```shell
cd your-project
```

Create a virtual environment:

```shell
python3 -m venv .venv
```

If `python` already points to Python 3 on your system, you can also use:

```shell
python -m venv .venv
```

Here, `.venv` is the virtual environment directory name. A common practice is to place it in the project root:

```text
your-project/
├── .venv/
├── main.py
└── requirements.txt
```

## Activate the virtual environment

### macOS / Linux

```shell
source .venv/bin/activate
```

After activation, the terminal prompt usually shows a marker like this:

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

## Check whether the virtual environment is active

After activation, check which Python is being used.

macOS / Linux:

```shell
which python
```

If the virtual environment is active, you should see something like:

```text
/path/to/your-project/.venv/bin/python
```

Windows:

```powershell
where python
```

You can also check the Python and pip versions:

```shell
python --version
python -m pip --version
```

If the `pip` path is under the `.venv` directory, you are using pip from the current virtual environment.

## Install third-party packages

The recommended form is:

```shell
python -m pip install package-name
```

For example, to install `requests`:

```shell
python -m pip install requests
```

It is less reliable to write:

```shell
pip install requests
```

because a computer may have multiple Python installations and multiple pip commands. Using `python -m pip install` ensures that pip belongs to the Python environment currently in use, avoiding installing packages into the wrong location.

## Save and restore project dependencies

After installing dependencies, export the dependency list:

```shell
python -m pip freeze > requirements.txt
```

The generated `requirements.txt` may look like this:

```text
requests==2.32.3
urllib3==2.2.2
```

To restore dependencies in a new environment later, run:

```shell
python -m pip install -r requirements.txt
```

## Deactivate the virtual environment

When you no longer need the current virtual environment, deactivate it:

```shell
deactivate
```

After deactivation, the `(.venv)` marker disappears from the terminal prompt.

## Specify the Python version when creating a virtual environment

When `venv` creates a virtual environment, it uses the Python interpreter that invokes it.

For example:

```shell
python3.11 -m venv .venv
```

This creates a Python 3.11 virtual environment.

```shell
python3.12 -m venv .venv
```

This creates a Python 3.12 virtual environment.

In other words, `venv` does not specify the version like this:

```shell
python -m venv --python 3.11 .venv
```

Instead, call the desired Python version directly:

```shell
python3.11 -m venv .venv
```

On Windows, you can use the `py` launcher:

```powershell
py -3.11 -m venv .venv
```

List installed Python versions:

```powershell
py -0p
```

## venv does not install Python automatically

If you run:

```shell
python3.11 -m venv .venv
```

but the system says it cannot find `python3.11`, then Python 3.11 is not installed on the machine.

`venv` only creates virtual environments from an already installed Python. It does not download or install Python itself.

If you need to manage multiple Python versions, consider using:

- `pyenv`
- Homebrew to install different Python versions
- official Python installers
- Conda / Miniconda

## Change the Python version of a virtual environment

For an existing virtual environment, it is usually not recommended to modify the Python version directly.

If you want to switch from Python 3.12 to Python 3.11, recreate the virtual environment.

First export dependencies:

```shell
python -m pip freeze > requirements.txt
```

Deactivate the environment:

```shell
deactivate
```

Remove the old virtual environment:

```shell
rm -rf .venv
```

Recreate it with the desired Python version:

```shell
python3.11 -m venv .venv
```

Activate it again:

```shell
source .venv/bin/activate
```

Reinstall dependencies:

```shell
python -m pip install -r requirements.txt
```

## Do not commit .venv to Git

The virtual environment directory is usually large and machine-specific, so it should not be committed to a Git repository.

Add this to `.gitignore`:

```gitignore
.venv/
```

The project should commit dependency description files such as:

```text
requirements.txt
```

rather than the entire `.venv` directory.

## Common commands

Create a virtual environment:

```shell
python3 -m venv .venv
```

Activate the virtual environment:

```shell
source .venv/bin/activate
```

Check the Python path:

```shell
which python
```

Install dependencies:

```shell
python -m pip install requests
```

Export dependencies:

```shell
python -m pip freeze > requirements.txt
```

Install dependencies from a file:

```shell
python -m pip install -r requirements.txt
```

Deactivate the virtual environment:

```shell
deactivate
```

Create a virtual environment with a specific Python version:

```shell
python3.11 -m venv .venv
```

## A simple workflow

Initialize a project:

```shell
mkdir my-project
cd my-project

python3 -m venv .venv
source .venv/bin/activate

python -m pip install --upgrade pip
python -m pip install requests

python -m pip freeze > requirements.txt
```

When returning to the project later, run:

```shell
cd my-project
source .venv/bin/activate
```

If someone else receives the project, they can restore the environment like this:

```shell
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
```

## Basic difference between venv and conda

`venv` is suitable for most ordinary Python projects.

`conda` is more suitable for scenarios that need to manage complex binary dependencies, such as:

- scientific computing
- machine learning
- bioinformatics
- packages that require non-Python dependencies

A simple choice is:

```text
Ordinary Python projects: venv
Scientific computing / bioinformatics / machine learning: consider conda
```

## Summary

The core command for creating a Python virtual environment with `venv` is:

```shell
python3 -m venv .venv
```

After activation, prefer using:

```shell
python -m pip install package-name
```

This ensures dependencies are installed into the current virtual environment.

If you need a specific Python version, use the corresponding Python interpreter to create the environment:

```shell
python3.11 -m venv .venv
```

`venv` does not download Python automatically. It can only create virtual environments from Python versions that are already installed on the machine.
