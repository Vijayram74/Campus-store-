import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { orderAPI, borrowAPI, itemAPI } from '../lib/api';
import Layout from '../components/Layout';
import { Button } from '../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { 
  Package, ShoppingBag, Clock, Tag, Loader2, 
  CheckCircle, XCircle, AlertCircle, ArrowRight,
  Calendar, DollarSign, RotateCcw, Plus, Edit, Trash2
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

const STATUS_CONFIG = {
  // Orders
  created: { label: 'Created', color: 'bg-slate-100 text-slate-700' },
  paid: { label: 'Paid', color: 'bg-blue-100 text-blue-700' },
  completed: { label: 'Completed', color: 'bg-emerald-100 text-emerald-700' },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-700' },
  // Borrow
  requested: { label: 'Pending', color: 'bg-amber-100 text-amber-700' },
  approved: { label: 'Approved', color: 'bg-blue-100 text-blue-700' },
  active: { label: 'Active', color: 'bg-emerald-100 text-emerald-700' },
  returned: { label: 'Returned', color: 'bg-purple-100 text-purple-700' },
  closed: { label: 'Closed', color: 'bg-slate-100 text-slate-700' },
  rejected: { label: 'Rejected', color: 'bg-red-100 text-red-700' }
};

const PLACEHOLDER_IMAGE = "https://images.unsplash.com/photo-1731983568664-9c1d8a87e7a2?w=200&q=80";

export default function OrdersPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'bought');
  const [orders, setOrders] = useState([]);
  const [borrowedItems, setBorrowedItems] = useState([]);
  const [lentItems, setLentItems] = useState([]);
  const [myItems, setMyItems] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab) setActiveTab(tab);
  }, [searchParams]);

  const fetchData = async () => {
    setLoading(true);
    try {
      switch (activeTab) {
        case 'bought':
          const ordersRes = await orderAPI.getAll({ type: 'bought' });
          setOrders(ordersRes.data);
          break;
        case 'sold':
          const soldRes = await orderAPI.getAll({ type: 'sold' });
          setOrders(soldRes.data);
          break;
        case 'borrowed':
          const borrowedRes = await borrowAPI.getAll({ type: 'borrowed' });
          setBorrowedItems(borrowedRes.data);
          break;
        case 'lent':
          const [lentRes, pendingRes] = await Promise.all([
            borrowAPI.getAll({ type: 'lent' }),
            borrowAPI.getPending()
          ]);
          setLentItems(lentRes.data);
          setPendingRequests(pendingRes.data);
          break;
        case 'listed':
          const itemsRes = await itemAPI.getMy();
          setMyItems(itemsRes.data);
          break;
      }
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (value) => {
    setActiveTab(value);
    setSearchParams({ tab: value });
  };

  const handleApprove = async (borrowId, approved) => {
    try {
      await borrowAPI.approve(borrowId, { approved, rejection_reason: approved ? null : 'Request declined' });
      toast.success(approved ? 'Request approved!' : 'Request declined');
      fetchData();
    } catch (error) {
      toast.error('Action failed');
    }
  };

  const handleReturn = async (borrowId) => {
    try {
      await borrowAPI.return(borrowId);
      toast.success('Item marked as returned');
      fetchData();
    } catch (error) {
      toast.error('Failed to mark as returned');
    }
  };

  const handleConfirmReturn = async (borrowId) => {
    try {
      await borrowAPI.confirmReturn(borrowId);
      toast.success('Return confirmed, deposit refunded');
      fetchData();
    } catch (error) {
      toast.error('Failed to confirm return');
    }
  };

  const handleDeleteItem = async (itemId) => {
    if (!window.confirm('Are you sure you want to delete this listing?')) return;
    try {
      await itemAPI.delete(itemId);
      toast.success('Listing deleted');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete listing');
    }
  };

  const renderOrderCard = (order, type = 'bought') => (
    <div key={order.id} className="activity-card animate-fade-in" data-testid={`order-${order.id}`}>
      <img 
        src={order.item_image || PLACEHOLDER_IMAGE} 
        alt={order.item_title}
        className="activity-image"
      />
      <div className="activity-content">
        <h3 className="activity-title">{order.item_title}</h3>
        <p className="activity-meta">
          {type === 'bought' ? `From ${order.seller_name}` : `To ${order.buyer_name || 'Buyer'}`}
        </p>
        <div className="flex items-center gap-3 mt-2">
          <span className={`activity-status ${STATUS_CONFIG[order.status]?.color || 'bg-slate-100'}`}>
            {STATUS_CONFIG[order.status]?.label || order.status}
          </span>
          <span className="text-sm font-semibold text-slate-900">${order.amount}</span>
        </div>
      </div>
      <div className="flex flex-col items-end gap-2">
        <span className="text-xs text-slate-500">
          {format(new Date(order.created_at), 'MMM d, yyyy')}
        </span>
        {order.status === 'paid' && type === 'bought' && (
          <Link to={`/payment/success?order=${order.id}`}>
            <Button size="sm" variant="outline">View Details</Button>
          </Link>
        )}
      </div>
    </div>
  );

  const renderBorrowCard = (borrow, type = 'borrowed') => (
    <div key={borrow.id} className="activity-card animate-fade-in" data-testid={`borrow-${borrow.id}`}>
      <img 
        src={borrow.item_image || PLACEHOLDER_IMAGE} 
        alt={borrow.item_title}
        className="activity-image"
      />
      <div className="activity-content">
        <h3 className="activity-title">{borrow.item_title}</h3>
        <p className="activity-meta">
          {type === 'borrowed' ? `From ${borrow.lender_name}` : `To ${borrow.borrower_name}`}
        </p>
        <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
          <Calendar className="w-3 h-3" />
          {format(new Date(borrow.start_date), 'MMM d')} - {format(new Date(borrow.end_date), 'MMM d')}
          <span>({borrow.days} days)</span>
        </div>
        <div className="flex items-center gap-3 mt-2">
          <span className={`activity-status ${STATUS_CONFIG[borrow.status]?.color || 'bg-slate-100'}`}>
            {STATUS_CONFIG[borrow.status]?.label || borrow.status}
          </span>
          <span className="text-sm font-semibold text-amber-600">${borrow.total_amount}</span>
        </div>
      </div>
      <div className="flex flex-col items-end gap-2">
        {/* Borrower actions */}
        {type === 'borrowed' && borrow.status === 'approved' && (
          <Link to={`/payment?type=borrow&id=${borrow.id}`}>
            <Button size="sm" className="bg-amber-500 hover:bg-amber-600">Pay Now</Button>
          </Link>
        )}
        {type === 'borrowed' && borrow.status === 'active' && (
          <Button size="sm" variant="outline" onClick={() => handleReturn(borrow.id)}>
            <RotateCcw className="w-4 h-4 mr-1" /> Return
          </Button>
        )}
        {/* Lender actions */}
        {type === 'lent' && borrow.status === 'returned' && (
          <Button size="sm" onClick={() => handleConfirmReturn(borrow.id)}>
            <CheckCircle className="w-4 h-4 mr-1" /> Confirm Return
          </Button>
        )}
      </div>
    </div>
  );

  const renderPendingRequest = (request) => (
    <div key={request.id} className="bg-amber-50 border border-amber-200 rounded-xl p-4 animate-fade-in" data-testid={`pending-${request.id}`}>
      <div className="flex items-start gap-4">
        <img 
          src={request.item_image || PLACEHOLDER_IMAGE} 
          alt={request.item_title}
          className="w-16 h-16 rounded-lg object-cover"
        />
        <div className="flex-1">
          <h4 className="font-semibold text-slate-900">{request.item_title}</h4>
          <p className="text-sm text-slate-600">
            {request.borrower_name} wants to borrow for {request.days} days
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {format(new Date(request.start_date), 'MMM d')} - {format(new Date(request.end_date), 'MMM d')}
          </p>
          <p className="text-sm font-medium text-amber-700 mt-1">
            Total: ${request.total_amount} (${request.rental_amount} + ${request.deposit_amount} deposit)
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            size="sm" 
            variant="outline" 
            className="text-red-600 hover:bg-red-50"
            onClick={() => handleApprove(request.id, false)}
          >
            <XCircle className="w-4 h-4" />
          </Button>
          <Button 
            size="sm"
            onClick={() => handleApprove(request.id, true)}
          >
            <CheckCircle className="w-4 h-4 mr-1" /> Approve
          </Button>
        </div>
      </div>
    </div>
  );

  const renderMyItem = (item) => (
    <div key={item.id} className="activity-card animate-fade-in" data-testid={`item-${item.id}`}>
      <img 
        src={item.images?.[0] || PLACEHOLDER_IMAGE} 
        alt={item.title}
        className="activity-image"
      />
      <div className="activity-content">
        <h3 className="activity-title">{item.title}</h3>
        <p className="activity-meta capitalize">{item.category}</p>
        <div className="flex items-center gap-3 mt-2">
          <span className={`activity-status ${item.status === 'available' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'}`}>
            {item.status === 'available' ? 'Available' : item.status}
          </span>
          {item.price_buy && <span className="badge-buy">${item.price_buy}</span>}
          {item.price_borrow && <span className="badge-borrow">${item.price_borrow}/day</span>}
        </div>
      </div>
      <div className="flex gap-2">
        <Link to={`/list-item?edit=${item.id}`}>
          <Button size="sm" variant="outline">
            <Edit className="w-4 h-4" />
          </Button>
        </Link>
        <Button 
          size="sm" 
          variant="outline" 
          className="text-red-600 hover:bg-red-50"
          onClick={() => handleDeleteItem(item.id)}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );

  return (
    <Layout>
      <div className="page-content">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-slate-900">My Activity</h1>
          <Link to="/list-item">
            <Button className="btn-primary" data-testid="new-listing-btn">
              <Plus className="w-4 h-4 mr-2" /> New Listing
            </Button>
          </Link>
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList className="grid grid-cols-5 mb-6">
            <TabsTrigger value="bought" data-testid="tab-bought">
              <ShoppingBag className="w-4 h-4 mr-2" /> Bought
            </TabsTrigger>
            <TabsTrigger value="sold" data-testid="tab-sold">
              <DollarSign className="w-4 h-4 mr-2" /> Sold
            </TabsTrigger>
            <TabsTrigger value="borrowed" data-testid="tab-borrowed">
              <Clock className="w-4 h-4 mr-2" /> Borrowed
            </TabsTrigger>
            <TabsTrigger value="lent" data-testid="tab-lent">
              <RotateCcw className="w-4 h-4 mr-2" /> Lent
            </TabsTrigger>
            <TabsTrigger value="listed" data-testid="tab-listed">
              <Tag className="w-4 h-4 mr-2" /> Listed
            </TabsTrigger>
          </TabsList>

          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : (
            <>
              <TabsContent value="bought" className="space-y-4">
                {orders.length > 0 ? (
                  orders.map(order => renderOrderCard(order, 'bought'))
                ) : (
                  <div className="empty-state">
                    <ShoppingBag className="empty-state-icon" />
                    <h3 className="empty-state-title">No purchases yet</h3>
                    <p className="empty-state-text">Items you buy will appear here</p>
                    <Link to="/browse">
                      <Button className="btn-primary mt-4">Browse Items</Button>
                    </Link>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="sold" className="space-y-4">
                {orders.length > 0 ? (
                  orders.map(order => renderOrderCard(order, 'sold'))
                ) : (
                  <div className="empty-state">
                    <DollarSign className="empty-state-icon" />
                    <h3 className="empty-state-title">No sales yet</h3>
                    <p className="empty-state-text">Items you sell will appear here</p>
                    <Link to="/list-item">
                      <Button className="btn-primary mt-4">List an Item</Button>
                    </Link>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="borrowed" className="space-y-4">
                {borrowedItems.length > 0 ? (
                  borrowedItems.map(borrow => renderBorrowCard(borrow, 'borrowed'))
                ) : (
                  <div className="empty-state">
                    <Clock className="empty-state-icon" />
                    <h3 className="empty-state-title">No rentals yet</h3>
                    <p className="empty-state-text">Items you borrow will appear here</p>
                    <Link to="/browse?mode=borrow">
                      <Button className="btn-primary mt-4">Find Items to Rent</Button>
                    </Link>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="lent" className="space-y-4">
                {/* Pending Requests */}
                {pendingRequests.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-slate-900 mb-3 flex items-center gap-2">
                      <AlertCircle className="w-5 h-5 text-amber-500" />
                      Pending Requests ({pendingRequests.length})
                    </h3>
                    <div className="space-y-3">
                      {pendingRequests.map(request => renderPendingRequest(request))}
                    </div>
                  </div>
                )}
                
                {lentItems.length > 0 ? (
                  <>
                    <h3 className="text-lg font-semibold text-slate-900 mb-3">Rental History</h3>
                    {lentItems.map(borrow => renderBorrowCard(borrow, 'lent'))}
                  </>
                ) : pendingRequests.length === 0 ? (
                  <div className="empty-state">
                    <RotateCcw className="empty-state-icon" />
                    <h3 className="empty-state-title">No rentals yet</h3>
                    <p className="empty-state-text">Items you lend will appear here</p>
                  </div>
                ) : null}
              </TabsContent>

              <TabsContent value="listed" className="space-y-4">
                {myItems.length > 0 ? (
                  myItems.map(item => renderMyItem(item))
                ) : (
                  <div className="empty-state">
                    <Tag className="empty-state-icon" />
                    <h3 className="empty-state-title">No listings yet</h3>
                    <p className="empty-state-text">Start selling or renting your stuff</p>
                    <Link to="/list-item">
                      <Button className="btn-primary mt-4">
                        <Plus className="w-4 h-4 mr-2" /> Create Listing
                      </Button>
                    </Link>
                  </div>
                )}
              </TabsContent>
            </>
          )}
        </Tabs>
      </div>
    </Layout>
  );
}
