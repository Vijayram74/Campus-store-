import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { itemAPI, categoryAPI } from '../lib/api';
import Layout from '../components/Layout';
import ItemCard from '../components/ItemCard';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { 
  Search, Filter, SlidersHorizontal, X, Package, Loader2,
  BookOpen, Laptop, Sofa, Shirt, Dumbbell, Music, 
  Refrigerator
} from 'lucide-react';
import { toast } from 'sonner';

const CATEGORY_ICONS = {
  textbooks: BookOpen,
  electronics: Laptop,
  furniture: Sofa,
  clothing: Shirt,
  sports: Dumbbell,
  instruments: Music,
  appliances: Refrigerator,
  other: Package
};

const CONDITIONS = [
  { value: 'new', label: 'New' },
  { value: 'like_new', label: 'Like New' },
  { value: 'good', label: 'Good' },
  { value: 'fair', label: 'Fair' },
  { value: 'poor', label: 'Poor' }
];

export default function BrowsePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  // Filters
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [mode, setMode] = useState(searchParams.get('mode') || 'all');
  const [category, setCategory] = useState(searchParams.get('category') || 'all');
  const [condition, setCondition] = useState(searchParams.get('condition') || '');

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchItems();
  }, [mode, category, condition]);

  const fetchCategories = async () => {
    try {
      const response = await categoryAPI.getAll();
      setCategories(response.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchItems = async () => {
    try {
      setLoading(true);
      const params = {};
      if (mode && mode !== 'all') params.mode = mode;
      if (category && category !== 'all') params.category = category;
      if (condition) params.condition = condition;
      if (search) params.search = search;

      const response = await itemAPI.getAll(params);
      setItems(response.data);
    } catch (error) {
      toast.error('Failed to load items');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchItems();
  };

  const clearFilters = () => {
    setSearch('');
    setMode('all');
    setCategory('all');
    setCondition('');
    setSearchParams({});
  };

  const hasActiveFilters = mode !== 'all' || category !== 'all' || condition || search;

  return (
    <Layout>
      <div className="page-content">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Browse Items</h1>
            <p className="text-slate-500 text-sm mt-1">
              {items.length} items available on campus
            </p>
          </div>
          <div className="toggle-group">
            <button 
              className={`toggle-btn ${mode === 'all' ? 'active buy' : ''}`}
              onClick={() => setMode('all')}
              data-testid="browse-mode-all"
            >
              All
            </button>
            <button 
              className={`toggle-btn ${mode === 'buy' ? 'active buy' : ''}`}
              onClick={() => setMode('buy')}
              data-testid="browse-mode-buy"
            >
              Buy
            </button>
            <button 
              className={`toggle-btn ${mode === 'borrow' ? 'active borrow' : ''}`}
              onClick={() => setMode('borrow')}
              data-testid="browse-mode-borrow"
            >
              Borrow
            </button>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <form onSubmit={handleSearch} className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input
              type="text"
              placeholder="Search items..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-12 h-12 rounded-xl"
              data-testid="browse-search-input"
            />
          </form>
          <div className="flex gap-3">
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-[160px]" data-testid="browse-category-select">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={condition} onValueChange={setCondition}>
              <SelectTrigger className="w-[140px]" data-testid="browse-condition-select">
                <SelectValue placeholder="Condition" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Any Condition</SelectItem>
                {CONDITIONS.map((c) => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Active Filters */}
        {hasActiveFilters && (
          <div className="flex items-center gap-2 mb-6 flex-wrap">
            <span className="text-sm text-slate-500">Active filters:</span>
            {mode !== 'all' && (
              <span className={`filter-pill active ${mode === 'buy' ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700'}`}>
                {mode === 'buy' ? 'For Sale' : 'For Rent'}
              </span>
            )}
            {category !== 'all' && (
              <span className="filter-pill active">
                {categories.find(c => c.id === category)?.name || category}
              </span>
            )}
            {condition && (
              <span className="filter-pill active">
                {CONDITIONS.find(c => c.value === condition)?.label}
              </span>
            )}
            {search && (
              <span className="filter-pill active">"{search}"</span>
            )}
            <button 
              onClick={clearFilters}
              className="text-sm text-red-500 hover:underline flex items-center gap-1"
              data-testid="clear-filters-btn"
            >
              <X className="w-4 h-4" /> Clear all
            </button>
          </div>
        )}

        {/* Category Pills */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-4 mb-6">
          <button
            onClick={() => setCategory('all')}
            className={`filter-pill ${category === 'all' ? 'active' : ''}`}
            data-testid="category-pill-all"
          >
            All
          </button>
          {categories.map((cat) => {
            const Icon = CATEGORY_ICONS[cat.id] || Package;
            return (
              <button
                key={cat.id}
                onClick={() => setCategory(cat.id)}
                className={`filter-pill flex items-center gap-2 ${category === cat.id ? 'active' : ''}`}
                data-testid={`category-pill-${cat.id}`}
              >
                <Icon className="w-4 h-4" />
                {cat.name}
              </button>
            );
          })}
        </div>

        {/* Items Grid */}
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : items.length > 0 ? (
          <div className="product-grid">
            {items.map((item) => (
              <ItemCard key={item.id} item={item} />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <Package className="empty-state-icon" />
            <h3 className="empty-state-title">No items found</h3>
            <p className="empty-state-text">
              Try adjusting your filters or search terms.
            </p>
            <button 
              onClick={clearFilters}
              className="btn-primary mt-4"
              data-testid="empty-clear-filters"
            >
              Clear Filters
            </button>
          </div>
        )}
      </div>
    </Layout>
  );
}
