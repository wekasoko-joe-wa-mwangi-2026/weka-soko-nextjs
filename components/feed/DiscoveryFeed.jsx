'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { fmtKES } from '@/lib/utils';
import { Ic } from '@/components/ui/primitives';
import Image from 'next/image';

// Discovery Feed - TikTok-style vertical swipe experience
export default function DiscoveryFeed({ listings, onListingClick, onLike, onChat, onShare, savedIds }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [likedListings, setLikedListings] = useState(new Set());
  const containerRef = useRef(null);
  const [isScrolling, setIsScrolling] = useState(false);

  // Intersection Observer to track active card
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = parseInt(entry.target.dataset.index);
            setActiveIndex(index);
          }
        });
      },
      {
        root: container,
        threshold: 0.5,
      }
    );

    const cards = container.querySelectorAll('.feed-card');
    cards.forEach((card) => observer.observe(card));

    return () => observer.disconnect();
  }, [listings]);

  // Handle like
  const handleLike = useCallback((e, listing) => {
    e.stopPropagation();
    const newLiked = new Set(likedListings);
    if (newLiked.has(listing.id)) {
      newLiked.delete(listing.id);
    } else {
      newLiked.add(listing.id);
    }
    setLikedListings(newLiked);
    onLike?.(listing);
  }, [likedListings, onLike]);

  // Handle chat
  const handleChat = useCallback((e, listing) => {
    e.stopPropagation();
    onChat?.(listing);
  }, [onChat]);

  // Handle share
  const handleShare = useCallback((e, listing) => {
    e.stopPropagation();
    onShare?.(listing);
  }, [onShare]);

  if (!listings || listings.length === 0) {
    return (
      <div style={styles.empty}>
        <div style={styles.emptyIcon}>📦</div>
        <div style={styles.emptyText}>No listings to discover</div>
        <div style={styles.emptySubtext}>Check back later for new items!</div>
      </div>
    );
  }

  return (
    <div ref={containerRef} style={styles.container}>
      {listings.map((listing, index) => (
        <FeedCard
          key={listing.id}
          listing={listing}
          index={index}
          isActive={index === activeIndex}
          isLiked={likedListings.has(listing.id)}
          onLike={handleLike}
          onChat={handleChat}
          onShare={handleShare}
          onClick={() => onListingClick?.(listing)}
        />
      ))}
    </div>
  );
}

// Individual feed card
function FeedCard({ listing, index, isActive, isLiked, onLike, onChat, onShare, onClick }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const cardRef = useRef(null);
  const photo = listing.photos?.[0]?.url || listing.photos?.[0] || null;
  const isNew = Date.now() - new Date(listing.created_at) < 12 * 3600000;
  const viewers = Math.floor(Math.random() * 15) + 2;

  // Staggered entrance animation
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, index * 100); // 100ms stagger
    return () => clearTimeout(timer);
  }, [index]);

  // Determine badge type
  const getBadge = () => {
    if (listing.view_count > 50) return { text: '🔥 Trending', color: '#ef4444' };
    if (listing.interest_count > 5) return { text: '⚡ Fast Moving', color: '#f59e0b' };
    if (isNew) return { text: '✨ New', color: '#10b981' };
    return null;
  };
  const badge = getBadge();

  return (
    <div
      ref={cardRef}
      className="feed-card"
      data-index={index}
      style={{
        ...styles.card,
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(20px)',
        transition: 'opacity 0.5s cubic-bezier(0.34, 1.56, 0.64, 1), transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
      }}
      onClick={onClick}
    >
      {/* Background Image with blur-to-clear effect */}
      <div style={styles.imageContainer}>
        {photo ? (
          <>
            {/* Blurred placeholder */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(135deg, #1428A0 0%, #0F1F8A 100%)',
                filter: imageLoaded ? 'blur(0px)' : 'blur(20px)',
                opacity: imageLoaded ? 0 : 1,
                transition: 'opacity 0.5s ease, filter 0.5s ease',
              }}
            />
            <Image
              src={photo}
              alt={listing.title}
              fill
              style={{
                objectFit: 'cover',
                opacity: imageLoaded ? 1 : 0,
                transition: 'opacity 0.5s ease',
              }}
              priority={index < 3}
              onLoad={() => setImageLoaded(true)}
            />
          </>
        ) : (
          <div style={styles.noImage}>
            <span style={styles.noImageText}>{listing.category}</span>
          </div>
        )}
        {/* Gradient overlay */}
        <div style={styles.gradient} />
      </div>

      {/* Top overlay - Viewers badge and dynamic badges */}
      <div style={styles.topOverlay}>
        <div className="viewers-badge" style={styles.viewersBadge}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 4 }}>
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
          {viewers} viewing
        </div>
        {badge && (
          <div style={{
            ...styles.statusBadge,
            background: badge.color,
          }}>
            {badge.text}
          </div>
        )}
      </div>

      {/* Right side floating actions */}
      <div style={styles.floatingActions}>
        <FloatingActionButton
          icon={isLiked ? '❤️' : '🤍'}
          label={isLiked ? 'Liked' : 'Like'}
          isActive={isLiked}
          onClick={(e) => onLike(e, listing)}
          color="#E8194B"
        />
        <FloatingActionButton
          icon="💬"
          label={listing.message_count || 'Chat'}
          onClick={(e) => onChat(e, listing)}
        />
        <FloatingActionButton
          icon="↗️"
          label="Share"
          onClick={(e) => onShare(e, listing)}
        />
      </div>

      {/* Bottom sheet - Product info */}
      <div
        style={{
          ...styles.bottomSheet,
          height: isExpanded ? '85%' : '35%',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div
          style={styles.dragHandle}
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div style={styles.dragBar} />
        </div>

        {/* Content */}
        <div style={styles.sheetContent}>
          {/* Category & Location */}
          <div style={styles.metaRow}>
            <span style={styles.category}>{listing.category}</span>
            <span style={styles.dot}>•</span>
            <span style={styles.location}>{listing.location || 'Nairobi'}</span>
          </div>

          {/* Title */}
          <h2 style={styles.title}>{listing.title}</h2>

          {/* Price */}
          <div style={styles.priceRow}>
            <span style={styles.price}>{fmtKES(listing.price)}</span>
            {listing.negotiable && (
              <span style={styles.negotiable}>Negotiable</span>
            )}
          </div>

          {/* Description (visible when expanded) */}
          {isExpanded && (
            <div style={styles.description}>
              <p style={styles.descText}>{listing.description}</p>

              {/* Seller info */}
              <div style={styles.sellerInfo}>
                <div style={styles.sellerAvatar}>
                  {listing.seller?.name?.[0] || 'S'}
                </div>
                <div style={styles.sellerMeta}>
                  <div style={styles.sellerName}>{listing.seller?.name || 'Seller'}</div>
                  <div style={styles.sellerRating}>
                    ⭐ {listing.seller?.rating || '4.5'} • {listing.seller?.sales || '12'} sales
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div style={styles.stats}>
                <div style={styles.stat}>
                  <span style={styles.statValue}>{listing.view_count || 0}</span>
                  <span style={styles.statLabel}>views</span>
                </div>
                <div style={styles.stat}>
                  <span style={styles.statValue}>{listing.interest_count || 0}</span>
                  <span style={styles.statLabel}>interested</span>
                </div>
                <div style={styles.stat}>
                  <span style={styles.statValue}>{new Date(listing.created_at).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' })}</span>
                  <span style={styles.statLabel}>posted</span>
                </div>
              </div>

              {/* CTA Button */}
              <button style={styles.ctaButton}>
                Make Offer
              </button>

              {/* Swipe hint */}
              <div style={styles.swipeHint}>
                <span>Swipe up for more details ↓</span>
              </div>
            </div>
          )}

          {!isExpanded && (
            <div style={styles.previewHint}>
              <span style={styles.hintText}>Tap to view details</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Floating action button
function FloatingActionButton({ icon, label, isActive, onClick, color }) {
  return (
    <button
      className="floating-action"
      style={{
        ...styles.fab,
        background: isActive ? color || '#fff' : 'rgba(255,255,255,0.95)',
        color: isActive ? '#fff' : '#000',
      }}
      onClick={onClick}
    >
      <span style={styles.fabIcon}>{icon}</span>
      <span style={styles.fabLabel}>{label}</span>
    </button>
  );
}

// Styles
const styles = {
  container: {
    height: '100vh',
    overflowY: 'scroll',
    scrollSnapType: 'y mandatory',
    scrollBehavior: 'smooth',
    WebkitOverflowScrolling: 'touch',
  },
  card: {
    height: '100vh',
    width: '100%',
    position: 'relative',
    scrollSnapAlign: 'start',
    scrollSnapStop: 'always',
    overflow: 'hidden',
  },
  imageContainer: {
    position: 'absolute',
    inset: 0,
    background: '#000',
  },
  gradient: {
    position: 'absolute',
    inset: 0,
    background: 'linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0) 40%, rgba(0,0,0,0.6) 100%)',
    pointerEvents: 'none',
  },
  noImage: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #1428A0 0%, #0F1F8A 100%)',
  },
  noImageText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 700,
    opacity: 0.8,
  },
  topOverlay: {
    position: 'absolute',
    top: 60,
    left: 16,
    right: 16,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 10,
  },
  viewersBadge: {
    background: 'rgba(0,0,0,0.6)',
    backdropFilter: 'blur(8px)',
    borderRadius: 20,
    padding: '6px 12px',
    display: 'flex',
    alignItems: 'center',
    fontSize: 12,
    fontWeight: 600,
    color: '#fff',
  },
  newBadge: {
    background: '#10b981',
    color: '#fff',
    fontSize: 11,
    fontWeight: 800,
    padding: '5px 12px',
    borderRadius: 6,
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
    boxShadow: '0 4px 12px rgba(16,185,129,0.3)',
  },
  statusBadge: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 700,
    padding: '6px 12px',
    borderRadius: 20,
    letterSpacing: '0.02em',
    boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
    animation: 'pulse-soft 2s ease-in-out infinite',
  },
  floatingActions: {
    position: 'absolute',
    right: 16,
    bottom: '40%',
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
    zIndex: 10,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: '50%',
    border: 'none',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
    transition: 'transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275), box-shadow 0.2s ease',
  },
  fabIcon: {
    fontSize: 22,
    lineHeight: 1,
  },
  fabLabel: {
    fontSize: 10,
    fontWeight: 600,
    marginTop: 2,
    opacity: 0.9,
  },
  bottomSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    background: 'rgba(255,255,255,0.95)',
    backdropFilter: 'blur(20px)',
    borderRadius: '24px 24px 0 0',
    transition: 'height 0.4s cubic-bezier(0.23, 1, 0.32, 1)',
    overflow: 'hidden',
    zIndex: 20,
  },
  dragHandle: {
    width: '100%',
    height: 40,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  dragBar: {
    width: 40,
    height: 4,
    background: 'rgba(0,0,0,0.2)',
    borderRadius: 2,
  },
  sheetContent: {
    padding: '0 24px 24px',
    overflowY: 'auto',
    height: 'calc(100% - 40px)',
  },
  metaRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
    fontSize: 12,
  },
  category: {
    color: '#1428A0',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  dot: {
    color: '#9CA3AF',
  },
  location: {
    color: '#6B7280',
  },
  title: {
    fontSize: 22,
    fontWeight: 800,
    lineHeight: 1.3,
    color: '#111827',
    margin: '0 0 12px',
    letterSpacing: '-0.02em',
  },
  priceRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  price: {
    fontSize: 28,
    fontWeight: 900,
    color: '#1428A0',
    letterSpacing: '-0.02em',
  },
  negotiable: {
    fontSize: 12,
    color: '#6B7280',
    background: '#F3F4F6',
    padding: '4px 10px',
    borderRadius: 20,
    fontWeight: 600,
  },
  description: {
    animation: 'fadeIn 0.3s ease',
  },
  descText: {
    fontSize: 14,
    lineHeight: 1.7,
    color: '#374151',
    marginBottom: 20,
  },
  sellerInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '16px 0',
    borderTop: '1px solid #E5E7EB',
    borderBottom: '1px solid #E5E7EB',
    marginBottom: 16,
  },
  sellerAvatar: {
    width: 44,
    height: 44,
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #1428A0 0%, #0F1F8A 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    fontWeight: 700,
    fontSize: 16,
  },
  sellerMeta: {
    flex: 1,
  },
  sellerName: {
    fontWeight: 700,
    color: '#111827',
    marginBottom: 2,
  },
  sellerRating: {
    fontSize: 13,
    color: '#6B7280',
  },
  stats: {
    display: 'flex',
    gap: 24,
    marginBottom: 20,
  },
  stat: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 800,
    color: '#111827',
  },
  statLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  ctaButton: {
    width: '100%',
    padding: '16px 24px',
    background: '#1428A0',
    color: '#fff',
    border: 'none',
    borderRadius: 12,
    fontSize: 16,
    fontWeight: 700,
    cursor: 'pointer',
    marginBottom: 16,
    boxShadow: '0 4px 14px rgba(20,40,160,0.3)',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
  },
  swipeHint: {
    textAlign: 'center',
    color: '#9CA3AF',
    fontSize: 12,
    padding: '8px 0',
  },
  previewHint: {
    textAlign: 'center',
    padding: '12px 0',
  },
  hintText: {
    color: '#9CA3AF',
    fontSize: 13,
    fontWeight: 500,
  },
  empty: {
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    padding: 24,
  },
  emptyIcon: {
    fontSize: 64,
    opacity: 0.5,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 700,
    color: '#374151',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },
};
