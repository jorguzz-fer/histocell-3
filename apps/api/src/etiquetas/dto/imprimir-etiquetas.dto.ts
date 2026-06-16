import { IsArray, IsInt, ArrayMinSize } from 'class-validator';

/** Marca um lote de etiquetas como impressas. */
export class ImprimirEtiquetasDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsInt({ each: true })
  ids: number[];
}
