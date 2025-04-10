import {
  PipeTransform,
  Injectable,
  ArgumentMetadata,
  BadRequestException,
} from '@nestjs/common';
import { Types } from 'mongoose';

@Injectable()
export class ParseObjectIdPipe
  implements PipeTransform<string, Types.ObjectId>
{
  transform(value: string, _metadata: ArgumentMetadata): Types.ObjectId {
    // Added underscore to metadata
    const isValid = Types.ObjectId.isValid(value);
    if (!isValid) {
      throw new BadRequestException(`Invalid ObjectId string: ${value}`);
    }
    return new Types.ObjectId(value);
  }
}
