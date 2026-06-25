import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import OrdersPage from './pages/OrdersPage';
import ProvidersPage from './pages/ProvidersPage';
import CustomersPage from './pages/CustomersPage';
import MyOrdersPage from './pages/MyOrdersPage';
import ProfilePage from './pages/ProfilePage';
import BookPage from './pages/BookPage';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route
            path="/*"
            element={
              <Layout>
                <Routes>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/book/:providerId" element={<BookPage />} />
                  <Route path="/dashboard" element={<ProtectedRoute allowedRoles={['admin', 'mama_fua', 'laundry_center']}><DashboardPage /></ProtectedRoute>} />
                  <Route path="/orders" element={<ProtectedRoute allowedRoles={['admin', 'mama_fua', 'laundry_center']}><OrdersPage /></ProtectedRoute>} />
                  <Route path="/providers" element={<ProtectedRoute allowedRoles={['admin']}><ProvidersPage /></ProtectedRoute>} />
                  <Route path="/customers" element={<ProtectedRoute allowedRoles={['admin']}><CustomersPage /></ProtectedRoute>} />
                  <Route path="/my-orders" element={<ProtectedRoute allowedRoles={['customer']}><MyOrdersPage /></ProtectedRoute>} />
                  <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Layout>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
