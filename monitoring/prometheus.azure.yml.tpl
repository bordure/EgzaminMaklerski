global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: "egzamin_backend"
    static_configs:
      - targets: ["${backend_internal_host}"]
    metrics_path: /metrics
