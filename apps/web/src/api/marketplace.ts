import apiClient from './client';

export interface MarketplacePlugin {
  id: string;
  pluginId: string;
  name: string;
  description: string;
  author: string;
  authorUrl?: string;
  type: string;
  category?: string;
  iconUrl?: string;
  homepageUrl?: string;
  isVerified: boolean;
  isFeatured: boolean;
  totalDownloads: number;
  averageRating: number;
  reviewCount: number;
  latestVersion?: string;
  createdAt: string;
}

export interface MarketplacePluginDetail extends MarketplacePlugin {
  versions: PluginVersion[];
  repositoryUrl?: string;
  minLmsVersion?: string;
}

export interface PluginVersion {
  id: string;
  version: string;
  changelog?: string;
  downloadUrl: string;
  fileSize?: number;
  isLatest: boolean;
  publishedAt: string;
}

export interface PluginReview {
  id: string;
  userId: string;
  rating: number;
  title?: string;
  body?: string;
  createdAt: string;
}

export interface MarketplacePage {
  content: MarketplacePlugin[];
  totalElements: number;
  totalPages: number;
  number: number;
}

export async function browseMarketplace(params: {
  page?: number;
  size?: number;
  type?: string;
  category?: string;
  query?: string;
}): Promise<MarketplacePage> {
  const { data } = await apiClient.get<MarketplacePage>('/marketplace/plugins', { params });
  return data;
}

export async function getMarketplacePlugin(pluginId: string): Promise<MarketplacePluginDetail> {
  const { data } = await apiClient.get<MarketplacePluginDetail>(`/marketplace/plugins/${pluginId}`);
  return data;
}

export async function getPluginVersions(pluginId: string): Promise<PluginVersion[]> {
  const { data } = await apiClient.get<PluginVersion[]>(`/marketplace/plugins/${pluginId}/versions`);
  return data;
}

export async function getPluginReviews(pluginId: string): Promise<PluginReview[]> {
  const { data } = await apiClient.get<PluginReview[]>(`/marketplace/plugins/${pluginId}/reviews`);
  return data;
}

export async function submitReview(
  pluginId: string,
  review: { rating: number; title?: string; body?: string }
): Promise<void> {
  await apiClient.post(`/marketplace/plugins/${pluginId}/reviews`, review);
}

export async function getCategories(): Promise<string[]> {
  const { data } = await apiClient.get<string[]>('/marketplace/categories');
  return data;
}

export async function installMarketplacePlugin(pluginId: string): Promise<void> {
  await apiClient.post(`/plugins/install`, { marketplacePluginId: pluginId });
}
