import { IsOptional, IsBooleanString } from 'class-validator';

export class FilterFilaDto {
  @IsOptional() @IsBooleanString() soMeus?: string;
}
