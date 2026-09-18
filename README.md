# AI Learning Assistant

An AI-powered learning assistant that combines **Retrieval-Augmented Generation (RAG)** and **Large Language Models (LLMs)** to provide document-grounded Q&A, AI-generated quizzes, and essay grading.

## Overview

AI Learning Assistant is an individual project designed to support students in studying from their own learning materials.

The system processes documents and learning media, converts their content into searchable vector representations, retrieves relevant context using semantic search, and uses an LLM to generate grounded answers with source citations.

It also provides AI-assisted quiz generation and essay grading.

## Key Features

* 📚 Upload and process learning materials

  * PDF documents
  * Images
  * Video files
* 🔎 Semantic search using vector embeddings
* 🤖 RAG-based document-grounded Q&A
* 📌 Source citations for generated answers
* 🧠 LLM-based context reranking
* 📝 AI-generated multiple-choice quizzes
* ✍️ AI-assisted essay grading with structured feedback
* 🔐 JWT authentication and role-based authorization
* 🛡️ Request validation and rate limiting
* 🔔 Study reminders and push notifications
* 📊 Learning dashboard and activity tracking
* 🐳 Dockerized development and deployment
* 🧪 Unit, integration, and E2E testing

## RAG Pipeline

The main question-answering pipeline follows these steps:

```text
User Question
      │
      ▼
Query Embedding
      │
      ▼
PostgreSQL + pgvector
Semantic Retrieval
      │
      ▼
Candidate Contexts
      │
      ▼
LLM Reranking
      │
      ▼
Relevant Context
      │
      ▼
Answer Generation
      │
      ▼
Citation Resolution
      │
      ▼
Answer + Sources
```

The retrieval stage first selects candidate chunks using vector similarity. The candidates are then reranked by an LLM before the final context is passed to the answer generation step.

The system also applies a relevance threshold and falls back when the retrieved context is insufficient, reducing the risk of generating unsupported answers.

## Document Processing Pipeline

Learning materials are processed according to their input type:

```text
PDF    ──► Text Extraction ──► Chunking ──► Embeddings
Image  ──► Vision Extraction ──► Chunking ──► Embeddings
Video  ──► Audio Extraction ──► Transcription ──► Chunking ──► Embeddings
```

Text is divided into overlapping chunks before embedding.

* Chunk size: 400 words
* Overlap: 50 words
* Embedding model: `text-embedding-3-small`
* Vector storage: PostgreSQL + pgvector
* Vector index: HNSW

## AI Quiz & Essay Grading

The system supports AI-assisted learning beyond question answering.

### Quiz Generation

The LLM generates structured quiz data from learning material. Generated output is validated using **Zod** before being persisted.

```text
Learning Content
      │
      ▼
LLM Generation
      │
      ▼
JSON Output
      │
      ▼
Zod Validation
      │
      ├── Valid ──► Save Quiz
      │
      └── Invalid ─► Retry
```

### Essay Grading

Essays are evaluated using an LLM and returned with:

* Score from 0–100
* Feedback
* Correct points
* Missing points
* Suggestions for improvement

## Tech Stack

### Backend

* TypeScript
* NestJS
* Prisma
* PostgreSQL
* pgvector
* OpenAI API
* JWT
* Swagger
* Zod
* Jest
* Supertest

### Frontend

* React
* TypeScript
* Vite

### Infrastructure

* Docker
* Docker Compose
* Nginx
* PostgreSQL + pgvector

## Architecture

The project follows a modular backend architecture based on NestJS.

```text
React Frontend
      │
      ▼
REST API
      │
      ▼
NestJS Backend
      │
      ├── Authentication
      ├── Subjects
      ├── Materials
      ├── RAG
      ├── Quiz
      ├── Dashboard
      ├── Reminders
      └── Admin
      │
      ▼
Prisma ORM
      │
      ▼
PostgreSQL + pgvector
      │
      └── Vector Search
```

External AI services are accessed through the OpenAI API for embeddings, content extraction, reranking, answer generation, quiz generation, and essay grading.

## Reliability & Error Handling

The system includes several mechanisms for handling failures during AI and document-processing workflows:

* API retry with delay handling
* Validation of structured LLM output
* Reprocessing of failed embeddings
* Explicit material processing states
* Relevance threshold for retrieved context
* Fallback when sufficient context cannot be retrieved
* Global exception handling
* Request validation
* Rate limiting

For example, embedding failures are tracked separately instead of incorrectly marking a material as fully ready. Failed materials can be reprocessed without repeating the entire extraction and chunking pipeline.

## Testing

The backend uses **Jest**, **Supertest**, and NestJS testing utilities.

Testing covers areas including:

* Authentication
* Role authorization
* Material processing
* RAG services
* Answer generation
* Quiz generation
* Essay grading
* Dashboard services
* Reminder services
* API endpoints
* End-to-end application flows

## Running the Project

### Prerequisites

* Node.js 22+
* Docker Desktop
* Docker Compose
* OpenAI API key

### Environment Variables

Create environment files based on the provided examples:

```bash
cp .env.example .env
cp backend/.env.example backend/.env
```

Configure the required database, authentication, email, and OpenAI settings before starting the application.

### Docker

Start the application using:

```bash
docker compose up --build
```

The project includes Docker configurations for:

* PostgreSQL with pgvector
* NestJS backend
* React frontend
* Nginx

### Development

Install dependencies:

```bash
npm install
```

Then follow the backend and frontend package scripts for development, testing, and production builds.

## Project Structure

```text
ai-hoc-tap/
├── backend/
│   ├── prisma/
│   ├── src/
│   │   ├── auth/
│   │   ├── material/
│   │   ├── rag/
│   │   ├── quiz/
│   │   ├── dashboard/
│   │   ├── reminder/
│   │   └── ...
│   └── test/
│
├── frontend/
│   ├── src/
│   └── public/
│
├── scripts/
├── docker-compose.yml
├── DOCKER.md
└── README.md
```

## Project Status

This project is an individual academic project and is actively developed as a learning and portfolio project.

The main focus is on applying **RAG, LLM integration, backend engineering, vector search, testing, and containerized deployment** to an educational application.
