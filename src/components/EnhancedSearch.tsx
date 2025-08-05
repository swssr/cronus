import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Filter, User, Hash, FileText } from 'lucide-react';
import type { Commit } from '../types';

interface SearchFilter {
  type: 'all' | 'message' | 'author' | 'hash' | 'files';
  dateRange?: { start: Date; end: Date };
  author?: string;
}

interface EnhancedSearchProps {
  commits: Commit[];
  onFilter: (filteredCommits: Commit[]) => void;
  placeholder?: string;
  className?: string;
}

export function EnhancedSearch({ 
  commits, 
  onFilter, 
  placeholder = "Search commits...",
  className = ""
}: EnhancedSearchProps) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<SearchFilter>({ type: 'all' });
  const [showFilters, setShowFilters] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fuzzy search scoring
  const fuzzyScore = useCallback((str: string, pattern: string): number => {
    if (!pattern) return 1;
    
    const patternLower = pattern.toLowerCase();
    const strLower = str.toLowerCase();
    
    // Exact match gets highest score
    if (strLower.includes(patternLower)) {
      const index = strLower.indexOf(patternLower);
      return 1000 - index; // Earlier matches score higher
    }
    
    // Character-by-character fuzzy matching
    let score = 0;
    let patternIndex = 0;
    
    for (let i = 0; i < strLower.length && patternIndex < patternLower.length; i++) {
      if (strLower[i] === patternLower[patternIndex]) {
        score += 1;
        patternIndex++;
      }
    }
    
    return patternIndex === patternLower.length ? score : 0;
  }, []);

  // Advanced filtering logic
  const filteredCommits = useMemo(() => {
    if (!query.trim() && filter.type === 'all' && !filter.dateRange && !filter.author) {
      return commits;
    }

    const queryLower = query.toLowerCase().trim();
    
    return commits
      .map(commit => {
        let score = 0;
        const matchedFields: string[] = [];

        // Apply type-specific filtering
        switch (filter.type) {
          case 'message': {
            score = fuzzyScore(commit.message, queryLower);
            if (score > 0) matchedFields.push('message');
            break;
          }
          case 'author': {
            score = fuzzyScore(commit.author || '', queryLower);
            if (score > 0) matchedFields.push('author');
            break;
          }
          case 'hash': {
            score = commit.hash.toLowerCase().startsWith(queryLower) ? 1000 : 0;
            if (score > 0) matchedFields.push('hash');
            break;
          }
          case 'files': {
            const fileMatches = commit.changes?.filter(change => 
              fuzzyScore(change.path, queryLower) > 0
            ) || [];
            score = fileMatches.length * 100;
            if (score > 0) matchedFields.push('files');
            break;
          }
          default: {
            // Search across all fields
            const messageScore = fuzzyScore(commit.message, queryLower);
            const authorScore = fuzzyScore(commit.author || '', queryLower);
            const hashScore = commit.hash.toLowerCase().startsWith(queryLower) ? 500 : 0;
            const fileScore = commit.changes?.reduce((total, change) => 
              total + fuzzyScore(change.path, queryLower), 0) || 0;
            
            score = Math.max(messageScore, authorScore, hashScore, fileScore);
            
            if (messageScore > 0) matchedFields.push('message');
            if (authorScore > 0) matchedFields.push('author');
            if (hashScore > 0) matchedFields.push('hash');
            if (fileScore > 0) matchedFields.push('files');
            break;
          }
        }

        // Apply additional filters
        if (filter.dateRange) {
          const commitDate = new Date(commit.date);
          if (commitDate < filter.dateRange.start || commitDate > filter.dateRange.end) {
            score = 0;
          }
        }

        if (filter.author && commit.author !== filter.author) {
          score = 0;
        }

        return { commit, score, matchedFields };
      })
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .map(item => item.commit);
  }, [commits, query, filter, fuzzyScore]);

  // Update parent component when filtered results change
  useEffect(() => {
    onFilter(filteredCommits);
  }, [filteredCommits, onFilter]);



  // Clear search
  const clearSearch = () => {
    setQuery('');
    setFilter({ type: 'all' });
  };

  // Get unique authors for filter dropdown
  const uniqueAuthors = useMemo(() => {
    const authors = new Set(commits.map(c => c.author).filter(Boolean));
    return Array.from(authors).sort();
  }, [commits]);

  return (
    <div className={`enhanced-search ${className}`}>
      <div className={`search-input-container ${isFocused ? 'focused' : ''}`}>
        <Search className="search-icon" size={16} />
        
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          className="search-input-enhanced"
        />

        <div className="search-actions">
          {(query || filter.type !== 'all' || filter.author) && (
            <motion.button
              type="button"
              className="clear-search"
              onClick={clearSearch}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              title="Clear search"
            >
              <X size={14} />
            </motion.button>
          )}
          
          <motion.button
            type="button"
            className={`filter-toggle ${showFilters ? 'active' : ''}`}
            onClick={() => setShowFilters(!showFilters)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            title="Show filters"
          >
            <Filter size={14} />
          </motion.button>
        </div>
      </div>

      {/* Search Results Summary */}
      {query && (
        <motion.div 
          className="search-summary"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
        >
          {filteredCommits.length} of {commits.length} commits
          {filter.type !== 'all' && ` in ${filter.type}`}
        </motion.div>
      )}

      {/* Advanced Filters Panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            className="filters-panel"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="filter-row">
              <span className="filter-label">Search in:</span>
              <div className="filter-type-buttons">
                {[
                  { type: 'all', icon: Search, label: 'All' },
                  { type: 'message', icon: FileText, label: 'Message' },
                  { type: 'author', icon: User, label: 'Author' },
                  { type: 'hash', icon: Hash, label: 'Hash' },
                  { type: 'files', icon: FileText, label: 'Files' }
                ].map(({ type, icon: Icon, label }) => (
                  <button
                    key={type}
                    type="button"
                    className={`filter-type-button ${filter.type === type ? 'active' : ''}`}
                    onClick={() => setFilter(prev => ({ ...prev, type: type as SearchFilter['type'] }))}
                  >
                    <Icon size={12} />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {uniqueAuthors.length > 1 && (
              <div className="filter-row">
                <span className="filter-label">Author:</span>
                <select
                  value={filter.author || ''}
                  onChange={(e) => setFilter(prev => ({ 
                    ...prev, 
                    author: e.target.value || undefined 
                  }))}
                  className="author-filter"
                >
                  <option value="">All authors</option>
                  {uniqueAuthors.map(author => (
                    <option key={author} value={author}>{author}</option>
                  ))}
                </select>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}