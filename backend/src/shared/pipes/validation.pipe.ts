import {
  PipeTransform,
  ArgumentMetadata,
  Injectable,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { validate, ValidationError } from 'class-validator';
import { plainToInstance } from 'class-transformer';

@Injectable()
export class ValidationPipe implements PipeTransform<unknown> {
  logger = new Logger('ValidationPipe');

  async transform(value: unknown, { metatype }: ArgumentMetadata) {
    this.logger.log('Validating input data');

    if (!metatype || !this.toValidate(metatype)) {
      return value;
    }

    const object = plainToInstance(metatype, value);
    const errors = await validate(object);
    if (errors.length > 0) {
      this.logger.log(errors, 'Validation failed');
      throw new HttpException(
        {
          message: 'Input data validation failed',
          errors: this.buildError(errors),
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    return value;
  }

  private buildError(errors: ValidationError[]): Record<string, string> {
    const result: Record<string, string> = {};
    errors.forEach((el: ValidationError) => {
      const prop = el.property;
      Object.entries(el.constraints || {}).forEach(
        ([constraintKey, constraintValue]) => {
          result[prop + constraintKey] = constraintValue;
        },
      );
    });
    return result;
  }

  private toValidate(metatype: any): boolean {
    const types = [String, Boolean, Number, Array, Object];
    return !types.includes(metatype);
  }
}
