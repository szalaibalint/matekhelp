# MatekHelp - Complete Database Setup Guide

## 🎯 What's Been Added

I've created a comprehensive database structure that will store everything you'll need for a production-ready educational platform. This includes:

### 📊 Analytics & Tracking
- **Presentation views** - Track how many times each presentation is viewed
- **Session tracking** - Record every time someone uses a presentation (duration, completion, scores)
- **Daily statistics** - Aggregated metrics for dashboards
- **Search tracking** - What people search for and what they click
- **Category views** - Which topics are most popular

### 👤 User System
- **User profiles** - Extended user info (username, avatar, bio, role)
- **Progress tracking** - Remember where users left off
- **Bookmarks** - Save favorite presentations
- **Learning paths** - Custom sequences of presentations
- **Streaks** - Track consecutive days of activity

### 🏆 Gamification
- **Achievements** - 6 built-in achievements with automatic awarding
- **Points system** - Earn points for accomplishments
- **Leaderboards** - Weekly, monthly, and all-time rankings
- **Notifications** - In-app notifications for achievements

### 💬 Social Features
- **Ratings & reviews** - 1-5 star ratings with text reviews
- **Comments** - Threaded comments on presentations
- **User statistics** - Comprehensive stats for each user

### 📈 Business Intelligence
- **Trending content** - Identify what's hot right now
- **Recommendations** - Personalized suggestions based on user history
- **Popular searches** - See what people are looking for
- **User engagement metrics** - Completion rates, time spent, scores

## 📁 Migration Files Created

### Core Tracking (Run First)
1. **20250118000001_add_presentation_tracking.sql**
   - Adds view_count, completion_count, average_score
   - Adds metadata: tags, difficulty_level, thumbnail_url
   - Creates basic RLS policies

2. **20250118000002_create_increment_views_function.sql**
   - Atomic view counting function
   - Prevents race conditions

### Analytics System
3. **20250118000003_add_comprehensive_analytics.sql**
   - presentation_sessions (detailed session tracking)
   - presentation_ratings (reviews system)
   - user_bookmarks (favorites)
   - user_progress (resume functionality)
   - search_history (search analytics)
   - category_views (topic popularity)
   - daily_statistics (aggregated metrics)
   - All with appropriate RLS policies

4. **20250118000004_create_analytics_functions.sql**
   - get_trending_presentations() - Hot content
   - get_recommended_presentations() - AI-ready recommendations
   - track_search() / track_search_click() - Search analytics
   - update_user_progress() - Save/resume
   - aggregate_daily_statistics() - Daily reports
   - increment_category_views() - Topic tracking

### User & Gamification
5. **20250118000005_add_user_profiles.sql**
   - user_profiles (extended user data)
   - achievements (badge system)
   - user_achievements (earned badges)
   - notifications (in-app alerts)
   - user_learning_paths (custom sequences)
   - presentation_comments (discussion system)
   - 6 default achievements pre-loaded

6. **20250118000006_add_user_functions.sql**
   - handle_new_user() - Auto-create profile on signup
   - update_user_stats() - Auto-update after sessions
   - check_and_award_achievements() - Auto-award badges
   - update_user_streak() - Track consecutive days
   - get_leaderboard() - Rankings (weekly/monthly/all-time)
   - get_user_statistics() - Comprehensive user stats
   - mark_notification_read() - Notification management

## 🚀 How to Apply

### Step 1: Open Supabase Dashboard
1. Go to your Supabase project
2. Click "SQL Editor" in the sidebar
3. Click "New Query"

### Step 2: Run Migrations in Order
Copy and paste each file content into the SQL Editor and run:

```
1. 20250118000001_add_presentation_tracking.sql
2. 20250118000002_create_increment_views_function.sql
3. 20250118000003_add_comprehensive_analytics.sql
4. 20250118000004_create_analytics_functions.sql
5. 20250118000005_add_user_profiles.sql
6. 20250118000006_add_user_functions.sql
```

**Important**: Run them ONE AT A TIME in this exact order!

### Step 3: Verify Installation
After running all migrations, check that tables exist:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

You should see:
- achievements
- categories
- category_views
- daily_statistics
- notifications
- presentation_comments
- presentation_ratings
- presentation_sessions
- presentations
- search_history
- slides
- user_achievements
- user_bookmarks
- user_learning_paths
- user_profiles
- user_progress

## 📊 What You Can Now Track

### For Each Presentation
- Total views
- Completion rate
- Average score
- Time spent
- Ratings (1-5 stars)
- Comments
- Trending status

### For Each User
- Presentations completed
- Total time spent learning
- Average score across all attempts
- Current streak (consecutive days)
- Achievements earned
- Bookmarked presentations
- Progress in each presentation
- Custom learning paths
- Activity history

### Overall Platform
- Daily active users
- Popular presentations
- Trending content
- Search patterns
- Category popularity
- Completion rates
- Average session duration
- User growth

## 🎮 Built-in Achievements

1. **Első lépések** (First Steps) - Complete 1 presentation → 10 points
2. **Lelkes tanuló** (Eager Learner) - Complete 5 presentations → 25 points
3. **Mester** (Master) - Complete 25 presentations → 100 points
4. **Tökéletes** (Perfect) - Get 100% score → 50 points
5. **Kitartó** (Persistent) - 7 day streak → 75 points
6. **Elkötelezett** (Committed) - 30 day streak → 200 points

Achievements are automatically awarded when users meet the requirements!

## 🔒 Privacy & Security

All tables have Row Level Security (RLS) enabled:
- ✅ Anonymous users can view published content and track sessions
- ✅ Authenticated users can only access/modify their own data
- ✅ Admins can access all data
- ✅ IP addresses stored for analytics but protected by RLS
- ✅ Anonymous session tracking (no user_id required)

## 💡 Usage Examples

### Track when someone views a presentation
```typescript
import { supabase } from './supabase';

await supabase.rpc('increment_presentation_views', {
  presentation_id: presentationId
});
```

### Get trending presentations
```typescript
const { data } = await supabase.rpc('get_trending_presentations', {
  days_back: 7,
  result_limit: 10
});
```

### Save user progress
```typescript
await supabase.rpc('update_user_progress', {
  p_user_id: userId,
  p_presentation_id: presentationId,
  p_last_slide_index: currentSlide,
  p_progress_percentage: percentage
});
```

### Get leaderboard
```typescript
const { data } = await supabase.rpc('get_leaderboard', {
  time_period: 'weekly', // or 'monthly', 'all_time'
  result_limit: 50
});
```

### Rate a presentation
```typescript
await supabase
  .from('presentation_ratings')
  .insert({
    presentation_id: presentationId,
    user_id: userId,
    rating: 5,
    review: 'Great explanation!'
  });
```

## 📈 Dashboard Queries

### Get daily statistics
```sql
SELECT * FROM daily_statistics 
ORDER BY date DESC 
LIMIT 30;
```

### Get most popular presentations
```sql
SELECT title, view_count, completion_count, average_score
FROM presentations
WHERE status = 'published'
ORDER BY view_count DESC
LIMIT 10;
```

### Get top users
```sql
SELECT * FROM get_leaderboard('all_time', 10);
```

### Get popular searches
```sql
SELECT * FROM get_popular_searches(20);
```

## 🔄 Automatic Processes

These happen automatically via triggers:
- ✅ User profile created when someone signs up
- ✅ Presentation stats updated when sessions complete
- ✅ User stats updated when sessions complete
- ✅ Achievements checked and awarded automatically
- ✅ Notifications created for new achievements
- ✅ Streaks updated on user activity
- ✅ Timestamps automatically managed

## 📚 Documentation

Full schema documentation is available in:
- **DATABASE_SCHEMA.md** - Complete technical reference
- **VIEWER_UPDATES.md** - Frontend changes for featured content

## 🚧 What's Next

You can now implement:
- User dashboard showing progress and achievements
- Admin analytics dashboard
- Leaderboard page
- Recommendation engine
- Search with tracking
- Comments section
- Rating system
- Bookmark functionality
- Learning path creator
- Notification center

## ⚙️ Maintenance

### Daily Statistics Aggregation
Run this daily (can be set up as a cron job):
```sql
SELECT aggregate_daily_statistics(CURRENT_DATE - interval '1 day');
```

### Check Database Health
```sql
-- Check RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';

-- Check policy count
SELECT schemaname, tablename, COUNT(*) as policy_count
FROM pg_policies
GROUP BY schemaname, tablename
ORDER BY tablename;
```

## 🆘 Troubleshooting

### If a migration fails:
1. Check the error message
2. Verify previous migrations ran successfully
3. Check for naming conflicts
4. Ensure Supabase version is up to date

### If RLS blocks queries:
1. Check that policies exist: `SELECT * FROM pg_policies WHERE tablename = 'your_table';`
2. Verify user authentication state
3. Check policy conditions match your use case

### If functions don't exist:
1. Verify migration ran successfully
2. Check permissions: `\df public.*` in SQL Editor
3. Re-run the migration if needed

## ✅ Checklist

Before going live:
- [ ] All 6 migrations applied successfully
- [ ] Tables verified in database
- [ ] RLS policies active
- [ ] Test anonymous viewing
- [ ] Test authenticated user actions
- [ ] Set up daily statistics cron job
- [ ] Configure email notifications (optional)
- [ ] Test achievement system
- [ ] Verify leaderboards work

---

**You now have a production-ready database that can track everything!** 🎉
