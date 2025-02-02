/*
 * Copyright 2016 Google Inc. All rights reserved.
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
    startAutorotate();
    updateSceneName(scene);
    updateSceneList(scene);
  }

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
                    <button class="add-to-basket-btn" disabled>
                        <i class="fas fa-cart-plus"></i> Add to Cart
                    </button>
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
                    <button class="add-to-basket-btn" onclick="window.addToCart({name: '${hotspot.title}', price: ${price}})">
                        <i class="fas fa-cart-plus"></i> Add to Cart
                    </button>
                </div>
            `;
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
    wrapper.querySelector('.info-hotspot-header').addEventListener('click', toggle);

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
  }

  function updateCartDisplay() {
    var cartItems = document.getElementById('cartItems');
    var cartTotal = document.getElementById('cartTotal');
    
    cartItems.innerHTML = cart.map(item => `
      <div class="cart-item">
        ${item.name} - ${item.price} AMD x ${item.quantity}
        <button onclick="removeFromCart('${item.name}')">Remove</button>
      </div>
    `).join('');
    
    var total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    cartTotal.textContent = `Total: ${total} AMD`;

    // Add checkout button if cart is not empty
    if (cart.length > 0) {
        cartTotal.innerHTML += `
            <button id="cartCheckout" onclick="showCheckout()">
                Proceed to Checkout
            </button>
        `;
    }
  }

  function removeFromCart(productName) {
    cart = cart.filter(item => item.name !== productName);
    updateCartDisplay();
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
    updateCartDisplay();
    showCartNotification();
}

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

    // Add checkout button if cart is not empty
    if (window.cart.length > 0) {
        cartTotal.innerHTML += `
            <button id="cartCheckout" onclick="showCheckout()">
                Proceed to Checkout
            </button>
        `;
    }
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

// Add event listeners when the document loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('Document loaded');
    
    const orderForm = document.getElementById('orderForm');
    if (orderForm) {
        console.log('Form found');
        // Remove any existing listeners
        const newOrderForm = orderForm.cloneNode(true);
        orderForm.parentNode.replaceChild(newOrderForm, orderForm);
        
        // Add new event listener
        newOrderForm.addEventListener('submit', function(event) {
            event.preventDefault();
            console.log('Form submitted');
            
            // Collect form data
            const orderData = {
                orderNumber: window.generateOrderNumber(),
                customerName: document.getElementById('name').value,
                phone: document.getElementById('phone').value,
                email: document.getElementById('email').value,
                address: document.getElementById('selectedAddress').value,
                paymentMethod: document.querySelector('input[name="paymentMethod"]:checked')?.value,
                items: window.cart,
                total: window.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0)
            };

            console.log('Order data:', orderData);

            // Submit to server
            fetch('http://localhost:3000/api/orders', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(orderData)
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
});

let currentMap = null;
let selectedLocation = null;
let searchControl = null;

function showMapModal() {
    document.getElementById('mapModal').classList.add('active');
    
    setTimeout(() => {
        if (!currentMap) {
            ymaps.ready(() => {
                try {
                    initMap();
                } catch (error) {
                    console.error('Map initialization error:', error);
                    handleMapError();
                }
            });
        } else {
            currentMap.container.fitToViewport();
        }
    }, 100);
}

function initMap() {
    try {
        currentMap = new ymaps.Map('map', {
            center: [40.1772, 44.5262], // Yerevan coordinates
            zoom: 12
        });

        // Enable clicking on map
        currentMap.events.add('click', function (e) {
            const coords = e.get('coords');
            
            // Reverse geocode the clicked location
            ymaps.geocode(coords).then(function (res) {
                const firstGeoObject = res.geoObjects.get(0);
                const address = firstGeoObject.getAddressLine();
                
                handleLocationSelect(address, coords);
            });
        });

        // Add search functionality to both the modal search and the main input
        setupSearchInput(document.getElementById('addressSearch')); // Modal search
        setupSearchInput(document.getElementById('selectedAddress')); // Main input
    } catch (error) {
        console.error('Error in initMap:', error);
        handleMapError();
    }
}

function setupSearchInput(inputElement) {
    // Create suggest view for the input
    const suggestView = new ymaps.SuggestView(inputElement, {
        results: 5,
        boundedBy: [[40.0772, 44.4262], [40.2772, 44.6262]] // Restrict to Yerevan area
    });

    // Handle suggestion selection
    suggestView.events.add('select', function(e) {
        const value = e.get('item').value;
        
        // Geocode the selected address
        ymaps.geocode(value).then(function(res) {
            const firstGeoObject = res.geoObjects.get(0);
            const coords = firstGeoObject.geometry.getCoordinates();
            const address = firstGeoObject.getAddressLine();
            
            handleLocationSelect(address, coords);
        });
    });
}

function handleLocationSelect(address, coords) {
    selectedLocation = {
        address: address,
        coordinates: coords
    };

    // Update both search inputs
    document.getElementById('addressSearch').value = address;
    document.getElementById('selectedAddress').value = address;

    // Clear existing placemark
    currentMap.geoObjects.removeAll();

    // Add new placemark
    const placemark = new ymaps.Placemark(coords, {
        balloonContent: address
    }, {
        preset: 'islands#redDotIcon'
    });
    
    currentMap.geoObjects.add(placemark);
    currentMap.setCenter(coords);
    currentMap.setZoom(16);
}

function hideMapModal() {
    document.getElementById('mapModal').classList.remove('active');
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
    console.log('Adding event listeners');
    
    // Close map modal
    document.querySelector('.close-map').addEventListener('click', hideMapModal);

    // Confirm location button
    document.querySelector('.confirm-location-btn').addEventListener('click', function() {
        if (selectedLocation) {
            document.getElementById('selectedAddress').value = selectedLocation.address;
            document.getElementById('selectedCoordinates').value = 
                JSON.stringify({
                    lat: selectedLocation.coordinates[0],
                    lng: selectedLocation.coordinates[1]
                });
            hideMapModal();
        } else {
            alert('Please select a location first');
        }
    });

    // Make the main address input clickable to open map
    const selectedAddressInput = document.getElementById('selectedAddress');
    selectedAddressInput.addEventListener('click', showMapModal);
});

// Make functions available globally
window.showMapModal = showMapModal;
window.hideMapModal = hideMapModal;
window.retryMapLoad = retryMapLoad;

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

                <div class="bottom-nav">
                    <button class="nav-item active">
                        <i class="fas fa-store"></i>
                        <span>Store</span>
                    </button>
                    <button class="nav-item">
                        <i class="fas fa-th-large"></i>
                        <span>Categories</span>
                    </button>
                    <button class="nav-item">
                        <i class="fas fa-shopping-bag"></i>
                        <span>Cart</span>
                    </button>
                    <button class="nav-item">
                        <i class="fas fa-user"></i>
                        <span>Profile</span>
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
            <h3>${hotspot.title}</h3>
            <p class="price-per-unit">${hotspot.price} AMD per kg</p>
            <div class="weight-selector">
                <input type="number" 
                    class="weight-input" 
                    min="0.1" 
                    step="0.1" 
                    placeholder="Enter weight">
                <select class="unit-select">
                    <option value="g">g</option>
                    <option value="kg">kg</option>
                </select>
            </div>
            <div class="calculated-price">Total: <span>0</span> AMD</div>
            <button class="add-to-cart-btn" disabled>Add to Cart</button>
        </div>
    `;

    const element = document.createElement('div');
    element.className = 'product-hotspot';
    element.innerHTML = productInfo;

    // Add event listeners for weight calculation
    const weightInput = element.querySelector('.weight-input');
    const unitSelect = element.querySelector('.unit-select');
    const priceDisplay = element.querySelector('.calculated-price span');
    const addButton = element.querySelector('.add-to-cart-btn');

    function updatePrice() {
        const weight = parseFloat(weightInput.value);
        const unit = unitSelect.value;
        
        if (weight > 0) {
            const totalPrice = pricing.calculatePrice(hotspot.price, weight, unit);
            priceDisplay.textContent = totalPrice;
            addButton.disabled = false;

            // Store calculated values for cart
            element.dataset.price = totalPrice;
            element.dataset.weight = weight;
            element.dataset.unit = unit;
        } else {
            priceDisplay.textContent = '0';
            addButton.disabled = true;
        }
    }

    weightInput.addEventListener('input', updatePrice);
    unitSelect.addEventListener('change', updatePrice);

    addButton.addEventListener('click', () => {
        const cartItem = {
            id: hotspot.id,
            name: hotspot.title,
            price: parseInt(element.dataset.price),
            weight: parseFloat(element.dataset.weight),
            unit: element.dataset.unit,
            pricePerKg: hotspot.price
        };
        
        addToCart(cartItem);
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
function submitOrder() {
    // Your order submission logic here

    // After successful submission, open the modal
    openModal();
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
