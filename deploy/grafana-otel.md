# OpenTelemetry → Grafana (EC2)

FlagForge exports **HTTP traces** and **metrics** over OTLP when `OTEL_ENABLED=true`.
Use this with **Grafana Cloud** (easiest) or a self-hosted Grafana stack (Alloy/Tempo/Prometheus).

## 1. Grafana Cloud setup

1. Create a [Grafana Cloud](https://grafana.com/products/cloud/) stack (free tier works).
2. In Grafana Cloud → **Connections** → **OpenTelemetry** → **Configure**, copy:
   - OTLP gateway URL (e.g. `https://otlp-gateway-prod-us-central-0.grafana.net/otlp`)
   - Instance ID + Access Policy token (for Basic auth)
3. Build the Authorization header:

```bash
# instance_id:token → base64
echo -n "123456:glc_eyJvIj..." | base64
```

## 2. EC2 `.env`

Add to your repo-root `.env` on the server:

```env
OTEL_ENABLED=true
OTEL_SERVICE_NAME=flagforge-server
OTEL_EXPORTER_OTLP_ENDPOINT=https://otlp-gateway-prod-us-central-0.grafana.net/otlp
OTEL_EXPORTER_OTLP_HEADERS=Authorization=Basic BASE64_INSTANCE_ID_COLON_TOKEN
```

Redeploy / restart:

```bash
./deploy/ec2-install.sh
```

Each HTTP request creates a span with:

| Attribute | Example |
|-----------|---------|
| `http.request.method` | `GET` |
| `url.path` | `/api/v1/projects/.../flags` |
| `http.response.status_code` | `200` |
| `http.server.request.duration_ms` | `42` |

## 3. View latency in Grafana

### Traces (Explore → Tempo)

```
{ resource.service.name = "flagforge-server" }
```

Click a trace to see per-request duration.

### RED metrics from traces (Grafana Cloud APM)

Grafana Cloud can build **rate / errors / duration** dashboards from trace data automatically under **Application** → your service.

### Custom dashboard (Metrics)

If metrics export is enabled, query OpenTelemetry metrics in **Explore → Metrics** for HTTP server histograms (may take ~1 min to appear after first export).

## 4. Self-hosted alternative (Grafana Alloy on EC2)

Run [Grafana Alloy](https://grafana.com/docs/alloy/latest/) on the same EC2 box to receive OTLP locally and forward to your backend:

```yaml
# deploy/alloy-config.example.alloy
otelcol.receiver.otlp "default" {
  grpc { endpoint = "0.0.0.0:4317" }
  http { endpoint = "0.0.0.0:4318" }
  output {
    metrics = [otelcol.exporter.otlp.grafana.input]
    traces  = [otelcol.exporter.otlp.grafana.input]
  }
}

otelcol.exporter.otlp "grafana" {
  client {
    endpoint = env("GRAFANA_OTLP_ENDPOINT")
    auth     = otelcol.auth.basic.grafana.handler
  }
}

otelcol.auth.basic "grafana" {
  username = env("GRAFANA_INSTANCE_ID")
  password = env("GRAFANA_ACCESS_TOKEN")
}
```

Then point FlagForge at the local Alloy receiver:

```env
OTEL_ENABLED=true
OTEL_EXPORTER_OTLP_ENDPOINT=http://127.0.0.1:4318
# no auth needed for local Alloy
```

## 5. Troubleshooting

| Symptom | Check |
|---------|--------|
| No data in Grafana | `OTEL_ENABLED=true`, correct endpoint region, valid Basic auth header |
| Spans in logs but not Grafana | Firewall blocking outbound HTTPS to `otlp-gateway-*.grafana.net` |
| High-cardinality paths | UUIDs in URLs are expected; filter/group by path prefix in dashboards |

Local test without Grafana Cloud (OTLP collector or Alloy on `:4318`):

```env
OTEL_ENABLED=true
OTEL_EXPORTER_OTLP_ENDPOINT=http://127.0.0.1:4318
```

Verify spans in server logs: `OpenTelemetry export enabled`.
