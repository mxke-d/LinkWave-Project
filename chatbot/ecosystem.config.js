// PM2 Ecosystem Configuration
// Use this file with PM2: pm2 start ecosystem.config.js

module.exports = {
    apps: [{
        name: 'linkwave-chatbot',
        script: './server.js',
        instances: 1, // Use 'max' for cluster mode
        exec_mode: 'fork', // or 'cluster'
        watch: false, // Set to true for development
        max_memory_restart: '500M',
        env: {
            NODE_ENV: 'development',
            PORT: 3000
        },
        env_production: {
            NODE_ENV: 'production',
            PORT: 3000,
            // Add your production environment variables here
            // OPENAI_API_KEY: 'your-key-here',
            // ALLOWED_ORIGINS: 'https://your-domain.com,https://www.your-domain.com'
        },
        error_file: './logs/err.log',
        out_file: './logs/out.log',
        log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
        merge_logs: true,
        autorestart: true,
        max_restarts: 10,
        min_uptime: '10s'
    }]
};
