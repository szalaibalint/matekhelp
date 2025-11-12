# Quick Reference - Database Functions

## 📊 Analytics Functions

### Track Views
```typescript
// Increment presentation view count
await supabase.rpc('increment_presentation_views', {
  presentation_id: 'uuid-here'
});

// Increment category view count
await supabase.rpc('increment_category_views', {
  p_category_id: 'uuid-here'
});
```

### Get Trending Content
```typescript
// Get trending presentations (last 7 days)
const { data } = await supabase.rpc('get_trending_presentations', {
  days_back: 7,
  result_limit: 10
});
```

### Search Tracking
```typescript
// Track search query
const { data: searchId } = await supabase.rpc('track_search', {
  p_user_id: userId, // or null for anonymous
  p_search_query: 'algebra',
  p_results_count: 15
});

// Track which result was clicked
await supabase.rpc('track_search_click', {
  p_search_id: searchId,
  p_presentation_id: 'clicked-uuid'
});

// Get popular searches (last 30 days)
const { data } = await supabase.rpc('get_popular_searches', {
  result_limit: 10
});
```

## 👤 User Functions

### Progress Tracking
```typescript
// Save user progress (auto-updates or creates)
await supabase.rpc('update_user_progress', {
  p_user_id: userId,
  p_presentation_id: presentationId,
  p_last_slide_index: 5,
  p_progress_percentage: 50
});

// Get user progress
const { data } = await supabase
  .from('user_progress')
  .select('*')
  .eq('user_id', userId)
  .eq('presentation_id', presentationId)
  .single();
```

### Streak Management
```typescript
// Update user's daily streak
await supabase.rpc('update_user_streak', {
  p_user_id: userId
});
```

### User Statistics
```typescript
// Get comprehensive user stats (JSON)
const { data } = await supabase.rpc('get_user_statistics', {
  p_user_id: userId
});
// Returns: profile, achievements_count, bookmarks_count, recent_sessions, category_breakdown
```

## 🏆 Gamification Functions

### Achievements
```typescript
// Check and award achievements (automatic via triggers, but can call manually)
await supabase.rpc('check_and_award_achievements', {
  p_user_id: userId
});

// Get user's achievements
const { data } = await supabase
  .from('user_achievements')
  .select('*, achievements(*)')
  .eq('user_id', userId);
```

### Leaderboards
```typescript
// Get weekly leaderboard
const { data } = await supabase.rpc('get_leaderboard', {
  time_period: 'weekly', // 'weekly', 'monthly', or 'all_time'
  result_limit: 50
});
// Returns: user_id, username, full_name, avatar_url, total_score, presentations_completed, average_score, rank
```

## 🔔 Notifications

```typescript
// Mark single notification as read
await supabase.rpc('mark_notification_read', {
  p_notification_id: notificationId
});

// Mark all notifications as read
await supabase.rpc('mark_all_notifications_read', {
  p_user_id: userId
});

// Get unread notifications
const { data } = await supabase
  .from('notifications')
  .select('*')
  .eq('user_id', userId)
  .eq('is_read', false)
  .order('created_at', { ascending: false });
```

## 📝 Session Tracking

```typescript
// Create new session
const { data: session } = await supabase
  .from('presentation_sessions')
  .insert({
    presentation_id: presentationId,
    user_id: userId, // or null for anonymous
    started_at: new Date().toISOString(),
    device_type: 'desktop', // 'mobile', 'tablet', 'desktop'
    browser: navigator.userAgent
  })
  .select()
  .single();

// Update session progress
await supabase
  .from('presentation_sessions')
  .update({
    last_slide_index: currentSlide,
    total_time_spent: seconds
  })
  .eq('id', session.id);

// Mark session as completed
await supabase
  .from('presentation_sessions')
  .update({
    is_completed: true,
    completed_at: new Date().toISOString(),
    score: finalScore,
    answers: answersObject
  })
  .eq('id', session.id);
```

## ⭐ Ratings & Reviews

```typescript
// Add or update rating
await supabase
  .from('presentation_ratings')
  .upsert({
    presentation_id: presentationId,
    user_id: userId,
    rating: 5, // 1-5
    review: 'Excellent explanation!'
  });

// Get presentation ratings
const { data } = await supabase
  .from('presentation_ratings')
  .select('*, user_profiles(username, avatar_url)')
  .eq('presentation_id', presentationId)
  .order('created_at', { ascending: false });

// Get average rating
const { data: ratings } = await supabase
  .from('presentation_ratings')
  .select('rating')
  .eq('presentation_id', presentationId);

const avgRating = ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length;
```

## 💬 Comments

```typescript
// Add comment
await supabase
  .from('presentation_comments')
  .insert({
    presentation_id: presentationId,
    user_id: userId,
    content: 'Great explanation of derivatives!',
    parent_comment_id: null // or parent UUID for replies
  });

// Get comments (with nested replies)
const { data } = await supabase
  .from('presentation_comments')
  .select(`
    *,
    user_profiles(username, avatar_url),
    replies:presentation_comments(
      *,
      user_profiles(username, avatar_url)
    )
  `)
  .eq('presentation_id', presentationId)
  .is('parent_comment_id', null)
  .order('created_at', { ascending: false });
```

## 🔖 Bookmarks

```typescript
// Add bookmark
await supabase
  .from('user_bookmarks')
  .insert({
    user_id: userId,
    presentation_id: presentationId
  });

// Remove bookmark
await supabase
  .from('user_bookmarks')
  .delete()
  .eq('user_id', userId)
  .eq('presentation_id', presentationId);

// Get user's bookmarks
const { data } = await supabase
  .from('user_bookmarks')
  .select('*, presentations(*)')
  .eq('user_id', userId)
  .order('created_at', { ascending: false });

// Check if bookmarked
const { data } = await supabase
  .from('user_bookmarks')
  .select('id')
  .eq('user_id', userId)
  .eq('presentation_id', presentationId)
  .single();

const isBookmarked = !!data;
```

## 🎯 Recommendations

```typescript
// Get personalized recommendations
const { data } = await supabase.rpc('get_recommended_presentations', {
  p_user_id: userId,
  result_limit: 10
});
// Returns presentations from categories user has viewed, excluding already completed ones
```

## 📈 Statistics & Reports

```typescript
// Get daily statistics (last 30 days)
const { data } = await supabase
  .from('daily_statistics')
  .select('*')
  .order('date', { ascending: false })
  .limit(30);

// Aggregate yesterday's statistics (run daily)
await supabase.rpc('aggregate_daily_statistics', {
  p_date: new Date(Date.now() - 86400000).toISOString().split('T')[0]
});

// Get presentation statistics
const { data } = await supabase
  .from('presentations')
  .select('title, view_count, completion_count, average_score')
  .eq('status', 'published')
  .order('view_count', { ascending: false })
  .limit(10);
```

## 🎓 Learning Paths

```typescript
// Create learning path
await supabase
  .from('user_learning_paths')
  .insert({
    user_id: userId,
    name: 'Algebra Basics',
    description: 'Master algebra fundamentals',
    presentation_ids: ['uuid1', 'uuid2', 'uuid3'],
    current_position: 0
  });

// Update position in path
await supabase
  .from('user_learning_paths')
  .update({
    current_position: 2,
    is_completed: false
  })
  .eq('id', pathId);

// Mark path as completed
await supabase
  .from('user_learning_paths')
  .update({ is_completed: true })
  .eq('id', pathId);
```

## 🔍 Common Queries

```typescript
// Get popular presentations (by view count)
const { data } = await supabase
  .from('presentations')
  .select('*')
  .eq('status', 'published')
  .order('view_count', { ascending: false })
  .limit(10);

// Get recent presentations
const { data } = await supabase
  .from('presentations')
  .select('*')
  .eq('status', 'published')
  .order('updated_at', { ascending: false })
  .limit(10);

// Get featured presentations
const { data } = await supabase
  .from('presentations')
  .select('*')
  .eq('status', 'published')
  .eq('is_featured', true)
  .order('view_count', { ascending: false });

// Search presentations by tags
const { data } = await supabase
  .from('presentations')
  .select('*')
  .contains('tags', ['algebra', 'geometry'])
  .eq('status', 'published');

// Get presentations by difficulty
const { data } = await supabase
  .from('presentations')
  .select('*')
  .eq('difficulty_level', 'beginner')
  .eq('status', 'published');
```

## 🎨 User Profile

```typescript
// Get user profile
const { data } = await supabase
  .from('user_profiles')
  .select('*')
  .eq('id', userId)
  .single();

// Update profile
await supabase
  .from('user_profiles')
  .update({
    username: 'newusername',
    full_name: 'John Doe',
    bio: 'Math enthusiast',
    avatar_url: 'https://...'
  })
  .eq('id', userId);

// Get user's role
const { data } = await supabase
  .from('user_profiles')
  .select('role')
  .eq('id', userId)
  .single();
```

---

**Tip**: All these functions respect Row Level Security (RLS), so users can only access data they're authorized to see!
