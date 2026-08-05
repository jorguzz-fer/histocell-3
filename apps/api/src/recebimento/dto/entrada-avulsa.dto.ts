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
export const CONDICOES = ['molhado', 'seco'] as const;
export type Condicao = (typeof CONDICOES)[number];

/**
 * Departamento de destino por condição do material:
 *  - molhado (pote com formol) precisa ser aberto e clivado na Macroscopia;
 *  - seco (cassete, bloco, lâmina) já vem preparado e vai direto ao corte.
 */
export const CONDICAO_ETAPA: Record<Condicao, string> = {
  molhado: 'macroscopia',
  seco: 'microtomia',
};

/** Objeto recebido na Entrada: como o recipiente, mais a condição do material. */
export class ObjetoEntradaDto extends RecipienteItemDto {
  @IsIn([...CONDICOES])
  condicao: Condicao;
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
