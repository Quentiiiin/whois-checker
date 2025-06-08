import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { swaggerUI } from '@hono/swagger-ui';
import { whoisDomain } from 'whoiser';

const app = new OpenAPIHono();

// Define schemas
const DomainResultSchema = z.object({
  domain: z.string().describe('The domain name that was checked'),
  available: z.boolean().nullable().describe('Whether the domain is available (null if check failed)'),
  error: z.string().optional().describe('Error message if the check failed')
});

const DomainCheckResponseSchema = z.array(DomainResultSchema);

// Define the route
const domainCheckRoute = createRoute({
  method: 'get',
  path: '/',
  summary: 'Check domain availability',
  description: 'Check the availability of one or more domains using WHOIS lookup',
  request: {
    query: z.object({
      domains: z.string()
        .describe('Semicolon-separated list of domains to check (e.g., "example.com;test.org")')
        .openapi({
          example: 'example.com;google.com;unavailable-domain.com'
        })
    })
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: DomainCheckResponseSchema,
        },
      },
      description: 'Domain availability results',
    },
    400: {
      content: {
        'text/plain': {
          schema: z.string(),
        },
      },
      description: 'Bad request - invalid parameters or domain format',
    },
  },
  tags: ['Domain Check']
});

app.openapi(domainCheckRoute, async (c) => {
  const { domains } = c.req.valid('query');
  
  const possibleDomains = domains.split(';');
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

// Add OpenAPI documentation endpoint
app.doc('/openapi.json', {
  openapi: '3.0.0',
  info: {
    version: '1.0.0',
    title: 'Domain Availability Checker API',
    description: 'A simple API to check domain availability using WHOIS lookup',
  },
  servers: [
    {
      url: 'http://localhost:57777',
      description: 'Local development server'
    }
  ]
});

// Add Swagger UI
app.get('/docs', swaggerUI({ url: '/openapi.json' }));

export default {
  port: 57777,
  fetch: app.fetch,
};