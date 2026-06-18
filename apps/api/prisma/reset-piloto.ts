/**
 * Reset do piloto: mantém o cliente AlchemyPet E todos os dados DELE,
 * e apaga tudo que pertence aos demais clientes (pedidos, amostras,
 * etiquetas, OS, rastreio, créditos, orçamentos, faturas) + os clientes.
 *
 * Uso:
 *   npx tsx prisma/reset-piloto.ts            # simulação (não apaga nada)
 *   npx tsx prisma/reset-piloto.ts --apply    # executa de verdade
 *
 * Segurança: aborta se o AlchemyPet não for encontrado (ou se houver mais de um).
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const APPLY = process.argv.includes('--apply');

async function main() {
  const candidatos = await prisma.cliente.findMany({
    where: {
      OR: [
        { nomeFantasia: { contains: 'alchemypet', mode: 'insensitive' } },
        { nome: { contains: 'alchemypet', mode: 'insensitive' } },
        { nomeFantasia: { contains: 'alquimipet', mode: 'insensitive' } },
        { nome: { contains: 'alquimipet', mode: 'insensitive' } },
      ],
    },
    select: { id: true, nome: true, nomeFantasia: true },
  });

  if (candidatos.length === 0) {
    throw new Error('AlchemyPet não encontrado — abortando para não zerar o banco sem cliente.');
  }
  if (candidatos.length > 1) {
    throw new Error(
      `Mais de um cliente combina com AlchemyPet (${candidatos.map((c) => `#${c.id} ${c.nomeFantasia ?? c.nome}`).join(', ')}). Ajuste o filtro e rode de novo.`,
    );
  }
  const keep = candidatos[0];
  const id = keep.id;
  console.log(`Cliente mantido (com TODOS os dados dele): #${id} — ${keep.nomeFantasia ?? keep.nome}`);

  const resumo = async () => ({
    clientes: await prisma.cliente.count(),
    pedidosTotais: await prisma.pedido.count(),
    pedidosAlchemyPet: await prisma.pedido.count({ where: { clienteId: id } }),
    amostrasTotais: await prisma.amostra.count(),
    etiquetasTotais: await prisma.etiqueta.count(),
  });
  console.log('Antes:', await resumo());

  if (!APPLY) {
    console.log('\n[SIMULAÇÃO] Nada foi apagado. Rode com --apply para executar.');
    console.log('Será apagado: tudo dos OUTROS clientes (e os outros clientes). AlchemyPet fica intacto.');
    return;
  }

  const outroPedido = { pedido: { clienteId: { not: id } } } as const;
  const outroViaAmostra = { amostra: { pedido: { clienteId: { not: id } } } } as const;
  const outroViaOS = { ordemServico: { amostra: { pedido: { clienteId: { not: id } } } } } as const;

  await prisma.$transaction([
    // rastreio e etiquetas dos outros clientes
    prisma.rastreioEvento.deleteMany({ where: { etiqueta: outroViaAmostra } }),
    prisma.etiqueta.deleteMany({ where: outroViaAmostra }),
    // OS dos outros clientes
    prisma.laudo.deleteMany({ where: outroViaOS }),
    prisma.etapaOS.deleteMany({ where: outroViaOS }),
    prisma.ordemServico.deleteMany({ where: outroViaAmostra }),
    // amostras / itens / pedidos dos outros
    prisma.amostra.deleteMany({ where: outroPedido }),
    prisma.creditoPrePago.deleteMany({ where: { clienteId: { not: id } } }),
    prisma.itemPedido.deleteMany({ where: outroPedido }),
    prisma.pedido.deleteMany({ where: { clienteId: { not: id } } }),
    // faturas / orçamentos dos outros
    prisma.itemFatura.deleteMany({ where: { fatura: { clienteId: { not: id } } } }),
    prisma.fatura.deleteMany({ where: { clienteId: { not: id } } }),
    prisma.itemOrcamento.deleteMany({ where: { orcamento: { clienteId: { not: id } } } }),
    prisma.orcamento.deleteMany({ where: { clienteId: { not: id } } }),
    // cadastros dos outros clientes
    prisma.endereco.deleteMany({ where: { clienteId: { not: id } } }),
    prisma.contato.deleteMany({ where: { clienteId: { not: id } } }),
    prisma.tabelaPreco.deleteMany({ where: { clienteId: { not: id } } }),
    prisma.user.updateMany({ where: { clienteId: { not: id } }, data: { clienteId: null } }),
    prisma.cliente.deleteMany({ where: { id: { not: id } } }),
  ]);

  console.log('Depois:', await resumo());
  console.log(`\n✅ Reset concluído. Mantido: ${keep.nomeFantasia ?? keep.nome} (com os dados dele).`);
}

main()
  .catch((e) => {
    console.error('Erro:', e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
