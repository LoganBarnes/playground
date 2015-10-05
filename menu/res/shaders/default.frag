precision highp float;
precision highp int;

const float EPS = 0.0001;
const float BIG = 10000.0;
const float PI = 3.1415926536;

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
uniform vec4 uShapeSettings; // isMusicIcon, isRenderIcon, useTexture, isLight
uniform sampler2D uShapeTexture;

uniform samplerCube uCubeMap;
uniform vec4 uEyePos;


void main(){

	if (dot(uLightScale, uLightScale) <= EPS * EPS) // no light in scene
	{
		gl_FragColor = vec4(0, 0, 0, 1);
		return;
	}

	vec3 normal = vNormal;
	if (uShapeSettings[1] > 0.5)
	{
		float theta = acos(vNormal.y);
		float phi = atan(vNormal.z, vNormal.x);

		mat3 rot = mat3(1.0);
		rot = mat3(1, 0, 0, 0, 0, -1, 0, 1, 0); // rotate up
		rot = mat3(cos(theta),-sin(theta), 0, sin(theta), cos(theta), 0, 0, 0, 1) * rot; // rotate down by theta
		rot = mat3(cos(phi), 0, sin(phi), 0, 1, 0, -sin(phi), 0, cos(phi)) * rot; // rotate around by phi

		normal = rot * (texture2D(uShapeTexture, vTexc).xyz * 2.0 - vec3(1.0));
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
			cosTheta = dot(vToL, normal);

			// calculate lighting
			diffuseIntensity = max(0.0, cosTheta);
			color += light.radiance * min(1.0, diffuseIntensity);
		}

		color *= uColor;
		color += uColor * uAmbientRadiance;
		
		if (uShapeSettings[2] > 0.5)
		{
			color *= texture2D(uShapeTexture, vTexc).xyz;
		}
		if (uShapeSettings[1] > 0.5)
		{
			color *= textureCube(uCubeMap, normal).xyz;

			for (int i = 0; i < MAX_LIGHTS; ++i)
			{
				light = uLights[i];
				if (light.type == -1)
					break;

				if (light.type == 0) // point
					vToL = normalize(light.posDir - vVertex);
				if (light.type == 1) // directional
					vToL = -light.posDir;
				
				// Add specular component
				vec3 lightReflection = normalize(reflect(-vToL, normal));
				vec3 eyeDirection = normalize(vec3(uEyePos) - vVertex);
				float specIntensity = pow(max(0.0, dot(eyeDirection, lightReflection)), 64.0);
				color += max(vec3(0), light.radiance * specIntensity);
	        }
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
