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
		else if (uSolveMode == HOG)
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
		else if (uSolveMode == NORM)
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
		else if (uSolveMode == FEATURES)
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
		 * uTexture1 = "feat"
		 * uTexDim1 = featTexDim (hogWidth * 4, hogHeight * 2)
		 * uWorkDim = (hogWidth - 12, hogHeight - 12)
		 * uTexture2 = "w"
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
                            // result += (featData * wData);
                            result += (featData * 1.0);
                            // result += (wData * 1.0);
                        } // r
                    } // c

                    sum += (result.x + result.y + result.z + result.w);

                } // x
            } // y

            result = vec4(sum, xOffset, yOffset, 0.0);
            result = texture2D( uTexture1, (vec2(threadX, threadY) + vec2(0.5)) / uTexDim1);
            // result = vec4(uTexDim2, 0, 0);

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
		if (uSolveMode == REDUCE1)
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
		if (uSolveMode == REDUCE2)
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
