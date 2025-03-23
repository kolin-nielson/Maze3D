function drawLineLoop(gl, shaderProgram, vertices, color = [0, 0, 0, 1]) {
	drawVertices(gl, shaderProgram, 2, vertices, color, gl.LINE_LOOP);
}

function drawLines(gl, shaderProgram, vertices, color = [0, 0, 0, 1]) {
	drawVertices(gl, shaderProgram, 2, vertices, color, gl.LINES);
}

// Function to draw a textured quad with normals
function drawTexturedQuad(gl, shaderProgram, x1, y1, z1, x2, y2, z2, x3, y3, z3, x4, y4, z4, 
                          nx, ny, nz, color = [1, 1, 1, 1], textureId = null, repeatX = 1, repeatY = 1) {
	// Vertices position in 3D space
	const vertices = [
		x1, y1, z1,
		x2, y2, z2,
		x3, y3, z3,
		x4, y4, z4
	];
	
	// Texture coordinates with repeat
	const texCoords = [
		0.0, 0.0,
		repeatX, 0.0,
		repeatX, repeatY,
		0.0, repeatY
	];
	
	// Normal vector (same for all points on this face)
	const normals = [
		nx, ny, nz,
		nx, ny, nz,
		nx, ny, nz,
		nx, ny, nz
	];
	
	drawTexturedVertices(gl, shaderProgram, vertices, texCoords, normals, color, gl.TRIANGLE_FAN, textureId);
}

// Legacy quad drawing function
function drawQuad(gl, shaderProgram, x1, y1, z1, x2, y2, z2, x3, y3, z3, x4, y4, z4, color = [0, 0, 0, 1]) {
	// Calculate normal vector from the quad vertices
	const ux = x2 - x1;
	const uy = y2 - y1;
	const uz = z2 - z1;
	
	const vx = x3 - x2;
	const vy = y3 - y2;
	const vz = z3 - z2;
	
	// Cross product to find normal
	const nx = uy * vz - uz * vy;
	const ny = uz * vx - ux * vz;
	const nz = ux * vy - uy * vx;
	
	// Normalize
	const length = Math.sqrt(nx * nx + ny * ny + nz * nz);
	const normalX = nx / length;
	const normalY = ny / length;
	const normalZ = nz / length;
	
	drawTexturedQuad(gl, shaderProgram, x1, y1, z1, x2, y2, z2, x3, y3, z3, x4, y4, z4, 
	                normalX, normalY, normalZ, color);
}

function drawVertices(gl, shaderProgram, dims, vertices, color, style) {
	const vertexBufferObject = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, vertexBufferObject);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

	const positionAttribLocation = gl.getAttribLocation(shaderProgram, 'vertPosition');
	gl.vertexAttribPointer(
		positionAttribLocation, // Attribute location
		dims, // Number of elements per attribute
		gl.FLOAT, // Type of elements
		gl.FALSE,
		dims * Float32Array.BYTES_PER_ELEMENT, // Size of an individual vertex
		0 // Offset from the beginning of a single vertex to this attribute
	);
	gl.enableVertexAttribArray(positionAttribLocation);

	const colorUniformLocation = gl.getUniformLocation(shaderProgram, "uColor");
	gl.uniform4fv(colorUniformLocation, color);

	// Disable texturing
	const useTextureLoc = gl.getUniformLocation(shaderProgram, "uUseTexture");
	if (useTextureLoc) gl.uniform1i(useTextureLoc, 0);

	// Disable lighting
	const useLightingLoc = gl.getUniformLocation(shaderProgram, "uUseLighting");
	if (useLightingLoc) gl.uniform1i(useLightingLoc, 0);

	gl.drawArrays(style, 0, vertices.length / dims);
}

function drawTexturedVertices(gl, shaderProgram, positions, texCoords, normals, color, style, textureId) {
	// Create and bind position buffer
	const positionBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
	
	const positionAttribLocation = gl.getAttribLocation(shaderProgram, 'vertPosition');
	gl.vertexAttribPointer(
		positionAttribLocation,
		3, // xyz
		gl.FLOAT,
		gl.FALSE,
		3 * Float32Array.BYTES_PER_ELEMENT,
		0
	);
	gl.enableVertexAttribArray(positionAttribLocation);
	
	// Create and bind texture coordinate buffer if texCoords provided
	if (texCoords && texCoords.length > 0) {
		const texCoordBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texCoords), gl.STATIC_DRAW);
		
		const texCoordAttribLocation = gl.getAttribLocation(shaderProgram, 'vertTexCoord');
		if (texCoordAttribLocation !== -1) {
			gl.vertexAttribPointer(
				texCoordAttribLocation,
				2, // st
				gl.FLOAT,
				gl.FALSE,
				2 * Float32Array.BYTES_PER_ELEMENT,
				0
			);
			gl.enableVertexAttribArray(texCoordAttribLocation);
		}
	}
	
	// Create and bind normal buffer if normals provided
	if (normals && normals.length > 0) {
		const normalBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);
		
		const normalAttribLocation = gl.getAttribLocation(shaderProgram, 'vertNormal');
		if (normalAttribLocation !== -1) {
			gl.vertexAttribPointer(
				normalAttribLocation,
				3, // xyz
				gl.FLOAT,
				gl.FALSE,
				3 * Float32Array.BYTES_PER_ELEMENT,
				0
			);
			gl.enableVertexAttribArray(normalAttribLocation);
		}
	}
	
	// Set color uniform
	const colorUniformLocation = gl.getUniformLocation(shaderProgram, "uColor");
	gl.uniform4fv(colorUniformLocation, color);
	
	// Set texture uniforms if texture provided
	const useTextureLoc = gl.getUniformLocation(shaderProgram, "uUseTexture");
	if (textureId !== null && useTextureLoc !== null) {
		gl.uniform1i(useTextureLoc, 1);
		
		const textureLoc = gl.getUniformLocation(shaderProgram, "uTexture");
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, textureId);
		gl.uniform1i(textureLoc, 0);
	} else if(useTextureLoc !== null) {
		gl.uniform1i(useTextureLoc, 0);
	}
	
	// Enable lighting for textured vertices
	const useLightingLoc = gl.getUniformLocation(shaderProgram, "uUseLighting");
	if (useLightingLoc !== null) {
		gl.uniform1i(useLightingLoc, 1);
	}
	
	// Draw
	gl.drawArrays(style, 0, positions.length / 3);
}

// Function to create and load a texture
function loadTexture(gl, url) {
	return new Promise((resolve, reject) => {
		const texture = gl.createTexture();
		gl.bindTexture(gl.TEXTURE_2D, texture);
		
		// Load a placeholder 1x1 pixel while the image loads
		// Using a distinctive pink color to make it obvious if a texture fails to load
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, 
			new Uint8Array([255, 50, 255, 255])); // Pink color
		
		// Create an image object and set up the onload handler
		const image = new Image();
		
		// Enable CORS if loading from another domain - must be set before src
		image.crossOrigin = 'anonymous';
		
		image.onload = function() {
			console.log('Texture loaded successfully:', url);
			
			gl.bindTexture(gl.TEXTURE_2D, texture);
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
			
			// Check if the image size is a power of 2
			if (isPowerOf2(image.width) && isPowerOf2(image.height)) {
				// Generate mipmaps for power-of-2 textures
				gl.generateMipmap(gl.TEXTURE_2D);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
                
				// Set texture to repeat for tiling
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
			} else {
				// Non-power-of-2 textures - don't use mipmaps
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
                
                console.warn('Non-power-of-2 texture loaded:', url, image.width, 'x', image.height);
			}
			
			updateLoadingProgress();
			resolve(texture);
		};
		
		image.onerror = function(err) {
			console.error('Failed to load texture:', url, err);
			
			// Set obvious error texture - bright red color to easily spot missing textures
			gl.bindTexture(gl.TEXTURE_2D, texture);
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, 
				new Uint8Array([255, 0, 0, 255])); // Bright red
			
			// Set basic parameters for the error texture
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
			
			resolve(texture); // Still resolve with error texture
		};
		
		// Set the image src to start loading
		image.src = url;
	});
}

function isPowerOf2(value) {
	return (value & (value - 1)) === 0;
}

// Helper function to update loading progress
function updateLoadingProgress() {
	window.loadedResources = (window.loadedResources || 0) + 1;
	const loadingProgressElement = document.getElementById('loading-progress');
	if (loadingProgressElement) {
		const progress = Math.min(100, (window.loadedResources / window.totalResources) * 100);
		loadingProgressElement.style.width = progress + '%';
		
		// Hide loading screen when all resources loaded
		if (progress >= 100) {
			setTimeout(() => {
				const loadingScreen = document.getElementById('loading-screen');
				if (loadingScreen) {
					loadingScreen.style.opacity = '0';
					setTimeout(() => {
						loadingScreen.style.display = 'none';
					}, 500);
				}
			}, 500);
		}
	}
}

export { drawLineLoop, drawLines, drawQuad, drawTexturedQuad, loadTexture };