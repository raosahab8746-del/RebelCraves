# Order Priority & Queue Management Guide

Complete guide on how order sorting and priority works for vendors and delivery partners.

---

## Overview

Orders are now sorted **oldest to newest by default**, ensuring vendors prepare and delivery partners deliver orders in the order they were received. This prevents confusion and ensures fair queue management.

---

## Vendor Dashboard - Order Management

### How Orders are Sorted

#### Default: **Oldest First (Priority)**
- Orders placed first appear at the top of the list
- Vendors should prioritize preparing the oldest orders first
- This ensures no customer waits too long

#### Alternative: **Newest First**
- Use this only to quickly review recently placed orders
- Can switch between sorts using the dropdown menu

### Understanding Order Priority

#### Red Pulse Indicator 🔴
- **Appears on:** Orders in `pending` or `confirmed` status
- **Meaning:** Order needs immediate attention
- **Action:** Should be prepared first

#### Time in Queue Column
Shows how long the order has been waiting:

| Time Display | Urgency | Color | Action |
|---|---|---|---|
| Just now | CRITICAL | 🔴 Red | Prepare immediately |
| 0-10 mins | HIGH | 🟠 Orange | Prepare ASAP |
| 10+ mins | MEDIUM | 🟡 Yellow | Prepare soon |

#### Example Queue
```
Order #12345ABC - 2m ago (HIGHEST PRIORITY - Prepare first)
Order #67890DEF - 5m ago (HIGH PRIORITY)
Order #11111GHI - 12m ago (MEDIUM PRIORITY)
Order #22222JKL - Just placed (Check if pending)
```

### Steps to Process Orders Correctly

1. **Check "Oldest First" sort** (should be default)
2. **Look at Time in Queue column** - Oldest orders at top have red/orange colors
3. **Prepare in this order:**
   - Red indicators first (just placed, urgent)
   - Then oldest times (10+ minutes waiting)
   - Then newer orders
4. **Update ETA** as you prepare each item
5. **Change status** to move order through pipeline

### Order Status Flow (Vendor)

```
pending 
  ↓ (You confirm)
confirmed 
  ↓ (You prepare)
prepared 
  ↓ (Ready for delivery partner)
assigned (to delivery partner)
  ↓
out_for_delivery
  ↓
delivered
```

### Priority Indicators

| Status | What to Do | Priority |
|--------|-----------|----------|
| **pending** | Confirm ASAP | 🔴 CRITICAL |
| **confirmed** | Start preparing | 🔴 HIGH |
| **prepared** | Assign delivery partner | 🟠 MEDIUM |
| **assigned** | Inform delivery partner to pick up | 🟡 NORMAL |
| **out_for_delivery** | Monitor delivery | 🟢 LOW |
| **delivered** | Complete | ✅ DONE |

---

## Delivery Dashboard - Route Optimization

### How Orders are Sorted

#### Default: **Oldest First (Priority)**
- Orders assigned first appear at top
- Delivery partners should deliver these first
- Minimizes customer wait times

#### Alternative: **Newest First**
- Use to see recently assigned orders
- Switch using the dropdown

### Understanding Delivery Priority

#### Priority Badge 🔴
- **Shows on:** Orders in `assigned` status
- **Meaning:** Order waiting to be picked up and delivered
- **Action:** Pick up and deliver first

#### Time Display Shows:
- **Just now** = Order placed 0-2 minutes ago (URGENT)
- **5m ago** = 5 minutes waiting (HIGH PRIORITY)
- **2h ago** = Long waiting (Was delayed, expedite delivery)

### Delivery Order Example

```
Order #ABC123 (YELLOW - Assigned) - Just now (PICK UP FIRST)
Order #DEF456 (YELLOW - Assigned) - 8m ago (SECOND)
Order #GHI789 (BLUE - In Delivery) - 15m ago (ALREADY OUT, tracking)
Order #JKL012 (GREEN - Delivered) - 2h ago (COMPLETED)
```

### Steps to Manage Deliveries Correctly

1. **Start with Oldest Orders** (Top of list)
2. **Go Online** to enable location tracking
3. **For each order in sequence:**
   - Call customer (green button) if needed
   - Click "Open in Maps" to navigate
   - Navigate to delivery address
4. **Mark as "In Delivery"** when you leave
5. **Mark as "Delivered"** when customer receives

### Order Status Flow (Delivery Partner)

```
assigned (Pick up from vendor)
  ↓ (You pick up order)
out_for_delivery (On the way to customer)
  ↓ (Customer receives)
delivered (Completed)
```

### Status Color Coding

| Color | Status | Meaning | Action |
|-------|--------|---------|--------|
| 🟡 YELLOW | assigned | Pick up from vendor | Pick up NEXT |
| 🔵 BLUE | out_for_delivery | On the way | Keep navigating |
| 🟢 GREEN | delivered | Completed | Done |

---

## Queue Management Best Practices

### For Vendors ✅ DO:
- ✅ Sort by "Oldest First" by default
- ✅ Prepare orders in queue order
- ✅ Update ETA as you work
- ✅ Move orders through status pipeline
- ✅ Prioritize red/orange time indicators

### For Vendors ❌ DON'T:
- ❌ Prepare newest orders first (skipping queue)
- ❌ Leave orders in "pending" for long
- ❌ Change ETA without reason
- ❌ Mix up order batches

### For Delivery Partners ✅ DO:
- ✅ Start with oldest assigned orders
- ✅ Turn on location sharing while online
- ✅ Deliver in queue order
- ✅ Update status immediately
- ✅ Contact customer if delayed

### For Delivery Partners ❌ DON'T:
- ❌ Skip orders and deliver newer ones
- ❌ Go offline without notifying system
- ❌ Delay marking "Delivered"
- ❌ Skip the queue order

---

## Real-World Scenario

### Scenario: Managing Peak Hour Orders

**11:30 AM - Lunch Rush at "Burger Palace" Shop**

**Vendor's view:**
```
Order #001 - Just now (RED PULSE) → URGENT - Start preparing
Order #002 - 2m ago (RED) → Start next batch  
Order #003 - 8m ago (ORANGE) → Customer getting impatient
Order #004 - 12m ago (YELLOW) → Might cancel if not ready
Order #005 - Just placed (RED) → Wait for first 3 to finish
```

**Vendor Actions:**
1. Start preparing Order #001 immediately (red pulse)
2. While cooking, confirm Order #005 (pending) in system
3. Mark Order #001 as "prepared" and assign delivery partner
4. Start Order #002 (was waiting 2m)
5. Keep checking and updating ETAs

**11:35 AM - Delivery Partner's View:**

```
Order #001 - Assigned - Just now (PRIORITY) → Pick up first
Order #002 - Assigned - 3m ago → Pick up second
Order #003 - Out for Delivery - 5m ago → Already delivering, track
```

**Delivery Partner Actions:**
1. Go Online (enable location tracking)
2. Pick up Order #001 from shop (prepared and ready)
3. Navigate to customer location
4. Mark as "Out for Delivery"
5. Navigate to next customer (Order #002)
6. Deliver in order

---

## Monitoring & Alerts

### When Orders Are Delayed

**If "Time in Queue" shows 20+ minutes:**
- Vendor: Check if order is stuck in preparation
- Vendor: Increase ETA or start prioritizing
- Delivery Partner: Check if order is ready for pickup

**If Delivery shows 30+ minutes:**
- System: May send notification to customer
- Delivery Partner: Use "Open in Maps" for better navigation
- Delivery Partner: Call customer with update

### What Happens If Queue is Broken

**Problem:** Vendors skip order #3 and make order #5 instead
- Order #3 customer waits longer than necessary
- Queue becomes chaotic
- Hard to track priorities

**Solution:** Always work in oldest-first order

---

## Tips for Efficiency

### For Vendors:
1. **Batch Similar Orders** - Group 2-3 burgers together, not scattered
2. **Update ETA Realistically** - Set correct times (5m for simple, 15m for complex)
3. **Communicate** - Mark as "prepared" as soon as ready
4. **Monitor** - Keep eye on orange/yellow time indicators

### For Delivery Partners:
1. **Plan Routes** - Group nearby deliveries together when possible
2. **Stay Online** - Don't go offline mid-route
3. **Be Responsive** - Answer customer calls quickly
4. **Update Status** - Mark delivered immediately upon handover

---

## FAQ

**Q: Can I change sort order?**  
A: Yes! Use the dropdown menu. But "Oldest First" is recommended for fairness.

**Q: What if I can't prepare in order?**  
A: Still try to maintain order. If Order #2 has complex request, at least mark it so everyone knows why #3 is being prepared.

**Q: How do delivery partners know which order is first?**  
A: "Time in Queue" shows when order was placed. Oldest time = first to deliver.

**Q: What if customer calls asking about their order?**  
A: Check "Time in Queue" to see how long they've been waiting. If 15+ mins, call them back with update.

**Q: Can delivery partner refuse orders?**  
A: They should accept assigned orders. Only skip if unable to deliver (blocked address, etc.).

---

## Workflow Diagram

```
CUSTOMER PLACES ORDER
         ↓
    [PENDING STATUS]
    Vendor notified
         ↓
  Vendor Confirms
    [CONFIRMED STATUS]
   Starts Cooking
    ↓        ↓
Prepared?  YES → [PREPARED STATUS]
    ↓             ↓
   NO → Cooking  Delivery Partner
    ↓             Assigned
 Continue        ↓
              [ASSIGNED STATUS]
              (Oldest First!)
                ↓
         Pick Up from Vendor
                ↓
          [OUT_FOR_DELIVERY]
           Navigate & Deliver
                ↓
         Deliver to Customer
                ↓
          [DELIVERED STATUS]
              ✅ DONE
```

---

## Implementation

✅ **Already Implemented:**
- [x] Oldest first sorting by default
- [x] Time in Queue column (Vendor)
- [x] Red pulse for urgent orders
- [x] Filter by status
- [x] Status color coding
- [x] Priority badges
- [x] Action buttons (Call, Maps, Status updates)

**Deployment:** Changes are live in both Vendor Dashboard and Delivery Dashboard

---

**Last Updated:** April 2026  
**Version:** 1.0
