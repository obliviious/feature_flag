use std::collections::HashMap;
use std::time::Duration;

use base64::{engine::general_purpose::STANDARD, Engine as _};
use opentelemetry::global;
use opentelemetry::trace::TracerProvider as _;
use opentelemetry_otlp::{WithExportConfig, WithHttpConfig};
use opentelemetry_sdk::metrics::{PeriodicReader, SdkMeterProvider};
use opentelemetry_sdk::trace::{RandomIdGenerator, SdkTracerProvider};
use opentelemetry_sdk::Resource;
use tracing_subscriber::layer::SubscriberExt;
use tracing_subscriber::util::SubscriberInitExt;
use tracing_subscriber::{fmt, EnvFilter};

use crate::config::OtelConfig;

/// Flushes OTLP exporters on shutdown.
pub struct TelemetryGuard {
    tracer_provider: SdkTracerProvider,
    meter_provider: SdkMeterProvider,
}

impl Drop for TelemetryGuard {
    fn drop(&mut self) {
        if let Err(e) = self.tracer_provider.shutdown() {
            eprintln!("OpenTelemetry tracer shutdown error: {e}");
        }
        if let Err(e) = self.meter_provider.shutdown() {
            eprintln!("OpenTelemetry meter shutdown error: {e}");
        }
    }
}

pub fn init_logging_only(log_level: &str) {
    let env_filter = EnvFilter::try_from_default_env()
        .unwrap_or_else(|_| EnvFilter::new(log_level));

    tracing_subscriber::registry()
        .with(env_filter)
        .with(fmt::layer())
        .init();
}

pub fn init(config: &OtelConfig, log_level: &str) -> anyhow::Result<Option<TelemetryGuard>> {
    if !config.enabled {
        init_logging_only(log_level);
        return Ok(None);
    }

    let env_filter = EnvFilter::try_from_default_env()
        .unwrap_or_else(|_| EnvFilter::new(log_level));

    let headers = resolve_otlp_headers(config)?;
    let resource = Resource::builder()
        .with_service_name(config.service_name.clone())
        .build();

    // Use the blocking reqwest client (BatchSpanProcessor exports from a background thread
    // without a Tokio runtime — async reqwest panics with "no reactor running").
    let trace_exporter = opentelemetry_otlp::SpanExporter::builder()
        .with_http()
        .with_endpoint(format!("{}/v1/traces", config.otlp_endpoint.trim_end_matches('/')))
        .with_headers(headers.clone())
        .with_timeout(Duration::from_secs(10))
        .build()?;

    let tracer_provider = SdkTracerProvider::builder()
        .with_id_generator(RandomIdGenerator::default())
        .with_resource(resource.clone())
        .with_batch_exporter(trace_exporter)
        .build();

    global::set_tracer_provider(tracer_provider.clone());

    let meter_exporter = opentelemetry_otlp::MetricExporter::builder()
        .with_http()
        .with_endpoint(format!("{}/v1/metrics", config.otlp_endpoint.trim_end_matches('/')))
        .with_headers(headers)
        .with_timeout(Duration::from_secs(10))
        .build()?;

    let reader = PeriodicReader::builder(meter_exporter)
        .with_interval(Duration::from_secs(60))
        .build();

    let meter_provider = SdkMeterProvider::builder()
        .with_resource(resource)
        .with_reader(reader)
        .build();

    global::set_meter_provider(meter_provider.clone());

    let tracer = tracer_provider.tracer("flagforge-server");
    let otel_layer = tracing_opentelemetry::layer().with_tracer(tracer);

    tracing_subscriber::registry()
        .with(env_filter)
        .with(fmt::layer())
        .with(otel_layer)
        .init();

    tracing::info!(
        service = %config.service_name,
        endpoint = %config.otlp_endpoint,
        "OpenTelemetry export enabled"
    );

    Ok(Some(TelemetryGuard {
        tracer_provider,
        meter_provider,
    }))
}

fn resolve_otlp_headers(config: &OtelConfig) -> anyhow::Result<HashMap<String, String>> {
    if let (Some(instance_id), Some(token)) =
        (&config.grafana_instance_id, &config.grafana_otlp_token)
    {
        let encoded = STANDARD.encode(format!("{}:{}", instance_id.trim(), token.trim()));
        let mut headers = HashMap::new();
        headers.insert("Authorization".to_string(), format!("Basic {encoded}"));
        return Ok(headers);
    }

    let headers = parse_otlp_headers(&config.otlp_headers)?;
    if headers.is_empty() {
        anyhow::bail!(
            "OTEL is enabled but no auth configured. Set GRAFANA_CLOUD_INSTANCE_ID + \
             GRAFANA_CLOUD_OTLP_TOKEN, or OTEL_EXPORTER_OTLP_HEADERS"
        );
    }
    Ok(headers)
}

fn parse_otlp_headers(raw: &str) -> anyhow::Result<HashMap<String, String>> {
    let trimmed = raw.trim();
    if trimmed.is_empty() {
        return Ok(HashMap::new());
    }

    let mut headers = HashMap::new();
    for part in trimmed.split(',') {
        let part = part.trim();
        if part.is_empty() {
            continue;
        }
        let (key, value) = part
            .split_once('=')
            .ok_or_else(|| anyhow::anyhow!("invalid OTEL_EXPORTER_OTLP_HEADERS entry: {part}"))?;
        headers.insert(key.trim().to_string(), decode_header_value(value.trim()));
    }
    Ok(headers)
}

/// Grafana Cloud UI sometimes URL-encodes header values (e.g. `Basic%20abc...`).
fn decode_header_value(value: &str) -> String {
    value
        .replace("%20", " ")
        .replace("%2B", "+")
        .replace("%2F", "/")
        .replace("%3D", "=")
}
