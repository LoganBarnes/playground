precision highp float;
precision highp int;

const float EPS = 0.0001;
const float BIG = 10000.0;

const int MAX_LIGHTS = 10;

varying vec2 vTexc;
varying vec3 vVertex;	// Vertex, in world space
varying vec3 vNormal;	// Normal of the vertex, in world space

struct Light {
	int type; // 0: point, 1: directional
	vec3 posDir;
	vec3 radiance;
};

uniform Light uLights[MAX_LIGHTS];
uniform float uLightScale;
uniform vec3 uAmbientRadiance;

uniform vec3 uLightLocation;
uniform vec3 uColor;
uniform vec4 uShapeSettings; // shine, reflective index, useTexture, isLight
uniform sampler2D uTexture;

void main(){

	if (dot(uLightScale, uLightScale) <= EPS * EPS) // no light in scene
	{
		gl_FragColor = vec4(0, 0, 0, 1);
		return;
	}

	vec3 color = vec3(0.0);
	if (uShapeSettings[3] < 0.5)
	{
		vec3 vToL;
		float cosTheta, diffuseIntensity;

		// iterate through lights
		Light light;
		for (int i = 0; i < MAX_LIGHTS; ++i)
		{
			light = uLights[i];
			if (light.type == -1)
				break;

			if (light.type == 0) // point
				vToL = normalize(light.posDir - vVertex);
			if (light.type == 1) // directional
				vToL = -light.posDir;
				
			// check angle between light source and normal
			cosTheta = dot(vToL, vNormal);

			// calculate lighting
			diffuseIntensity = max(0.0, cosTheta);
			color += light.radiance * min(1.0, diffuseIntensity);
		}

		color *= uColor;
		color += uColor * uAmbientRadiance;
		
		if (uShapeSettings[2] > 0.5)
		{
			color *= texture2D(uTexture, vTexc).xyz;
		}

		color /= uLightScale;

	}
	else
	{
		color = uColor;
	}
	color = clamp(color, 0.0, 1.0);
	gl_FragColor = vec4(color, 1.0);
}
