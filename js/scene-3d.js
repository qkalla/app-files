import * as THREE from 'C:/Users/User/Desktop/work/app-files/three.js-dev/build/three.module.min.js';

// Safe 3D test for entrance scene
function createSafeTest3D(scene) {
    // Create a container that won't interfere with panorama
    const container = document.createElement('div');
    container.id = 'safe-3d-test';
    container.style.cssText = `
        position: absolute;
        width: 200px;
        height: 200px;
        pointer-events: none;
        z-index: 10;
    `;
    document.getElementById('pano').appendChild(container);

    // Setup renderer with transparent background
    const renderer = new THREE.WebGLRenderer({ 
        alpha: true,
        antialias: true
    });
    renderer.setSize(200, 200);
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    // Create scene and camera
    const scene3D = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
    camera.position.z = 5;

    // Create a simple floating cube
    const geometry = new THREE.BoxGeometry(2, 2, 2);
    const material = new THREE.MeshBasicMaterial({
        color: 0x4CAF50,
        transparent: true,
        opacity: 0.8,
        wireframe: true
    });
    const cube = new THREE.Mesh(geometry, material);
    scene3D.add(cube);

    // Position the container in a safe spot
    function updatePosition() {
        const coords = scene.coordinatesToScreen({ 
            yaw: -0.15,  // Near BUY SAFE sign
            pitch: -0.1  // Slightly above floor
        });
        
        if (coords) {
            container.style.left = (coords.x - 100) + 'px';
            container.style.top = (coords.y - 100) + 'px';
        }
    }

    // Animate the cube
    function animate() {
        requestAnimationFrame(animate);
        
        // Gentle rotation
        cube.rotation.x += 0.01;
        cube.rotation.y += 0.01;
        
        // Make it float up and down
        cube.position.y = Math.sin(Date.now() * 0.001) * 0.5;
        
        renderer.render(scene3D, camera);
        updatePosition();
    }

    // Start animation
    animate();

    // Update position when scene changes
    scene.addEventListener('viewChange', updatePosition);

    return {
        remove: function() {
            container.remove();
            scene.removeEventListener('viewChange', updatePosition);
        }
    };
} 