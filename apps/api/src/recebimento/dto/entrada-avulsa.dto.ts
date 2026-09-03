import { Type, Transform } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { RecipienteItemDto } from './entrada-recepcao.dto';

/** Estados possíveis do material que chega. Cada um segue para um departamento. */
export const CONDICOES = ['macroscopia', 'molhado', 'seco'] as const;
export type Condicao = (typeof CONDICOES)[number];

/**
 * Departamento de destino por condição do material (reunião 02/09):
 *  - macroscopia: peça/animal no pote — a macroscopista abre, descreve e
 *    transforma em cassetes;
 *  - molhado: cassete em formol que o cliente já montou — vai direto ao
 *    Processamento (não passa pela Macroscopia);
 *  - seco: bloco/lâmina — já vem pronto e vai ao corte (Microtomia).
 */
export const CONDICAO_ETAPA: Record<Condicao, string> = {
  macroscopia: 'macroscopia',
  molhado: 'processamento',
  seco: 'microtomia',
};

/**
 * Etapa em que a OS da entrada começa: a mais atrasada do fluxo entre os
 * volumes (nenhum volume pode pular uma etapa que ainda precisa acontecer).
 */
export function etapaInicialEntrada(condicoes: string[]): string {
  const destinos = condicoes.map((c) => CONDICAO_ETAPA[c as Condicao]);
  return (
    ['macroscopia', 'processamento', 'microtomia'].find((e) => destinos.includes(e)) ??
    'triagem'
  );
}

/** Objeto recebido na Entrada: como o recipiente, mais a condição do material. */
export class ObjetoEntradaDto extends RecipienteItemDto {
  @IsIn([...CONDICOES])
  condicao: Condicao;

  /** Nome do paciente/animal (obrigatório de fato só no fluxo Macroscopia). */
  @IsOptional()
  @IsString()
  paciente?: string;
}

/**
 * Tela "Entrada": a recepção registra só quem é o cliente e o que chegou. Não
 * existe orçamento ainda — o vínculo com o pedido é feito depois.
 */
export class EntradaAvulsaDto {
  @IsInt()
  clienteId: number;

  @IsOptional()
  @IsString()
  recebidoPor?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ObjetoEntradaDto)
  @ArrayMinSize(1)
  recipientes: ObjetoEntradaDto[];
}

/** Vincula entradas avulsas já registradas a um pedido/orçamento do cliente. */
export class VincularEntradaDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsInt({ each: true })
  @Type(() => Number)
  recipienteIds: number[];

  @IsInt()
  pedidoId: number;
}

export class FilterEntradaDto {
  /** Só as que ainda não viraram pedido. */
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  @IsOptional()
  pendentes?: boolean;

  /** Janela em dias a considerar (padrão 1 = hoje). Ignorado quando pendentes. */
  @Transform(({ value }) => (value == null ? value : parseInt(value, 10)))
  @IsInt()
  @Min(1)
  @IsOptional()
  dias?: number;
}
