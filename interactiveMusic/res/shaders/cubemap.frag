precision highp float;
precision highp int;

varying vec3 texcoord;

uniform int uUseTex;
uniform samplerCube uEnvMap;

void main () {
	if (uUseTex == 1)
		gl_FragColor = textureCube(uEnvMap, texcoord);
	else
		gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
}
