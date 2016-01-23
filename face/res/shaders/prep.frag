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

void initOrientations(inout float ox[9], inout float oy[9])
{
	ox[0] = 1.0; 	ox[1] = 0.9396926164627075; 	ox[2] = 0.7660444378852844;
	ox[3] = 0.5; 	ox[4] = 0.1736481785774231;		ox[5] = -0.1736481785774231;
	ox[6] = -0.5; 	ox[7] = -0.7660444378852844;	ox[8] = -0.9396926164627075;

	oy[0] = 0.0;					oy[1] = 0.3420201539993286; 	oy[2] = 0.6427876353263855;
	oy[3] = 0.8660253882408142; 	oy[4] = 0.9848077297210693; 	oy[5] = 0.9848077297210693;
	oy[6] = 0.8660253882408142; 	oy[7] = 0.6427876353263855; 	oy[8] = 0.3420201539993286;

}

void main()
{
	int threadX = int(floor(gl_FragCoord.x));
	int threadY = int(floor(gl_FragCoord.y));

	vec4 result = vec4(0.0);

	if (threadX < uWorkDim.x && threadY < uWorkDim.y)
	{


/*
                                          .         .                                                
8 8888      88 b.             8          ,8.       ,8.                   .8.          8 888888888o   
8 8888      88 888o.          8         ,888.     ,888.                 .888.         8 8888    `88. 
8 8888      88 Y88888o.       8        .`8888.   .`8888.               :88888.        8 8888     `88 
8 8888      88 .`Y888888o.    8       ,8.`8888. ,8.`8888.             . `88888.       8 8888     ,88 
8 8888      88 8o. `Y888888o. 8      ,8'8.`8888,8^8.`8888.           .8. `88888.      8 8888.   ,88' 
8 8888      88 8`Y8o. `Y88888o8     ,8' `8.`8888' `8.`8888.         .8`8. `88888.     8 888888888P'  
8 8888      88 8   `Y8o. `Y8888    ,8'   `8.`88'   `8.`8888.       .8' `8. `88888.    8 8888         
` 8888     ,8P 8      `Y8o. `Y8   ,8'     `8.`'     `8.`8888.     .8'   `8. `88888.   8 8888         
  8888   ,d8P  8         `Y8o.`  ,8'       `8        `8.`8888.   .888888888. `88888.  8 8888         
   `Y88888P'   8            `Yo ,8'         `         `8.`8888. .8'       `8. `88888. 8 8888         

*/
		/*
		 * UNMAPPED:
		 *
		 * uTexture = "orig"
		 * uTexDim1 = imgDim
		 * uWorkDim = unmappedDim (imgDim - 2)
		 * uTexDim2 = hogDim
		 * uTexture = X
		 */
		if (uSolveMode == UNMAPPED)
		{
			// from 1 to (imgDim - 1)
			int x = threadX + 1;
			int y = threadY + 1;

			float orientationX[9];
			float orientationY[9];
			initOrientations(orientationX, orientationY);


			// Read from input surface
			vec4 data  = texture2D(uTexture1, (vec2(  x,    y  ) + vec2(0.5)) / uTexDim1);
			vec4 left  = texture2D(uTexture1, (vec2( x-1,   y  ) + vec2(0.5)) / uTexDim1);
			vec4 right = texture2D(uTexture1, (vec2( x+1,   y  ) + vec2(0.5)) / uTexDim1);
			vec4 up    = texture2D(uTexture1, (vec2(  x,   y-1 ) + vec2(0.5)) / uTexDim1);
			vec4 down  = texture2D(uTexture1, (vec2(  x,   y+1 ) + vec2(0.5)) / uTexDim1);

			float gradx, grady, grad;

            /*
	         * Compute the gradient at (x,y). The image channel with
	         * the maximum gradient at each location is selected.
             */
            {
                gradx = right.x - left.x;
                grady = down.x - up.x;
                float grad2_ = gradx * gradx + grady * grady;

                float gradx1_ = right.y - left.y;
                float grady1_ = down.y - up.y;
                float grad21_ = gradx1_ * gradx1_ + grady1_ * grady1_;

                float gradx2_ = right.z - left.z;
                float grady2_ = down.z - up.z;
                float grad22_ = gradx2_ * gradx2_ + grady2_ * grady2_;

                if (grad21_ > grad2_)
                {
                    gradx = gradx1_;
                    grady = grady1_;
                    grad2_ = grad21_;
                }
                if (grad22_ > grad2_)
                {
                    gradx = gradx2_;
                    grady = grady2_;
                    grad2_ = grad22_;
                }

                grad = sqrt(grad2_);
                gradx /= max(grad, 1e-10);
                grady /= max(grad, 1e-10);
            }


			vec2 orientationWeights = vec2(0.0);
			ivec2 orientationBins = ivec2(-1);

            /*
             * Map the gradient to the closest and second closets orientation bins.
             * There are numOrientations orientation in the interval [0,pi).
             * The next numOriantations are the symmetric ones, for a total
             * of 2*numOrientation directed orientations.
             */
            for (int k = 0; k < numOrientations; ++k)
            {
                float orientationScore_ = gradx * orientationX[k] +  grady * orientationY[k];
                int orientationBin_ = k;
                if (orientationScore_ < 0.0)
                {
                    orientationScore_ = - orientationScore_;
                    orientationBin_ += numOrientations;
                }
                if (orientationScore_ > orientationWeights.x)
                {
                    orientationBins.y = orientationBins.x;
                    orientationWeights.y = orientationWeights.x;
                    orientationBins.x = orientationBin_;
                    orientationWeights.x = orientationScore_;
                }
                else if (orientationScore_ > orientationWeights.y)
                {
                    orientationBins.y = orientationBin_;
                    orientationWeights.y = orientationScore_;
                }
            }

            orientationBins.y = -1;

			float orientationf = float(orientationBins.x);
			float hx, hy, binxf, binyf, wx1, wx2, wy1, wy2;
			int binx, biny;

            /*
             * Accumulate the gradient. hx is the distance of the
             * pixel x to the cell center at its left, in units of cellSize.
             * With this parametrixation, a pixel on the cell center
             * has hx = 0, which gradually increases to 1 moving to the next
             * center.
             */
            {


                /*  (x - (w-1)/2) / w = (x + 0.5)/w - 0.5 */
                hx = (float(x) + 0.5) / float(cellSize) - 0.5;
                hy = (float(y) + 0.5) / float(cellSize) - 0.5;
                binxf = floor(hx);
                binyf = floor(hy);
                wx2 = hx - binxf;
                wy2 = hy - binyf;
                wx1 = 1.0 - wx2;
                wy1 = 1.0 - wy2;

                binx = int(binxf);
                biny = int(binyf);
                ivec2 texDim2i = ivec2(uTexDim2);

                float sqrt2 = sqrt(2.0);
                if (binx >= 0 && biny >= 0)
                {
                    result.x = ((grad * wx1 * wy1) / sqrt2) + orientationf;
                }
                if (binx < texDim2i.x - 1 && biny >=0)
                {
                    result.y = ((grad * wx2 * wy1) / sqrt2) + orientationf;
                }
                if (binx < texDim2i.x - 1 && biny < texDim2i.y - 1)
                {
                    result.z = ((grad * wx2 * wy2) / sqrt2) + orientationf;
                }
                if (binx >= 0 && biny < texDim2i.y - 1)
                {
                    result.w = ((grad * wx1 * wy2) / sqrt2) + orientationf;
                }
            }
		} /* END UNMAPPED */
	}

	// output new result
	gl_FragColor = result;
}
