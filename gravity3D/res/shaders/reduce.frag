precision highp float;
precision highp int;

const float PI = 3.14159265359;
const ivec2 TEX_SIZE = ivec2(128, 128);
const vec2 TEX_DIM = vec2(TEX_SIZE);

uniform sampler2D uTexture;

uniform bool uInitialReduce;

void main()
{
	int x = int(floor(gl_FragCoord.x));

	vec4 data;
	vec2 largestIndex = vec2(-1.0);
	float largestMass = -1.0;
	float count = 0.0;
	float lowestEmptyRow = TEX_DIM.y;

	if (uInitialReduce)
	{
		for (int c = 0; c < TEX_SIZE.x; ++c)
		{
			// Read from input texture
			data = texture2D(uTexture, (vec2(c, x) + vec2(0.5)) / TEX_DIM);
			if (data.w > 0.0)
			{
				count += 1.0;
				if (data.w > largestMass)
				{
					largestMass = data.w;
					largestIndex = vec2(c, x);
				}
			}
		}

	} else { // cols
		float col;
		for (int c = 0; c < TEX_SIZE.x; ++c)
		{
			// Read from input texture
			data = texture2D(uTexture, (vec2(c, x) + vec2(0.5)) / TEX_DIM);
			if (data.w > 0.0)
			{
				count += data.w;
				if (data.z > largestMass)
				{
					largestMass = data.z;
					largestIndex = data.xy;
				}
			}
			else if ((col = float(c)) < lowestEmptyRow)
			{
				lowestEmptyRow = col;
			}
		}
	}

	// output new position
	if (uInitialReduce)
		gl_FragColor = vec4(largestIndex, largestMass, count);
	else
		gl_FragColor = vec4(largestIndex, lowestEmptyRow, count);
}
