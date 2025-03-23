import { drawTexturedQuad } from "./shapes.js";

class Cheese {
    constructor(x, y, gl) {
        this.x = x;
        this.y = y;
        this.z = 0.25; // Height above floor
        this.rotationSpeed = 90; // Degrees per second
        this.rotation = 0;
        this.isCollected = false;
        
        // Animate the cheese floating up and down
        this.floatAmplitude = 0.05;
        this.floatSpeed = 2;
        this.initialZ = this.z;
    }
    
    update(deltaTime) {
        // Skip update if collected
        if (this.isCollected) return;
        
        // Rotate the cheese
        this.rotation += this.rotationSpeed * deltaTime;
        if (this.rotation >= 360) this.rotation -= 360;
        
        // Float the cheese up and down
        const timeValue = performance.now() / 1000 * this.floatSpeed;
        this.z = this.initialZ + Math.sin(timeValue) * this.floatAmplitude;
    }
    
    draw(gl, shaderProgram, textureId) {
        // Skip drawing if collected
        if (this.isCollected) return;
        
        const modelMatrix = mat4.create();
        mat4.translate(modelMatrix, modelMatrix, [this.x + 0.5, this.y + 0.5, this.z]);
        mat4.rotateZ(modelMatrix, modelMatrix, this.rotation * Math.PI / 180);
        mat4.scale(modelMatrix, modelMatrix, [0.2, 0.2, 0.2]); // Scale down the cheese
        
        gl.uniformMatrix4fv(gl.getUniformLocation(shaderProgram, "uModelMatrix"), false, modelMatrix);
        
        const size = 0.5;
        // Set texture repeat for the cheese - 1:1 mapping looks best
        const texRepeat = 1.0;
        // Gold color as fallback if texture fails
        const goldColor = [1.0, 0.8, 0.1, 1.0];
        
        // Enable the texture and set parameters
        if (textureId) {
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, textureId);
            gl.uniform1i(gl.getUniformLocation(shaderProgram, "uSampler"), 0);
        }
        
        // Draw each face with texture applied consistently
        // Front face
        drawTexturedQuad(
            gl, shaderProgram,
            -size, -size, -size,
            size, -size, -size,
            size, size, -size,
            -size, size, -size,
            0, 0, -1,
            goldColor, textureId, texRepeat, texRepeat
        );
        
        // Back face
        drawTexturedQuad(
            gl, shaderProgram,
            -size, -size, size,
            -size, size, size,
            size, size, size,
            size, -size, size,
            0, 0, 1,
            goldColor, textureId, texRepeat, texRepeat
        );
        
        // Bottom face
        drawTexturedQuad(
            gl, shaderProgram,
            -size, -size, -size,
            -size, -size, size,
            size, -size, size,
            size, -size, -size,
            0, -1, 0,
            goldColor, textureId, texRepeat, texRepeat
        );
        
        // Top face
        drawTexturedQuad(
            gl, shaderProgram,
            -size, size, -size,
            size, size, -size,
            size, size, size,
            -size, size, size,
            0, 1, 0,
            goldColor, textureId, texRepeat, texRepeat
        );
        
        // Left face
        drawTexturedQuad(
            gl, shaderProgram,
            -size, -size, -size,
            -size, size, -size,
            -size, size, size,
            -size, -size, size,
            -1, 0, 0,
            goldColor, textureId, texRepeat, texRepeat
        );
        
        // Right face
        drawTexturedQuad(
            gl, shaderProgram,
            size, -size, -size,
            size, -size, size,
            size, size, size,
            size, size, -size,
            1, 0, 0,
            goldColor, textureId, texRepeat, texRepeat
        );
    }
    
    checkCollision(rat) {
        if (this.isCollected) return false;
        
        // Check if rat is close enough to collect the cheese
        const dx = (this.x + 0.5) - rat.x;
        const dy = (this.y + 0.5) - rat.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < 0.4) {  // Adjust collision radius as needed
            this.isCollected = true;
            return true;
        }
        
        return false;
    }
}

class ExitPortal {
    constructor(x, y, gl) {
        this.x = x;
        this.y = y;
        this.z = 0;
        this.rotation = 0;
        this.rotationSpeed = 45; // Degrees per second
        this.isActive = false;
        
        // Portal animation
        this.pulseAmplitude = 0.3;
        this.pulseSpeed = 1.5;
        this.scale = 1.0;
    }
    
    update(deltaTime) {
        // Rotate portal
        this.rotation += this.rotationSpeed * deltaTime;
        if (this.rotation >= 360) this.rotation -= 360;
        
        // Pulse the portal
        const timeValue = performance.now() / 1000 * this.pulseSpeed;
        const pulseValue = Math.sin(timeValue) * this.pulseAmplitude;
        this.scale = 1.0 + (this.isActive ? pulseValue : pulseValue * 0.3);
    }
    
    activate() {
        this.isActive = true;
    }
    
    draw(gl, shaderProgram) {
        const modelMatrix = mat4.create();
        mat4.translate(modelMatrix, modelMatrix, [this.x + 0.5, this.y + 0.5, this.z + 0.2]);
        mat4.rotateZ(modelMatrix, modelMatrix, this.rotation * Math.PI / 180);
        mat4.scale(modelMatrix, modelMatrix, [this.scale * 0.6, this.scale * 0.6, 0.05]);
        
        gl.uniformMatrix4fv(gl.getUniformLocation(shaderProgram, "uModelMatrix"), false, modelMatrix);
        
        // Portal colors - brighter when active
        const portalColor = this.isActive ? 
            [0.2, 1.0, 0.7, 0.9] : // Bright cyan when active
            [0.2, 0.3, 0.9, 0.5];  // Dim blue when inactive
        
        // Draw a simple quad for the portal
        drawTexturedQuad(
            gl, shaderProgram,
            -1, -1, 0,
            1, -1, 0,
            1, 1, 0,
            -1, 1, 0,
            0, 0, 1, // Normal points up
            portalColor
        );
        
        // Draw additional smaller quads for a more interesting effect
        const innerSize = 0.7;
        const innerColor = this.isActive ? 
            [0.0, 0.9, 1.0, 0.95] : // Brighter cyan for inner part when active
            [0.3, 0.4, 0.8, 0.6];   // Blue for inner part when inactive
            
        // Inner quad
        drawTexturedQuad(
            gl, shaderProgram,
            -innerSize, -innerSize, 0.05,
            innerSize, -innerSize, 0.05,
            innerSize, innerSize, 0.05,
            -innerSize, innerSize, 0.05,
            0, 0, 1, // Normal points up
            innerColor
        );
        
        // Rotate and draw a "cross" shape for more visual interest
        const crossMatrix = mat4.create();
        mat4.copy(crossMatrix, modelMatrix);
        mat4.rotateZ(crossMatrix, crossMatrix, Math.PI / 4); // 45 degrees
        gl.uniformMatrix4fv(gl.getUniformLocation(shaderProgram, "uModelMatrix"), false, crossMatrix);
        
        // Horizontal bar of cross
        drawTexturedQuad(
            gl, shaderProgram,
            -0.2, -0.8, 0.1,
            0.2, -0.8, 0.1,
            0.2, 0.8, 0.1,
            -0.2, 0.8, 0.1,
            0, 0, 1,
            innerColor
        );
        
        // Restore original model matrix
        gl.uniformMatrix4fv(gl.getUniformLocation(shaderProgram, "uModelMatrix"), false, modelMatrix);
    }
    
    checkCollision(rat, allCheeseCollected) {
        if (!this.isActive || !allCheeseCollected) return false;
        
        // Check if rat is close enough to exit
        const dx = (this.x + 0.5) - rat.x;
        const dy = (this.y + 0.5) - rat.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        return distance < 0.5;  // Adjust exit radius as needed
    }
}

// Create a particle effect
class ParticleSystem {
    constructor(x, y, z, count = 30, continuous = false) {
        this.origin = { x, y, z };
        this.particles = [];
        this.maxParticles = count;
        this.active = false;
        this.continuous = continuous; // Whether to continuously generate particles
        
        // Create initial particles
        for (let i = 0; i < this.maxParticles; i++) {
            this.addParticle();
        }
    }
    
    addParticle() {
        const particle = {
            // Position near origin
            x: this.origin.x + (Math.random() * 0.2 - 0.1),
            y: this.origin.y + (Math.random() * 0.2 - 0.1),
            z: this.origin.z + (Math.random() * 0.2),
            
            // Random velocity - mostly upward
            vx: Math.random() * 0.02 - 0.01,
            vy: Math.random() * 0.02 - 0.01,
            vz: Math.random() * 0.04 + 0.02,
            
            // Size
            size: Math.random() * 0.08 + 0.02,
            
            // Lifetime
            lifetime: Math.random() * 60 + 30,
            age: 0,
            
            // Color (portal-like blue/cyan)
            color: Math.random() > 0.5 ? 
                [0.2, 0.6, 1.0, 0.8] : // Blue
                [0.0, 0.8, 0.7, 0.8]   // Cyan
        };
        
        this.particles.push(particle);
    }
    
    update() {
        if (!this.active) return;
        
        let hasLiveParticles = false;
        
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            
            // Update age
            p.age++;
            
            // Remove old particles
            if (p.age > p.lifetime) {
                this.particles.splice(i, 1);
                
                // Only add new particles if the system is still active
                if (this.active) {
                    this.addParticle();
                }
                continue;
            }
            
            hasLiveParticles = true;
            
            // Update position
            p.x += p.vx;
            p.y += p.vy;
            p.z += p.vz;
            
            // Add some swirl
            const swirl = 0.001;
            p.vx += Math.sin(p.age * 0.1) * swirl;
            p.vy += Math.cos(p.age * 0.1) * swirl;
            
            // Slow down slightly
            p.vx *= 0.99;
            p.vy *= 0.99;
            p.vz *= 0.98;
            
            // Fade out based on age
            p.color[3] = 0.8 * (1 - p.age / p.lifetime);
        }
        
        // If no live particles and one-time effect, deactivate
        if (!hasLiveParticles && !this.continuous) {
            this.active = false;
        }
        
        return hasLiveParticles;
    }
    
    draw(gl, shaderProgram) {
        if (!this.active) return;
        
        for (const p of this.particles) {
            const modelMatrix = mat4.create();
            mat4.translate(modelMatrix, modelMatrix, [p.x, p.y, p.z]);
            
            const fadeScale = 1 - (p.age / p.lifetime) * 0.5;
            mat4.scale(modelMatrix, modelMatrix, [p.size * fadeScale, p.size * fadeScale, p.size * fadeScale]);
            
            gl.uniformMatrix4fv(gl.getUniformLocation(shaderProgram, "uModelMatrix"), false, modelMatrix);
            
            // Draw particle as a small quad always facing the camera
            drawTexturedQuad(
                gl, shaderProgram,
                -0.5, -0.5, 0,
                0.5, -0.5, 0,
                0.5, 0.5, 0,
                -0.5, 0.5, 0,
                0, 0, 1,
                p.color
            );
        }
    }
    
    activate() {
        this.active = true;
    }
    
    deactivate() {
        this.active = false;
    }
}

export { Cheese, ExitPortal, ParticleSystem }; 