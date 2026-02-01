import { Link } from 'react-router-dom';
import { Star, Clock, ShoppingCart } from 'lucide-react';

const PLACEHOLDER_IMAGE = "https://images.unsplash.com/photo-1731983568664-9c1d8a87e7a2?w=400&q=80";

const CONDITION_LABELS = {
  new: 'New',
  like_new: 'Like New',
  good: 'Good',
  fair: 'Fair',
  poor: 'Poor'
};

export const ItemCard = ({ item }) => {
  const canBuy = item.mode === 'buy' || item.mode === 'both';
  const canBorrow = item.mode === 'borrow' || item.mode === 'both';
  const image = item.images?.[0] || PLACEHOLDER_IMAGE;

  return (
    <Link 
      to={`/item/${item.id}`} 
      className="product-card"
      data-testid={`item-card-${item.id}`}
    >
      {/* Image */}
      <div className="relative overflow-hidden">
        <img 
          src={image} 
          alt={item.title}
          className="product-card-image"
          loading="lazy"
        />
        {/* Mode Badges */}
        <div className="absolute top-3 left-3 flex gap-1.5">
          {canBuy && (
            <span className="bg-blue-500 text-white text-xs font-medium px-2 py-1 rounded-full flex items-center gap-1">
              <ShoppingCart className="w-3 h-3" /> Buy
            </span>
          )}
          {canBorrow && (
            <span className="bg-amber-500 text-white text-xs font-medium px-2 py-1 rounded-full flex items-center gap-1">
              <Clock className="w-3 h-3" /> Rent
            </span>
          )}
        </div>
        {/* Status Badge */}
        {item.status === 'rented' && (
          <div className="absolute top-3 right-3 bg-slate-900/80 text-white text-xs font-medium px-2 py-1 rounded-full">
            Rented
          </div>
        )}
      </div>

      {/* Content */}
      <div className="product-card-body">
        <h3 className="product-card-title">{item.title}</h3>
        
        {/* Price */}
        <div className="flex items-baseline gap-2 mt-1">
          {canBuy && item.price_buy && (
            <span className="text-blue-600 font-bold text-lg">${item.price_buy}</span>
          )}
          {canBorrow && item.price_borrow && (
            <span className="text-amber-600 font-semibold text-sm">
              ${item.price_borrow}/day
            </span>
          )}
        </div>

        {/* Meta */}
        <div className="product-card-meta">
          <span className={`condition-badge ${item.condition}`}>
            {CONDITION_LABELS[item.condition]}
          </span>
          <span className="text-slate-400">•</span>
          <span className="capitalize">{item.category}</span>
        </div>

        {/* Owner */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
          <div className="flex items-center gap-2">
            <img 
              src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${item.owner_id}`}
              alt={item.owner_name}
              className="w-6 h-6 rounded-full"
            />
            <span className="text-sm text-slate-600 truncate max-w-[100px]">
              {item.owner_name}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
            <span className="text-xs text-slate-500">
              {item.owner_rating?.toFixed(1) || '0.0'}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default ItemCard;
