import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import * as https from 'https';
import { randomUUID } from 'crypto';

/**
 * Cliente HTTP do Banco Cora (Integração Direta) com mTLS + OAuth2 client_credentials.
 *
 * Configuração por variáveis de ambiente (segredos no Coolify):
 *   CORA_CLIENT_ID   — client id da Integração Direta
 *   CORA_CERT        — conteúdo PEM do certificado (ou base64 do PEM)
 *   CORA_KEY         — conteúdo PEM da chave privada (ou base64 do PEM)
 *   CORA_BASE_URL    — opcional; default conforme CORA_ENV
 *   CORA_ENV         — 'stage' (default) | 'production'
 *
 * Enquanto as credenciais não estiverem configuradas, isConfigured() = false e
 * as chamadas lançam ServiceUnavailableException com mensagem clara — o app roda
 * normalmente até as credenciais chegarem.
 */
@Injectable()
export class CoraClient {
  private readonly logger = new Logger('CoraClient');
  private agent?: https.Agent;
  private token?: { value: string; exp: number };

  private get env() {
    return (process.env.CORA_ENV || 'stage').toLowerCase();
  }

  private get baseUrl() {
    if (process.env.CORA_BASE_URL) return process.env.CORA_BASE_URL.replace(/\/$/, '');
    return this.env === 'production'
      ? 'https://matls-clients.api.cora.com.br'
      : 'https://matls-clients.api.stage.cora.com.br';
  }

  private pem(value?: string): string | undefined {
    if (!value) return undefined;
    // aceita PEM cru ou base64 do PEM
    return value.includes('-----BEGIN') ? value : Buffer.from(value, 'base64').toString('utf8');
  }

  isConfigured(): boolean {
    return Boolean(process.env.CORA_CLIENT_ID && this.pem(process.env.CORA_CERT) && this.pem(process.env.CORA_KEY));
  }

  private ensureConfigured() {
    if (!this.isConfigured()) {
      throw new ServiceUnavailableException(
        'Integração Cora não configurada. Defina CORA_CLIENT_ID, CORA_CERT e CORA_KEY.',
      );
    }
  }

  private getAgent(): https.Agent {
    if (!this.agent) {
      this.agent = new https.Agent({
        cert: this.pem(process.env.CORA_CERT),
        key: this.pem(process.env.CORA_KEY),
        keepAlive: true,
      });
    }
    return this.agent;
  }

  /** Requisição HTTPS com mTLS. Retorna { status, body }. */
  private request(
    method: string,
    path: string,
    opts: { headers?: Record<string, string>; body?: string } = {},
  ): Promise<{ status: number; body: any }> {
    const url = new URL(this.baseUrl + path);
    return new Promise((resolve, reject) => {
      const req = https.request(
        {
          method,
          hostname: url.hostname,
          path: url.pathname + url.search,
          port: url.port || 443,
          agent: this.getAgent(),
          headers: opts.headers,
        },
        (res) => {
          let data = '';
          res.on('data', (c) => (data += c));
          res.on('end', () => {
            let parsed: any = data;
            try { parsed = data ? JSON.parse(data) : null; } catch { /* mantém texto */ }
            resolve({ status: res.statusCode ?? 0, body: parsed });
          });
        },
      );
      req.on('error', reject);
      if (opts.body) req.write(opts.body);
      req.end();
    });
  }

  /** Obtém (e cacheia) o access token via client_credentials + mTLS. */
  private async getToken(): Promise<string> {
    const now = Date.now();
    if (this.token && this.token.exp > now + 30_000) return this.token.value;

    const form = `grant_type=client_credentials&client_id=${encodeURIComponent(process.env.CORA_CLIENT_ID!)}`;
    const { status, body } = await this.request('POST', '/token', {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': String(Buffer.byteLength(form)) },
      body: form,
    });
    if (status !== 200 || !body?.access_token) {
      this.logger.error(`Falha ao obter token Cora (${status}): ${JSON.stringify(body)}`);
      throw new ServiceUnavailableException('Não foi possível autenticar na Cora.');
    }
    const expiresIn = Number(body.expires_in ?? 300) * 1000;
    this.token = { value: body.access_token, exp: now + expiresIn };
    return this.token.value;
  }

  /** Cria um boleto registrado (v2). Retorna o corpo da Cora. */
  async createInvoice(payload: any): Promise<any> {
    this.ensureConfigured();
    const token = await this.getToken();
    const body = JSON.stringify(payload);
    const { status, body: resp } = await this.request('POST', '/v2/invoices', {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Content-Length': String(Buffer.byteLength(body)),
        'Idempotency-Key': randomUUID(),
      },
      body,
    });
    if (status >= 300) {
      this.logger.error(`Cora createInvoice ${status}: ${JSON.stringify(resp)}`);
      throw new ServiceUnavailableException(
        `Cora recusou a emissão (${status}): ${resp?.message ?? JSON.stringify(resp)}`,
      );
    }
    return resp;
  }

  /** Consulta um boleto pelo id. */
  async getInvoice(id: string): Promise<any> {
    this.ensureConfigured();
    const token = await this.getToken();
    const { status, body } = await this.request('GET', `/v2/invoices/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (status >= 300) throw new ServiceUnavailableException(`Cora getInvoice ${status}`);
    return body;
  }
}
