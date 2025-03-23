import { drawLineLoop, drawQuad, drawTexturedQuad } from "./shapes.js";
import { Maze } from "./maze.js";

class Rat {
    constructor(x, y, degrees, maze) {
        this.x = x;
        this.y = y;
        this.degrees = degrees;
        this.maze = maze;
        this.SPIN_SPEED = 120; // degrees per second
        this.MOVE_SPEED = 1.0; // cells per second
        this.RADIUS = 0.15; // Reduced from 0.3 to 0.15 for tighter collision detection
        // Removed all animation parameters
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
        const dx = Math.cos(this.degrees * Math.PI / 180);
        const dy = Math.sin(this.degrees * Math.PI / 180);
        const speed = this.MOVE_SPEED * DT;
        
        // Try full movement first
        const newX = this.x + dx * speed;
        const newY = this.y + dy * speed;
        
        // Check if full movement is possible
        if (this.maze.IsSafe(newX, newY, this.RADIUS)) {
            this.x = newX;
            this.y = newY;
            return;
        }
        
        // If not, try sliding along walls by separating x and y movement
        
        // Try moving just in X direction
        const newXOnly = this.x + dx * speed;
        if (this.maze.IsSafe(newXOnly, this.y, this.RADIUS)) {
            this.x = newXOnly;
            
            // Now try a small step in Y direction (wall sliding)
            const smallStep = 0.05 * speed; // Much smaller step
            const slideY = this.y + dy * smallStep;
            if (this.maze.IsSafe(this.x, slideY, this.RADIUS)) {
                this.y = slideY;
            }
            return;
        }
        
        // Try moving just in Y direction
        const newYOnly = this.y + dy * speed;
        if (this.maze.IsSafe(this.x, newYOnly, this.RADIUS)) {
            this.y = newYOnly;
            
            // Now try a small step in X direction (wall sliding)
            const smallStep = 0.05 * speed; // Much smaller step
            const slideX = this.x + dx * smallStep;
            if (this.maze.IsSafe(slideX, this.y, this.RADIUS)) {
                this.x = slideX;
            }
            return;
        }
    }
    
    spinLeft(DT) {
        this.degrees += this.SPIN_SPEED * DT;
        // No animation updates
    }
    
    spinRight(DT) {
        this.degrees -= this.SPIN_SPEED * DT;
        // No animation updates
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

export { Rat };