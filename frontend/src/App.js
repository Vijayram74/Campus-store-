import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { Toaster } from "./components/ui/sonner";
import ProtectedRoute from "./components/ProtectedRoute";

// Pages
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import DashboardPage from "./pages/DashboardPage";
import BrowsePage from "./pages/BrowsePage";
import ItemDetailPage from "./pages/ItemDetailPage";
import ListItemPage from "./pages/ListItemPage";
import OrdersPage from "./pages/OrdersPage";
import PaymentPage, { PaymentSuccessPage, PaymentCancelPage } from "./pages/PaymentPage";
import ProfilePage from "./pages/ProfilePage";

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />

          {/* Protected Routes */}
          <Route path="/dashboard" element={
            <ProtectedRoute><DashboardPage /></ProtectedRoute>
          } />
          <Route path="/browse" element={
            <ProtectedRoute><BrowsePage /></ProtectedRoute>
          } />
          <Route path="/item/:id" element={
            <ProtectedRoute><ItemDetailPage /></ProtectedRoute>
          } />
          <Route path="/list-item" element={
            <ProtectedRoute><ListItemPage /></ProtectedRoute>
          } />
          <Route path="/orders" element={
            <ProtectedRoute><OrdersPage /></ProtectedRoute>
          } />
          <Route path="/payment" element={
            <ProtectedRoute><PaymentPage /></ProtectedRoute>
          } />
          <Route path="/payment/success" element={
            <ProtectedRoute><PaymentSuccessPage /></ProtectedRoute>
          } />
          <Route path="/payment/cancel" element={
            <ProtectedRoute><PaymentCancelPage /></ProtectedRoute>
          } />
          <Route path="/profile" element={
            <ProtectedRoute><ProfilePage /></ProtectedRoute>
          } />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-center" richColors />
    </AuthProvider>
  );
}

export default App;
