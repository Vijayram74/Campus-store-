import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { statsAPI, reviewAPI } from '../lib/api';
import Layout from '../components/Layout';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { 
  User, Star, Package, ShoppingBag, Clock, 
  TrendingUp, Edit, Loader2, Mail, Phone, 
  MapPin, Calendar, Shield
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function ProfilePage() {
  const { user, updateProfile } = useAuth();
  const [stats, setStats] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Edit form
  const [editName, setEditName] = useState(user?.name || '');
  const [editPhone, setEditPhone] = useState(user?.phone || '');

  useEffect(() => {
    fetchData();
  }, [user]);

  useEffect(() => {
    if (user) {
      setEditName(user.name);
      setEditPhone(user.phone || '');
    }
  }, [user]);

  const fetchData = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const [statsRes, reviewsRes] = await Promise.all([
        statsAPI.getDashboard(),
        reviewAPI.getUserReviews(user.id)
      ]);
      setStats(statsRes.data);
      setReviews(reviewsRes.data);
    } catch (error) {
      console.error('Error fetching profile data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      await updateProfile({
        name: editName,
        phone: editPhone || null
      });
      toast.success('Profile updated!');
      setEditing(false);
    } catch (error) {
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const renderStars = (rating) => {
    return Array(5).fill(0).map((_, i) => (
      <Star 
        key={i} 
        className={`w-4 h-4 ${i < rating ? 'text-amber-400 fill-amber-400' : 'text-slate-200'}`} 
      />
    ));
  };

  if (!user) {
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
      <div className="page-content">
        {/* Profile Header */}
        <div className="profile-header mb-8 animate-slide-up">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            <img 
              src={user.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`}
              alt={user.name}
              className="profile-avatar"
            />
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h1 className="profile-name">{user.name}</h1>
                <span className="badge-verified">
                  <Shield className="w-3 h-3 mr-1" /> Verified
                </span>
              </div>
              <p className="profile-college">{user.college_name}</p>
              <div className="flex items-center gap-4 mt-3">
                <div className="flex items-center gap-1">
                  <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
                  <span className="font-semibold">{user.rating?.toFixed(1) || '0.0'}</span>
                  <span className="text-blue-100">({user.total_reviews} reviews)</span>
                </div>
                <span className="text-blue-100">•</span>
                <span className="text-blue-100">
                  Member since {format(new Date(user.created_at), 'MMM yyyy')}
                </span>
              </div>
            </div>
            <Dialog open={editing} onOpenChange={setEditing}>
              <DialogTrigger asChild>
                <Button 
                  variant="outline" 
                  className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                  data-testid="edit-profile-btn"
                >
                  <Edit className="w-4 h-4 mr-2" /> Edit Profile
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Edit Profile</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="form-group">
                    <Label>Name</Label>
                    <Input 
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      data-testid="edit-name-input"
                    />
                  </div>
                  <div className="form-group">
                    <Label>Phone</Label>
                    <Input 
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      placeholder="Optional"
                      data-testid="edit-phone-input"
                    />
                  </div>
                  <Button 
                    className="w-full btn-primary"
                    onClick={handleSaveProfile}
                    disabled={saving}
                    data-testid="save-profile-btn"
                  >
                    {saving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      'Save Changes'
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Stats */}
          {stats && (
            <div className="profile-stats mt-6">
              <div className="profile-stat">
                <p className="profile-stat-value">{stats.items_listed}</p>
                <p className="profile-stat-label">Listed</p>
              </div>
              <div className="profile-stat">
                <p className="profile-stat-value">{stats.items_sold}</p>
                <p className="profile-stat-label">Sold</p>
              </div>
              <div className="profile-stat">
                <p className="profile-stat-value">{stats.items_lent}</p>
                <p className="profile-stat-label">Lent</p>
              </div>
              <div className="profile-stat">
                <p className="profile-stat-value">${stats.total_earnings}</p>
                <p className="profile-stat-label">Earned</p>
              </div>
            </div>
          )}
        </div>

        {/* Contact Info */}
        <div className="bg-white rounded-xl border border-slate-100 p-6 mb-8">
          <h3 className="font-semibold text-slate-900 mb-4">Contact Information</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3 text-slate-600">
              <Mail className="w-5 h-5 text-slate-400" />
              <span>{user.email}</span>
            </div>
            {user.phone && (
              <div className="flex items-center gap-3 text-slate-600">
                <Phone className="w-5 h-5 text-slate-400" />
                <span>{user.phone}</span>
              </div>
            )}
            <div className="flex items-center gap-3 text-slate-600">
              <MapPin className="w-5 h-5 text-slate-400" />
              <span>{user.college_name}</span>
            </div>
            <div className="flex items-center gap-3 text-slate-600">
              <Calendar className="w-5 h-5 text-slate-400" />
              <span>Joined {format(new Date(user.created_at), 'MMMM d, yyyy')}</span>
            </div>
          </div>
        </div>

        {/* Reviews */}
        <div className="bg-white rounded-xl border border-slate-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-semibold text-slate-900">Reviews</h3>
            <div className="flex items-center gap-2">
              <div className="flex">{renderStars(Math.round(user.rating || 0))}</div>
              <span className="text-sm text-slate-500">
                {user.rating?.toFixed(1) || '0.0'} ({reviews.length} reviews)
              </span>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            </div>
          ) : reviews.length > 0 ? (
            <div className="space-y-4">
              {reviews.map((review) => (
                <div key={review.id} className="border-b border-slate-100 pb-4 last:border-0">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <img 
                        src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${review.reviewer_id}`}
                        alt={review.reviewer_name}
                        className="w-10 h-10 rounded-full"
                      />
                      <div>
                        <p className="font-medium text-slate-900">{review.reviewer_name}</p>
                        <p className="text-xs text-slate-500">
                          {format(new Date(review.created_at), 'MMM d, yyyy')}
                        </p>
                      </div>
                    </div>
                    <div className="flex">{renderStars(review.rating)}</div>
                  </div>
                  {review.comment && (
                    <p className="text-slate-600 mt-3 ml-13">{review.comment}</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Star className="w-12 h-12 text-slate-200 mx-auto" />
              <p className="text-slate-500 mt-2">No reviews yet</p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
