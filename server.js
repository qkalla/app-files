const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const { Resend } = require('resend');
const http = require('http');
const socketIo = require('socket.io');
const dotenv = require('dotenv');
const path = require('path');
const bodyParser = require('body-parser');
const WebSocket = require('ws');

dotenv.config();

// Resend Email service setup
const resend = new Resend(process.env.RESEND_API_KEY);

// MongoDB connection
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('MongoDB connected'))
.catch(err => console.error('MongoDB connection error:', err));

const app = express();
const server = http.createServer(app);

// CORS configuration
const corsOptions = {
  origin: ['http://localhost:8000', 'https://app-files-1.onrender.com'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.static('public'));
app.use(bodyParser.json());

// Socket.IO setup
const io = socketIo(server, {
  cors: {
    origin: ["https://app-files.onrender.com", "https://app-files-1.onrender.com"],
    methods: ["GET", "POST"]
  }
});

// WebSocket setup
const wss = new WebSocket.Server({ 
  server,
  verifyClient: (info) => {
    const origin = info.origin;
    return origin === 'https://app-files-1.onrender.com' || 
           origin === 'http://localhost:8000';
  }
});

// Track connected admin panels
let adminConnections = new Set();

wss.on('connection', (ws) => {
  adminConnections.add(ws);
  
  ws.on('close', () => {
    adminConnections.delete(ws);
  });
});

// Mongoose model
const Order = require('./models/Order');

// API to create a new order
app.post('/api/orders', async (req, res) => {
  console.log('Received order:', req.body);

  const orderNumber = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const order = new Order({
    ...req.body,
    orderNumber: orderNumber
  });

  try {
    const savedOrder = await order.save();
    io.emit('newOrder', savedOrder);
    console.log('New order saved:', savedOrder);

    // Send confirmation email to customer
    await resend.emails.send({
      from: 'supermarket@resend.dev',
      to: order.email,
      subject: 'Order Confirmation',
      html: `
        <h2>Thank you for your order!</h2>
        <p>Your order is being processed.</p>
        <h3>Order Summary:</h3>
        <ul>
          ${order.items.map(item => `<li>${item.product} — ${item.qty} x ${item.price} AMD</li>`).join('')}
        </ul>
        <p><strong>Total:</strong> ${order.total} AMD</p>
      `
    });

    // Notify all connected admin panels via WebSocket
    adminConnections.forEach(client => {
      client.send(JSON.stringify({
        type: 'NEW_ORDER',
        order: {
          ...order._doc,
          _id: savedOrder._id
        }
      }));
    });

    res.status(200).json({ success: true, orderId: savedOrder._id });
  } catch (error) {
    console.error('Error saving order:', error);
    res.status(500).json({ success: false, message: 'Error saving order' });
  }
});

// Accept order route
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

    console.log('Order accepted:', order);

    await resend.emails.send({
      from: 'supermarket@resend.dev',
      to: order.email,
      subject: `Order ${order.orderNumber} Accepted`,
      html: `
        <h2>Your order has been accepted!</h2>
        <p>Order Number: ${order.orderNumber}</p>
        <p>Total: ${order.total} AMD</p>
        <p>Delivery Address: ${order.address || 'Not provided'}</p>
      `
    });

    io.emit('orderAccepted', order);
    res.json({ success: true, order });
  } catch (error) {
    console.error('Error accepting order:', error);
    res.status(500).json({ success: false, message: 'Error accepting order' });
  }
});

// Track order route
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

// Admin panel order list
app.get('/api/orders', async (req, res) => {
  try {
    const orders = await Order.find().sort({ orderDate: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update order status
app.post('/api/orders/:id/status', async (req, res) => {
  const { status } = req.body;
  try {
    const updatedOrder = await Order.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!updatedOrder) {
      return res.status(404).json({ message: 'Order not found' });
    }
    res.json(updatedOrder);
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ message: 'Error updating order status' });
  }
});

// Socket.io connection
io.on('connection', (socket) => {
  console.log('Admin connected');
  socket.on('disconnect', () => {
    console.log('Admin disconnected');
  });
});

// Admin panel route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Enable CORS preflight
app.options('/api/orders', cors(corsOptions));

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
