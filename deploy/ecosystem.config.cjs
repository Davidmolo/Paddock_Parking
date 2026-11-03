// Paddock Parking PMS — PM2 process file
// Ports chosen to avoid existing services on the shared host:
//   3000 retention | 3010 trailhead-web | 3020 fuel-optimizer-web | 3030 phoenix-web
//   4000 fuel | 4010 trailhead-api | 4020 phoenix-api
// Paddock: web 3040 · api 4040

module.exports = {
  apps: [
    {
      name: "paddock-pms-api",
      cwd: "/var/www/paddock-pms/apps/api",
      script: "dist/main.js",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        PORT: "4040",
      },
      max_memory_restart: "400M",
      time: true,
      error_file: "/var/www/paddock-pms/logs/api-error.log",
      out_file: "/var/www/paddock-pms/logs/api-out.log",
      merge_logs: true,
    },
    {
      name: "paddock-pms-web",
      cwd: "/var/www/paddock-pms/apps/web",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3040 -H 127.0.0.1",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        PORT: "3040",
        HOSTNAME: "127.0.0.1",
      },
      max_memory_restart: "512M",
      time: true,
      error_file: "/var/www/paddock-pms/logs/web-error.log",
      out_file: "/var/www/paddock-pms/logs/web-out.log",
      merge_logs: true,
    },
  ],
};
