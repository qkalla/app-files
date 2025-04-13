class AdminPanel {
    constructor() {
        this.orders = [];
        this.socket = io('https://app-files.onrender.com');
        this.notificationSound = new Audio('/sounds/notification.mp3'); // Ensure this path is correct
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
        this.socket.on('newOrder', (order) => this.handleNewOrder(order));
        this.socket.on('orderStatusUpdate', (update) => {
            this.handleStatusUpdate(update);
            this.displayOrders(); // Redisplay orders with updated status
        });
    }

    async fetchOrders() {
        this.showLoadingIndicator(); // Show loading indicator
        try {
            const response = await fetch('https://app-files.onrender.com/api/orders');
            if (!response.ok) throw new Error('Failed to fetch orders');
            let fetchedOrders = await response.json();
            // Filter out orders without a valid status
            this.orders = fetchedOrders.filter(order => ['new', 'processing', 'delivering', 'delivered'].includes(order.status));
            this.displayOrders();
            this.updateDashboardStats();
        } catch (error) {
            console.error('Error fetching orders:', error);
            this.showError('Failed to load orders');
        } finally {
            this.hideLoadingIndicator(); // Hide loading indicator
        }
    }

    displayOrders(filteredOrders = this.orders) {
        // Define valid statuses
        const validStatuses = ['new', 'processing', 'delivering', 'delivered'];

        // Process each valid status
        validStatuses.forEach(status => {
            const container = document.getElementById(`${status}OrdersList`);
            if (container) { // Check if the container exists
                container.innerHTML = ''; // Clear existing orders
                filteredOrders.filter(order => order.status === status).forEach(order => {
                    container.appendChild(this.createOrderCard(order));
                });
            }
        });
    }

    createOrderCard(order) {
        const orderDiv = document.createElement('div');
        orderDiv.className = 'order-card';
        orderDiv.innerHTML = `
            <h2>Order #${order.orderNumber}</h2>
            <p>Name: ${order.customerName}</p>
            <p>Phone: ${order.phone}</p>
            <p>Email: ${order.email}</p>
            <p>Address: ${order.address}</p>
            <p>Payment Method: ${order.paymentMethod}</p>
            <p>Total: ${order.total} AMD</p>
            <p>Status: <strong>${order.status}</strong></p>
            <div class="device-info">
                <h3>Device Information:</h3>
                <p>Device Type: ${order.deviceInfo?.device || 'Unknown'}</p>
                <p>Operating System: ${order.deviceInfo?.os || 'Unknown'}</p>
                <p>Browser: ${order.deviceInfo?.browser || 'Unknown'}</p>
                <p>Screen Size: ${order.deviceInfo?.screenSize || 'Unknown'}</p>
            </div>
            <h3>Items:</h3>
            <ul>
                ${order.items.map(item => `<li>${item.name} (x${item.quantity}) - ${item.price} AMD</li>`).join('')}
            </ul>
            <div class="order-actions">
                ${this.getOrderActionButtons(order)}
            </div>
            <hr>
        `;
        return orderDiv;
    }

    getOrderActionButtons(order) {
        let buttons = '';
        if (order.status === 'new') {
            if (order.paymentMethod === 'cash_on_delivery') {
                buttons += `<button class="btn btn-refuse" onclick="adminPanel.refuseOrder('${order._id}')">Refuse Order</button>`;
            }
            buttons += `<button class="btn btn-forward" onclick="adminPanel.updateOrderStatus('${order._id}', 'processing')">Forward to Progress</button>`;
            buttons += `<button class="btn btn-print" onclick="adminPanel.printOrder('${order._id}')">Print</button>`;
        } else if (order.status === 'processing') {
            buttons += `<button class="btn btn-deliver" onclick="adminPanel.updateOrderStatus('${order._id}', 'delivering')">Send to Delivery</button>`;
        } else if (order.status === 'delivering') {
            buttons += `<button class="btn btn-complete" onclick="adminPanel.updateOrderStatus('${order._id}', 'delivered')">Mark as Delivered</button>`;
        }
        return buttons;
    }

    async updateOrderStatus(orderId, newStatus) {
        try {
            const response = await fetch(`https://app-files.onrender.com/api/orders/${orderId}/status`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            });
            if (!response.ok) throw new Error('Failed to update order status');
            this.orders = this.orders.map(order => 
                order._id === orderId ? { ...order, status: newStatus } : order
            );
            this.displayOrders();
            this.showSuccess(`Order status updated to ${newStatus}`);
        } catch (error) {
            console.error('Error updating order status:', error);
            this.showError('Failed to update order status');
        }
    }

    async refuseOrder(orderId) {
        try {
            const response = await fetch(`https://app-files.onrender.com/api/orders/${orderId}/refuse`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            if (!response.ok) {
                throw new Error('Failed to refuse order');
            }
            this.orders = this.orders.map(order => 
                order._id === orderId ? { ...order, status: 'archived' } : order
            );
            this.displayOrders();
            this.showSuccess(`Order has been refused and archived.`);
        } catch (error) {
            console.error('Error refusing order:', error);
            this.showError('Failed to refuse order');
        }
    }

    handleNewOrder(order) {
        this.notificationSound.play();
        this.orders.unshift(order);
        this.displayOrders();
        this.updateDashboardStats();
        this.showSuccess(`New order received from ${order.customerName}`);
    }

    handleStatusUpdate(update) {
        this.orders = this.orders.map(order => 
            order._id === update.orderId ? { ...order, status: update.newStatus } : order
        );
        this.displayOrders();
    }

    setupEventListeners() {
        document.getElementById('menuToggle')?.addEventListener('click', () => {
            document.querySelector('.sidebar').classList.toggle('active');
        });

        document.querySelectorAll('.stat-card').forEach(card => {
            card.addEventListener('click', () => {
                const status = card.getAttribute('data-status');
                console.log(`Filtering orders by status: ${status}`); // Debug output
                this.filterOrdersByStatus(status);
            });
        });

        const searchInput = document.getElementById('searchOrder');
        if (searchInput) {
            searchInput.addEventListener('input', () => this.searchOrders(searchInput.value));
        }

        document.querySelector('.close-modal')?.addEventListener('click', () => {
            document.getElementById('orderModal').style.display = 'none'; // Hide the modal
        });

        document.getElementById('updateStatusBtn')?.addEventListener('click', () => {
            const orderId = document.getElementById('modalOrderNumber')?.dataset.orderId;
            const newStatus = document.getElementById('modalStatusSelect')?.value;
            if (orderId && newStatus) {
                this.updateOrderStatus(orderId, newStatus);
            }
        });

        document.getElementById('sendEmailBtn')?.addEventListener('click', () => {
            const orderId = document.getElementById('modalOrderNumber')?.dataset.orderId;
            const order = this.orders.find(o => o._id === orderId);
            if (order) this.sendStatusUpdateEmail(order);
        });

        this.setupStatCardListeners();
    }

    setupStatCardListeners() {
        document.querySelector('.stat-card.processing')?.addEventListener('click', () => this.filterOrders('processing'));
        document.querySelector('.stat-card.delivered')?.addEventListener('click', () => this.filterOrders('delivered'));
        document.querySelector('.stat-card.new')?.addEventListener('click', () => this.filterOrders('pending'));
    }

    filterOrdersByStatus(status) {
        const filteredOrders = this.orders.filter(order => order.status === status);
        this.displayOrders(filteredOrders);
    }

    searchOrders(query) {
        const lowerCaseQuery = query.toLowerCase();
        const filteredOrders = this.orders.filter(order =>
            order.customerName.toLowerCase().includes(lowerCaseQuery) ||
            order.phone.includes(query) ||
            order.email.toLowerCase().includes(lowerCaseQuery) ||
            order.address.toLowerCase().includes(lowerCaseQuery)
        );
        this.displayOrders(filteredOrders);
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
        this.displayOrders();
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
        // Implementation of setupRealTimeUpdates method
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

    showLoadingIndicator() {
        // Implement loading indicator display
    }

    hideLoadingIndicator() {
        // Implement loading indicator hide
    }

    manageProducts() {
        // Example of adding a product
        this.products.push({name: "New Product", price: 100});
        console.log("Product added");
    }
}

// Initialize admin panel
const adminPanel = new AdminPanel();