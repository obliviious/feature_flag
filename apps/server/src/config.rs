use std::env;

#[derive(Debug, Clone)]
pub struct Config {
    pub host: String,
    pub port: u16,
    pub database_url: String,
    pub redis_url: String,
    pub clerk_domain: String,
    pub log_level: String,
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
                .expect("DATABASE_URL must be set"),
            redis_url: env::var("REDIS_URL")
                .unwrap_or_else(|_| "redis://127.0.0.1:6379".into()),
            clerk_domain: env::var("CLERK_DOMAIN")
                .expect("CLERK_DOMAIN must be set (e.g. your-app.clerk.accounts.dev)"),
            log_level: env::var("LOG_LEVEL")
                .unwrap_or_else(|_| "info".into()),
        }
    }

    pub fn addr(&self) -> String {
        format!("{}:{}", self.host, self.port)
    }
}
