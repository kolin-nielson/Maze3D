precision mediump float;

attribute vec3 vertPosition;
attribute vec2 vertTexCoord;
attribute vec3 vertNormal;

uniform mat4 uModelMatrix;
uniform mat4 uViewMatrix;
uniform mat4 uProjectionMatrix;

varying vec2 fragTexCoord;
varying vec3 fragNormal;
varying vec3 fragPosition;

void main() {
    fragTexCoord = vertTexCoord;
    
    // Calculate the normal in world space
    fragNormal = (uModelMatrix * vec4(vertNormal, 0.0)).xyz;
    
    // Calculate the position in world space
    vec4 worldPosition = uModelMatrix * vec4(vertPosition, 1.0);
    fragPosition = worldPosition.xyz;
    
    // Calculate final position
    gl_Position = uProjectionMatrix * uViewMatrix * worldPosition;
}
