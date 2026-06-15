// Detecta se o banco precisa de baseline de migrations.
// Caso "legado": já tem tabelas da app (criadas por `prisma db push`) mas
// ainda não tem o histórico de migrations do Prisma (_prisma_migrations).
// Imprime "1" se precisa baselinar, "0" caso contrário (inclui banco vazio).
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

prisma
  .$queryRawUnsafe(
    `SELECT (to_regclass('public._prisma_migrations') IS NULL)
        AND (to_regclass('public."User"') IS NOT NULL) AS need`,
  )
  .then((rows) => {
    const need = Array.isArray(rows) && rows[0] && rows[0].need
    process.stdout.write(need ? '1' : '0')
  })
  .catch(() => {
    // Em qualquer erro (banco indisponível, etc.) não baselina — deixa o
    // migrate deploy seguir o fluxo normal.
    process.stdout.write('0')
  })
  .finally(() => prisma.$disconnect())
