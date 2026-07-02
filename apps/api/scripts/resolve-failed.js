// Resolve migrations presas em estado "failed" no banco, para destravar o
// `prisma migrate deploy` (que aborta com P3009 enquanto houver uma).
//
// Contexto: produção nasceu de um `db push` (schema já com colunas/tabelas),
// e migrations antigas faziam `ADD COLUMN` sem `IF NOT EXISTS`. Num deploy
// anterior, uma delas (ex.: servico_gera_etiqueta) falhou por "column already
// exists" e ficou registrada como failed — bloqueando todos os deploys
// seguintes, mesmo depois de o arquivo virar idempotente.
//
// Como os arquivos de migration hoje são idempotentes (IF NOT EXISTS / CREATE
// TABLE IF NOT EXISTS / etc.), re-rodá-los é seguro. Então:
//   - 0_init (snapshot/baseline) → marca APPLIED (nunca deve executar).
//   - demais migrations failed    → marca ROLLED_BACK para re-rodar.
//
// Não faz nada em banco novo (sem _prisma_migrations) — aí o deploy cria tudo.
const { PrismaClient } = require('@prisma/client');
const { execSync } = require('child_process');

const prisma = new PrismaClient();

async function main() {
  const tbl = await prisma
    .$queryRawUnsafe(
      `SELECT to_regclass('public."_prisma_migrations"') IS NOT NULL AS exists`,
    )
    .catch(() => [{ exists: false }]);
  const hasHistory = Array.isArray(tbl) && tbl[0] && tbl[0].exists;
  if (!hasHistory) return;

  const failed = await prisma.$queryRawUnsafe(
    `SELECT migration_name FROM "_prisma_migrations"
       WHERE finished_at IS NULL
         AND rolled_back_at IS NULL
         AND started_at IS NOT NULL
       ORDER BY started_at ASC`,
  );

  if (!Array.isArray(failed) || failed.length === 0) return;

  for (const row of failed) {
    const name = row.migration_name;
    const mode = name === '0_init' ? '--applied' : '--rolled-back';
    console.log(`→ resolvendo migration em estado "failed": ${name} (${mode})`);
    try {
      execSync(`npx prisma migrate resolve ${mode} ${name}`, { stdio: 'inherit' });
    } catch (e) {
      console.log(`  (não consegui resolver ${name}: ${e && e.message}); seguindo`);
    }
  }
}

main()
  .catch((e) => console.log('resolve-failed:', e && e.message))
  .finally(() => prisma.$disconnect());
