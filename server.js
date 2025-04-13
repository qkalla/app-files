const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');
const http = require('http');
const socketIo = require('socket.io');
const dotenv = require('dotenv');
const path = require('path');
const bodyParser = require('body-parser');
const WebSocket = require('ws');

dotenv.config();

// Email configuration
const transporter = nodemailer.createTransport({
    host: 'smtp-mail.outlook.com', // Outlook SMTP server
    port: 587, // SMTP port
    secure: false, // true for 465, false for other ports
    auth: {
        user: 'ramkimar12@outlook.com', // Your Outlook email
        pass: 'bgdguvrfcdrgatad', // Your app password
    },
});

// MongoDB connection
mongoose.connect('mongodb+srv://aliilaamin12331:lolipop12@cluster0.9u48b.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0', {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log('MongoDB connected'))
.catch(err => console.error('MongoDB connection error:', err));

const app = express();
const server = http.createServer(app);

// CORS configuration
const corsOptions = {
    origin: ['http://localhost:8000', 'https://app-files-1.onrender.com],
    methods: ['GET', 'POST', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.static('public'));
app.use(bodyParser.json());

// Update Socket.IO config
const io = socketIo(server, {
    cors: {
        origin: ['https://app-files-1.onrender.com', 'http://localhost:8000'],
        methods: ["GET", "POST"],
        credentials: true
    }
});

// Add WebSocket for real-time updates
// Update WebSocket config
const wss = new WebSocket.Server({ 
    server,
    verifyClient: (info) => {
        const origin = info.origin;
        return origin === 'https://app-files-1.onrender.com' || 
               origin === 'http://localhost:8000';
    }
});

// Store admin connections
let adminConnections = new Set();

wss.on('connection', (ws) => {
    adminConnections.add(ws);
    
    ws.on('close', () => {
        adminConnections.delete(ws);
    });
});

// Middleware
app.use(express.json());
app.use(express.static('public'));
app.use(bodyParser.json());

// Import Order model
const Order = require('./models/Order');

// API Routes
app.post('/api/orders', async (req, res) => {
    console.log('Received order:', req.body); // Log the received order

    const orderNumber = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const order = new Order({
        ...req.body,
        orderNumber: orderNumber
    });

    try {
        const savedOrder = await order.save();
        io.emit('newOrder', savedOrder);
        console.log('New order saved:', savedOrder);

        // Send email notification
        const mailOptions = {
            from: 'ramkimar12@outlook.com', // Sender address
            to: order.email, // List of recipients
            subject: 'Order Confirmation', // Subject line
            text: `Thank you for your order! Your order number is ${order.orderNumber}.`, // Plain text body
            html: `<b>Thank you for your order!</b><br>Your order number is <strong>${order.orderNumber}</strong>.`, // HTML body
        };

        await transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                return console.log('Error sending email:', error);
            }
            console.log('Email sent successfully:', info.response);
        });

        // Notify all admin panels
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
        console.error('Error saving order:', error); // Log the error
        if (error.name === 'ValidationError') {
            res.status(400).json({ success: false, message: 'Validation error', details: error.errors });
        } else {
            res.status(500).json({ success: false, message: 'Error saving order' });
        }
    }
});

// Accept order and send email
app.post('/api/orders/:orderId/accept', async (req, res) => {
    try {
        const order = await Order.findByIdAndUpdate(
            req.params.orderId,
            { 
                status: 'processing',
                acceptedAt: new Date()
            },
            { new: true }
        );

        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        // Log the order before sending the email
        console.log('Order accepted:', order);

        // Send email to customer
        const emailData = {
            from: 'ramkimar12@outlook.com', // Sender address
            to: order.email, // Customer's email address
            subject: `Order ${order.orderNumber} Accepted`,
            text: `Your order ${order.orderNumber} has been accepted!`,
            html: `
                <h2>Your order has been accepted!</h2>
                <p>Order Number: ${order.orderNumber}</p>
                <p>Total Amount: ${order.total} AMD</p>
                <p>Delivery Address: ${order.address || 'Not provided'}</p>
                <p>Track your order here: http://localhost:3000/track/${order.orderNumber}</p>
            `
        };

        await transporter.sendMail(emailData);
        console.log('Email sent successfully to:', order.email); // Log success

        // Notify admin panel
        io.emit('orderAccepted', order);

        res.json({ success: true, order });
    } catch (error) {
        console.error('Error accepting order:', error);
        res.status(500).json({ success: false, message: 'Error accepting order' });
    }
});

// Print order details
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

// Track order
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

app.get('/api/orders', async (req, res) => {
    try {
        const orders = await Order.find().sort({ orderDate: -1 });
        res.json(orders);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/orders/:id/status', async (req, res) => {
    const { status } = req.body; // Expecting { status: 'processing' }
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

// Socket connection
io.on('connection', (socket) => {
    console.log('Admin connected');
    socket.on('disconnect', () => {
        console.log('Admin disconnected');
    });
});

// Route to serve the admin panel
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html')); // Adjust the path if necessary
});

app.options('/api/orders', cors(corsOptions)); // Preflight request for the orders endpoint

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});