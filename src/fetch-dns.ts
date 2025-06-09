import * as dns from "node:dns";

export async function hasDnsRecord(domain: string) {
    try {
        const addrs = await dns.promises.resolve4(domain);
    } catch(error: any) {
        if(error.code == 'ENOTFOUND') {
            return false;
        }
    }
    return true;
}