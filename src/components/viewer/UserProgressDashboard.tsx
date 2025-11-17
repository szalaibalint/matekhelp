import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { 
  Trophy, 
  Target, 
  TrendingUp, 
  Calendar, 
  ArrowLeft,
  CheckCircle2,
  Clock,
  Award,
  BarChart3,
  Star
} from 'lucide-react';
import { UserProgressService, UserProgress } from '../../services/UserProgressService';
import { useViewerAuth } from '../../contexts/ViewerAuthContext';
import { loadPresentations, Presentation } from '../../services/PresentationService';
import { Skeleton } from '../ui/skeleton';

const UserProgressDashboard: React.FC = () => {
  const { user } = useViewerAuth();
  const navigate = useNavigate();
  const [allProgress, setAllProgress] = useState<UserProgress[]>([]);
  const [presentations, setPresentations] = useState<Map<string, Presentation>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    totalCompleted: 0,
    averageScore: 0,
    totalAttempts: 0,
    perfectScores: 0,
    inProgress: 0,
  });

  useEffect(() => {
    if (user?.id) {
      loadProgressData();
    }
  }, [user]);

  const loadProgressData = async () => {
    if (!user?.id) return;
    
    setIsLoading(true);
    try {
      // Get all user progress
      const progressData = await UserProgressService.getAllUserProgress(user.id);
      
      // Get all presentations to map IDs to titles
      const allPresentations = await loadPresentations(null);
      const presentationMap = new Map(allPresentations.map(p => [p.id, p]));
      
      setPresentations(presentationMap);
      setAllProgress(progressData);
      
      // Calculate statistics
      const completed = progressData.filter(p => p.progress_percentage === 100).length;
      const inProgress = progressData.filter(p => p.progress_percentage < 100).length;
      const totalScore = progressData.reduce((sum, p) => sum + (p.best_score_percentage || 0), 0);
      const avgScore = progressData.length > 0 ? Math.round(totalScore / progressData.length) : 0;
      const perfect = progressData.filter(p => p.best_score_percentage === 100).length;
      const attempts = progressData.reduce((sum, p) => sum + (p.attempts || 0), 0);
      
      setStats({
        totalCompleted: completed,
        averageScore: avgScore,
        totalAttempts: attempts,
        perfectScores: perfect,
        inProgress: inProgress,
      });
    } catch (error) {
      console.error('Failed to load progress data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600 bg-green-50';
    if (score >= 70) return 'text-blue-600 bg-blue-50';
    if (score >= 50) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const getScoreEmoji = (score: number) => {
    if (score === 100) return '🏆';
    if (score >= 90) return '⭐';
    if (score >= 70) return '👍';
    if (score >= 50) return '📈';
    return '💪';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Ma';
    if (diffDays === 1) return 'Tegnap';
    if (diffDays < 7) return `${diffDays} napja`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} hete`;
    return date.toLocaleDateString('hu-HU', { month: 'short', day: 'numeric' });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4 md:p-6">
        <div className="max-w-6xl mx-auto">
          <Skeleton className="h-12 w-64 mb-6" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  const completedProgress = allProgress
    .filter(p => p.progress_percentage === 100)
    .sort((a, b) => new Date(b.last_accessed_at).getTime() - new Date(a.last_accessed_at).getTime());

  const inProgressItems = allProgress
    .filter(p => p.progress_percentage < 100)
    .sort((a, b) => new Date(b.last_accessed_at).getTime() - new Date(a.last_accessed_at).getTime());

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <Button
              variant="ghost"
              onClick={() => navigate('/')}
              className="mb-2"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Vissza
            </Button>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
              Haladásom
            </h1>
            <p className="text-gray-600 mt-1">Kövesd nyomon a teljesítményedet</p>
          </div>
          <Trophy className="h-12 w-12 text-yellow-500" />
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Befejezett</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.totalCompleted}</p>
                </div>
                <CheckCircle2 className="h-10 w-10 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Átlag pontszám</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.averageScore}%</p>
                </div>
                <Target className="h-10 w-10 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Tökéletes</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.perfectScores}</p>
                </div>
                <Award className="h-10 w-10 text-yellow-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Folyamatban</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.inProgress}</p>
                </div>
                <Clock className="h-10 w-10 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity Chart */}
        {completedProgress.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-blue-500" />
                Legutóbbi eredmények
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {completedProgress.slice(0, 10).map((progress, index) => {
                  const presentation = presentations.get(progress.presentation_id);
                  if (!presentation) return null;
                  const score = progress.best_score_percentage || 0;
                  
                  return (
                    <div key={progress.id} className="flex items-center gap-3">
                      <div className="flex-shrink-0 w-8 text-center">
                        <span className="text-sm font-medium text-gray-500">#{index + 1}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {presentation.title}
                        </p>
                        <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                          <div
                            className={`h-2 rounded-full transition-all ${
                              score >= 90 ? 'bg-green-500' :
                              score >= 70 ? 'bg-blue-500' :
                              score >= 50 ? 'bg-yellow-500' :
                              'bg-red-500'
                            }`}
                            style={{ width: `${score}%` }}
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-gray-900">{score}%</span>
                        {score === 100 && <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* In Progress Section */}
        {inProgressItems.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-orange-500" />
                Folyamatban lévő tananyagok
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {inProgressItems.map((progress) => {
                  const presentation = presentations.get(progress.presentation_id);
                  if (!presentation) return null;
                  
                  return (
                    <div
                      key={progress.id}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                      onClick={() => navigate(`/${progress.presentation_id}`)}
                    >
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 mb-1">
                          {presentation.title}
                        </h3>
                        <div className="flex items-center gap-3 text-sm text-gray-600">
                          <span className="flex items-center gap-1">
                            <BarChart3 className="h-4 w-4" />
                            {progress.progress_percentage}% kész
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {formatDate(progress.last_accessed_at)}
                          </span>
                        </div>
                      </div>
                      <Button variant="outline" size="sm">
                        Folytatás
                      </Button>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Completed Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              Befejezett tananyagok ({completedProgress.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {completedProgress.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Trophy className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="text-lg font-medium mb-2">Még nincs befejezett tananyag</p>
                <p className="text-sm">Kezdj el tanulni és gyűjtsd az eredményeket!</p>
                <Button 
                  className="mt-4"
                  onClick={() => navigate('/')}
                >
                  Tananyagok böngészése
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {completedProgress.map((progress) => {
                  const presentation = presentations.get(progress.presentation_id);
                  if (!presentation) return null;
                  
                  const score = progress.best_score_percentage || 0;
                  
                  return (
                    <div
                      key={progress.id}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                      onClick={() => navigate(`/${progress.presentation_id}`)}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-gray-900">
                            {presentation.title}
                          </h3>
                          <span className="text-xl">{getScoreEmoji(score)}</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-gray-600">
                          <span className="flex items-center gap-1">
                            <TrendingUp className="h-4 w-4" />
                            {progress.attempts || 0} próbálkozás
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {formatDate(progress.last_accessed_at)}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge className={`text-lg px-3 py-1 ${getScoreColor(score)}`}>
                          {score}%
                        </Badge>
                        <Button variant="outline" size="sm">
                          Újra
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default UserProgressDashboard;
