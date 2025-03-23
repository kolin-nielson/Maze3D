precision mediump float;

uniform vec4 uColor;
uniform sampler2D uTexture;
uniform int uUseTexture;
uniform vec3 uLightPosition;
uniform vec3 uViewPosition;
uniform int uUseLighting;
uniform int isRatView;

// Enhanced lighting uniforms
uniform vec3 uLightColor;
uniform vec3 uLightAttenuation;
uniform vec3 uAmbientLight;
uniform vec3 uDirectionalLightDir;
uniform vec3 uDirectionalLightColor;

varying vec2 fragTexCoord;
varying vec3 fragNormal;
varying vec3 fragPosition;

// Fog calculation function
float calculateFog(float distance, float fogNear, float fogFar) {
    return clamp((distance - fogNear) / (fogFar - fogNear), 0.0, 1.0);
}

void main() {
    vec4 baseColor;
    
    // Determine base color (texture or uniform color)
    if (uUseTexture == 1) {
        baseColor = texture2D(uTexture, fragTexCoord);
    } else {
        baseColor = uColor;
    }
    
    // Apply lighting if enabled
    if (uUseLighting == 1) {
        // Normalize vectors
        vec3 norm = normalize(fragNormal);
        
        // Ambient lighting - use ambient light color
        vec3 ambient = uAmbientLight;
        
        // Point light calculations
        vec3 lightDir = normalize(uLightPosition - fragPosition);
        float distance = length(uLightPosition - fragPosition);
        
        // Point light attenuation (light falloff with distance)
        float attenuation = 1.0 / (uLightAttenuation.x + uLightAttenuation.y * distance + uLightAttenuation.z * distance * distance);
        
        // Diffuse lighting - using light color
        float diff = max(dot(norm, lightDir), 0.0);
        vec3 diffuse = diff * uLightColor * attenuation;
        
        // Specular lighting with Blinn-Phong model for better highlights
        float specularStrength = 0.6;
        vec3 viewDir = normalize(uViewPosition - fragPosition);
        vec3 halfwayDir = normalize(lightDir + viewDir);
        float spec = pow(max(dot(norm, halfwayDir), 0.0), 64.0); // Higher power for sharper highlights
        vec3 specular = specularStrength * spec * uLightColor * attenuation;
        
        // Directional light (like sunlight)
        vec3 dirLightDir = normalize(-uDirectionalLightDir);
        float dirDiff = max(dot(norm, dirLightDir), 0.0);
        vec3 dirDiffuse = dirDiff * uDirectionalLightColor * 0.3; // Lower intensity for directional light
        
        // Combine all lighting components
        vec3 lighting = ambient + diffuse + specular + dirDiffuse;
        
        // Apply fog in first-person view for depth perception
        vec4 finalColor = vec4(baseColor.rgb * lighting, baseColor.a);
        
        if (isRatView == 1) {
            // Calculate distance for fog effect
            float distance = length(fragPosition - uViewPosition);
            float fogAmount = calculateFog(distance, 1.0, 6.0);
            vec3 fogColor = vec3(0.1, 0.1, 0.2); // Dark blue fog
            
            // Mix base color with fog
            finalColor.rgb = mix(finalColor.rgb, fogColor, fogAmount);
        }
        
        gl_FragColor = finalColor;
    } else {
        gl_FragColor = baseColor;
    }
}
