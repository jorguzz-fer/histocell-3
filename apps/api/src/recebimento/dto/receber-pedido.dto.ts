import {
  IsInt,
  IsOptional,
  IsString,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';

export class AmostraItemDto {
  /** Recipiente (Pote/Caixa/Saco) ao qual esta amostra pertence. */
  @IsOptional()
  @IsInt()
  recipienteId?: number;

  /** Serviço solicitado ao qual esta amostra/cassete pertence (macroscopia). */
  @IsOptional()
  @IsInt()
  servicoId?: number;

  @IsOptional()
  @IsString()
  numeroCliente?: string;

  @IsOptional()
  @IsString()
  especie?: string; // canino, felino, … (opcional — cassete fechado)

  @IsOptional()
  @IsString()
  material?: string; // biopsia, citologia, … (opcional)

  @IsOptional()
  @IsString()
  localizacao?: string; // região anatômica

  @IsOptional()
  @IsString()
  observacoes?: string;
}

/** Recebe um pedido inteiro: registra N amostras e avança pedido para "recebido" */
export class ReceberPedidoDto {
  @IsInt()
  pedidoId: number;

  @IsOptional()
  @IsString()
  recebidoPor?: string;

  /** Quantidade prevista (conferência). Default: soma das qtds do pedido. */
  @IsOptional()
  @IsInt()
  qtdPrevista?: number;

  /** Quantidade recebida (conferência). Default: nº de amostras registradas. */
  @IsOptional()
  @IsInt()
  qtdRecebida?: number;

  /** Observação manual da conferência (anexada às observações do pedido). */
  @IsOptional()
  @IsString()
  observacaoConferencia?: string;

  @ValidateNested({ each: true })
  @Type(() => AmostraItemDto)
  @ArrayMinSize(1)
  amostras: AmostraItemDto[];
}
