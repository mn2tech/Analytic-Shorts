module.exports = {
  apps: [{
    name: 'analytics-api',
    script: 'server.js',
    cwd: '/home/raj/Analytic-Shorts/backend',
    env_file: '/home/raj/Analytic-Shorts/backend/.env',
    watch: false,
    instances: 1,
    exec_mode: 'fork'
  }]
}
