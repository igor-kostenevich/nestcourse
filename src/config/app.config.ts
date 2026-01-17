export const appConfig = () => ({
  nodeEnv: process.env.NODE_ENV,
  port: Number(process.env.APP_PORT || 3000),
});
