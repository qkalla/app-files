const mongoose = require('mongoose');

// Define Order Schema
const orderSchema = new mongoose.Schema({
    customerName: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String, required: true },
    items: { type: Array, required: true }, // Ensure this is set to Array
    total: { type: Number, required: true },
    paymentMethod: { type: String, required: true },
    address: { type: String, required: false }, // Optional field
    status: { type: String, default: 'new' },
    orderDate: { type: Date, default: Date.now },
    orderNumber: { type: String, required: true } // Assuming you have an order number
});

// Create Order Model
const Order = mongoose.model('Order', orderSchema);

module.exports = Order; // Export the model for use in other files