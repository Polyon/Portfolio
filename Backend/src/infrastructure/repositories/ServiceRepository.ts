import { Service, ServiceCategory } from '../database/models/Service';
import type { IService } from '../database/models/index';

export class ServiceRepository {
  /**
   * Create a new service document for the given user.
   * @param userId - Portfolio owner user ID
   * @param data   - Partial service fields to set
   * @returns The newly created service document
   */
  async create(userId: string, data: Partial<IService>): Promise<IService> {
    return Service.create({ ...data, userId });
  }

  /**
   * Return all non-deleted services for a user, sorted by displayOrder then name.
   * @param userId - Portfolio owner user ID
   * @returns Resolved array of service documents
   */
  async findByUserId(userId: string): Promise<IService[]> {
    return Service.find({ userId, isDeleted: false }).sort({ displayOrder: 1, name: 1 });
  }

  /**
   * Return non-deleted services filtered by category for a user.
   * @param userId   - Portfolio owner user ID
   * @param category - ServiceCategory enum value to filter by
   * @returns Resolved array of matching service documents
   */
  async findByCategory(userId: string, category: ServiceCategory): Promise<IService[]> {
    return Service.find({ userId, category, isDeleted: false }).sort({ displayOrder: 1 });
  }

  /**
   * Find a single non-deleted service by its MongoDB ObjectId.
   * @param serviceId - MongoDB ObjectId of the service
   * @returns The service document, or null if not found or deleted
   */
  async findById(serviceId: string): Promise<IService | null> {
    return Service.findOne({ _id: serviceId, isDeleted: false });
  }

  /**
   * Apply a partial update to a non-deleted service. Returns the updated document or null.
   * @param serviceId - MongoDB ObjectId of the service
   * @param data      - Partial service fields to apply
   * @returns The updated service document, or null if not found
   */
  async update(serviceId: string, data: Partial<IService>): Promise<IService | null> {
    return Service.findOneAndUpdate({ _id: serviceId, isDeleted: false }, { $set: data }, { returnDocument: 'after' });
  }

  /**
   * Soft-delete a service by setting isDeleted=true.
   * @param serviceId - MongoDB ObjectId of the service
   * @returns Resolves when the soft-delete completes
   */
  async delete(serviceId: string): Promise<void> {
    await Service.updateOne({ _id: serviceId }, { $set: { isDeleted: true } });
  }
}
