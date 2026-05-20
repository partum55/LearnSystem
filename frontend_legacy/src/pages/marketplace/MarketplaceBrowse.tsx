import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Layout, Card, CardBody, Button, Input } from '../../components';
import { StaggeredList, StaggeredItem } from '../../components/animation';
import {
  browseMarketplace,
  MarketplacePlugin,
} from '../../api/marketplace';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';

const PLUGIN_TYPES = ['ACTIVITY', 'REPORT', 'BLOCK', 'INTEGRATION', 'THEME'] as const;
type PluginType = (typeof PLUGIN_TYPES)[number];

const TYPE_LABELS: Record<PluginType, string> = {
  ACTIVITY: 'Activity',
  REPORT: 'Report',
  BLOCK: 'Block',
  INTEGRATION: 'Integration',
  THEME: 'Theme',
};

const PAGE_SIZE = 12;

// --- Star Rating display component ---
const StarRating: React.FC<{ rating: number; count?: number }> = ({ rating, count }) => {
  const filled = Math.round(rating);
  return (
    <span
      className="flex items-center gap-1 text-sm"
      aria-label={`Rating: ${rating.toFixed(1)} out of 5`}
    >
      {Array.from({ length: 5 }, (_, i) => (
        <svg
          key={i}
          className="w-3.5 h-3.5 shrink-0"
          viewBox="0 0 20 20"
          fill={i < filled ? 'currentColor' : 'none'}
          stroke="currentColor"
          strokeWidth={i < filled ? 0 : 1.5}
          style={{ color: i < filled ? '#facc15' : 'var(--text-faint)' }}
          aria-hidden="true"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
      <span style={{ color: 'var(--text-muted)' }}>
        {rating.toFixed(1)}
        {count !== undefined && (
          <span style={{ color: 'var(--text-faint)' }}> ({count})</span>
        )}
      </span>
    </span>
  );
};

// --- Icon placeholder (first letter of plugin name) ---
const PluginIcon: React.FC<{ name: string; iconUrl?: string }> = ({ name, iconUrl }) => {
  const letter = name.charAt(0).toUpperCase();
  if (iconUrl) {
    return (
      <img
        src={iconUrl}
        alt={name}
        className="w-12 h-12 rounded-lg object-cover shrink-0"
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).style.display = 'none';
        }}
      />
    );
  }
  return (
    <div
      className="w-12 h-12 rounded-lg flex items-center justify-center shrink-0 text-xl font-bold select-none"
      style={{
        background: 'var(--bg-overlay)',
        color: 'var(--text-secondary)',
        fontFamily: 'var(--font-display)',
        border: '1px solid var(--border-default)',
      }}
      aria-hidden="true"
    >
      {letter}
    </div>
  );
};

// --- Skeleton card for loading state ---
const PluginCardSkeleton: React.FC = () => (
  <div
    className="card animate-pulse"
    style={{ minHeight: 180 }}
    aria-hidden="true"
  >
    <div className="card-body flex gap-4">
      <div
        className="w-12 h-12 rounded-lg shrink-0"
        style={{ background: 'var(--bg-overlay)' }}
      />
      <div className="flex-1 space-y-2 pt-1">
        <div className="h-4 rounded" style={{ background: 'var(--bg-overlay)', width: '60%' }} />
        <div className="h-3 rounded" style={{ background: 'var(--bg-overlay)', width: '40%' }} />
        <div className="h-3 rounded" style={{ background: 'var(--bg-overlay)', width: '90%' }} />
        <div className="h-3 rounded" style={{ background: 'var(--bg-overlay)', width: '75%' }} />
      </div>
    </div>
  </div>
);

// --- Individual plugin card ---
const PluginCard: React.FC<{ plugin: MarketplacePlugin; onClick: () => void }> = ({
  plugin,
  onClick,
}) => {
  const typeLower = plugin.type.toLowerCase();

  const typeBadgeStyle: React.CSSProperties = {
    fontSize: '0.7rem',
    padding: '2px 8px',
    borderRadius: 4,
    fontFamily: 'var(--font-body)',
    fontWeight: 600,
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
    border: '1px solid var(--border-default)',
    color: 'var(--text-secondary)',
    background: 'var(--bg-overlay)',
  };

  const formatDownloads = (n: number) => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
    return String(n);
  };

  return (
    <Card hoverable onClick={onClick} className="h-full">
      <CardBody>
        {/* Badges row */}
        <div className="flex gap-2 mb-3 flex-wrap">
          {plugin.isFeatured && (
            <span
              className="text-xs px-2 py-0.5 rounded font-semibold"
              style={{
                background: 'rgba(250, 204, 21, 0.12)',
                color: '#facc15',
                border: '1px solid rgba(250, 204, 21, 0.3)',
                fontSize: '0.7rem',
              }}
            >
              Featured
            </span>
          )}
          {plugin.isVerified && (
            <span
              className="text-xs px-2 py-0.5 rounded font-semibold flex items-center gap-1"
              style={{
                background: 'rgba(34, 197, 94, 0.1)',
                color: 'var(--fn-success)',
                border: '1px solid rgba(34, 197, 94, 0.25)',
                fontSize: '0.7rem',
              }}
            >
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
              Verified
            </span>
          )}
        </div>

        {/* Icon + name + author */}
        <div className="flex gap-3 items-start mb-3">
          <PluginIcon name={plugin.name} iconUrl={plugin.iconUrl} />
          <div className="flex-1 min-w-0">
            <h3
              className="font-semibold truncate leading-snug"
              style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}
            >
              {plugin.name}
            </h3>
            <p
              className="text-sm mt-0.5 truncate"
              style={{ color: 'var(--text-muted)' }}
            >
              by {plugin.author}
            </p>
            <span style={typeBadgeStyle} className="mt-1 inline-block">
              {typeLower}
            </span>
          </div>
        </div>

        {/* Description */}
        <p
          className="text-sm line-clamp-2 mb-4"
          style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}
        >
          {plugin.description}
        </p>

        {/* Rating + downloads */}
        <div className="flex items-center justify-between mt-auto pt-2" style={{ borderTop: '1px solid var(--border-subtle)' }}>
          <StarRating rating={plugin.averageRating} count={plugin.reviewCount} />
          <span className="text-xs" style={{ color: 'var(--text-faint)' }}>
            {formatDownloads(plugin.totalDownloads)} installs
          </span>
        </div>
      </CardBody>
    </Card>
  );
};

// --- Pagination controls ---
const Pagination: React.FC<{
  page: number;
  totalPages: number;
  onPageChange: (p: number) => void;
}> = ({ page, totalPages, onPageChange }) => {
  if (totalPages <= 1) return null;

  const pages: number[] = [];
  const start = Math.max(0, page - 2);
  const end = Math.min(totalPages - 1, page + 2);
  for (let i = start; i <= end; i++) pages.push(i);

  return (
    <nav
      className="flex items-center justify-center gap-1 mt-8"
      aria-label="Pagination"
    >
      <Button
        variant="secondary"
        size="sm"
        disabled={page === 0}
        onClick={() => onPageChange(page - 1)}
        aria-label="Previous page"
      >
        &laquo;
      </Button>
      {start > 0 && (
        <>
          <Button variant="secondary" size="sm" onClick={() => onPageChange(0)}>1</Button>
          {start > 1 && <span style={{ color: 'var(--text-faint)', padding: '0 4px' }}>…</span>}
        </>
      )}
      {pages.map((p) => (
        <Button
          key={p}
          variant={p === page ? 'primary' : 'secondary'}
          size="sm"
          onClick={() => onPageChange(p)}
          aria-current={p === page ? 'page' : undefined}
        >
          {p + 1}
        </Button>
      ))}
      {end < totalPages - 1 && (
        <>
          {end < totalPages - 2 && (
            <span style={{ color: 'var(--text-faint)', padding: '0 4px' }}>…</span>
          )}
          <Button variant="secondary" size="sm" onClick={() => onPageChange(totalPages - 1)}>
            {totalPages}
          </Button>
        </>
      )}
      <Button
        variant="secondary"
        size="sm"
        disabled={page >= totalPages - 1}
        onClick={() => onPageChange(page + 1)}
        aria-label="Next page"
      >
        &raquo;
      </Button>
    </nav>
  );
};

// --- Main page component ---
export const MarketplaceBrowse: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [searchInput, setSearchInput] = useState('');
  const [activeQuery, setActiveQuery] = useState('');
  const [activeType, setActiveType] = useState<PluginType | ''>('');
  const [page, setPage] = useState(0);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['marketplace', 'browse', { page, size: PAGE_SIZE, type: activeType, query: activeQuery }],
    queryFn: () =>
      browseMarketplace({
        page,
        size: PAGE_SIZE,
        type: activeType || undefined,
        query: activeQuery || undefined,
      }),
    placeholderData: (prev) => prev,
  });

  const handleSearch = useCallback(() => {
    setActiveQuery(searchInput.trim());
    setPage(0);
  }, [searchInput]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') handleSearch();
    },
    [handleSearch]
  );

  const handleTypeFilter = useCallback(
    (type: PluginType | '') => {
      setActiveType(type);
      setPage(0);
    },
    []
  );

  const handleCardClick = useCallback(
    (plugin: MarketplacePlugin) => {
      navigate(`/marketplace/${plugin.pluginId}`);
    },
    [navigate]
  );

  const plugins = data?.content ?? [];
  const totalPages = data?.totalPages ?? 0;
  const totalElements = data?.totalElements ?? 0;

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        {/* Page header */}
        <div className="mb-8">
          <h1
            className="text-3xl font-bold"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}
          >
            Plugin Marketplace
          </h1>
          <p className="mt-2" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
            Discover and install plugins to extend your LMS experience
          </p>
        </div>

        {/* Search + filters */}
        <Card className="mb-6">
          <CardBody>
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Search bar */}
              <div className="relative flex-1">
                <MagnifyingGlassIcon
                  className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 pointer-events-none"
                  style={{ color: 'var(--text-faint)' }}
                  aria-hidden="true"
                />
                <Input
                  type="search"
                  placeholder={t('common.search', 'Search plugins...')}
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="pl-10"
                  aria-label="Search plugins"
                />
              </div>
              <Button onClick={handleSearch} variant="primary">
                Search
              </Button>
            </div>

            {/* Type filter chips */}
            <div className="flex flex-wrap gap-2 mt-4" role="group" aria-label="Filter by plugin type">
              <Button
                size="sm"
                variant={activeType === '' ? 'primary' : 'secondary'}
                onClick={() => handleTypeFilter('')}
              >
                All Types
              </Button>
              {PLUGIN_TYPES.map((type) => (
                <Button
                  key={type}
                  size="sm"
                  variant={activeType === type ? 'primary' : 'secondary'}
                  onClick={() => handleTypeFilter(type)}
                  aria-pressed={activeType === type}
                >
                  {TYPE_LABELS[type]}
                </Button>
              ))}
            </div>
          </CardBody>
        </Card>

        {/* Results count */}
        {!isLoading && !isError && (
          <p
            className="text-sm mb-4"
            style={{ color: 'var(--text-faint)', fontFamily: 'var(--font-body)' }}
            aria-live="polite"
          >
            {totalElements} {totalElements === 1 ? 'plugin' : 'plugins'} found
            {activeQuery && (
              <> for &ldquo;<span style={{ color: 'var(--text-muted)' }}>{activeQuery}</span>&rdquo;</>
            )}
          </p>
        )}

        {/* Error state */}
        {isError && (
          <Card>
            <CardBody>
              <div className="text-center py-12">
                <p style={{ color: 'var(--fn-error)', fontFamily: 'var(--font-body)' }}>
                  Failed to load plugins. Please try again.
                </p>
                <Button
                  variant="secondary"
                  className="mt-4"
                  onClick={() => window.location.reload()}
                >
                  Retry
                </Button>
              </div>
            </CardBody>
          </Card>
        )}

        {/* Loading skeleton grid */}
        {isLoading && (
          <div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
            aria-busy="true"
            aria-label="Loading plugins"
          >
            {Array.from({ length: PAGE_SIZE }, (_, i) => (
              <PluginCardSkeleton key={i} />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !isError && plugins.length === 0 && (
          <Card>
            <CardBody>
              <div className="text-center py-16">
                <div
                  className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
                  style={{ background: 'var(--bg-overlay)' }}
                  aria-hidden="true"
                >
                  <MagnifyingGlassIcon className="w-8 h-8" style={{ color: 'var(--text-faint)' }} />
                </div>
                <p
                  className="text-lg font-medium"
                  style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-display)' }}
                >
                  No plugins found
                </p>
                <p
                  className="mt-2 text-sm"
                  style={{ color: 'var(--text-faint)', fontFamily: 'var(--font-body)' }}
                >
                  {activeQuery || activeType
                    ? 'Try adjusting your search or filters.'
                    : 'The marketplace has no plugins yet.'}
                </p>
                {(activeQuery || activeType) && (
                  <Button
                    variant="secondary"
                    className="mt-4"
                    onClick={() => {
                      setSearchInput('');
                      setActiveQuery('');
                      setActiveType('');
                      setPage(0);
                    }}
                  >
                    Clear filters
                  </Button>
                )}
              </div>
            </CardBody>
          </Card>
        )}

        {/* Plugin grid */}
        {!isLoading && !isError && plugins.length > 0 && (
          <StaggeredList className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {plugins.map((plugin) => (
              <StaggeredItem key={plugin.id}>
                <PluginCard plugin={plugin} onClick={() => handleCardClick(plugin)} />
              </StaggeredItem>
            ))}
          </StaggeredList>
        )}

        {/* Pagination */}
        {!isLoading && !isError && (
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        )}
      </div>
    </Layout>
  );
};

export default MarketplaceBrowse;
