// Simple 3D Test - Can be safely removed if needed
class ThreeDTest {
    constructor() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ alpha: true });
        this.cube = null;
        
        // Setup renderer
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setClearColor(0x000000, 0); // Transparent background
        document.body.appendChild(this.renderer.domElement);
        
        // Position camera
        this.camera.position.z = 5;
    }

    createTestCube() {
        // Create a simple cube
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const material = new THREE.MeshBasicMaterial({ 
            color: 0x00ff00,
            transparent: true,
            opacity: 0.8
        });
        this.cube = new THREE.Mesh(geometry, material);
        this.scene.add(this.cube);
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        
        // Simple rotation animation
        if (this.cube) {
            this.cube.rotation.x += 0.01;
            this.cube.rotation.y += 0.01;
        }
        
        this.renderer.render(this.scene, this.camera);
    }

    // Clean up if needed
    remove() {
        if (this.cube) {
            this.scene.remove(this.cube);
        }
        if (this.renderer.domElement) {
            document.body.removeChild(this.renderer.domElement);
        }
    }
}

// Export for testing
window.ThreeDTest = ThreeDTest; 