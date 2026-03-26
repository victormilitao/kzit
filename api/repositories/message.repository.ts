import { Prisma, Message, MessageStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { MessageFilters } from '../types';

export const messageRepository = {
  async createMany(
    data: {
      uploadId: string;
      senderName: string;
      text: string;
      timestamp: Date;
      status?: MessageStatus;
    }[]
  ): Promise<number> {
    const result = await prisma.message.createMany({ data });
    return result.count;
  },

  async findByUploadId(uploadId: string): Promise<Message[]> {
    return prisma.message.findMany({
      where: { uploadId, status: 'PENDING' },
      orderBy: { timestamp: 'asc' },
    });
  },

  async updateStatus(id: string, status: MessageStatus): Promise<Message> {
    return prisma.message.update({
      where: { id },
      data: { status },
    });
  },

  async findAll(filters: MessageFilters): Promise<{ data: Message[]; total: number }> {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.MessageWhereInput = {};

    if (filters.status) where.status = filters.status;
    if (filters.uploadId) where.uploadId = filters.uploadId;

    if (filters.startDate || filters.endDate) {
      where.timestamp = {};
      if (filters.startDate) where.timestamp.gte = filters.startDate;
      if (filters.endDate) where.timestamp.lte = filters.endDate;
    }

    const [data, total] = await Promise.all([
      prisma.message.findMany({
        where,
        skip,
        take: limit,
        orderBy: { timestamp: 'desc' },
        include: { entry: true },
      }),
      prisma.message.count({ where }),
    ]);

    return { data, total };
  },
};
