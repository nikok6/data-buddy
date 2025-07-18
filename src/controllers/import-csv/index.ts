import { FastifyRequest, FastifyReply } from 'fastify';
import { importCsvService } from '../../services/import-csv';
import { MultipartFile } from '@fastify/multipart';

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
      return reply.status(400).send({
        success: false,
        error: 'No file uploaded'
      });
    }

    if (!data.mimetype || !data.mimetype.includes('csv')) {
      return reply.status(400).send({
        success: false,
        error: 'Invalid file type. Please upload a CSV file'
      });
    }

    const result = await importCsvService(data);
    return reply.send({
      success: true,
      data: result
    });
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'code' in error) {
      const multipartError = error as FastifyMultipartError;
      if (multipartError.code === 'FST_INVALID_MULTIPART_CONTENT_TYPE') {
        return reply.status(400).send({
          success: false,
          error: 'No file uploaded'
        });
      }
    }
    
    console.error('Error importing CSV:', error);
    return reply.status(500).send({
      success: false,
      error: 'Failed to import CSV file'
    });
  }
}; 