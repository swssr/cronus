import React from 'react';
import { motion } from 'framer-motion';

interface SkeletonLoaderProps {
  type: 'text' | 'button' | 'card' | 'file-list';
  count?: number;
  className?: string;
}

export function SkeletonLoader({ type, count = 1, className = '' }: SkeletonLoaderProps) {
  const renderSkeleton = () => {
    switch (type) {
      case 'text':
        return <div className={`skeleton skeleton-text ${className}`} />;
      case 'button':
        return <div className={`skeleton skeleton-button ${className}`} />;
      case 'card':
        return <div className={`skeleton skeleton-card ${className}`} />;
      case 'file-list':
        return (
          <div className="file-item-skeleton">
            <div className="skeleton file-icon-skeleton" />
            <div className="file-info-skeleton">
              <div className="skeleton skeleton-text large" style={{ width: '60%' }} />
              <div className="skeleton skeleton-text small" style={{ width: '40%' }} />
            </div>
          </div>
        );
      default:
        return <div className={`skeleton ${className}`} />;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      {Array.from({ length: count }, (_, index) => (
        <div key={index} style={{ marginBottom: type === 'file-list' ? '0.5rem' : '0' }}>
          {renderSkeleton()}
        </div>
      ))}
    </motion.div>
  );
}

interface EnhancedSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

export function EnhancedSpinner({ size = 'medium', className = '' }: EnhancedSpinnerProps) {
  const sizeClasses = {
    small: 'w-6 h-6',
    medium: 'w-12 h-12',
    large: 'w-16 h-16'
  };

  return (
    <motion.div
      className={`loading-spinner ${sizeClasses[size]} ${className}`}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ duration: 0.3 }}
    />
  );
}

interface LoadingStateProps {
  type: 'spinner' | 'skeleton';
  message?: string;
  skeletonType?: 'text' | 'button' | 'card' | 'file-list';
  skeletonCount?: number;
  className?: string;
}

export function LoadingState({ 
  type, 
  message = 'Loading...', 
  skeletonType = 'text',
  skeletonCount = 3,
  className = '' 
}: LoadingStateProps) {
  return (
    <motion.div
      className={`flex flex-col items-center justify-center min-h-[300px] ${className}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.4 }}
    >
      {type === 'spinner' ? (
        <>
          <EnhancedSpinner />
          <motion.p
            className="text-tertiary mt-4 animate-pulse"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            {message}
          </motion.p>
        </>
      ) : (
        <div className="w-full max-w-md">
          <SkeletonLoader type={skeletonType} count={skeletonCount} />
        </div>
      )}
    </motion.div>
  );
}

interface AnimatedContainerProps {
  children: React.ReactNode;
  animation?: 'fade-in' | 'slide-left' | 'slide-right' | 'scale' | 'bounce';
  delay?: number;
  className?: string;
}

export function AnimatedContainer({ 
  children, 
  animation = 'fade-in', 
  delay = 0,
  className = '' 
}: AnimatedContainerProps) {
  const animations = {
    'fade-in': {
      initial: { opacity: 0, y: 20 },
      animate: { opacity: 1, y: 0 },
      transition: { duration: 0.4, delay }
    },
    'slide-left': {
      initial: { opacity: 0, x: -30 },
      animate: { opacity: 1, x: 0 },
      transition: { duration: 0.4, delay }
    },
    'slide-right': {
      initial: { opacity: 0, x: 30 },
      animate: { opacity: 1, x: 0 },
      transition: { duration: 0.4, delay }
    },
    'scale': {
      initial: { opacity: 0, scale: 0.9 },
      animate: { opacity: 1, scale: 1 },
      transition: { duration: 0.4, delay }
    },
    'bounce': {
      initial: { opacity: 0, scale: 0.8 },
      animate: { opacity: 1, scale: 1 },
      transition: { duration: 0.6, delay }
    }
  };

  const animationProps = animations[animation];

  return (
    <motion.div
      className={className}
      {...animationProps}
    >
      {children}
    </motion.div>
  );
}

// Utility hook for staggered animations
export function useStaggeredAnimation(count: number, baseDelay = 0.1) {
  return Array.from({ length: count }, (_, index) => ({
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { 
      duration: 0.4, 
      delay: baseDelay * index,
      ease: "easeOut"
    }
  }));
}