import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { paymentAPI, orderAPI, borrowAPI } from '../lib/api';
import Layout from '../components/Layout';
import { Button } from '../components/ui/button';
import { Loader2, CheckCircle, XCircle, CreditCard, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

export default function PaymentPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const type = searchParams.get('type'); // 'order' or 'borrow'
  const id = searchParams.get('id');
  
  const [loading, setLoading] = useState(true);
  const [details, setDetails] = useState(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!type || !id) {
      toast.error('Invalid payment request');
      navigate('/orders');
      return;
    }
    fetchDetails();
  }, [type, id]);

  const fetchDetails = async () => {
    try {
      setLoading(true);
      if (type === 'order') {
        const response = await orderAPI.getOne(id);
        setDetails(response.data);
      } else if (type === 'borrow') {
        const response = await borrowAPI.getOne(id);
        setDetails(response.data);
      }
    } catch (error) {
      toast.error('Failed to load payment details');
      navigate('/orders');
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async () => {
    setProcessing(true);
    try {
      const payload = {
        origin_url: window.location.origin
      };
      
      if (type === 'order') {
        payload.order_id = id;
      } else {
        payload.borrow_id = id;
      }
      
      const response = await paymentAPI.createCheckout(payload);
      
      // Redirect to Stripe
      window.location.href = response.data.checkout_url;
    } catch (error) {
      const message = error.response?.data?.detail || 'Payment failed';
      toast.error(message);
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </Layout>
    );
  }

  const isBorrow = type === 'borrow';
  const amount = isBorrow ? details?.total_amount : details?.amount;

  return (
    <Layout>
      <div className="page-content max-w-lg mx-auto">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-lg overflow-hidden animate-scale-in">
          {/* Header */}
          <div className={`p-6 ${isBorrow ? 'bg-amber-500' : 'bg-blue-600'} text-white`}>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <CreditCard className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold">
                  {isBorrow ? 'Rental Payment' : 'Purchase Payment'}
                </h1>
                <p className="text-white/80 text-sm">Secure checkout with Stripe</p>
              </div>
            </div>
          </div>

          {/* Details */}
          <div className="p-6 space-y-4">
            <div className="flex items-start gap-4">
              <img 
                src={details?.item_image || "https://images.unsplash.com/photo-1731983568664-9c1d8a87e7a2?w=100&q=80"}
                alt={details?.item_title}
                className="w-20 h-20 rounded-xl object-cover"
              />
              <div>
                <h3 className="font-semibold text-slate-900">{details?.item_title}</h3>
                <p className="text-sm text-slate-500">
                  {isBorrow ? `${details?.days} days rental` : 'One-time purchase'}
                </p>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-4 space-y-2">
              {isBorrow ? (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Rental Fee ({details?.days} days)</span>
                    <span className="font-medium">${details?.rental_amount?.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Security Deposit</span>
                    <span className="font-medium">${details?.deposit_amount?.toFixed(2)}</span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Deposit is fully refundable upon return in good condition
                  </p>
                </>
              ) : (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Item Price</span>
                  <span className="font-medium">${amount?.toFixed(2)}</span>
                </div>
              )}
              
              <div className="border-t border-slate-100 pt-2 flex justify-between">
                <span className="font-semibold text-slate-900">Total</span>
                <span className={`text-xl font-bold ${isBorrow ? 'text-amber-600' : 'text-blue-600'}`}>
                  ${amount?.toFixed(2)}
                </span>
              </div>
            </div>

            <Button 
              className={`w-full py-3 ${isBorrow ? 'bg-amber-500 hover:bg-amber-600' : 'btn-primary'}`}
              onClick={handlePayment}
              disabled={processing}
              data-testid="proceed-payment-btn"
            >
              {processing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  Proceed to Payment <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>

            <p className="text-xs text-center text-slate-500">
              You'll be redirected to Stripe for secure payment
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
}

// Payment Success Page
export function PaymentSuccessPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const sessionId = searchParams.get('session_id');
  
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState(null);
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    if (sessionId) {
      pollPaymentStatus();
    } else {
      setLoading(false);
    }
  }, [sessionId]);

  const pollPaymentStatus = async () => {
    if (attempts >= 5) {
      setLoading(false);
      return;
    }

    try {
      const response = await paymentAPI.getStatus(sessionId);
      setStatus(response.data);
      
      if (response.data.payment_status === 'paid') {
        setLoading(false);
        toast.success('Payment successful!');
      } else if (response.data.status === 'expired') {
        setLoading(false);
        toast.error('Payment session expired');
      } else {
        // Continue polling
        setTimeout(() => {
          setAttempts(prev => prev + 1);
          pollPaymentStatus();
        }, 2000);
      }
    } catch (error) {
      console.error('Error checking status:', error);
      setLoading(false);
    }
  };

  const isPaid = status?.payment_status === 'paid';

  return (
    <Layout>
      <div className="page-content max-w-lg mx-auto">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-lg p-8 text-center animate-scale-in">
          {loading ? (
            <>
              <Loader2 className="w-16 h-16 animate-spin text-blue-600 mx-auto" />
              <h2 className="text-xl font-bold text-slate-900 mt-4">Processing Payment...</h2>
              <p className="text-slate-500 mt-2">Please wait while we confirm your payment</p>
            </>
          ) : isPaid ? (
            <>
              <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="w-10 h-10 text-emerald-600" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mt-4">Payment Successful!</h2>
              <p className="text-slate-500 mt-2">
                Your transaction has been completed successfully.
              </p>
              {status && (
                <p className="text-lg font-semibold text-emerald-600 mt-4">
                  Amount: ${(status.amount_total).toFixed(2)} {status.currency?.toUpperCase()}
                </p>
              )}
              <div className="flex gap-3 mt-6 justify-center">
                <Link to="/orders">
                  <Button className="btn-primary" data-testid="view-orders-btn">View My Orders</Button>
                </Link>
                <Link to="/browse">
                  <Button variant="outline">Continue Shopping</Button>
                </Link>
              </div>
            </>
          ) : (
            <>
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                <XCircle className="w-10 h-10 text-red-600" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mt-4">Payment Failed</h2>
              <p className="text-slate-500 mt-2">
                Something went wrong with your payment. Please try again.
              </p>
              <div className="flex gap-3 mt-6 justify-center">
                <Link to="/orders">
                  <Button className="btn-primary">Back to Orders</Button>
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}

// Payment Cancel Page
export function PaymentCancelPage() {
  return (
    <Layout>
      <div className="page-content max-w-lg mx-auto">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-lg p-8 text-center animate-scale-in">
          <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto">
            <XCircle className="w-10 h-10 text-amber-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mt-4">Payment Cancelled</h2>
          <p className="text-slate-500 mt-2">
            Your payment was cancelled. No charges were made.
          </p>
          <div className="flex gap-3 mt-6 justify-center">
            <Link to="/orders">
              <Button className="btn-primary" data-testid="back-orders-btn">Back to Orders</Button>
            </Link>
            <Link to="/browse">
              <Button variant="outline">Continue Browsing</Button>
            </Link>
          </div>
        </div>
      </div>
    </Layout>
  );
}
