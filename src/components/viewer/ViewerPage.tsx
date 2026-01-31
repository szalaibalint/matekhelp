import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Category, loadCategories } from '../../services/CategoryService';
import { Presentation, loadPresentations } from '../../services/PresentationService';
import { getPopularPresentations, getRecentPresentations } from '../../services/PresentationTrackingService';
import { UserProgressService, UserProgress } from '../../services/UserProgressService';
import { ViewerLoginDialog } from './ViewerLoginDialog';
import { ViewerRegisterDialog } from './ViewerRegisterDialog';
import { useViewerAuth } from '../../contexts/ViewerAuthContext';
import { 
  BookOpen, TrendingUp, Clock, User, LogOut, Search, PlayCircle, 
  Menu, X, Trophy, ChevronRight, Sparkles, Eye,
  GraduationCap, Folder, Play, Star, ArrowRight, Home
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Skeleton } from '../ui/skeleton';
import { Badge } from '../ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '../ui/dropdown-menu';
import { useToast } from '../ui/use-toast';

// Color palette for categories - softer, professional tones with variety
const CATEGORY_COLORS = [
  { bg: 'bg-gradient-to-br from-slate-500 to-slate-700', light: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-200', hover: 'hover:from-slate-600 hover:to-slate-800' },
  { bg: 'bg-gradient-to-br from-sky-400 to-sky-600', light: 'bg-sky-50', text: 'text-sky-600', border: 'border-sky-200', hover: 'hover:from-sky-500 hover:to-sky-700' },
  { bg: 'bg-gradient-to-br from-teal-400 to-teal-600', light: 'bg-teal-50', text: 'text-teal-600', border: 'border-teal-200', hover: 'hover:from-teal-500 hover:to-teal-700' },
  { bg: 'bg-gradient-to-br from-indigo-400 to-indigo-600', light: 'bg-indigo-50', text: 'text-indigo-600', border: 'border-indigo-200', hover: 'hover:from-indigo-500 hover:to-indigo-700' },
  { bg: 'bg-gradient-to-br from-zinc-400 to-zinc-600', light: 'bg-zinc-50', text: 'text-zinc-600', border: 'border-zinc-200', hover: 'hover:from-zinc-500 hover:to-zinc-700' },
  { bg: 'bg-gradient-to-br from-cyan-400 to-cyan-600', light: 'bg-cyan-50', text: 'text-cyan-600', border: 'border-cyan-200', hover: 'hover:from-cyan-500 hover:to-cyan-700' },
  { bg: 'bg-gradient-to-br from-blue-400 to-blue-600', light: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200', hover: 'hover:from-blue-500 hover:to-blue-700' },
  { bg: 'bg-gradient-to-br from-stone-400 to-stone-600', light: 'bg-stone-50', text: 'text-stone-600', border: 'border-stone-200', hover: 'hover:from-stone-500 hover:to-stone-700' },
];

const getCategoryColor = (index: number) => CATEGORY_COLORS[index % CATEGORY_COLORS.length];

// Category Icon Component
const CategoryIcon = ({ name, className = "h-8 w-8" }: { name: string; className?: string }) => {
  const icons: Record<string, JSX.Element> = {
    'matematika': <span className={className}>Σ</span>,
    'fizika': <span className={className}>⚛</span>,
    'kémia': <span className={className}>🧪</span>,
    'biológia': <span className={className}>🧬</span>,
    'irodalom': <span className={className}>📚</span>,
    'történelem': <span className={className}>🏛</span>,
    'földrajz': <span className={className}>🌍</span>,
    'informatika': <span className={className}>💻</span>,
  };
  const key = name.toLowerCase();
  for (const [k, icon] of Object.entries(icons)) {
    if (key.includes(k)) return icon;
  }
  return <GraduationCap className={className} />;
};

export default function ViewerPage() {
  const { user, isLoggedIn, logout } = useViewerAuth();
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [presentations, setPresentations] = useState<Presentation[]>([]);
  const [popularPresentations, setPopularPresentations] = useState<Presentation[]>([]);
  const [recentPresentations, setRecentPresentations] = useState<Presentation[]>([]);
  const [inProgressPresentations, setInProgressPresentations] = useState<UserProgress[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showLoginDialog, setShowLoginDialog] = useState(false);
  const [showRegisterDialog, setShowRegisterDialog] = useState(false);
  const [categoryMap, setCategoryMap] = useState<Map<string, string>>(new Map());
  const [categoryColorMap, setCategoryColorMap] = useState<Map<string, typeof CATEGORY_COLORS[0]>>(new Map());
  const { toast } = useToast();

  // Build category maps - recursive to handle any depth
  useEffect(() => {
    const nameMap = new Map<string, string>();
    const colorMap = new Map<string, typeof CATEGORY_COLORS[0]>();
    
    const mapCategory = (cat: Category, color: typeof CATEGORY_COLORS[0]) => {
      nameMap.set(cat.id, cat.name);
      colorMap.set(cat.id, color);
      if (cat.children) {
        cat.children.forEach((child) => {
          mapCategory(child, color); // Recursively map all descendants with parent's color
        });
      }
    };
    
    categories.forEach((cat, index) => {
      mapCategory(cat, getCategoryColor(index));
    });
    
    setCategoryMap(nameMap);
    setCategoryColorMap(colorMap);
  }, [categories]);

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
    try {
      const categoryTree = await loadCategories();
      setCategories(categoryTree);
    } catch (error: any) {
      toast({
        title: 'Betöltési hiba',
        description: 'Nem sikerült betölteni a témaköröket',
        variant: 'destructive',
      });
    }
  };

  const fetchFeaturedPresentations = async () => {
    try {
      setIsLoading(true);
      const [popular, recent] = await Promise.all([
        getPopularPresentations(12),
        getRecentPresentations(12)
      ]);
      setPopularPresentations(popular);
      setRecentPresentations(recent);
    } catch (error: any) {
      toast({
        title: 'Betöltési hiba',
        description: 'Nem sikerült betölteni a tananyagokat',
        variant: 'destructive',
      });
    }
  };

  const fetchPresentations = async () => {
    try {
      const data = await loadPresentations(selectedCategoryId, categories);
      setPresentations(data.filter(p => p.status === 'published'));
      setIsLoading(false);
    } catch (error: any) {
      setIsLoading(false);
      toast({
        title: 'Betöltési hiba',
        description: 'Nem sikerült betölteni a tananyagokat',
        variant: 'destructive',
      });
    }
  };

  const findCategoryById = (cats: Category[], id: string): Category | null => {
    for (const cat of cats) {
      if (cat.id === id) return cat;
      if (cat.children) {
        const found = findCategoryById(cat.children, id);
        if (found) return found;
      }
    }
    return null;
  };

  // Build full path to category for breadcrumb
  const buildCategoryPath = (cats: Category[], targetId: string, path: Category[] = []): Category[] | null => {
    for (const cat of cats) {
      if (cat.id === targetId) {
        return [...path, cat];
      }
      if (cat.children) {
        const found = buildCategoryPath(cat.children, targetId, [...path, cat]);
        if (found) return found;
      }
    }
    return null;
  };

  const selectedCategory = selectedCategoryId ? findCategoryById(categories, selectedCategoryId) : null;
  const categoryPath = selectedCategoryId ? buildCategoryPath(categories, selectedCategoryId) : null;

  // Filter presentations - only show direct children of selected category (not from subcategories)
  const filteredPresentations = presentations.filter(p => {
    // When a category is selected, only show presentations directly in that category
    if (selectedCategoryId && p.category_id !== selectedCategoryId) return false;
    
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      p.title?.toLowerCase().includes(query) ||
      p.description?.toLowerCase().includes(query)
    );
  });

  const filteredPopular = popularPresentations.filter(p => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return p.title?.toLowerCase().includes(query) || p.description?.toLowerCase().includes(query);
  });

  const filteredRecent = recentPresentations.filter(p => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return p.title?.toLowerCase().includes(query) || p.description?.toLowerCase().includes(query);
  });

  // Continue Learning Card
  const ContinueLearningCard = ({ progress }: { progress: UserProgress }) => {
    // Use a consistent color for continue learning cards
    const color = CATEGORY_COLORS[2]; // Teal color for continue learning
    
    return (
      <div 
        onClick={() => navigate(`/${progress.presentation_id}`)}
        className="group relative min-w-[280px] md:min-w-[320px] rounded-2xl overflow-hidden cursor-pointer transform transition-all duration-300 hover:scale-[1.02] hover:shadow-xl"
      >
        <div className={`${color.bg} p-5 h-full`}>
          <div className="flex items-start justify-between mb-3">
            <div className="bg-white/20 backdrop-blur-sm rounded-full px-3 py-1">
              <span className="text-white text-xs font-medium">Folytatás</span>
            </div>
            <PlayCircle className="h-8 w-8 text-white/80 group-hover:text-white transition-colors" />
          </div>
          
          <h3 className="text-white font-bold text-lg mb-2 line-clamp-2">
            {progress.presentation?.title || 'Tananyag'}
          </h3>
          
          <div className="mt-4">
            <div className="flex justify-between text-white/80 text-xs mb-1">
              <span>Haladás</span>
              <span>{progress.progress_percentage}%</span>
            </div>
            <div className="h-2 bg-white/30 rounded-full overflow-hidden">
              <div 
                className="h-full bg-white rounded-full transition-all duration-500"
                style={{ width: `${progress.progress_percentage}%` }}
              />
            </div>
          </div>
          
          <div className="mt-4 flex items-center gap-2 text-white/70 text-sm">
            <Clock className="h-4 w-4" />
            <span>Dia {progress.last_slide_index + 1}</span>
          </div>
        </div>
      </div>
    );
  };

  // Featured Presentation Card
  const FeaturedCard = ({ presentation, rank }: { presentation: Presentation; rank?: number }) => {
    const color = categoryColorMap.get(presentation.category_id || '') || CATEGORY_COLORS[0];
    
    return (
      <div 
        onClick={() => navigate(`/${presentation.id}`)}
        className="group relative min-w-[260px] md:min-w-[300px] rounded-2xl overflow-hidden cursor-pointer transform transition-all duration-300 hover:scale-[1.02] hover:shadow-xl"
      >
        <div className={`${color.bg} ${color.hover} transition-all duration-300`}>
          <div className="p-5 pb-16 relative">
            {rank && (
              <div className="absolute top-4 right-4 bg-white/20 backdrop-blur-sm rounded-full h-10 w-10 flex items-center justify-center">
                <span className="text-white font-bold text-lg">#{rank}</span>
              </div>
            )}
            
            <div className="text-white/70 text-4xl mb-3">
              <CategoryIcon name={categoryMap.get(presentation.category_id || '') || ''} className="h-12 w-12" />
            </div>
            
            <h3 className="text-white font-bold text-lg line-clamp-2 mb-2">
              {presentation.title}
            </h3>
            
            <p className="text-white/70 text-sm line-clamp-2">
              {presentation.description || 'Interaktív tananyag'}
            </p>
          </div>
          
          <div className="absolute bottom-0 left-0 right-0 bg-slate-800/95 px-5 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-white text-sm">
              <Eye className="h-4 w-4" />
              <span>Tananyag</span>
            </div>
            <ArrowRight className="h-5 w-5 text-white group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </div>
    );
  };

  // Category Card
  const CategoryCard = ({ category, index }: { category: Category; index: number }) => {
    const color = getCategoryColor(index);
    
    return (
      <div 
        onClick={() => setSelectedCategoryId(category.id)}
        className={`group relative rounded-2xl overflow-hidden cursor-pointer transform transition-all duration-300 hover:scale-[1.02] hover:shadow-xl ${color.bg} ${color.hover}`}
      >
        <div className="p-6 md:p-8">
          <div className="text-white/80 text-5xl md:text-6xl mb-4">
            <CategoryIcon name={category.name} className="h-14 w-14 md:h-16 md:w-16" />
          </div>
          
          <h3 className="text-white font-bold text-xl md:text-2xl mb-2">
            {category.name}
          </h3>
          
          <p className="text-white/70 text-sm mb-4 line-clamp-2">
            {category.description || 'Fedezd fel a tananyagokat'}
          </p>
          
          <div className="flex items-center gap-2 text-white/60 text-sm">
            <Folder className="h-4 w-4" />
            <span>{category.children?.length || 0} alkategória</span>
          </div>
        </div>
        
        <div className="absolute bottom-4 right-4">
          <div className="bg-white/20 backdrop-blur-sm rounded-full p-2 group-hover:bg-white/30 transition-colors">
            <ChevronRight className="h-5 w-5 text-white group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>
      </div>
    );
  };

  // Presentation Card for Grid
  const PresentationCard = ({ presentation }: { presentation: Presentation }) => {
    const color = categoryColorMap.get(presentation.category_id || '') || CATEGORY_COLORS[0];
    
    return (
      <div 
        onClick={() => navigate(`/${presentation.id}`)}
        className={`group relative rounded-2xl overflow-hidden cursor-pointer bg-white border ${color.border} hover:shadow-lg transition-all duration-300`}
      >
        <div className={`h-2 ${color.bg}`} />
        <div className="p-5">
          <div className="flex items-start justify-between mb-3">
            <Badge className={`${color.light} ${color.text} border-0`}>
              {categoryMap.get(presentation.category_id || '') || 'Tananyag'}
            </Badge>
          </div>
          
          <h3 className="font-bold text-gray-900 mb-2 line-clamp-2 group-hover:text-gray-700 transition-colors">
            {presentation.title}
          </h3>
          
          <p className="text-gray-500 text-sm line-clamp-2 mb-4">
            {presentation.description || 'Interaktív tananyag'}
          </p>
          
          <div className="flex items-center justify-end">
            <Button size="sm" className={`${color.bg} ${color.hover} text-white border-0`}>
              <Play className="h-4 w-4 mr-1" />
              Indítás
            </Button>
          </div>
        </div>
      </div>
    );
  };

  // Subcategory Card
  const SubcategoryCard = ({ category }: { category: Category }) => {
    const color = categoryColorMap.get(category.id) || CATEGORY_COLORS[0];
    
    return (
      <div 
        onClick={() => setSelectedCategoryId(category.id)}
        className={`group rounded-2xl overflow-hidden cursor-pointer bg-white border ${color.border} hover:shadow-lg transition-all duration-300`}
      >
        <div className={`h-2 ${color.bg}`} />
        <div className="p-5 flex items-center gap-4">
          <div className={`rounded-xl ${color.light} p-3`}>
            <Folder className={`h-6 w-6 ${color.text}`} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 truncate">{category.name}</h3>
            <p className="text-sm text-gray-500 truncate">{category.description || 'Alkategória'}</p>
          </div>
          <ChevronRight className={`h-5 w-5 ${color.text} group-hover:translate-x-1 transition-transform`} />
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div 
              className="flex items-center gap-3 cursor-pointer" 
              onClick={() => { setSelectedCategoryId(null); setSearchQuery(''); }}
            >
              <div className="bg-gradient-to-br from-slate-500 to-slate-700 rounded-xl p-2">
                <BookOpen className="h-6 w-6 text-white" />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-xl font-bold bg-gradient-to-r from-slate-600 to-slate-800 bg-clip-text text-transparent">
                  MatekHelp
                </h1>
                <p className="text-xs text-gray-500 -mt-0.5">Interaktív tananyagok</p>
              </div>
            </div>

            {/* Desktop Search */}
            <div className="hidden md:flex flex-1 max-w-xl mx-8">
              <div className="relative w-full">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Keresés tananyagok között..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-12 h-11 rounded-full bg-gray-50 border-gray-200 focus:bg-white"
                />
              </div>
            </div>

            {/* Auth & Menu */}
            <div className="flex items-center gap-3">
              {isLoggedIn ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="flex items-center gap-2 rounded-full">
                      <div className="bg-gradient-to-br from-slate-500 to-slate-700 rounded-full p-1.5">
                        <User className="h-4 w-4 text-white" />
                      </div>
                      <span className="hidden sm:inline font-medium">{user?.username}</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <div className="px-3 py-2">
                      <p className="font-medium">{user?.full_name || user?.username}</p>
                      <p className="text-xs text-gray-500">{user?.email}</p>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => navigate('/progress')}>
                      <Trophy className="h-4 w-4 mr-2 text-amber-500" />
                      Haladásom
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={logout} className="text-red-600">
                      <LogOut className="h-4 w-4 mr-2" />
                      Kijelentkezés
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <div className="flex items-center gap-2">
                  <Button variant="ghost" onClick={() => setShowLoginDialog(true)} className="rounded-full">
                    Bejelentkezés
                  </Button>
                  <Button onClick={() => setShowRegisterDialog(true)} className="rounded-full bg-gradient-to-r from-slate-500 to-slate-700 hover:from-slate-600 hover:to-slate-800">
                    Regisztráció
                  </Button>
                </div>
              )}
              
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden p-2 hover:bg-gray-100 rounded-full"
              >
                {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>

          {/* Mobile Search */}
          <div className="md:hidden pb-3">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                type="text"
                placeholder="Keresés..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 h-11 rounded-full bg-gray-50"
              />
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-black/50" onClick={() => setIsMobileMenuOpen(false)}>
          <div className="absolute right-0 top-0 bottom-0 w-80 bg-white shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b">
              <h2 className="font-semibold">Témakörök</h2>
            </div>
            <div className="p-4 space-y-2 overflow-y-auto h-full pb-20">
              <button
                onClick={() => { setSelectedCategoryId(null); setIsMobileMenuOpen(false); }}
                className={`w-full text-left p-3 rounded-xl flex items-center gap-3 ${!selectedCategoryId ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-50'}`}
              >
                <Home className="h-5 w-5" />
                Főoldal
              </button>
              {categories.map((cat, index) => (
                <button
                  key={cat.id}
                  onClick={() => { setSelectedCategoryId(cat.id); setIsMobileMenuOpen(false); }}
                  className={`w-full text-left p-3 rounded-xl flex items-center gap-3 ${selectedCategoryId === cat.id ? getCategoryColor(index).light + ' ' + getCategoryColor(index).text : 'hover:bg-gray-50'}`}
                >
                  <div className={`rounded-lg p-1.5 ${getCategoryColor(index).bg}`}>
                    <CategoryIcon name={cat.name} className="h-4 w-4 text-white" />
                  </div>
                  {cat.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Breadcrumb */}
      {selectedCategoryId && categoryPath && (
        <div className="bg-white border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <div className="flex items-center gap-2 text-sm flex-wrap">
              <button onClick={() => setSelectedCategoryId(null)} className="text-gray-500 hover:text-gray-700 flex items-center gap-1">
                <Home className="h-4 w-4" />
                Főoldal
              </button>
              {categoryPath.map((cat, index) => (
                <span key={cat.id} className="flex items-center gap-2">
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                  {index === categoryPath.length - 1 ? (
                    <span className="font-medium text-gray-900">{cat.name}</span>
                  ) : (
                    <button 
                      onClick={() => setSelectedCategoryId(cat.id)} 
                      className="text-gray-500 hover:text-gray-700"
                    >
                      {cat.name}
                    </button>
                  )}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
        {isLoading ? (
          // Loading State
          <div className="space-y-8">
            <div>
              <Skeleton className="h-8 w-48 mb-4" />
              <div className="flex gap-4 overflow-hidden">
                {[1, 2, 3, 4].map(i => (
                  <Skeleton key={i} className="min-w-[300px] h-48 rounded-2xl" />
                ))}
              </div>
            </div>
            <div>
              <Skeleton className="h-8 w-48 mb-4" />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3, 4, 5, 6].map(i => (
                  <Skeleton key={i} className="h-48 rounded-2xl" />
                ))}
              </div>
            </div>
          </div>
        ) : !selectedCategoryId ? (
          // Home Page
          <div className="space-y-10">
            {/* Hero Section */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-600 via-slate-700 to-zinc-700 p-8 md:p-12">
              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLW9wYWNpdHk9IjAuMSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-50" />
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="h-6 w-6 text-yellow-300" />
                  <span className="text-white/90 font-medium">Üdvözlünk a MatekHelp-en!</span>
                </div>
                <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-6">
                  Tanulj interaktív módon
                </h1>
                {!isLoggedIn && (
                  <Button 
                    onClick={() => setShowRegisterDialog(true)}
                    size="lg"
                    className="bg-white text-slate-700 hover:bg-gray-100 rounded-full font-semibold"
                  >
                    Kezdj el tanulni
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                )}
              </div>
            </div>

            {/* Continue Learning */}
            {inProgressPresentations.length > 0 && (
              <section>
                <div className="flex items-center gap-3 mb-5">
                  <div className="bg-green-100 rounded-xl p-2">
                    <PlayCircle className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <h2 className="text-xl md:text-2xl font-bold text-gray-900">Folytasd a tanulást</h2>
                    <p className="text-sm text-gray-500">Ott folytathatod, ahol abbahagytad</p>
                  </div>
                </div>
                <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide -mx-4 px-4">
                  {inProgressPresentations.map(progress => (
                    <ContinueLearningCard key={progress.id} progress={progress} />
                  ))}
                </div>
              </section>
            )}

            {/* Categories - Now right after Continue Learning */}
            <section>
              <div className="flex items-center gap-3 mb-5">
                <div className="bg-slate-100 rounded-xl p-2">
                  <Folder className="h-6 w-6 text-slate-600" />
                </div>
                <div>
                  <h2 className="text-xl md:text-2xl font-bold text-gray-900">Témakörök</h2>
                  <p className="text-sm text-gray-500">Böngéssz a tantárgyak között</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {categories.map((cat, index) => (
                  <CategoryCard key={cat.id} category={cat} index={index} />
                ))}
              </div>
            </section>

            {/* Popular */}
            {filteredPopular.length > 0 && (
              <section>
                <div className="flex items-center gap-3 mb-5">
                  <div className="bg-amber-100 rounded-xl p-2">
                    <TrendingUp className="h-6 w-6 text-amber-600" />
                  </div>
                  <div>
                    <h2 className="text-xl md:text-2xl font-bold text-gray-900">Népszerű tananyagok</h2>
                    <p className="text-sm text-gray-500">A legtöbbet megtekintett tartalmak</p>
                  </div>
                </div>
                <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide -mx-4 px-4">
                  {filteredPopular.slice(0, 8).map((p, i) => (
                    <FeaturedCard key={p.id} presentation={p} rank={i + 1} />
                  ))}
                </div>
              </section>
            )}

            {/* Recent */}
            {filteredRecent.length > 0 && (
              <section>
                <div className="flex items-center gap-3 mb-5">
                  <div className="bg-blue-100 rounded-xl p-2">
                    <Clock className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-xl md:text-2xl font-bold text-gray-900">Legújabb tananyagok</h2>
                    <p className="text-sm text-gray-500">Frissen hozzáadott tartalmak</p>
                  </div>
                </div>
                <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide -mx-4 px-4">
                  {filteredRecent.slice(0, 8).map(p => (
                    <FeaturedCard key={p.id} presentation={p} />
                  ))}
                </div>
              </section>
            )}
          </div>
        ) : (
          // Category View
          <div className="space-y-8">
            {/* Category Header */}
            <div className={`rounded-3xl p-8 ${categoryColorMap.get(selectedCategoryId)?.bg || CATEGORY_COLORS[0].bg}`}>
              <div className="text-white/80 text-5xl mb-4">
                <CategoryIcon name={selectedCategory?.name || ''} className="h-14 w-14" />
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
                {selectedCategory?.name}
              </h1>
              <p className="text-white/80">
                {selectedCategory?.description || 'Fedezd fel a tananyagokat'}
              </p>
            </div>

            {/* Subcategories */}
            {selectedCategory?.children && selectedCategory.children.length > 0 && (
              <section>
                <h2 className="text-xl font-bold text-gray-900 mb-4">Alkategóriák</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {selectedCategory.children.map(child => (
                    <SubcategoryCard 
                      key={child.id} 
                      category={child} 
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Presentations */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Tananyagok ({filteredPresentations.length})
              </h2>
              {filteredPresentations.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredPresentations.map(p => (
                    <PresentationCard key={p.id} presentation={p} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 bg-white rounded-2xl">
                  <GraduationCap className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Nincs elérhető tananyag</h3>
                  <p className="text-gray-500">Ebben a kategóriában még nincsenek tananyagok</p>
                </div>
              )}
            </section>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-slate-500 to-slate-700 rounded-xl p-2">
                <BookOpen className="h-5 w-5 text-white" />
              </div>
              <span className="font-semibold text-gray-900">MatekHelp</span>
            </div>
            <p className="text-sm text-gray-500">
              © 2026 MatekHelp. Minden jog fenntartva.
            </p>
          </div>
        </div>
      </footer>

      {/* Dialogs */}
      <ViewerLoginDialog open={showLoginDialog} onClose={() => setShowLoginDialog(false)} />
      <ViewerRegisterDialog open={showRegisterDialog} onClose={() => setShowRegisterDialog(false)} />
    </div>
  );
}
