import { Hono } from 'hono';
const whois = require('whois-parsed');

const app = new Hono();

app.get('/', async (c) => {
  const params = c.req.query('domains');

  if (!params) {
    c.status(400);
    return c.text('domains parameter is required');
  }

  const possibleDomains = params.split(';');
  const validDomains = [];

  // Validate each domain
  for (const domain of possibleDomains) {
    const trimmedDomain = domain.trim();
    const isDomain = URL.canParse('https://' + trimmedDomain) && trimmedDomain.includes('.');

    if (!isDomain) {
      c.status(400);
      return c.text(`"${trimmedDomain}" is not a valid domain`);
    }

    validDomains.push(trimmedDomain);
  }

  // Check whois for all valid domains
  const results = await Promise.all(
    validDomains.map(async (d) => {
      try {
        const res = await whois.lookup(d);
        return { domain: d, available: res.isAvailable };
      } catch (error) {
        return { domain: d, available: null, error: 'Failed to check domain' };
      }
    })
  );

  return c.json(results);
});

export default {
  port: 57777,
  fetch: app.fetch,
};
