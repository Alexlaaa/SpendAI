import { UserEntity } from '../user/schemas/user.schema';

declare module 'express' {
  export interface Request {
    user?: UserEntity;
  }
}
