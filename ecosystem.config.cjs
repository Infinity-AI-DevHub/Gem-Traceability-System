module.exports = {
  apps: [
    {
      name: "gem-track-backend",
      cwd: "/www/wwwroot/gem-track/backend",
      script: "dist/server.js",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_memory_restart: "500M",
      env: { NODE_ENV: "production" },
    },
    {
      name: "gem-track-frontend",
      cwd: "/www/wwwroot/gem-track/frontend",
      script: "/www/wwwroot/gem-track/node_modules/next/dist/bin/next",
      args: "start --hostname 127.0.0.1 --port 3500",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_memory_restart: "750M",
      env: { NODE_ENV: "production" },
    },
  ],
};
