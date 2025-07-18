import { FastifyRequest, FastifyReply } from 'fastify';
import { importCsvService } from '../../services/import-csv';
import { MultipartFile } from '@fastify/multipart';
import { ApiResponse } from '../../types';

interface FastifyMultipartError {
  code: string;
  message: string;
}

export const importCsvController = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  try {
    const data = await request.file();
    
    if (!data) {
      const response: ApiResponse<never> = {
        success: false,
        error: 'No file uploaded'
      };
      return reply.status(400).send(response);
    }

    if (!data.mimetype || !data.mimetype.includes('csv')) {
      const response: ApiResponse<never> = {
        success: false,
        error: 'Invalid file type. Please upload a CSV file'
      };
      return reply.status(400).send(response);
    }

    const result = await importCsvService(data);
    const response: ApiResponse<typeof result> = {
      success: true,
      data: result
    };
    return reply.send(response);
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'code' in error) {
      const multipartError = error as FastifyMultipartError;
      if (multipartError.code === 'FST_INVALID_MULTIPART_CONTENT_TYPE') {
        const response: ApiResponse<never> = {
          success: false,
          error: 'No file uploaded'
        };
        return reply.status(400).send(response);
      }
    }
    
    console.error('Error importing CSV:', error);
    const response: ApiResponse<never> = {
      success: false,
      error: 'Failed to import CSV file'
    };
    return reply.status(500).send(response);
  }
}; 