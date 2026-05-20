'use client';
import { use } from 'react';
import MarketplacePluginDetail from '@/features/marketplace/views/marketplace/MarketplacePluginDetail';
export default function Page({ params }: { params: Promise<{ pluginId: string }> }) {
  const resolvedParams = use(params);
}
