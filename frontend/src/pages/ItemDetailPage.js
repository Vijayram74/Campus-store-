import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { itemAPI, orderAPI, borrowAPI } from '../lib/api';
import Layout from '../components/Layout';
import { Button } from '../components/ui/button';
import { Calendar } from '../components/ui/calendar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import { format, addDays, differenceInDays } from 'date-fns';
import { 
  ArrowLeft, Star, ShoppingCart, Clock, MapPin, 
  Shield, MessageCircle, Calendar as CalendarIcon, 
  Loader2, AlertCircle, ChevronLeft, ChevronRight
} from 'lucide-react';
import { toast } from 'sonner';

const CONDITION_LABELS = {
  new: 'New',
  like_new: 'Like New',
  good: 'Good',
  fair: 'Fair',
  poor: 'Poor'
};

const PLACEHOLDER_IMAGE = "https://images.unsplash.com/photo-1731983568664-9c1d8a87e7a2?w=400&q=80";

export default function ItemDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState(0);
  const [showBorrowModal, setShowBorrowModal] = useState(false);
  
  // Borrow dates
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);

  useEffect(() => {
    fetchItem();
  }, [id]);

  const fetchItem = async () => {
    try {
      setLoading(true);
      const response = await itemAPI.getOne(id);
      setItem(response.data);
    } catch (error) {
      toast.error('Failed to load item');
      navigate('/browse');
    } finally {
      setLoading(false);
    }
  };

  const handleBuy = async () => {
    if (!item) return;
    
    setActionLoading(true);
    try {
      const response = await orderAPI.create({ item_id: item.id });
      toast.success('Order created! Redirecting to payment...');
      navigate(`/payment?type=order&id=${response.data.id}`);
    } catch (error) {
      const message = error.response?.data?.detail || 'Failed to create order';
      toast.error(message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleBorrowRequest = async () => {
    if (!item || !startDate || !endDate) {
      toast.error('Please select rental dates');
      return;
    }
    
    setActionLoading(true);
    try {
      const response = await borrowAPI.create({
        item_id: item.id,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString()
      });
      toast.success('Borrow request sent! Waiting for approval...');
      setShowBorrowModal(false);
      navigate('/orders?tab=borrowed');
    } catch (error) {
      const message = error.response?.data?.detail || 'Failed to create request';
      toast.error(message);
    } finally {
      setActionLoading(false);
    }
  };

  const calculateRentalCost = () => {
    if (!startDate || !endDate || !item) return { days: 0, rental: 0, deposit: 0, total: 0 };
    const days = Math.max(differenceInDays(endDate, startDate), 1);
    const rental = days * (item.price_borrow || 0);
    const deposit = item.deposit || 0;
    return { days, rental, deposit, total: rental + deposit };
  };

  const rentalCost = calculateRentalCost();

  const isOwner = user?.id === item?.owner_id;
  const canBuy = item?.mode === 'buy' || item?.mode === 'both';
  const canBorrow = item?.mode === 'borrow' || item?.mode === 'both';
  const isAvailable = item?.status === 'available';

  const images = item?.images?.length > 0 ? item.images : [PLACEHOLDER_IMAGE];

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </Layout>
    );
  }

  if (!item) {
    return (
      <Layout>
        <div className="page-content">
          <div className="empty-state">
            <AlertCircle className="empty-state-icon" />
            <h3 className="empty-state-title">Item not found</h3>
            <Link to="/browse">
              <Button className="btn-primary mt-4">Browse Items</Button>
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="page-content">
        {/* Back Button */}
        <button 
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-6"
          data-testid="back-btn"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back</span>
        </button>

        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Image Gallery */}
          <div className="space-y-4">
            <div className="relative aspect-product rounded-2xl overflow-hidden bg-slate-100">
              <img 
                src={images[selectedImage]} 
                alt={item.title}
                className="w-full h-full object-cover"
              />
              {images.length > 1 && (
                <>
                  <button 
                    onClick={() => setSelectedImage(prev => prev > 0 ? prev - 1 : images.length - 1)}
                    className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 rounded-full flex items-center justify-center shadow-md hover:bg-white"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={() => setSelectedImage(prev => prev < images.length - 1 ? prev + 1 : 0)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 rounded-full flex items-center justify-center shadow-md hover:bg-white"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </>
              )}
              {/* Status Badge */}
              {!isAvailable && (
                <div className="absolute top-4 left-4 px-3 py-1 bg-red-500 text-white text-sm font-medium rounded-full">
                  {item.status === 'rented' ? 'Currently Rented' : 'Sold'}
                </div>
              )}
            </div>
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto no-scrollbar">
                {images.map((img, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImage(index)}
                    className={`w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 border-2 ${
                      selectedImage === index ? 'border-blue-500' : 'border-transparent'
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Item Info */}
          <div className="space-y-6">
            {/* Title & Badges */}
            <div>
              <div className="flex flex-wrap gap-2 mb-2">
                {canBuy && <span className="badge-buy">For Sale</span>}
                {canBorrow && <span className="badge-borrow">For Rent</span>}
                <span className={`condition-badge ${item.condition}`}>
                  {CONDITION_LABELS[item.condition]}
                </span>
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-slate-900" data-testid="item-title">
                {item.title}
              </h1>
              <p className="text-slate-500 mt-1 capitalize">{item.category}</p>
            </div>

            {/* Pricing */}
            <div className="flex flex-wrap gap-4">
              {canBuy && item.price_buy && (
                <div className="price-card buy flex-1 min-w-[140px]">
                  <p className="price-label">Buy Price</p>
                  <p className="price-value" data-testid="buy-price">${item.price_buy}</p>
                </div>
              )}
              {canBorrow && item.price_borrow && (
                <div className="price-card borrow flex-1 min-w-[140px]">
                  <p className="price-label">Rent / Day</p>
                  <p className="price-value" data-testid="borrow-price">${item.price_borrow}</p>
                  {item.deposit > 0 && (
                    <p className="text-xs text-amber-600 mt-1">+ ${item.deposit} deposit</p>
                  )}
                </div>
              )}
            </div>

            {/* Description */}
            <div>
              <h3 className="font-semibold text-slate-900 mb-2">Description</h3>
              <p className="text-slate-600 leading-relaxed">{item.description}</p>
            </div>

            {/* Owner Info */}
            <div className="owner-card">
              <img 
                src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${item.owner_id}`}
                alt={item.owner_name}
                className="owner-avatar"
              />
              <div className="owner-info">
                <p className="owner-name">{item.owner_name}</p>
                <div className="owner-rating">
                  <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                  <span>{item.owner_rating?.toFixed(1) || '0.0'} rating</span>
                </div>
              </div>
              <span className="badge-verified">
                <Shield className="w-3 h-3 mr-1" /> Verified
              </span>
            </div>

            {/* Actions */}
            {!isOwner && isAvailable && (
              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                {canBuy && (
                  <Button 
                    className="btn-primary flex-1 py-3"
                    onClick={handleBuy}
                    disabled={actionLoading}
                    data-testid="buy-now-btn"
                  >
                    {actionLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <ShoppingCart className="w-4 h-4 mr-2" />
                        Buy Now - ${item.price_buy}
                      </>
                    )}
                  </Button>
                )}
                {canBorrow && (
                  <Dialog open={showBorrowModal} onOpenChange={setShowBorrowModal}>
                    <DialogTrigger asChild>
                      <Button 
                        variant="outline"
                        className="flex-1 py-3 border-amber-300 text-amber-700 hover:bg-amber-50"
                        data-testid="borrow-btn"
                      >
                        <Clock className="w-4 h-4 mr-2" />
                        Request to Borrow
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle>Request to Borrow</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="form-label mb-2 block">Start Date</label>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button variant="outline" className="w-full justify-start" data-testid="start-date-btn">
                                  <CalendarIcon className="w-4 h-4 mr-2" />
                                  {startDate ? format(startDate, 'MMM d') : 'Select'}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                  mode="single"
                                  selected={startDate}
                                  onSelect={(date) => {
                                    setStartDate(date);
                                    if (!endDate || date > endDate) {
                                      setEndDate(addDays(date, 1));
                                    }
                                  }}
                                  disabled={(date) => date < new Date()}
                                  initialFocus
                                />
                              </PopoverContent>
                            </Popover>
                          </div>
                          <div>
                            <label className="form-label mb-2 block">End Date</label>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button variant="outline" className="w-full justify-start" data-testid="end-date-btn">
                                  <CalendarIcon className="w-4 h-4 mr-2" />
                                  {endDate ? format(endDate, 'MMM d') : 'Select'}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                  mode="single"
                                  selected={endDate}
                                  onSelect={setEndDate}
                                  disabled={(date) => date <= (startDate || new Date())}
                                  initialFocus
                                />
                              </PopoverContent>
                            </Popover>
                          </div>
                        </div>

                        {startDate && endDate && (
                          <div className="bg-slate-50 rounded-xl p-4 space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-slate-600">Rental ({rentalCost.days} days)</span>
                              <span className="font-medium">${rentalCost.rental.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-slate-600">Security Deposit</span>
                              <span className="font-medium">${rentalCost.deposit.toFixed(2)}</span>
                            </div>
                            <div className="border-t border-slate-200 pt-2 flex justify-between">
                              <span className="font-semibold">Total</span>
                              <span className="font-bold text-amber-600">${rentalCost.total.toFixed(2)}</span>
                            </div>
                            <p className="text-xs text-slate-500 mt-2">
                              Deposit is refunded when you return the item in good condition.
                            </p>
                          </div>
                        )}

                        <Button 
                          className="w-full bg-amber-500 hover:bg-amber-600 text-white"
                          onClick={handleBorrowRequest}
                          disabled={!startDate || !endDate || actionLoading}
                          data-testid="submit-borrow-btn"
                        >
                          {actionLoading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            'Send Borrow Request'
                          )}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            )}

            {isOwner && (
              <div className="bg-blue-50 rounded-xl p-4 text-center">
                <p className="text-blue-700 font-medium">This is your listing</p>
                <Link to={`/list-item?edit=${item.id}`}>
                  <Button variant="outline" className="mt-2">Edit Listing</Button>
                </Link>
              </div>
            )}

            {!isAvailable && !isOwner && (
              <div className="bg-slate-100 rounded-xl p-4 text-center">
                <p className="text-slate-600">This item is currently not available</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
