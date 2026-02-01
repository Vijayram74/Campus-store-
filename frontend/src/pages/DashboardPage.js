import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { itemAPI, categoryAPI, statsAPI } from '../lib/api';
import Layout from '../components/Layout';
import ItemCard from '../components/ItemCard';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { 
  Search, Plus, TrendingUp, ShoppingBag, Clock, 
  BookOpen, Laptop, Sofa, Shirt, Dumbbell, Music, 
  Refrigerator, Package, ArrowRight, Loader2
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

export default function DashboardPage() {
  const { user } = useAuth();
  const [mode, setMode] = useState('all');
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [stats, setStats] = useState(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [mode]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [itemsRes, categoriesRes, statsRes] = await Promise.all([
        itemAPI.getAll({ mode: mode !== 'all' ? mode : undefined }),
        categoryAPI.getAll(),
        statsAPI.getDashboard()
      ]);
      setItems(itemsRes.data);
      setCategories(categoriesRes.data);
      setStats(statsRes.data);
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const response = await itemAPI.getAll({ 
        mode: mode !== 'all' ? mode : undefined,
        search: search || undefined 
      });
      setItems(response.data);
    } catch (error) {
      toast.error('Search failed');
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = items.slice(0, 8);

  return (
    <Layout>
      <div className="page-content">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">
            Welcome back, {user?.name?.split(' ')[0]}! 👋
          </h1>
          <p className="text-slate-500 mt-1">
            Find what you need from {user?.college_name || 'your campus'}
          </p>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                  <Package className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">{stats.items_listed}</p>
                  <p className="text-xs text-slate-500">Listed</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
                  <ShoppingBag className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">{stats.items_bought}</p>
                  <p className="text-xs text-slate-500">Bought</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">{stats.items_borrowed}</p>
                  <p className="text-xs text-slate-500">Borrowed</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">${stats.total_earnings}</p>
                  <p className="text-xs text-slate-500">Earned</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Search & Mode Toggle */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <form onSubmit={handleSearch} className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input
              type="text"
              placeholder="Search items..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-12 h-12 rounded-xl"
              data-testid="dashboard-search-input"
            />
          </form>
          <div className="toggle-group self-start">
            <button 
              className={`toggle-btn ${mode === 'all' ? 'active buy' : ''}`}
              onClick={() => setMode('all')}
              data-testid="mode-all-btn"
            >
              All
            </button>
            <button 
              className={`toggle-btn ${mode === 'buy' ? 'active buy' : ''}`}
              onClick={() => setMode('buy')}
              data-testid="mode-buy-btn"
            >
              Buy
            </button>
            <button 
              className={`toggle-btn ${mode === 'borrow' ? 'active borrow' : ''}`}
              onClick={() => setMode('borrow')}
              data-testid="mode-borrow-btn"
            >
              Borrow
            </button>
          </div>
        </div>

        {/* Categories */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900">Categories</h2>
            <Link to="/browse" className="text-sm text-blue-600 font-medium hover:underline">
              View All
            </Link>
          </div>
          <div className="grid grid-cols-4 md:grid-cols-8 gap-3">
            {categories.map((cat) => {
              const Icon = CATEGORY_ICONS[cat.id] || Package;
              return (
                <Link
                  key={cat.id}
                  to={`/browse?category=${cat.id}`}
                  className="category-card p-3"
                  data-testid={`category-${cat.id}`}
                >
                  <Icon className="w-6 h-6 text-slate-600" />
                  <span className="text-xs font-medium text-slate-600 mt-1 text-center truncate w-full">
                    {cat.name}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Featured Items */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900">
              {mode === 'borrow' ? 'Available to Borrow' : mode === 'buy' ? 'For Sale' : 'Recently Listed'}
            </h2>
            <Link 
              to="/browse" 
              className="text-sm text-blue-600 font-medium hover:underline flex items-center gap-1"
            >
              See All <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : filteredItems.length > 0 ? (
            <div className="product-grid">
              {filteredItems.map((item) => (
                <ItemCard key={item.id} item={item} />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <Package className="empty-state-icon" />
              <h3 className="empty-state-title">No items found</h3>
              <p className="empty-state-text">
                Be the first to list something on your campus!
              </p>
              <Link to="/list-item">
                <Button className="btn-primary mt-4" data-testid="list-item-btn">
                  <Plus className="w-4 h-4 mr-2" /> List an Item
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-6 md:p-8 text-white">
          <h3 className="text-xl font-bold">Have something to sell or lend?</h3>
          <p className="text-blue-100 mt-2">
            List your items and start earning from fellow students.
          </p>
          <Link to="/list-item">
            <Button 
              className="mt-4 bg-white text-blue-600 hover:bg-blue-50"
              data-testid="cta-list-item-btn"
            >
              <Plus className="w-4 h-4 mr-2" /> List an Item
            </Button>
          </Link>
        </div>
      </div>
    </Layout>
  );
}
