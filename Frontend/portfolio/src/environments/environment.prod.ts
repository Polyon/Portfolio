export const environment = {
  production: true,
  apiUrl: '', // Set to production backend URL at deploy time
  apiPrefix: '/api',
  // Set to the MongoDB ObjectId of the portfolio owner at deploy time
  portfolioUserId: '',
  seo: {
    siteName: 'My Portfolio',
    author: 'Polyon Mondal',
    siteUrl: '', // Set to production URL at deploy time
    defaultDescription: 'A professional portfolio showcasing skills, experience, and projects.',
    twitterHandle: '',
  },
};
