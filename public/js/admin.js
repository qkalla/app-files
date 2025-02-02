class AdminPanel {
    constructor() {
        this.orders = [];
        this.socket = io('http://localhost:3000');
        this.notificationSound = document.getElementById('notificationSound');
        this.init();
    }

    init() {
        this.setupSocketListeners();
        this.fetchOrders();
        this.setupEventListeners();
        this.setupRealTimeUpdates();
        this.initEmailJS();
        this.initNotificationSound();
    }

    initEmailJS() {
        emailjs.init("YOUR_USER_ID"); // Replace with your EmailJS user ID
    }

    initNotificationSound() {
        this.notificationSound = new Audio('/sounds/notification.mp3'); // Ensure this path is correct
    }

    setupSocketListeners() {
        this.socket.on('newOrder', (order) => {
            this.handleNewOrder(order);
        });

        this.socket.on('orderStatusUpdate', (update) => {
            this.handleStatusUpdate(update);
        });
    }

    setupEventListeners() {
        // Menu toggle
        document.getElementById('menuToggle')?.addEventListener('click', () => {
            document.querySelector('.sidebar').classList.toggle('active');
        });

        // Status filter
        const statusFilter = document.getElementById('statusFilter');
        if (statusFilter) {
            statusFilter.addEventListener('change', (e) => {
                console.log('Status filter changed:', e.target.value);
                this.filterOrders(e.target.value);
            });
        }

        // Search
        document.getElementById('searchOrder')?.addEventListener('input', (e) => {
            this.searchOrders(e.target.value);
        });

        // Navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                this.handleNavigation(e.currentTarget.dataset.view);
            });
        });

        // Modal close button
        document.querySelector('.close-modal').addEventListener('click', () => {
            document.getElementById('orderModal').style.display = 'none'; // Hide the modal
        });

        // Update status button in modal
        document.getElementById('updateStatusBtn')?.addEventListener('click', () => {
            const orderId = document.getElementById('modalOrderNumber').dataset.orderId;
            const newStatus = document.getElementById('modalStatusSelect').value;
            this.updateOrderStatus(orderId, newStatus);
        });

        // Send email button in modal
        document.getElementById('sendEmailBtn')?.addEventListener('click', () => {
            const orderId = document.getElementById('modalOrderNumber').dataset.orderId;
            const order = this.orders.find(o => o._id === orderId);
            if (order) {
                this.sendStatusUpdateEmail(order);
            }
        });

        // Add click listeners for stat cards
        document.querySelector('.stat-card.processing')?.addEventListener('click', () => {
            this.filterOrders('processing');
            if (statusFilter) statusFilter.value = 'processing';
        });

        document.querySelector('.stat-card.delivered')?.addEventListener('click', () => {
            this.filterOrders('delivered');
            if (statusFilter) statusFilter.value = 'delivered';
        });

        document.querySelector('.stat-card.new')?.addEventListener('click', () => {
            this.filterOrders('pending');
            if (statusFilter) statusFilter.value = 'pending';
        });

        document.querySelectorAll('.forward-button').forEach(button => {
            button.addEventListener('click', async () => {
                const orderId = button.dataset.orderId; // Get the order ID from the button
                await this.updateOrderStatus(orderId, 'processing'); // Update to processing
            });
        });

        document.querySelectorAll('.out-for-delivery-button').forEach(button => {
            button.addEventListener('click', async () => {
                const orderId = button.dataset.orderId; // Get the order ID from the button
                await this.updateOrderStatus(orderId, 'delivering'); // Update to delivering
            });
        });
    }

    async fetchOrders() {
        try {
            const response = await fetch('http://localhost:3000/api/orders');
            if (!response.ok) {
                throw new Error('Failed to fetch orders');
            }
            this.orders = await response.json();
            this.displayOrders(this.orders);
            this.updateDashboardStats();
        } catch (error) {
            console.error('Error fetching orders:', error);
            this.showError('Failed to load orders');
        }
    }

    displayOrders(orders) {
        const totalSales = orders.reduce((acc, order) => acc + order.total, 0);
        const totalSalesElement = document.getElementById('totalSales');
        totalSalesElement.textContent = `${totalSales} AMD`;

        const totalOrdersCount = orders.length; // Count total orders
        const totalOrdersElement = document.getElementById('totalOrders');
        totalOrdersElement.textContent = `Total Orders: ${totalOrdersCount}`;

        const ordersList = document.getElementById('ordersList');
        if (!ordersList) return;

        // Sort orders to show newest first
        const sortedOrders = [...orders].sort((a, b) => 
            new Date(b.orderDate) - new Date(a.orderDate)
        );

        ordersList.innerHTML = sortedOrders.map(order => this.createOrderCard(order)).join('');
    }

    createOrderCard(order) {
        const orderTime = new Date(order.orderDate).toLocaleTimeString(); // Format the time

        let statusOptions = '';
        let paymentButtons = '';

        if (order.paymentMethod === 'cash') {
            paymentButtons = `
                <button onclick="adminPanel.updateOrderStatus('${order._id}', 'processing')" style="margin-right: 10px;">Forward to Processing</button>
                <button onclick="adminPanel.updateOrderStatus('${order._id}', 'cancelled')">Refuse</button>
            `;
        } else if (order.paymentMethod === 'card') {
            paymentButtons = `
                <button onclick="adminPanel.updateOrderStatus('${order._id}', 'processing')">Forward to Processing</button>
            `;
        }

        return `
            <div class="order-card ${order.status}" data-id="${order._id}" style="background-color: #fff; margin-bottom: 15px; padding: 15px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <div class="order-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                    <h3 style="margin: 0;">Order #${order.orderNumber}</h3>
                    <span class="status ${order.status}" style="padding: 5px 10px; border-radius: 4px; background-color: ${this.getStatusColor(order.status)}; color: white;">
                        ${order.status}
                    </span>
                </div>
                <div class="order-details" style="margin-bottom: 10px;">
                    <p><i class="fas fa-user"></i> ${order.customerName}</p>
                    <p><i class="fas fa-phone"></i> ${order.phone}</p>
                    <p><i class="fas fa-envelope"></i> ${order.email}</p>
                    <p><i class="fas fa-map-marker-alt"></i> ${order.address}</p>
                    <p><i class="fas fa-money-bill"></i> ${parseFloat(order.total).toLocaleString()} AMD</p>
                    <p><i class="fas fa-clock"></i> ${orderTime}</p> <!-- Display order time -->
                </div>
                <div class="order-items" style="margin-bottom: 10px;">
                    ${this.renderOrderItems(order.items)}
                </div>
                <div class="order-actions" style="display: flex; gap: 10px;">
                    ${paymentButtons}
                    <button class="btn-view" onclick="adminPanel.viewOrderDetails('${order._id}')">View</button>
                    <button class="btn-print" onclick="adminPanel.printOrder('${order._id}')">Print</button>
                </div>
            </div>
        `;
    }

    renderOrderItems(items) {
        return `
            <div class="items-list">
                ${items.map(item => `
                    <div class="order-item">
                        <span class="item-name">${item.name}</span>
                        <span class="item-quantity">${item.quantity}x</span>
                        <span class="item-price">${item.price} AMD</span>
                    </div>
                `).join('')}
            </div>
        `;
    }

    async updateOrderStatus(orderId, newStatus) {
        try {
            const response = await fetch(`/api/orders/${orderId}/status`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            });
            if (!response.ok) {
                throw new Error('Failed to update order status');
            }
            await this.fetchOrders(); // Refresh the orders list
        } catch (error) {
            console.error('Error updating order status:', error);
        }
    }

    async sendStatusUpdateEmail(order) {
        try {
            const templateParams = {
                to_email: order.email,
                order_number: order.orderNumber,
                customer_name: order.customerName,
                order_status: order.status,
                order_items: order.items.map(item => `${item.name} (${item.quantity})`).join(', '),
                total_amount: order.total,
                delivery_address: order.address
            };

            const response = await emailjs.send(
                'YOUR_SERVICE_ID', // Replace with your EmailJS service ID
                'YOUR_TEMPLATE_ID', // Replace with your EmailJS template ID
                templateParams
            );

            console.log('Email sent:', response);
            this.showSuccess('Status update email sent');
        } catch (error) {
            console.error('Email error:', error);
            this.showError('Failed to send status update email');
        }
    }

    viewOrderDetails(orderId) {
        const order = this.orders.find(o => o._id === orderId);
        if (!order) return;

        const modal = document.getElementById('orderModal');
        const modalContent = modal.querySelector('.modal-content');

        modalContent.innerHTML = this.createOrderDetailModal(order);
        modal.style.display = 'block';
    }

    createOrderDetailModal(order) {
        return `
            <div class="modal-header">
                <h2>Order Details</h2>
                <button class="close-modal">&times;</button>
            </div>
            <div class="modal-body">
                <div class="order-info">
                    <h3>Order #${order.orderNumber}</h3>
                    <p>Status: <span class="status ${order.status}">${order.status}</span></p>
                    <p>Date: ${new Date(order.orderDate).toLocaleString()}</p>
                    
                    <div class="customer-info">
                        <h4>Customer Information</h4>
                        <p><i class="fas fa-user"></i> ${order.customerName}</p>
                        <p><i class="fas fa-phone"></i> ${order.phone}</p>
                        <p><i class="fas fa-envelope"></i> ${order.email}</p>
                        <p><i class="fas fa-map-marker-alt"></i> ${order.address}</p>
                    </div>

                    <div class="order-items">
                        <h4>Order Items</h4>
                        ${this.renderOrderItems(order.items)}
                        <p class="total">Total: ${order.total} AMD</p>
                    </div>
                </div>
            </div>
        `;
    }

    closeOrderModal() {
        const modal = document.getElementById('orderModal');
        modal.style.display = 'none';
    }

    printOrder(orderId) {
        const order = this.orders.find(o => o._id === orderId);
        if (!order) return;

        const printWindow = window.open('', '_blank');
        const printContent = `
            <html>
                <head>
                    <title>Order #${order.orderNumber}</title>
                    <style>
                        body { font-family: Arial, sans-serif; padding: 20px; }
                        .print-header { text-align: center; margin-bottom: 20px; }
                        .order-info { margin-bottom: 20px; }
                        .items-list { border-top: 1px solid #ddd; margin-top: 20px; }
                        .order-item { padding: 10px 0; border-bottom: 1px solid #ddd; }
                        .total { font-weight: bold; margin-top: 20px; }
                    </style>
                </head>
                <body>
                    <div class="print-header">
                        <h1>Order #${order.orderNumber}</h1>
                        <p>Date: ${new Date(order.orderDate).toLocaleString()}</p>
                    </div>
                    <div class="order-info">
                        <h2>Customer Information</h2>
                        <p>Name: ${order.customerName}</p>
                        <p>Phone: ${order.phone}</p>
                        <p>Email: ${order.email}</p>
                        <p>Address: ${order.address}</p>
                    </div>
                    <div class="items-list">
                        <h2>Order Items</h2>
                        ${order.items.map(item => `
                            <div class="order-item">
                                <span>${item.name}</span>
                                <span>${item.quantity}x</span>
                                <span>${item.price} AMD</span>
                            </div>
                        `).join('')}
                        <p class="total">Total: ${order.total} AMD</p>
                    </div>
                </body>
            </html>
        `;

        printWindow.document.write(printContent);
        printWindow.document.close();
        printWindow.print();
    }

    updateDashboardStats() {
        // New orders count (including both new and pending)
        const newOrdersCount = this.orders.filter(order => 
            order.status === 'new' || order.status === 'pending'
        ).length;
        document.getElementById('newOrdersCount').textContent = newOrdersCount;

        // Processing orders count
        const processingCount = this.orders.filter(order => 
            order.status === 'processing'
        ).length;
        document.getElementById('processingCount').textContent = processingCount;

        // Delivered orders count
        const deliveredCount = this.orders.filter(order => 
            order.status === 'delivered'
        ).length;
        document.getElementById('deliveredCount').textContent = deliveredCount;

        // Calculate total sales from orders that are out for delivery
        const totalSales = this.orders
            .filter(order => order.status === 'delivering')
            .reduce((total, order) => {
                const orderTotal = parseFloat(order.total) || 0;
                return total + orderTotal;
            }, 0);

        document.getElementById('totalSales').textContent = `${totalSales.toLocaleString()} AMD`;
    }

    filterOrders(status) {
        const filteredOrders = status === 'all' 
            ? this.orders 
            : this.orders.filter(order => order.status === status);
        this.displayOrders(filteredOrders);
    }

    searchOrders(query) {
        const searchTerm = query.toLowerCase();
        const filteredOrders = this.orders.filter(order => 
            order.orderNumber.toLowerCase().includes(searchTerm) ||
            order.customerName.toLowerCase().includes(searchTerm) ||
            order.phone.toLowerCase().includes(searchTerm) ||
            order.email.toLowerCase().includes(searchTerm)
        );
        this.displayOrders(filteredOrders);
    }

    handleNewOrder(order) {
        this.notificationSound?.play();
        this.orders.unshift(order);
        this.displayOrders(this.orders);
        this.updateDashboardStats();
        this.showSuccess(`New order received from ${order.customerName}`);
    }

    handleStatusUpdate(update) {
        const orderIndex = this.orders.findIndex(o => o._id === update.orderId);
        if (orderIndex !== -1) {
            this.orders[orderIndex].status = update.status;
            this.displayOrders(this.orders);
            this.updateDashboardStats();
        }
    }

    showSuccess(message) {
        Swal.fire({
            title: 'Success',
            text: message,
            icon: 'success',
            timer: 2000,
            toast: true,
            position: 'top-end'
        });
    }

    showError(message) {
        Swal.fire({
            title: 'Error',
            text: message,
            icon: 'error',
            toast: true,
            position: 'top-end'
        });
    }

    setupRealTimeUpdates() {
        // Example: Simulate receiving a new order every 30 seconds
        setInterval(() => {
            this.fetchOrders(); // Fetch orders periodically
            this.playNotificationSound(); // Play sound for new orders
        }, 30000);
    }

    playNotificationSound() {
        this.notificationSound.play().catch(error => {
            console.error('Error playing notification sound:', error);
        });
    }

    getStatusColor(status) {
        switch(status) {
            case 'new': return '#007bff';  // Blue
            case 'processing': return '#ffc107';  // Yellow
            case 'delivering': return '#17a2b8';  // Cyan
            case 'delivered': return '#28a745';  // Green
            case 'cancelled': return '#dc3545';  // Red
            default: return '#6c757d';  // Gray
        }
    }
}

// Initialize admin panel
const adminPanel = new AdminPanel();