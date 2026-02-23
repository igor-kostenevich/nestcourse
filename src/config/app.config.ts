/** ID dev user (валідний UUID v4) */
export const DEV_USER_ID = '11111111-1111-4111-a111-111111111111';

export const appConfig = () => ({
  nodeEnv: process.env.NODE_ENV,
  port: Number(process.env.APP_PORT || 3000),
  devUserId: process.env.DEV_USER_ID ?? DEV_USER_ID, // remove after auth implementation
});
