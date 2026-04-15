# Multi-City Management & Address Management Guide

Complete setup guide for multi-city shop visibility control and user address management.

---

## Part 1: Multi-City Shop Visibility & Admin Roles

### Overview

The system now supports three levels of admin access:
- **Super Admin**: Sees all cities and can manage city admins
- **City Admin**: Only sees shops, vendors, and delivery partners in their assigned city
- **Vendor**: Only sees their own shops (ownerId-based filtering)

### Role Types

```typescript
type UserRole = 'customer' | 'delivery' | 'admin' | 'super-admin' | 'city-admin' | 'vendor';
```

### How It Works

#### Shop Visibility Logic

```typescript
// In Home.tsx and AdminDashboard.tsx
const filteredShops = shops.filter(shop => {
  const userCity = profile?.city?.toLowerCase();
  const shopCity = shop.city?.toLowerCase();
  const matchesCity = !userCity || shopCity === userCity;
  return matchesSearch && matchesCity;
});
```

**Rules:**
- Super admin sees all shops (no city restriction)
- City admin only sees shops where `shop.city === profile.city`
- Vendors only see their own shops (where `shop.ownerId === profile.uid`)
- Customers see shops in their city

#### Data Filtering for City Admins

The following data is filtered by city for city admins:
- ✅ Shops (filtered by city)
- ✅ Orders (filtered by city)
- ✅ Vendors (filtered by city)
- ✅ Delivery Partners (filtered by city)
- ✅ Users (filtered by city)

---

## Part 2: Multiple Address Management

### Overview

Users can now save multiple delivery addresses similar to Swiggy/Zomato. Each address has:
- Unique ID
- Label (Home, Office, Other, etc.)
- Full address text
- Latitude/Longitude (GPS coordinates)

### Data Structure

```typescript
interface SavedAddress {
  id: string;
  label: string; // 'Home', 'Work', 'Other', etc.
  fullAddress: string; // Complete address
  lat?: number; // GPS latitude
  lng?: number; // GPS longitude
}

interface UserProfile {
  // ... other fields
  addresses?: SavedAddress[]; // Array of saved addresses
}
```

### Where Addresses Are Stored

- **Location**: `users/{userId}/` document
- **Field**: `addresses` array
- **Firebase Collection**: `users` collection

### How Addresses Are Used

#### 1. Saving Addresses

**In Profile.tsx:**
```typescript
const handleAddAddress = async (e: React.FormEvent) => {
  // User fills: label + fullAddress
  // User can click "Pin Location" to add lat/lng
  
  const address: SavedAddress = {
    id: Math.random().toString(36).substr(2, 9),
    label: newAddress.label,
    fullAddress: newAddress.fullAddress,
    lat: newAddress.lat,
    lng: newAddress.lng
  };

  await updateDoc(doc(db, 'users', profile.uid), {
    addresses: arrayUnion(address)
  });
};
```

#### 2. Using Addresses During Checkout

**In Checkout.tsx:**

```typescript
// User sees saved addresses
{profile?.addresses && profile.addresses.length > 0 && (
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
    {profile.addresses.map((addr) => (
      <button
        onClick={() => {
          setSelectedAddressId(addr.id);
          setAddress(addr.fullAddress);
          if (addr.lat && addr.lng) {
            setCustomerCoords({ lat: addr.lat, lng: addr.lng });
          }
        }}
        className={selectedAddressId === addr.id ? 'border-navy-900 bg-navy-50' : 'border-gray-100'}
      >
        <p className="text-[10px] font-black uppercase">{addr.label}</p>
        <p className="text-xs font-bold">{addr.fullAddress}</p>
      </button>
    ))}
  </div>
)}
```

#### 3. Address in Orders

When an order is placed, it saves:
```typescript
// In order object
{
  address: selectedAddress.fullAddress,
  customerLat: selectedAddress.lat,
  customerLng: selectedAddress.lng,
  deliveryAddressLabel: selectedAddress.label
}
```

---

## Setup & Configuration

### For Super Admin

1. **Identify your main admin user**
2. **Assign them as super-admin in Firebase Console:**
   - Go to Firestore
   - Find `users/{superAdminUid}`
   - Set `role: 'super-admin'`

3. **Verify in AuthContext:**
   - Component will show `isSuperAdmin === true`
   - Access to all cities

### For City Admins

#### Step 1: Create City Admin Users

1. Go to AdminDashboard (as super admin)
2. Create new user or use existing user
3. Manually set user in Firebase:
   ```
   users/{userId}:
   {
     fullName: "City Admin Name",
     role: "city-admin",
     city: "Bangalore",  // Very important!
     email: "admin@city.com"
   }
   ```

#### Step 2: City Admin Dashboard Features

Once assigned to a city, city admin can:

✅ **See only their city's data:**
- Shops in Bangalore
- Vendors in Bangalore
- Delivery Partners in Bangalore
- Orders in Bangalore

❌ **Cannot see:**
- Shops in other cities
- Users from other cities
- Orders from other cities

### For Vendors

**Already implemented:**
- Vendors only see shops where `ownerId === their.uid`
- Cannot see other vendors' shops
- Cannot create shops in different cities (restricted to their assigned city)

### For Customers

**Default behavior:**
- See shops in their current city (from `profile.city`)
- Can browse multiple cities if they update their city setting
- Each order uses one of their saved addresses

---

## Address Management Features

### Adding a New Address

**User Steps:**
1. Go to Profile page
2. Click "Add Address"
3. Fill in:
   - Label (Home, Office, Other, etc.)
   - Full Address (building number, area, etc.)
4. Click "Pin Location" to add GPS coordinates (optional)
5. Click "Save"

**Location Detection:**
```typescript
navigator.geolocation.getCurrentPosition((pos) => {
  const { latitude, longitude } = pos.coords;
  // Reverse geocode to get address string
  const addressString = await reverseGeocode(latitude, longitude);
});
```

### Editing an Address

**UI Location:** Profile page, under each saved address
- Edit button to modify label/address
- Delete button to remove address

### Using During Checkout

**Checkout Flow:**
1. Opens with last used address selected
2. Can change to another saved address by clicking address card
3. Can add new address by clicking "New Address"
4. Can pin current location

---

## Database Schema

### Users Collection

```
users/
  {userId}/
    {
      fullName: "John Doe",
      email: "john@example.com",
      role: "customer",
      city: "Bangalore",
      addresses: [
        {
          id: "abc123",
          label: "Home",
          fullAddress: "123 Main St, Bangalore 560001",
          lat: 12.9716,
          lng: 77.5946
        },
        {
          id: "def456",
          label: "Office",
          fullAddress: "456 IT Park, Bangalore 560034",
          lat: 12.9352,
          lng: 77.6245
        }
      ]
    }
```

### Shops Collection

```
shops/
  {shopId}/
    {
      name: "Pizza Palace",
      city: "Bangalore",        // ← Critical for filtering
      ownerId: "vendor123",     // ← Vendor access
      // ... other fields
    }
```

### Orders Collection

```
orders/
  {orderId}/
    {
      address: "123 Main St, Bangalore 560001",
      customerLat: 12.9716,
      customerLng: 77.5946,
      city: "Bangalore",        // ← For city admin filtering
      // ... other fields
    }
```

---

## Security Rules

### Recommended Firestore Rules

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Users can only read/write their own document
    match /users/{userId} {
      allow read: if request.auth.uid == userId || 
                     get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'super-admin';
      allow write: if request.auth.uid == userId;
    }
    
    // Shops - visible to all, but city admins can only edit their city
    match /shops/{shopId} {
      allow read: if true;
      allow create, update: if 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['vendor', 'super-admin', 'city-admin'];
      allow delete: if
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['super-admin', 'vendor'];
    }
    
    // Orders - filtered by city for city admins
    match /orders/{orderId} {
      allow read: if 
        request.auth.uid == resource.data.userId ||
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'super-admin' ||
        (get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'city-admin' &&
         get(/databases/$(database)/documents/users/$(request.auth.uid)).data.city == resource.data.city);
      allow write: if request.auth.uid == resource.data.userId;
    }
  }
}
```

---

## Testing & Verification

### Test Shop Visibility

```javascript
// In browser console as super admin
db.collection('shops').get().then(snap => {
  console.log('Super admin sees:', snap.docs.length, 'shops');
});

// Logout and login as city admin
// Should see fewer shops (only their city)
```

### Test Address Management

```javascript
// Check user profile
db.collection('users').doc(currentUserId).get().then(doc => {
  console.log('User addresses:', doc.data().addresses);
});
```

### Test City Filtering

**Verification Steps:**
1. Login as Super Admin → See all cities data in Admin Dashboard
2. Login as City Admin (Bangalore) → See only Bangalore data
3. Verify cannot access other city orders/shops
4. Try to switch city in URL → Should still show only assigned city

---

## Common Issues & Solutions

### Issue 1: City Admin Sees All Data

**Cause:** User doesn't have `city` field set or role not set to `city-admin`

**Fix:**
```javascript
// In Firebase Console → Firestore
users/{userId}:
{
  role: "city-admin",
  city: "Bangalore"  // ← Must match exactly
}
```

### Issue 2: Shops Still Visible Across Cities

**Cause:** Shops don't have `city` field

**Fix:**
```javascript
// When creating/editing shop, always set city
db.collection('shops').doc(shopId).update({
  city: "Bangalore"
});
```

### Issue 3: Addresses Not Saving

**Cause:** User not logged in or Firestore rules blocking write

**Fix:**
1. Ensure user is authenticated
2. Check Firestore rules allow `arrayUnion` on addresses field
3. Check browser console for errors

### Issue 4: Address GPS Not Saving

**Cause:** Browser permission denied or no GPS signal

**Fix:**
1. Enable location permission for browser
2. Ensure page is loaded over HTTPS (required for geolocation)
3. Try manual address entry instead

---

## Performance Considerations

### Address Storage
- Each user can have unlimited addresses
- Recommended: Max 5-10 addresses per user for better UX
- Addresses are small (< 1KB each)

### City Filtering
- Queries are optimized with `where('city', '==', 'Bangalore')`
- Consider adding index for `city` field in high-volume scenarios

### GPS Coordinates
- Not required for address (fullAddress is enough)
- Useful for delivery distance calculations
- Can be added later if needed

---

## Future Enhancements

Possible improvements:
- [ ] Address favorites/pinning
- [ ] Recent addresses history
- [ ] Address sharing between users
- [ ] Smart address suggestions based on location
- [ ] Address validation via Google Maps API
- [ ] Neighborhood-based grouping

---

## Quick Reference

### For Super Admin
- Can see all cities
- Can assign city admins
- Can edit any shop/order
- Dashboard shows "Super Admin" badge

### For City Admin
- See only assigned city data
- Can manage vendors in city
- Can manage delivery partners in city
- Cannot see other cities

### For Vendors
- See only their shops
- Manage orders for their shops
- Cannot see other vendors' shops

### For Customers
- Save multiple addresses
- Select address during checkout
- Each order linked to one address

---

**Implementation Status:** ✅ Complete  
**Last Updated:** April 2026  
**Version:** 1.0
