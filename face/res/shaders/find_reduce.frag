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

8 8888888888    8 8888    b.             8 8   888888888o.      
8 8888          8 8888    888o.          8 8   8888    `^888.   
8 8888          8 8888    Y88888o.       8 8   8888        `88. 
8 8888          8 8888    .`Y888888o.    8 8   8888         `88 
8 888888888888  8 8888    8o. `Y888888o. 8 8   8888          88 
8 8888          8 8888    8`Y8o. `Y88888o8 8   8888          88 
8 8888          8 8888    8   `Y8o. `Y8888 8   8888         ,88 
8 8888          8 8888    8      `Y8o. `Y8 8   8888        ,88' 
8 8888          8 8888    8         `Y8o.` 8   8888    ,o88P'   
8 8888          8 8888    8            `Yo 8   888888888P'      

*/
		/*
		 * FIND
		 *
		 * uTexture = "feat"
		 * uTexDim1 = featTexDim (hogWidth * 4, hogHeight * 2)
		 * uWorkDim = (hogWidth - 12, hogHeight - 12)
		 * uTexture = "w"
		 * uTexDim2 = (12 * 4, 12 * 2)
		 */
		if (uSolveMode == FIND)
		{
			int xOffset = threadX;
			int yOffset = threadY;

            int col, row;
            int featCol, featRow;
            vec4 featData, wData;
            float sum = B;

            for (int y = 0; y < 12; ++y)
            {
                for (int x = 0; x < 12; ++x)
                {
                    col = x * 4;
                    row = y * 2;
                    featCol = col + xOffset * 4;
                    featRow = row + yOffset * 2;
                    result = vec4(0.0);
                    for (int r = 0; r < 2; ++r)
                    {
                        for (int c = 0; c < 4; ++c)
                        {
                            featData = texture2D(uTexture1, (vec2(featCol + c, featRow + r) + vec2(0.5)) / uTexDim1);
                            wData = texture2D(uTexture2, (vec2(col + c, row + r) + vec2(0.5)) / uTexDim2);
                            result += (featData * wData);
                        } // r
                    } // c

                    sum += (result.x + result.y + result.z + result.w);

                } // x
            } // y

            result = vec4(sum, xOffset, yOffset, 0.0);

		} /* END FIND */


/*
                                                                                                  
8 888888888o.   8 8888888888   8 888888888o.      8 8888      88     ,o888888o.    8 8888888888   
8 8888    `88.  8 8888         8 8888    `^888.   8 8888      88    8888     `88.  8 8888         
8 8888     `88  8 8888         8 8888        `88. 8 8888      88 ,8 8888       `8. 8 8888         
8 8888     ,88  8 8888         8 8888         `88 8 8888      88 88 8888           8 8888         
8 8888.   ,88'  8 888888888888 8 8888          88 8 8888      88 88 8888           8 888888888888 
8 888888888P'   8 8888         8 8888          88 8 8888      88 88 8888           8 8888         
8 8888`8b       8 8888         8 8888         ,88 8 8888      88 88 8888           8 8888         
8 8888 `8b.     8 8888         8 8888        ,88' ` 8888     ,8P `8 8888       .8' 8 8888         
8 8888   `8b.   8 8888         8 8888    ,o88P'     8888   ,d8P     8888     ,88'  8 8888         
8 8888     `88. 8 888888888888 8 888888888P'         `Y88888P'       `8888888P'    8 888888888888 

*/
		/*
		 * REDUCE1
		 *
		 * uTexture = "find"
		 * uTexDim1 = (hogWidth - 12, hogHeight - 12)
		 * uWorkDim = (hogWidth - 12, 1)
		 * uTexture = X
		 * uTexDim2 = X
		 */
		else if (uSolveMode == REDUCE1)
		{
			int x = threadX;
			int height = int(uTexDim1.y);

			vec4 data;
            result = texture2D(uTexture1, (vec2(x, 0) + vec2(0.5)) / uTexDim1);

            for (int y = 1; y < 128; ++y)
            {
            	if (y >= height)
            		break;
            		
                data = texture2D(uTexture1, (vec2(x, y) + vec2(0.5)) / uTexDim1);

                if (data.x > result.x)
                    result = data;
            } // y

		} /* END REDUCE1 */


		/*
		 * REDUCE2
		 *
		 * uTexture = "reduce1"
		 * uTexDim1 = (hogWidth - 12,1)
		 * uWorkDim = (1, 1)
		 * uTexture = X
		 * uTexDim2 = X
		 */
		else if (uSolveMode == REDUCE2)
		{
			int width = int(uTexDim1.x);

            vec4 data;
            result = texture2D(uTexture1, (vec2(0, 0) + vec2(0.5)) / uTexDim1);

            for (int x = 1; x < 128; ++x)
            {
            	if (x >= width)
            		break;

	            data = texture2D(uTexture1, (vec2(x, 0) + vec2(0.5)) / uTexDim1);

                if (data.x > result.x)
                    result = data;
            } // x
		} /* END REDUCE2 */
	}

	// output new result
	gl_FragColor = result;
}
