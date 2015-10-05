precision highp float;
precision highp int;

const float PI = 3.14159265359;
const float DENSITY = 50.0;

attribute float aPosition;

uniform mat4 uMVMatrix;
uniform mat4 uPMatrix;

uniform float uTextureSize;
uniform int uScreenHeight;

uniform sampler2D uTexture;

varying vec4 vColor;
varying float vUseParticle;

void main(void) {

	vec2 tCoord = vec2(mod(aPosition, uTextureSize), floor(aPosition / uTextureSize));
	tCoord += vec2(0.5);
	tCoord *= 1.0 / uTextureSize;

	vec4 position = texture2D(uTexture, tCoord);

	if (position.w == 0.0)
	{
		vUseParticle = 0.0;
		gl_Position = vec4(0.0);
		return;
	}
	vUseParticle = 1.0;

	 // function of mass and density
	float radius = pow((3.0 * position.w) / (DENSITY * 4.0 * PI), 1.0 / 3.0);

	gl_Position = uPMatrix * uMVMatrix * vec4(position.xyz, 1.0);
	gl_PointSize = float(uScreenHeight) * uPMatrix[1][1] * radius / gl_Position.w;
	vColor = vec4(1.0, 1.0 - (position.w - 200.0) / 200.0, 1.0 - position.w / 200.0, 1.0);
	vColor = clamp(vColor, 0.0, 1.0);
}
