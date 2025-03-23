import { drawLines, drawQuad, drawTexturedQuad } from "./shapes.js";
import { randomIntExclusive } from "./random.js";

class Cell {
    constructor() {
        this.left = true;
        this.bottom = true;
        this.right = true;
        this.top = true;
        this.visited = false;
    }

    // Remember that x is the column number and y is the row number.
    // So (x,y) is passed in from (c,r), not the standard cell ordring of (r,c).
    draw(gl, shaderProgram, x, y, textures) {
        // For Top View: draw walls as lines
        if (shaderProgram.isTopView) {
            const vertices = [];

            if (this.left) {
                vertices.push(x, y, x, y + 1);
            }
            if (this.bottom) {
                vertices.push(x, y, x + 1, y);
            }
            if (this.right) {
                vertices.push(x + 1, y, x + 1, y + 1);
            }
            if (this.top) {
                vertices.push(x, y + 1, x + 1, y + 1);
            }

            drawLines(gl, shaderProgram, vertices, [0, 0, 1, 1]);
        } 
        // For 3D views: draw walls as textured quads
        else {
            const wallHeight = 1.0;
            
            // Calculate texture repeats based on cell size
            const wallRepeatX = 1.0; // Use a lower repeat value for cleaner appearance
            const wallRepeatY = 1.0; // Use a 1:1 ratio for walls
            const floorRepeatXY = 2.0; // Reduce floor repeat for better appearance
            
            // Select wall texture - use consistent texture for each wall type for clarity
            // Left and right walls use brick texture
            const leftRightWallTexture = textures.wall1;
            // Top and bottom walls use second texture
            const topBottomWallTexture = textures.wall2;
            // Alternative approach using position-based hash (more variety but less consistency)
            // const hashValue = ((x * 7919) + (y * 104729)) % 3;
            // const wallTexture = hashValue === 0 ? textures.wall1 : 
            //                   hashValue === 1 ? textures.wall2 : textures.wall3;
            
            // Draw walls with textures - ensure consistent texture orientation
            if (this.left) {
                drawTexturedQuad(gl, shaderProgram, 
                    x, y, 0, 
                    x, y + 1, 0, 
                    x, y + 1, wallHeight, 
                    x, y, wallHeight, 
                    -1, 0, 0, // Normal pointing left
                    [1.0, 1.0, 1.0, 1], leftRightWallTexture, wallRepeatX, wallRepeatY
                );
            }
            if (this.bottom) {
                drawTexturedQuad(gl, shaderProgram, 
                    x, y, 0, 
                    x + 1, y, 0, 
                    x + 1, y, wallHeight, 
                    x, y, wallHeight, 
                    0, -1, 0, // Normal pointing down
                    [1.0, 1.0, 1.0, 1], topBottomWallTexture, wallRepeatX, wallRepeatY
                );
            }
            if (this.right) {
                drawTexturedQuad(gl, shaderProgram, 
                    x + 1, y, 0, 
                    x + 1, y + 1, 0, 
                    x + 1, y + 1, wallHeight, 
                    x + 1, y, wallHeight, 
                    1, 0, 0, // Normal pointing right
                    [1.0, 1.0, 1.0, 1], leftRightWallTexture, wallRepeatX, wallRepeatY
                );
            }
            if (this.top) {
                drawTexturedQuad(gl, shaderProgram, 
                    x, y + 1, 0, 
                    x + 1, y + 1, 0, 
                    x + 1, y + 1, wallHeight, 
                    x, y + 1, wallHeight, 
                    0, 1, 0, // Normal pointing up
                    [1.0, 1.0, 1.0, 1], topBottomWallTexture, wallRepeatX, wallRepeatY
                );
            }
            
            // Always draw floor with repeating texture - ensure it's properly mapped
            drawTexturedQuad(gl, shaderProgram, 
                x, y, 0, 
                x + 1, y, 0, 
                x + 1, y + 1, 0, 
                x, y + 1, 0, 
                0, 0, 1, // Normal pointing up
                [1.0, 1.0, 1.0, 1], textures.floor, floorRepeatXY, floorRepeatXY
            );
            
            // No ceiling - removed for better observation view
        }
    }
}

class Maze {
    constructor(width, height) {
        this.WIDTH = width;
        this.HEIGHT = height;
        this.cells = [];
        for (let r = 0; r < height; r++) {
            this.cells.push([]);
            for (let c = 0; c < width; c++) {
                this.cells[r].push(new Cell());
            }
        }
        this.removeWallsR(0, 0);
        
        // Create cheese locations
        this.cheeseLocations = this.generateCheeseLocations(Math.min(5, width * height / 4));
        
        // Place exit at the bottom right corner
        this.exitLocation = {x: width - 1, y: height - 1};
    }
    
    generateCheeseLocations(count) {
        const locations = [];
        const maxAttempts = count * 10;
        let attempts = 0;
        
        while (locations.length < count && attempts < maxAttempts) {
            attempts++;
            
            // Generate random position
            const x = Math.floor(Math.random() * this.WIDTH);
            const y = Math.floor(Math.random() * this.HEIGHT);
            
            // Skip starting position
            if (x === 0 && y === 0) continue;
            
            // Skip exit position
            if (x === this.WIDTH - 1 && y === this.HEIGHT - 1) continue;
            
            // Check if this position is already used
            const isDuplicate = locations.some(loc => loc.x === x && loc.y === y);
            if (!isDuplicate) {
                locations.push({x, y});
            }
        }
        
        return locations;
    }

    removeWallsR(r, c) {
        this.cells[r][c].visited = true;

        // These are the directions we might be able to go. Between 0 and 4 of them.
        const LEFT = 0;
        const BOTTOM = 1;
        const RIGHT = 2;
        const TOP = 3;

        while (true) {
            const neighbors = []; // This is to be filled with some subset of {LEFT, BOTTOM, RIGHT, TOP}
            // Check if we can recurse RIGHT
            if (c < this.WIDTH - 1 && (this.cells[r][c + 1].visited) == false) {
                neighbors.push(RIGHT);
            }
            // Check if we can recurse LEFT
            if (c > 0 && this.cells[r][c - 1].visited == false) {
                neighbors.push(LEFT);
            }
            // Check if we can recurse UP
            if (r < this.HEIGHT - 1 && this.cells[r + 1][c].visited == false) {
                neighbors.push(TOP);
            }
            // Check if we can recurse DOWN
            if (r > 0 && this.cells[r - 1][c].visited == false) {
                neighbors.push(BOTTOM);
            }

            // if there were no options, return
            if (neighbors.length == 0)
                return;

            // else pick a random neighborIndex and its correspondingDirection
            const neighborIndex = randomIntExclusive(0, neighbors.length);
            const neighborDirection = neighbors[neighborIndex];

            // remove the two walls between my cell and chosen neighbor cell, and recurse to neighbor.
            if (neighborDirection == LEFT) {
                this.cells[r][c].left = false;
                this.cells[r][c - 1].right = false;
                this.removeWallsR(r, c - 1);
            }
            else if (neighborDirection == RIGHT) {
                this.cells[r][c].right = false;
                this.cells[r][c + 1].left = false;
                this.removeWallsR(r, c + 1);
            }
            else if (neighborDirection == BOTTOM) {
                this.cells[r][c].bottom = false;
                this.cells[r - 1][c].top = false;
                this.removeWallsR(r - 1, c);
            }
            else { // if (neighborDirection == TOP) 
                this.cells[r][c].top = false;
                this.cells[r + 1][c].bottom = false;
                this.removeWallsR(r + 1, c)
            }
        } // end of while 
    } // end of removeWallsR

    // Optimized drawing that only renders cells near the player
    drawOptimized(gl, shaderProgram, textures, playerX, playerY, renderDistance) {
        const modelMatrix = mat4.create();
        gl.uniformMatrix4fv(gl.getUniformLocation(shaderProgram, "uModelMatrix"), false, modelMatrix);

        // Calculate the range of cells to render based on player position and render distance
        const minRow = Math.max(0, Math.floor(playerY) - renderDistance);
        const maxRow = Math.min(this.HEIGHT - 1, Math.floor(playerY) + renderDistance);
        const minCol = Math.max(0, Math.floor(playerX) - renderDistance);
        const maxCol = Math.min(this.WIDTH - 1, Math.floor(playerX) + renderDistance);
        
        // Only draw cells within the calculated range
        for (let r = minRow; r <= maxRow; r++) {
            for (let c = minCol; c <= maxCol; c++) {
                this.cells[r][c].draw(gl, shaderProgram, c, r, textures);
            }
        }
    }
    
    draw(gl, shaderProgram, textures, playerX, playerY, renderDistance) {
        // If render distance is provided, use optimized drawing
        if (playerX !== undefined && playerY !== undefined && renderDistance !== undefined) {
            this.drawOptimized(gl, shaderProgram, textures, playerX, playerY, renderDistance);
            return;
        }
        
        // Otherwise, fall back to drawing everything
        const modelMatrix = mat4.create();
        gl.uniformMatrix4fv(gl.getUniformLocation(shaderProgram, "uModelMatrix"), false, modelMatrix);

        for (let r = 0; r < this.HEIGHT; r++) {
            for (let c = 0; c < this.WIDTH; c++) {
                this.cells[r][c].draw(gl, shaderProgram, c, r, textures);
            }
        }
    }
    
    IsSafe(x, y, radius) {
        const cellX = Math.floor(x);
        const cellY = Math.floor(y);
        const offsetX = x - cellX;
        const offsetY = y - cellY;
        
        // Add a small safety margin to prevent clipping (0.02 units)
        const safetyMargin = 0.02;
        const adjustedRadius = radius + safetyMargin;

        // Make sure coordinates are in bounds
        if (cellX < 0 || cellX >= this.WIDTH || cellY < 0 || cellY >= this.HEIGHT) {
            return false;
        }

        // Check if the object would intersect an existing BOTTOM wall:
        if (this.cells[cellY][cellX].bottom && offsetY - adjustedRadius < 0)
            return false;
        // Check if the object would intersect an existing TOP wall:
        if (this.cells[cellY][cellX].top && offsetY + adjustedRadius > 1)
            return false;
        // Check if the object would intersect an existing LEFT wall:
        if (this.cells[cellY][cellX].left && offsetX - adjustedRadius < 0)
            return false;
        // Check if the object would intersect an existing RIGHT wall:
        if (this.cells[cellY][cellX].right && offsetX + adjustedRadius > 1)
            return false;

        // Check corner cases only if we're close to a corner
        // This allows sliding along walls more smoothly
        const cornerThreshold = 0.1;
        
        // Bottom-left corner
        if (offsetX < cornerThreshold && offsetY < cornerThreshold) {
            if ((this.cells[cellY][cellX].left || this.cells[cellY][cellX].bottom) && 
                Math.sqrt(offsetX * offsetX + offsetY * offsetY) < adjustedRadius)
                return false;
        }
        
        // Top-left corner
        if (offsetX < cornerThreshold && offsetY > 1 - cornerThreshold) {
            if ((this.cells[cellY][cellX].left || this.cells[cellY][cellX].top) && 
                Math.sqrt(offsetX * offsetX + (1 - offsetY) * (1 - offsetY)) < adjustedRadius)
                return false;
        }
        
        // Bottom-right corner
        if (offsetX > 1 - cornerThreshold && offsetY < cornerThreshold) {
            if ((this.cells[cellY][cellX].right || this.cells[cellY][cellX].bottom) && 
                Math.sqrt((1 - offsetX) * (1 - offsetX) + offsetY * offsetY) < adjustedRadius)
                return false;
        }
        
        // Top-right corner
        if (offsetX > 1 - cornerThreshold && offsetY > 1 - cornerThreshold) {
            if ((this.cells[cellY][cellX].right || this.cells[cellY][cellX].top) && 
                Math.sqrt((1 - offsetX) * (1 - offsetX) + (1 - offsetY) * (1 - offsetY)) < adjustedRadius)
                return false;
        }

        return true;
    }

    // Check if a position is inside a wall
    isWall(cellX, cellY, x, y) {
        // If outside the maze, treat as wall
        if (cellX < 0 || cellY < 0 || cellX >= this.WIDTH || cellY >= this.HEIGHT) {
            return true;
        }
        
        // Get the cell
        const cell = this.cells[cellY][cellX];
        
        // Local coordinates within the cell (0-1 range)
        const localX = x - cellX;
        const localY = y - cellY;
        
        // Check if position is too close to walls
        const WALL_THRESHOLD = 0.05; // Minimum distance from wall to not be considered "in" the wall
        
        // Check left wall
        if (cell.left && localX < WALL_THRESHOLD) {
            return true;
        }
        
        // Check bottom wall
        if (cell.bottom && localY < WALL_THRESHOLD) {
            return true;
        }
        
        // Check right wall
        if (cell.right && localX > (1 - WALL_THRESHOLD)) {
            return true;
        }
        
        // Check top wall
        if (cell.top && localY > (1 - WALL_THRESHOLD)) {
            return true;
        }
        
        // Not in a wall
        return false;
    }

} // end of class Maze

export { Maze };