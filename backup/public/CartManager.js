export class CartManager {
    constructor() {
      this.items = [];
      this.total = 0;
      this.setupListeners();
    }
  
    setupListeners() {
      document.addEventListener('DOMContentLoaded', () => {
        this.cartElement = document.getElementById('cartItems');
        this.totalElement = document.getElementById('cartTotal');
        this.checkoutBtn = document.getElementById('checkoutBtn');
        
        this.checkoutBtn.addEventListener('click', () => this.showCheckout());
      });
    }
  
    addItem(item) {
      this.items.push(item);
      this.updateCart();
      this.animateCartIcon();
    }
  
    removeItem(id) {
      this.items = this.items.filter(item => item.id !== id);
      this.updateCart();
    }
  
    updateCart() {
      if (!this.cartElement) return;
      
      this.cartElement.innerHTML = this.items.map(item => `
        <div class="cart-item">
          <span>${item.name}</span>
          <span>$${item.price}</span>
          <button onclick="cart.removeItem('${item.id}')" class="remove-btn">×</button>
        </div>
      `).join('');
  
      this.total = this.items.reduce((sum, item) => sum + item.price, 0);
      this.totalElement.textContent = `Total: $${this.total.toFixed(2)}`;
    }
  
    showCheckout() {
      const modal = document.getElementById('checkoutModal');
      modal.classList.add('active');
      
      // Fix iOS input issues
      const inputs = modal.querySelectorAll('input, textarea');
      inputs.forEach(input => {
        input.addEventListener('touchstart', e => e.stopPropagation());
        input.addEventListener('focus', () => {
          setTimeout(() => {
            input.scrollIntoView({behavior: 'smooth'});
          }, 300);
        });
      });
    }
  
    animateCartIcon() {
      const cart = document.getElementById('shoppingCart');
      cart.classList.add('bounce');
      setTimeout(() => cart.classList.remove('bounce'), 300);
    }
  }