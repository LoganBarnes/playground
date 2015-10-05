precision highp float;
precision highp int;

uniform samplerCube uEnvMap;

varying vec3 texcoord;

void main () {
	gl_FragColor = textureCube(uEnvMap, texcoord);
}
