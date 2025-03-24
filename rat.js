import { drawLineLoop, drawQuad, drawTexturedQuad } from "./shapes.js";
import { Maze } from "./maze.js";

// CapsuleCollider class for improved collision detection
class CapsuleCollider {
    constructor(radius, height) {
        this.radius = radius;
        this.height = height;
        this.position = [0, 0, 0];
        this.direction = [1, 0, 0]; // Default direction is along X axis
    }
    
    // Update collider position and direction
    updatePosition(x, y, z, directionDegrees) {
        this.position = [x, y, z];
        const radians = directionDegrees * Math.PI / 180;
        this.direction = [Math.cos(radians), Math.sin(radians), 0];
    }
    
    // Check if the capsule can safely move to a new position
    checkMovement(maze, newX, newY, collisionMargin = 0.05) {
        const effectiveRadius = this.radius + collisionMargin;
        
        // Check if the new center position is safe from walls
        if (!maze.IsSafe(newX, newY, effectiveRadius)) {
            return false;
        }
        
        // For more precise collision, check points along the capsule's edge 
        // in the direction of movement for tighter corners
        const checkPoints = 4; // Increased from 3 to 4 for more precision
        for (let i = 1; i <= checkPoints; i++) {
            const ratio = i / (checkPoints + 1);
            const offset = ratio * this.height / 2;
            
            // Check forward and backward points
            const forwardX = newX + this.direction[0] * offset;
            const forwardY = newY + this.direction[1] * offset;
            if (!maze.IsSafe(forwardX, forwardY, effectiveRadius)) {
                return false;
            }
            
            const backwardX = newX - this.direction[0] * offset;
            const backwardY = newY - this.direction[1] * offset;
            if (!maze.IsSafe(backwardX, backwardY, effectiveRadius)) {
                return false;
            }
            
            // Add lateral check points for better corner avoidance
            // Create a perpendicular direction vector
            const perpDirX = -this.direction[1];
            const perpDirY = this.direction[0];
            
            // Check side points
            const rightX = newX + perpDirX * effectiveRadius * 0.8;
            const rightY = newY + perpDirY * effectiveRadius * 0.8;
            if (!maze.IsSafe(rightX, rightY, effectiveRadius * 0.5)) {
                return false;
            }
            
            const leftX = newX - perpDirX * effectiveRadius * 0.8;
            const leftY = newY - perpDirY * effectiveRadius * 0.8;
            if (!maze.IsSafe(leftX, leftY, effectiveRadius * 0.5)) {
                return false;
            }
        }
        
        return true;
    }
    
    // Calculate best sliding direction when collision occurs
    calculateSlideDirection(maze, currentX, currentY, targetX, targetY, slideAmount = 0.5) {
        // Normalized movement vector
        const dx = targetX - currentX;
        const dy = targetY - currentY;
        const dist = Math.sqrt(dx*dx + dy*dy);
        
        if (dist < 0.001) return null; // No movement, no slide
        
        const nx = dx / dist;
        const ny = dy / dist;
        
        // First, try moving along primary axes with adaptive step sizes
        // Try horizontal movement first (might be different from slide direction)
        const slideDistanceX = dist * Math.abs(nx) * slideAmount;
        if (Math.abs(nx) > 0.1) { // Only try if there's meaningful horizontal movement
            const signX = Math.sign(nx);
            // Try multiple step sizes
            for (let factor = 1.0; factor >= 0.2; factor -= 0.2) {
                const testX = currentX + signX * slideDistanceX * factor;
                if (this.checkMovement(maze, testX, currentY, 0.02)) {
                    return { x: testX, y: currentY };
                }
            }
        }
        
        // Try vertical movement
        const slideDistanceY = dist * Math.abs(ny) * slideAmount;
        if (Math.abs(ny) > 0.1) { // Only try if there's meaningful vertical movement
            const signY = Math.sign(ny);
            // Try multiple step sizes
            for (let factor = 1.0; factor >= 0.2; factor -= 0.2) {
                const testY = currentY + signY * slideDistanceY * factor;
                if (this.checkMovement(maze, currentX, testY, 0.02)) {
                    return { x: currentX, y: testY };
                }
            }
        }
        
        // If pure axis movement fails, try intermediate angles
        // More angles at smaller increments for smoother cornering
        const angles = [15, 30, 45, 60, 75];
        for (const angle of angles) {
            const radians = angle * Math.PI / 180;
            
            // Try both positive and negative angles with multiple step sizes
            for (let sign = 1; sign >= -1; sign -= 2) {
                const currentAngle = sign * radians;
                const cos = Math.cos(currentAngle);
                const sin = Math.sin(currentAngle);
                
                // Rotate the normalized direction vector
                const rotatedX = nx * cos - ny * sin;
                const rotatedY = nx * sin + ny * cos;
                
                // Try different step sizes
                for (let factor = 1.0; factor >= 0.2; factor -= 0.2) {
                    const slideX = currentX + rotatedX * dist * slideAmount * factor;
                    const slideY = currentY + rotatedY * dist * slideAmount * factor;
                    
                    if (this.checkMovement(maze, slideX, slideY, 0.02)) {
                        return { x: slideX, y: slideY };
                    }
                }
            }
        }
        
        // If all else fails, try micro-movements in 8 directions
        const microStep = 0.05; // Very small step
        const directions = [
            [1, 0], [0.7071, 0.7071], [0, 1], [-0.7071, 0.7071],
            [-1, 0], [-0.7071, -0.7071], [0, -1], [0.7071, -0.7071]
        ];
        
        for (const dir of directions) {
            const microX = currentX + dir[0] * microStep;
            const microY = currentY + dir[1] * microStep;
            
            if (this.checkMovement(maze, microX, microY, 0.01)) {
                return { x: microX, y: microY };
            }
        }
        
        // If all slide attempts fail, stay in place
        return null;
    }
    
    // New method to check for walls in surroundings to help with better decision making
    scanSurroundings(maze, x, y, radius) {
        const scanDirections = 8; // Check 8 directions
        const results = [];
        
        for (let i = 0; i < scanDirections; i++) {
            const angle = (i / scanDirections) * Math.PI * 2;
            const dx = Math.cos(angle);
            const dy = Math.sin(angle);
            
            // Check at multiple distances
            for (let dist = radius*1.5; dist <= radius*4; dist += radius) {
                const checkX = x + dx * dist;
                const checkY = y + dy * dist;
                
                if (!maze.IsSafe(checkX, checkY, radius * 0.5)) {
                    // Found wall, record distance and direction
                    results.push({
                        direction: [dx, dy],
                        distance: dist,
                        angle: angle
                    });
                    break;
                }
            }
        }
        
        return results;
    }
}

class Rat {
    constructor(x, y, degrees, maze) {
        this.x = x;
        this.y = y;
        this.degrees = degrees;
        this.maze = maze;
        this.SPIN_SPEED = 120; // degrees per second
        this.MOVE_SPEED = 1.0; // cells per second
        this.RADIUS = 0.15; // Reduced from 0.3 to 0.15 for tighter collision detection
        
        // Add capsule collider for more accurate collision detection
        this.collider = new CapsuleCollider(this.RADIUS, 0.4);
        this.collider.updatePosition(this.x, this.y, 0.1, this.degrees);
        
        // Add movement physics variables
        this.velocity = [0, 0];
        this.acceleration = 2.8; // Slightly reduced for better control
        this.deceleration = 4.0; // Slightly reduced for smoother stops
        this.maxVelocity = this.MOVE_SPEED;
        
        // Add additional physics properties
        this.friction = 0.92; // Apply friction during sliding
        this.wallBounce = 0.1; // Small bounce effect when hitting walls
        this.cornerAvoidanceDistance = 0.25; // How far to look ahead for corners
        
        // Movement history for smoothing
        this.positionHistory = [];
        this.maxHistoryLength = 3;
    }
    
    draw(gl, shaderProgram) {
        const modelMatrix = mat4.create();
        
        // Fixed position, no animation
        mat4.translate(modelMatrix, modelMatrix, [this.x, this.y, 0.1]); 
        mat4.rotateZ(modelMatrix, modelMatrix, (this.degrees * Math.PI / 180));

        gl.uniformMatrix4fv(gl.getUniformLocation(shaderProgram, "uModelMatrix"), false, modelMatrix);

        if (shaderProgram.isTopView) {
            // 2D top-down view (simplified triangle)
            drawRatTopView(gl, shaderProgram);
        } else {
            // Check if we're in first-person mode
            const isFirstPerson = gl.getUniformLocation(shaderProgram, "isRatView") && 
                                 gl.getUniform(shaderProgram, gl.getUniformLocation(shaderProgram, "isRatView"));
            
            // Only draw the rat in 3D if we're not in first-person view
            if (!isFirstPerson) {
                // 3D view - draw the rat without animations
                drawRat3D(gl, shaderProgram);
            }
            // Skip drawing the rat entirely in first-person view
        }
    }
    
    scurryForward(DT) {
        const radians = this.degrees * Math.PI / 180;
        const dx = Math.cos(radians);
        const dy = Math.sin(radians);
        
        // Scan surroundings to detect nearby walls for better decision making
        const wallScan = this.collider.scanSurroundings(this.maze, this.x, this.y, this.RADIUS);
        
        // Calculate acceleration based on proximity to walls
        let accelMultiplier = 1.0;
        
        // Reduce acceleration when approaching walls head-on
        for (const wall of wallScan) {
            const dotProduct = dx * wall.direction[0] + dy * wall.direction[1];
            if (dotProduct > 0.7 && wall.distance < this.cornerAvoidanceDistance) {
                accelMultiplier = Math.min(accelMultiplier, wall.distance / this.cornerAvoidanceDistance);
            }
        }
        
        // Apply acceleration in the current direction with wall proximity adjustment
        this.velocity[0] += dx * this.acceleration * accelMultiplier * DT;
        this.velocity[1] += dy * this.acceleration * accelMultiplier * DT;
        
        // Cap velocity to maximum with smoother approach
        const currentSpeed = Math.sqrt(this.velocity[0]*this.velocity[0] + this.velocity[1]*this.velocity[1]);
        if (currentSpeed > this.maxVelocity) {
            const scaleFactor = (this.maxVelocity + (currentSpeed - this.maxVelocity) * 0.2) / currentSpeed;
            this.velocity[0] *= scaleFactor;
            this.velocity[1] *= scaleFactor;
        }
        
        // Save current position for history
        this.addPositionToHistory(this.x, this.y);
        
        // Calculate movement based on velocity and delta time
        const moveX = this.x + this.velocity[0] * DT;
        const moveY = this.y + this.velocity[1] * DT;
        
        // Update collider position
        this.collider.updatePosition(this.x, this.y, 0.1, this.degrees);
        
        // Check if movement is safe with capsule collider
        if (this.collider.checkMovement(this.maze, moveX, moveY)) {
            // Movement is safe, proceed
            this.x = moveX;
            this.y = moveY;
        } else {
            // Try to slide along walls
            const slidePosition = this.collider.calculateSlideDirection(
                this.maze, this.x, this.y, moveX, moveY
            );
            
            if (slidePosition) {
                // Apply sliding movement
                this.x = slidePosition.x;
                this.y = slidePosition.y;
                
                // Calculate the slide direction
                const slideDirection = [
                    slidePosition.x - this.x,
                    slidePosition.y - this.y
                ];
                
                const length = Math.sqrt(slideDirection[0]*slideDirection[0] + slideDirection[1]*slideDirection[1]);
                if (length > 0.001) {
                    // Normalize slide direction
                    slideDirection[0] /= length;
                    slideDirection[1] /= length;
                    
                    // Project current velocity onto slide direction
                    const dotProduct = this.velocity[0]*slideDirection[0] + this.velocity[1]*slideDirection[1];
                    
                    // New velocity combines projection and bounce
                    this.velocity[0] = slideDirection[0] * dotProduct * this.friction;
                    this.velocity[1] = slideDirection[1] * dotProduct * this.friction;
                    
                    // Add tiny bounce effect perpendicular to wall for more natural feel
                    const perpX = -slideDirection[1];
                    const perpY = slideDirection[0];
                    this.velocity[0] += perpX * this.wallBounce;
                    this.velocity[1] += perpY * this.wallBounce;
                }
            } else {
                // Can't slide, stop movement in this direction but apply small bounce
                // Calculate wall normal (opposite of movement direction)
                const normalX = -dx;
                const normalY = -dy;
                
                // Apply small bounce in the opposite direction
                this.velocity[0] = normalX * currentSpeed * this.wallBounce;
                this.velocity[1] = normalY * currentSpeed * this.wallBounce;
            }
        }
        
        // Update collider position after movement
        this.collider.updatePosition(this.x, this.y, 0.1, this.degrees);
    }
    
    // Apply deceleration when not moving
    applyDeceleration(DT) {
        // Calculate current speed
        const currentSpeed = Math.sqrt(this.velocity[0]*this.velocity[0] + this.velocity[1]*this.velocity[1]);
        
        if (currentSpeed > 0) {
            // Calculate deceleration amount with a smoother curve
            const decelAmount = this.deceleration * DT * (1 + currentSpeed * 0.5);
            
            if (decelAmount >= currentSpeed) {
                // If deceleration would stop us completely, just stop
                this.velocity[0] = 0;
                this.velocity[1] = 0;
            } else {
                // Apply proportional deceleration
                const factor = (currentSpeed - decelAmount) / currentSpeed;
                this.velocity[0] *= factor;
                this.velocity[1] *= factor;
            }
        }
    }
    
    // Track position history for movement smoothing
    addPositionToHistory(x, y) {
        this.positionHistory.unshift({x, y});
        if (this.positionHistory.length > this.maxHistoryLength) {
            this.positionHistory.pop();
        }
    }
    
    // Get average position from history (for camera smoothing)
    getSmoothedPosition() {
        if (this.positionHistory.length === 0) {
            return {x: this.x, y: this.y};
        }
        
        let sumX = 0, sumY = 0;
        for (const pos of this.positionHistory) {
            sumX += pos.x;
            sumY += pos.y;
        }
        
        return {
            x: sumX / this.positionHistory.length,
            y: sumY / this.positionHistory.length
        };
    }
    
    spinLeft(DT) {
        this.degrees += this.SPIN_SPEED * DT;
        // Update collider direction
        this.collider.updatePosition(this.x, this.y, 0.1, this.degrees);
    }
    
    spinRight(DT) {
        this.degrees -= this.SPIN_SPEED * DT;
        // Update collider direction
        this.collider.updatePosition(this.x, this.y, 0.1, this.degrees);
    }
}

// Draw 2D rat for top view
function drawRatTopView(gl, shaderProgram) {
    const vertices = [.3, 0, -.2, .1, -.2, -.1];
    drawLineLoop(gl, shaderProgram, vertices, [0.8, 0.2, 0.2, 1]); // Bright red for visibility
}

// Draw 3D rat with simple triangle shape
function drawRat3D(gl, shaderProgram) {
    const ratColor = [0.8, 0.2, 0.2, 1]; // Bright red to match top view
    const height = 0.2; // Height above the ground
    
    // Simple triangle in 3D space (similar to top view but with height)
    // Front point of triangle
    const frontX = 0.3;
    const frontY = 0;
    const frontZ = height;
    
    // Back left point of triangle
    const backLeftX = -0.2;
    const backLeftY = 0.1;
    const backLeftZ = height;
    
    // Back right point of triangle
    const backRightX = -0.2;
    const backRightY = -0.1;
    const backRightZ = height;
    
    // Draw the triangle top face (pointing up)
    drawTexturedQuad(
        gl, shaderProgram,
        frontX, frontY, frontZ,           // Front point
        backLeftX, backLeftY, backLeftZ,  // Back left
        backRightX, backRightY, backRightZ, // Back right
        backRightX, backRightY, backRightZ, // Back right (repeated for quad)
        0, 0, 1,                          // Normal points up
        ratColor
    );
    
    // Draw the triangle bottom face (pointing down)
    drawTexturedQuad(
        gl, shaderProgram,
        frontX, frontY, frontZ - 0.05,           // Front point
        backLeftX, backLeftY, backLeftZ - 0.05,  // Back left
        backRightX, backRightY, backRightZ - 0.05, // Back right
        backRightX, backRightY, backRightZ - 0.05, // Back right (repeated for quad)
        0, 0, -1,                         // Normal points down
        ratColor
    );
    
    // Connect top and bottom faces with sides
    // Front left edge
    drawTexturedQuad(
        gl, shaderProgram,
        frontX, frontY, frontZ,            // Front top
        frontX, frontY, frontZ - 0.05,     // Front bottom
        backLeftX, backLeftY, backLeftZ - 0.05, // Back left bottom
        backLeftX, backLeftY, backLeftZ,   // Back left top
        0.5, -0.5, 0,                     // Normal
        ratColor
    );
    
    // Front right edge
    drawTexturedQuad(
        gl, shaderProgram,
        frontX, frontY, frontZ,            // Front top
        frontX, frontY, frontZ - 0.05,     // Front bottom
        backRightX, backRightY, backRightZ - 0.05, // Back right bottom
        backRightX, backRightY, backRightZ,   // Back right top
        0.5, 0.5, 0,                      // Normal
        ratColor
    );
    
    // Back edge
    drawTexturedQuad(
        gl, shaderProgram,
        backLeftX, backLeftY, backLeftZ,    // Back left top
        backLeftX, backLeftY, backLeftZ - 0.05, // Back left bottom
        backRightX, backRightY, backRightZ - 0.05, // Back right bottom
        backRightX, backRightY, backRightZ, // Back right top
        -1, 0, 0,                         // Normal points backward
        ratColor
    );
}

// Helper function to draw 3D vertices - removed since we're using the updated shapes.js functions

export { Rat, CapsuleCollider };