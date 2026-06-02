export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000',
  apiPrefix: '/api',
  // Set this to the MongoDB ObjectId of the seeded admin user (from seed-users.ts output)
  portfolioUserId: '69e73db64555bd0cc8ab3e92',
  seo: {
    siteName: 'My Portfolio',
    author: 'Polyon Mondal',
    siteUrl: 'http://localhost:4200',
    defaultDescription: 'A professional portfolio showcasing skills, experience, and projects.',
    twitterHandle: '',
  },
};
