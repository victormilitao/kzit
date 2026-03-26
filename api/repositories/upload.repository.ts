import { Upload, UploadStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';

export const uploadRepository = {
  async create(data: { filename: string; totalMessages: number }): Promise<Upload> {
    return prisma.upload.create({ data });
  },

  async findById(id: string): Promise<Upload | null> {
    return prisma.upload.findUnique({
      where: { id },
      include: { _count: { select: { messages: true } } },
    });
  },

  async updateStatus(id: string, status: UploadStatus): Promise<Upload> {
    return prisma.upload.update({
      where: { id },
      data: { status },
    });
  },

  async updateProgress(id: string, processedMessages: number, status?: UploadStatus): Promise<Upload> {
    return prisma.upload.update({
      where: { id },
      data: {
        processedMessages,
        ...(status ? { status } : {}),
      },
    });
  },

  async findAll(page = 1, limit = 20): Promise<{ data: Upload[]; total: number }> {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      prisma.upload.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.upload.count(),
    ]);
    return { data, total };
  },
};
