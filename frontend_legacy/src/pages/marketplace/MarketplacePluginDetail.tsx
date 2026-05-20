import React, { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Layout, Card, CardBody, Button } from '../../components';
import { TabTransition } from '../../components/animation';
import {
  getMarketplacePlugin,
  getPluginReviews,
  installMarketplacePlugin,
  PluginVersion,
  PluginReview,
} from '../../api/marketplace';
import { ArrowLeftIcon, CloudArrowDownIcon } from '@heroicons/react/24/outline';

// --- Tab definitions ---
type TabId = 'overview' | 'versions' | 'reviews';

const TABS: { id: TabId; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'versions', label: 'Versions' },
  { id: 'reviews', label: 'Reviews' },
];

// --- Helpers ---
const formatDate = (iso: string) => {
  try {
    return new Intl.DateTimeFormat('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
};

const formatBytes = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const formatDownloads = (n: number) => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
};

// --- Star rating display ---
const StarRating: React.FC<{ rating: number; size?: 'sm' | 'md' }> = ({
  rating,
  size = 'md',
}) => {
  const filled = Math.round(rating);
  const dim = size === 'sm' ? 'w-3.5 h-3.5' : 'w-5 h-5';
  return (
    <span
      className="flex items-center gap-1"
      aria-label={`Rating: ${rating.toFixed(1)} out of 5`}
    >
      {Array.from({ length: 5 }, (_, i) => (
        <svg
          key={i}
          className={`${dim} shrink-0`}
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
    </span>
  );
};

// --- Plugin icon ---
const PluginIcon: React.FC<{ name: string; iconUrl?: string; large?: boolean }> = ({
  name,
  iconUrl,
  large = false,
}) => {
  const size = large ? 'w-20 h-20 text-3xl rounded-2xl' : 'w-12 h-12 text-xl rounded-lg';
  const letter = name.charAt(0).toUpperCase();
  if (iconUrl) {
    return (
      <img
        src={iconUrl}
        alt={name}
        className={`${size} object-cover shrink-0`}
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).style.display = 'none';
        }}
      />
    );
  }
  return (
    <div
      className={`${size} flex items-center justify-center shrink-0 font-bold select-none`}
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

// --- Loading skeleton for header ---
const HeaderSkeleton: React.FC = () => (
  <div className="animate-pulse" aria-hidden="true">
    <div className="flex gap-5 items-start">
      <div
        className="w-20 h-20 rounded-2xl shrink-0"
        style={{ background: 'var(--bg-overlay)' }}
      />
      <div className="flex-1 space-y-3 pt-1">
        <div className="h-7 rounded" style={{ background: 'var(--bg-overlay)', width: '45%' }} />
        <div className="h-4 rounded" style={{ background: 'var(--bg-overlay)', width: '30%' }} />
        <div className="h-4 rounded" style={{ background: 'var(--bg-overlay)', width: '55%' }} />
      </div>
    </div>
  </div>
);

// --- Overview tab ---
const OverviewTab: React.FC<{ description: string }> = ({ description }) => (
  <div
    className="prose prose-invert max-w-none text-sm leading-relaxed"
    style={{
      color: 'var(--text-secondary)',
      fontFamily: 'var(--font-body)',
      whiteSpace: 'pre-wrap',
    }}
  >
    {description || (
      <span style={{ color: 'var(--text-faint)' }}>No description provided.</span>
    )}
  </div>
);

// --- Versions tab ---
const VersionsTab: React.FC<{ versions: PluginVersion[] }> = ({ versions }) => {
  if (versions.length === 0) {
    return (
      <p className="text-sm py-4" style={{ color: 'var(--text-faint)', fontFamily: 'var(--font-body)' }}>
        No version history available.
      </p>
    );
  }

  return (
    <ul className="space-y-4" role="list">
      {versions.map((v) => (
        <li
          key={v.id}
          className="rounded-lg p-4"
          style={{
            background: 'var(--bg-overlay)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
            <div className="flex items-center gap-2">
              <span
                className="font-mono font-semibold"
                style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-body)' }}
              >
                v{v.version}
              </span>
              {v.isLatest && (
                <span
                  className="text-xs px-2 py-0.5 rounded font-semibold"
                  style={{
                    background: 'rgba(34, 197, 94, 0.1)',
                    color: 'var(--fn-success)',
                    border: '1px solid rgba(34, 197, 94, 0.25)',
                  }}
                >
                  Latest
                </span>
              )}
            </div>
            <div className="flex items-center gap-4 text-sm" style={{ color: 'var(--text-faint)' }}>
              {v.fileSize !== undefined && (
                <span>{formatBytes(v.fileSize)}</span>
              )}
              <span>{formatDate(v.publishedAt)}</span>
            </div>
          </div>
          {v.changelog && (
            <p
              className="text-sm leading-relaxed mt-2"
              style={{
                color: 'var(--text-muted)',
                fontFamily: 'var(--font-body)',
                whiteSpace: 'pre-wrap',
              }}
            >
              {v.changelog}
            </p>
          )}
        </li>
      ))}
    </ul>
  );
};

// --- Reviews tab ---
const ReviewsTab: React.FC<{ pluginId: string }> = ({ pluginId }) => {
  const { data: reviews, isLoading, isError } = useQuery({
    queryKey: ['marketplace', 'reviews', pluginId],
    queryFn: () => getPluginReviews(pluginId),
    enabled: Boolean(pluginId),
  });

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse" aria-busy="true" aria-label="Loading reviews">
        {Array.from({ length: 3 }, (_, i) => (
          <div
            key={i}
            className="rounded-lg p-4"
            style={{ background: 'var(--bg-overlay)', border: '1px solid var(--border-subtle)', height: 88 }}
          />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <p className="text-sm py-4" style={{ color: 'var(--fn-error)', fontFamily: 'var(--font-body)' }}>
        Failed to load reviews.
      </p>
    );
  }

  const list: PluginReview[] = reviews ?? [];

  if (list.length === 0) {
    return (
      <p className="text-sm py-4" style={{ color: 'var(--text-faint)', fontFamily: 'var(--font-body)' }}>
        No reviews yet.
      </p>
    );
  }

  return (
    <ul className="space-y-4" role="list">
      {list.map((review) => (
        <li
          key={review.id}
          className="rounded-lg p-4"
          style={{
            background: 'var(--bg-overlay)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <div className="flex items-center justify-between flex-wrap gap-2 mb-1">
            <StarRating rating={review.rating} size="sm" />
            <span className="text-xs" style={{ color: 'var(--text-faint)' }}>
              {formatDate(review.createdAt)}
            </span>
          </div>
          {review.title && (
            <p
              className="font-medium text-sm mt-1"
              style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}
            >
              {review.title}
            </p>
          )}
          {review.body && (
            <p
              className="text-sm mt-1 leading-relaxed"
              style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}
            >
              {review.body}
            </p>
          )}
        </li>
      ))}
    </ul>
  );
};

// --- Main detail page ---
export const MarketplacePluginDetail: React.FC = () => {
  const { pluginId } = useParams<{ pluginId: string }>();
  const navigate = useNavigate();
  useTranslation();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [installSuccess, setInstallSuccess] = useState(false);

  const { data: plugin, isLoading, isError } = useQuery({
    queryKey: ['marketplace', 'plugin', pluginId],
    queryFn: () => getMarketplacePlugin(pluginId!),
    enabled: Boolean(pluginId),
  });

  const installMutation = useMutation({
    mutationFn: () => installMarketplacePlugin(pluginId!),
    onSuccess: () => {
      setInstallSuccess(true);
      void queryClient.invalidateQueries({ queryKey: ['marketplace', 'plugin', pluginId] });
    },
  });

  const handleInstall = useCallback(() => {
    setInstallSuccess(false);
    installMutation.mutate();
  }, [installMutation]);

  const handleBack = useCallback(() => {
    navigate('/marketplace');
  }, [navigate]);

  const typeLower = plugin?.type?.toLowerCase() ?? '';

  const metaItemStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  };

  const metaLabelStyle: React.CSSProperties = {
    fontSize: '0.7rem',
    textTransform: 'uppercase',
    letterSpacing: '0.07em',
    color: 'var(--text-faint)',
    fontFamily: 'var(--font-body)',
  };

  const metaValueStyle: React.CSSProperties = {
    fontSize: '0.9rem',
    color: 'var(--text-secondary)',
    fontFamily: 'var(--font-body)',
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        {/* Back button */}
        <Button
          variant="ghost"
          size="sm"
          className="mb-6 flex items-center gap-2"
          onClick={handleBack}
          aria-label="Back to marketplace"
        >
          <ArrowLeftIcon className="w-4 h-4" aria-hidden="true" />
          Back to Marketplace
        </Button>

        {/* Error state */}
        {isError && (
          <Card>
            <CardBody>
              <div className="text-center py-16">
                <p
                  className="text-lg font-medium mb-2"
                  style={{ color: 'var(--fn-error)', fontFamily: 'var(--font-display)' }}
                >
                  Plugin not found
                </p>
                <p
                  className="text-sm mb-6"
                  style={{ color: 'var(--text-faint)', fontFamily: 'var(--font-body)' }}
                >
                  This plugin may have been removed from the marketplace.
                </p>
                <Button variant="secondary" onClick={handleBack}>
                  Return to Marketplace
                </Button>
              </div>
            </CardBody>
          </Card>
        )}

        {/* Loading state */}
        {isLoading && (
          <Card className="mb-6">
            <CardBody>
              <HeaderSkeleton />
            </CardBody>
          </Card>
        )}

        {/* Plugin content */}
        {!isLoading && !isError && plugin && (
          <>
            {/* Header card */}
            <Card className="mb-6">
              <CardBody>
                <div className="flex flex-col sm:flex-row gap-5 items-start">
                  <PluginIcon name={plugin.name} iconUrl={plugin.iconUrl} large />

                  <div className="flex-1 min-w-0">
                    {/* Badges */}
                    <div className="flex flex-wrap gap-2 mb-2">
                      <span
                        className="text-xs px-2 py-0.5 rounded font-semibold uppercase tracking-wide"
                        style={{
                          background: 'var(--bg-active)',
                          color: 'var(--text-secondary)',
                          border: '1px solid var(--border-default)',
                          fontSize: '0.7rem',
                        }}
                      >
                        {typeLower}
                      </span>
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
                    </div>

                    {/* Name */}
                    <h1
                      className="text-2xl font-bold leading-tight"
                      style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}
                    >
                      {plugin.name}
                    </h1>

                    {/* Author */}
                    <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
                      by{' '}
                      {plugin.authorUrl ? (
                        <a
                          href={plugin.authorUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: 'var(--text-secondary)', textDecoration: 'underline' }}
                        >
                          {plugin.author}
                        </a>
                      ) : (
                        plugin.author
                      )}
                    </p>

                    {/* Rating + downloads row */}
                    <div className="flex flex-wrap items-center gap-4 mt-3">
                      <StarRating rating={plugin.averageRating} />
                      <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
                        {plugin.reviewCount} {plugin.reviewCount === 1 ? 'review' : 'reviews'}
                      </span>
                      <span
                        className="flex items-center gap-1 text-sm"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        <CloudArrowDownIcon className="w-4 h-4" aria-hidden="true" />
                        {formatDownloads(plugin.totalDownloads)} installs
                      </span>
                    </div>

                    {/* Meta row */}
                    <div className="flex flex-wrap gap-6 mt-4 pt-4" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                      {plugin.latestVersion && (
                        <div style={metaItemStyle}>
                          <span style={metaLabelStyle}>Version</span>
                          <span style={metaValueStyle}>v{plugin.latestVersion}</span>
                        </div>
                      )}
                      {plugin.category && (
                        <div style={metaItemStyle}>
                          <span style={metaLabelStyle}>Category</span>
                          <span style={metaValueStyle}>{plugin.category}</span>
                        </div>
                      )}
                      {(plugin as { minLmsVersion?: string }).minLmsVersion && (
                        <div style={metaItemStyle}>
                          <span style={metaLabelStyle}>Min LMS</span>
                          <span style={metaValueStyle}>{(plugin as { minLmsVersion?: string }).minLmsVersion}</span>
                        </div>
                      )}
                      {plugin.homepageUrl && (
                        <div style={metaItemStyle}>
                          <span style={metaLabelStyle}>Homepage</span>
                          <a
                            href={plugin.homepageUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ ...metaValueStyle, textDecoration: 'underline' }}
                          >
                            Visit
                          </a>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Install button */}
                  <div className="shrink-0 self-start">
                    {installSuccess ? (
                      <div
                        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold"
                        style={{
                          background: 'rgba(34, 197, 94, 0.12)',
                          color: 'var(--fn-success)',
                          border: '1px solid rgba(34, 197, 94, 0.3)',
                          fontFamily: 'var(--font-body)',
                        }}
                        role="status"
                        aria-live="polite"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                        Installed
                      </div>
                    ) : (
                      <Button
                        variant="primary"
                        isLoading={installMutation.isPending}
                        onClick={handleInstall}
                        disabled={installMutation.isPending}
                        aria-label={`Install ${plugin.name}`}
                      >
                        {installMutation.isPending ? 'Installing...' : 'Install'}
                      </Button>
                    )}
                    {installMutation.isError && (
                      <p
                        className="text-xs mt-2 text-center"
                        style={{ color: 'var(--fn-error)', fontFamily: 'var(--font-body)' }}
                        role="alert"
                      >
                        Installation failed. Try again.
                      </p>
                    )}
                  </div>
                </div>
              </CardBody>
            </Card>

            {/* Tabs */}
            <Card>
              {/* Tab bar */}
              <div
                className="flex border-b"
                style={{ borderColor: 'var(--border-default)' }}
                role="tablist"
                aria-label="Plugin details tabs"
              >
                {TABS.map((tab) => {
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      role="tab"
                      aria-selected={isActive}
                      aria-controls={`tabpanel-${tab.id}`}
                      id={`tab-${tab.id}`}
                      onClick={() => setActiveTab(tab.id)}
                      className="px-5 py-3 text-sm font-medium transition-colors relative"
                      style={{
                        color: isActive ? 'var(--text-primary)' : 'var(--text-faint)',
                        fontFamily: 'var(--font-body)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        borderBottom: isActive
                          ? '2px solid var(--text-primary)'
                          : '2px solid transparent',
                        marginBottom: -1,
                        outline: 'none',
                      }}
                      onFocus={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.outline = '2px solid var(--text-muted)';
                        (e.currentTarget as HTMLButtonElement).style.outlineOffset = '-2px';
                      }}
                      onBlur={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.outline = 'none';
                      }}
                    >
                      {tab.label}
                      {tab.id === 'reviews' && plugin.reviewCount > 0 && (
                        <span
                          className="ml-2 text-xs px-1.5 py-0.5 rounded-full"
                          style={{
                            background: 'var(--bg-overlay)',
                            color: 'var(--text-faint)',
                          }}
                        >
                          {plugin.reviewCount}
                        </span>
                      )}
                      {tab.id === 'versions' && plugin.versions && plugin.versions.length > 0 && (
                        <span
                          className="ml-2 text-xs px-1.5 py-0.5 rounded-full"
                          style={{
                            background: 'var(--bg-overlay)',
                            color: 'var(--text-faint)',
                          }}
                        >
                          {plugin.versions.length}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Tab panels */}
              <CardBody>
                <div
                  id="tabpanel-overview"
                  role="tabpanel"
                  aria-labelledby="tab-overview"
                  hidden={activeTab !== 'overview'}
                >
                  {activeTab === 'overview' && (
                    <TabTransition tabKey="overview">
                      <OverviewTab description={plugin.description} />
                    </TabTransition>
                  )}
                </div>
                <div
                  id="tabpanel-versions"
                  role="tabpanel"
                  aria-labelledby="tab-versions"
                  hidden={activeTab !== 'versions'}
                >
                  {activeTab === 'versions' && (
                    <TabTransition tabKey="versions">
                      <VersionsTab versions={plugin.versions ?? []} />
                    </TabTransition>
                  )}
                </div>
                <div
                  id="tabpanel-reviews"
                  role="tabpanel"
                  aria-labelledby="tab-reviews"
                  hidden={activeTab !== 'reviews'}
                >
                  {activeTab === 'reviews' && (
                    <TabTransition tabKey="reviews">
                      <ReviewsTab pluginId={plugin.pluginId} />
                    </TabTransition>
                  )}
                </div>
              </CardBody>
            </Card>
          </>
        )}
      </div>
    </Layout>
  );
};

export default MarketplacePluginDetail;
