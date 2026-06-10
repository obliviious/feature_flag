use std::env;

#[derive(Debug, Clone)]
pub struct Config {
    pub host: String,
    pub port: u16,
    pub database_url: String,
    pub redis_url: String,
    pub clerk_domain: String,
    pub log_level: String,
    pub sdk_eval_rate_limit_per_minute: u32,
    pub redis_cb_initial_backoff_secs: u64,
    pub redis_cb_max_backoff_secs: u64,
    pub redis_down_alert_webhook: Option<String>,
}

impl Config {
    pub fn from_env() -> Self {
        Self {
            host: env::var("HOST").unwrap_or_else(|_| "0.0.0.0".into()),
            port: env::var("PORT")
                .unwrap_or_else(|_| "8080".into())
                .parse()
                .expect("PORT must be a number"),
            database_url: env::var("DATABASE_URL")
                .unwrap_or_else(|_| "sqlite://flagforge.db?mode=rwc".into()),
            redis_url: env::var("REDIS_URL")
                .unwrap_or_else(|_| "redis://127.0.0.1:6379".into()),
            clerk_domain: env::var("CLERK_DOMAIN")
                .expect("CLERK_DOMAIN must be set (e.g. your-app.clerk.accounts.dev)"),
            log_level: env::var("LOG_LEVEL")
                .unwrap_or_else(|_| "info".into()),
            sdk_eval_rate_limit_per_minute: env::var("SDK_EVAL_RATE_LIMIT_PER_MINUTE")
                .unwrap_or_else(|_| "0".into())
                .parse()
                .expect("SDK_EVAL_RATE_LIMIT_PER_MINUTE must be a number"),
            redis_cb_initial_backoff_secs: env::var("REDIS_CB_INITIAL_BACKOFF_SECS")
                .unwrap_or_else(|_| "2".into())
                .parse()
                .expect("REDIS_CB_INITIAL_BACKOFF_SECS must be a number"),
            redis_cb_max_backoff_secs: env::var("REDIS_CB_MAX_BACKOFF_SECS")
                .unwrap_or_else(|_| "60".into())
                .parse()
                .expect("REDIS_CB_MAX_BACKOFF_SECS must be a number"),
            redis_down_alert_webhook: env::var("REDIS_DOWN_ALERT_WEBHOOK").ok(),
        }
    }

    pub fn addr(&self) -> String {
        format!("{}:{}", self.host, self.port)
    }
}
