# Database Schema Documentation - MatekHelp

## Overview
This document describes the comprehensive database schema for MatekHelp, including all tables, relationships, and functions for tracking user activity, analytics, gamification, and more.

## Core Tables

### presentations
Main content table storing all presentation data.
- **New Columns Added**:
  - `view_count` (integer): Total number of views
  - `last_viewed_at` (timestamp): Last time presentation was viewed
  - `completion_count` (integer): Number of times completed
  - `average_score` (numeric): Average score across all completions
  - `total_time_spent` (integer): Total time users spent (seconds)
  - `thumbnail_url` (text): Preview image URL
  - `tags` (text[]): Searchable tags
  - `difficulty_level` (text): beginner/intermediate/advanced
  - `estimated_duration` (integer): Expected completion time (minutes)
  - `is_featured` (boolean): Show on homepage
  - `author_name` (text): Creator's name

### slides
Stores individual slides within presentations (existing table).

### categories
Hierarchical category structure (existing table).

## Analytics Tables

### presentation_sessions
Tracks each time a user views/completes a presentation.
- `id` (uuid): Primary key
- `presentation_id` (uuid): FK to presentations
- `user_id` (uuid): FK to auth.users (null for anonymous)
- `started_at` (timestamp): Session start time
- `completed_at` (timestamp): Session completion time
- `last_slide_index` (integer): Last viewed slide
- `total_time_spent` (integer): Session duration (seconds)
- `score` (numeric): Final score achieved
- `answers` (jsonb): User's answers
- `is_completed` (boolean): Whether finished
- `device_type` (text): mobile/tablet/desktop
- `browser` (text): Browser information
- `ip_address` (inet): User's IP

### presentation_ratings
User ratings and reviews for presentations.
- `presentation_id` + `user_id` unique constraint
- `rating` (integer): 1-5 stars
- `review` (text): Optional text review

### daily_statistics
Aggregated daily metrics.
- `date` (date): Unique date
- `total_views` (integer): Views that day
- `unique_visitors` (integer): Unique users
- `total_sessions` (integer): Total sessions
- `completed_sessions` (integer): Completed sessions
- `average_session_duration` (integer): Avg time (seconds)
- `new_presentations` (integer): Presentations created

### search_history
Tracks search queries and results.
- `search_query` (text): What user searched
- `results_count` (integer): Number of results
- `clicked_presentation_id` (uuid): Which result was clicked

### category_views
Tracks category browsing.
- `category_id` (uuid): FK to categories
- `view_count` (integer): Number of views
- `last_viewed_at` (timestamp): Last viewed

## User Tables

### user_profiles
Extended user information beyond auth.users.
- `id` (uuid): FK to auth.users (primary key)
- `username` (text): Unique username
- `full_name` (text): Display name
- `avatar_url` (text): Profile picture
- `bio` (text): User description
- `role` (text): student/teacher/admin
- `preferences` (jsonb): User settings
- `total_presentations_completed` (integer): Achievement count
- `total_time_spent` (integer): Total learning time
- `average_score` (numeric): Average across all attempts
- `streak_days` (integer): Consecutive days of activity
- `last_activity_date` (date): Last active date

### user_bookmarks
Saved presentations.
- `user_id` + `presentation_id` unique constraint

### user_progress
Track progress through presentations.
- `user_id` + `presentation_id` unique constraint
- `last_slide_index` (integer): Resume point
- `progress_percentage` (integer): 0-100%
- `last_accessed_at` (timestamp): Last viewed

### user_learning_paths
Custom learning sequences.
- `name` (text): Path name
- `description` (text): Path description
- `presentation_ids` (uuid[]): Ordered list
- `current_position` (integer): Current position
- `is_completed` (boolean): Whether finished

## Gamification Tables

### achievements
Available achievements/badges.
- `name` (text): Achievement name
- `description` (text): What it's for
- `icon` (text): Emoji or icon
- `requirement_type` (text): Type of requirement
- `requirement_value` (integer): Threshold to unlock
- `points` (integer): Points awarded

**Default Achievements**:
- Első lépések: Complete 1 presentation (10 pts)
- Lelkes tanuló: Complete 5 presentations (25 pts)
- Mester: Complete 25 presentations (100 pts)
- Tökéletes: Get 100% score (50 pts)
- Kitartó: 7 day streak (75 pts)
- Elkötelezett: 30 day streak (200 pts)

### user_achievements
Junction table for earned achievements.
- `user_id` + `achievement_id` unique constraint
- `earned_at` (timestamp): When earned

### notifications
User notification system.
- `user_id` (uuid): Recipient
- `title` (text): Notification title
- `message` (text): Notification body
- `type` (text): achievement/reminder/announcement/system
- `is_read` (boolean): Read status
- `action_url` (text): Optional link

## Social Features

### presentation_comments
Comments on presentations.
- `presentation_id` (uuid): FK to presentations
- `user_id` (uuid): FK to user_profiles
- `parent_comment_id` (uuid): For nested replies
- `content` (text): Comment text
- `is_edited` (boolean): Edit flag

## Key Functions

### View Tracking
- `increment_presentation_views(presentation_id)`: Increment view count atomically

### Statistics
- `update_presentation_stats()`: Auto-update after session completion (trigger)
- `aggregate_daily_statistics(date)`: Calculate daily metrics
- `increment_category_views(category_id)`: Track category browsing

### Trending & Recommendations
- `get_trending_presentations(days_back, limit)`: Get trending content
- `get_recommended_presentations(user_id, limit)`: Personalized recommendations

### Search
- `track_search(user_id, query, results_count)`: Log search
- `track_search_click(search_id, presentation_id)`: Log click
- `get_popular_searches(limit)`: Get top searches

### User Progress
- `update_user_progress(user_id, presentation_id, slide_index, percentage)`: Save progress
- `update_user_stats()`: Auto-update user stats (trigger)
- `update_user_streak(user_id)`: Update consecutive days streak

### Achievements & Gamification
- `check_and_award_achievements(user_id)`: Check and grant achievements
- `get_leaderboard(time_period, limit)`: Get rankings
- `get_user_statistics(user_id)`: Get comprehensive user stats

### Notifications
- `mark_notification_read(notification_id)`: Mark as read
- `mark_all_notifications_read(user_id)`: Mark all as read

### User Management
- `handle_new_user()`: Auto-create profile on signup (trigger)

## Row Level Security (RLS)

All tables have RLS enabled with appropriate policies:
- **Public access**: Published presentations, categories, achievements
- **Anonymous tracking**: Session tracking, view counts, searches
- **Authenticated only**: Bookmarks, progress, ratings, comments
- **Own data only**: Users can only modify their own data
- **Admin access**: Full access for admin role

## Indexes

Performance indexes created on:
- Foreign keys
- Frequently queried columns (status, view_count, ratings)
- Time-based queries (created_at, updated_at)
- Array columns (tags using GIN index)
- Partial indexes (is_featured, is_completed)

## Triggers

Auto-update triggers for:
- `updated_at` timestamp on modifications
- Presentation statistics on session completion
- User statistics on session completion
- User profile creation on auth signup

## Usage Examples

### Track a presentation view
```sql
SELECT increment_presentation_views('presentation-uuid-here');
```

### Get trending presentations
```sql
SELECT * FROM get_trending_presentations(7, 10); -- Last 7 days, top 10
```

### Get user recommendations
```sql
SELECT * FROM get_recommended_presentations('user-uuid-here', 10);
```

### Record a session
```sql
INSERT INTO presentation_sessions (
    presentation_id, 
    user_id, 
    started_at, 
    device_type
) VALUES (
    'pres-uuid',
    'user-uuid',
    NOW(),
    'desktop'
);
```

### Award achievement manually
```sql
SELECT check_and_award_achievements('user-uuid-here');
```

## Migration Order

Run migrations in this exact order:
1. `20250118000001_add_presentation_tracking.sql` - Basic tracking
2. `20250118000002_create_increment_views_function.sql` - View counting
3. `20250118000003_add_comprehensive_analytics.sql` - Analytics tables
4. `20250118000004_create_analytics_functions.sql` - Analytics functions
5. `20250118000005_add_user_profiles.sql` - User system
6. `20250118000006_add_user_functions.sql` - User functions

## Future Enhancements

Potential additions:
- Discussion forums
- Live quiz/competition mode
- Collaborative learning groups
- Content recommendations using ML
- A/B testing framework
- Export/import of presentations
- Multi-language support
- Accessibility features tracking
