
// fork getUserMedia for multiple browser versions, for those
// that need prefixes

navigator.getUserMedia = (navigator.getUserMedia ||
                          navigator.webkitGetUserMedia ||
                          navigator.mozGetUserMedia ||
                          navigator.msGetUserMedia);


var audioCtx = new (window.AudioContext || window.webkitAudioContext)();
var source;
var stream;

var analyser = audioCtx.createAnalyser();
analyser.minDecibels = -90;
analyser.maxDecibels = -10;
analyser.smoothingTimeConstant = 0.85;

var button = document.querySelector('button');
var pre = document.querySelector('pre');
var myScript = document.querySelector('script');

pre.innerHTML = myScript.innerHTML;

// Stereo
var channels = 2;
// Create an empty two second stereo buffer at the
// sample rate of the AudioContext
var frameCount = audioCtx.sampleRate * 0.1;

var myArrayBuffer = audioCtx.createBuffer(channels, frameCount, audioCtx.sampleRate);

button.onclick = function() {
	// Fill the buffer with white noise;
	//just random values between -1.0 and 1.0
	for (var channel = 0; channel < channels; channel++) {
		// This gives us the actual ArrayBuffer that contains the data
		var nowBuffering = myArrayBuffer.getChannelData(channel);
		for (var i = 0; i < frameCount; i++) {
			// Math.random() is in [0; 1.0]
			// audio needs to be in [-1.0; 1.0]
			nowBuffering[i] = Math.sin(i * 0.1);
		}
	}

	// Get an AudioBufferSourceNode.
	// This is the AudioNode to use when we want to play an AudioBuffer
	var source = audioCtx.createBufferSource();
	// set the buffer in the AudioBufferSourceNode
	source.buffer = myArrayBuffer;
	// connect the AudioBufferSourceNode to the
	// destination so we can hear the sound
	source.connect(audioCtx.destination);
	// start the source playing
	source.start();
}

if (navigator.getUserMedia) {
	console.log('getUserMedia supported.');
	navigator.getUserMedia (
		// constraints - only audio needed for this app
		{
			audio: true
		},

		// Success callback
		function(stream) {
			source = audioCtx.createMediaStreamSource(stream);
			source.connect(analyser);
			analyser.connect(audioCtx.destination);

			visualize();
		},

		// Error callback
		function(err) {
			console.log('The following gUM error occured: ' + err);
		}
	);
} else {
	console.log('getUserMedia not supported on your browser!');
}


var canvas = document.querySelector('canvas');
var canvasCtx = canvas.getContext("2d");

function visualize() {
	WIDTH = canvas.width;
	HEIGHT = canvas.height;

	analyser.fftSize = 256;
	var bufferLength = analyser.frequencyBinCount;
	console.log(bufferLength);
	var dataArray = new Uint8Array(bufferLength);

	canvasCtx.clearRect(0, 0, WIDTH, HEIGHT);

	function draw() {
		drawVisual = requestAnimationFrame(draw);

		analyser.getByteFrequencyData(dataArray);

		canvasCtx.fillStyle = 'rgb(0, 0, 0)';
		canvasCtx.fillRect(0, 0, WIDTH, HEIGHT);

		var barWidth = (WIDTH / bufferLength) * 2.5;
		var barHeight;
		var x = 0;

		for(var i = 0; i < bufferLength; i++) {
			barHeight = dataArray[i];

			canvasCtx.fillStyle = 'rgb(' + (barHeight+100) + ',50,50)';
			canvasCtx.fillRect(x,HEIGHT-barHeight/2,barWidth,barHeight/2);

			x += barWidth + 1;
		}
	};

	draw();

}




