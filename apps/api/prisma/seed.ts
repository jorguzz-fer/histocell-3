import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

// ─── Replicação inline do CryptoService (sem injeção NestJS no seed) ────────
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

// ─── Clientes reais do sistema legado ────────────────────────────────────────
const clientesSeed = [
  {
    tipo: 'PF',
    nome: 'Tabata Maruyama dos Santos',
    nomeFantasia: 'HISTOCELL',
    documento: '33022859827',         // CPF sem pontuação
    email: 'tabatamaruyama@gmail.com',
    emailFinanceiro: 'tabatamaruyama@gmail.com',
    segmento: 'recorrente',
    endereco: {
      tipo: 'sede',
      logradouro: 'Rua Manuel Dutra',
      numero: '555',
      bairro: 'Bela Vista',
      cidade: 'São Paulo',
      uf: 'SP',
      cep: '01328010',
    },
  },
  {
    tipo: 'PJ',
    nome: 'Malheiros Serviços Médicos Especializados LTDA',
    nomeFantasia: 'Malheiros',
    documento: '07887814000139',      // CNPJ sem pontuação
    email: 'denise.mac.malheiros@gmail.com',
    emailFinanceiro: 'denise.mac.malheiros@gmail.com',
    segmento: 'recorrente',
    endereco: {
      tipo: 'sede',
      logradouro: 'Alameda Joaquim Eugenio De Lima',
      numero: '1118',
      complemento: 'Sala 152',
      bairro: 'Jardim Paulista',
      cidade: 'São Paulo',
      uf: 'SP',
      cep: '01403002',
    },
  },
  {
    tipo: 'PJ',
    nome: 'FV-MD MEDICINA E PATOLOGIA EIRELI',
    nomeFantasia: 'FV-MD',
    documento: '36538658000107',      // CNPJ sem pontuação
    email: 'franciscodamasceno@uol.com.br',
    emailFinanceiro: 'franciscodamasceno@uol.com.br',
    segmento: 'recorrente',
    // CEP ausente no legado → sem endereço
  },
  {
    tipo: 'PF',
    nome: 'Tainah Colombo Gomes',
    nomeFantasia: 'Tainah Gomes',
    documento: '43252615835',         // CPF sem pontuação
    email: 'farmaceuticabbiotech@gmail.com',
    emailFinanceiro: 'farmaceuticabbiotech@gmail.com',
    segmento: 'pesquisador',
    endereco: {
      tipo: 'sede',
      logradouro: 'Avenida Escola Politécnica',
      numero: 'S/N',
      bairro: 'Ilha Amarela',
      cidade: 'São Paulo',
      uf: 'SP',
      cep: '05350000',
    },
  },
  {
    tipo: 'PF',
    nome: 'Tarciso Sellani',
    nomeFantasia: 'Tarciso Sellani',
    documento: '00000000000',         // Documento não informado no legado
    email: 'tarcis.sellani@gmail.com',
    segmento: 'recorrente',
    observacoes: 'Documento não informado no sistema legado — atualizar.',
    endereco: {
      tipo: 'sede',
      logradouro: 'Rua Botucatu',
      numero: '962',
      bairro: 'Vila Clementino',
      cidade: 'São Paulo',
      uf: 'SP',
      cep: '04023062',
    },
  },
];

// ─── Main ────────────────────────────────────────────────────────────────────
async function main() {
  console.log('🌱 Seeding database...');

  // Usuários admin
  const senhaHash = await bcrypt.hash('Histocell@2026', 12);

  await prisma.user.upsert({
    where: { email: 'celio@histocell.com.br' },
    update: {},
    create: { nome: 'Célio', email: 'celio@histocell.com.br', senha: senhaHash, role: 'gerencia' },
  });

  await prisma.user.upsert({
    where: { email: 'kleber@histocell.com.br' },
    update: {},
    create: { nome: 'Kleber', email: 'kleber@histocell.com.br', senha: senhaHash, role: 'gerencia' },
  });

  await prisma.user.upsert({
    where: { email: 'recepcao@histocell.com.br' },
    update: {},
    create: { nome: 'Recepção', email: 'recepcao@histocell.com.br', senha: senhaHash, role: 'recepcao' },
  });

  // Serviços base
  const servicos = [
    { codigo: 'HISTO-001', nome: 'Histopatológico Simples',   precoBase: 45.00 },
    { codigo: 'HISTO-002', nome: 'Histopatológico Complexo',  precoBase: 85.00 },
    { codigo: 'CITO-001',  nome: 'Citologia',                 precoBase: 35.00 },
    { codigo: 'IHQ-001',   nome: 'Imuno-histoquímica',        precoBase: 120.00 },
    { codigo: 'MACRO-001', nome: 'Macroscopia',               precoBase: 25.00 },
    { codigo: 'COLOR-001', nome: 'Coloração Especial',        precoBase: 55.00 },
    { codigo: 'BIOPSIA-001', nome: 'Biópsia Incisional',      precoBase: 60.00 },
    { codigo: 'BIOPSIA-002', nome: 'Biópsia Excisional',      precoBase: 75.00 },
  ];

  for (const s of servicos) {
    await prisma.servico.upsert({
      where: { codigo: s.codigo },
      update: {},
      create: { codigo: s.codigo, nome: s.nome, precoBase: s.precoBase },
    });
  }

  // Clientes do legado
  const encryptKey = getEncryptKey();

  if (!encryptKey) {
    console.warn('⚠️  ENCRYPT_KEY não definida — clientes do legado serão ignorados no seed.');
  } else {
    for (const c of clientesSeed) {
      // Evita duplicatas pelo e-mail (campo mais estável do legado)
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
          enderecos: endereco
            ? { create: { ...endereco, principal: true } }
            : undefined,
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
