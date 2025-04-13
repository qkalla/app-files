/*
 * Copyright 2025 Ayyou CO. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
'use strict';

// Import the fetch function from traffic.js
import { fetch as apiFetch } from './js/traffic.js';

// Add Socket.IO connection
const socket = io('https://app-files.onrender.com');

// Listen for new orders
socket.on('newOrder', function(order) {
    console.log('New order received:', order);
    showOrderNotification(order);
});

(function() {
  var Marzipano = window.Marzipano;
  var bowser = window.bowser;
  var screenfull = window.screenfull;
  var data = window.APP_DATA;

  // Add at top with other variables
  var cart = [];

  // Grab elements from DOM.
  var panoElement = document.querySelector('#pano');
  var sceneNameElement = document.querySelector('#titleBar .sceneName');
  var sceneListElement = document.querySelector('#sceneList');
  var sceneElements = document.querySelectorAll('#sceneList .scene');
  var sceneListToggleElement = document.querySelector('#sceneListToggle');
  var autorotateToggleElement = document.querySelector('#autorotateToggle');
  var fullscreenToggleElement = document.querySelector('#fullscreenToggle');

  // Detect desktop or mobile mode.
  if (window.matchMedia) {
    var setMode = function() {
      if (mql.matches) {
        document.body.classList.remove('desktop');
        document.body.classList.add('mobile');
      } else {
        document.body.classList.remove('mobile');
        document.body.classList.add('desktop');
      }
    };
    var mql = matchMedia("(max-width: 500px), (max-height: 500px)");
    setMode();
    mql.addListener(setMode);
  } else {
    document.body.classList.add('desktop');
  }

  // Detect whether we are on a touch device.
  document.body.classList.add('no-touch');
  window.addEventListener('touchstart', function() {
    document.body.classList.remove('no-touch');
    document.body.classList.add('touch');
  });

  // Use tooltip fallback mode on IE < 11.
  if (bowser.msie && parseFloat(bowser.version) < 11) {
    document.body.classList.add('tooltip-fallback');
  }

  // Viewer options.
  var viewerOpts = {
    controls: {
      mouseViewMode: data.settings.mouseViewMode
    }
  };

  // Initialize viewer.
  var viewer = new Marzipano.Viewer(panoElement, viewerOpts);

  // Create scenes.
  var scenes = data.scenes.map(function(data) {
    var urlPrefix = "tiles";
    var source = Marzipano.ImageUrlSource.fromString(
      urlPrefix + "/" + data.id + "/{z}/{f}/{y}/{x}.jpg",
      { cubeMapPreviewUrl: urlPrefix + "/" + data.id + "/preview.jpg" });
    var geometry = new Marzipano.CubeGeometry(data.levels);

    var limiter = Marzipano.RectilinearView.limit.traditional(data.faceSize, 100*Math.PI/180, 120*Math.PI/180);
    var view = new Marzipano.RectilinearView(data.initialViewParameters, limiter);

    var scene = viewer.createScene({
      source: source,
      geometry: geometry,
      view: view,
      pinFirstLevel: true
    });

    // Create link hotspots.
    data.linkHotspots.forEach(function(hotspot) {
      var element = createLinkHotspotElement(hotspot);
      scene.hotspotContainer().createHotspot(element, { yaw: hotspot.yaw, pitch: hotspot.pitch });
    });

    // Create info hotspots.
    data.infoHotspots.forEach(function(hotspot) {
      var element = createInfoHotspotElement(hotspot);
      scene.hotspotContainer().createHotspot(element, { yaw: hotspot.yaw, pitch: hotspot.pitch });
    });

    return {
      data: data,
      scene: scene,
      view: view
    };
  });

  // Set up autorotate, if enabled.
  var autorotate = Marzipano.autorotate({
    yawSpeed: 0.03,
    targetPitch: 0,
    targetFov: Math.PI/2
  });
  if (data.settings.autorotateEnabled) {
    autorotateToggleElement.classList.add('enabled');
  }

  // Set handler for autorotate toggle.
  autorotateToggleElement.addEventListener('click', toggleAutorotate);

  // Set up fullscreen mode, if supported.
  if (screenfull.enabled && data.settings.fullscreenButton) {
    document.body.classList.add('fullscreen-enabled');
    fullscreenToggleElement.addEventListener('click', function() {
      screenfull.toggle();
    });
    screenfull.on('change', function() {
      if (screenfull.isFullscreen) {
        fullscreenToggleElement.classList.add('enabled');
      } else {
        fullscreenToggleElement.classList.remove('enabled');
      }
    });
  } else {
    document.body.classList.add('fullscreen-disabled');
  }

  // Set handler for scene list toggle.
  sceneListToggleElement.addEventListener('click', toggleSceneList);

  // Start with the scene list open on desktop.
  if (!document.body.classList.contains('mobile')) {
    showSceneList();
  }

  // Set handler for scene switch.
  scenes.forEach(function(scene) {
    var el = document.querySelector('#sceneList .scene[data-id="' + scene.data.id + '"]');
    el.addEventListener('click', function() {
      switchScene(scene);
      // On mobile, hide scene list after selecting a scene.
      if (document.body.classList.contains('mobile')) {
        hideSceneList();
      }
    });
  });

  // DOM elements for view controls.
  var viewUpElement = document.querySelector('#viewUp');
  var viewDownElement = document.querySelector('#viewDown');
  var viewLeftElement = document.querySelector('#viewLeft');
  var viewRightElement = document.querySelector('#viewRight');
  var viewInElement = document.querySelector('#viewIn');
  var viewOutElement = document.querySelector('#viewOut');

  // Dynamic parameters for controls.
  var velocity = 0.7;
  var friction = 3;

  // Associate view controls with elements.
  var controls = viewer.controls();
  controls.registerMethod('upElement',    new Marzipano.ElementPressControlMethod(viewUpElement,     'y', -velocity, friction), true);
  controls.registerMethod('downElement',  new Marzipano.ElementPressControlMethod(viewDownElement,   'y',  velocity, friction), true);
  controls.registerMethod('leftElement',  new Marzipano.ElementPressControlMethod(viewLeftElement,   'x', -velocity, friction), true);
  controls.registerMethod('rightElement', new Marzipano.ElementPressControlMethod(viewRightElement,  'x',  velocity, friction), true);
  controls.registerMethod('inElement',    new Marzipano.ElementPressControlMethod(viewInElement,  'zoom', -velocity, friction), true);
  controls.registerMethod('outElement',   new Marzipano.ElementPressControlMethod(viewOutElement, 'zoom',  velocity, friction), true);

  function sanitize(s) {
    return s.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;');
  }

  function switchScene(scene) {
    stopAutorotate();
    scene.view.setParameters(scene.data.initialViewParameters);
    scene.scene.switchTo();
    updateSceneName(scene);

    // Only add 3D element to entrance scene
    if (scene.data.id === '0-entrancee') {
        try {
            // Remove existing 3D test if any
            if (window.currentTest3D) {
                window.currentTest3D.remove();
            }
            // Create new 3D test
            window.currentTest3D = createSafeTest3D(scene.scene);
        } catch (error) {
            console.log('3D features not available');
        }
    } else {
        // Remove 3D test when leaving entrance
        if (window.currentTest3D) {
            window.currentTest3D.remove();
            window.currentTest3D = null;
        }
    }
}

  // Make switchScene available globally
  window.switchScene = function(sceneIndex) {
    if (typeof sceneIndex === 'number' && sceneIndex >= 0 && sceneIndex < scenes.length) {
      switchScene(scenes[sceneIndex]);
    }
  };

  function updateSceneName(scene) {
    sceneNameElement.innerHTML = sanitize(scene.data.name);
  }

  function updateSceneList(scene) {
    for (var i = 0; i < sceneElements.length; i++) {
      var el = sceneElements[i];
      if (el.getAttribute('data-id') === scene.data.id) {
        el.classList.add('current');
      } else {
        el.classList.remove('current');
      }
    }
  }

  function showSceneList() {
    sceneListElement.classList.add('enabled');
    sceneListToggleElement.classList.add('enabled');
  }

  function hideSceneList() {
    sceneListElement.classList.remove('enabled');
    sceneListToggleElement.classList.remove('enabled');
  }

  function toggleSceneList() {
    sceneListElement.classList.toggle('enabled');
    sceneListToggleElement.classList.toggle('enabled');
  }

  function startAutorotate() {
    if (!autorotateToggleElement.classList.contains('enabled')) {
      return;
    }
    viewer.startMovement(autorotate);
    viewer.setIdleMovement(3000, autorotate);
  }

  function stopAutorotate() {
    viewer.stopMovement();
    viewer.setIdleMovement(Infinity);
  }

  function toggleAutorotate() {
    if (autorotateToggleElement.classList.contains('enabled')) {
      autorotateToggleElement.classList.remove('enabled');
      stopAutorotate();
    } else {
      autorotateToggleElement.classList.add('enabled');
      startAutorotate();
    }
  }

  function createLinkHotspotElement(hotspot) {

    // Create wrapper element to hold icon and tooltip.
    var wrapper = document.createElement('div');
    wrapper.classList.add('hotspot');
    wrapper.classList.add('link-hotspot');

    // Create image element.
    var icon = document.createElement('img');
    icon.src = 'img/link.png';
    icon.classList.add('link-hotspot-icon');

    // Set rotation transform.
    var transformProperties = [ '-ms-transform', '-webkit-transform', 'transform' ];
    for (var i = 0; i < transformProperties.length; i++) {
      var property = transformProperties[i];
      icon.style[property] = 'rotate(' + hotspot.rotation + 'rad)';
    }

    // Add click event handler.
    wrapper.addEventListener('click', function() {
      switchScene(findSceneById(hotspot.target));
    });

    // Prevent touch and scroll events from reaching the parent element.
    // This prevents the view control logic from interfering with the hotspot.
    stopTouchAndScrollEventPropagation(wrapper);

    // Create tooltip element.
    var tooltip = document.createElement('div');
    tooltip.classList.add('hotspot-tooltip');
    tooltip.classList.add('link-hotspot-tooltip');
    tooltip.innerHTML = findSceneDataById(hotspot.target).name;

    wrapper.appendChild(icon);
    wrapper.appendChild(tooltip);

    return wrapper;
  }

  function createInfoHotspotElement(hotspot) {
    // Create wrapper element to hold icon and tooltip.
    var wrapper = document.createElement('div');
    wrapper.classList.add('hotspot');
    wrapper.classList.add('info-hotspot');

    // Create hotspot/tooltip header.
    var header = document.createElement('div');
    header.classList.add('info-hotspot-header');

    // Create image element.
    var iconWrapper = document.createElement('div');
    iconWrapper.classList.add('info-hotspot-icon-wrapper');
    var icon = document.createElement('img');
    icon.src = 'img/info.png';
    icon.classList.add('info-hotspot-icon');
    iconWrapper.appendChild(icon);

    // Create title element.
    var titleWrapper = document.createElement('div');
    titleWrapper.classList.add('info-hotspot-title-wrapper');
    var title = document.createElement('div');
    title.classList.add('info-hotspot-title');
    title.innerHTML = hotspot.title;
    titleWrapper.appendChild(title);

    // Create close element.
    var closeWrapper = document.createElement('div');
    closeWrapper.classList.add('info-hotspot-close-wrapper');
    var closeIcon = document.createElement('img');
    closeIcon.src = 'img/close.png';
    closeIcon.classList.add('info-hotspot-close-icon');
    closeWrapper.appendChild(closeIcon);

    // Construct header element.
    header.appendChild(iconWrapper);
    header.appendChild(titleWrapper);
    header.appendChild(closeWrapper);

    // Create text element.
    var text = document.createElement('div');
    text.classList.add('info-hotspot-text');

    // Check if this is a product hotspot by looking for price in AMD
    var priceMatch = hotspot.text.match(/(\d+)\s*amd/i);
    if (priceMatch) {
        var price = parseInt(priceMatch[1]);
        // Check if product is sold by weight
        var isByWeight = hotspot.text.toLowerCase().includes('kg') || 
                        hotspot.text.toLowerCase().includes('gramm');
        
        if (isByWeight) {
            text.innerHTML = `
                <div class="product-info">
                    <div class="product-description">${hotspot.text.replace(/(\d+)\s*amd/i, '')}</div>
                    <div class="product-price">${price} AMD per kg</div>
                    <div class="weight-input">
                        <input type="number" min="0.1" step="0.1" class="weight-amount" placeholder="Enter weight in kg">
                        <select class="weight-unit">
                            <option value="kg">kg</option>
                            <option value="g">g</option>
                        </select>
                    </div>
                    <div class="product-actions">
                    <button class="add-to-basket-btn" disabled>
                        <i class="fas fa-cart-plus"></i> Add to Cart
                    </button>
                        <button class="view-hologram-btn">
                            <i class="fas fa-cube"></i> View in 3D
                        </button>
                    </div>
                </div>
            `;

            // Add weight input handler
            const weightInput = text.querySelector('.weight-amount');
            const weightUnit = text.querySelector('.weight-unit');
            const addButton = text.querySelector('.add-to-basket-btn');

            weightInput.addEventListener('input', function() {
                const weight = parseFloat(this.value);
                addButton.disabled = !weight || weight <= 0;
                if (weight && weight > 0) {
                    const unit = weightUnit.value;
                    const finalWeight = unit === 'g' ? weight / 1000 : weight;
                    const totalPrice = Math.round(price * finalWeight);
                    addButton.onclick = () => window.addToCart({
                        name: hotspot.title,
                        price: totalPrice,
                        weight: finalWeight,
                        unit: 'kg',
                        pricePerKg: price
                    });
                }
            });
        } else {
            // Regular product without weight
            text.innerHTML = `
                <div class="product-info">
                    <div class="product-description">${hotspot.text.replace(/(\d+)\s*amd/i, '')}</div>
                    <div class="product-price">${price} AMD</div>
                    <div class="product-actions">
                    <button class="add-to-basket-btn" onclick="window.addToCart({name: '${hotspot.title}', price: ${price}})">
                        <i class="fas fa-cart-plus"></i> Add to Cart
                    </button>
                        <button class="view-hologram-btn">
                            <i class="fas fa-cube"></i> View in 3D
                        </button>
                    </div>
                </div>
            `;
        }

        // Add holographic view button handler
        const viewHologramBtn = text.querySelector('.view-hologram-btn');
        if (viewHologramBtn) {
            viewHologramBtn.addEventListener('click', function() {
                // Initialize holographic display if not already done
                if (!holographicDisplay) {
                    holographicDisplay = new HolographicProductDisplay();
                }
                
                // Show hologram
                holographicDisplay.showHologram({
                    name: hotspot.title,
                    price: price,
                    description: hotspot.text.replace(/(\d+)\s*amd/i, '')
                });
            });
        }
    } else {
        // This is a regular info hotspot - just show the text
        text.innerHTML = hotspot.text;
    }

    // Place header and text into wrapper element.
    wrapper.appendChild(header);
    wrapper.appendChild(text);

    // Create a modal for the hotspot content to appear on mobile mode.
    var modal = document.createElement('div');
    modal.innerHTML = wrapper.innerHTML;
    modal.classList.add('info-hotspot-modal');
    document.body.appendChild(modal);

    var toggle = function() {
        wrapper.classList.toggle('visible');
        modal.classList.toggle('visible');
    };

    // Show content when hotspot is clicked.
    header.addEventListener('click', toggle);

    // Hide content when close icon is clicked.
    modal.querySelector('.info-hotspot-close-wrapper').addEventListener('click', toggle);

    // If this is a product hotspot, add click handler for Add to Cart button
    if (priceMatch) {
        const addToCartBtn = modal.querySelector('.add-to-basket-btn');
        if (addToCartBtn) {
            addToCartBtn.addEventListener('click', function() {
                window.addToCart({
                    name: hotspot.title,
                    price: price
                });
                
                // Show success feedback
                this.innerHTML = '<i class="fas fa-check"></i> Added!';
                this.style.background = '#4CAF50';
                setTimeout(() => {
                    this.innerHTML = '<i class="fas fa-cart-plus"></i> Add to Cart';
                    this.style.background = '';
                }, 1500);
            });
        }
    }

    // Add 3D view button
    const view3dButton = document.createElement('button');
    view3dButton.className = 'view-3d-btn';
    view3dButton.innerHTML = '<i class="fas fa-cube"></i> View in 3D';
    view3dButton.onclick = () => {
      const product = {
        name: hotspot.title,
        price: hotspot.text.match(/\d+/)?.[0] || '0',
        category: getProductCategory(hotspot.title)
      };
      
      // Create holographic product display
      const effect = futuristicEffects.createHolographicProduct(product);
      futuristicEffects.addEffect(hotspot.id, effect);
      
      // Show success message
      Swal.fire({
        title: '3D View Activated',
        text: 'Product displayed in holographic view',
        icon: 'success',
        timer: 2000,
        showConfirmButton: false
      });
    };
    modal.appendChild(view3dButton);

    return wrapper;
  }

  // Prevent touch and scroll events from reaching the parent element.
  function stopTouchAndScrollEventPropagation(element, eventList) {
    var eventList = [ 'touchstart', 'touchmove', 'touchend', 'touchcancel',
                      'wheel', 'mousewheel' ];
    for (var i = 0; i < eventList.length; i++) {
      element.addEventListener(eventList[i], function(event) {
        event.stopPropagation();
      });
    }
  }

  function findSceneById(id) {
    for (var i = 0; i < scenes.length; i++) {
      if (scenes[i].data.id === id) {
        return scenes[i];
      }
    }
    return null;
  }

  function findSceneDataById(id) {
    for (var i = 0; i < data.scenes.length; i++) {
      if (data.scenes[i].id === id) {
        return data.scenes[i];
      }
    }
    return null;
  }

  // Add cart functions
  function addToBasket(product) {
    var existingProduct = cart.find(item => item.name === product.name);
    if (existingProduct) {
      existingProduct.quantity++;
    } else {
      cart.push({...product, quantity: 1});
    }
    updateCartDisplay();
    
    // Show success toast
    showToast(`${product.name} added to cart!`, 'success');
  }

  function updateCartDisplay() {
    var cartItems = document.getElementById('cartItems');
    var cartTotal = document.getElementById('cartTotal');
    var cartCount = document.getElementById('cartCount');
    
    // Update cart count
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    cartCount.textContent = `${totalItems} ${totalItems === 1 ? 'item' : 'items'}`;
    
    // Update cart items with 3D effects
    cartItems.innerHTML = cart.map((item, index) => {
      // Calculate 3D transform based on position
      const rotation = index % 2 === 0 ? 2 : -2;
      const translateZ = index * 5;
      
      return `
        <div class="cart-item" style="transform: rotateX(${rotation}deg) translateZ(${translateZ}px);">
          <div class="item-details">
            <div class="item-name">${item.name}</div>
            <div class="item-price">${item.price} AMD x ${item.quantity}</div>
      </div>
          <button class="remove-item-btn" onclick="removeFromCart('${item.name}')" aria-label="Remove ${item.name}">
            <i class="fas fa-times"></i>
          </button>
        </div>
      `;
    }).join('');
    
    // Update total
    var total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    cartTotal.textContent = `Total: ${total} AMD`;

    // Enable/disable checkout button
    const checkoutBtn = document.getElementById('checkoutBtn');
    if (checkoutBtn) {
      checkoutBtn.disabled = cart.length === 0;
    }
  }

  function removeFromCart(productName) {
    // Find the item to remove
    const itemToRemove = cart.find(item => item.name === productName);
    if (!itemToRemove) return;
    
    // Add removing class for animation
    const cartItems = document.getElementById('cartItems');
    const itemElements = cartItems.querySelectorAll('.cart-item');
    itemElements.forEach(el => {
      if (el.querySelector('.item-name').textContent === productName) {
        el.classList.add('removing');
      }
    });
    
    // Remove after animation completes
    setTimeout(() => {
    cart = cart.filter(item => item.name !== productName);
    updateCartDisplay();
      
      // Show removal toast
      showToast(`${productName} removed from cart`, 'info');
    }, 300);
  }

  // Display the initial scene.
  switchScene(scenes[0]);

})();

// Add these functions outside the main (function() { ... })() scope
// Make them globally available
window.cart = [];

window.addToCart = function(product) {
    const existingItem = window.cart.find(item => item.name === product.name);
    if (existingItem) {
        existingItem.quantity++;
    } else {
        window.cart.push({...product, quantity: 1});
    }
    
    // Show success toast
    showToast(`${product.name} added to cart!`, 'success');
    
    // Update cart display
    updateCartDisplay();
};

window.updateCartDisplay = function() {
    const cartItems = document.getElementById('cartItems');
    const cartTotal = document.getElementById('cartTotal');
    const cartCount = document.getElementById('cartCount');
    
    cartItems.innerHTML = window.cart.map(item => `
        <div class="cart-item">
            <div class="item-details">
                <div class="item-name">${item.name}</div>
                <div class="item-price">${item.price} AMD × ${item.quantity}</div>
            </div>
            <button class="remove-item-btn" onclick="removeFromCart('${item.name}')">×</button>
        </div>
    `).join('');
    
    const total = window.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    cartTotal.innerHTML = `Total: <span>${total} AMD</span>`;
    cartCount.textContent = `${window.cart.length} items`;
}

window.removeFromCart = function(productName) {
    window.cart = window.cart.filter(item => item.name !== productName);
    updateCartDisplay();
}

window.showCartNotification = function() {
    const cart = document.getElementById('shoppingCart');
    cart.style.transform = 'scale(1.05)';
    setTimeout(() => {
        cart.style.transform = 'scale(1)';
    }, 200);
}

// Add these new functions
window.showCheckout = function() {
    const modal = document.getElementById('checkoutModal');
    modal.classList.add('active');
}

window.hideCheckout = function() {
    const modal = document.getElementById('checkoutModal');
    modal.classList.remove('active');
}

// Move cart logic to window.onload
window.onload = function() {
    console.error("***** WINDOW ONLOAD STARTING - Setting up cart controls *****"); 
    
    // Shopping Cart Minimize/Maximize Logic
    const shoppingCart = document.getElementById('shoppingCart');
    const minimizeBtn = document.getElementById('minimizeCartBtn');
    const maximizeBtn = document.getElementById('maximizeCartBtn');
    
    console.log('Cart Elements (onload):', { shoppingCart, minimizeBtn, maximizeBtn });

    if (shoppingCart && minimizeBtn && maximizeBtn) {
        console.log('Cart elements found. Setting up listeners (onload)...');

        minimizeBtn.addEventListener('click', (event) => {
            console.log('Minimize button JS listener fired!');
            event.stopPropagation(); // Prevent header click from firing
            shoppingCart.classList.add('minimized');
        });

        maximizeBtn.addEventListener('click', (event) => {
            console.log('Maximize button JS listener fired!'); 
            event.stopPropagation(); // Prevent header click from firing
            shoppingCart.classList.remove('minimized');
        });
        
        // Allow clicking the header to EXPAND the cart if it's minimized
        const cartHeader = shoppingCart.querySelector('.cart-header');
        console.log('Attempting to find cart header element:', cartHeader); 
        
        if(cartHeader) {
            console.log('Cart header FOUND. Adding header toggle listener (onload)...');
            cartHeader.addEventListener('click', (event) => {
                console.log('HEADER CLICKED! Target:', event.target);
                // Only proceed if the click was directly on the header, not a button
                if (event.target.closest('.cart-control-btn')) {
                     console.log('Header click ignored (control button was target).');
                     return; 
                }
                // Only expand if currently minimized
                if (shoppingCart.classList.contains('minimized')) {
                    console.log('>>> Header clicked while minimized, expanding.');
                    shoppingCart.classList.remove('minimized');
    } else {
                    console.log('>>> Header clicked while expanded, ignoring (use minimize button).');
                }
        });
    } else {
             console.error('Cart header element NOT FOUND for toggle listener (onload).');
        }
    } else {
        console.error('Could not find shopping cart or control buttons (onload).'); 
    }
    
}; // End of window.onload

let currentMap = null;
let selectedLocation = null;
let searchControl = null;

function showMapModal() {
    const mapModal = document.getElementById('mapModal');
    const mapContainer = document.getElementById('map');
    
    // Show the modal first
    mapModal.classList.add('active');
    
    // Wait for the modal to be visible before initializing the map
    setTimeout(() => {
        if (!currentMap) {
            initMap();
        } else {
            currentMap.invalidateSize();
        }
    }, 100);
}

function initMap() {
    if (currentMap) {
        currentMap.remove();
    }
    
    const mapContainer = document.getElementById('map');
    mapContainer.innerHTML = ''; // Clear any existing content
    
    try {
        currentMap = L.map('map').setView([40.1772, 44.5126], 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
        }).addTo(currentMap);
        
        // Locate and add a marker for the current location
        currentMap.locate({ setView: true, maxZoom: 16 });
        
        function onLocationFound(e) {
            const radius = e.accuracy / 2;
            L.marker(e.latlng).addTo(currentMap)
                .bindPopup("You are within " + radius + " meters from this point").openPopup();
            L.circle(e.latlng, radius).addTo(currentMap);
        }
        
        function onLocationError(e) {
            console.error("Geolocation error:", e.message);
        }
        
        currentMap.on('locationfound', onLocationFound);
        currentMap.on('locationerror', onLocationError);
        
        // Allow user to place a pin manually
        let marker;
        currentMap.on('click', function(e) {
        const { lat, lng } = e.latlng;
        if (marker) {
            marker.setLatLng(e.latlng);
        } else {
                marker = L.marker([lat, lng]).addTo(currentMap);
        }

        // Fetch address using Nominatim
        fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`)
            .then(response => response.json())
            .then(data => {
                const address = data.display_name;
                    const addressInput = document.getElementById('selectedAddress');
                    if(addressInput) {
                        addressInput.value = address;
                    }
                    selectedLocation = { lat, lng, address };
            })
            .catch(error => console.error('Error fetching address:', error));
    });
    } catch (error) {
        console.error("Error during map initialization:", error);
        handleMapError();
    }
}

function hideMapModal() {
    const mapModal = document.getElementById('mapModal');
    mapModal.classList.remove('active');
    
    // Clean up the map when hiding the modal
    if (currentMap) {
        currentMap.remove();
        currentMap = null;
    }
}

function handleMapError() {
    const mapContainer = document.getElementById('map');
    mapContainer.innerHTML = `
        <div class="map-error">
            <p>Sorry, there was an error loading the map. Please try again.</p>
            <button onclick="retryMapLoad()" class="retry-btn">Retry</button>
        </div>
    `;
}

function retryMapLoad() {
    const mapContainer = document.getElementById('map');
    mapContainer.innerHTML = '';
    currentMap = null;
    showMapModal();
}

// Add event listeners when document loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOMContentLoaded START - Setting up map modal + order form listeners');
    
    // --- Map Modal Listeners (Keep close and confirm) --- 
    const closeMapBtn = document.querySelector('#mapModal .close-map');
    if (closeMapBtn) {
        closeMapBtn.addEventListener('click', hideMapModal);
        console.log('[DEBUG] Close map button listener added.');
    }
    const confirmLocationBtn = document.querySelector('#mapModal .confirm-location-btn');
    if (confirmLocationBtn) {
        confirmLocationBtn.addEventListener('click', function() {
             console.log('[DEBUG] Confirm Location button clicked.');
            if (selectedLocation && selectedLocation.address) {
                const addressInput = document.getElementById('selectedAddress');
                if(addressInput) {
                    addressInput.value = selectedLocation.address;
                } else {
                    console.error("[DEBUG] selectedAddress input not found when confirming.");
                }
            hideMapModal();
            } else {
                 console.warn('[DEBUG] Confirm clicked but no location selected.');
                 // Use a less intrusive notification if available (like showToast)
                 if(typeof showToast === 'function') {
                     showToast('Please select a location on the map first.', 'warning');
        } else {
            alert('Please select a location first');
                 }
            }
        });
        console.log('[DEBUG] Confirm location button listener added.');
    }

    // --- EVENT DELEGATION for Map Modal Triggers (Replaces direct listeners below) --- 
    console.log("[DEBUG] Setting up DELEGATED listeners for map triggers inside #checkoutModal...");
    const checkoutModalElement = document.getElementById('checkoutModal');
    if (checkoutModalElement) {
        checkoutModalElement.addEventListener('click', function(event) {
            // Check if the click target is the button OR inside the button
            if (event.target.matches('.pick-location-btn') || event.target.closest('.pick-location-btn')) {
                console.log("[DEBUG] *** Delegated Click: Pick Location Button Clicked! ***", event.target);
                event.preventDefault(); 
                showMapModal();
            }
            // Check if the click target is the address input
            else if (event.target.matches('#selectedAddress')) {
                 console.log("[DEBUG] *** Delegated Click: Selected Address Input Clicked! ***", event.target);
                 showMapModal();
            }
        });
         console.log('[DEBUG] Delegated click listener added to #checkoutModal.');
    } else {
         console.error("[DEBUG] Checkout Modal element (#checkoutModal) NOT FOUND for event delegation!");
    }
    
    // --- Order Form Logic (Keep as is) --- 
    const orderForm = document.getElementById('orderForm');
     if (orderForm) {
         console.log('Order Form found, setting up submit listener...');
        // Keep the existing cloneNode logic for now if it was working
        const newOrderForm = orderForm.cloneNode(true);
        orderForm.parentNode.replaceChild(newOrderForm, orderForm);
        
        // Add new event listener for form submission
        newOrderForm.addEventListener('submit', function(event) {
            event.preventDefault();
            console.log('Form submitted');
            
            const customerName = document.getElementById('fullName')?.value.trim();
            console.log('Customer Name:', customerName);

            if (!customerName) {
                alert('Customer name is required.');
                return;
            }
            
            // Add device detection function here
            function detectDevice() {
                const ua = navigator.userAgent;
                const platform = {
                    device: 'unknown',
                    os: 'unknown',
                    browser: 'unknown',
                    userAgent: ua,
                    screenSize: `${window.screen.width}x${window.screen.height}`
                };

                if (/iPad|Tablet|PlayBook/i.test(ua)) {
                    platform.device = 'tablet';
                } else if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle/i.test(ua)) {
                    platform.device = 'mobile';
                } else {
                    platform.device = 'desktop';
                }

                if (/Windows/i.test(ua)) platform.os = 'Windows';
                else if (/iPhone|iPad|iPod/.test(ua)) platform.os = 'iOS';
                else if (/Android/.test(ua)) platform.os = 'Android';
                else if (/Mac/i.test(ua)) platform.os = 'MacOS';
                else if (/Linux/i.test(ua)) platform.os = 'Linux';

                if (/Chrome/i.test(ua)) platform.browser = 'Chrome';
                else if (/Firefox/i.test(ua)) platform.browser = 'Firefox';
                else if (/Safari/i.test(ua)) platform.browser = 'Safari';
                else if (/Edge/i.test(ua)) platform.browser = 'Edge';

                return platform;
            }
            const deviceInfo = detectDevice();

            const formData = {
                orderNumber: generateOrderNumber(),
                customerName: customerName,
                phone: document.getElementById('phone')?.value.trim() || '',
                email: document.getElementById('email')?.value.trim() || '',
                address: document.getElementById('selectedAddress')?.value.trim() || '',
                paymentMethod: document.querySelector('input[name="paymentMethod"]:checked')?.value || '',
                items: window.cart,
                total: window.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0),
                deviceInfo: deviceInfo // Include device info
            };

            console.log('Order data:', formData);

            // Submit to server
            fetch('https://app-files.onrender.com/api/orders', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(formData)
            })
            .then(response => {
                console.log('Server response:', response);
                if (!response.ok) {
                    return response.text().then(text => {
                        throw new Error(`Server error: ${text}`);
                    });
                }
                return response.json();
            })
            .then(data => {
                console.log('Success:', data);
                hideCheckout();
                
                Swal.fire({
                    title: 'Order Submitted Successfully!',
                    text: 'Thank you for your order!',
                    icon: 'success',
                    confirmButtonText: 'Done'
                }).then((result) => {
                    if (result.isConfirmed) {
                        window.cart = [];
                        updateCartDisplay();
                        window.location.reload();
                    }
                });
            })
            .catch(error => {
                console.error('Error:', error);
                Swal.fire({
                    title: 'Error',
                    text: error.message || 'There was an error submitting your order. Please try again.',
                    icon: 'error'
                });
            });
        });
    } else {
        console.error('Order form not found');
    }

    // --- LEAVE Device Manager & Mobile Interface Initialization AS IS --- 
    if (typeof DeviceManager !== 'undefined' && !window.deviceManager) {
       window.deviceManager = new DeviceManager();
       console.log('DeviceManager initialized.');
    }
    if (typeof MobileInterface !== 'undefined' && /Mobi|Android/i.test(navigator.userAgent) && !document.querySelector('.mobile-interface')) {
        new MobileInterface();
        console.log('MobileInterface initialized.');
    }
    
    // --- LEAVE Hotspot Header Listeners AS IS --- 
    document.querySelectorAll('.info-hotspot-header').forEach(header => {
        if (!header.dataset.listenerAdded) {
             header.addEventListener('click', function() {
                 const hotspotText = this.nextElementSibling;
                 if (hotspotText && hotspotText.classList.contains('info-hotspot-text')) {
                     hotspotText.classList.toggle('visible'); // Toggle visibility class
                 }
             });
             header.dataset.listenerAdded = 'true'; // Mark as added
        }
    });
    console.log('Hotspot header listeners checked/added.');
    
    console.log('DOMContentLoaded END - map modal + order form setup');
}); // END OF THE FIRST DOMContentLoaded BLOCK

// Add these styles to make the suggestions look better
const additionalStyles = document.createElement('style');
additionalStyles.textContent = `
    .ymaps-2-1-79-suggest-item {
        padding: 8px 12px;
        cursor: pointer;
    }
    .ymaps-2-1-79-suggest-item:hover {
        background-color: #f5f5f5;
    }
    .ymaps-2-1-79-suggest-item-selected {
        background-color: #e3f2fd !important;
    }
`;
document.head.appendChild(additionalStyles);

// Device and viewport detection class
class DeviceManager {
    constructor() {
        this.device = this.detectDevice();
        this.orientation = this.getOrientation();
        this.setupEventListeners();
        this.initializeInterface();
    }

    detectDevice() {
        const ua = navigator.userAgent;
        const width = window.innerWidth;
        
        if (/iPad|Tablet|PlayBook/i.test(ua) || (width >= 768 && width <= 1024)) {
            return 'tablet';
        } else if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated/i.test(ua) || width < 768) {
            return 'mobile';
        } else {
            return 'desktop';
        }
    }

    getOrientation() {
        return window.innerWidth > window.innerHeight ? 'landscape' : 'portrait';
    }

    setupEventListeners() {
        // Handle orientation changes
        window.addEventListener('resize', () => {
            const newOrientation = this.getOrientation();
            if (newOrientation !== this.orientation) {
                this.orientation = newOrientation;
                this.adjustInterface();
            }
        });

        // Handle device motion if available
        if (window.DeviceOrientationEvent) {
            window.addEventListener('deviceorientation', this.handleDeviceOrientation.bind(this));
        }

        // Handle touch events
        if (this.device !== 'desktop') {
            this.setupTouchControls();
        }
    }

    initializeInterface() {
        document.body.classList.add(`device-${this.device}`);
        document.body.classList.add(`orientation-${this.orientation}`);
        
        this.adjustInterface();
        this.setupNavigationControls();
    }

    adjustInterface() {
        const viewer = document.querySelector('.pnlm-container');
        if (!viewer) return;

        switch (this.device) {
            case 'mobile':
                this.setupMobileInterface(viewer);
                break;
            case 'tablet':
                this.setupTabletInterface(viewer);
                break;
            case 'desktop':
                this.setupDesktopInterface(viewer);
                break;
        }
    }

    setupNavigationControls() {
        const controls = document.createElement('div');
        controls.className = `navigation-controls device-${this.device}`;
        
        if (this.device !== 'desktop') {
            controls.innerHTML = `
                <div class="nav-group">
                    <button class="nav-btn zoom-in"><i class="fas fa-plus"></i></button>
                    <button class="nav-btn zoom-out"><i class="fas fa-minus"></i></button>
                </div>
                <div class="nav-group">
                    <button class="nav-btn fullscreen"><i class="fas fa-expand"></i></button>
                </div>
            `;
            document.body.appendChild(controls);
            
            // Add touch gesture handling
            this.setupTouchControls();
        }
    }

    setupTouchControls() {
        let touchStartX = 0;
        let touchStartY = 0;
        let lastTouchTime = 0;

        document.addEventListener('touchstart', (e) => {
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
            lastTouchTime = Date.now();
        });

        document.addEventListener('touchmove', (e) => {
            if (Date.now() - lastTouchTime > 100) { // Throttle updates
                const deltaX = e.touches[0].clientX - touchStartX;
                const deltaY = e.touches[0].clientY - touchStartY;
                this.handleTouchMove(deltaX, deltaY);
                
                touchStartX = e.touches[0].clientX;
                touchStartY = e.touches[0].clientY;
                lastTouchTime = Date.now();
            }
        });
    }

    handleDeviceOrientation(event) {
        if (this.device !== 'desktop') {
            // Implement smooth device orientation controls
            const viewer = document.querySelector('.pnlm-container');
            if (viewer && event.beta && event.gamma) {
                // Adjust view based on device orientation
                const x = event.gamma * 0.5; // Reduce sensitivity
                const y = event.beta * 0.5;
                viewer.style.transform = `rotateX(${y}deg) rotateY(${x}deg)`;
            }
        }
    }

    handleTouchMove(deltaX, deltaY) {
        // Implement smooth touch movement
        const viewer = document.querySelector('.pnlm-container');
        if (viewer) {
            const sensitivity = 0.15;
            const yaw = deltaX * sensitivity;
            const pitch = deltaY * sensitivity;
            
            // Update panorama view
            if (window.pannellum) {
                const viewer = window.pannellum.viewer;
                if (viewer) {
                    viewer.setYaw(viewer.getYaw() - yaw);
                    viewer.setPitch(viewer.getPitch() + pitch);
                }
            }
        }
    }
}

// Initialize device manager when document is ready
document.addEventListener('DOMContentLoaded', () => {
    window.deviceManager = new DeviceManager();
});

class MobileInterface {
    constructor() {
        this.init();
    }

    init() {
        this.addMobileControls();
        this.addBottomNav();
        this.setupGestures();
    }

    addMobileControls() {
        const controls = `
            <div class="mobile-interface">
                <div class="top-controls">
                    <button class="menu-btn">
                        <i class="fas fa-bars"></i>
                    </button>
                    <div class="location-indicator">
                        <i class="fas fa-map-marker-alt"></i>
                        <span>Current Location</span>
                    </div>
                    <button class="cart-btn">
                        <i class="fas fa-shopping-cart"></i>
                        <span class="cart-count">0</span>
                    </button>
                </div>
                
                <div class="navigation-controls">
                    <div class="nav-group">
                        <button class="nav-btn zoom-in">
                            <i class="fas fa-plus"></i>
                        </button>
                        <button class="nav-btn zoom-out">
                            <i class="fas fa-minus"></i>
                        </button>
                    </div>
                    <button class="nav-btn fullscreen">
                        <i class="fas fa-expand"></i>
                    </button>
                </div>

                
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', controls);
    }

    setupGestures() {
        const viewer = document.querySelector('.pnlm-container');
        let touchStartX = 0;
        let touchStartY = 0;

        viewer.addEventListener('touchstart', (e) => {
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
        });

        viewer.addEventListener('touchmove', (e) => {
            const touchEndX = e.touches[0].clientX;
            const touchEndY = e.touches[0].clientY;
            
            const deltaX = touchStartX - touchEndX;
            const deltaY = touchStartY - touchEndY;

            // Smooth panorama movement
            if (window.pannellum && window.pannellum.viewer) {
                const viewer = window.pannellum.viewer;
                viewer.setYaw(viewer.getYaw() + deltaX * 0.1);
                viewer.setPitch(viewer.getPitch() - deltaY * 0.1);
            }

            touchStartX = touchEndX;
            touchStartY = touchEndY;
        });
    }
}

// Initialize when document is ready
document.addEventListener('DOMContentLoaded', () => {
    if (/Mobi|Android/i.test(navigator.userAgent)) {
        new MobileInterface();
    }
});

// Add this to your existing code
class ProductPricing {
    constructor() {
        this.weightUnits = {
            g: 0.001,  // convert to kg
            kg: 1,
            lb: 0.453592 // convert to kg
        };
    }

    calculatePrice(basePrice, weight, unit) {
        // Convert weight to kg for calculation
        const weightInKg = weight * this.weightUnits[unit];
        // Base price is per kg
        return Math.round(basePrice * weightInKg);
    }
}

// Update the product hotspot creation
function createProductHotspot(hotspot) {
    const pricing = new ProductPricing();
    
    const productInfo = `
        <div class="product-info">
            <h3 class="product-title">${hotspot.title}</h3>
            <p class="product-description">${hotspot.description || 'Fresh and high-quality product.'}</p>
            <p class="price-per-unit">${hotspot.price} AMD per kg</p>
            <div class="weight-selector">
                <input type="number" 
                    class="weight-input" 
                    min="0.1" 
                    step="0.1" 
                    placeholder="Enter weight"
                    aria-label="Product weight">
                <select class="unit-select" aria-label="Weight unit">
                    <option value="g">g</option>
                    <option value="kg">kg</option>
                </select>
            </div>
            <div class="calculated-price">Total: <span>0</span> AMD</div>
            <button class="add-to-cart-btn" disabled>
                <i class="fas fa-cart-plus"></i> Add to Cart
            </button>
        </div>
    `;

    const element = document.createElement('div');
    element.className = 'product-hotspot';
    element.innerHTML = productInfo;
    
    // Add data attributes for product info
    element.dataset.productName = hotspot.title;
    element.dataset.productPrice = hotspot.price;

    // Add event listeners for weight calculation
    const weightInput = element.querySelector('.weight-input');
    const unitSelect = element.querySelector('.unit-select');
    const priceDisplay = element.querySelector('.calculated-price span');
    const addButton = element.querySelector('.add-to-cart-btn');

    function updatePrice() {
        const weight = parseFloat(weightInput.value);
        if (isNaN(weight) || weight <= 0) {
            priceDisplay.textContent = '0';
            addButton.disabled = true;
            return;
        }
        
        const unit = unitSelect.value;
        const price = pricing.calculatePrice(hotspot.price, weight, unit);
        priceDisplay.textContent = price.toFixed(2);
        addButton.disabled = false;
    }

    // Add event listeners
    weightInput.addEventListener('input', updatePrice);
    unitSelect.addEventListener('change', updatePrice);

    // Add to cart button click handler
    addButton.addEventListener('click', () => {
        const weight = parseFloat(weightInput.value);
        const unit = unitSelect.value;
        const price = pricing.calculatePrice(hotspot.price, weight, unit);
        
        const product = {
            name: hotspot.title,
            price: price,
            weight: weight,
            unit: unit
        };
        
        // Add to cart with animation
        addToCart(product);
        
        // Show success animation
        addButton.innerHTML = '<i class="fas fa-check"></i> Added!';
        addButton.classList.add('success');
        
        // Reset button after animation
        setTimeout(() => {
            addButton.innerHTML = '<i class="fas fa-cart-plus"></i> Add to Cart';
            addButton.classList.remove('success');
        }, 1500);
    });
    
    // Add hover effect
    element.addEventListener('mouseenter', () => {
        element.classList.add('hover');
    });
    
    element.addEventListener('mouseleave', () => {
        element.classList.remove('hover');
    });

    return element;
}

// Add these sound effects
const soundEffects = {
    addToCart: new Audio('https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3'),
    success: new Audio('https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3'),
    popup: new Audio('https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3')
};

// Enhanced add to cart function
function addToCart(item) {
    // Play add to cart sound
    soundEffects.addToCart.play();
    
    // Add item to cart
    cart.push(item);
    updateCartCount();
    
    // Create floating animation
    createFloatingItem(item);
    
    // Show toast notification
    showToast(`Added ${item.name} to cart!`);
}

// Floating animation when adding to cart
function createFloatingItem(item) {
    const floatingItem = document.createElement('div');
    floatingItem.className = 'floating-item';
    
    // Get position of clicked button
    const button = event.target;
    const rect = button.getBoundingClientRect();
    
    // Get position of cart icon
    const cart = document.querySelector('.cart-btn');
    const cartRect = cart.getBoundingClientRect();
    
    floatingItem.style.cssText = `
        left: ${rect.left}px;
        top: ${rect.top}px;
    `;
    
    floatingItem.innerHTML = `
        <div class="floating-item-content">
            <img src="${item.image || 'default-product.png'}" alt="${item.name}">
            <span>+1</span>
        </div>
    `;
    
    document.body.appendChild(floatingItem);
    
    // Animate to cart
    requestAnimationFrame(() => {
        floatingItem.style.transform = `translate(${cartRect.left - rect.left}px, ${cartRect.top - rect.top}px) scale(0.1)`;
        floatingItem.style.opacity = '0';
    });
    
    // Remove after animation
    setTimeout(() => {
        floatingItem.remove();
        // Animate cart icon
        cart.classList.add('cart-bump');
        setTimeout(() => cart.classList.remove('cart-bump'), 300);
    }, 500);
}

// Toast notification system
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <div class="toast-content">
            <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-info-circle'}"></i>
            <span>${message}</span>
        </div>
    `;
    
    document.body.appendChild(toast);
    
    // Animate in
    requestAnimationFrame(() => {
        toast.classList.add('show');
    });
    
    // Remove after delay
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Cart bounce animation
function updateCartCount() {
    const cartCount = document.querySelector('.cart-count');
    cartCount.textContent = cart.length;
    cartCount.classList.add('bounce');
    setTimeout(() => cartCount.classList.remove('bounce'), 300);
}

// Function to open the modal
function openModal() {
    document.getElementById("orderModal").style.display = "block";
}

// Function to close the modal
function closeModal() {
    document.getElementById("orderModal").style.display = "none";
}

// Example function to submit the order
async function submitOrder() {
    const orderData = {
        name: document.getElementById('fullName').value,
        phone: document.getElementById('phoneNumber').value,
        email: document.getElementById('email').value,
        address: document.getElementById('deliveryAddress').value,
        paymentMethod: document.querySelector('input[name="paymentMethod"]:checked').value,
        items: window.cart // Include cart items if applicable
    };

    try {
        const data = await apiFetch('/api/orders', {
            method: 'POST',
            body: JSON.stringify(orderData)
        });
        console.log('Success:', data);
        alert('Order placed successfully!');
    } catch (error) {
        console.error('Error:', error);
        alert('Failed to place order. Please try again.');
    }
}

// Close the modal when the user clicks anywhere outside of it
window.onclick = function(event) {
    const modal = document.getElementById("orderModal");
    if (event.target == modal) {
        closeModal();
    }
}

// Define generateOrderNumber in the global scope
window.generateOrderNumber = function() {
    const timestamp = new Date().getTime();
    const random = Math.floor(Math.random() * 1000);
    return `ORD-${timestamp}-${random}`;
};

// Find the form submit event listener and update it:
const checkoutForm = document.querySelector('.checkout-form');
if (checkoutForm) {
    checkoutForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    console.log('Form submitted');

    const formData = {
        orderNumber: generateOrderNumber(),
            customerName: document.getElementById('fullName')?.value || '',
            phone: document.getElementById('phone')?.value || '',
            email: document.getElementById('email')?.value || '',
            address: document.getElementById('selectedAddress')?.value || '',
            paymentMethod: document.querySelector('input[name="paymentMethod"]:checked')?.value || '',
        items: window.cart,
        total: window.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0)
    };

    console.log('Sending order:', formData);

    try {
        const response = await fetch('https://app-files.onrender.com/api/orders', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        console.log('Response:', response);
        
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }

        const result = await response.json();
        console.log('Success:', result);
        
        // Clear cart and show success
        window.cart = [];
        updateCartDisplay();
        hideCheckout();
        alert('Order placed successfully!');
        
    } catch (error) {
        console.error('Error:', error);
        alert('Failed to submit order: ' + error.message);
    }
});
}

document.addEventListener('DOMContentLoaded', function() {
    console.log('Document loaded');
    
    const orderForm = document.getElementById('orderForm');
    if (orderForm) {
        console.log('Form found');
        
        // Add device detection function here
        function detectDevice() {
            const ua = navigator.userAgent;
            const platform = {
                device: 'unknown',
                os: 'unknown',
                browser: 'unknown',
                userAgent: ua,
                screenSize: `${window.screen.width}x${window.screen.height}`
            };

            if (/iPad|Tablet|PlayBook/i.test(ua)) {
                platform.device = 'tablet';
            } else if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle/i.test(ua)) {
                platform.device = 'mobile';
            } else {
                platform.device = 'desktop';
            }

            if (/Windows/i.test(ua)) platform.os = 'Windows';
            else if (/iPhone|iPad|iPod/.test(ua)) platform.os = 'iOS';
            else if (/Android/.test(ua)) platform.os = 'Android';
            else if (/Mac/i.test(ua)) platform.os = 'MacOS';
            else if (/Linux/i.test(ua)) platform.os = 'Linux';

            if (/Chrome/i.test(ua)) platform.browser = 'Chrome';
            else if (/Firefox/i.test(ua)) platform.browser = 'Firefox';
            else if (/Safari/i.test(ua)) platform.browser = 'Safari';
            else if (/Edge/i.test(ua)) platform.browser = 'Edge';

            return platform;
        }

        // Update form submission with device info
        orderForm.addEventListener('submit', function(event) {
            event.preventDefault();
            const deviceInfo = detectDevice();
            
            const orderData = {
                orderNumber: window.generateOrderNumber(),
                customerName: document.getElementById('fullName')?.value || '',
                phone: document.getElementById('phone')?.value || '',
                email: document.getElementById('email')?.value || '',
                address: document.getElementById('selectedAddress')?.value || '',
                paymentMethod: document.querySelector('input[name="paymentMethod"]:checked')?.value || '',
                items: window.cart,
                total: window.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0),
                deviceInfo: deviceInfo
            };

            // ...existing fetch code...
        });
    }
});

document.querySelectorAll('.info-hotspot-header').forEach(header => {
    header.addEventListener('click', function() {
        const hotspotText = this.nextElementSibling;
        if (hotspotText.style.display === 'block') {
            hotspotText.style.display = 'none';
        } else {
            hotspotText.style.display = 'block';
        }
    });
});

// Mini-map functionality has been removed

// Add Voice Command System
class VoiceCommandSystem {
  constructor() {
    this.recognition = null;
    this.isListening = false;
    this.commands = {
      navigation: {
        'go to entrance': () => this.navigateToScene('0-entrancee'),
        'go to dairy': () => this.navigateToScene('1-laiterie'),
        'go to cheese': () => this.navigateToScene('2-fromage'),
        'go to vegetables': () => this.navigateToScene('3-vegii'),
        'go to juice': () => this.navigateToScene('4-jus'),
        'go to butcher': () => this.navigateToScene('5-boucherie'),
        'show me': () => this.handleShowMeCommand(),
        'what can i buy': () => this.showAvailableProducts(),
        'suggest products': () => this.suggestProducts(),
        'where am i': () => this.showCurrentLocation(),
        'take me back': () => this.navigateToScene('0-entrancee'),
        'go to checkout': () => document.getElementById('checkoutBtn').click(),
      },
      view: {
        'look up': () => document.getElementById('viewUp').click(),
        'look down': () => document.getElementById('viewDown').click(),
        'look left': () => document.getElementById('viewLeft').click(),
        'look right': () => document.getElementById('viewRight').click(),
        'zoom in': () => document.getElementById('viewIn').click(),
        'zoom out': () => document.getElementById('viewOut').click(),
        'look around': () => this.lookAround(),
        'reset view': () => this.resetView(),
        'pan left': () => document.getElementById('viewLeft').click(),
        'pan right': () => document.getElementById('viewRight').click(),
      },
      cart: {
        'open cart': () => this.toggleCart(true),
        'close cart': () => this.toggleCart(false),
        'checkout': () => document.getElementById('checkoutBtn').click(),
        'what\'s in my cart': () => this.showCartContents(),
        'remove item': () => this.handleRemoveItem(),
        'clear cart': () => this.clearCart(),
        'show total': () => this.showCartTotal(),
      },
      help: {
        'what can i say': () => this.showAvailableCommands(),
        'help': () => this.showHelp(),
        'stop listening': () => this.toggleListening(),
      }
    };
    
    // Enhanced hotspot mapping with categories and descriptions
    this.hotspotMapping = {
      'vegetables': {
        'potato': { scene: '3-vegii', hotspot: 'potato', category: 'vegetables', description: 'Fresh potatoes', aliases: ['potatoes', 'spuds'] },
        'tomato': { scene: '3-vegii', hotspot: 'tomato', category: 'vegetables', description: 'Ripe tomatoes', aliases: ['tomatoes'] },
        'lettuce': { scene: '3-vegii', hotspot: 'lettuce', category: 'vegetables', description: 'Fresh lettuce', aliases: ['salad'] },
        'carrot': { scene: '3-vegii', hotspot: 'carrot', category: 'vegetables', description: 'Orange carrots', aliases: ['carrots'] },
        'onion': { scene: '3-vegii', hotspot: 'onion', category: 'vegetables', description: 'Fresh onions', aliases: ['onions'] },
      },
      'dairy': {
        'cheese': { scene: '2-fromage', hotspot: 'cheese', category: 'dairy', description: 'Various cheeses', aliases: ['cheeses'] },
        'milk': { scene: '1-laiterie', hotspot: 'milk', category: 'dairy', description: 'Fresh milk', aliases: ['dairy milk'] },
        'yogurt': { scene: '1-laiterie', hotspot: 'yogurt', category: 'dairy', description: 'Plain yogurt', aliases: ['yoghurt', 'yoghourt'] },
      },
      'beverages': {
        'juice': { scene: '4-jus', hotspot: 'juice', category: 'beverages', description: 'Fresh fruit juices', aliases: ['juices', 'fruit juice'] },
        'water': { scene: '4-jus', hotspot: 'water', category: 'beverages', description: 'Mineral water', aliases: ['mineral water', 'drinking water'] },
        'soda': { scene: '4-jus', hotspot: 'soda', category: 'beverages', description: 'Carbonated drinks', aliases: ['soft drink', 'pop', 'fizzy drink'] },
      },
      'meat': {
        'beef': { scene: '5-boucherie', hotspot: 'beef', category: 'meat', description: 'Fresh beef', aliases: ['steak', 'ground beef'] },
        'chicken': { scene: '5-boucherie', hotspot: 'chicken', category: 'meat', description: 'Fresh chicken', aliases: ['poultry', 'whole chicken'] },
        'pork': { scene: '5-boucherie', hotspot: 'pork', category: 'meat', description: 'Fresh pork', aliases: ['pork chops', 'pork loin'] },
      }
    };
    
    this.setupRecognition();
    this.createVoiceCommandButton();
    this.createVoiceFeedbackPopup(); // Add this line
    this.lastCommand = null;
    this.commandHistory = [];
    this.expectingItemRemoval = false;
    this.supportedLanguages = ['en-US', 'en-GB', 'fr-FR', 'es-ES'];
    this.currentLanguage = 'en-US';
  }
  
  setupRecognition() {
    try {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        console.error('Speech recognition not supported');
        return;
      }

      this.recognition = new SpeechRecognition();
      this.recognition.continuous = false;
      this.recognition.interimResults = false;
      this.recognition.lang = 'en-US';

      this.recognition.onstart = () => {
        console.log('Voice recognition started');
        this.isListening = true;
        this.updateVoiceButton(true);
        this.showVoiceFeedback();
      };

      this.recognition.onresult = (event) => {
        const result = event.results[0];
        const transcript = result[0].transcript.toLowerCase().trim();
        const confidence = result[0].confidence;
        
        console.log(`Recognized: ${transcript}. Confidence: ${confidence}`);
        
        this.updateVoiceFeedback(`Recognized: ${transcript}`, confidence);
        
        // Process the command with the actual confidence value
        this.processCommand(transcript, confidence);
      };

      this.recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        this.updateVoiceFeedback(`Error: ${event.error}`, 0);
        this.isListening = false;
        this.updateVoiceButton(false);
      };

      this.recognition.onend = () => {
        console.log('Voice recognition ended');
        this.isListening = false;
        this.updateVoiceButton(false);
        this.hideVoiceFeedback();
      };

    } catch (error) {
      console.error('Error setting up speech recognition:', error);
      this.updateVoiceFeedback('Error setting up voice recognition', 0);
    }
  }
  
  calculateSimilarity(str1, str2) {
    // Enhanced similarity calculation using multiple methods
    const levenshteinDistance = this.levenshteinDistance(str1, str2);
    const jaroWinklerDistance = this.jaroWinklerDistance(str1, str2);
    const longestCommonSubsequence = this.longestCommonSubsequence(str1, str2);
    
    // Weighted combination of different similarity measures
    return (levenshteinDistance * 0.4 + jaroWinklerDistance * 0.4 + longestCommonSubsequence * 0.2);
  }
  
  levenshteinDistance(str1, str2) {
    const track = Array(str2.length + 1).fill(null).map(() =>
      Array(str1.length + 1).fill(null));
    
    for (let i = 0; i <= str1.length; i++) track[0][i] = i;
    for (let j = 0; j <= str2.length; j++) track[j][0] = j;
    
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        track[j][i] = Math.min(
          track[j][i - 1] + 1,
          track[j - 1][i] + 1,
          track[j - 1][i - 1] + indicator
        );
      }
    }
    
    const maxLength = Math.max(str1.length, str2.length);
    return 1 - (track[str2.length][str1.length] / maxLength);
  }
  
  jaroWinklerDistance(str1, str2) {
    // Implementation of Jaro-Winkler distance algorithm
    const m = this.matchingCharacters(str1, str2);
    if (m === 0) return 0;
    
    const t = this.transpositions(str1, str2);
    const l = this.prefixLength(str1, str2);
    
    const jaro = (m / str1.length + m / str2.length + (m - t) / m) / 3;
    return jaro + (l * 0.1 * (1 - jaro));
  }
  
  longestCommonSubsequence(str1, str2) {
    const matrix = Array(str2.length + 1).fill(null).map(() =>
      Array(str1.length + 1).fill(0));
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2[i - 1] === str1[j - 1]) {
          matrix[i][j] = matrix[i - 1][j - 1] + 1;
        } else {
          matrix[i][j] = Math.max(matrix[i - 1][j], matrix[i][j - 1]);
        }
      }
    }
    
    return matrix[str2.length][str1.length] / Math.max(str1.length, str2.length);
  }
  
  matchingCharacters(str1, str2) {
    const maxDistance = Math.floor(Math.max(str1.length, str2.length) / 2) - 1;
    let matches = 0;
    
    for (let i = 0; i < str1.length; i++) {
      const start = Math.max(0, i - maxDistance);
      const end = Math.min(str2.length, i + maxDistance + 1);
      
      for (let j = start; j < end; j++) {
        if (str1[i] === str2[j]) {
          matches++;
          break;
        }
      }
    }
    
    return matches;
  }
  
  transpositions(str1, str2) {
    const maxDistance = Math.floor(Math.max(str1.length, str2.length) / 2) - 1;
    let transpositions = 0;
    
    for (let i = 0; i < str1.length; i++) {
      const start = Math.max(0, i - maxDistance);
      const end = Math.min(str2.length, i + maxDistance + 1);
      
      for (let j = start; j < end; j++) {
        if (str1[i] === str2[j]) {
          if (i !== j) transpositions++;
          break;
        }
      }
    }
    
    return transpositions / 2;
  }
  
  prefixLength(str1, str2) {
    let prefix = 0;
    const maxPrefix = 4;
    
    while (prefix < maxPrefix && str1[prefix] === str2[prefix]) {
      prefix++;
    }
    
    return prefix;
  }
  
  findProductInTranscript(transcript) {
    const lowerTranscript = transcript.toLowerCase();
    let bestMatch = null;
    let highestSimilarity = 0;
    
    // Search through all categories
    Object.values(this.hotspotMapping).forEach(category => {
      Object.entries(category).forEach(([product, data]) => {
        // Check main product name
        const similarity = this.calculateSimilarity(lowerTranscript, product.toLowerCase());
        if (similarity > highestSimilarity && similarity > 0.6) {
          highestSimilarity = similarity;
          bestMatch = product;
        }
        
        // Check if transcript contains product name
        if (lowerTranscript.includes(product.toLowerCase())) {
          bestMatch = product;
          highestSimilarity = 1;
        }
        
        // Check for common variations
        const variations = this.getProductVariations(product);
        variations.forEach(variation => {
          if (lowerTranscript.includes(variation)) {
            bestMatch = product;
            highestSimilarity = 1;
          }
        });
      });
    });
    
    return bestMatch;
  }

  getProductVariations(product) {
    const variations = {
      'potato': ['potatoes', 'spuds', 'taters'],
      'tomato': ['tomatoes'],
      'lettuce': ['salad', 'leafy greens'],
      'carrot': ['carrots'],
      'onion': ['onions'],
      'cheese': ['cheeses', 'dairy'],
      'milk': ['dairy milk', 'cow milk'],
      'yogurt': ['yoghurt', 'yoghourt', 'yogurt'],
      'juice': ['juices', 'fruit juice', 'drink'],
      'water': ['mineral water', 'drinking water', 'bottled water'],
      'soda': ['soft drink', 'pop', 'fizzy drink', 'carbonated drink'],
      'beef': ['steak', 'ground beef', 'meat'],
      'chicken': ['poultry', 'whole chicken', 'meat'],
      'pork': ['pork chops', 'pork loin', 'meat']
    };
    
    return variations[product.toLowerCase()] || [];
  }
  
  showAvailableCommands() {
    const commandCategories = Object.keys(this.commands);
    let message = 'Available commands:\n';
    
    commandCategories.forEach(category => {
      message += `\n${category.toUpperCase()}:\n`;
      Object.keys(this.commands[category]).forEach(command => {
        message += `- ${command}\n`;
      });
    });
    
    this.showToast(message, 'info');
  }
  
  showHelp() {
    const helpMessage = `
      You can use voice commands to:
      1. Navigate: "go to vegetables", "go to dairy", etc.
      2. View: "look around", "zoom in", "reset view"
      3. Cart: "open cart", "what's in my cart", "checkout"
      4. Products: "show me potatoes", "what is cheese", "where can I find milk"
      5. Help: "what can I say", "stop listening"
      
      Try saying "show me" followed by a product name to see it in 3D!
    `;
    
    this.showToast(helpMessage, 'info');
  }
  
  showCurrentLocation() {
    try {
      const currentScene = APP_DATA.scenes[currentScene];
      if (currentScene) {
        this.updateVoiceFeedback(`You are in the ${currentScene.name} section`, 1);
      } else {
        this.updateVoiceFeedback('Current location unknown', 0.3);
      }
    } catch (error) {
      console.error('Error showing current location:', error);
      this.updateVoiceFeedback('Error showing location', 0.3);
    }
  }
  
  resetView() {
    // Reset the view to the default position
    const defaultView = window.APP_DATA.scenes[window.currentScene].initialViewParameters;
    window.viewer.lookTo(defaultView);
  }
  
  clearCart() {
    const cart = document.getElementById('cartItems');
    if (cart) {
      cart.innerHTML = '';
      this.updateCartDisplay();
      this.showToast('Cart cleared', 'success');
    }
  }
  
  showCartTotal() {
    const totalElement = document.querySelector('.cart-total');
    if (totalElement) {
      this.showToast(`Your total is ${totalElement.textContent}`, 'info');
    }
  }
  
  toggleListening() {
    if (!this.recognition) {
      this.showToast('Voice commands not supported in this browser', 'error');
      return;
    }
    
    if (this.isListening) {
      this.recognition.stop();
    } else {
      this.recognition.start();
    }
  }
  
  processCommand(transcript, confidence = 0) {
    // Normalize the transcript
    transcript = transcript.toLowerCase().trim();
    console.log('Processing command:', transcript);
    
    // Handle navigation commands first
    if (transcript.startsWith('go to')) {
        const location = transcript.replace('go to', '').trim();
        console.log('Navigating to:', location);
        
        // Map voice commands to scene IDs
        const sceneMap = {
            'entrance': '0-entrancee',
            'dairy': '1-laiterie',
            'cheese': '2-fromage',
            'vegetables': '3-vegii',
            'juice': '4-jus',
            'butcher': '5-boucherie'
        };
        
        const sceneId = sceneMap[location];
        if (sceneId) {
            // Find the scene in scenes array
            const targetScene = scenes.find(s => s.data.id === sceneId);
            if (targetScene) {
                console.log('Found scene:', targetScene);
                switchScene(targetScene);
                this.updateVoiceFeedback(`Navigating to ${location}`, 1);
            } else {
                this.updateVoiceFeedback(`Could not find ${location} scene`, 0.3);
            }
        } else {
            this.updateVoiceFeedback(`Unknown location: ${location}`, 0.3);
        }
        return;
    }
    
    // Handle other commands...
    // ... existing code ...
  }

  getCommandVariations(command) {
    const variations = {
      'go to': ['take me to', 'navigate to', 'show me', 'where is'],
      'look up': ['look above', 'look upwards', 'up'],
      'look down': ['look below', 'look downwards', 'down'],
      'look left': ['look to the left', 'left'],
      'look right': ['look to the right', 'right'],
      'zoom in': ['zoom closer', 'get closer', 'closer'],
      'zoom out': ['zoom away', 'get away', 'further'],
      'open cart': ['show cart', 'display cart', 'view cart'],
      'close cart': ['hide cart', 'minimize cart'],
      'what\'s in my cart': ['show cart contents', 'what do I have', 'cart items'],
      'remove item': ['delete item', 'take out', 'remove from cart'],
      'checkout': ['proceed to checkout', 'pay', 'complete purchase']
    };
    
    return variations[command] || [];
  }

  isContextualCommand(transcript) {
    const contextualPhrases = [
      'show me', 'what is', 'tell me about', 'where can i find',
      'how much', 'what are', 'what do you have'
    ];
    return contextualPhrases.some(phrase => transcript.includes(phrase));
  }

  handleContextualCommand(transcript) {
    // Handle "show me" commands
    if (transcript.includes('show me')) {
      const product = this.findProductInTranscript(transcript);
      if (product) {
        this.navigateToProduct(product);
        return true;
      }
    }
    
    // Handle "what is" or "tell me about" commands
    if (transcript.includes('what is') || transcript.includes('tell me about')) {
      const product = this.findProductInTranscript(transcript);
      if (product) {
        this.showProductInfo(product);
        return true;
      }
    }
    
    // Handle "where can i find" commands
    if (transcript.includes('where can i find')) {
      const product = this.findProductInTranscript(transcript);
      if (product) {
        this.showProductLocation(product);
        return true;
      }
    }
    
    return false;
  }

  navigateToScene(sceneId) {
    try {
      // Use the global APP_DATA to find the scene
      const sceneData = APP_DATA.scenes.find(scene => scene.id === sceneId);
      if (sceneData) {
        // Use the global switchScene function
        switchScene(sceneData);
        this.updateVoiceFeedback(`Navigating to ${sceneData.name}`, 1);
        return true;
      } else {
        this.updateVoiceFeedback(`Scene ${sceneId} not found`, 0.3);
        return false;
      }
    } catch (error) {
      console.error('Error navigating to scene:', error);
      this.updateVoiceFeedback('Navigation error', 0.3);
      return false;
    }
  }

  navigateToProduct(productName) {
    try {
      // Find the product in our mapping
      let productInfo = null;
      Object.values(this.hotspotMapping).forEach(category => {
        if (category[productName]) {
          productInfo = category[productName];
        }
      });

      if (productInfo) {
        // Navigate to the scene
        const success = this.navigateToScene(productInfo.scene);
        if (success) {
          // Wait for scene to load, then show the product
          setTimeout(() => {
            const hotspot = document.querySelector(`[data-hotspot="${productInfo.hotspot}"]`);
            if (hotspot) {
              hotspot.click();
              this.updateVoiceFeedback(`Showing ${productName}`, 1);
            } else {
              this.updateVoiceFeedback(`Could not find ${productName} in this section`, 0.3);
            }
          }, 1000);
        }
      } else {
        this.updateVoiceFeedback(`Product ${productName} not found`, 0.3);
      }
    } catch (error) {
      console.error('Error navigating to product:', error);
      this.updateVoiceFeedback('Navigation error', 0.3);
    }
  }

  showProductInfo(product) {
    try {
      let productInfo = null;
      Object.values(this.hotspotMapping).forEach(category => {
        if (category[product]) {
          productInfo = category[product];
        }
      });
      
      if (productInfo) {
        this.updateVoiceFeedback(`${product}: ${productInfo.description}. Located in the ${productInfo.category} section.`, 1);
        this.navigateToProduct(product);
      } else {
        this.updateVoiceFeedback(`Sorry, I couldn't find information about ${product}`, 0.3);
      }
    } catch (error) {
      console.error('Error showing product info:', error);
      this.updateVoiceFeedback('Error showing product information', 0.3);
    }
  }

  showProductLocation(product) {
    let productInfo = null;
    
    // Find product info in mapping
    Object.values(this.hotspotMapping).forEach(category => {
      if (category[product]) {
        productInfo = category[product];
      }
    });
    
    if (productInfo) {
      this.showToast(`You can find ${product} in the ${productInfo.category} section. Let me take you there.`, 'info');
      this.navigateToProduct(product);
    } else {
      this.showToast(`Sorry, I couldn't find ${product} in our store`, 'error');
    }
  }

  suggestSimilarCommands(transcript) {
    const suggestions = [];
    const lowerTranscript = transcript.toLowerCase();
    
    // Check all commands for similarity
    Object.values(this.commands).forEach(category => {
      Object.keys(category).forEach(command => {
        const similarity = this.calculateSimilarity(lowerTranscript, command.toLowerCase());
        if (similarity > 0.5) {
          suggestions.push(command);
        }
      });
    });
    
    // Check products for similarity
    Object.values(this.hotspotMapping).forEach(category => {
      Object.keys(category).forEach(product => {
        const similarity = this.calculateSimilarity(lowerTranscript, product.toLowerCase());
        if (similarity > 0.5) {
          suggestions.push(`show me ${product}`);
        }
      });
    });
    
    if (suggestions.length > 0) {
      this.showToast(`Did you mean: ${suggestions.slice(0, 3).join(', ')}?`, 'info');
    } else {
      this.showToast(`Command not recognized. Try saying "show me" followed by a product name, or use navigation commands like "look around" or "go to vegetables".`, 'warning');
    }
  }

  handleShowMeCommand() {
    const currentScene = window.APP_DATA.scenes[window.currentScene].id;
    let availableProducts = [];
    
    // Find products in current scene
    Object.values(this.hotspotMapping).forEach(category => {
      Object.entries(category).forEach(([product, data]) => {
        if (data.scene === currentScene) {
          availableProducts.push(product);
        }
      });
    });
    
    if (availableProducts.length > 0) {
      this.showToast(`In this section, you can find: ${availableProducts.join(', ')}`, 'info');
    } else {
      this.showToast('No products found in this section', 'warning');
    }
  }

  showAvailableProducts() {
    let allProducts = [];
    
    // Collect all products
    Object.values(this.hotspotMapping).forEach(category => {
      Object.entries(category).forEach(([product, data]) => {
        allProducts.push(`${product} (${data.category})`);
      });
    });
    
    this.showToast(`Available products: ${allProducts.join(', ')}`, 'info');
  }

  suggestProducts() {
    // Get current scene
    const currentScene = window.APP_DATA.scenes[window.currentScene].id;
    let suggestions = [];
    
    // Find products in current scene
    Object.values(this.hotspotMapping).forEach(category => {
      Object.entries(category).forEach(([product, data]) => {
        if (data.scene === currentScene) {
          suggestions.push(product);
        }
      });
    });
    
    if (suggestions.length > 0) {
      this.showToast(`You might be interested in: ${suggestions.join(', ')}`, 'info');
    } else {
      this.showToast('No products available in this section', 'warning');
    }
  }

  lookAround() {
    // Simulate looking around by triggering view controls in sequence
    const controls = ['viewLeft', 'viewRight', 'viewUp', 'viewDown'];
    let index = 0;
    
    const lookInterval = setInterval(() => {
      if (index < controls.length) {
        document.getElementById(controls[index]).click();
        index++;
      } else {
        clearInterval(lookInterval);
      }
    }, 1000);
  }

  showCartContents() {
    const cart = document.getElementById('cartItems');
    if (cart && cart.children.length > 0) {
      const items = Array.from(cart.children).map(item => 
        item.querySelector('.item-name').textContent
      );
      this.showToast(`Your cart contains: ${items.join(', ')}`, 'info');
    } else {
      this.showToast('Your cart is empty', 'info');
    }
  }

  handleRemoveItem() {
    const cart = document.getElementById('cartItems');
    if (cart && cart.children.length > 0) {
      this.showToast('Which item would you like to remove?', 'info');
      // The next voice command will be treated as the item to remove
      this.expectingItemRemoval = true;
    } else {
      this.showToast('Your cart is empty', 'info');
    }
  }

  toggleCart(open) {
    const cart = document.getElementById('shoppingCart');
    if (cart) {
      if (open) {
        cart.classList.remove('minimized');
      } else {
        cart.classList.add('minimized');
      }
    }
  }

  showToast(message, type = 'info') {
    // Check if we can use the existing showToast function
    if (typeof window.showToast === 'function') {
      window.showToast(message, type);
    } else {
      // Create a simple toast if the main one doesn't exist
      const toast = document.createElement('div');
      toast.className = `voice-toast ${type}`;
      toast.textContent = message;
      document.body.appendChild(toast);
      
      // Style for the toast
      Object.assign(toast.style, {
        position: 'fixed',
        top: '20px',
        right: '20px',
        padding: '10px 20px',
        background: type === 'error' ? '#f44336' : 
                   type === 'success' ? '#4CAF50' : 
                   type === 'warning' ? '#ff9800' : '#2196F3',
        color: 'white',
        borderRadius: '4px',
        zIndex: '10000',
        boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
        opacity: '0',
        transition: 'opacity 0.3s'
      });
      
      // Show and hide with animation
      setTimeout(() => { toast.style.opacity = '1'; }, 10);
      setTimeout(() => { 
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
      }, 3000);
    }
  }

  createVoiceCommandButton() {
    const button = document.createElement('button');
    button.id = 'voiceCommandBtn';
    button.className = 'voice-command-btn';
    button.setAttribute('aria-label', 'Voice Commands');
    button.innerHTML = '<i class="fas fa-microphone"></i>';
    
    // Style the button
    Object.assign(button.style, {
      position: 'fixed',
      bottom: '140px',
      right: '20px',
      width: '50px',
      height: '50px',
      borderRadius: '50%',
      background: 'linear-gradient(to right, #4a6bff, #45a7ff)',
      color: 'white',
      border: 'none',
      boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
      cursor: 'pointer',
      zIndex: '1000',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '20px',
      transition: 'all 0.3s'
    });
    
    // Add click event
    button.addEventListener('click', () => this.toggleListening());
    
    // Add hover effect
    button.addEventListener('mouseover', () => {
      button.style.transform = 'scale(1.1)';
    });
    
    button.addEventListener('mouseout', () => {
      button.style.transform = 'scale(1)';
    });
    
    // Add to body when DOM is fully loaded
    if (document.body) {
      document.body.appendChild(button);
    } else {
      window.addEventListener('DOMContentLoaded', () => {
        document.body.appendChild(button);
      });
    }
  }
  
  updateVoiceButton(isListening) {
    const button = document.getElementById('voiceCommandBtn');
    if (button) {
      if (isListening) {
        button.style.background = 'linear-gradient(to right, #ff4a4a, #ff45a7)';
        button.style.animation = 'pulse 1.5s infinite';
        button.querySelector('i').className = 'fas fa-microphone-alt';
      } else {
        button.style.background = 'linear-gradient(to right, #4a6bff, #45a7ff)';
        button.style.animation = '';
        button.querySelector('i').className = 'fas fa-microphone';
      }
    }
  }

  createVoiceFeedbackPopup() {
    // Create popup container
    this.voiceFeedbackPopup = document.createElement('div');
    this.voiceFeedbackPopup.className = 'voice-feedback-popup';
    this.voiceFeedbackPopup.style.cssText = `
      position: fixed;
      bottom: 200px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 15px 25px;
      border-radius: 10px;
      font-size: 16px;
      display: none;
      z-index: 1000;
      min-width: 300px;
      text-align: center;
      box-shadow: 0 0 20px rgba(0, 0, 0, 0.3);
    `;

    // Create microphone icon
    const micIcon = document.createElement('div');
    micIcon.className = 'mic-icon';
    micIcon.innerHTML = '🎤';
    micIcon.style.cssText = `
      font-size: 24px;
      margin-bottom: 10px;
      animation: pulse 1.5s infinite;
    `;

    // Create text container
    const textContainer = document.createElement('div');
    textContainer.className = 'voice-text';
    textContainer.style.cssText = `
      margin-bottom: 10px;
      min-height: 24px;
    `;

    // Create confidence indicator
    const confidenceIndicator = document.createElement('div');
    confidenceIndicator.className = 'confidence-indicator';
    confidenceIndicator.style.cssText = `
      height: 4px;
      background: rgba(255, 255, 255, 0.2);
      border-radius: 2px;
      margin-top: 5px;
      overflow: hidden;
    `;

    const confidenceBar = document.createElement('div');
    confidenceBar.className = 'confidence-bar';
    confidenceBar.style.cssText = `
      height: 100%;
      background: #4CAF50;
      width: 0%;
      transition: width 0.3s ease;
    `;

    confidenceIndicator.appendChild(confidenceBar);

    // Add elements to popup
    this.voiceFeedbackPopup.appendChild(micIcon);
    this.voiceFeedbackPopup.appendChild(textContainer);
    this.voiceFeedbackPopup.appendChild(confidenceIndicator);

    // Add styles
    const style = document.createElement('style');
    style.textContent = `
      @keyframes pulse {
        0% { transform: scale(1); }
        50% { transform: scale(1.2); }
        100% { transform: scale(1); }
      }
      
      .voice-feedback-popup {
        backdrop-filter: blur(5px);
      }
      
      .voice-feedback-popup.showing {
        animation: slideUp 0.3s ease;
      }
      
      @keyframes slideUp {
        from { transform: translate(-50%, 20px); opacity: 0; }
        to { transform: translate(-50%, 0); opacity: 1; }
      }
    `;
    document.head.appendChild(style);

    document.body.appendChild(this.voiceFeedbackPopup);
  }

  updateVoiceFeedback(text, confidence) {
    const textContainer = this.voiceFeedbackPopup.querySelector('.voice-text');
    const confidenceBar = this.voiceFeedbackPopup.querySelector('.confidence-bar');
    
    textContainer.textContent = text || 'Listening...';
    confidenceBar.style.width = `${confidence * 100}%`;
    
    // Update confidence bar color based on confidence level
    if (confidence > 0.8) {
      confidenceBar.style.background = '#4CAF50'; // Green
    } else if (confidence > 0.6) {
      confidenceBar.style.background = '#FFC107'; // Yellow
    } else {
      confidenceBar.style.background = '#F44336'; // Red
    }
  }

  showVoiceFeedback() {
    this.voiceFeedbackPopup.style.display = 'block';
    this.voiceFeedbackPopup.classList.add('showing');
  }

  hideVoiceFeedback() {
    this.voiceFeedbackPopup.classList.remove('showing');
    setTimeout(() => {
      this.voiceFeedbackPopup.style.display = 'none';
    }, 300);
  }
}

// Initialize voice commands when the page is loaded
window.addEventListener('load', function() {
  // Create a CSS rule for the pulse animation for the voice button
  const style = document.createElement('style');
  style.textContent = `
    @keyframes pulse {
      0% {
        box-shadow: 0 0 0 0 rgba(255, 74, 74, 0.7);
      }
      70% {
        box-shadow: 0 0 0 10px rgba(255, 74, 74, 0);
      }
      100% {
        box-shadow: 0 0 0 0 rgba(255, 74, 74, 0);
      }
    }
  `;
  document.head.appendChild(style);
  
  // Initialize the voice command system
  window.voiceCommandSystem = new VoiceCommandSystem();
});

// Performance Optimizer - Implement lazy loading for scenes
class PerformanceOptimizer {
  constructor(viewer, scenes) {
    this.viewer = viewer;
    this.scenes = scenes;
    this.loadedScenes = new Set();
    this.currentSceneId = null;
    this.priorityLoadQueue = [];
    this.backgroundLoadQueue = [];
    this.isLoading = false;
    
    this.init();
  }
  
  init() {
    // Monitor scene changes
    document.addEventListener('sceneChange', (event) => {
      if (event.detail && event.detail.sceneId) {
        this.onSceneChange(event.detail.sceneId);
      }
    });
    
    // Initial scene is already loaded, mark it as such
    if (window.currentScene !== undefined) {
      const currentSceneId = window.APP_DATA.scenes[window.currentScene].id;
      this.loadedScenes.add(currentSceneId);
      this.currentSceneId = currentSceneId;
      
      // Preload adjacent scenes
      this.preloadAdjacentScenes(currentSceneId);
    }
    
    // Start background loading process
    this.startBackgroundLoading();
  }
  
  
  onSceneChange(sceneId) {
    // Update current scene
    this.currentSceneId = sceneId;
    this.loadedScenes.add(sceneId);
    
    // Prioritize loading adjacent scenes
    this.preloadAdjacentScenes(sceneId);
  }
  
  preloadAdjacentScenes(sceneId) {
    // Find the scene data
    const sceneData = window.APP_DATA.scenes.find(scene => scene.id === sceneId);
    if (!sceneData || !sceneData.linkHotspots) return;
    
    // Get all target scenes
    const adjacentSceneIds = sceneData.linkHotspots.map(hotspot => hotspot.target);
    
    // Add to priority queue if not already loaded
    adjacentSceneIds.forEach(id => {
      if (!this.loadedScenes.has(id)) {
        // Remove from background queue if it's there
        this.backgroundLoadQueue = this.backgroundLoadQueue.filter(queueId => queueId !== id);
        
        // Add to priority queue if not already there
        if (!this.priorityLoadQueue.includes(id)) {
          this.priorityLoadQueue.push(id);
        }
      }
    });
    
    // Start loading if not already in progress
    if (!this.isLoading) {
      this.processLoadQueue();
    }
  }
  
  startBackgroundLoading() {
    // Add all unloaded scenes to background queue
    window.APP_DATA.scenes.forEach(scene => {
      if (!this.loadedScenes.has(scene.id) && 
          !this.priorityLoadQueue.includes(scene.id) &&
          !this.backgroundLoadQueue.includes(scene.id)) {
        this.backgroundLoadQueue.push(scene.id);
      }
    });
    
    // Start loading if not already in progress
    if (!this.isLoading && this.backgroundLoadQueue.length > 0) {
      this.processLoadQueue();
    }
  }
  
  processLoadQueue() {
    // If we're already loading or there's nothing to load, exit
    if (this.isLoading || (this.priorityLoadQueue.length === 0 && this.backgroundLoadQueue.length === 0)) {
      return;
    }
    
    this.isLoading = true;
    
    // Prefer priority queue
    let nextSceneId;
    if (this.priorityLoadQueue.length > 0) {
      nextSceneId = this.priorityLoadQueue.shift();
    } else if (this.backgroundLoadQueue.length > 0) {
      nextSceneId = this.backgroundLoadQueue.shift();
    } else {
      this.isLoading = false;
      return;
    }
    
    // Find the scene index
    const sceneIndex = window.APP_DATA.scenes.findIndex(scene => scene.id === nextSceneId);
    if (sceneIndex === -1) {
      console.error(`Scene ${nextSceneId} not found`);
      this.isLoading = false;
      this.processLoadQueue(); // Try the next one
      return;
    }
    
    // Load the scene in the background
    console.log(`Preloading scene: ${nextSceneId}`);
    
    // Simulate the scene loading process
    // In a real implementation, this would use the viewer's API to load scene data
    setTimeout(() => {
      // Mark as loaded
      this.loadedScenes.add(nextSceneId);
      console.log(`Scene ${nextSceneId} preloaded successfully`);
      
      // Continue with the next scene in queue
      this.isLoading = false;
      this.processLoadQueue();
    }, 500); // Simulated loading time
  }
}

// Initialize the performance optimizer when scenes are ready
document.addEventListener('DOMContentLoaded', function() {
  // Wait for the viewer and scenes to be initialized
  const checkInterval = setInterval(() => {
    if (window.viewer && window.scenes) {
      clearInterval(checkInterval);
      window.performanceOptimizer = new PerformanceOptimizer(window.viewer, window.scenes);
      console.log('Performance optimizer initialized');
    }
  }, 100);
});

// Immersive Ambient Experience
class AmbientExperience {
  constructor() {
    this.enabled = false;
    this.ambientSounds = null;
    this.soundEffects = {};
    this.overlayElement = null;
    this.currentScene = null;
    
    this.createAmbientButton();
    this.createAmbientOverlay();
    this.setupSceneListeners();
  }
  
  createAmbientButton() {
    const button = document.createElement('button');
    button.id = 'ambientModeBtn';
    button.className = 'ambient-mode-btn';
    button.setAttribute('aria-label', 'Ambient Mode');
    button.innerHTML = '<i class="fas fa-lightbulb"></i>';
    
    // Style the button
    Object.assign(button.style, {
      position: 'fixed',
      bottom: '140px',
      left: '20px',
      width: '50px',
      height: '50px',
      borderRadius: '50%',
      background: 'linear-gradient(to right, #ffcc00, #ff9900)',
      color: 'white',
      border: 'none',
      boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
      cursor: 'pointer',
      zIndex: '1000',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '20px',
      transition: 'all 0.3s'
    });
    
    // Add click event
    button.addEventListener('click', () => this.toggleAmbientMode());
    
    // Add hover effect
    button.addEventListener('mouseover', () => {
      button.style.transform = 'scale(1.1)';
    });
    
    button.addEventListener('mouseout', () => {
      button.style.transform = 'scale(1)';
    });
    
    // Add to body when DOM is fully loaded
    if (document.body) {
      document.body.appendChild(button);
    } else {
      window.addEventListener('DOMContentLoaded', () => {
        document.body.appendChild(button);
      });
    }
  }
  
  createAmbientOverlay() {
    // Create overlay div for lighting effects
    const overlay = document.createElement('div');
    overlay.id = 'ambientOverlay';
    
    // Style overlay
    Object.assign(overlay.style, {
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      pointerEvents: 'none',
      zIndex: 999,
      opacity: 0,
      transition: 'opacity 1.5s ease',
      background: 'radial-gradient(circle at 50% 50%, rgba(255,255,255,0.1) 0%, rgba(0,0,30,0.4) 100%)',
      mixBlendMode: 'overlay'
    });
    
    document.body.appendChild(overlay);
    this.overlayElement = overlay;
  }
  
  setupSceneListeners() {
    // Listen for scene changes to update ambient effects
    document.addEventListener('sceneChange', (event) => {
      if (event.detail && event.detail.sceneId && this.enabled) {
        this.updateAmbientForScene(event.detail.sceneId);
      }
    });
    
    // Also listen for product interactions to play sounds
    document.addEventListener('click', (event) => {
      if (!this.enabled) return;
      
      const target = event.target;
      
      // Check if clicked on a product hotspot
      if (target.closest('.info-hotspot')) {
        this.playSound('productInteraction');
      }
      
      // Check if clicked add to cart
      if (target.closest('.add-to-basket-btn')) {
        this.playSound('addToCart');
      }
    });
  }
  
  toggleAmbientMode() {
    this.enabled = !this.enabled;
    
    const button = document.getElementById('ambientModeBtn');
    if (button) {
      if (this.enabled) {
        button.style.background = 'linear-gradient(to right, #00ccff, #0099ff)';
        button.querySelector('i').className = 'fas fa-lightbulb fa-solid';
        this.startAmbient();
      } else {
        button.style.background = 'linear-gradient(to right, #ffcc00, #ff9900)';
        button.querySelector('i').className = 'fas fa-lightbulb';
        this.stopAmbient();
      }
    }
    
    // Show message
    this.showToast(`Ambient mode ${this.enabled ? 'enabled' : 'disabled'}`, 
                  this.enabled ? 'success' : 'info');
  }
  
  startAmbient() {
    // Start ambient sounds
    this.initializeAudio();
    
    // Show ambient overlay
    if (this.overlayElement) {
      this.overlayElement.style.opacity = '1';
    }
    
    // Get current scene ID
    if (window.currentScene !== undefined) {
      const currentSceneId = window.APP_DATA.scenes[window.currentScene].id;
      this.updateAmbientForScene(currentSceneId);
    }
  }
  
  stopAmbient() {
    // Stop all sounds
    if (this.ambientSounds) {
      this.ambientSounds.pause();
    }
    
    // Hide ambient overlay
    if (this.overlayElement) {
      this.overlayElement.style.opacity = '0';
    }
  }
  
  initializeAudio() {
    // Create ambient background sound
    if (!this.ambientSounds) {
      this.ambientSounds = new Audio();
      this.ambientSounds.src = 'https://freesound.org/data/previews/443/443027_738377-lq.mp3'; // Supermarket ambience
      this.ambientSounds.loop = true;
      this.ambientSounds.volume = 0.4;
    }
    
    // Create sound effects
    if (!this.soundEffects.productInteraction) {
      this.soundEffects.productInteraction = new Audio();
      this.soundEffects.productInteraction.src = 'https://freesound.org/data/previews/561/561657_1168184-lq.mp3'; // Click sound
      this.soundEffects.productInteraction.volume = 0.3;
    }
    
    if (!this.soundEffects.addToCart) {
      this.soundEffects.addToCart = new Audio();
      this.soundEffects.addToCart.src = 'https://freesound.org/data/previews/513/513865_1578652-lq.mp3'; // Cash register sound
      this.soundEffects.addToCart.volume = 0.5;
    }
    
    // Start playing ambient sound
    this.ambientSounds.play().catch(e => {
      console.warn('Could not autoplay ambient sounds:', e);
      this.showToast('Click anywhere to enable ambient sounds', 'info');
      
      // Add a one-time click handler to start audio
      const clickHandler = () => {
        this.ambientSounds.play().catch(e => console.error('Failed to play after click:', e));
        document.removeEventListener('click', clickHandler);
      };
      
      document.addEventListener('click', clickHandler);
    });
  }
  
  playSound(soundType) {
    if (this.soundEffects[soundType]) {
      // Clone the audio to allow overlapping sounds
      const sound = this.soundEffects[soundType].cloneNode();
      sound.play().catch(e => console.warn('Could not play sound effect:', e));
      
      // Remove after playing to clean up memory
      sound.onended = () => sound.remove();
    }
  }
  
  updateAmbientForScene(sceneId) {
    this.currentScene = sceneId;
    
    // Update overlay effect based on scene
    if (this.overlayElement) {
      // Different color overlay for different sections
      let overlayBg;
      
      switch(sceneId) {
        case '0-entrancee':
          overlayBg = 'radial-gradient(circle at 50% 50%, rgba(255,255,255,0.15) 0%, rgba(0,20,40,0.4) 100%)';
          break;
        case '1-laiterie':
          overlayBg = 'radial-gradient(circle at 50% 50%, rgba(220,255,255,0.15) 0%, rgba(0,30,50,0.4) 100%)';
          break;
        case '2-fromage':
          overlayBg = 'radial-gradient(circle at 50% 50%, rgba(255,250,220,0.15) 0%, rgba(40,30,0,0.4) 100%)';
          break;
        case '3-vegii':
          overlayBg = 'radial-gradient(circle at 50% 50%, rgba(220,255,220,0.15) 0%, rgba(0,40,0,0.4) 100%)';
          break;
        case '4-jus':
          overlayBg = 'radial-gradient(circle at 50% 50%, rgba(255,220,220,0.15) 0%, rgba(40,10,10,0.4) 100%)';
          break;
        case '5-boucherie':
          overlayBg = 'radial-gradient(circle at 50% 50%, rgba(255,220,220,0.15) 0%, rgba(40,0,0,0.4) 100%)';
          break;
        default:
          overlayBg = 'radial-gradient(circle at 50% 50%, rgba(255,255,255,0.1) 0%, rgba(0,0,30,0.4) 100%)';
      }
      
      this.overlayElement.style.background = overlayBg;
    }
  }
  
  showToast(message, type = 'info') {
    // Check if we can use the existing showToast function
    if (typeof window.showToast === 'function') {
      window.showToast(message, type);
    } else {
      // Create a simple toast if the main one doesn't exist
      const toast = document.createElement('div');
      toast.className = `ambient-toast ${type}`;
      toast.textContent = message;
      document.body.appendChild(toast);
      
      // Style for the toast
      Object.assign(toast.style, {
        position: 'fixed',
        top: '20px',
        right: '20px',
        padding: '10px 20px',
        background: type === 'error' ? '#f44336' : 
                   type === 'success' ? '#4CAF50' : 
                   type === 'warning' ? '#ff9800' : '#2196F3',
        color: 'white',
        borderRadius: '4px',
        zIndex: '10000',
        boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
        opacity: '0',
        transition: 'opacity 0.3s'
      });
      
      // Show and hide with animation
      setTimeout(() => { toast.style.opacity = '1'; }, 10);
      setTimeout(() => { 
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
      }, 3000);
    }
  }
}

// Initialize ambient experience when the page is loaded
window.addEventListener('load', function() {
  window.ambientExperience = new AmbientExperience();
});

// Add HolographicProductDisplay class after the existing classes
class HolographicProductDisplay {
  constructor() {
    this.products = {};
    this.activeHologram = null;
    this.isInitialized = false;
    this.init();
  }

  init() {
    // Load Three.js dynamically
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
    script.onload = () => {
      this.isInitialized = true;
      console.log('Three.js loaded successfully');
    };
    document.head.appendChild(script);

    // Add styles for holographic displays
    const style = document.createElement('style');
    style.textContent = `
      .hologram-container {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: 1000;
        background: rgba(0, 0, 0, 0.7);
        display: none;
        justify-content: center;
        align-items: center;
        flex-direction: column;
      }

      .hologram-canvas {
        width: 80%;
        height: 60%;
        background: transparent;
        border-radius: 10px;
        box-shadow: 0 0 20px rgba(0, 255, 255, 0.5);
      }

      .hologram-controls {
        margin-top: 20px;
        display: flex;
        gap: 10px;
      }

      .hologram-btn {
        padding: 10px 20px;
        background: linear-gradient(135deg, #00a8ff, #0097e6);
        color: white;
        border: none;
        border-radius: 5px;
        cursor: pointer;
        font-weight: bold;
        transition: all 0.3s;
      }

      .hologram-btn:hover {
        transform: scale(1.05);
        box-shadow: 0 0 15px rgba(0, 168, 255, 0.7);
      }

      .hologram-close {
        position: absolute;
        top: 20px;
        right: 20px;
        background: rgba(255, 255, 255, 0.2);
        color: white;
        border: none;
        border-radius: 50%;
        width: 40px;
        height: 40px;
        font-size: 20px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.3s;
      }

      .hologram-close:hover {
        background: rgba(255, 255, 255, 0.4);
        transform: scale(1.1);
      }

      .hologram-info {
        color: white;
        text-align: center;
        margin-top: 20px;
        max-width: 80%;
      }

      .hologram-title {
        font-size: 24px;
        margin-bottom: 10px;
        text-shadow: 0 0 10px rgba(0, 255, 255, 0.7);
      }

      .hologram-price {
        font-size: 18px;
        margin-bottom: 10px;
      }

      .hologram-description {
        font-size: 16px;
        opacity: 0.8;
      }
    `;
    document.head.appendChild(style);

    // Create container for holograms
    this.container = document.createElement('div');
    this.container.className = 'hologram-container';
    document.body.appendChild(this.container);

    // Add close button
    const closeBtn = document.createElement('button');
    closeBtn.className = 'hologram-close';
    closeBtn.innerHTML = '×';
    closeBtn.onclick = () => this.hideHologram();
    this.container.appendChild(closeBtn);

    // Create canvas for 3D rendering
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'hologram-canvas';
    this.container.appendChild(this.canvas);

    // Create controls
    const controls = document.createElement('div');
    controls.className = 'hologram-controls';
    
    const rotateBtn = document.createElement('button');
    rotateBtn.className = 'hologram-btn';
    rotateBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Rotate';
    rotateBtn.onclick = () => this.toggleRotation();
    
    const addToCartBtn = document.createElement('button');
    addToCartBtn.className = 'hologram-btn';
    addToCartBtn.innerHTML = '<i class="fas fa-cart-plus"></i> Add to Cart';
    addToCartBtn.onclick = () => this.addToCart();
    
    controls.appendChild(rotateBtn);
    controls.appendChild(addToCartBtn);
    this.container.appendChild(controls);

    // Create info section
    this.infoSection = document.createElement('div');
    this.infoSection.className = 'hologram-info';
    this.container.appendChild(this.infoSection);

    // Initialize Three.js scene
    this.initThreeJS();
  }

  initThreeJS() {
    if (!this.isInitialized) return;

    // Create scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000000);

    // Create camera
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.camera.position.z = 5;

    // Create renderer
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, alpha: true, antialias: true });
    this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);

    // Add lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(1, 1, 1);
    this.scene.add(directionalLight);

    // Add holographic effect
    const holographicLight = new THREE.PointLight(0x00ffff, 1, 100);
    holographicLight.position.set(0, 0, 5);
    this.scene.add(holographicLight);

    // Animation variables
    this.isRotating = true;
    this.clock = new THREE.Clock();

    // Handle window resize
    window.addEventListener('resize', () => {
      this.camera.aspect = this.canvas.clientWidth / this.canvas.clientHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight);
    });

    // Start animation loop
    this.animate();
  }

  animate() {
    if (!this.isInitialized || !this.activeHologram) return;

    requestAnimationFrame(() => this.animate());

    const delta = this.clock.getDelta();

    if (this.isRotating && this.activeHologram.mesh) {
      this.activeHologram.mesh.rotation.y += delta * 0.5;
    }

    this.renderer.render(this.scene, this.camera);
  }

  toggleRotation() {
    this.isRotating = !this.isRotating;
  }

  showHologram(product) {
    if (!this.isInitialized) {
      console.error('Three.js not loaded yet');
      return;
    }

    // Store current product
    this.currentProduct = product;

    // Update info section
    this.infoSection.innerHTML = `
      <div class="hologram-title">${product.name}</div>
      <div class="hologram-price">${product.price} AMD</div>
      <div class="hologram-description">${product.description || 'Explore this product in 3D'}</div>
    `;

    // Show container
    this.container.style.display = 'flex';

    // Create or get 3D model for this product
    if (!this.products[product.name]) {
      this.createProductModel(product);
    }

    // Set active hologram
    this.activeHologram = this.products[product.name];

    // Add to scene if not already there
    if (!this.scene.getObjectById(this.activeHologram.mesh.id)) {
      this.scene.add(this.activeHologram.mesh);
    }

    // Position camera
    this.camera.position.z = this.activeHologram.cameraDistance || 5;
  }

  hideHologram() {
    this.container.style.display = 'none';
    this.activeHologram = null;
  }

  createProductModel(product) {
    // Create a basic 3D model based on product type
    let geometry;
    let material;

    // Determine product type from name
    const productType = this.getProductType(product.name);

    switch (productType) {
      case 'bottle':
        geometry = new THREE.CylinderGeometry(0.5, 0.5, 2, 32);
        material = new THREE.MeshPhongMaterial({ 
          color: 0x00a8ff,
          transparent: true,
          opacity: 0.8,
          shininess: 100
        });
        break;
      case 'box':
        geometry = new THREE.BoxGeometry(1, 1, 1);
        material = new THREE.MeshPhongMaterial({ 
          color: 0xff9f43,
          transparent: true,
          opacity: 0.8,
          shininess: 100
        });
        break;
      case 'sphere':
        geometry = new THREE.SphereGeometry(0.7, 32, 32);
        material = new THREE.MeshPhongMaterial({ 
          color: 0x4cd137,
          transparent: true,
          opacity: 0.8,
          shininess: 100
        });
        break;
      case 'meat':
        geometry = new THREE.BoxGeometry(1.5, 0.5, 1);
        material = new THREE.MeshPhongMaterial({ 
          color: 0xe84118,
          transparent: true,
          opacity: 0.8,
          shininess: 100
        });
        break;
      default:
        geometry = new THREE.BoxGeometry(1, 1, 1);
        material = new THREE.MeshPhongMaterial({ 
          color: 0x9c88ff,
          transparent: true,
          opacity: 0.8,
          shininess: 100
        });
    }

    // Create mesh
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.y = 0;

    // Add holographic effect
    const edges = new THREE.EdgesGeometry(geometry);
    const line = new THREE.LineSegments(
      edges,
      new THREE.LineBasicMaterial({ color: 0x00ffff })
    );
    mesh.add(line);

    // Store product model
    this.products[product.name] = {
      mesh: mesh,
      cameraDistance: 5
    };
  }

  getProductType(productName) {
    const name = productName.toLowerCase();
    
    if (name.includes('bottle') || name.includes('juice') || name.includes('water')) {
      return 'bottle';
    } else if (name.includes('box') || name.includes('cereal') || name.includes('can')) {
      return 'box';
    } else if (name.includes('egg') || name.includes('fruit') || name.includes('tomato')) {
      return 'sphere';
    } else if (name.includes('meat') || name.includes('beef') || name.includes('chicken')) {
      return 'meat';
    }
    
    return 'default';
  }

  addToCart() {
    if (this.currentProduct) {
      window.addToCart(this.currentProduct);
      this.hideHologram();
    }
  }
}

// Initialize holographic display
let holographicDisplay;

// Add styles for the holographic view button
const hologramButtonStyle = document.createElement('style');
hologramButtonStyle.textContent = `
  .product-actions {
    display: flex;
    gap: 10px;
    margin-top: 10px;
  }
  
  .view-hologram-btn {
    background: linear-gradient(135deg, #00a8ff, #0097e6);
    color: white;
    border: none;
    border-radius: 5px;
    padding: 8px 12px;
    cursor: pointer;
    font-weight: bold;
    transition: all 0.3s;
    display: flex;
    align-items: center;
    gap: 5px;
  }
  
  .view-hologram-btn:hover {
    transform: scale(1.05);
    box-shadow: 0 0 10px rgba(0, 168, 255, 0.7);
  }
`;
document.head.appendChild(hologramButtonStyle);

// Add VirtualTryOn class after the HolographicProductDisplay class
class VirtualTryOn {
  constructor() {
    this.isInitialized = false;
    this.videoElement = null;
    this.canvasElement = null;
    this.isActive = false;
    this.currentProduct = null;
    this.init();
  }

  init() {
    // Add styles for virtual try-on
    const style = document.createElement('style');
    style.textContent = `
      .try-on-container {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: 1000;
        background: rgba(0, 0, 0, 0.8);
        display: none;
        justify-content: center;
        align-items: center;
        flex-direction: column;
      }

      .try-on-content {
        display: flex;
        width: 90%;
        height: 80%;
        background: #fff;
        border-radius: 10px;
        overflow: hidden;
        position: relative;
      }

      .try-on-video-container {
        flex: 1;
        position: relative;
        background: #000;
      }

      .try-on-video {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .try-on-canvas {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
      }

      .try-on-controls {
        flex: 1;
        padding: 20px;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
      }

      .try-on-title {
        font-size: 24px;
        margin-bottom: 10px;
        color: #333;
      }

      .try-on-description {
        font-size: 16px;
        color: #666;
        margin-bottom: 20px;
      }

      .try-on-options {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        margin-bottom: 20px;
      }

      .try-on-option {
        padding: 10px 15px;
        background: #f5f5f5;
        border-radius: 5px;
        cursor: pointer;
        transition: all 0.3s;
      }

      .try-on-option:hover {
        background: #e0e0e0;
      }

      .try-on-option.active {
        background: #4CAF50;
        color: white;
      }

      .try-on-buttons {
        display: flex;
        gap: 10px;
      }

      .try-on-btn {
        padding: 10px 20px;
        border: none;
        border-radius: 5px;
        cursor: pointer;
        font-weight: bold;
        transition: all 0.3s;
      }

      .try-on-btn.primary {
        background: #4CAF50;
        color: white;
      }

      .try-on-btn.secondary {
        background: #f44336;
        color: white;
      }

      .try-on-btn:hover {
        transform: scale(1.05);
      }

      .try-on-close {
        position: absolute;
        top: 10px;
        right: 10px;
        background: rgba(0, 0, 0, 0.5);
        color: white;
        border: none;
        border-radius: 50%;
        width: 30px;
        height: 30px;
        font-size: 18px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10;
      }

      .try-on-close:hover {
        background: rgba(0, 0, 0, 0.7);
      }

      .try-on-status {
        position: absolute;
        bottom: 10px;
        left: 10px;
        background: rgba(0, 0, 0, 0.7);
        color: white;
        padding: 5px 10px;
        border-radius: 5px;
        font-size: 14px;
      }
    `;
    document.head.appendChild(style);

    // Create container
    this.container = document.createElement('div');
    this.container.className = 'try-on-container';
    document.body.appendChild(this.container);

    // Create content
    const content = document.createElement('div');
    content.className = 'try-on-content';
    this.container.appendChild(content);

    // Create video container
    const videoContainer = document.createElement('div');
    videoContainer.className = 'try-on-video-container';
    content.appendChild(videoContainer);

    // Create video element
    this.videoElement = document.createElement('video');
    this.videoElement.className = 'try-on-video';
    this.videoElement.autoplay = true;
    this.videoElement.playsInline = true;
    videoContainer.appendChild(this.videoElement);

    // Create canvas element
    this.canvasElement = document.createElement('canvas');
    this.canvasElement.className = 'try-on-canvas';
    videoContainer.appendChild(this.canvasElement);

    // Create status element
    this.statusElement = document.createElement('div');
    this.statusElement.className = 'try-on-status';
    this.statusElement.textContent = 'Initializing camera...';
    videoContainer.appendChild(this.statusElement);

    // Create controls
    const controls = document.createElement('div');
    controls.className = 'try-on-controls';
    content.appendChild(controls);

    // Create title
    const title = document.createElement('div');
    title.className = 'try-on-title';
    title.textContent = 'Virtual Try-On';
    controls.appendChild(title);

    // Create description
    const description = document.createElement('div');
    description.className = 'try-on-description';
    description.textContent = 'Try on this product virtually using your camera.';
    controls.appendChild(description);

    // Create options
    const options = document.createElement('div');
    options.className = 'try-on-options';
    controls.appendChild(options);

    // Create buttons
    const buttons = document.createElement('div');
    buttons.className = 'try-on-buttons';
    controls.appendChild(buttons);

    // Create add to cart button
    const addToCartBtn = document.createElement('button');
    addToCartBtn.className = 'try-on-btn primary';
    addToCartBtn.innerHTML = '<i class="fas fa-cart-plus"></i> Add to Cart';
    addToCartBtn.onclick = () => this.addToCart();
    buttons.appendChild(addToCartBtn);

    // Create close button
    const closeBtn = document.createElement('button');
    closeBtn.className = 'try-on-btn secondary';
    closeBtn.innerHTML = '<i class="fas fa-times"></i> Close';
    closeBtn.onclick = () => this.hide();
    buttons.appendChild(closeBtn);

    // Create close button for container
    const containerCloseBtn = document.createElement('button');
    containerCloseBtn.className = 'try-on-close';
    containerCloseBtn.innerHTML = '×';
    containerCloseBtn.onclick = () => this.hide();
    this.container.appendChild(containerCloseBtn);

    // Initialize camera
    this.initCamera();
  }

  async initCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } 
      });
      
      this.videoElement.srcObject = stream;
      this.isInitialized = true;
      this.statusElement.textContent = 'Camera ready';
      
      // Start canvas rendering
      this.startCanvasRendering();
    } catch (error) {
      console.error('Error accessing camera:', error);
      this.statusElement.textContent = 'Camera access denied';
    }
  }

  startCanvasRendering() {
    if (!this.isInitialized || !this.isActive) return;
    
    const canvas = this.canvasElement;
    const video = this.videoElement;
    const ctx = canvas.getContext('2d');
    
    // Set canvas size to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Draw video frame
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Apply virtual try-on effects based on product type
    if (this.currentProduct) {
      this.applyTryOnEffect(ctx, canvas.width, canvas.height);
    }
    
    // Continue rendering
    requestAnimationFrame(() => this.startCanvasRendering());
  }

  applyTryOnEffect(ctx, width, height) {
    if (!this.currentProduct) return;
    
    const productType = this.getProductType(this.currentProduct.name);
    
    switch (productType) {
      case 'makeup':
        this.applyMakeupEffect(ctx, width, height);
        break;
      case 'skincare':
        this.applySkincareEffect(ctx, width, height);
        break;
      case 'haircare':
        this.applyHaircareEffect(ctx, width, height);
        break;
      default:
        // Default effect - just add a colored overlay
        ctx.fillStyle = 'rgba(255, 192, 203, 0.3)';
        ctx.fillRect(0, 0, width, height);
    }
  }

  applyMakeupEffect(ctx, width, height) {
    // Simple lipstick effect
    ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
    ctx.beginPath();
    ctx.ellipse(width/2, height/2 + 50, 30, 15, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Simple eyeshadow effect
    ctx.fillStyle = 'rgba(0, 0, 255, 0.3)';
    ctx.beginPath();
    ctx.ellipse(width/2 - 30, height/2 - 20, 20, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(width/2 + 30, height/2 - 20, 20, 10, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  applySkincareEffect(ctx, width, height) {
    // Simple skin smoothing effect
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    
    for (let i = 0; i < data.length; i += 4) {
      // Simple smoothing algorithm
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      
      // Increase brightness slightly
      data[i] = Math.min(255, r + 10);
      data[i + 1] = Math.min(255, g + 10);
      data[i + 2] = Math.min(255, b + 10);
    }
    
    ctx.putImageData(imageData, 0, 0);
  }

  applyHaircareEffect(ctx, width, height) {
    // Simple hair shine effect
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.beginPath();
    ctx.moveTo(0, height * 0.2);
    ctx.quadraticCurveTo(width * 0.5, height * 0.1, width, height * 0.2);
    ctx.lineTo(width, height * 0.3);
    ctx.quadraticCurveTo(width * 0.5, height * 0.4, 0, height * 0.3);
    ctx.closePath();
    ctx.fill();
  }

  getProductType(productName) {
    const name = productName.toLowerCase();
    
    if (name.includes('makeup') || name.includes('lipstick') || name.includes('eyeshadow')) {
      return 'makeup';
    } else if (name.includes('cream') || name.includes('lotion') || name.includes('serum')) {
      return 'skincare';
    } else if (name.includes('shampoo') || name.includes('conditioner') || name.includes('hair')) {
      return 'haircare';
    }
    
    return 'default';
  }

  show(product) {
    if (!this.isInitialized) {
      console.error('Virtual try-on not initialized');
      return;
    }
    
    this.currentProduct = product;
    this.isActive = true;
    this.container.style.display = 'flex';
    
    // Update title and description
    const title = this.container.querySelector('.try-on-title');
    const description = this.container.querySelector('.try-on-description');
    
    title.textContent = product.name;
    description.textContent = `Try on ${product.name} virtually using your camera.`;
    
    // Start canvas rendering
    this.startCanvasRendering();
  }

  hide() {
    this.isActive = false;
    this.container.style.display = 'none';
  }

  addToCart() {
    if (this.currentProduct) {
      window.addToCart(this.currentProduct);
      this.hide();
    }
  }
}

// Initialize virtual try-on
let virtualTryOn;

// Modify the createInfoHotspotElement function to add virtual try-on button for personal care products
function createInfoHotspotElement(hotspot) {
  // ... existing code ...

  // Check if this is a product hotspot by looking for price in AMD
  var priceMatch = hotspot.text.match(/(\d+)\s*amd/i);
  if (priceMatch) {
      var price = parseInt(priceMatch[1]);
      // Check if product is sold by weight
      var isByWeight = hotspot.text.toLowerCase().includes('kg') || 
                      hotspot.text.toLowerCase().includes('gramm');
      
      // Check if this is a personal care product
      const isPersonalCare = this.isPersonalCareProduct(hotspot.title);
      
      if (isByWeight) {
          text.innerHTML = `
              <div class="product-info">
                  <div class="product-description">${hotspot.text.replace(/(\d+)\s*amd/i, '')}</div>
                  <div class="product-price">${price} AMD per kg</div>
                  <div class="weight-input">
                      <input type="number" min="0.1" step="0.1" class="weight-amount" placeholder="Enter weight in kg">
                      <select class="weight-unit">
                          <option value="kg">kg</option>
                          <option value="g">g</option>
                      </select>
                  </div>
                  <div class="product-actions">
                      <button class="add-to-basket-btn" disabled>
                          <i class="fas fa-cart-plus"></i> Add to Cart
                      </button>
                      <button class="view-hologram-btn">
                          <i class="fas fa-cube"></i> View in 3D
                      </button>
                      ${isPersonalCare ? `<button class="try-on-btn">
                          <i class="fas fa-camera"></i> Try On
                      </button>` : ''}
                  </div>
              </div>
          `;

          // Add weight input handler
          const weightInput = text.querySelector('.weight-amount');
          const weightUnit = text.querySelector('.weight-unit');
          const addButton = text.querySelector('.add-to-basket-btn');

          weightInput.addEventListener('input', function() {
              const weight = parseFloat(this.value);
              addButton.disabled = !weight || weight <= 0;
              if (weight && weight > 0) {
                  const unit = weightUnit.value;
                  const finalWeight = unit === 'g' ? weight / 1000 : weight;
                  const totalPrice = Math.round(price * finalWeight);
                  addButton.onclick = () => window.addToCart({
                      name: hotspot.title,
                      price: totalPrice,
                      weight: finalWeight,
                      unit: 'kg',
                      pricePerKg: price
                  });
              }
          });
      } else {
          // Regular product without weight
          text.innerHTML = `
              <div class="product-info">
                  <div class="product-description">${hotspot.text.replace(/(\d+)\s*amd/i, '')}</div>
                  <div class="product-price">${price} AMD</div>
                  <div class="product-actions">
                      <button class="add-to-basket-btn" onclick="window.addToCart({name: '${hotspot.title}', price: ${price}})">
                          <i class="fas fa-cart-plus"></i> Add to Cart
                      </button>
                      <button class="view-hologram-btn">
                          <i class="fas fa-cube"></i> View in 3D
                      </button>
                      ${isPersonalCare ? `<button class="try-on-btn">
                          <i class="fas fa-camera"></i> Try On
                      </button>` : ''}
                  </div>
              </div>
          `;
      }

      // Add holographic view button handler
      const viewHologramBtn = text.querySelector('.view-hologram-btn');
      if (viewHologramBtn) {
          viewHologramBtn.addEventListener('click', function() {
              // Initialize holographic display if not already done
              if (!holographicDisplay) {
                  holographicDisplay = new HolographicProductDisplay();
              }
              
              // Show hologram
              holographicDisplay.showHologram({
                  name: hotspot.title,
                  price: price,
                  description: hotspot.text.replace(/(\d+)\s*amd/i, '')
              });
          });
      }

      // Add virtual try-on button handler
      const tryOnBtn = text.querySelector('.try-on-btn');
      if (tryOnBtn) {
          tryOnBtn.addEventListener('click', function() {
              // Initialize virtual try-on if not already done
              if (!virtualTryOn) {
                  virtualTryOn = new VirtualTryOn();
              }
              
              // Show virtual try-on
              virtualTryOn.show({
                  name: hotspot.title,
                  price: price,
                  description: hotspot.text.replace(/(\d+)\s*amd/i, '')
              });
          });
      }
  } else {
      // This is a regular info hotspot - just show the text
      text.innerHTML = hotspot.text;
  }

  // ... rest of existing code ...
}

// Add function to check if a product is a personal care product
function isPersonalCareProduct(productName) {
  const name = productName.toLowerCase();
  
  return (
    name.includes('cream') || 
    name.includes('lotion') || 
    name.includes('shampoo') || 
    name.includes('conditioner') || 
    name.includes('makeup') || 
    name.includes('lipstick') || 
    name.includes('eyeshadow') || 
    name.includes('serum') || 
    name.includes('mask') || 
    name.includes('perfume')
  );
}

// Add styles for the try-on button
const tryOnButtonStyle = document.createElement('style');
tryOnButtonStyle.textContent = `
  .try-on-btn {
    background: linear-gradient(135deg, #9c88ff, #8c7ae6);
    color: white;
    border: none;
    border-radius: 5px;
    padding: 8px 12px;
    cursor: pointer;
    font-weight: bold;
    transition: all 0.3s;
    display: flex;
    align-items: center;
    gap: 5px;
  }
  
  .try-on-btn:hover {
    transform: scale(1.05);
    box-shadow: 0 0 10px rgba(156, 136, 255, 0.7);
  }
`;
document.head.appendChild(tryOnButtonStyle);

class ThreeJSOptimizer {
  constructor() {
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.clock = new THREE.Clock();
    this.optimizedHotspots = new Map();
    this.isInitialized = false;
  }

  init() {
    if (this.isInitialized) return;
    
    // Initialize Three.js scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000000);
    
    // Setup camera
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.camera.position.z = 5;
    
    // Setup renderer with optimizations
    this.renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      powerPreference: "high-performance",
      stencil: false,
      depth: true
    });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    
    // Add renderer to document
    const container = document.createElement('div');
    container.id = 'threejs-container';
    container.style.position = 'absolute';
    container.style.top = '0';
    container.style.left = '0';
    container.style.width = '100%';
    container.style.height = '100%';
    container.style.pointerEvents = 'none';
    container.style.zIndex = '1';
    container.appendChild(this.renderer.domElement);
    document.body.appendChild(container);
    
    // Add lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 5, 5);
    directionalLight.castShadow = true;
    this.scene.add(directionalLight);
    
    // Start animation loop
    this.animate();
    
    // Handle window resize
    window.addEventListener('resize', () => this.onWindowResize(), false);
    
    this.isInitialized = true;
  }

  optimizeHotspots(hotspots) {
    hotspots.forEach(hotspot => {
      if (hotspot.type === 'info') {
        this.createOptimizedHotspot(hotspot);
      }
    });
  }

  createOptimizedHotspot(hotspot) {
    // Create a 3D plane for the hotspot
    const geometry = new THREE.PlaneGeometry(1, 1);
    const material = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(hotspot.position.x, hotspot.position.y, hotspot.position.z);
    mesh.userData.hotspot = hotspot;
    
    this.scene.add(mesh);
    this.optimizedHotspots.set(hotspot.id, mesh);
  }

  updateHotspotPositions(viewer) {
    this.optimizedHotspots.forEach((mesh, hotspotId) => {
      const hotspot = mesh.userData.hotspot;
      const position = viewer.view.coordinatesToVector3(hotspot.position);
      mesh.position.copy(position);
      mesh.lookAt(this.camera.position);
    });
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    
    if (this.scene && this.camera && this.renderer) {
      this.renderer.render(this.scene, this.camera);
    }
  }

  onWindowResize() {
    if (this.camera && this.renderer) {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
  }

  createProductPreview(product) {
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshPhongMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.8
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(0, 0, -2);
    this.scene.add(mesh);
    
    return mesh;
  }

  createHolographicEffect(mesh) {
    const glowMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        color: { value: new THREE.Color(0x00ffff) }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform vec3 color;
        varying vec2 vUv;
        void main() {
          float glow = sin(time * 2.0) * 0.5 + 0.5;
          gl_FragColor = vec4(color, glow * 0.5);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending
    });
    
    const glowMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(1.2, 1.2),
      glowMaterial
    );
    glowMesh.position.copy(mesh.position);
    glowMesh.position.z -= 0.1;
    this.scene.add(glowMesh);
    
    return glowMesh;
  }

  updateHolographicEffect(glowMesh) {
    if (glowMesh.material.uniforms) {
      glowMesh.material.uniforms.time.value = this.clock.getElapsedTime();
    }
  }
}

// Initialize Three.js optimizer
const threeJSOptimizer = new ThreeJSOptimizer();
threeJSOptimizer.init();

class VoiceCommands {
    constructor() {
        this.recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
        this.recognition.continuous = false;
        this.recognition.interimResults = false;
        this.recognition.lang = 'en-US';
        
        this.recognition.onstart = () => {
            console.log('Voice recognition started');
            document.querySelector('.voice-command-btn').classList.add('listening');
        };
        
        this.recognition.onend = () => {
            console.log('Voice recognition ended');
            document.querySelector('.voice-command-btn').classList.remove('listening');
        };
        
        this.recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            const confidence = event.results[0][0].confidence;
            console.log('Recognized:', transcript, 'Confidence:', confidence);
            this.processCommand(transcript, confidence);
        };
    }

    processCommand(transcript) {
        const command = transcript.toLowerCase().trim();
        console.log('Processing command:', command);
        
        // Map of voice commands to scene IDs
        const sceneMap = {
            'entrance': '0-entrancee',
            'dairy': '1-laiterie',
            'cheese': '2-fromage',
            'vegetables': '3-vegii',
            'juice': '4-jus',
            'butcher': '5-boucherie'
        };
        
        // Check for navigation commands
        if (command.includes('go to')) {
            const location = command.replace('go to', '').trim();
            console.log('Trying to navigate to:', location);
            
            const sceneId = sceneMap[location];
            if (sceneId) {
                const targetScene = scenes.find(s => s.data.id === sceneId);
                if (targetScene) {
                    console.log('Found scene:', targetScene);
                    switchScene(targetScene);
                    this.showFeedback(`Navigating to ${location}`);
                } else {
                    this.showFeedback(`Could not find ${location} scene`);
                }
            } else {
                this.showFeedback(`Unknown location: ${location}`);
            }
        }
    }

    showFeedback(message) {
        const popup = document.querySelector('.voice-feedback-popup');
        popup.textContent = message;
        popup.classList.add('showing');
        
        setTimeout(() => {
            popup.classList.remove('showing');
        }, 2000);
    }

    startListening() {
        try {
            this.recognition.start();
        } catch (error) {
            console.error('Error starting voice recognition:', error);
        }
    }
}

// Initialize voice commands
const voiceCommands = new VoiceCommands();

// Add click handler for voice command button
document.querySelector('.voice-command-btn').addEventListener('click', () => {
    voiceCommands.startListening();
});

// ... existing code ...
function handleVoiceCommand(transcript) {
  // Convert to lowercase and remove periods
  transcript = transcript.toLowerCase().replace(/\./g, '').trim();
  
  // Simple mapping of voice commands to scene IDs
  const sceneMap = {
    'entrance': '0-entrancee',
    'dairy': '1-laiterie',
    'cheese': '2-fromage',
    'vegetables': '3-vegii',
    'vegetable': '3-vegii',
    'juice': '4-jus',
    'butcher': '5-boucherie'
  };

  // Check if command includes "go to"
  if (transcript.includes('go to')) {
    const location = transcript.replace('go to', '').trim();
    if (sceneMap[location]) {
      switchScene(findSceneById(sceneMap[location]));
      return true;
    }
  }
  
  // Check direct location mentions
  if (sceneMap[transcript]) {
    switchScene(findSceneById(sceneMap[transcript]));
    return true;
  }
  
  return false;
}

// Add voice recognition setup
if ('webkitSpeechRecognition' in window) {
  const recognition = new webkitSpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = false;

  recognition.onresult = function(event) {
    const transcript = event.results[0][0].transcript;
    console.log('Recognized:', transcript);
    handleVoiceCommand(transcript);
  };

  // Add click handler to voice button
  document.querySelector('.voice-command-btn').addEventListener('click', function() {
    recognition.start();
  });
}
// ... existing code ...

// Create feedback element
const feedbackEl = document.createElement('div');
feedbackEl.className = 'voice-feedback';
document.body.appendChild(feedbackEl);

function showFeedback(text, duration = 2000) {
    feedbackEl.textContent = text;
    feedbackEl.classList.add('show');
    setTimeout(() => feedbackEl.classList.remove('show'), duration);
}

function processVoiceCommand(transcript) {
    console.log('Processing command:', transcript);
    const command = transcript.toLowerCase().trim();
    
    // Show what was recognized
    showFeedback(`Recognized: ${transcript}`);
    
    // Handle navigation commands
    if (command.includes('go to')) {
        const location = command.replace('go to', '').trim();
        
        const sceneMap = {
            'entrance': '0-entrancee',
            'dairy': '1-laiterie',
            'cheese': '2-fromage',
            'vegetables': '3-vegii',
            'juice': '4-jus',
            'butcher': '5-boucherie'
        };
        
        if (sceneMap[location]) {
            const targetScene = scenes.find(s => s.data.id === sceneMap[location]);
            if (targetScene) {
                showFeedback(`Navigating to ${location}...`);
                viewer.switchScene(targetScene);
                return true;
            }
        }
        
        showFeedback(`Could not find ${location} scene`);
        return false;
    }
    
    return false;
}

// Set up voice recognition
if ('webkitSpeechRecognition' in window) {
    const recognition = new webkitSpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    
    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        processVoiceCommand(transcript);
    };
    
    recognition.onend = () => {
        console.log('Voice recognition ended');
        recognition.start(); // Restart listening
    };
    
    recognition.onerror = (event) => {
        console.error('Voice recognition error:', event.error);
        showFeedback('Voice recognition error. Please try again.');
    };
    
    // Start listening
    recognition.start();
    console.log('Voice recognition started');
}

// Add notification functionality
function requestNotificationPermission() {
    if (!("Notification" in window)) {
        console.log("This browser does not support desktop notifications");
        return;
    }

    Notification.requestPermission().then(function(permission) {
        if (permission === "granted") {
            console.log("Notification permission granted");
        }
    });
}

function showOrderNotification(order) {
    if (Notification.permission === "granted") {
        const notification = new Notification("New Order Received!", {
            body: `Order #${order.orderNumber}\nCustomer: ${order.customerName}\nTotal: ${order.total} AMD`,
            icon: "/img/logo.png", // Make sure to add your logo image
            badge: "/img/logo.png",
            vibrate: [200, 100, 200]
        });

        notification.onclick = function() {
            window.focus();
            this.close();
        };

        // Play notification sound
        playNotificationSound();
    }
}

function playNotificationSound() {
    const audio = new Audio('/sounds/notification.mp3');
    audio.play().catch(error => console.log('Error playing sound:', error));
}

// Request notification permission when the page loads
document.addEventListener('DOMContentLoaded', requestNotificationPermission);

// Example function to submit the order
async function submitOrder() {
// ... existing code ...
}
