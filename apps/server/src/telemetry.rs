use std::collections::HashMap;
use std::time::Duration;

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

    let headers = parse_otlp_headers(&config.otlp_headers)?;
    let resource = Resource::builder()
        .with_service_name(config.service_name.clone())
        .build();

    let http_client = reqwest::Client::builder()
        .timeout(Duration::from_secs(10))
        .build()
        .map_err(|e| anyhow::anyhow!("failed to build OTLP HTTP client: {e}"))?;

    let trace_exporter = opentelemetry_otlp::SpanExporter::builder()
        .with_http()
        .with_http_client(http_client.clone())
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
        .with_http_client(http_client)
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
        headers.insert(key.trim().to_string(), value.trim().to_string());
    }
    Ok(headers)
}
