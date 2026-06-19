import { MetadataRoute } from 'next';
import { fetchJobs } from '@/lib/api/server';

/**
 * Generates sitemap.xml for AI crawlers and search engines.
 * Includes static public pages and dynamic job postings.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://circle.optiminastic.com';

  // Static public pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${baseUrl}/careers`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/login`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
  ];

  // Dynamic job pages - fetch open jobs and include them
  let jobPages: MetadataRoute.Sitemap = [];
  try {
    const jobs = await fetchJobs();
    const openJobs = jobs.filter(j => j.status === 'Open');
    jobPages = openJobs.map(job => ({
      url: `${baseUrl}/jobs/${job.id}`,
      lastModified: new Date(job.updatedAt || job.createdAt),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    }));
  } catch (error) {
    // If fetching jobs fails, continue with static pages only
    console.error('Failed to fetch jobs for sitemap:', error);
  }

  return [...staticPages, ...jobPages];
}
