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
  // Senha inicial NUNCA hardcoded. Vem de SEED_ADMIN_PASSWORD (defina no deploy).
  // Sem ela, cada conta NOVA recebe uma senha aleatória impressa no log — troque
  // no primeiro acesso. Contas já existentes NÃO são alteradas.
  const seedAdminPassword = process.env.SEED_ADMIN_PASSWORD;

  for (const u of [
    { nome: 'Célio',     email: 'celio@histocell.com.br',     role: 'gerencia' },
    { nome: 'Kleber',    email: 'kleber@histocell.com.br',    role: 'gerencia' },
    { nome: 'Recepção',  email: 'recepcao@histocell.com.br',  role: 'recepcao' },
  ]) {
    const existente = await prisma.user.findUnique({
      where: { email: u.email },
      select: { id: true },
    });
    if (existente) continue; // não mexe em conta existente (preserva senha rotacionada)

    const senhaInicial =
      seedAdminPassword ?? crypto.randomBytes(12).toString('base64url');
    const senhaHash = await bcrypt.hash(senhaInicial, 12);
    await prisma.user.create({
      data: { nome: u.nome, email: u.email, senha: senhaHash, role: u.role },
    });
    if (!seedAdminPassword) {
      console.log(
        `[seed] Conta criada ${u.email} — senha inicial: ${senhaInicial} (troque no 1º acesso)`,
      );
    }
  }

  // ── Remove placeholders antigos e seed serviços reais ────────────────────────
  console.log('🔧 Populando serviços do legado...');

  // Remove os 8 serviços placeholder criados no seed inicial
  const placeholders = ['HISTO-001','HISTO-002','CITO-001','IHQ-001','MACRO-001','COLOR-001','BIOPSIA-001','BIOPSIA-002'];
  await prisma.servico.deleteMany({ where: { codigo: { in: placeholders } } });

  let criados = 0;
  let mantidos = 0;

  for (const s of SERVICOS_LEGADO) {
    const existing = await prisma.servico.findFirst({
      where: { OR: [{ codigo: s.codigo }, { codigoLegado: s.codigoLegado }] },
    });

    if (existing) {
      // NÃO sobrescreve serviços existentes — preserva edições feitas no sistema
      // (nome, preço, código/renumeração, arquivamento). Só cria o que falta.
      mantidos++;
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

  console.log(`   ✅ ${criados} serviços criados, ${mantidos} preservados (não sobrescritos)`);

  // ── Popula campos de seleção guiada (cascata) para Cortes ───────────────────
  console.log('🔧 Populando variantes de Cortes para seleção guiada...');

  const CORTES_VARIANTS: Array<{
    codigoLegado: number
    tipo: string
    variante1?: string
    variante2?: string
    variante3?: string
    variante4?: string
    variante5?: string
  }> = [
    // ── tipo = Histológico ──────────────────────────────────────────────────
    { codigoLegado: 513, tipo: 'Histológico', variante2: '1º Nível' },
    { codigoLegado: 511, tipo: 'Histológico', variante2: '2º Nível' },
    { codigoLegado: 398, tipo: 'Histológico', variante2: '3º Nível' },
    { codigoLegado: 641, tipo: 'Histológico', variante2: '4º Nível' },
    { codigoLegado: 642, tipo: 'Histológico', variante2: '5º Nível' },
    { codigoLegado: 809, tipo: 'Histológico', variante2: '3º Nível', variante4: '10 micras' },
    { codigoLegado: 521, tipo: 'Histológico', variante1: 'Lâmina Megaslide' },
    { codigoLegado: 385, tipo: 'Histológico', variante1: 'Lâmina Silanizada' },
    { codigoLegado: 209, tipo: 'Histológico', variante1: 'Lâmina Silanizada' },
    { codigoLegado: 649, tipo: 'Histológico', variante1: 'Em Resina' },
    { codigoLegado: 459, tipo: 'Histológico', variante1: 'Material Ósseo', variante5: 'Com HE' },
    { codigoLegado: 265, tipo: 'Histológico', variante2: 'Seriado' },
    { codigoLegado: 228, tipo: 'Histológico', variante5: 'Com HE' },
    { codigoLegado: 542, tipo: 'Histológico', variante5: 'Com HE' },
    { codigoLegado: 397, tipo: 'Histológico', variante5: 'Com HE + Finalização' },
    { codigoLegado: 670, tipo: 'Histológico', variante1: 'Navalha Exclusiva', variante5: 'Com HE' },
    // ── tipo = Eppendorf ────────────────────────────────────────────────────
    { codigoLegado: 296, tipo: 'Eppendorf', variante3: '2 vezes', variante4: '50 micras' },
    { codigoLegado: 93,  tipo: 'Eppendorf', variante3: '4 vezes', variante4: '20 micras' },
    { codigoLegado: 528, tipo: 'Eppendorf', variante3: '5 vezes', variante4: '10 micras' },
    { codigoLegado: 193, tipo: 'Eppendorf', variante3: '6 vezes', variante4: '10 micras' },
    { codigoLegado: 196, tipo: 'Eppendorf', variante4: '15 micras' },
    { codigoLegado: 158, tipo: 'Eppendorf', variante1: 'Troca de Navalha' },
    { codigoLegado: 94,  tipo: 'Eppendorf', variante1: 'Troca de Navalha', variante3: '5 vezes' },
    { codigoLegado: 509, tipo: 'Eppendorf', variante3: '2 vezes', variante4: '10 micras' },
    // ── tipo = Microdissecção ───────────────────────────────────────────────
    { codigoLegado: 159, tipo: 'Microdissecção' },
    { codigoLegado: 160, tipo: 'Microdissecção', variante2: '3 Cortes' },
  ];

  let variantesAtualizadas = 0;
  for (const v of CORTES_VARIANTS) {
    const servico = await prisma.servico.findUnique({ where: { codigoLegado: v.codigoLegado } });
    if (!servico) continue;
    // só configura variantes quando ainda não foram definidas — não sobrescreve edições
    if (servico.tipo) continue;
    await prisma.servico.update({
      where: { id: servico.id },
      data: {
        tipo: v.tipo,
        variante1: v.variante1 ?? null,
        variante2: v.variante2 ?? null,
        variante3: v.variante3 ?? null,
        variante4: v.variante4 ?? null,
        variante5: v.variante5 ?? null,
      },
    });
    variantesAtualizadas++;
  }
  console.log(`   ✅ ${variantesAtualizadas} serviços com variantes atualizadas`);

  // ── Serviços de Logística / Transporte (motoboy) ────────────────────────────
  // Levantados na visita presencial de validação (docs/homologacao-celio-visita4.md):
  // transporte é um serviço próprio, separado por sentido (retirada × entrega) e
  // por região (capital × ABCD). Não gera etiqueta. Rotina = pesquisa no preço.
  // Idempotente: só cria o que ainda não existe (não sobrescreve edições).
  console.log('🛵 Cadastrando serviços de Logística (motoboy)...');
  const SERVICOS_LOGISTICA: Array<{
    codigo: string
    nome: string
    preco: number
  }> = [
    { codigo: 'LOG-ENT-CAP', nome: 'Entrega Motoboy — Capital', preco: 25 },
    { codigo: 'LOG-RET-CAP', nome: 'Retirada Motoboy — Capital', preco: 25 },
    { codigo: 'LOG-ENT-ABCD', nome: 'Entrega Motoboy — ABCD', preco: 30 },
    { codigo: 'LOG-RET-ABCD', nome: 'Retirada Motoboy — ABCD', preco: 30 },
  ];
  let logCriados = 0;
  for (const s of SERVICOS_LOGISTICA) {
    const existing = await prisma.servico.findUnique({ where: { codigo: s.codigo } });
    if (existing) continue;
    await prisma.servico.create({
      data: {
        codigo: s.codigo,
        categoria: 'Logística',
        nome: s.nome,
        precoBase: s.preco,
        precoRotina: s.preco,
        precoPesquisa: s.preco,
        geraEtiqueta: false,
      },
    });
    logCriados++;
  }
  console.log(`   ✅ ${logCriados} serviços de logística criados`);

  // ── Tipos de recipiente (recepção / macroscopia) ─────────────────────────────
  // Molhados (Pote/Frasco) e secos (Cassete/Lâmina/Bloco) que a macroscopia
  // usa para trocar "Pote → Cassete" ao abrir. Idempotente.
  console.log('📦 Cadastrando tipos de recipiente...');
  const tiposRecipiente = ['Pote', 'Frasco', 'Caixa', 'Saco', 'Cassete', 'Lâmina', 'Bloco'];
  let tiposCriados = 0;
  for (let i = 0; i < tiposRecipiente.length; i++) {
    const nome = tiposRecipiente[i];
    const existing = await prisma.tipoRecipiente.findUnique({ where: { nome } });
    if (!existing) {
      await prisma.tipoRecipiente.create({ data: { nome, ordem: i } });
      tiposCriados++;
    }
  }
  console.log(`   ✅ ${tiposCriados} tipo(s) de recipiente criado(s)`);

  // ── Clientes do legado ──────────────────────────────────────────────────────
  const encryptKey = getEncryptKey();
  const totalClientes = await prisma.cliente.count();

  if (totalClientes > 0) {
    // Já existem clientes → NÃO recria os de teste (evita "voltar" após exclusão).
    console.log(`   ↩  ${totalClientes} cliente(s) já cadastrados — seed de clientes ignorado.`);
  } else if (!encryptKey) {
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
