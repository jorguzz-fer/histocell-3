import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Usuários admin
  const senhaHash = await bcrypt.hash('Histocell@2026', 12);

  await prisma.user.upsert({
    where: { email: 'celio@histocell.com.br' },
    update: {},
    create: {
      nome: 'Célio',
      email: 'celio@histocell.com.br',
      senha: senhaHash,
      role: 'gerencia',
    },
  });

  await prisma.user.upsert({
    where: { email: 'kleber@histocell.com.br' },
    update: {},
    create: {
      nome: 'Kleber',
      email: 'kleber@histocell.com.br',
      senha: senhaHash,
      role: 'gerencia',
    },
  });

  await prisma.user.upsert({
    where: { email: 'recepcao@histocell.com.br' },
    update: {},
    create: {
      nome: 'Recepção',
      email: 'recepcao@histocell.com.br',
      senha: senhaHash,
      role: 'recepcao',
    },
  });

  // Serviços base
  const servicos = [
    { codigo: 'HISTO-001', nome: 'Histopatológico Simples', precoBase: 45.00 },
    { codigo: 'HISTO-002', nome: 'Histopatológico Complexo', precoBase: 85.00 },
    { codigo: 'CITO-001', nome: 'Citologia', precoBase: 35.00 },
    { codigo: 'IHQ-001', nome: 'Imuno-histoquímica', precoBase: 120.00 },
    { codigo: 'MACRO-001', nome: 'Macroscopia', precoBase: 25.00 },
    { codigo: 'COLOR-001', nome: 'Coloração Especial', precoBase: 55.00 },
    { codigo: 'BIOPSIA-001', nome: 'Biópsia Incisional', precoBase: 60.00 },
    { codigo: 'BIOPSIA-002', nome: 'Biópsia Excisional', precoBase: 75.00 },
  ];

  for (const s of servicos) {
    await prisma.servico.upsert({
      where: { codigo: s.codigo },
      update: {},
      create: {
        codigo: s.codigo,
        nome: s.nome,
        precoBase: s.precoBase,
      },
    });
  }

  console.log('✅ Seed concluído!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
