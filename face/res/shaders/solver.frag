precision highp float;
precision highp int;

const float PI = 3.14159265359;
const ivec2 TEX_SIZE = ivec2(256, 256);

uniform sampler2D uTexture;
uniform vec2 uTexDim;

uniform bool uGradient;
uniform bool uRows;

void main()
{
	int x = int(floor(gl_FragCoord.x));
	int y = int(floor(gl_FragCoord.y));

	vec4 result = vec4(0.0);

	if (uGradient)
	{
		float neg = -texture2D(uTexture, (vec2(x - 1, y) + vec2(0.5)) / uTexDim).x;
		float pos =  texture2D(uTexture, (vec2(x + 1, y) + vec2(0.5)) / uTexDim).x;

		result.x = pos + neg;

		neg = -texture2D(uTexture, (vec2(x, y - 1) + vec2(0.5)) / uTexDim).x;
		pos =  texture2D(uTexture, (vec2(x, y + 1) + vec2(0.5)) / uTexDim).x;

		result.y = pos + neg;
		result.z = length(result.xy);
		result.w = atan(result.y, result.x);
	}
	else // ifft
	{
		if (uRows)
		{
			vec4 data;
			vec2 curr;

			float coeff2 = 2.0 * PI * float(y) / uTexDim.y;
			float c = (float(x) + 0.5) / uTexDim.x;
			float r;

			for (int row = 0; row < TEX_SIZE.y; ++row)
			{
				r = float(row);

				// Read from input texture
				data = texture2D(uTexture, vec2(c, (r + 0.5) / uTexDim.y));
				curr = vec2( cos(coeff2 * r), sin(coeff2 * r) );

				// complex number multiplication
				result.x += data.x * curr.x - data.y * curr.y;
				result.y += data.x * curr.y + data.y * curr.x;
			}
		}
		else // cols
		{
			vec2 rowData, colData;
			float bw = 0.0;

			float coeff1 = 2.0 * PI * float(x) / uTexDim.x;
			float r = (float(y) + 0.5) / uTexDim.y;
			float c;

			for (int col = 0; col < TEX_SIZE.x; ++col)
			{
				c = float(col);

				// get row computation
				rowData = texture2D(uTexture, vec2((c + 0.5) / uTexDim.x, r)).xy;
				colData = vec2( cos(coeff1 * c), sin(coeff1 * c) );

				// real part of complex number multiplication
				bw += rowData.x * colData.x - rowData.y * colData.y;
			}

			// original bw image
			result = vec4( bw / (uTexDim.x * uTexDim.y) );
			result.w = 1.0;
		}
	}

	// output new result
	gl_FragColor = result;
}
