import { IsInt, IsOptional, IsString, IsIn, Min, Max } from 'class-validator';

const TIPOS = ['cassete', 'lamina', 'bloco'] as const;

/** Gera N etiquetas (uma por lâmina/cassete) para uma amostra. */
export class GerarEtiquetasDto {
  @IsInt()
  amostraId: number;

  @IsString()
  @IsIn(TIPOS)
  tipo: (typeof TIPOS)[number];

  /** Quantidade de etiquetas a gerar (lâminas/cassetes). */
  @IsInt()
  @Min(1)
  @Max(200)
  quantidade: number;

  /** Coloração/serviço impresso na etiqueta (ex: ".HE"). */
  @IsOptional()
  @IsString()
  coloracao?: string;

  /** Identificação-base do cliente (linha-topo). Sem isso, é derivada da amostra. */
  @IsOptional()
  @IsString()
  identificacao?: string;
}
