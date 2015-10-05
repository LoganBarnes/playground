precision highp float;
precision highp int;

attribute vec3 aPosition;
attribute vec3 aNormal;
attribute vec2 aTexCoord;

varying vec2 vTexc;
varying vec3 vVertex;	// Vertex, in world space
varying vec3 vNormal;	// Normal of the vertex, in world space

uniform mat4 uPVMatrix;
uniform mat4 uMMatrix;
uniform mat4 uMMatrixIT;

void main() 
{
	vTexc = aTexCoord;
	
	vec4 vertexWorld = uMMatrix * vec4(aPosition, 1.0);

	vVertex = vec3(vertexWorld);
	vNormal = normalize(mat3(uMMatrixIT) * aNormal);

	gl_Position = uPVMatrix * vertexWorld;
}
