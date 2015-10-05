precision highp float;
precision highp int;

uniform mat4 uMVMatrix;

varying vec4 vColor;
varying float vUseParticle;

const vec3 lightDirection = vec3(0, -1, -1);

void main()
{
	if (vUseParticle < 0.5)
		discard;

	vec3 lightDir = normalize(mat3(uMVMatrix) * -lightDirection);
	
	// calculate normal from texture coordinates
	vec3 N;
	N.xy = gl_PointCoord * vec2(2.0, -2.0) + vec2(-1.0, 1.0);
	float mag = dot(N.xy, N.xy);

	if (mag > 1.0) discard; // kill pixels outside circle

	N.z = sqrt(1.0 - mag);

	// calculate lighting
	vec3 diffuse = vec3(max(0.0, dot(lightDir, N)));
	vec3 shadingColor = diffuse + vec3(.3); // plus ambient

	gl_FragColor = vec4(vColor.xyz * shadingColor, vColor.w);
}
