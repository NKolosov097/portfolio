module.exports = {
  apps: [
    {
      name: 'portfolio',
      script: 'pnpm install && pnpm build && pnpm start',
      time: true,
      log_date_format: 'DD.MM.YYYY HH:mm:ss',
    },
  ],
}
