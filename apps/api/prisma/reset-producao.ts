/**
 * Reset para PRODUÇÃO — zera todo o movimento operacional e financeiro,
 * preservando os cadastros.
 *
 * MANTÉM: Cliente (+ Endereco, Contato, TabelaPreco, Contrato), User, Papel,
 *         PapelPermissao, ServicoFavorito, Servico, Pacote, PacoteItem,
 *         TipoRecipiente, Motivo.
 * APAGA:  Pedido, ItemPedido, Recipiente, Amostra, OrdemServico, EtapaOS,
 *         Laudo, Etiqueta, RastreioEvento, Orcamento, ItemOrcamento, FollowUp,
 *         Fatura, ItemFatura, CreditoPrePago, Comunicacao, RegistroQualidade,
 *         AuditLog, RefreshToken.
 *
 * Reinicia a numeração do 1: ids das tabelas apagadas, número de etiqueta e
 * número interno de amostra.
 *
 * Uso:
 *   npx tsx prisma/reset-producao.ts            # simulação (não apaga nada)
 *   npx tsx prisma/reset-producao.ts --apply    # executa de verdade
 *
 * ⚠️ IRREVERSÍVEL. Faça backup/snapshot do banco antes de rodar com --apply.
 * ⚠️ Rode com a API parada (ou fora do horário de uso).
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const APPLY = process.argv.includes('--apply');

// Ordem irrelevante: o TRUNCATE de todas juntas satisfaz as FKs entre elas.
// Sem CASCADE de propósito — se uma tabela nova passar a referenciar alguma
// destas e ficar de fora da lista, o script falha em vez de apagar em silêncio.
const TABELAS_MOVIMENTO = [
  'RastreioEvento',
  'Etiqueta',
  'Laudo',
  'EtapaOS',
  'OrdemServico',
  'Amostra',
  'Recipiente',
  'ItemPedido',
  'CreditoPrePago',
  'Comunicacao',
  'Pedido',
  'ItemFatura',
  'Fatura',
  'FollowUp',
  'ItemOrcamento',
  'Orcamento',
  'RegistroQualidade',
  'AuditLog',
  'RefreshToken',
] as const;

const TABELAS_PRESERVADAS = [
  'Cliente',
  'Endereco',
  'Contato',
  'TabelaPreco',
  'Contrato',
  'User',
  'Papel',
  'PapelPermissao',
  'Servico',
  'Pacote',
  'PacoteItem',
  'ServicoFavorito',
  'TipoRecipiente',
  'Motivo',
] as const;

/** Vale para tabela ou sequence — `to_regclass` cobre os dois. */
async function existe(relacao: string): Promise<boolean> {
  const [{ ok }] = await prisma.$queryRawUnsafe<{ ok: boolean }[]>(
    `SELECT to_regclass('"${relacao}"') IS NOT NULL AS ok`,
  );
  return ok;
}

async function contar(tabela: string): Promise<number> {
  const [{ n }] = await prisma.$queryRawUnsafe<{ n: bigint }[]>(`SELECT count(*) AS n FROM "${tabela}"`);
  return Number(n);
}

function alvoDoBanco(): string {
  const url = process.env.DATABASE_URL;
  if (!url) return '(DATABASE_URL não definida)';
  try {
    const u = new URL(url);
    return `${u.host}${u.pathname}`;
  } catch {
    return '(DATABASE_URL ilegível)';
  }
}

async function main() {
  console.log(`Banco alvo: ${alvoDoBanco()}\n`);

  const presentes: string[] = [];
  let total = 0;

  console.log('A APAGAR:');
  for (const t of TABELAS_MOVIMENTO) {
    if (!(await existe(t))) {
      console.log(`   -  ${t.padEnd(18)} tabela não existe neste banco (ignorada)`);
      continue;
    }
    const n = await contar(t);
    console.log(`   x  ${t.padEnd(18)} ${n} linha(s)`);
    total += n;
    presentes.push(t);
  }

  if (presentes.length === 0) {
    throw new Error('Nenhuma tabela de movimento encontrada — banco errado? Abortando.');
  }

  // O reset preserva cadastros; sem nenhum usuário, este não é o banco esperado.
  const usuarios = await contar('User');
  if (usuarios === 0) {
    throw new Error('Nenhum usuário cadastrado — banco errado? Abortando.');
  }

  console.log('\nA PRESERVAR:');
  for (const t of TABELAS_PRESERVADAS) {
    if (!(await existe(t))) continue;
    console.log(`   ✓  ${t.padEnd(18)} ${await contar(t)} linha(s)`);
  }

  console.log(`\nTotal a apagar: ${total} linha(s) em ${presentes.length} tabela(s).`);

  if (!APPLY) {
    console.log('\n[SIMULAÇÃO] Nada foi apagado. Rode com --apply para executar.');
    console.log('⚠️  Faça backup/snapshot do banco antes de rodar com --apply.');
    return;
  }

  const lista = presentes.map((t) => `"${t}"`).join(', ');

  // Numeração de etiqueta e de amostra vive em sequences próprias — checa a
  // existência fora da transação para não misturar conexões.
  const sequences: string[] = [];
  for (const seq of [
    'histocell_etiqueta_numero_seq',
    'histocell_amostra_numero_seq',
    'histocell_entrada_numero_seq',
  ]) {
    if (await existe(seq)) sequences.push(seq);
  }

  await prisma.$transaction(
    async (tx) => {
      // RESTART IDENTITY zera os ids (Pedido #1, OS #1, Fatura #1...).
      await tx.$executeRawUnsafe(`TRUNCATE TABLE ${lista} RESTART IDENTITY`);

      for (const seq of sequences) {
        await tx.$executeRawUnsafe(`ALTER SEQUENCE "${seq}" RESTART WITH 1`);
      }

      // Faturas apagadas: os contratos não podem achar que já cobraram o mês.
      await tx.contrato.updateMany({
        where: { ultimaCobrancaEm: { not: null } },
        data: { ultimaCobrancaEm: null },
      });
    },
    { timeout: 120_000 },
  );

  console.log('\nDepois:');
  for (const t of presentes) {
    console.log(`   ${t.padEnd(18)} ${await contar(t)} linha(s)`);
  }
  console.log(
    `\n✅ Reset concluído. Preservados: ${await contar('Cliente')} cliente(s), ` +
      `${await contar('User')} usuário(s), ${await contar('Servico')} serviço(s).`,
  );
  console.log(
    '   Numeração reiniciada: etiqueta #1, amostra 00001, entrada ENT-000001, pedido #0001, OS #0001.',
  );
}

main()
  .catch((e) => {
    console.error('Erro:', e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
