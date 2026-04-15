export type UserRole = 'customer' | 'delivery' | 'admin' | 'super-admin' | 'city-admin' | 'vendor';

export interface SavedAddress {
  id: string;
  label: string; // e.g., 'Home', 'Work', 'Other'
  fullAddress: string;
  lat?: number;
  lng?: number;
}

export interface UserProfile {
  uid: string;
  fullName: string;
  email: string;
  mobileNumber?: string;
  role: UserRole;
  city?: string; // City assigned to admin or user's city
  isBlocked?: boolean; // Added block status
  isActive?: boolean; // For delivery partners and vendors
  addresses?: SavedAddress[]; // Saved addresses for users
  createdAt: any;
  updatedAt?: any;
}

export interface MenuCategory {
  id: string;
  name: string;
  shopId: string;
}

export interface Shop {
  id: string;
  name: string;
  image: string;
  description: string;
  address?: string; // Physical address of the shop
  lat?: number;
  lng?: number;
  deliveryTime: string;
  ownerId?: string; // UID of the vendor
  city: string; // City where the shop is located
  status?: 'live' | 'closed'; // Added status field
  minOrderAmount?: number; // Minimum order amount for this shop
}

export interface MenuItem {
  id: string;
  shopId: string;
  name: string;
  price: number;
  image: string;
  category: string;
  categoryId: string;
  status?: 'active' | 'inactive';
  isOutOfStock?: boolean;
  createdAt?: any;
}

export interface CartItem extends MenuItem {
  quantity: number;
  isGrocery?: boolean;
}

export interface GroceryItem {
  id: string;
  name: string;
  price: number;
  image: string;
  category: string;
  stock: number;
  description: string;
  isOutOfStock?: boolean;
}

export interface GroceryCategory {
  id: string;
  name: string;
  image: string;
}

export interface Order {
  id: string;
  customerId: string;
  customerName?: string; // Denormalized for display
  customerMobile?: string;
  deliveryPartnerId?: string;
  deliveryPartnerName?: string; // Denormalized for display
  deliveryPartnerMobile?: string;
  items: CartItem[];
  totalPrice: number;
  deliveryCharge: number;
  status: 'pending' | 'assigned' | 'picked_up' | 'out_for_delivery' | 'arrived' | 'delivered' | 'cancelled';
  address: string;
  customerLat?: number;
  customerLng?: number;
  city: string; // City where the order is placed
  paymentMethod: 'cod' | 'upi' | 'online';
  paymentStatus: 'pending' | 'paid';
  paymentCollectedBy?: 'delivery' | 'admin';
  paymentProof?: string; // Base64 image URL
  razorpayOrderId?: string;
  cancellationReason?: string;
  cancelledBy?: 'customer' | 'vendor' | 'admin';
  shopIds?: string[]; // Array of shop IDs involved in this order
  shopName?: string; // Denormalized for display
  shopAddress?: string; // Denormalized for display
  specialInstructions?: string; // Optional special request from customer
  etaMins?: number; // Estimated time of arrival in minutes
  etaUpdatedAt?: any; // Timestamp when ETA was last updated
  createdAt: any;
  updatedAt?: any;
  
  // Revenue fields
  vendorRevenue?: number;
  deliveryRevenue?: number;
  adminRevenue?: number;
  couponCode?: string;
  discountAmount?: number;
  gstAmount?: number;
  distanceKm?: number;
}

export interface AppBanner {
  id: string;
  image: string;
  title?: string;
  link?: string;
  active: boolean;
  city?: string; // Optional: show only in specific city
}

export interface Coupon {
  id: string;
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minOrderAmount: number;
  maxDiscount?: number;
  expiryDate: any;
  active: boolean;
  usageLimit?: number;
  usageCount: number;
}

export interface SystemSettings {
  upiId: string;
  upiQR: string;
  isUpiEnabled?: boolean;
  isCodEnabled?: boolean;
  baseDeliveryCharge: number;
  orderPercentageCharge: number;
  peakHourSurcharge: number;
  isPeakHourActive: boolean;
  weatherSurcharge: number;
  isWeatherSurchargeActive: boolean;
  globalMinOrderAmount: number;
  deliveryPayoutBase: number;
  deliveryPayoutPercentage: number;
  vendorCommissionPercentage: number;
  banners: AppBanner[];
  supportEmail: string;
  supportPhone: string;
  // New fields for delivery and GST
  baseDeliveryDistance?: number;
  deliveryChargePerKmBeyondBase?: number;
  gstType?: 'percentage' | 'fixed';
  gstValue?: number;
}

export interface DeliveryLocation {
  deliveryPartnerId: string;
  lat: number;
  lng: number;
  updatedAt: any;
}

export interface AppNotification {
  id: string;
  userId?: string; // Target user (null for broadcast)
  title: string;
  message: string;
  type: 'order_update' | 'broadcast' | 'new_order' | 'assignment';
  orderId?: string;
  city?: string; // For city-specific broadcasts
  read: boolean;
  createdAt: any;
}
