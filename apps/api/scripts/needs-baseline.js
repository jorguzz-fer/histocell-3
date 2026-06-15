// Detecta se o banco precisa de baseline da migration 0_init.
//
// 0_init é um snapshot do schema que JÁ existe em produção (criado pelo
// antigo `prisma db push`). Ele nunca deve ser executado contra esse banco —
// apenas marcado como aplicado. Precisamos baselinar quando as tabelas da app
// já existem MAS a 0_init ainda não consta como aplicada com sucesso. Isso
// cobre dois cenários:
//   1. Banco legado sem histórico de migrations (_prisma_migrations ausente).
//   2. Deploy anterior que rodou a 0_init e falhou (registro "failed"),
//      deixando o banco preso em P3009 — agora conseguimos auto-recuperar.
//
// Imprime exatamente "1" se precisa baselinar, "0" caso contrário (inclui
// banco vazio, onde o migrate deploy deve criar tudo do zero).
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function decide() {
  const userRows = await prisma.$queryRawUnsafe(
    `SELECT to_regclass('public."User"') IS NOT NULL AS exists`,
  )
  const userExists = Array.isArray(userRows) && userRows[0] && userRows[0].exists
  // Banco vazio: deixa o migrate deploy criar tudo a partir da 0_init.
  if (!userExists) return '0'

  const migRows = await prisma.$queryRawUnsafe(
    `SELECT to_regclass('public._prisma_migrations') IS NOT NULL AS exists`,
  )
  const migExists = Array.isArray(migRows) && migRows[0] && migRows[0].exists
  // Tabelas existem mas não há histórico: legado puro → baselinar.
  if (!migExists) return '1'

  const appliedRows = await prisma.$queryRawUnsafe(
    `SELECT EXISTS(
        SELECT 1 FROM "_prisma_migrations"
        WHERE migration_name = '0_init'
          AND finished_at IS NOT NULL
          AND rolled_back_at IS NULL
     ) AS applied`,
  )
  const isApplied =
    Array.isArray(appliedRows) && appliedRows[0] && appliedRows[0].applied
  // 0_init ausente ou em estado "failed": baselinar para destravar o deploy.
  return isApplied ? '0' : '1'
}

decide()
  .then((v) => process.stdout.write(v))
  // Em qualquer erro (banco indisponível, etc.) não baselina — deixa o
  // migrate deploy seguir o fluxo normal.
  .catch(() => process.stdout.write('0'))
  .finally(() => prisma.$disconnect())
