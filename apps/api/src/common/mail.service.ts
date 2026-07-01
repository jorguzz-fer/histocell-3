import { Injectable, Logger } from '@nestjs/common';

/**
 * Envio de e-mail transacional. Provedor padrão: Resend (API HTTP, sem mTLS).
 * Config por env (secrets no Coolify):
 *   MAIL_PROVIDER = resend (default)
 *   MAIL_API_KEY  = chave do Resend
 *   MAIL_FROM     = "Histocell <no-reply@seudominio.com>"
 *
 * Sem MAIL_API_KEY: isConfigured()=false e enviar() apenas registra e retorna
 * { sent:false } — o app roda normal até a credencial chegar.
 */
export type MailInput = {
  para: string | string[];
  assunto: string;
  html?: string;
  texto?: string;
  responderPara?: string;
};

@Injectable()
export class MailService {
  private readonly logger = new Logger('MailService');

  isConfigured(): boolean {
    return Boolean(process.env.MAIL_API_KEY && process.env.MAIL_FROM);
  }

  private get provider() {
    return (process.env.MAIL_PROVIDER || 'resend').toLowerCase();
  }

  async enviar(input: MailInput): Promise<{ sent: boolean; id?: string; motivo?: string }> {
    const to = Array.isArray(input.para) ? input.para : [input.para];
    if (!this.isConfigured()) {
      this.logger.warn(`E-mail não enviado (não configurado): "${input.assunto}" → ${to.join(', ')}`);
      return { sent: false, motivo: 'nao_configurado' };
    }
    try {
      if (this.provider === 'resend') return await this.enviarResend(to, input);
      this.logger.error(`Provedor de e-mail desconhecido: ${this.provider}`);
      return { sent: false, motivo: 'provedor_desconhecido' };
    } catch (e: any) {
      this.logger.error(`Falha ao enviar e-mail: ${e?.message}`);
      return { sent: false, motivo: e?.message };
    }
  }

  private async enviarResend(to: string[], input: MailInput) {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.MAIL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.MAIL_FROM,
        to,
        subject: input.assunto,
        html: input.html ?? undefined,
        text: input.texto ?? undefined,
        reply_to: input.responderPara ?? undefined,
      }),
    });
    const body: any = await res.json().catch(() => ({}));
    if (!res.ok) {
      this.logger.error(`Resend ${res.status}: ${JSON.stringify(body)}`);
      return { sent: false, motivo: body?.message ?? `HTTP ${res.status}` };
    }
    return { sent: true, id: body?.id };
  }
}
