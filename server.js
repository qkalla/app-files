const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const http = require('http');
const socketIo = require('socket.io');
const dotenv = require('dotenv');
const path = require('path');
const bodyParser = require('body-parser');
const WebSocket = require('ws');
const webpush = require('web-push');


dotenv.config();

const app = express();
const server = http.createServer(app);

// MongoDB connection
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log('✅ MongoDB connected'))
.catch(err => console.error('❌ MongoDB connection error:', err));

// CORS config
const corsOptions = {
  origin: [
    'https://app-files-1.onrender.com',
    'https://app-files.onrender.com',
    'http://localhost:3000',
    'http://localhost:3001'
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 204
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.static('public'));
app.use(bodyParser.json());

// Socket.io config
const io = socketIo(server, {
  cors: {
    origin: [
      'https://app-files-1.onrender.com',
      'https://app-files.onrender.com',
      'http://localhost:3000',
      'http://localhost:3001'
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true
  }
});

// WebSocket config
const wss = new WebSocket.Server({
  server,
  verifyClient: (info) => {
    const origin = info.origin;
    return origin === 'https://supermarketn.loca.lt' || origin === 'http://localhost:8000';
  }
});

let adminConnections = new Set();
wss.on('connection', (ws) => {
  adminConnections.add(ws);
  ws.on('close', () => {
    adminConnections.delete(ws);
  });
});

// Web Push Notification setup
webpush.setVapidDetails(
  'mailto:youremail@gmail.com',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

// Store subscriptions with device ID
const deviceSubscriptions = new Map();

// Subscribe endpoint
app.post('/subscribe', (req, res) => {
    const { subscription, deviceId } = req.body;
    
    // Store subscription with device ID
    deviceSubscriptions.set(deviceId, subscription);
    res.status(201).json({});
});

// Function to send notification to specific device
async function sendNotificationToDevice(deviceId, title, body, orderId, status, amount) {
    const subscription = deviceSubscriptions.get(deviceId);
    if (!subscription) return;

    const payload = JSON.stringify({
        title: title,
        body: body,
        orderId: orderId,
        status: status,
        amount: amount
    });

    try {
        await webpush.sendNotification(subscription, payload);
    } catch (error) {
        console.error('Error sending notification:', error);
        if (error.statusCode === 410) {
            // Remove invalid subscription
            deviceSubscriptions.delete(deviceId);
        }
    }
}

// Import Order model
const Order = require('./models/Order');

// API to create a new order
app.post('/api/orders', async (req, res) => {
  console.log('✅ Received order:', req.body);

  const orderNumber = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const order = new Order({ ...req.body, orderNumber });

  try {
    const savedOrder = await order.save();
    io.emit('newOrder', savedOrder);
    console.log('✅ New order saved:', savedOrder);

    // Send notification only to the device that created the order
    await sendNotificationToDevice(
        savedOrder.deviceId,
        'Order Confirmed',
        `Your order #${savedOrder._id} has been received. Total: $${savedOrder.total}`,
        savedOrder._id,
        'submitted',
        savedOrder.total
    );

    // Notify admin panels by WebSocket
    adminConnections.forEach(client => {
      client.send(JSON.stringify({
        type: 'NEW_ORDER',
        order: { ...savedOrder._doc, _id: savedOrder._id }
      }));
    });

    res.status(200).json({ success: true, orderId: savedOrder._id });
  } catch (error) {
    console.error('❌ Error saving order:', error);
    res.status(500).json({ success: false, message: 'Error saving order' });
  }
});

// Accept order API
app.post('/api/orders/:orderId/accept', async (req, res) => {
  try {
    const order = await Order.findByIdAndUpdate(
      req.params.orderId,
      { status: 'processing', acceptedAt: new Date() },
      { new: true }
    );

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    console.log('✅ Order accepted:', order);

    io.emit('orderAccepted', order);

    res.json({ success: true, order });
  } catch (error) {
    console.error('❌ Error accepting order:', error);
    res.status(500).json({ success: false, message: 'Error accepting order' });
  }
});

// Print order API
app.get('/api/orders/:orderId/print', async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId);
    res.json({
      success: true,
      printData: {
        orderNumber: order.orderNumber,
        date: order.orderDate,
        customer: order.customerName,
        items: order.items,
        total: order.total,
        address: order.address || 'Not provided'
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Track order API
app.get('/api/orders/track/:orderNumber', async (req, res) => {
  try {
    const order = await Order.findOne({ orderNumber: req.params.orderNumber });
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    res.json({
      status: order.status,
      orderDate: order.orderDate,
      acceptedAt: order.acceptedAt,
      estimatedDelivery: order.estimatedDelivery
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Orders list API
app.get('/api/orders', async (req, res) => {
  try {
    const orders = await Order.find().sort({ orderDate: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// WebSocket socket.io
io.on('connection', (socket) => {
  console.log('✅ Admin connected');
  socket.on('disconnect', () => {
    console.log('❌ Admin disconnected');
  });
});

// Serve admin panel
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.options('/api/orders', cors(corsOptions));

// Update order status API
app.post('/api/orders/:orderId/status', async (req, res) => {
  try {
    const order = await Order.findByIdAndUpdate(
      req.params.orderId,
      { status: req.body.status },
      { new: true }
    );

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    console.log('✅ Order status updated:', order);

    // Emit status update to all connected clients
    io.emit('orderStatusUpdated', {
      orderId: order._id,
      newStatus: order.status
    });

    // Notify admin panels by WebSocket
    adminConnections.forEach(client => {
      client.send(JSON.stringify({
        type: 'STATUS_UPDATE',
        orderId: order._id,
        newStatus: order.status
      }));
    });

    // Send notification only to the device that created the order
    let title, body;
    switch (order.status) {
      case 'processing':
        title = 'Order in Progress';
        body = `Your order #${order._id} is being prepared. Total: $${order.total}`;
        break;
      case 'delivering':
        title = 'Order on the Way';
        body = `Your order #${order._id} is out for delivery. Total: $${order.total}`;
        break;
      case 'delivered':
        title = 'Order Delivered';
        body = `Your order #${order._id} has been delivered. Total: $${order.total}`;
        break;
    }

    await sendNotificationToDevice(
        order.deviceId,
        title,
        body,
        order._id,
        order.status,
        order.total
    );

    res.json({ success: true, order });
  } catch (error) {
    console.error('❌ Error updating order status:', error);
    res.status(500).json({ success: false, message: 'Error updating order status' });
  }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
