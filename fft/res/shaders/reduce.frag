precision highp float;
precision highp int;

const float PI = 3.14159265359;
const ivec2 TEX_SIZE = ivec2(256, 256);

uniform sampler2D uTexture;
uniform vec2 uTexDim;

uniform bool uFFT; // unused
uniform bool uRows;

void main()
{
	int x = int(floor(gl_FragCoord.x));
	int y = int(floor(gl_FragCoord.y));

	vec4 data;
	float max = -1.0;

	if (uRows) // rows
	{
		ivec2 fragCoord = ivec2(floor(gl_FragCoord.x), floor(gl_FragCoord.y));
		for (int r = 0; r < TEX_SIZE.y; ++r)
		{
			// Read from input texture
			data = texture2D(uTexture, (vec2(x, r) + vec2(0.5)) / uTexDim);
			if (data.z > max)
				max = data.z;

		}
	} else { // cols
		ivec2 fragCoord = ivec2(floor(gl_FragCoord.x), floor(gl_FragCoord.y));
		for (int c = 0; c < TEX_SIZE.x; ++c)
		{
			// Read from input texture
			data = texture2D(uTexture, (vec2(c, y) + vec2(0.5)) / uTexDim);
			if (data.z > max)
				max = data.z;

		}
	}

	// output new position
	gl_FragColor = vec4(max);
}
