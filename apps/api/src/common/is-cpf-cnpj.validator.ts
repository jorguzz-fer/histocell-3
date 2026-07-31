import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';
import { isValidDocumento } from './documento.util';

/**
 * Valida CPF (PF) ou CNPJ (PJ) com dígitos verificadores.
 *
 * Usa o campo `tipo` do próprio objeto para escolher o algoritmo; se `tipo`
 * não estiver presente (ex.: update parcial), infere pelo tamanho do documento.
 */
export function IsCpfOuCnpj(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isCpfOuCnpj',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown, args: ValidationArguments) {
          if (typeof value !== 'string') return false;
          const tipo = (args.object as { tipo?: 'PF' | 'PJ' }).tipo;
          return isValidDocumento(value, tipo);
        },
        defaultMessage(args: ValidationArguments) {
          const tipo = (args.object as { tipo?: 'PF' | 'PJ' }).tipo;
          if (tipo === 'PF') return 'CPF inválido';
          if (tipo === 'PJ') return 'CNPJ inválido';
          return 'CPF/CNPJ inválido';
        },
      },
    });
  };
}
