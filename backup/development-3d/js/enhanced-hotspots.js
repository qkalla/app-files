// Enhanced Hotspots System - Works alongside existing hotspots
class EnhancedHotspots {
    constructor() {
        this.displays = new Map();
    }

    // Add a floating price display above existing hotspot
    addPriceDisplay(scene, hotspot) {
        const element = document.createElement('div');
        element.className = 'floating-price';
        element.innerHTML = `
            <div class="price-tag">
                <span class="amount">${hotspot.price}</span>
                <span class="currency">AMD</span>
            </div>
        `;
        
        // Position slightly above the original hotspot
        const position = {
            yaw: hotspot.yaw,
            pitch: hotspot.pitch - 0.1
        };

        // Add to scene but don't interfere with original hotspot
        scene.hotspotContainer().createHotspot(element, position);
        this.displays.set(hotspot.id, element);
    }

    // Add a floating section name for navigation
    addSectionDisplay(scene, linkData) {
        const element = document.createElement('div');
        element.className = 'section-indicator';
        element.innerHTML = `
            <div class="section-name">
                <span class="icon">🏪</span>
                <span class="name">${linkData.name}</span>
                <span class="arrow">➜</span>
            </div>
        `;

        // Position near the navigation hotspot
        const position = {
            yaw: linkData.yaw,
            pitch: linkData.pitch + 0.15
        };

        scene.hotspotContainer().createHotspot(element, position);
        this.displays.set(linkData.id, element);
    }

    // Update display positions
    updateDisplays() {
        this.displays.forEach(display => {
            // Smooth animation for floating effect
            const currentY = parseFloat(display.style.transform.split('translateY(')[1]);
            const newY = currentY + Math.sin(Date.now() / 1000) * 0.5;
            display.style.transform = `translateY(${newY}px)`;
        });
    }
}

// Export the class
window.EnhancedHotspots = EnhancedHotspots; 