import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { itemAPI, categoryAPI } from '../lib/api';
import Layout from '../components/Layout';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { RadioGroup, RadioGroupItem } from '../components/ui/radio-group';
import { ArrowLeft, Upload, X, Loader2, Plus, Image } from 'lucide-react';
import { toast } from 'sonner';

const CONDITIONS = [
  { value: 'new', label: 'New', description: 'Brand new, unused' },
  { value: 'like_new', label: 'Like New', description: 'Barely used, excellent condition' },
  { value: 'good', label: 'Good', description: 'Some wear, works perfectly' },
  { value: 'fair', label: 'Fair', description: 'Visible wear, fully functional' },
  { value: 'poor', label: 'Poor', description: 'Heavy wear, may need repairs' }
];

const PLACEHOLDER_IMAGES = [
  "https://images.unsplash.com/photo-1731983568664-9c1d8a87e7a2?w=400&q=80",
  "https://images.unsplash.com/photo-1650094983020-89c3dfa9ce0d?w=400&q=80",
  "https://images.unsplash.com/photo-1767800766055-1cdbd2e351b9?w=400&q=80"
];

export default function ListItemPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');
  
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetchingItem, setFetchingItem] = useState(!!editId);
  
  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [mode, setMode] = useState('both');
  const [priceBuy, setPriceBuy] = useState('');
  const [priceBorrow, setPriceBorrow] = useState('');
  const [deposit, setDeposit] = useState('');
  const [condition, setCondition] = useState('good');
  const [images, setImages] = useState([]);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    fetchCategories();
    if (editId) {
      fetchItem();
    }
  }, [editId]);

  const fetchCategories = async () => {
    try {
      const response = await categoryAPI.getAll();
      setCategories(response.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchItem = async () => {
    try {
      setFetchingItem(true);
      const response = await itemAPI.getOne(editId);
      const item = response.data;
      setTitle(item.title);
      setDescription(item.description);
      setCategory(item.category);
      setMode(item.mode);
      setPriceBuy(item.price_buy?.toString() || '');
      setPriceBorrow(item.price_borrow?.toString() || '');
      setDeposit(item.deposit?.toString() || '');
      setCondition(item.condition);
      setImages(item.images || []);
    } catch (error) {
      toast.error('Failed to load item');
      navigate('/my-listings');
    } finally {
      setFetchingItem(false);
    }
  };

  const addPlaceholderImage = () => {
    const unusedImages = PLACEHOLDER_IMAGES.filter(img => !images.includes(img));
    if (unusedImages.length > 0) {
      setImages([...images, unusedImages[0]]);
    }
  };

  const removeImage = (index) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const validate = () => {
    const newErrors = {};
    if (!title.trim()) newErrors.title = 'Title is required';
    if (!description.trim()) newErrors.description = 'Description is required';
    if (!category) newErrors.category = 'Category is required';
    
    if (mode === 'buy' || mode === 'both') {
      if (!priceBuy || parseFloat(priceBuy) <= 0) {
        newErrors.priceBuy = 'Valid buy price is required';
      }
    }
    
    if (mode === 'borrow' || mode === 'both') {
      if (!priceBorrow || parseFloat(priceBorrow) <= 0) {
        newErrors.priceBorrow = 'Valid rental price is required';
      }
      if (!deposit || parseFloat(deposit) < 0) {
        newErrors.deposit = 'Valid deposit is required';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      const itemData = {
        title,
        description,
        category,
        mode,
        condition,
        images,
        price_buy: (mode === 'buy' || mode === 'both') ? parseFloat(priceBuy) : null,
        price_borrow: (mode === 'borrow' || mode === 'both') ? parseFloat(priceBorrow) : null,
        deposit: (mode === 'borrow' || mode === 'both') ? parseFloat(deposit) : null
      };

      if (editId) {
        await itemAPI.update(editId, itemData);
        toast.success('Item updated successfully!');
      } else {
        await itemAPI.create(itemData);
        toast.success('Item listed successfully!');
      }
      navigate('/orders?tab=listed');
    } catch (error) {
      const message = error.response?.data?.detail || 'Failed to save item';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  if (fetchingItem) {
    return (
      <Layout>
        <div className="flex justify-center items-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="page-content max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button 
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-slate-100 rounded-lg"
            data-testid="back-btn"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              {editId ? 'Edit Listing' : 'List an Item'}
            </h1>
            <p className="text-slate-500 text-sm">
              {editId ? 'Update your item details' : 'Sell or rent out your stuff'}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Images */}
          <div className="form-group">
            <Label className="form-label">Photos</Label>
            <div className="flex flex-wrap gap-3 mt-2">
              {images.map((img, index) => (
                <div key={index} className="relative w-24 h-24 rounded-xl overflow-hidden border border-slate-200">
                  <img src={img} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {images.length < 5 && (
                <button
                  type="button"
                  onClick={addPlaceholderImage}
                  className="w-24 h-24 rounded-xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400 hover:border-blue-500 hover:text-blue-500"
                  data-testid="add-image-btn"
                >
                  <Image className="w-6 h-6" />
                  <span className="text-xs mt-1">Add</span>
                </button>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-2">Add up to 5 photos</p>
          </div>

          {/* Title */}
          <div className="form-group">
            <Label htmlFor="title" className="form-label">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., MacBook Pro 2023"
              className={errors.title ? 'border-red-500' : ''}
              data-testid="title-input"
            />
            {errors.title && <p className="form-error">{errors.title}</p>}
          </div>

          {/* Description */}
          <div className="form-group">
            <Label htmlFor="description" className="form-label">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your item, its condition, and any relevant details..."
              rows={4}
              className={errors.description ? 'border-red-500' : ''}
              data-testid="description-input"
            />
            {errors.description && <p className="form-error">{errors.description}</p>}
          </div>

          {/* Category */}
          <div className="form-group">
            <Label className="form-label">Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className={errors.category ? 'border-red-500' : ''} data-testid="category-select">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.category && <p className="form-error">{errors.category}</p>}
          </div>

          {/* Listing Mode */}
          <div className="form-group">
            <Label className="form-label">Listing Type</Label>
            <RadioGroup value={mode} onValueChange={setMode} className="grid grid-cols-3 gap-3 mt-2">
              <div>
                <RadioGroupItem value="buy" id="mode-buy" className="peer sr-only" />
                <Label
                  htmlFor="mode-buy"
                  className="flex flex-col items-center justify-center rounded-xl border-2 border-slate-200 bg-white p-4 cursor-pointer hover:border-blue-300 peer-data-[state=checked]:border-blue-500 peer-data-[state=checked]:bg-blue-50"
                  data-testid="mode-buy-option"
                >
                  <span className="font-semibold text-slate-900">Sell Only</span>
                  <span className="text-xs text-slate-500 mt-1">One-time sale</span>
                </Label>
              </div>
              <div>
                <RadioGroupItem value="borrow" id="mode-borrow" className="peer sr-only" />
                <Label
                  htmlFor="mode-borrow"
                  className="flex flex-col items-center justify-center rounded-xl border-2 border-slate-200 bg-white p-4 cursor-pointer hover:border-amber-300 peer-data-[state=checked]:border-amber-500 peer-data-[state=checked]:bg-amber-50"
                  data-testid="mode-borrow-option"
                >
                  <span className="font-semibold text-slate-900">Rent Only</span>
                  <span className="text-xs text-slate-500 mt-1">Temporary rental</span>
                </Label>
              </div>
              <div>
                <RadioGroupItem value="both" id="mode-both" className="peer sr-only" />
                <Label
                  htmlFor="mode-both"
                  className="flex flex-col items-center justify-center rounded-xl border-2 border-slate-200 bg-white p-4 cursor-pointer hover:border-emerald-300 peer-data-[state=checked]:border-emerald-500 peer-data-[state=checked]:bg-emerald-50"
                  data-testid="mode-both-option"
                >
                  <span className="font-semibold text-slate-900">Both</span>
                  <span className="text-xs text-slate-500 mt-1">Sell or rent</span>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Pricing */}
          <div className="space-y-4">
            {(mode === 'buy' || mode === 'both') && (
              <div className="form-group">
                <Label htmlFor="priceBuy" className="form-label">Selling Price ($)</Label>
                <Input
                  id="priceBuy"
                  type="number"
                  min="0"
                  step="0.01"
                  value={priceBuy}
                  onChange={(e) => setPriceBuy(e.target.value)}
                  placeholder="0.00"
                  className={errors.priceBuy ? 'border-red-500' : ''}
                  data-testid="price-buy-input"
                />
                {errors.priceBuy && <p className="form-error">{errors.priceBuy}</p>}
              </div>
            )}

            {(mode === 'borrow' || mode === 'both') && (
              <>
                <div className="form-group">
                  <Label htmlFor="priceBorrow" className="form-label">Rental Price per Day ($)</Label>
                  <Input
                    id="priceBorrow"
                    type="number"
                    min="0"
                    step="0.01"
                    value={priceBorrow}
                    onChange={(e) => setPriceBorrow(e.target.value)}
                    placeholder="0.00"
                    className={errors.priceBorrow ? 'border-red-500' : ''}
                    data-testid="price-borrow-input"
                  />
                  {errors.priceBorrow && <p className="form-error">{errors.priceBorrow}</p>}
                </div>
                <div className="form-group">
                  <Label htmlFor="deposit" className="form-label">Security Deposit ($)</Label>
                  <Input
                    id="deposit"
                    type="number"
                    min="0"
                    step="0.01"
                    value={deposit}
                    onChange={(e) => setDeposit(e.target.value)}
                    placeholder="0.00"
                    className={errors.deposit ? 'border-red-500' : ''}
                    data-testid="deposit-input"
                  />
                  <p className="text-xs text-slate-500 mt-1">Refunded when item is returned in good condition</p>
                  {errors.deposit && <p className="form-error">{errors.deposit}</p>}
                </div>
              </>
            )}
          </div>

          {/* Condition */}
          <div className="form-group">
            <Label className="form-label">Condition</Label>
            <RadioGroup value={condition} onValueChange={setCondition} className="space-y-2 mt-2">
              {CONDITIONS.map((c) => (
                <div key={c.value} className="flex items-center">
                  <RadioGroupItem value={c.value} id={`condition-${c.value}`} />
                  <Label htmlFor={`condition-${c.value}`} className="ml-3 cursor-pointer">
                    <span className="font-medium text-slate-900">{c.label}</span>
                    <span className="text-sm text-slate-500 ml-2">- {c.description}</span>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Submit */}
          <div className="pt-4">
            <Button 
              type="submit" 
              className="w-full btn-primary py-3"
              disabled={loading}
              data-testid="submit-listing-btn"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {editId ? 'Updating...' : 'Listing...'}
                </>
              ) : (
                editId ? 'Update Listing' : 'List Item'
              )}
            </Button>
          </div>
        </form>
      </div>
    </Layout>
  );
}
