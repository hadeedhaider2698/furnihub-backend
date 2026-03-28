import Order from '../models/Order.js';
import Product from '../models/Product.js';
import catchAsync from '../utils/catchAsync.js';
import AppError from '../utils/appError.js';
import { successResponse } from '../utils/apiResponse.js';
import stripe from '../config/stripe.js';

export const createOrder = catchAsync(async (req, res, next) => {
  const { items, shippingAddress, paymentMethod, notes } = req.body;

  let subtotal = 0;
  const processedItems = [];

  for (const item of items) {
    const product = await Product.findById(item.product);
    if (!product || !product.isActive) {
      return next(new AppError(`Product ${item.product} not found or inactive`, 404));
    }
    if (product.stock < item.quantity) {
      return next(new AppError(`Insufficient stock for ${product.title}`, 400));
    }

    const itemSubtotal = (product.discountPrice || product.price) * item.quantity;
    subtotal += itemSubtotal;

    processedItems.push({
      product: product._id,
      vendor: product.vendor,
      title: product.title,
      image: product.images[0]?.url,
      price: product.discountPrice || product.price,
      quantity: item.quantity,
      color: item.color,
      subtotal: itemSubtotal
    });

    // Deduct stock
    product.stock -= item.quantity;
    product.totalSold += item.quantity;
    await product.save();
  }

  const deliveryCharge = 50; // Mock fixed delivery charge
  const platformFee = subtotal * (process.env.PLATFORM_FEE_PERCENT / 100);
  const total = subtotal + deliveryCharge;

  const order = await Order.create({
    customer: req.user.id,
    items: processedItems,
    shippingAddress,
    paymentMethod,
    subtotal,
    deliveryCharge,
    platformFee,
    total,
    notes,
    statusHistory: [{ status: 'placed', note: 'Order placed by customer' }]
  });

  successResponse(res, 201, 'Order created successfully', { order });
});

export const getMyOrders = catchAsync(async (req, res, next) => {
  const orders = await Order.find({ customer: req.user.id }).sort({ createdAt: -1 });
  successResponse(res, 200, 'Your orders', { orders });
});

export const getOrderById = catchAsync(async (req, res, next) => {
  const order = await Order.findById(req.params.id)
    .populate('customer', 'name email')
    .populate('items.product', 'title slug images');

  if (!order) return next(new AppError('Order not found', 404));

  // Authorization: must be customer, vendor involved, or admin
  const isCustomer = order.customer._id.toString() === req.user.id.toString();
  const isAdmin = req.user.role === 'admin';
  // Check if vendor
  const isVendor = req.user.role === 'vendor';

  if (!isCustomer && !isAdmin && !isVendor) {
    return next(new AppError('Unauthorized access to order', 403));
  }

  successResponse(res, 200, 'Order detail', { order });
});

export const cancelOrder = catchAsync(async (req, res, next) => {
  const order = await Order.findOne({ _id: req.params.id, customer: req.user.id });
  if (!order) return next(new AppError('Order not found', 404));

  if (order.orderStatus !== 'placed') {
    return next(new AppError('Order cannot be cancelled at this stage', 400));
  }

  order.orderStatus = 'cancelled';
  order.statusHistory.push({ status: 'cancelled', note: 'Cancelled by customer' });
  await order.save();

  // Restore stock
  for (const item of order.items) {
    const product = await Product.findById(item.product);
    if (product) {
      product.stock += item.quantity;
      product.totalSold -= item.quantity;
      await product.save();
    }
  }

  successResponse(res, 200, 'Order cancelled successfully', { order });
});

export const createPaymentIntent = catchAsync(async (req, res, next) => {
  const { orderId } = req.body;
  
  const order = await Order.findById(orderId);
  if (!order || order.customer.toString() !== req.user.id.toString()) {
    return next(new AppError('Order not found', 404));
  }
  
  if (order.paymentStatus === 'paid') {
    return next(new AppError('Order is already paid', 400));
  }

  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(order.total * 100), // Stripe expects cents
    currency: 'usd',
    metadata: { orderId: order._id.toString() }
  });

  order.stripePaymentIntentId = paymentIntent.id;
  await order.save();

  successResponse(res, 200, 'Payment intent created', { clientSecret: paymentIntent.client_secret });
});

export const stripeWebhook = catchAsync(async (req, res, next) => {
  const signature = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object;
    const orderId = paymentIntent.metadata.orderId;

    await Order.findByIdAndUpdate(orderId, {
      paymentStatus: 'paid',
      orderStatus: 'confirmed',
      $push: { statusHistory: { status: 'confirmed', note: 'Payment received via Stripe' } }
    });
  }

  res.status(200).json({ received: true });
});
