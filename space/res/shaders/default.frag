precision highp float;
precision highp int;

const float EPS = 0.0001;
const float BIG = 10000.0;

const int MAX_LIGHTS = 10;

varying vec2 vTexc;
varying vec3 vVertex;	// Vertex, in world space
varying vec3 vNormal;	// Normal of the vertex, in world space

varying vec4 vShadowCoord;

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
uniform sampler2D uShapeTexture;

uniform sampler2D uShadowMap;

float random(in vec3 vSeed, in int iSeed)
{
	float dot_product = dot(vec4(vSeed, iSeed), vec4(12.9898,78.233,45.164,94.673));
	return fract(sin(dot_product) * 43758.5453);
}


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

		float bias = 0.005 * tan(acos(cosTheta)); // cosTheta is dot( n,l ), clamped between 0 and 1
		bias = clamp(bias, 0.0, 0.01);

		vec2 poissonDisk[16];
		poissonDisk[ 0] = vec2(-0.003, -0.003);
		poissonDisk[ 1] = vec2(-0.001, -0.003);
		poissonDisk[ 2] = vec2( 0.001, -0.003);
		poissonDisk[ 3] = vec2( 0.003, -0.003);
		poissonDisk[ 4] = vec2(-0.003, -0.001);
		poissonDisk[ 5] = vec2(-0.001, -0.001);
		poissonDisk[ 6] = vec2( 0.001, -0.001);
		poissonDisk[ 7] = vec2( 0.003, -0.001);
		poissonDisk[ 8] = vec2(-0.003,  0.001);
		poissonDisk[ 9] = vec2(-0.001,  0.001);
		poissonDisk[10] = vec2( 0.001,  0.001);
		poissonDisk[11] = vec2( 0.003,  0.001);
		poissonDisk[12] = vec2(-0.003,  0.003);
		poissonDisk[13] = vec2(-0.001,  0.003);
		poissonDisk[14] = vec2( 0.001,  0.003);
		poissonDisk[15] = vec2( 0.003,  0.003);

		float vis = 1.0;
		for (int i = 0; i < 16; ++i)
		{
			if (texture2D( uShadowMap, vShadowCoord.xy + poissonDisk[i] * 0.25).z  <  vShadowCoord.z-bias )
				vis -= (0.95 / 16.0);
		}

		// color *= vis;
		color += uColor * uAmbientRadiance;
		
		if (uShapeSettings[2] > 0.0)
		{
			color *= texture2D(uShapeTexture, vTexc * uShapeSettings[2]).xyz;
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
