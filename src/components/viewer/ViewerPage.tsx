import { useState, useEffect } from 'react';
import { Category, loadCategories } from '../../services/CategoryService';
import { Presentation, loadPresentations } from '../../services/PresentationService';
import { getPopularPresentations, getRecentPresentations } from '../../services/PresentationTrackingService';
import { UserProgressService, UserProgress } from '../../services/UserProgressService';
import { CategoryTree } from '../admin/CategoryTree';
import { PresentationGrid } from './PresentationGrid';
import { HorizontalScrollCarousel } from './HorizontalScrollCarousel';
import { InProgressCard } from './InProgressCard';
import { ViewerLoginDialog } from './ViewerLoginDialog';
import { ViewerRegisterDialog } from './ViewerRegisterDialog';
import { useViewerAuth } from '../../contexts/ViewerAuthContext';
import { BookOpen, TrendingUp, Clock, User, LogOut, Search, PlayCircle, Menu, X } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Skeleton } from '../ui/skeleton';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '../ui/dropdown-menu';

export default function ViewerPage() {
  const { user, isLoggedIn, logout } = useViewerAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [presentations, setPresentations] = useState<Presentation[]>([]);
  const [popularPresentations, setPopularPresentations] = useState<Presentation[]>([]);
  const [recentPresentations, setRecentPresentations] = useState<Presentation[]>([]);
  const [inProgressPresentations, setInProgressPresentations] = useState<UserProgress[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showLoginDialog, setShowLoginDialog] = useState(false);
  const [showRegisterDialog, setShowRegisterDialog] = useState(false);

  useEffect(() => {
    fetchCategories();
    fetchFeaturedPresentations();
  }, []);

  useEffect(() => {
    fetchPresentations();
  }, [selectedCategoryId]);

  useEffect(() => {
    const loadUserProgress = async () => {
      if (user?.id) {
        const progress = await UserProgressService.getInProgressPresentations(user.id);
        setInProgressPresentations(progress);
      } else {
        setInProgressPresentations([]);
      }
    };
    loadUserProgress();
  }, [user]);

  const fetchCategories = async () => {
    const categoryTree = await loadCategories();
    setCategories(categoryTree);
  };

  const fetchFeaturedPresentations = async () => {
    setIsLoading(true);
    const [popular, recent] = await Promise.all([
      getPopularPresentations(10),
      getRecentPresentations(10)
    ]);
    setPopularPresentations(popular);
    setRecentPresentations(recent);
  };

  const fetchPresentations = async () => {
    const data = await loadPresentations(selectedCategoryId);
    setPresentations(data.filter(p => p.status === 'published'));
    setIsLoading(false);
  };

  const filteredPresentations = presentations.filter(p => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      p.title?.toLowerCase().includes(query) ||
      p.description?.toLowerCase().includes(query)
    );
  });

  const filteredPopularPresentations = popularPresentations.filter(p => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      p.title?.toLowerCase().includes(query) ||
      p.description?.toLowerCase().includes(query)
    );
  });

  const filteredRecentPresentations = recentPresentations.filter(p => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      p.title?.toLowerCase().includes(query) ||
      p.description?.toLowerCase().includes(query)
    );
  });

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200 px-4 md:px-6 py-3 md:py-4 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          {/* Mobile menu button */}
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="md:hidden p-2 hover:bg-gray-100 rounded-md"
          >
            <Menu className="h-6 w-6" />
          </button>

          <div className="flex items-center gap-2 md:gap-3">
            <BookOpen className="h-6 w-6 md:h-8 md:w-8 text-blue-600" />
            <div>
              <h1 className="text-xl md:text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                MatekHelp
              </h1>
              <p className="hidden md:block text-sm text-gray-600">Interaktív matematika tananyagok</p>
            </div>
          </div>

          {/* Search Bar */}
          <div className="hidden md:flex flex-1 max-w-md mx-8">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Keresés a tananyagok között..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Auth Section */}
          <div className="flex-shrink-0">
            {isLoggedIn ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    <span>{user?.username}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <div className="px-2 py-1.5 text-sm font-medium">
                    {user?.full_name || user?.username}
                  </div>
                  <div className="px-2 py-1.5 text-xs text-gray-500">
                    {user?.email}
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={logout}>
                    <LogOut className="h-4 w-4 mr-2" />
                    Kijelentkezés
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setShowLoginDialog(true)} size="sm">
                  <span className="hidden sm:inline">Bejelentkezés</span>
                  <LogOut className="sm:hidden h-4 w-4" />
                </Button>
                <Button onClick={() => setShowRegisterDialog(true)} size="sm">
                  <span className="hidden sm:inline">Regisztráció</span>
                  <User className="sm:hidden h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
        {/* Mobile Search */}
        <div className="md:hidden mt-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Keresés..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Mobile Sidebar Overlay */}
        {isSidebarOpen && (
          <div 
            className="md:hidden fixed inset-0 bg-black/50 z-40"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Categories Sidebar */}
        <div className={`
          fixed md:relative inset-y-0 left-0 z-50 md:z-0
          w-64 bg-white/80 backdrop-blur-sm border-r border-gray-200 flex flex-col
          transform transition-transform duration-300 ease-in-out
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}>
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="font-semibold flex items-center gap-2">
              <span>Témakörök</span>
            </h2>
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="md:hidden p-1 hover:bg-gray-100 rounded"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <CategoryTree
            categories={categories}
            selectedCategoryId={selectedCategoryId}
            onSelectCategory={(id) => {
              setSelectedCategoryId(id);
              setIsSidebarOpen(false);
            }}
            onDeleteCategory={() => {}}
          />
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            // Loading skeletons
            <div className="p-6 max-w-7xl mx-auto">
              <div className="mb-8">
                <Skeleton className="h-8 w-64 mb-4" />
                <div className="flex gap-4 overflow-hidden">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="min-w-[300px] space-y-3">
                      <Skeleton className="h-48 w-full" />
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                    </div>
                  ))}
                </div>
              </div>
              <div className="mb-8">
                <Skeleton className="h-8 w-64 mb-4" />
                <div className="flex gap-4 overflow-hidden">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="min-w-[300px] space-y-3">
                      <Skeleton className="h-48 w-full" />
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : !selectedCategoryId ? (
            // Landing page with featured content
            <div className="p-3 md:p-6 max-w-7xl mx-auto">
              {/* Continue Where You Left Off */}
              {inProgressPresentations.length > 0 && (
                <div className="mb-6 md:mb-8">
                  <div className="flex items-center gap-2 mb-3 md:mb-4">
                    <PlayCircle className="h-5 w-5 md:h-6 md:w-6 text-green-500" />
                    <h3 className="text-xl md:text-2xl font-bold text-gray-900">Folytasd, ahol abbahagytad</h3>
                  </div>
                  <div className="flex gap-3 md:gap-4 overflow-x-auto pb-4 scrollbar-hide">
                    {inProgressPresentations.map((progress) => (
                      <InProgressCard key={progress.id} progress={progress} />
                    ))}
                  </div>
                </div>
              )}

              {/* Popular Presentations */}
              {filteredPopularPresentations.length > 0 && (
                <div className="mb-6 md:mb-8">
                  <div className="flex items-center gap-2 mb-3 md:mb-4">
                    <TrendingUp className="h-5 w-5 md:h-6 md:w-6 text-orange-500" />
                    <h3 className="text-xl md:text-2xl font-bold text-gray-900">Népszerű tananyagok</h3>
                  </div>
                  <HorizontalScrollCarousel
                    title=""
                    presentations={filteredPopularPresentations}
                  />
                </div>
              )}

              {/* Recent Presentations */}
              {filteredRecentPresentations.length > 0 && (
                <div className="mb-8">
                  <div className="flex items-center gap-2 mb-4">
                    <Clock className="h-6 w-6 text-blue-500" />
                    <h3 className="text-2xl font-bold text-gray-900">Legújabb tananyagok</h3>
                  </div>
                  <HorizontalScrollCarousel
                    title=""
                    presentations={filteredRecentPresentations}
                  />
                </div>
              )}

              {/* All Presentations */}
              <div className="mt-12">
                <h3 className="text-2xl font-bold text-gray-900 mb-6">Összes tananyag</h3>
                <PresentationGrid presentations={filteredPresentations} />
              </div>
            </div>
          ) : (
            // Category filtered view
            <div className="p-6">
              <PresentationGrid presentations={filteredPresentations} />
            </div>
          )}
        </div>
      </div>

      {/* Login Dialog */}
      <ViewerLoginDialog 
        open={showLoginDialog} 
        onClose={() => setShowLoginDialog(false)} 
      />

      {/* Register Dialog */}
      <ViewerRegisterDialog 
        open={showRegisterDialog} 
        onClose={() => setShowRegisterDialog(false)} 
      />
    </div>
  );
}
