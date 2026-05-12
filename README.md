# Egzamin Maklerski

[![CI/CD Dev](https://github.com/SURFLOU/EgzaminMaklerski/actions/workflows/ci-cd-dev.yml/badge.svg)](https://github.com/SURFLOU/EgzaminMaklerski/actions/workflows/ci-cd-dev.yml)
[![CI/CD Prod](https://github.com/SURFLOU/EgzaminMaklerski/actions/workflows/ci-cd-prd.yml/badge.svg)](https://github.com/SURFLOU/EgzaminMaklerski/actions/workflows/ci-cd-prd.yml)
[![Website](https://img.shields.io/website?url=https%3A%2F%2Fegzaminmaklerski.online&label=egzaminmaklerski.online)](https://egzaminmaklerski.online)

A web application for studying and simulating the Polish securities broker exam (Egzamin Maklerski). It allows users to solve past KNF exam papers, browse questions by category, and generate custom mock exams.

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Local Development](#local-development)
- [CI/CD](#cicd)

## Features

- Solve past official exam papers from KNF
- Browse questions by exam category (e.g. Law, Financial Mathematics)
- Generate mock exams from a configurable question pool
- Study mode and exam mode with countdown timer
- Automatic scoring: +2 correct, -1 incorrect, 0 skipped
- Per-user statistics and progress tracking

## Architecture

| Component | Description |
|-----------|-------------|
| Frontend | React + Vite SPA served via Nginx |
| Backend | FastAPI REST API backed by MongoDB |
| Functions | Azure Functions for blob ingestion and AI learning advisor |
| Scraper | Python script that extracts and parses questions from KNF PDFs |

## Tech Stack

**Frontend:** React, Vite, Tailwind CSS  
**Backend:** FastAPI, Python 3.12, MongoDB  
**Functions:** Azure Functions (Python 3.11), Azure Blob Storage  
**AI:** Azure OpenAI (learning advisor)  
**Monitoring:** Prometheus, Grafana  
**Infrastructure:** Azure Container Apps, Terraform  
**CI/CD:** GitHub Actions, Docker Hub  

## Local Development

**Prerequisites:** Docker, Docker Compose

1. Copy and populate the environment file:
   ```bash
   cp .env.example .env
   ```

2. Start all services:
   ```bash
   docker compose up --build
   ```

| Service | Local URL |
|---------|-----------|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:8000/docs |
| Azure Functions | http://localhost:7071 |
| Prometheus | http://localhost:9090 |
| Grafana | http://localhost:3001 |

**Running backend tests:**
```bash
cd backend
pip install -e ".[dev]"
pytest -q
```

## CI/CD

Two pipelines run on push via GitHub Actions:

| Branch | Environment |
|--------|-------------|
| `dev` | Dev (Azure) |
| `main` | Prod (Azure) |

Each pipeline runs backend tests, builds and pushes Docker images to Docker Hub, then deploys to Azure Container Apps and Azure Functions. If the target Azure resource group does not exist (only one environment is kept running at a time), the deploy steps are skipped and the pipeline still passes.

Infrastructure is provisioned with Terraform under `terraform/environments/`.

