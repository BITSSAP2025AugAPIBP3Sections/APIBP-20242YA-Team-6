SHELL := /bin/sh

# Default variables (override on invocation: e.g. `make build SERVICE=auth`)
SERVICE ?=
SERVICES ?=

.PHONY: help
help: ## Show available targets
	@grep -E '^[a-zA-Z_-]+:.*?##' Makefile | sed -E 's/:.*##/\t- /' | sort

.PHONY: install
install: ## Install JS workspaces (safe even if some services are non-Node)
	@if [ -f package.json ]; then npm install || true; fi

.PHONY: install-all
install-all: ## Install all dependencies (Node.js and Python)
	@echo "🔧 Installing dependencies for all services..."
	@chmod +x scripts/install-deps.sh
	@scripts/install-deps.sh

.PHONY: install-node
install-node: ## Install only Node.js dependencies
	@echo "📦 Installing Node.js dependencies..."
	@npm install

.PHONY: install-python
install-python: ## Install only Python dependencies
	@echo "🐍 Installing Python dependencies..."
	@for service in events vendors; do \
		if [ -f "services/$$service/requirements.txt" ]; then \
			echo "Installing dependencies for $$service service..."; \
			cd "services/$$service" && pip install -r requirements.txt && cd ../..; \
		fi; \
	done

.PHONY: build
build: ## Build gateway + any TS node services present
	@if [ -f package.json ]; then npm run build || true; fi

.PHONY: dev-gateway
dev-gateway: ## Run gateway in watch/dev mode
	@if [ -d gateway ]; then npm run dev:gateway || echo 'Gateway not present'; fi

.PHONY: up
up: ## Start full stack via docker-compose
	docker compose up -d --build

.PHONY: down
down: ## Stop stack
	docker compose down

.PHONY: logs
logs: ## Tail logs for all containers (Ctrl+C to stop)
	docker compose logs -f --tail=100

.PHONY: logs-service
logs-service: ## Tail logs for one service: make logs-service SERVICE=auth-service
	@if [ -z "$(SERVICE)" ]; then echo 'SERVICE required (container name)'; exit 1; fi
	docker compose logs -f --tail=100 $(SERVICE)

.PHONY: health
health: ## Curl all known service health endpoints (best effort)
	@for port in 8080 8001 8002 8003 8004 8005 8006; do \
	  echo "--- $$port"; \
	  (curl -s http://localhost:$$port/health || echo 'unreachable') | sed 's/.*/  &/'; \
	done

.PHONY: clean
clean: ## Remove Node build artifacts
	rm -rf **/dist 2>/dev/null || true

.PHONY: prune
prune: ## Remove dangling docker images & volumes (careful!)
	docker system prune -f

.PHONY: format
format: ## Placeholder: run formatting if configured
	@echo 'Add prettier / black / google-java-format as needed.'

.PHONY: new-service
new-service: ## Scaffold a new service folder (name via SERVICE=foo) (no stack code)
	@if [ -z "$(SERVICE)" ]; then echo 'SERVICE required: make new-service SERVICE=foo'; exit 1; fi
	@mkdir -p services/$(SERVICE)/src
	@if [ ! -f services/$(SERVICE)/README.md ]; then \
	  printf '%s\n' "# $(SERVICE) Service" \
	    'Status: Scaffold only.' \
	    '' \
	    'Implement health endpoint at /health returning {"status":"ok","service":"$(SERVICE)"}.' \
	    'See ../../docs/services/CONVENTIONS.md' > services/$(SERVICE)/README.md; \
	fi
	@echo "Scaffold created at services/$(SERVICE)"

.PHONY: destroy
destroy: ## Tear down stack, remove volumes, local images, and prune dangling artifacts
	@echo 'Stopping and removing containers, volumes, and local images...'
	docker compose down -v --rmi local || true
	@echo 'Pruning dangling images and build cache...'
	docker system prune -f
	@echo 'Destroy complete.'

.PHONY: dev-infra
dev-infra: ## Start infra only (legacy target kept for clarity)
	docker compose up -d nats kafka auth-db events-db vendors-db tasks-db attendees-db
	@echo 'Infra started. Run services manually or use make dev.'

.PHONY: dev
dev: ## Full developer mode: infra + all services (hot reload) on host
	SERVICES="$(SERVICES)" bash scripts/dev-all.sh

.PHONY: dev-prep
dev-prep: ## Pre-create Python venvs & install deps (events, vendors) for faster first dev
	@for svc in events vendors; do \
	  dir=services/$$svc; \
	  if [ -d "$$dir" ]; then \
	    echo "[dev-prep] preparing $$svc"; \
	    if [ ! -d "$$dir/.venv" ]; then python3 -m venv "$$dir/.venv"; fi; \
	    . "$$dir/.venv/bin/activate"; \
	    if [ -f "$$dir/requirements.txt" ]; then \
	      HASH_FILE="$$dir/.venv/.req-hash"; \
	      REQ_HASH=`shasum -a 1 "$$dir/requirements.txt" | awk '{print $$1}'`; \
	      if [ ! -f "$$HASH_FILE" ] || [ "`cat $$HASH_FILE`" != "$$REQ_HASH" ]; then \
	        echo "[dev-prep] installing deps for $$svc"; \
	        pip install -q -r "$$dir/requirements.txt"; \
	        echo "$$REQ_HASH" > "$$HASH_FILE"; \
	      else \
	        echo "[dev-prep] deps unchanged for $$svc"; \
	      fi; \
	    fi; \
	  fi; \
	done

.PHONY: stop-dev
stop-dev: ## Stop processes started by make dev (if still backgrounded)
	@if [ -f .dev-pids ]; then awk ' { a[NR]=$$0 } END { for (i=NR;i>0;i--) print a[i] }' .dev-pids | cut -d: -f1 | xargs -r kill 2>/dev/null || true; rm -f .dev-pids; echo 'Stopped dev processes.'; else echo '.dev-pids not found (dev not running?)'; fi

.PHONY: test-health
test-health: ## Run scripts/test-health.sh to verify all /health endpoints
	bash scripts/test-health.sh

.PHONY: kill-ports
kill-ports: ## Force kill any processes listening on service ports (8080,8001-8006)
	@echo 'Killing processes on known service ports...'
	@PORTS="8080 8001 8002 8003 8004 8005 8006"; \
	for p in $$PORTS; do \
	  pids=`lsof -tiTCP:$$p -sTCP:LISTEN 2>/dev/null || true`; \
	  if [ -n "$$pids" ]; then \
	    echo " - $$p: $$pids"; \
	    echo "$$pids" | xargs -r kill 2>/dev/null || true; \
	  else \
	    echo " - $$p: free"; \
	  fi; \
	done
