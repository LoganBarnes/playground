precision highp float;
precision highp int;

const vec3 lightDirection = vec3(1, -1, -1);

varying vec2 texc;
varying vec3 normalCameraSpace;		// Normal of the vertex, in eye space

// // only need these for relection/refraction
// varying vec3 vertexCameraSpace;		// The position of the vertex, in eye space
// varying vec3 vertexToEye;			// Vector from the vertex to the eye

uniform vec3 uColor;

uniform sampler2D uTexture;
uniform int uUseTexture;

void main(){

	// calculate lighting
	float diffuseIntensity = max(0.0, dot(normalize(-lightDirection), normalCameraSpace));
	vec3 color = uColor * min(1.0, diffuseIntensity + 0.2); // plus ambient

	vec3 texColor = texture2D(uTexture, texc).rgb;
	texColor = clamp(texColor + vec3(1 - uUseTexture), 0.0, 1.0);
	gl_FragColor = vec4(color * texColor, 1.0);
}
