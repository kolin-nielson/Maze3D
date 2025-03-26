// Simple OBJ file loader for WebGL
export async function loadOBJModel(url) {
    try {
        const response = await fetch(url);
        const text = await response.text();
        return parseOBJ(text);
    } catch (error) {
        console.error('Error loading OBJ file:', error);
        throw error;
    }
}

function parseOBJ(text) {
    // Arrays to store the extracted data
    const positions = [];
    const texcoords = [];
    const normals = [];
    const indices = [];
    
    // Arrays for the unique vertices in the final mesh
    const vertices = [];
    const vertexMap = new Map();
    
    // Parse each line
    const lines = text.split('\n');
    let positionIndex = 0;
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // Skip empty lines and comments
        if (!line || line.startsWith('#')) continue;
        
        const parts = line.split(/\s+/);
        const command = parts[0];
        
        if (command === 'v') {
            // Vertex position
            positions.push(
                parseFloat(parts[1]),
                parseFloat(parts[2]),
                parseFloat(parts[3])
            );
        } else if (command === 'vt') {
            // Texture coordinates
            texcoords.push(
                parseFloat(parts[1]),
                parseFloat(parts[2])
            );
        } else if (command === 'vn') {
            // Vertex normal
            normals.push(
                parseFloat(parts[1]),
                parseFloat(parts[2]),
                parseFloat(parts[3])
            );
        } else if (command === 'f') {
            // Face definition
            for (let j = 1; j <= 3; j++) { // Assuming triangulated faces
                const vertexData = parts[j].split('/');
                
                // OBJ indices are 1-based, so subtract 1
                const posIndex = parseInt(vertexData[0]) - 1;
                const texIndex = vertexData[1] ? parseInt(vertexData[1]) - 1 : -1;
                const normIndex = vertexData[2] ? parseInt(vertexData[2]) - 1 : -1;
                
                // Create a unique key for this vertex combination
                const key = `${posIndex}:${texIndex}:${normIndex}`;
                
                // Check if we've seen this vertex before
                let index = vertexMap.get(key);
                if (index === undefined) {
                    // Position
                    const px = positions[posIndex * 3];
                    const py = positions[posIndex * 3 + 1];
                    const pz = positions[posIndex * 3 + 2];
                    
                    // Texture coordinates (if available)
                    let tx = 0, ty = 0;
                    if (texIndex >= 0) {
                        tx = texcoords[texIndex * 2];
                        ty = texcoords[texIndex * 2 + 1];
                    }
                    
                    // Normal (if available)
                    let nx = 0, ny = 0, nz = 1;
                    if (normIndex >= 0) {
                        nx = normals[normIndex * 3];
                        ny = normals[normIndex * 3 + 1];
                        nz = normals[normIndex * 3 + 2];
                    }
                    
                    // Add this unique vertex to our vertex array
                    vertices.push(px, py, pz, tx, ty, nx, ny, nz);
                    index = positionIndex++;
                    vertexMap.set(key, index);
                }
                
                indices.push(index);
            }
        }
    }
    
    return {
        vertices: new Float32Array(vertices),
        indices: new Uint16Array(indices),
        vertexCount: vertices.length / 8,
        indexCount: indices.length
    };
}

export function renderOBJModel(gl, shaderProgram, model, texture, modelMatrix) {
    // Create and bind VAO
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    
    // Create and bind vertex buffer
    const vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, model.vertices, gl.STATIC_DRAW);
    
    // Position attribute
    const positionAttrib = gl.getAttribLocation(shaderProgram, 'vertPosition');
    gl.vertexAttribPointer(positionAttrib, 3, gl.FLOAT, false, 8 * 4, 0);
    gl.enableVertexAttribArray(positionAttrib);
    
    // Texture coordinate attribute
    const texCoordAttrib = gl.getAttribLocation(shaderProgram, 'vertTexCoord');
    gl.vertexAttribPointer(texCoordAttrib, 2, gl.FLOAT, false, 8 * 4, 3 * 4);
    gl.enableVertexAttribArray(texCoordAttrib);
    
    // Normal attribute
    const normalAttrib = gl.getAttribLocation(shaderProgram, 'vertNormal');
    gl.vertexAttribPointer(normalAttrib, 3, gl.FLOAT, false, 8 * 4, 5 * 4);
    gl.enableVertexAttribArray(normalAttrib);
    
    // Create and bind index buffer
    const indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, model.indices, gl.STATIC_DRAW);
    
    // Set model matrix
    gl.uniformMatrix4fv(gl.getUniformLocation(shaderProgram, "uModelMatrix"), false, modelMatrix);
    
    // Enable texture
    if (texture) {
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.uniform1i(gl.getUniformLocation(shaderProgram, "uSampler"), 0);
        gl.uniform1i(gl.getUniformLocation(shaderProgram, "uUseTexture"), 1);
    } else {
        gl.uniform1i(gl.getUniformLocation(shaderProgram, "uUseTexture"), 0);
    }
    
    // Draw the model
    gl.drawElements(gl.TRIANGLES, model.indexCount, gl.UNSIGNED_SHORT, 0);
    
    // Clean up
    gl.bindVertexArray(null);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
    
    return vao;
}

// Create a Jerry character class
export class JerryCharacter {
    constructor(x, y, z, model, texture) {
        this.x = x;
        this.y = y;
        this.z = z;
        this.model = model;
        this.texture = texture;
        this.rotationY = 0; // Rotation around Y axis (for turning)
        this.scale = 0.01;   // Scale to appropriate size for the maze
        this.animTime = 0;  // For animation
    }
    
    update(dt) {
        // Update animation time
        this.animTime += dt;
        
        // You can add more animation logic here
    }
    
    draw(gl, shaderProgram) {
        // Create model matrix
        const modelMatrix = mat4.create();
        
        // Position
        mat4.translate(modelMatrix, modelMatrix, [this.x, this.y, this.z]);
        
        // Rotation
        mat4.rotateZ(modelMatrix, modelMatrix, this.rotationY);
        
        // Add a slight bounce animation
        const bounceHeight = Math.sin(this.animTime * 5) * 0.03;
        mat4.translate(modelMatrix, modelMatrix, [0, 0, bounceHeight]);
        
        // Scale
        mat4.scale(modelMatrix, modelMatrix, [this.scale, this.scale, this.scale]);
        
        // Render the model
        renderOBJModel(gl, shaderProgram, this.model, this.texture, modelMatrix);
    }
} 