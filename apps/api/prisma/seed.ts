import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { SERVICOS_LEGADO } from './servicos-data';

const prisma = new PrismaClient();

// ─── CryptoService inline (sem injeção NestJS no seed) ───────────────────────

function getEncryptKey(): Buffer | null {
  const raw = process.env.ENCRYPT_KEY;
  if (!raw) return null;
  const buf = Buffer.from(raw, 'base64');
  return buf.length === 32 ? buf : null;
}

function encrypt(plaintext: string, key: Buffer): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
}

// ─── Clientes do legado ───────────────────────────────────────────────────────

const clientesSeed = [
  {
    tipo: 'PF',
    nome: 'Tabata Maruyama dos Santos',
    nomeFantasia: 'HISTOCELL',
    documento: '33022859827',
    email: 'tabatamaruyama@gmail.com',
    emailFinanceiro: 'tabatamaruyama@gmail.com',
    segmento: 'recorrente',
    endereco: {
      tipo: 'sede', logradouro: 'Rua Manuel Dutra', numero: '555',
      bairro: 'Bela Vista', cidade: 'São Paulo', uf: 'SP', cep: '01328010',
    },
  },
  {
    tipo: 'PJ',
    nome: 'Malheiros Serviços Médicos Especializados LTDA',
    nomeFantasia: 'Malheiros',
    documento: '07887814000139',
    email: 'denise.mac.malheiros@gmail.com',
    emailFinanceiro: 'denise.mac.malheiros@gmail.com',
    segmento: 'recorrente',
    endereco: {
      tipo: 'sede', logradouro: 'Alameda Joaquim Eugenio De Lima', numero: '1118',
      complemento: 'Sala 152', bairro: 'Jardim Paulista', cidade: 'São Paulo', uf: 'SP', cep: '01403002',
    },
  },
  {
    tipo: 'PJ',
    nome: 'FV-MD MEDICINA E PATOLOGIA EIRELI',
    nomeFantasia: 'FV-MD',
    documento: '36538658000107',
    email: 'franciscodamasceno@uol.com.br',
    emailFinanceiro: 'franciscodamasceno@uol.com.br',
    segmento: 'recorrente',
  },
  {
    tipo: 'PF',
    nome: 'Tainah Colombo Gomes',
    nomeFantasia: 'Tainah Gomes',
    documento: '43252615835',
    email: 'farmaceuticabbiotech@gmail.com',
    emailFinanceiro: 'farmaceuticabbiotech@gmail.com',
    segmento: 'pesquisador',
    endereco: {
      tipo: 'sede', logradouro: 'Avenida Escola Politécnica', numero: 'S/N',
      bairro: 'Ilha Amarela', cidade: 'São Paulo', uf: 'SP', cep: '05350000',
    },
  },
  {
    tipo: 'PF',
    nome: 'Tarciso Sellani',
    nomeFantasia: 'Tarciso Sellani',
    documento: '00000000000',
    email: 'tarcis.sellani@gmail.com',
    segmento: 'recorrente',
    observacoes: 'Documento não informado no sistema legado — atualizar.',
    endereco: {
      tipo: 'sede', logradouro: 'Rua Botucatu', numero: '962',
      bairro: 'Vila Clementino', cidade: 'São Paulo', uf: 'SP', cep: '04023062',
    },
  },
];

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🌱 Seeding database...');

  // ── Usuários admin ──────────────────────────────────────────────────────────
  const senhaHash = await bcrypt.hash('Histocell@2026', 12);

  for (const u of [
    { nome: 'Célio',     email: 'celio@histocell.com.br',     role: 'gerencia' },
    { nome: 'Kleber',    email: 'kleber@histocell.com.br',    role: 'gerencia' },
    { nome: 'Recepção',  email: 'recepcao@histocell.com.br',  role: 'recepcao' },
  ]) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: { nome: u.nome, email: u.email, senha: senhaHash, role: u.role },
    });
  }

  // ── Remove placeholders antigos e seed serviços reais ────────────────────────
  console.log('🔧 Populando serviços do legado...');

  // Remove os 8 serviços placeholder criados no seed inicial
  const placeholders = ['HISTO-001','HISTO-002','CITO-001','IHQ-001','MACRO-001','COLOR-001','BIOPSIA-001','BIOPSIA-002'];
  await prisma.servico.deleteMany({ where: { codigo: { in: placeholders } } });

  let criados = 0;
  let atualizados = 0;

  for (const s of SERVICOS_LEGADO) {
    const existing = await prisma.servico.findFirst({
      where: { OR: [{ codigo: s.codigo }, { codigoLegado: s.codigoLegado }] },
    });

    if (existing) {
      await prisma.servico.update({
        where: { id: existing.id },
        data: {
          codigo: s.codigo,
          codigoLegado: s.codigoLegado,
          categoria: s.categoria,
          nome: s.nome,
          precoBase: s.precoRotina,
          precoRotina: s.precoRotina,
          precoPesquisa: s.precoPesquisa,
          ativo: true,
        },
      });
      atualizados++;
    } else {
      await prisma.servico.create({
        data: {
          codigo: s.codigo,
          codigoLegado: s.codigoLegado,
          categoria: s.categoria,
          nome: s.nome,
          precoBase: s.precoRotina,
          precoRotina: s.precoRotina,
          precoPesquisa: s.precoPesquisa,
        },
      });
      criados++;
    }
  }

  console.log(`   ✅ ${criados} serviços criados, ${atualizados} atualizados`);

  // ── Clientes do legado ──────────────────────────────────────────────────────
  const encryptKey = getEncryptKey();

  if (!encryptKey) {
    console.warn('⚠️  ENCRYPT_KEY não definida — clientes do legado serão ignorados.');
  } else {
    for (const c of clientesSeed) {
      const existing = await prisma.cliente.findFirst({ where: { email: c.email } });
      if (existing) {
        console.log(`   ↩  Cliente já existe: ${c.nomeFantasia ?? c.nome}`);
        continue;
      }
      const { endereco, ...dados } = c as any;
      await prisma.cliente.create({
        data: {
          ...dados,
          documento: encrypt(c.documento, encryptKey),
          enderecos: endereco ? { create: { ...endereco, principal: true } } : undefined,
        },
      });
      console.log(`   ✅ Cliente criado: ${c.nomeFantasia ?? c.nome}`);
    }
  }

  console.log('✅ Seed concluído!');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
