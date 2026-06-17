import { IsIn, IsOptional, IsString } from 'class-validator';
import { DEPARTAMENTO_KEYS, TIPOS_EVENTO } from '../departamentos';

/** Registra um scan de código de barras em um departamento. */
export class ScanDto {
  /** Conteúdo do código de barras Code128 da etiqueta. */
  @IsString()
  codigo: string;

  @IsString()
  @IsIn(DEPARTAMENTO_KEYS)
  departamento: string;

  @IsString()
  @IsIn(TIPOS_EVENTO as unknown as string[])
  tipo: 'entrada' | 'saida';

  @IsOptional()
  @IsString()
  scannedPor?: string;

  @IsOptional()
  @IsString()
  observacoes?: string;
}
