import { BadRequestException, ConflictException, HttpException } from '@nestjs/common';

export async function runDatabaseOperation<T>(work: () => Promise<T>): Promise<T> {
  try {
    return await work();
  } catch (error) {
    if (error instanceof HttpException) throw error;
    const message = error instanceof Error ? error.message : '';
    if (message.includes('ORA-00001')) throw new ConflictException('Ya existe un registro con esos datos.');
    if (/ORA-0229[012]/.test(message)) throw new BadRequestException('Los datos no cumplen las reglas de integridad del modelo.');
    throw error;
  }
}
