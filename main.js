import { initShaderProgram } from "./shader.js";
import { Maze } from "./maze.js";
import { Rat } from "./rat.js";
import { loadTexture } from "./shapes.js";
import { Cheese, ExitPortal, ParticleSystem } from "./gameObjects.js";

main();
async function main() {
	console.log('This is working');

	//
	// start gl
	// 
	const canvas = document.getElementById('glcanvas');
	const gl = canvas.getContext('webgl');
	if (!gl) {
		alert('Your browser does not support WebGL');
	}
	gl.clearColor(0.05, 0.05, 0.1, 1.0); // Darker background color
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

	// Enable depth testing for 3D rendering
	gl.enable(gl.DEPTH_TEST);
	gl.depthFunc(gl.LEQUAL);
	
	// Enable alpha blending for transparent objects
	gl.enable(gl.BLEND);
	gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

	//
	// Create shaders
	// 
	const shaderProgram3d = initShaderProgram(gl, await (await fetch("simple3d.vs")).text(), await (await fetch("simple3d.fs")).text());

	//
	// Create real textures instead of solid colors
	//
	const loadingScreen = document.getElementById('loading-screen');
	
	// Show loading screen while textures load
	if (loadingScreen) {
		loadingScreen.style.display = 'flex';
		loadingScreen.style.opacity = '1';
	}
	
	// Setup global loading tracking
	window.totalResources = 5; // Total number of textures to load
	window.loadedResources = 0;
	
	// Define textures with higher resolution procedural patterns
	const textureUrls = {
		// Wall textures
		wall1: createBrickDataURL(180, 80, 40),    // Red brick
		wall2: createStoneDataURL(130, 130, 150),  // Stone 
		wall3: createWoodDataURL(140, 90, 40),     // Wood planks
		// Floor texture
		floor: createMarbleDataURL(200, 200, 210), // Marble floor
		// Special cheese texture
		cheese: createGoldDataURL()                // Gold with shine
	};
	
	// Helper function to create a brick wall texture
	function createBrickDataURL(r, g, b) {
		const canvas = document.createElement('canvas');
		canvas.width = 128;
		canvas.height = 128;
		const ctx = canvas.getContext('2d');
		
		// Base color
		ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
		ctx.fillRect(0, 0, 128, 128);
		
		// Brick pattern
		const brickHeight = 16;
		const brickWidth = 32;
		const mortarColor = `rgb(${Math.max(0, r-50)}, ${Math.max(0, g-50)}, ${Math.max(0, b-50)})`;
		const brickVariation = `rgb(${Math.min(255, r+20)}, ${Math.min(255, g+10)}, ${Math.min(255, b)})`;
		
		ctx.fillStyle = mortarColor;
		
		// Horizontal mortar lines
		for (let y = 0; y < 128; y += brickHeight) {
			ctx.fillRect(0, y, 128, 2);
		}
		
		// Vertical mortar lines
		for (let y = 0; y < 128; y += brickHeight * 2) {
			// First row of bricks
			for (let x = 0; x < 128; x += brickWidth) {
				ctx.fillRect(x, y, 2, brickHeight);
			}
			
			// Second row of bricks (offset)
			for (let x = brickWidth/2; x < 128; x += brickWidth) {
				ctx.fillRect(x, y + brickHeight, 2, brickHeight);
			}
		}
		
		// Add color variation to bricks
		for (let y = 0; y < 128; y += brickHeight) {
			for (let x = 0; x < 128; x += brickWidth/2) {
				// Skip every other brick in alternating rows for offset pattern
				if (y % (brickHeight*2) === 0 && x % brickWidth === brickWidth/2) continue;
				if (y % (brickHeight*2) !== 0 && x % brickWidth === 0) continue;
				
				if (Math.random() > 0.5) {
					ctx.fillStyle = brickVariation;
					ctx.globalAlpha = Math.random() * 0.3 + 0.1;
					ctx.fillRect(
						x + 2, 
						y + 2, 
						(x % brickWidth === 0 ? brickWidth : brickWidth/2) - 4, 
						brickHeight - 4
					);
					ctx.globalAlpha = 1.0;
				}
			}
		}
		
		// Add noise texture
		addNoise(ctx, 0.1);
		
		return canvas.toDataURL();
	}
	
	// Helper function to create a stone texture
	function createStoneDataURL(r, g, b) {
		const canvas = document.createElement('canvas');
		canvas.width = 128;
		canvas.height = 128;
		const ctx = canvas.getContext('2d');
		
		// Base color
		ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
		ctx.fillRect(0, 0, 128, 128);
		
		// Draw irregular stone patterns
		const stoneCount = 30;
		
		// First layer - dark mortar background
		ctx.fillStyle = `rgb(${Math.max(0, r-70)}, ${Math.max(0, g-70)}, ${Math.max(0, b-70)})`;
		ctx.fillRect(0, 0, 128, 128);
		
		// Second layer - stones
		for (let i = 0; i < stoneCount; i++) {
			// Random stone color variation
			const colorVar = Math.floor(Math.random() * 30);
			ctx.fillStyle = `rgb(${r + colorVar - 15}, ${g + colorVar - 15}, ${b + colorVar - 15})`;
			
			// Random stone shape (polygon)
			const centerX = Math.random() * 128;
			const centerY = Math.random() * 128;
			const vertices = 5 + Math.floor(Math.random() * 3); // 5-7 vertices
			const radius = 10 + Math.random() * 20;
			
			ctx.beginPath();
			for (let j = 0; j < vertices; j++) {
				const angle = (j / vertices) * Math.PI * 2;
				const jitter = 0.7 + Math.random() * 0.6; // Random radius per vertex
				const x = centerX + Math.cos(angle) * radius * jitter;
				const y = centerY + Math.sin(angle) * radius * jitter;
				
				if (j === 0) {
					ctx.moveTo(x, y);
				} else {
					ctx.lineTo(x, y);
				}
			}
			ctx.closePath();
			ctx.fill();
			
			// Add a slight highlight
			ctx.strokeStyle = `rgb(${Math.min(255, r+30)}, ${Math.min(255, g+30)}, ${Math.min(255, b+30)})`;
			ctx.lineWidth = 1;
			ctx.stroke();
		}
		
		// Add noise texture
		addNoise(ctx, 0.15);
		
		return canvas.toDataURL();
	}
	
	// Helper function to create a wood texture
	function createWoodDataURL(r, g, b) {
		const canvas = document.createElement('canvas');
		canvas.width = 128;
		canvas.height = 128;
		const ctx = canvas.getContext('2d');
		
		// Base wood color
		ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
		ctx.fillRect(0, 0, 128, 128);
		
		// Create wood grain effect
		const grainCount = 8; // Number of planks
		const plankHeight = canvas.height / grainCount;
		
		for (let i = 0; i < grainCount; i++) {
			// Slightly vary the wood color for each plank
			const rVar = r + Math.floor(Math.random() * 30) - 15;
			const gVar = g + Math.floor(Math.random() * 20) - 10;
			const bVar = b + Math.floor(Math.random() * 20) - 10;
			
			// Draw plank
			ctx.fillStyle = `rgb(${rVar}, ${gVar}, ${bVar})`;
			ctx.fillRect(0, i * plankHeight, canvas.width, plankHeight - 1);
			
			// Draw darker line between planks
			ctx.fillStyle = `rgb(${Math.max(0, r-70)}, ${Math.max(0, g-70)}, ${Math.max(0, b-70)})`;
			ctx.fillRect(0, i * plankHeight + plankHeight - 1, canvas.width, 1);
			
			// Add wood grain
			ctx.save();
			ctx.translate(0, i * plankHeight);
			ctx.beginPath();
			
			// Draw several grain lines
			const grainLines = 6 + Math.floor(Math.random() * 5);
			for (let j = 0; j < grainLines; j++) {
				const y = Math.random() * plankHeight;
				ctx.moveTo(0, y);
				
				// Create a wavy line for wood grain
				for (let x = 0; x < canvas.width; x += 4) {
					const jitter = Math.sin(x * 0.05) * 2 + Math.random() * 2 - 1;
					ctx.lineTo(x, y + jitter);
				}
			}
			
			ctx.strokeStyle = `rgba(${Math.max(0, r-40)}, ${Math.max(0, g-40)}, ${Math.max(0, b-40)}, 0.3)`;
			ctx.lineWidth = 1;
			ctx.stroke();
			ctx.restore();
		}
		
		// Add noise texture
		addNoise(ctx, 0.15);
		
		return canvas.toDataURL();
	}
	
	// Helper function to create a marble floor texture
	function createMarbleDataURL(r, g, b) {
		const canvas = document.createElement('canvas');
		canvas.width = 128;
		canvas.height = 128;
		const ctx = canvas.getContext('2d');
		
		// Base color
		ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
		ctx.fillRect(0, 0, 128, 128);
		
		// Create a checkerboard pattern for marble tiles
		const tileSize = 32;
		for (let y = 0; y < canvas.height; y += tileSize) {
			for (let x = 0; x < canvas.width; x += tileSize) {
				// Alternate tile colors
				if ((x / tileSize + y / tileSize) % 2 === 0) {
					ctx.fillStyle = `rgb(${Math.max(0, r-30)}, ${Math.max(0, g-30)}, ${Math.max(0, b-30)})`;
				} else {
					ctx.fillStyle = `rgb(${Math.min(255, r+15)}, ${Math.min(255, g+15)}, ${Math.min(255, b+15)})`;
				}
				ctx.fillRect(x, y, tileSize, tileSize);
				
				// Draw marble veins
				ctx.save();
				ctx.translate(x, y);
				ctx.beginPath();
				
				const veinCount = 3 + Math.floor(Math.random() * 3);
				for (let i = 0; i < veinCount; i++) {
					// Start position
					const startX = Math.random() * tileSize;
					const startY = Math.random() * tileSize;
					ctx.moveTo(startX, startY);
					
					// Create a curved vein
					const controlX1 = Math.random() * tileSize;
					const controlY1 = Math.random() * tileSize;
					const controlX2 = Math.random() * tileSize;
					const controlY2 = Math.random() * tileSize;
					const endX = Math.random() * tileSize;
					const endY = Math.random() * tileSize;
					
					ctx.bezierCurveTo(controlX1, controlY1, controlX2, controlY2, endX, endY);
				}
				
				// Color the veins with a slightly brighter color
				ctx.strokeStyle = `rgba(255, 255, 255, 0.3)`;
				ctx.lineWidth = 1;
				ctx.stroke();
				ctx.restore();
			}
		}
		
		// Add noise texture
		addNoise(ctx, 0.1);
		
		// Add a subtle grid for tile spacing
		ctx.strokeStyle = `rgba(100, 100, 100, 0.3)`;
		ctx.lineWidth = 1;
		for (let y = 0; y <= canvas.height; y += tileSize) {
			ctx.beginPath();
			ctx.moveTo(0, y);
			ctx.lineTo(canvas.width, y);
			ctx.stroke();
		}
		for (let x = 0; x <= canvas.width; x += tileSize) {
			ctx.beginPath();
			ctx.moveTo(x, 0);
			ctx.lineTo(x, canvas.height);
			ctx.stroke();
		}
		
		return canvas.toDataURL();
	}
	
	// Create a special gold texture for cheese
	function createGoldDataURL() {
		const canvas = document.createElement('canvas');
		canvas.width = 128;
		canvas.height = 128;
		const ctx = canvas.getContext('2d');
		
		// Base gold gradient
		const gradient = ctx.createLinearGradient(0, 0, 128, 128);
		gradient.addColorStop(0, 'rgb(255, 215, 0)');      // Pure gold
		gradient.addColorStop(0.5, 'rgb(230, 190, 40)');  // Slightly darker
		gradient.addColorStop(1, 'rgb(255, 235, 80)');    // Lighter gold
		
		ctx.fillStyle = gradient;
		ctx.fillRect(0, 0, 128, 128);
		
		// Add multiple highlight spots
		for (let i = 0; i < 3; i++) {
			const x = 20 + Math.random() * (canvas.width - 40);
			const y = 20 + Math.random() * (canvas.height - 40);
			const radius = 10 + Math.random() * 20;
			
			const shine = ctx.createRadialGradient(x, y, 0, x, y, radius);
			shine.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
			shine.addColorStop(0.3, 'rgba(255, 255, 220, 0.4)');
			shine.addColorStop(1, 'rgba(255, 215, 0, 0)');
			
			ctx.fillStyle = shine;
			ctx.fillRect(0, 0, 128, 128);
		}
		
		// Add golden sparkle effects
		for (let i = 0; i < 50; i++) {
			const x = Math.random() * canvas.width;
			const y = Math.random() * canvas.height;
			const size = Math.random() * 3 + 1;
			
			ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
			ctx.fillRect(x, y, size, size);
		}
		
		// Add texture pattern for detail
		for (let i = 0; i < 100; i++) {
			const x = Math.random() * canvas.width;
			const y = Math.random() * canvas.height;
			const size = Math.random() * 6 + 2;
			
			// Random gold flake colors
			const flakeColor = Math.random() > 0.5 
				? 'rgba(200, 180, 40, 0.3)' 
				: 'rgba(255, 240, 150, 0.3)';
				
			ctx.fillStyle = flakeColor;
			ctx.beginPath();
			ctx.arc(x, y, size, 0, Math.PI * 2);
			ctx.fill();
		}
		
		// Add subtle embossed effect
		ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
		ctx.lineWidth = 3;
		ctx.strokeRect(4, 4, canvas.width-8, canvas.height-8);
		
		ctx.strokeStyle = 'rgba(150, 120, 0, 0.3)';
		ctx.lineWidth = 3;
		ctx.strokeRect(7, 7, canvas.width-14, canvas.height-14);
		
		return canvas.toDataURL();
	}
	
	// Helper function to add noise to a texture
	function addNoise(ctx, intensity) {
		const imageData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
		const data = imageData.data;
		
		for (let i = 0; i < data.length; i += 4) {
			const noise = Math.random() * 2 - 1; // Value between -1 and 1
			
			// Apply noise with the given intensity
			data[i] = Math.max(0, Math.min(255, data[i] + noise * intensity * 50));
			data[i+1] = Math.max(0, Math.min(255, data[i+1] + noise * intensity * 50));
			data[i+2] = Math.max(0, Math.min(255, data[i+2] + noise * intensity * 50));
		}
		
		ctx.putImageData(imageData, 0, 0);
	}
	
	// Load textures from URLs
	try {
		const textures = {
			wall1: await loadTexture(gl, textureUrls.wall1),
			wall2: await loadTexture(gl, textureUrls.wall2),
			wall3: await loadTexture(gl, textureUrls.wall3),
			floor: await loadTexture(gl, textureUrls.floor),
			cheese: await loadTexture(gl, textureUrls.cheese)
		};
		
		// Hide loading screen when textures are loaded
		if (loadingScreen) {
			loadingScreen.style.opacity = '0';
			setTimeout(() => {
				loadingScreen.style.display = 'none';
			}, 500);
		}
		
		// Start game without minimap
		startGame(gl, shaderProgram3d, textures, canvas);
	} catch (error) {
		console.error('Error loading textures:', error);
		
		// Fallback to simple color textures if loading fails
		const createColorTexture = (gl, r, g, b) => {
			const texture = gl.createTexture();
			gl.bindTexture(gl.TEXTURE_2D, texture);
			const pixel = new Uint8Array([r, g, b, 255]); // r, g, b, alpha
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
			return texture;
		};
		
		const textures = {
			wall1: createColorTexture(gl, 120, 80, 40),     // Brown color for walls
			wall2: createColorTexture(gl, 140, 100, 60),    // Lighter brown for variety
			wall3: createColorTexture(gl, 100, 70, 30),     // Darker brown for variety
			floor: createColorTexture(gl, 100, 100, 100),   // Gray color for floor
			cheese: createColorTexture(gl, 255, 215, 0)     // Gold color for cheese
		};
		
		// Hide loading screen if there's an error
		if (loadingScreen) {
			loadingScreen.style.opacity = '0';
			setTimeout(() => {
				loadingScreen.style.display = 'none';
			}, 500);
		}
		
		// Start game without minimap
		startGame(gl, shaderProgram3d, textures, canvas);
	}
};

function startGame(gl, shaderProgram3d, textures, canvas) {
	//
	// Create content to display
	//
	const COLUMNS = 10; // number of columns (x direction) in the 2D maze
	const ROWS = 8;     // number of rows (y direction)
	const MARGIN = .5;
	const xlow = -MARGIN;
	const xhigh = COLUMNS + MARGIN;
	const ylow = -MARGIN;
	const yhigh = ROWS + MARGIN;
	const m = new Maze(COLUMNS, ROWS);
	const r = new Rat(.5, .5, 90, m);
	
	// Create cheese collectibles
	const cheeseItems = [];
	m.cheeseLocations.forEach(loc => {
		cheeseItems.push(new Cheese(loc.x, loc.y, gl));
	});
	
	// Create exit portal
	const exitPortal = new ExitPortal(m.exitLocation.x, m.exitLocation.y, 0.2);
	
	// Create continuous particle system for the portal
	const particleSystem = new ParticleSystem(
		m.exitLocation.x + 0.5, 
		m.exitLocation.y + 0.5, 
		0.3, 
		20, // 20 particles
		true // Continuous effect
	);
	
	// Update UI elements
	document.getElementById('total-cheese').textContent = cheeseItems.length;

	//
	// Setup keyboard events:
	//
	const TOP_VIEW = 0;
	const OBSERVATION_VIEW = 1;
	const RAT_VIEW = 2;

	let currentView = OBSERVATION_VIEW; // Start with observation view
	updateViewModeText();

	let spinLeft = false;
	let spinRight = false;
	let scurryForward = false;
	let gameComplete = false;

	// Performance optimization variables
	const RENDER_DISTANCE = 4; // Only render cells within this distance from the rat
	const LIGHTING_UPDATE_FREQ = 4; // Update lighting every N frames
	const USE_FRUSTUM_CULLING = true; // Skip rendering cells outside view frustum
	
	// Performance mode flag - can be toggled by user
	let highPerformanceMode = true;
	
	window.addEventListener("keydown", keyDown);
	function keyDown(event) {
		if (gameComplete) return; // Ignore input if game is complete
		
		if (event.code == 'KeyW') {
			scurryForward = true;
		}
		if (event.code == 'KeyA') {
			spinLeft = true;
		}
		if (event.code == 'KeyD') {
			spinRight = true;
		}
		if (event.code == 'KeyT') {
			currentView = TOP_VIEW;
			updateViewModeText();
		}
		if (event.code == 'KeyO') {
			currentView = OBSERVATION_VIEW;
			updateViewModeText();
		}
		if (event.code == 'KeyR') {
			currentView = RAT_VIEW;
			updateViewModeText();
		}
		if (event.code == 'KeyP') {
			// Toggle performance mode
			highPerformanceMode = !highPerformanceMode;
			
			// Update UI
			const performanceText = highPerformanceMode ? 'Performance Mode' : 'Quality Mode';
			document.getElementById('performance-mode').textContent = performanceText;
		}
	}
	
	function updateViewModeText() {
		const viewModeElement = document.getElementById('view-mode');
		if (viewModeElement) {
			if (currentView === TOP_VIEW) {
				viewModeElement.textContent = 'Top View';
			} else if (currentView === OBSERVATION_VIEW) {
				viewModeElement.textContent = 'Third-Person View';
			} else if (currentView === RAT_VIEW) {
				viewModeElement.textContent = 'First-Person View';
			}
		}
	}
	
	window.addEventListener("keyup", keyUp);
	function keyUp(event) {
		if (event.code == 'KeyW') {
			scurryForward = false;
		}
		if (event.code == 'KeyA') {
			spinLeft = false;
		}
		if (event.code == 'KeyD') {
			spinRight = false;
		}
	}

	//
	// Main render loop
	//
	let previousTime = 0;
	let frameCount = 0;
	let lastFpsUpdate = 0;
	const MAX_LIGHTS = 1; // Limit number of active lights for performance
	
	// Track cheese particle effects
	const cheeseEffects = [];
	
	function redraw(currentTime) {
		currentTime *= .001; // milliseconds to seconds
		let DT = currentTime - previousTime;
		if (DT > .1)
			DT = .1;
		previousTime = currentTime;
		
		// FPS counter update (once per second)
		frameCount++;
		if (currentTime - lastFpsUpdate >= 1.0) {
			const fps = Math.round(frameCount / (currentTime - lastFpsUpdate));
			document.getElementById('fps-counter').textContent = fps + ' FPS';
			frameCount = 0;
			lastFpsUpdate = currentTime;
		}

		// Setup the ProjectionViewMatrix at appropriate resolution based on performance mode
		let physicalToCSSPixelsRatio = highPerformanceMode ? 0.4 : 0.8;
		
		// Scale based on performance (use device pixel ratio only on fast devices)
		if (!highPerformanceMode && window.devicePixelRatio <= 2) {
			physicalToCSSPixelsRatio = Math.min(window.devicePixelRatio, 1.0);
		}
		
		canvas.width = canvas.clientWidth * physicalToCSSPixelsRatio;
		canvas.height = canvas.clientHeight * physicalToCSSPixelsRatio;
		gl.viewport(0, 0, canvas.width, canvas.height);

		// Set the view flag to help rendering decision
		shaderProgram3d.isTopView = (currentView === TOP_VIEW);
		
		// Set whether we're in rat view mode (for rat rendering)
		const isRatViewLoc = gl.getUniformLocation(shaderProgram3d, "isRatView");
		if (isRatViewLoc) {
			gl.uniform1i(isRatViewLoc, currentView === RAT_VIEW ? 1 : 0);
		}

		// Setup camera based on current view
		if (currentView == TOP_VIEW)
			setTopView(gl, shaderProgram3d, xlow, xhigh, ylow, yhigh, canvas.width / canvas.height);
		if (currentView == OBSERVATION_VIEW)
			setObservationView(gl, shaderProgram3d, COLUMNS, ROWS, canvas.width / canvas.height, r);
		if (currentView == RAT_VIEW)
			setRatsView(gl, shaderProgram3d, COLUMNS, ROWS, canvas.width / canvas.height, r);

		// Set enhanced lighting parameters
		// Add ambient light color - brightened for open ceiling
		const ambientLightLoc = gl.getUniformLocation(shaderProgram3d, "uAmbientLight");
		if (ambientLightLoc) {
			gl.uniform3fv(ambientLightLoc, [0.35, 0.35, 0.45]); // Increased ambient light
		}
		
		// Only update complex lighting in quality mode or infrequently in performance mode
		const updateLighting = !highPerformanceMode || (frameCount % LIGHTING_UPDATE_FREQ === 0);
		
		if (updateLighting) {
			// Add directional light (sunlight from above due to no ceiling)
			const directionalLightDirLoc = gl.getUniformLocation(shaderProgram3d, "uDirectionalLightDir");
			if (directionalLightDirLoc) {
				// Light coming from above (more direct downward angle for no ceiling)
				gl.uniform3fv(directionalLightDirLoc, [0.2, 0.2, -1.0]);
			}
			
			const directionalLightColorLoc = gl.getUniformLocation(shaderProgram3d, "uDirectionalLightColor");
			if (directionalLightColorLoc) {
				gl.uniform3fv(directionalLightColorLoc, [1.0, 0.97, 0.9]); // Brighter sunlight from above
			}
		}

		// Update game objects
		if (!gameComplete) {
			// Update the rat
			if (scurryForward) {
				r.scurryForward(DT);
			}
			if (spinLeft) {
				r.spinLeft(DT);
			}
			if (spinRight) {
				r.spinRight(DT);
			}
			
			// Update cheese collectibles
			let cheeseCollected = 0;
			for (const cheese of cheeseItems) {
				cheese.update(DT);
				
				// Check for collision with rat
				if (cheese.checkCollision(r)) {
					// Create a gold particle effect at cheese position - less particles in performance mode
					const particleCount = highPerformanceMode ? 10 : 20;
					const cheeseParticles = new ParticleSystem(
						cheese.x + 0.5, 
						cheese.y + 0.5, 
						cheese.z,
						particleCount,
						false // Non-continuous effect
					);
					
					// Override default colors with gold for cheese collection
					cheeseParticles.particles.forEach(p => {
						p.color = [1, 0.8, 0.2, 0.8]; // Gold color
						p.vz = 0.05 + Math.random() * 0.1; // Stronger upward velocity
						p.vx = (Math.random() - 0.5) * 0.08; // Wider spread
						p.vy = (Math.random() - 0.5) * 0.08;
						p.lifetime = highPerformanceMode ? 15 : 30; // Shorter lifetime in performance mode
					});
					
					cheeseParticles.activate();
					cheeseEffects.push(cheeseParticles); // Add to effects list
					
					// Update UI counter
					cheeseCollected++;
					document.getElementById('cheese-count').textContent = cheeseCollected;
				}
			}
			
			// Count actually collected cheese
			cheeseCollected = cheeseItems.filter(cheese => cheese.isCollected).length;
			document.getElementById('cheese-count').textContent = cheeseCollected;
			
			// Check if all cheese is collected
			const allCheeseCollected = cheeseItems.every(cheese => cheese.isCollected);
			if (allCheeseCollected) {
				// Activate exit portal
				exitPortal.activate();
				
				// Activate the portal particles
				particleSystem.activate();
				
				// Update goal indicator
				document.getElementById('goal-indicator').textContent = 'All cheese collected! Find the exit portal!';
				document.getElementById('goal-indicator').style.backgroundColor = 'rgba(0, 255, 0, 0.5)';
			}
			
			// Update exit portal
			exitPortal.update(DT);
			
			// Check if player has reached exit
			if (exitPortal.checkCollision(r, allCheeseCollected)) {
				gameComplete = true;
				document.getElementById('goal-indicator').textContent = 'Congratulations! You escaped the maze!';
				document.getElementById('goal-indicator').style.backgroundColor = 'rgba(0, 255, 128, 0.7)';
				document.getElementById('goal-indicator').style.fontSize = '20px';
			}
		}
		
		// Update particles
		particleSystem.update();
		
		// Update cheese particle effects
		for (let i = cheeseEffects.length - 1; i >= 0; i--) {
			const hasParticles = cheeseEffects[i].update();
			// Remove effects with no active particles
			if (!hasParticles && cheeseEffects[i].particles.length === 0) {
				cheeseEffects.splice(i, 1);
			}
		}

		// Draw everything
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
		
		// Use different render distances based on performance mode
		const effectiveRenderDistance = highPerformanceMode ? 2 : RENDER_DISTANCE;
		
		// Draw maze with optimization - only render cells near the player
		m.draw(gl, shaderProgram3d, textures, r.x, r.y, effectiveRenderDistance);
		
		// Draw rat
		r.draw(gl, shaderProgram3d);
		
		// Only update lighting calculations based on performance mode
		const lightingUpdateFrequency = highPerformanceMode ? LIGHTING_UPDATE_FREQ * 4 : LIGHTING_UPDATE_FREQ;
		if (frameCount % lightingUpdateFrequency === 0) {
			// Set lighting position for the shader
			const lightPositionLoc = gl.getUniformLocation(shaderProgram3d, "uLightPosition");
			if (lightPositionLoc) {
				// Dynamic light position that follows the rat
				if (currentView === RAT_VIEW) {
					// In first-person, light is near the player
					const radians = r.degrees * Math.PI / 180;
					const dx = Math.cos(radians);
					const dy = Math.sin(radians);
					gl.uniform3fv(lightPositionLoc, [r.x + dx * 0.5, r.y + dy * 0.5, 0.5]);
				} else {
					// Static light in other views
					gl.uniform3fv(lightPositionLoc, [COLUMNS / 2, ROWS / 2, 2.5]);
				}
			}
			
			// Set light color - warmer light
			const lightColorLoc = gl.getUniformLocation(shaderProgram3d, "uLightColor");
			if (lightColorLoc) {
				gl.uniform3fv(lightColorLoc, [1.0, 0.95, 0.8]); // Warm light color
			}
			
			// Set light attenuation (how quickly light fades with distance)
			const lightAttenuationLoc = gl.getUniformLocation(shaderProgram3d, "uLightAttenuation");
			if (lightAttenuationLoc) {
				gl.uniform3fv(lightAttenuationLoc, [1.0, 0.35, 0.44]); // Better attenuation values
			}
			
			// Set view position for the shader
			const viewPositionLoc = gl.getUniformLocation(shaderProgram3d, "uViewPosition");
			if (viewPositionLoc) {
				if (currentView === RAT_VIEW) {
					// In rat view, the eye position is the camera position
					const radians = r.degrees * Math.PI / 180;
					const dx = Math.cos(radians);
					const dy = Math.sin(radians);
					const eyeX = r.x + dx * 0.5; // Updated to match camera position
					const eyeY = r.y + dy * 0.5;
					gl.uniform3fv(viewPositionLoc, [eyeX, eyeY, 0.25]);
				} else if (currentView === OBSERVATION_VIEW) {
					// Position view from behind and above rat
					const ratRadians = r.degrees * Math.PI / 180;
					const behindX = r.x - Math.cos(ratRadians) * 3.5;
					const behindY = r.y - Math.sin(ratRadians) * 3.5;
					gl.uniform3fv(viewPositionLoc, [behindX, behindY, 3]);
				} else {
					gl.uniform3fv(viewPositionLoc, [COLUMNS / 2, ROWS / 2, 10]);
				}
			}
		}
		
		// Draw exit portal
		exitPortal.draw(gl, shaderProgram3d);
		
		// In performance mode, draw fewer particles to improve FPS
		if (!highPerformanceMode || frameCount % 2 === 0) {
			// Draw portal particles only if active
			if (particleSystem.active && particleSystem.particles.length > 0) {
				particleSystem.draw(gl, shaderProgram3d);
			}
			
			// Draw cheese effects (only every other frame in performance mode)
			if (cheeseEffects.length > 0) {
				for (const effect of cheeseEffects) {
					if (effect.particles.length > 0) {
						effect.draw(gl, shaderProgram3d);
					}
				}
			}
		}
		
		// Draw collectibles
		for (const cheese of cheeseItems) {
			if (!cheese.isCollected) {
				cheese.draw(gl, shaderProgram3d, textures.cheese);
			}
		}

		requestAnimationFrame(redraw);
	}
	requestAnimationFrame(redraw);
}

function setTopView(gl, shaderProgram, xlow, xhigh, ylow, yhigh, canvasAspect) {
	const projectionMatrix = mat4.create();
	const viewMatrix = mat4.create();

	const width = xhigh - xlow; // includes margins
	const height = yhigh - ylow;
	if (canvasAspect >= width / height) {
		const newWidth = canvasAspect * height;
		const xmid = (xlow + xhigh) / 2;
		const xlowNew = xmid - newWidth / 2;
		const xhighNew = xmid + newWidth / 2;
		mat4.ortho(projectionMatrix, xlowNew, xhighNew, ylow, yhigh, -10, 10);
	}
	else {
		const newHeight = width / canvasAspect;
		const ymid = (ylow + yhigh) / 2;
		const ylowNew = ymid - newHeight / 2;
		const yhighNew = ymid + newHeight / 2;
		mat4.ortho(projectionMatrix, xlow, xhigh, ylowNew, yhighNew, -10, 10);
	}
	
	// Use separate view and projection matrices
	gl.uniformMatrix4fv(gl.getUniformLocation(shaderProgram, "uProjectionMatrix"), false, projectionMatrix);
	gl.uniformMatrix4fv(gl.getUniformLocation(shaderProgram, "uViewMatrix"), false, viewMatrix);
}

function setObservationView(gl, shaderProgram, COLUMNS, ROWS, canvasAspect, rat) {
	const projectionMatrix = mat4.create();
	const viewMatrix = mat4.create();
	
	const fov = 75 * Math.PI / 180; // 75 degrees in radians
	const near = 0.1;
	const far = (COLUMNS + ROWS) * 2;
	mat4.perspective(projectionMatrix, fov, canvasAspect, near, far);

	// Position camera higher above the walls and further behind
	const offsetBehind = 2.0; // Distance behind rat
	const offsetHeight = 3.0; // Increased height to be above walls
	
	// Calculate position based on rat's position and angle
	const ratRadians = rat.degrees * Math.PI / 180;
	const dx = Math.cos(ratRadians);
	const dy = Math.sin(ratRadians);
	
	// Calculate the camera position - no wall check needed since we're above the walls
	const behindX = rat.x - dx * offsetBehind;
	const behindY = rat.y - dy * offsetBehind;
	
	const eye = [behindX, behindY, offsetHeight]; // Higher position above walls
	const at = [rat.x + dx * 0.5, rat.y + dy * 0.5, 0.3]; // Look at the rat
	const up = [0, 0, 1]; // Z is up
	mat4.lookAt(viewMatrix, eye, at, up);
	
	// Use separate view and projection matrices
	gl.uniformMatrix4fv(gl.getUniformLocation(shaderProgram, "uProjectionMatrix"), false, projectionMatrix);
	gl.uniformMatrix4fv(gl.getUniformLocation(shaderProgram, "uViewMatrix"), false, viewMatrix);
}

function setRatsView(gl, shaderProgram, COLUMNS, ROWS, canvasAspect, rat) {
	const projectionMatrix = mat4.create();
	const viewMatrix = mat4.create();
	
	const fov = 90 * Math.PI / 180; // 90 degrees in radians
	const near = 0.01;
	const far = (COLUMNS + ROWS) * 2;
	mat4.perspective(projectionMatrix, fov, canvasAspect, near, far);

	const eyeHeight = 0.25; // Height of rat's eyes
	
	// Calculate position based on rat's angle
	const radians = rat.degrees * Math.PI / 180;
	const dx = Math.cos(radians);
	const dy = Math.sin(radians);
	
	// Position the camera further forward (0.5 units forward instead of 0.3)
	// This ensures no part of the triangle is visible in first-person view
	const eyeX = rat.x + dx * 0.5;
	const eyeY = rat.y + dy * 0.5;
	const eye = [eyeX, eyeY, eyeHeight];
	
	// Look further ahead in the direction the rat is facing
	const at = [rat.x + dx * 3, rat.y + dy * 3, eyeHeight]; 
	
	const up = [0, 0, 1]; // Z is up
	mat4.lookAt(viewMatrix, eye, at, up);
	
	// Use separate view and projection matrices
	gl.uniformMatrix4fv(gl.getUniformLocation(shaderProgram, "uProjectionMatrix"), false, projectionMatrix);
	gl.uniformMatrix4fv(gl.getUniformLocation(shaderProgram, "uViewMatrix"), false, viewMatrix);
}

