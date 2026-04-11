import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

/**
 * Serviço de criptografia AES-256-GCM para dados sensíveis (LGPD).
 *
 * Formato do ciphertext armazenado: "<iv_hex>:<authTag_hex>:<encrypted_hex>"
 * - IV  : 12 bytes aleatórios por operação (recomendado pelo NIST para GCM)
 * - Tag : 16 bytes de autenticação (detecta adulteração)
 * - Key : 32 bytes lidos de ENCRYPT_KEY (base64) via env var
 */
@Injectable()
export class CryptoService {
  private readonly key: Buffer;

  constructor(private config: ConfigService) {
    const raw = this.config.get<string>('ENCRYPT_KEY');
    if (!raw) {
      throw new InternalServerErrorException(
        'Variável de ambiente ENCRYPT_KEY não definida. Gere uma key com: openssl rand -base64 32',
      );
    }
    const buf = Buffer.from(raw, 'base64');
    if (buf.length !== 32) {
      throw new InternalServerErrorException(
        'ENCRYPT_KEY deve ter exatamente 32 bytes (256 bits). Use: openssl rand -base64 32',
      );
    }
    this.key = buf;
  }

  /** Encripta texto puro → string armazenável no banco */
  encrypt(plaintext: string): string {
    const iv = crypto.randomBytes(12); // 96-bit IV para GCM
    const cipher = crypto.createCipheriv('aes-256-gcm', this.key, iv);
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
  }

  /** Decripta string do banco → texto puro */
  decrypt(ciphertext: string): string {
    const parts = ciphertext.split(':');
    if (parts.length !== 3) {
      throw new InternalServerErrorException('Formato de ciphertext inválido.');
    }
    const [ivHex, tagHex, encryptedHex] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');
    const encrypted = Buffer.from(encryptedHex, 'hex');

    const decipher = crypto.createDecipheriv('aes-256-gcm', this.key, iv);
    decipher.setAuthTag(tag);
    return decipher.update(encrypted).toString('utf8') + decipher.final('utf8');
  }

  /**
   * Mascara o documento pra exibição segura na UI.
   * CPF  (11 dígitos): ***.***.789-01
   * CNPJ (14 dígitos): **.***.***/0001-71
   */
  mascarar(plaintext: string): string {
    const digits = plaintext.replace(/\D/g, '');
    if (digits.length === 11) {
      return `***.***.${digits.slice(6, 9)}-${digits.slice(9)}`;
    }
    if (digits.length === 14) {
      return `**.***.***/0001-${digits.slice(12)}`;
    }
    return '***';
  }
}
