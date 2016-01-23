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
                                                     
8 8888        8     ,o888888o.         ,o888888o.    
8 8888        8  . 8888     `88.      8888     `88.  
8 8888        8 ,8 8888       `8b  ,8 8888       `8. 
8 8888        8 88 8888        `8b 88 8888           
8 8888        8 88 8888         88 88 8888           
8 8888        8 88 8888         88 88 8888           
8 8888888888888 88 8888        ,8P 88 8888   8888888 
8 8888        8 `8 8888       ,8P  `8 8888       .8' 
8 8888        8  ` 8888     ,88'      8888     ,88'  
8 8888        8     `8888888P'         `8888888P'    

*/
		/*
		 * HOG
		 *
		 * uTexture = "unmapped"
		 * uTexDim1 = unmappedDim (imgDim - 2)
		 * uWorkDim = hogTexDim (hogWidth * 5, hogHeight)
		 * uTexture = X
		 * uTexDim2 = X
		 */
		if (uSolveMode == HOG)
		{
			int c5 = threadX;
			int c = c5 / 5;
			int r = threadY;

            int oBlock = int(mod(float(c5), 5.0));
            int row, col;
            float o, val;
            int orientation;
            float sqrt2 = sqrt(2.0);

            vec4 data;
            ivec2 texDim1i = ivec2(uTexDim1);

            for (int y = -cellSize; y < cellSize; ++y)
            {
                row = r * cellSize + y;
                if (row < 0 || row >= texDim1i.y)
                    continue;

                for (int x = -cellSize; x < cellSize; ++x)
                {
                    col = c * cellSize + x;
                    if (col < 0 || col >= texDim1i.x)
                        continue;

                    data = texture2D(uTexture1, (vec2(col, row) + vec2(0.5)) / uTexDim1);
                    if (x < 0 && y < 0)
                        val = data.z;
                    else if (x < 0 && y >= 0)
                        val = data.y;
                    else if (x >= 0 && y < 0)
                        val = data.w;
                    else // x >= 0 && y >= 0
                        val = data.x;

                    // val = mod(val, &o) * sqrt2;
                    o = floor(abs(val));
                    orientation = int(o);

                    if (val > 0.0)
                    	val = (val - o) * sqrt2;
                	else
                    	val = (val + o) * sqrt2;
                    		
                    if (orientation / 4 == oBlock)
                    {
                        if (int(mod(o, 4.0)) == 0)
                            result.x += val;
                        else if (int(mod(o, 4.0)) == 1)
                            result.y += val;
                        else if (int(mod(o, 4.0)) == 2)
                            result.z += val;
                        else // o % 4 == 3
                            result.w += val;
                    }
                } // x
            } // y
		} /* END HOG */


/*
                                                              .         .           
b.             8     ,o888888o.     8 888888888o.            ,8.       ,8.          
888o.          8  . 8888     `88.   8 8888    `88.          ,888.     ,888.         
Y88888o.       8 ,8 8888       `8b  8 8888     `88         .`8888.   .`8888.        
.`Y888888o.    8 88 8888        `8b 8 8888     ,88        ,8.`8888. ,8.`8888.       
8o. `Y888888o. 8 88 8888         88 8 8888.   ,88'       ,8'8.`8888,8^8.`8888.      
8`Y8o. `Y88888o8 88 8888         88 8 888888888P'       ,8' `8.`8888' `8.`8888.     
8   `Y8o. `Y8888 88 8888        ,8P 8 8888`8b          ,8'   `8.`88'   `8.`8888.    
8      `Y8o. `Y8 `8 8888       ,8P  8 8888 `8b.       ,8'     `8.`'     `8.`8888.   
8         `Y8o.`  ` 8888     ,88'   8 8888   `8b.    ,8'       `8        `8.`8888.  
8            `Yo     `8888888P'     8 8888     `88. ,8'         `         `8.`8888. 

*/
		/*
		 * NORM
		 *
		 * uTexture = "hog"
		 * uTexDim1 = hogTexDim (hogWidth * 5, hogHeight)
		 * uWorkDim = hogDim
		 * uTexture = X
		 * uTexDim2 = X
		 */
		if (uSolveMode == NORM)
		{
			int c = threadX;
			int r = threadY;

            // calculate surface norms
            vec4 h1 = texture2D(uTexture1, (vec2(c * 5    , r) + vec2(0.5)) / uTexDim1);
            vec4 h2 = texture2D(uTexture1, (vec2(c * 5 + 1, r) + vec2(0.5)) / uTexDim1);
            vec4 h3 = texture2D(uTexture1, (vec2(c * 5 + 2, r) + vec2(0.5)) / uTexDim1);
            vec4 h4 = texture2D(uTexture1, (vec2(c * 5 + 3, r) + vec2(0.5)) / uTexDim1);
            vec4 h5 = texture2D(uTexture1, (vec2(c * 5 + 4, r) + vec2(0.5)) / uTexDim1);

            float h;
            float resultf = 0.0;

            h = h1.x + h3.y;
            resultf += h * h;
            h = h1.y + h3.z;
            resultf += h * h;
            h = h1.z + h3.w;
            resultf += h * h;
            h = h1.w + h4.x;
            resultf += h * h;
            h = h2.x + h4.y;
            resultf += h * h;
            h = h2.y + h4.z;
            resultf += h * h;
            h = h2.z + h4.w;
            resultf += h * h;
            h = h2.w + h5.x;
            resultf += h * h;
            h = h3.x + h5.y;
            resultf += h * h;

            result = vec4(resultf);
		} /* END NORM */
	}

	// output new result
	gl_FragColor = result;
}
