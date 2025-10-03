# Development Setup

This document explains how to get a local environment running for the polyglot event platform monorepo.

---
## Prerequisites
| Tool | Recommended Version | Notes |
|------|---------------------|-------|
| Node.js | 20.x LTS | Gateway & TS services |
| npm | Bundled with Node | Yarn/pnpm optional (stick to one) |
| Docker & Compose | Latest | Local infra & DBs |
| Python | 3.12.x | For Python-based services (future) |
| Java (JDK) | 21 LTS | For Spring Boot services |
| Make (optional) | Any | For `Makefile` tasks |
| go-task (optional) | v3+ | Alternative to Make |

Optional helpful tools: `httpie`, `jq`, `curl`.

---
## First-Time Setup
```
git clone <repo-url>
cd APIBP-20242YA-Team-6
npm install              # installs gateway + any Node service deps
```

Confirm the gateway builds:
```
npm run build -w gateway
npm start -w gateway
curl http://localhost:8080/health
```

Stop the process (Ctrl+C) when done.

---
## Running Full Stack (Containers)
```
make up          # or: docker compose up -d --build
make health      # polls all known ports
make logs        # follow all logs
make down        # stop everything
```

Services defined in `docker-compose.yml` that do not yet have code will still build (empty images) if a Dockerfile exists — you can add them incrementally.

---
## Adding a New Service (Minimal)
1. Pick a name: `payments`, `events`, etc.
2. Scaffold:
   ```
   make new-service SERVICE=payments
   ```
3. Choose stack and implement health endpoint:

### Node (TypeScript)
```
npm init -y
npm install express dotenv
npm install -D typescript ts-node @types/node @types/express
npx tsc --init --rootDir src --outDir dist --esModuleInterop
```
`src/index.ts`:
```ts
import 'dotenv/config';
import express from 'express';
const PORT = Number(process.env.PORT || 8010);
const app = express();
app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'payments' }));
app.listen(PORT, () => console.log(`payments listening on ${PORT}`));
```
Dockerfile example:
```
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY tsconfig.json ./
COPY src ./src
RUN npm run build || npx tsc
EXPOSE 8010
CMD ["node","dist/index.js"]
```

### Python (FastAPI)
`pyproject.toml` (Poetry example):
```
[tool.poetry]
name = "payments-service"
version = "0.1.0"
description = ""
authors = ["Team <team@example.com>"]

[tool.poetry.dependencies]
python = "^3.12"
fastapi = "^0.115.0"
uvicorn = { extras = ["standard"], version = "^0.30.0" }

[build-system]
requires = ["poetry-core"]
build-backend = "poetry.core.masonry.api"
```
`main.py`:
```
from fastapi import FastAPI
import os
app = FastAPI()
@app.get("/health")
def health():
    return {"status": "ok", "service": "payments"}
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT", "8010")))
```
Dockerfile:
```
FROM python:3.12-slim
WORKDIR /app
COPY pyproject.toml poetry.lock* ./
RUN pip install poetry && poetry install --no-root --no-interaction --no-ansi
COPY . .
EXPOSE 8010
CMD ["poetry","run","uvicorn","main:app","--host","0.0.0.0","--port","8010"]
```

### Java (Spring Boot)
Minimal `pom.xml` (Maven):
```
<project xmlns="http://maven.apache.org/POM/4.0.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 http://maven.apache.org/xsd/maven-4.0.0.xsd">
  <modelVersion>4.0.0</modelVersion>
  <groupId>com.example</groupId>
  <artifactId>payments-service</artifactId>
  <version>0.0.1-SNAPSHOT</version>
  <properties>
    <java.version>21</java.version>
    <spring.boot.version>3.3.3</spring.boot.version>
  </properties>
  <dependencies>
    <dependency>
      <groupId>org.springframework.boot</groupId>
      <artifactId>spring-boot-starter-web</artifactId>
      <version>${spring.boot.version}</version>
    </dependency>
  </dependencies>
  <build>
    <plugins>
      <plugin>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-maven-plugin</artifactId>
        <version>${spring.boot.version}</version>
      </plugin>
    </plugins>
  </build>
</project>
```
Controller:
```
@RestController
public class HealthController {
  @GetMapping("/health")
  public Map<String, String> health() {
    return Map.of("status","ok","service","payments");
  }
}
```
`application.properties`:
```
server.port=8010
```
Dockerfile (multi-stage):
```
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /workspace
COPY pom.xml .
RUN mvn -q -e -DskipTests dependency:go-offline
COPY src ./src
RUN mvn -q -DskipTests package

FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /workspace/target/*SNAPSHOT.jar app.jar
EXPOSE 8010
ENTRYPOINT ["java","-jar","/app/app.jar"]
```

---
## Updating `docker-compose.yml`
Add a new service block similar to existing ones. Ensure:
* Unique port mapping (host side)
* DB container only if truly needed early (prefer deferring)

---
## Environment Variables
Store runtime defaults in `.env.example` inside each service. DO NOT commit real `.env` values. Common variables:
| Variable | Purpose |
|----------|---------|
| PORT | Service listening port |
| DATABASE_URL | Future persistence connection string |
| NATS_URL | Event bus endpoint (future) |

---
## Inter-Service Communication (Future)
Until real messaging is introduced, avoid making assumptions. When ready:
1. Define contract (GraphQL SDL / OpenAPI / JSON Schema).
2. Add generated types to `libs/`.
3. Introduce event naming convention (e.g. `events.<domain>.<action>.v1`).

---
## Logs & Observability
Current: console JSON lines (gateway). For new services:
* Use a single structured log per startup.
* Include `service`, `port`, `version` fields if possible.

---
## Troubleshooting
| Symptom | Likely Cause | Fix |
|---------|--------------|-----|
| TS cannot find `process` | Node types not loaded | Ensure `types: ["node"]` in base tsconfig |
| Container build slow | Large dependency install | Add multi-stage build or prune dev deps |
| Port already in use | Orphan process | `lsof -i :PORT` then kill |
| Health 503 on `/ready` | Service not fully started | Wait or inspect logs |

---
## Cleanup
```
make down
docker system prune -f   # optional (removes dangling)
```

---
Refer to `CONTRIBUTING.md` for collaboration process. Raise issues for anything unclear.

Happy hacking! 🚀
