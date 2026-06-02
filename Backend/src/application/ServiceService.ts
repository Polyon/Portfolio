import { Service, ServiceCategory } from '../infrastructure/database/models/Service';
import { AuditLog, AuditAction } from '../infrastructure/database/models/AuditLog';
import type { IService } from '../infrastructure/database/models/index';

export interface CreateServiceDTO {
  name: string;
  description: string;
  category: ServiceCategory;
  displayOrder?: number;
}

export interface UpdateServiceDTO extends Partial<CreateServiceDTO> {
  isPublished?: boolean;
}

export interface ListServicesDTO {
  page?: number;
  limit?: number;
  search?: string;
  category?: ServiceCategory;
  isPublished?: boolean;
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface PaginatedServices {
  data: IService[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export class ServiceService {
  /**
   * List non-deleted services for a user with optional pagination and filtering.
   * @param userId  - Portfolio owner user ID
   * @param filters - Optional pagination/filter params
   * @returns Paginated wrapper with service documents and metadata
   * @auth Requires authenticated user context
   */
  async list(userId: string, filters: ListServicesDTO = {}): Promise<PaginatedServices> {
    const page  = Math.max(1, filters.page  ?? 1);
    const limit = Math.min(100, Math.max(1, filters.limit ?? 10));
    const skip  = (page - 1) * limit;

    const query: Record<string, unknown> = { userId, isDeleted: false };
    if (filters.category)                query['category']    = filters.category;
    if (filters.isPublished !== undefined) query['isPublished'] = filters.isPublished;
    if (filters.search) {
      query['name'] = { $regex: filters.search, $options: 'i' };
    }

    const sortField = filters.sort ?? 'displayOrder';
    const sortDir   = filters.order === 'desc' ? -1 : 1;

    const [data, total] = await Promise.all([
      Service.find(query).sort({ [sortField]: sortDir, name: 1 }).skip(skip).limit(limit),
      Service.countDocuments(query),
    ]);

    return {
      data,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  /**
   * Create a new service offering for a user and write an audit log entry.
   * @param userId - Portfolio owner user ID
   * @param dto    - Service fields
   * @returns The newly created service document
   * @auth Requires authenticated user context
   */
  async create(userId: string, dto: CreateServiceDTO): Promise<IService> {
    const svc = await Service.create({ ...dto, userId });
    await AuditLog.create({
      userId,
      action: AuditAction.CREATE,
      entityType: 'Service',
      entityId: svc._id,
      newValues: svc.toObject(),
    });
    return svc;
  }

  /**
   * Update a service owned by the user and write an audit log entry.
   * @param userId    - Portfolio owner user ID
   * @param serviceId - MongoDB ObjectId of the service to update
   * @param dto       - Partial service fields to apply
   * @returns The updated service document, or null if not found
   * @auth Requires authenticated user context
   */
  async update(userId: string, serviceId: string, dto: UpdateServiceDTO): Promise<IService | null> {
    const old = await Service.findOne({ _id: serviceId, userId, isDeleted: false });
    const updated = await Service.findOneAndUpdate(
      { _id: serviceId, userId, isDeleted: false },
      { $set: dto },
      { returnDocument: 'after' }
    );
    if (updated) {
      await AuditLog.create({
        userId,
        action: AuditAction.UPDATE,
        entityType: 'Service',
        entityId: updated._id,
        oldValues: old?.toObject(),
        newValues: updated.toObject(),
      });
    }
    return updated;
  }

  /**
   * Soft-delete a service and write an audit log entry.
   * @param userId    - Portfolio owner user ID
   * @param serviceId - MongoDB ObjectId of the service to delete
   * @returns Resolves when the soft-delete completes
   * @auth Requires authenticated user context
   */
  async delete(userId: string, serviceId: string): Promise<void> {
    await Service.updateOne({ _id: serviceId, userId }, { $set: { isDeleted: true } });
    await AuditLog.create({ userId, action: AuditAction.DELETE, entityType: 'Service', entityId: serviceId });
  }

  /**
   * Bulk-update displayOrder for a list of services owned by the user.
   * @param userId     - Portfolio owner user ID
   * @param orderedIds - Array of service ObjectId strings in the desired display order
   * @returns Resolves when all display orders are persisted
   * @auth Requires authenticated user context
   */
  async updateDisplayOrder(userId: string, orderedIds: string[]): Promise<void> {
    const ops = orderedIds.map((id, index) =>
      Service.updateOne({ _id: id, userId, isDeleted: false }, { $set: { displayOrder: index } }),
    );
    await Promise.all(ops);
  }
}
