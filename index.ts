import { Hono } from 'hono';
import { whoisDomain } from 'whoiser';

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
        const res = JSON.stringify(await whoisDomain(d, { follow: 1 }));
        const isTaken = !/No match for|NOT FOUND|No Data Found|Status:\s+AVAILABLE/i.test(res);
        return { domain: d, available: !isTaken };
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