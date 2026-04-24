/**
 * Weka Soko — Component Barrel
 *
 * This file re-exports every component from the modular structure below.
 * All existing imports across the app (HomeClient, dashboard, listings, sold)
 * continue to work without any changes.
 *
 * Structure:
 *   components/ui/           — Primitives, icons, atoms
 *   components/auth/         — Auth modals & flows
 *   components/listings/     — Listing cards, detail, post ad, share
 *   components/payments/     — M-Pesa pay modal
 *   components/chat/         — Chat modal
 *   components/requests/     — Buyer requests & pitches
 *   components/sold/         — Sold items
 *   components/dashboard/    — Dashboard tabs, reviews, profile
 *   components/layout/       — Mobile layout, swipe feed, pages
 */

export { api, WekaSokoLogo, Ic, urlBase64ToUint8Array, useAudioNotification, Spin, Skeleton, SkeletonCard, SkeletonListRow, useRipple, HeartBtn, TERMS, timeLeft, lastSeen, checkContactInfo } from '@/components/ui/primitives';
export { Toast, Modal, FF, Counter, compressImage, ImageUploader } from '@/components/ui/core';
export { TermsModal, PasswordField, ForgotPasswordPanel, ResetPasswordModal, WatermarkedImage, Lightbox, AuthModal } from '@/components/auth/AuthModal';
export { ShareModal } from '@/components/listings/ShareModal';
export { PayModal } from '@/components/payments/PayModal';
export { ChatModal } from '@/components/chat/ChatModal';
export { PostAdModal, ListingCardSkeleton, HeroSkeleton, ListingCard, LeaveReviewBtn, ReportListingBtn, DetailModal, MarkSoldModal } from '@/components/listings/ListingComponents';
export { RoleSwitcher, PostRequestModal, RequestDetailModal, RequestCard, WhatBuyersWant } from '@/components/requests/RequestComponents';
export { SoldCard, SoldSection } from '@/components/sold/SoldComponents';
export { StarPicker, ReviewsSection } from '@/components/dashboard/ReviewsSection';
export { MyRequestsTab, PitchesTab, ProfileSection, PasswordSection, VerificationSection, MobileDashboard, Dashboard, Pager } from '@/components/dashboard/Dashboard';
export { MobileRequestsTab, MobileLayout, ReportListingModal, SwipeFeed, HotRightNow, AllListingsPage, SoldPage, BuyersWantPage } from '@/components/layout/AppLayout';
