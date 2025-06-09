const whois = require('whois-parsed');

export async function isWhoisAvailable(domain: string): Promise<boolean> {
    try {
        const res = await whois.lookup(domain);
        return res.isAvailable;
    } catch (error: any) {
        return false;
    }
}