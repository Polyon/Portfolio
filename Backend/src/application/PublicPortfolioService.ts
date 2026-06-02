import { Profile } from '../infrastructure/database/models/Profile';
import { Skill } from '../infrastructure/database/models/Skill';
import { Experience } from '../infrastructure/database/models/Experience';
import { ExperienceSkill } from '../infrastructure/database/models/ExperienceSkill';
import { Project } from '../infrastructure/database/models/Project';
import { Service } from '../infrastructure/database/models/Service';
import { Contact } from '../infrastructure/database/models/Contact';
import { portfolioCache } from '../infrastructure/cache/PortfolioCache';
import type { IProfile, ISkill, IExperience, IProject, IService } from '../infrastructure/database/models/index';

const TTL = 5 * 60 * 1000;

export class PublicPortfolioService {
  /**
   * Retrieve the published profile for a portfolio owner (cached for 5 min).
   * @param userId - Portfolio owner user ID
   * @returns The published profile document, or null if not published
   */
  async getPublicProfile(userId: string): Promise<IProfile | null> {
    const key = `${userId}:profile`;
    const cached = portfolioCache.get<IProfile>(key);
    if (cached) return cached;
    const data = await Profile.findOne({ userId, isPublished: true, isDeleted: false });
    if (data) portfolioCache.cache(key, data, TTL);
    return data;
  }

  /**
   * Retrieve published skills for a portfolio owner (cached for 5 min).
   * @param userId   - Portfolio owner user ID
   * @param category - Optional category filter
   * @returns Resolved array of published skill documents
   */
  async getPublicSkills(userId: string, category?: string): Promise<ISkill[]> {
    const key = `${userId}:skills:${category ?? 'all'}`;
    const cached = portfolioCache.get<ISkill[]>(key);
    if (cached) return cached;
    const query: Record<string, unknown> = { userId, isPublished: true, isDeleted: false };
    if (category) query['category'] = category;
    const data = await Skill.find(query).sort({ category: 1, name: 1 });
    portfolioCache.cache(key, data, TTL);
    return data;
  }

  /**
   * Retrieve published experience entries for a portfolio owner (cached for 5 min), sorted by startDate descending.
   * @param userId - Portfolio owner user ID
   * @returns Resolved array of published experience documents
   */
  async getPublicExperience(userId: string): Promise<object[]> {
    const key = `${userId}:experience`;
    const cached = portfolioCache.get<object[]>(key);
    if (cached) return cached;

    const experiences = await Experience.find({ userId, isPublished: true, isDeleted: false }).sort({ startDate: -1 });

    // Join skills from junction table (supports both old and new records)
    const expIds = experiences.map((e) => e._id);
    const skillLinks = await ExperienceSkill.find({ experienceId: { $in: expIds } }).populate('skillId');
    const skillMap = new Map<string, object[]>();
    for (const link of skillLinks) {
      const key = link.experienceId.toString();
      if (!skillMap.has(key)) skillMap.set(key, []);
      const s = link.skillId as unknown as { toJSON?: () => object };
      skillMap.get(key)!.push(typeof s.toJSON === 'function' ? s.toJSON() : s);
    }

    const data = experiences.map((e) => {
      const json = e.toJSON() as unknown as Record<string, unknown>;
      json['skills'] = skillMap.get(e._id.toString()) ?? [];
      return json;
    });

    portfolioCache.cache(key, data, TTL);
    return data;
  }

  /**
   * Retrieve published projects for a portfolio owner (cached for 5 min).
   * @param userId   - Portfolio owner user ID
   * @param featured - When true, returns only featured projects
   * @returns Resolved array of published project documents
   */
  async getPublicProjects(userId: string, featured?: boolean): Promise<IProject[]> {
    const key = `${userId}:projects:${featured ? 'featured' : 'all'}`;
    const cached = portfolioCache.get<IProject[]>(key);
    if (cached) return cached;
    const query: Record<string, unknown> = { userId, isPublished: true, isDeleted: false };
    if (featured) query['isFeatured'] = true;
    const data = await Project.find(query).sort({ isFeatured: -1, displayOrder: 1 });
    portfolioCache.cache(key, data, TTL);
    return data;
  }

  /**
   * Retrieve published service offerings for a portfolio owner (cached for 5 min).
   * @param userId - Portfolio owner user ID
   * @returns Resolved array of published service documents
   */
  async getPublicServices(userId: string): Promise<IService[]> {
    const key = `${userId}:services`;
    const cached = portfolioCache.get<IService[]>(key);
    if (cached) return cached;
    const data = await Service.find({ userId, isPublished: true, isDeleted: false }).sort({ displayOrder: 1 });
    portfolioCache.cache(key, data, TTL);
    return data;
  }

  /**
   * Retrieve publicly visible contact fields for a portfolio owner (cached for 5 min).
   * Only fields with their corresponding *Public flag set to true are included.
   * @param userId - Portfolio owner user ID
   * @returns Object with public contact fields, or null if no contact record exists
   */
  async getPublicContact(userId: string): Promise<Record<string, unknown> | null> {
    const key = `${userId}:contact`;
    const cached = portfolioCache.get<Record<string, unknown>>(key);
    if (cached) return cached;
    const contact = await Contact.findOne({ userId, isDeleted: false });
    if (!contact) return null;
    const data: Record<string, unknown> = {
      email: contact.emailPublic ? contact.email : undefined,
      phone: contact.phonePublic ? contact.phone : undefined,
      linkedinUrl: contact.linkedinPublic ? contact.linkedinUrl : undefined,
      githubUrl: contact.githubPublic ? contact.githubUrl : undefined,
      twitterUrl: contact.twitterPublic ? contact.twitterUrl : undefined,
      websiteUrl: contact.websitePublic ? contact.websiteUrl : undefined,
    };
    portfolioCache.cache(key, data, TTL);
    return data;
  }

  /**
   * Aggregate all published portfolio sections into a single response object.
   * @param userId - Portfolio owner user ID
   * @returns Object containing profile, skills, experience, projects, services, and contact
   */
  async getFullPortfolio(userId: string): Promise<Record<string, unknown>> {
    const [profile, skills, experience, projects, services, contact] = await Promise.all([
      this.getPublicProfile(userId),
      this.getPublicSkills(userId),
      this.getPublicExperience(userId),
      this.getPublicProjects(userId),
      this.getPublicServices(userId),
      this.getPublicContact(userId),
    ]);
    return { profile, skills, experience, projects, services, contact };
  }
}
