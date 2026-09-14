import {
  ArgumentsHost,
  Catch,
  ConflictException,
  ExceptionFilter,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';

@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse();

    switch (exception.code) {
      case 'P2002': {
        const error = new ConflictException(
          'A record with this value already exists',
        );

        return response.status(error.getStatus()).json(error.getResponse());
      }

      case 'P2025': {
        const error = new NotFoundException(
          'The requested record was not found',
        );

        return response.status(error.getStatus()).json(error.getResponse());
      }

      default:
        throw exception;
    }
  }
}
