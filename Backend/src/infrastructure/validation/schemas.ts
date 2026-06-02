import Joi from 'joi';
import { SkillCategory } from '../database/models/Skill';
import { EmploymentType } from '../database/models/Experience';
import { ProjectStatus } from '../database/models/Project';

// ─── Profile Schemas ──────────────────────────────────────────────────────────

export const profileUpdateSchema = Joi.object({
  firstName: Joi.string().max(100).optional(),
  lastName: Joi.string().max(100).optional(),
  tagline: Joi.string().max(200).allow('').optional(),
  bio: Joi.string().max(5000).allow('').optional(),
  location: Joi.object({
    city: Joi.string().max(100).allow('').optional(),
    state: Joi.string().max(100).allow('').optional(),
    country: Joi.string().max(100).allow('').optional(),
  }).optional(),
  profileImageUrl: Joi.string().uri().allow('').optional(),
  email: Joi.string().email({ tlds: { allow: false } }).allow('').optional(),
  phone: Joi.string().max(30).allow('').optional(),
  linkedinUrl: Joi.string().uri().allow('').optional(),
  githubUrl: Joi.string().uri().allow('').optional(),
  isPublished: Joi.boolean().optional(),
});

export const publishProfileSchema = Joi.object({
  isPublished: Joi.boolean().required(),
});

// ─── Skill Schemas ────────────────────────────────────────────────────────────

export const createSkillSchema = Joi.object({
  name: Joi.string().min(1).max(100).required(),
  category: Joi.string().valid(...Object.values(SkillCategory)).required(),
  proficiencyLevel: Joi.number().integer().min(1).max(5).required(),
  endorsementCount: Joi.number().integer().min(0).optional(),
  isPublished: Joi.boolean().optional(),
});

export const updateSkillSchema = Joi.object({
  name: Joi.string().min(1).max(100).optional(),
  category: Joi.string().valid(...Object.values(SkillCategory)).optional(),
  proficiencyLevel: Joi.number().integer().min(1).max(5).optional(),
  endorsementCount: Joi.number().integer().min(0).optional(),
  isPublished: Joi.boolean().optional(),
});

// ─── Experience Schemas ───────────────────────────────────────────────────────

export const createExperienceSchema = Joi.object({
  company: Joi.string().min(1).max(200).required(),
  jobTitle: Joi.string().min(1).max(200).required(),
  employmentType: Joi.string().valid(...Object.values(EmploymentType)).required(),
  location: Joi.string().max(200).allow('').optional(),
  startDate: Joi.date().iso().required(),
  endDate: Joi.date().iso().min(Joi.ref('startDate')).optional(),
  isCurrentPosition: Joi.boolean().optional(),
  description: Joi.string().max(5000).allow('').optional(),
  isPublished: Joi.boolean().optional(),
});

export const updateExperienceSchema = Joi.object({
  company: Joi.string().min(1).max(200).optional(),
  jobTitle: Joi.string().min(1).max(200).optional(),
  employmentType: Joi.string().valid(...Object.values(EmploymentType)).optional(),
  location: Joi.string().max(200).allow('').optional(),
  startDate: Joi.date().iso().optional(),
  endDate: Joi.date().iso().optional(),
  isCurrentPosition: Joi.boolean().optional(),
  description: Joi.string().max(5000).allow('').optional(),
  isPublished: Joi.boolean().optional(),
});

export const setSkillsSchema = Joi.object({
  skillIds: Joi.array().items(Joi.string().length(24)).required(),
});

// ─── Project Schemas ──────────────────────────────────────────────────────────

export const createProjectSchema = Joi.object({
  name: Joi.string().min(1).max(200).required(),
  description: Joi.string().max(10000).allow('').optional(),
  shortDescription: Joi.string().max(500).allow('').optional(),
  status: Joi.string().valid(...Object.values(ProjectStatus)).optional(),
  startDate: Joi.date().iso().optional(),
  endDate: Joi.date().iso().optional(),
  projectUrl: Joi.string().uri().allow('').optional(),
  githubUrl: Joi.string().uri().allow('').optional(),
  images: Joi.array().items(Joi.string().uri()).optional(),
  isFeatured: Joi.boolean().optional(),
  displayOrder: Joi.number().integer().min(0).optional(),
  isPublished: Joi.boolean().optional(),
});

export const updateProjectSchema = Joi.object({
  name: Joi.string().min(1).max(200).optional(),
  description: Joi.string().max(10000).allow('').optional(),
  shortDescription: Joi.string().max(500).allow('').optional(),
  status: Joi.string().valid(...Object.values(ProjectStatus)).optional(),
  startDate: Joi.date().iso().optional(),
  endDate: Joi.date().iso().optional(),
  projectUrl: Joi.string().uri().allow('').optional(),
  githubUrl: Joi.string().uri().allow('').optional(),
  images: Joi.array().items(Joi.string().uri()).optional(),
  isFeatured: Joi.boolean().optional(),
  displayOrder: Joi.number().integer().min(0).optional(),
  isPublished: Joi.boolean().optional(),
});

export const setFeaturedSchema = Joi.object({
  isFeatured: Joi.boolean().required(),
});
