import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { CryptoService } from '../common/crypto.service';
import { CreateClienteDto } from './dto/create-cliente.dto';
import { UpdateClienteDto } from './dto/update-cliente.dto';
import { FilterClienteDto } from './dto/filter-cliente.dto';

/** Campos seguros pra retornar ao front — nunca retornamos o documento puro */
const SELECT_SAFE = {
  id: true,
  tipo: true,
  nome: true,
  nomeFantasia: true,
  // documento: NÃO — só retornamos mascarado via getter
  inscricaoEstadual: true,
  idEtiqueta: true,
  email: true,
  emailFinanceiro: true,
  emailMacroscopia: true,
  telefone: true,
  celular: true,
  segmento: true,
  observacoes: true,
  ativo: true,
  createdAt: true,
  updatedAt: true,
  enderecos: {
    select: {
      id: true,
      tipo: true,
      logradouro: true,
      numero: true,
      complemento: true,
      bairro: true,
      cidade: true,
      uf: true,
      cep: true,
      principal: true,
    },
  },
} as const;

@Injectable()
export class ClientesService {
  constructor(
    private prisma: PrismaService,
    private crypto: CryptoService,
  ) {}

  // -------------------------------------------------------------------------
  // Helpers internos
  // -------------------------------------------------------------------------

  /** Retorna documento descriptografado (uso interno apenas) */
  private decryptDoc(cliente: { documento: string }) {
    return this.crypto.decrypt(cliente.documento);
  }

  /** Monta objeto de resposta com documento mascarado */
  private toResponseShape(raw: any) {
    const { documento, ...rest } = raw;
    return {
      ...rest,
      documentoMascarado: documento ? this.crypto.mascarar(this.crypto.decrypt(documento)) : null,
    };
  }

  // -------------------------------------------------------------------------
  // LIST — com filtros e paginação
  // -------------------------------------------------------------------------

  async findAll(filter: FilterClienteDto) {
    const page = Math.max(1, filter.page ?? 1);
    const limit = Math.min(100, Math.max(1, filter.limit ?? 20));
    const skip = (page - 1) * limit;

    // WHERE dinâmico
    const where: any = {};

    if (filter.ativo !== undefined) {
      where.ativo = filter.ativo;
    } else {
      where.ativo = true; // padrão: só ativos
    }

    if (filter.tipo) where.tipo = filter.tipo;
    if (filter.segmento) where.segmento = filter.segmento;

    if (filter.busca) {
      where.OR = [
        { nome: { contains: filter.busca, mode: 'insensitive' } },
        { nomeFantasia: { contains: filter.busca, mode: 'insensitive' } },
        { email: { contains: filter.busca, mode: 'insensitive' } },
      ];
    }

    const [total, items] = await this.prisma.$transaction([
      this.prisma.cliente.count({ where }),
      this.prisma.cliente.findMany({
        where,
        select: { ...SELECT_SAFE, documento: true },
        orderBy: { nome: 'asc' },
        skip,
        take: limit,
      }),
    ]);

    return {
      data: items.map((c) => this.toResponseShape(c)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // -------------------------------------------------------------------------
  // GET ONE
  // -------------------------------------------------------------------------

  async findOne(id: number) {
    const cliente = await this.prisma.cliente.findUnique({
      where: { id },
      select: { ...SELECT_SAFE, documento: true },
    });
    if (!cliente) throw new NotFoundException(`Cliente #${id} não encontrado.`);
    return this.toResponseShape(cliente);
  }

  // -------------------------------------------------------------------------
  // CREATE
  // -------------------------------------------------------------------------

  async create(dto: CreateClienteDto) {
    const documentoEncrypted = this.crypto.encrypt(dto.documento);

    const cliente = await this.prisma.cliente.create({
      data: {
        tipo: dto.tipo,
        nome: dto.nome,
        nomeFantasia: dto.nomeFantasia,
        documento: documentoEncrypted,
        inscricaoEstadual: dto.inscricaoEstadual,
        idEtiqueta: dto.idEtiqueta,
        email: dto.email,
        emailFinanceiro: dto.emailFinanceiro,
        emailMacroscopia: dto.emailMacroscopia,
        telefone: dto.telefone,
        celular: dto.celular,
        segmento: dto.segmento ?? 'recorrente',
        observacoes: dto.observacoes,
        // Cria endereço principal inline, se fornecido
        enderecos: dto.endereco
          ? {
              create: {
                ...dto.endereco,
                principal: true,
              },
            }
          : undefined,
      },
      select: { ...SELECT_SAFE, documento: true },
    });

    return this.toResponseShape(cliente);
  }

  // -------------------------------------------------------------------------
  // UPDATE
  // -------------------------------------------------------------------------

  async update(id: number, dto: UpdateClienteDto) {
    await this.findOne(id); // garante que existe

    // Se veio documento novo, encripta
    const documentoEncrypted = dto.documento
      ? this.crypto.encrypt(dto.documento)
      : undefined;

    // Separa o endereço do DTO
    const { endereco, documento, ...clienteFields } = dto;

    const cliente = await this.prisma.cliente.update({
      where: { id },
      data: {
        ...clienteFields,
        ...(documentoEncrypted ? { documento: documentoEncrypted } : {}),
        // Se veio endereço no update, faz upsert no endereço principal
        ...(endereco
          ? {
              enderecos: {
                upsert: {
                  where: {
                    // tenta upsert no endereço principal (busca primeiro por tipo sede)
                    // Fallback: cria novo
                    id: await this.getEnderecoId(id),
                  },
                  update: { ...endereco },
                  create: { ...endereco, principal: true },
                },
              },
            }
          : {}),
      },
      select: { ...SELECT_SAFE, documento: true },
    });

    return this.toResponseShape(cliente);
  }

  /** Busca o ID do endereço principal de um cliente (pra upsert) */
  private async getEnderecoId(clienteId: number): Promise<number> {
    const end = await this.prisma.endereco.findFirst({
      where: { clienteId, principal: true },
      select: { id: true },
    });
    return end?.id ?? 0; // 0 → Prisma vai criar novo
  }

  // -------------------------------------------------------------------------
  // SOFT DELETE (desativa)
  // -------------------------------------------------------------------------

  async remove(id: number) {
    await this.findOne(id); // garante que existe
    await this.prisma.cliente.update({
      where: { id },
      data: { ativo: false },
    });
    return { message: `Cliente #${id} desativado com sucesso.` };
  }

  // -------------------------------------------------------------------------
  // REATIVAR
  // -------------------------------------------------------------------------

  async reativar(id: number) {
    const cliente = await this.prisma.cliente.findUnique({ where: { id } });
    if (!cliente) throw new NotFoundException(`Cliente #${id} não encontrado.`);
    await this.prisma.cliente.update({
      where: { id },
      data: { ativo: true },
    });
    return { message: `Cliente #${id} reativado com sucesso.` };
  }
}
