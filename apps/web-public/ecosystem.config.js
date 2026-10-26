/**
 * PM2 Ecosystem Configuration
 * https://pm2.keymetrics.io/docs/usage/application-declaration/
 */
module.exports = {
  apps: [
    {
      name: 'eventflow.uz',
      script: 'npm',
      args: 'start',
      cwd: process.env.HOME + '/eventflow_front',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
      // Логирование (в домашней директории)
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: '~/.pm2/logs/eventflow-error.log',
      out_file: '~/.pm2/logs/eventflow-out.log',
      merge_logs: true,
      // Graceful shutdown
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000,
    },
  ],
};

