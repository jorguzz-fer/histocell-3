/**
 * Backfill do Rastreio a partir da etapa atual das Ordens de Serviço.
 *
 * Contexto: a sincronização Fila→Rastreio (OrdensService.sincronizarRastreio)
 * só age a partir do momento em que foi implantada — ao criar a OS e a cada
 * avanço. Itens recebidos ANTES do deploy ficam com o rastreio "não iniciado"
 * (departamentoAtual nulo), mesmo tendo uma OS numa etapa avançada.
 *
 * Este script é um alinhamento pontual e idempotente: para cada OS não
 * cancelada, coloca as etiquetas AINDA "não iniciadas" no departamento
 * correspondente à etapa atual da OS. NÃO sobrescreve etiquetas que já têm
 * histórico de rastreio (scan físico real) — só preenche o que está em branco.
 *
 * Uso:  cd apps/api && npx tsx prisma/backfill-rastreio.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Mesmo mapa de src/ordens/etapas.ts (inline para o script ser autocontido).
const ETAPA_PARA_DEPARTAMENTO: Record<string, string> = {
  triagem: 'recepcao',
  macroscopia: 'macroscopia',
  processamento: 'processamento',
  microtomia: 'microtomia',
  coloracao: 'coloracao',
  laudo: 'laudo',
  finalizacao: 'finalizacao',
  expedicao: 'expedicao',
};

async function main() {
  console.log('🔄 Backfill do rastreio a partir da etapa atual das OS...');

  const ordens = await prisma.ordemServico.findMany({
    where: { status: { not: 'cancelada' } },
    include: {
      amostra: {
        include: {
          etiquetas: {
            select: { id: true, rastreioStatus: true, departamentoAtual: true },
          },
        },
      },
    },
  });

  let etiquetasAlinhadas = 0;
  let osProcessadas = 0;

  for (const os of ordens) {
    const concluida = os.status === 'concluida';
    const departamento = ETAPA_PARA_DEPARTAMENTO[os.etapaAtual] ?? (concluida ? 'expedicao' : null);
    if (!departamento) continue;

    const etiquetas = os.amostra?.etiquetas ?? [];
    // Só preenche o que está em branco — não mexe em quem já tem scan real.
    const alvo = etiquetas.filter(
      (e) => e.rastreioStatus === 'nao_iniciado' || e.departamentoAtual == null,
    );
    if (alvo.length === 0) continue;

    const rastreioStatus = concluida ? 'concluido' : 'em_andamento';
    const agora = new Date();

    for (const e of alvo) {
      await prisma.$transaction([
        prisma.rastreioEvento.create({
          data: {
            etiquetaId: e.id,
            departamento,
            tipo: concluida ? 'saida' : 'entrada',
            scannedPor: 'Backfill',
            observacoes: `Alinhado à etapa atual da OS ${os.numero} (${os.etapaAtual})`,
          },
        }),
        prisma.etiqueta.update({
          where: { id: e.id },
          data: {
            departamentoAtual: departamento,
            rastreioStatus,
            ultimoEventoEm: agora,
            ultimoResponsavel: 'Backfill',
          },
        }),
      ]);
      etiquetasAlinhadas++;
    }
    osProcessadas++;
  }

  console.log(`   ✅ ${etiquetasAlinhadas} etiquetas alinhadas em ${osProcessadas} OS.`);
}

main()
  .catch((e) => {
    console.error('❌ Backfill falhou:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
