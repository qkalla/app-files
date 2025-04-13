const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.domElement.style.position = 'absolute';
renderer.domElement.style.top = '0';
renderer.domElement.style.left = '0';
renderer.domElement.style.zIndex = '1';
renderer.domElement.style.pointerEvents = 'none';
document.body.appendChild(renderer.domElement);

const loader = new THREE.GLTFLoader();
loader.load('assets/models/welcome.glb', (gltf) => {
    const model = gltf.scene;
    model.position.set(2, 0, -3); // Position near baskets and glass window
    model.scale.set(0.7, 0.7, 0.7);
    scene.add(model);
}, undefined, (error) => {
    console.error('Error loading welcome model:', error);
});

camera.position.z = 5;

function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}); 