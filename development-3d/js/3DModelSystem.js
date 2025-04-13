class ModelSystem {
    constructor() {
        this.scene = new THREE.Scene();
        this.models = new Map();
        this.animations = new Map();
        this.mixer = null;
        this.clock = new THREE.Clock();
        
        // Initialize loader
        this.loader = new THREE.GLTFLoader();
    }

    async loadModel(modelId, modelUrl, position = { x: 0, y: 0, z: 0 }, scale = 1.0) {
        try {
            const gltf = await this.loader.loadAsync(modelUrl);
            const model = gltf.scene;
            
            // Set position
            model.position.set(position.x, position.y, position.z);
            model.scale.set(scale, scale, scale);
            
            // Store animations if they exist
            if (gltf.animations && gltf.animations.length) {
                this.mixer = new THREE.AnimationMixer(model);
                this.animations.set(modelId, gltf.animations);
                
                // Play all animations by default
                gltf.animations.forEach(clip => {
                    const action = this.mixer.clipAction(clip);
                    action.play();
                });
            }
            
            // Store the model
            this.models.set(modelId, model);
            this.scene.add(model);
            
            return model;
        } catch (error) {
            console.error('Error loading model:', error);
            return null;
        }
    }

    update() {
        // Update animations
        if (this.mixer) {
            this.mixer.update(this.clock.getDelta());
        }
    }

    removeModel(modelId) {
        const model = this.models.get(modelId);
        if (model) {
            this.scene.remove(model);
            this.models.delete(modelId);
            this.animations.delete(modelId);
        }
    }

    setModelPosition(modelId, position) {
        const model = this.models.get(modelId);
        if (model) {
            model.position.set(position.x, position.y, position.z);
        }
    }

    rotateModel(modelId, rotation) {
        const model = this.models.get(modelId);
        if (model) {
            model.rotation.set(rotation.x, rotation.y, rotation.z);
        }
    }
}

// Export the class
window.ModelSystem = ModelSystem; 