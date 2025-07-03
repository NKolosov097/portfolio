module.exports = {
  apps: [
    {
      name: 'portfolio',
      script: '.next/standalone/server.js',
      cwd: '/var/www/portfolio',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
    },
  ],
}
