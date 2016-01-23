precision highp float;
precision highp int;

const float PI = 3.14159265359;
// const ivec2 TEX_SIZE = ivec2(256, 256);
const int numOrientations = 9;
const int cellSize = 3;
const float B = -1.025993075698850898191949454485438764095306396484375;


// solver modes
const int UNMAPPED  = 0;
const int HOG 		= 1;
const int NORM 		= 2;
const int FEATURES 	= 3;
const int FIND 		= 4;
const int REDUCE1 	= 5;
const int REDUCE2 	= 6;

uniform sampler2D uTexture1;
uniform sampler2D uTexture2;
uniform vec2 uTexDim1;
uniform vec2 uTexDim2;
uniform ivec2 uWorkDim;

uniform int uSolveMode;


void main()
{
	int threadX = int(floor(gl_FragCoord.x));
	int threadY = int(floor(gl_FragCoord.y));

	vec4 result = vec4(0.0);

	if (threadX < uWorkDim.x && threadY < uWorkDim.y)
	{


/*

8 8888888888   8 8888888888            .8.    8888888 8888888888 8 8888      88 8 888888888o.   8 8888888888     d888888o.   
8 8888         8 8888                 .888.         8 8888       8 8888      88 8 8888    `88.  8 8888         .`8888:' `88. 
8 8888         8 8888                :88888.        8 8888       8 8888      88 8 8888     `88  8 8888         8.`8888.   Y8 
8 8888         8 8888               . `88888.       8 8888       8 8888      88 8 8888     ,88  8 8888         `8.`8888.     
8 888888888888 8 888888888888      .8. `88888.      8 8888       8 8888      88 8 8888.   ,88'  8 888888888888  `8.`8888.    
8 8888         8 8888             .8`8. `88888.     8 8888       8 8888      88 8 888888888P'   8 8888           `8.`8888.   
8 8888         8 8888            .8' `8. `88888.    8 8888       8 8888      88 8 8888`8b       8 8888            `8.`8888.  
8 8888         8 8888           .8'   `8. `88888.   8 8888       ` 8888     ,8P 8 8888 `8b.     8 8888        8b   `8.`8888. 
8 8888         8 8888          .888888888. `88888.  8 8888         8888   ,d8P  8 8888   `8b.   8 8888        `8b.  ;8.`8888 
8 8888         8 888888888888 .8'       `8. `88888. 8 8888          `Y88888P'   8 8888     `88. 8 888888888888 `Y8888P ,88P' 

*/
		/*
		 * FEATURES
		 *
		 * uTexture = "hog"
		 * uTexDim1 = hogTexDim (hogWidth * 5, hogHeight)
		 * uWorkDim = featTexDim (hogWidth * 4, hogHeight * 2)
		 * uTexture = "norm"
		 * uTexDim2 = hogDim
		 */
		if (uSolveMode == FEATURES)
		{
			int x4 = threadX;
			int x = x4 / 4;
			int y2 = threadY;
			int y = y2 / 2;

            int oBlock = int(mod(float(x4), 4.0)) + int(mod(float(y2), 2.0)) * 4;

            /* norm of upper-left, upper-right, ... blocks */
            int xm = int(max(float(x - 1), 0.0));
            int xp = int(min(float(x + 1), uTexDim2.x - 1.0));
            int ym = int(max(float(y - 1), 0.0));
            int yp = int(min(float(y + 1), uTexDim2.y - 1.0));

            vec4 n1 = texture2D(uTexture2, (vec2(xm, ym) + vec2(0.5)) / uTexDim2);
            vec4 n2 = texture2D(uTexture2, (vec2(x , ym) + vec2(0.5)) / uTexDim2);
            vec4 n3 = texture2D(uTexture2, (vec2(xp, ym) + vec2(0.5)) / uTexDim2);
            vec4 n4 = texture2D(uTexture2, (vec2(xm, y ) + vec2(0.5)) / uTexDim2);
            vec4 n5 = texture2D(uTexture2, (vec2(x , y ) + vec2(0.5)) / uTexDim2);
            vec4 n6 = texture2D(uTexture2, (vec2(xp, y ) + vec2(0.5)) / uTexDim2);
            vec4 n7 = texture2D(uTexture2, (vec2(xm, yp) + vec2(0.5)) / uTexDim2);
            vec4 n8 = texture2D(uTexture2, (vec2(x , yp) + vec2(0.5)) / uTexDim2);
            vec4 n9 = texture2D(uTexture2, (vec2(xp, yp) + vec2(0.5)) / uTexDim2);

            float norm1 = n1.x;
            float norm2 = n2.x;
            float norm3 = n3.x;
            float norm4 = n4.x;
            float norm5 = n5.x;
            float norm6 = n6.x;
            float norm7 = n7.x;
            float norm8 = n8.x;
            float norm9 = n9.x;

            float factor1, factor2, factor3, factor4;

            float t1 = 0.0;
            float t2 = 0.0;
            float t3 = 0.0;
            float t4 = 0.0;

            /* as implemented in UOCTTI code */
            factor1 = 1.0 / sqrt(norm1 + norm2 + norm4 + norm5 + 1e-4);
            factor2 = 1.0 / sqrt(norm2 + norm3 + norm5 + norm6 + 1e-4);
            factor3 = 1.0 / sqrt(norm4 + norm5 + norm7 + norm8 + 1e-4);
            factor4 = 1.0 / sqrt(norm5 + norm6 + norm8 + norm9 + 1e-4);

            int o;
            float ofl;
            for (int k = 0; k < numOrientations; ++k)
            {
	            float ha, hb, hc;

                o = k;
                ofl = float(o);
                vec4 data = texture2D(uTexture1, (vec2(x * 5 + (o / 4), y) + vec2(0.5)) / uTexDim1);
                {
                    if (int(mod(ofl, 4.0)) == 0)
                        ha = data.x;
                    else if (int(mod(ofl, 4.0)) == 1)
                        ha = data.y;
                    else if (int(mod(ofl, 4.0)) == 2)
                        ha = data.z;
                    else // o % 4 == 3
                        ha = data.w;
                }

                o = k + numOrientations;
                ofl = float(o);
                data = texture2D(uTexture1, (vec2(x * 5 + (o / 4), y) + vec2(0.5)) / uTexDim1);
                {
                    if (int(mod(ofl, 4.0)) == 0)
                        hb = data.x;
                    else if (int(mod(ofl, 4.0)) == 1)
                        hb = data.y;
                    else if (int(mod(ofl, 4.0)) == 2)
                        hb = data.z;
                    else // o % 4 == 3
                        hb = data.w;
                }

                float ha1 = factor1 * ha;
                float ha2 = factor2 * ha;
                float ha3 = factor3 * ha;
                float ha4 = factor4 * ha;

                float hb1 = factor1 * hb;
                float hb2 = factor2 * hb;
                float hb3 = factor3 * hb;
                float hb4 = factor4 * hb;

                float hc1 = ha1 + hb1;
                float hc2 = ha2 + hb2;
                float hc3 = ha3 + hb3;
                float hc4 = ha4 + hb4;

                ha1 = min(0.2, ha1);
                ha2 = min(0.2, ha2);
                ha3 = min(0.2, ha3);
                ha4 = min(0.2, ha4);

                hb1 = min(0.2, hb1);
                hb2 = min(0.2, hb2);
                hb3 = min(0.2, hb3);
                hb4 = min(0.2, hb4);

                hc1 = min(0.2, hc1);
                hc2 = min(0.2, hc2);
                hc3 = min(0.2, hc3);
                hc4 = min(0.2, hc4);

                t1 += hc1;
                t2 += hc2;
                t3 += hc3;
                t4 += hc4;

                ha = 0.5 * (ha1 + ha2 + ha3 + ha4);
                hb = 0.5 * (hb1 + hb2 + hb3 + hb4);
                hc = 0.5 * (hc1 + hc2 + hc3 + hc4);

                o = k;
                ofl = float(o);
                if (o / 4 == oBlock)
                {
                    if (int(mod(ofl, 4.0)) == 0)
                        result.x = ha;
                    else if (int(mod(ofl, 4.0)) == 1)
                        result.y = ha;
                    else if (int(mod(ofl, 4.0)) == 2)
                        result.z = ha;
                    else // o % 4 == 3
                        result.w = ha;
                }

                o = k + numOrientations;
                ofl = float(o);
                if (o / 4 == oBlock)
                {
                    if (int(mod(ofl, 4.0)) == 0)
                        result.x = hb;
                    else if (int(mod(ofl, 4.0)) == 1)
                        result.y = hb;
                    else if (int(mod(ofl, 4.0)) == 2)
                        result.z = hb;
                    else // o % 4 == 3
                        result.w = hb;
                }

                o = k + numOrientations * 2;
                ofl = float(o);
                if (o / 4 == oBlock)
                {
                    if (int(mod(ofl, 4.0)) == 0)
                        result.x = hc;
                    else if (int(mod(ofl, 4.0)) == 1)
                        result.y = hc;
                    else if (int(mod(ofl, 4.0)) == 2)
                        result.z = hc;
                    else // o % 4 == 3
                        result.w = hc;
                }

            } /* k */

            if (oBlock == 7)
            {
                result.x = (1.0 / sqrt(18.0)) * t1;
                result.y = (1.0 / sqrt(18.0)) * t2;
                result.z = (1.0 / sqrt(18.0)) * t3;
                result.w = (1.0 / sqrt(18.0)) * t4;
             }
		} /* END FEATURES */
	}

	// output new result
	gl_FragColor = result;
}
