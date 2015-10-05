/*
 * Audio script
 *
 * for info on using ui elements go to:
 * http://www.keithmcmillen.com/blog/making-music-in-the-browser-web-audio-api-part-1/
 */

function initAudio () {
	audioContext = new (window.AudioContext || window.webkitAudioContext)();
	setupSounds(256); // fft size

	listener = audioContext.listener;
	// listener.setOrientation(0,0,-1,0,1,0);
	listener.setPosition(0, 0, 5);
}

// setup and begin loading sounds
function setupSounds(fftSize) {
	var analyser = audioContext.createAnalyser();
	analyser.fftSize = fftSize;
	bufferDivisor = analyser.frequencyBinCount / 32;

	setupSingleSound(bells, fftSize, bellURL, "bells", [1, -1, -1], [1.0, 0.0, 1.0]);
	setupSingleSound(piano, fftSize, pianoURL, "piano", [-1, -0, -1], [0.0, 1.0, 1.0]);
	setupSingleSound(guitar, fftSize, guitarURL, "guitar", [0, 0, 0], [1.0, 0.0, 0.0]);
	setupSingleSound(bass, fftSize, bassURL, "bass", [-1,  0.5, 1.5], [0.0, 0.0, 1.0]);
	setupSingleSound(drums, fftSize, drumURL, "drums", [2, 1, 0], [0.0, 1.0, 0.0]);
}

// function to setup and load sounds via AJAX
function setupSingleSound(audioObj, fftSize, url, id, translation, color) {
	audioObj.id = id;
	mat4.translate(audioObj.model, audioObj.model, translation);
	audioObj.color = color;

	audioObj.analyser = audioContext.createAnalyser();
	audioObj.inUse = false;
	audioObj.analyser.fftSize = fftSize;
	var bufferLength = audioObj.analyser.frequencyBinCount;
	audioObj.dataArray = new Float32Array(bufferLength);

	audioObj.panner = audioContext.createPanner();
	audioObj.panner.panningModel = 'HRTF';
	// audioObj.panner.distanceModel = 'linear';
	// audioObj.panner.distanceModel = 'exponential';
	// audioObj.panner.refDistance = 1;
	// audioObj.panner.maxDistance = 10000;
	audioObj.panner.rolloffFactor = 0.85;
	// audioObj.panner.coneInnerAngle = 360;
	// audioObj.panner.coneOuterAngle = 0;
	// audioObj.panner.coneOuterGain = 0;
	// audioObj.panner.setVelocity(0, 0, 0);
	audioObj.panner.setOrientation(1,0,0);
	// audioObj.panner.setPosition(0, 0, 0);
	vec3.scale(translation, translation, audioScale);
	audioObj.panner.setPosition(translation[0], translation[1], translation[2]);

	// load sound
	var request = new XMLHttpRequest();
	request.open("GET", url, true);
	request.responseType = "arraybuffer";

	request.onload = function () {
		if (request.readyState === 4){
			if (request.status === 404) {  
				alert(id + " file does not exist!");
				return;
			}  
		}
		audioContext.decodeAudioData(request.response, function (buffer) {
			var soundLength = buffer.duration;

			switch (id) {
				case "bells":
					bells.buffer = buffer;
					break;
				case "piano":
					piano.buffer = buffer;
					break;
				case "guitar":
					guitar.buffer = buffer;
					break;
				case "bass":
					bass.buffer = buffer;
					break;
				case "drums":
					drums.buffer = buffer;
					break;
			}

			if (bells.buffer && piano.buffer && guitar.buffer && bass.buffer && drums.buffer) {
				audioInitialized = true;
			}
		});
	};

	request.send();
}

// set our sound buffer, loop, and connect to destination
function setupSoundToPlay(audioObj) {
	var sound = audioContext.createBufferSource();
	sound.buffer = audioObj.buffer;
	sound.loop = true;
	
	sound.playbackRate.value = 0.9;
	
	if (audioObj.analyser) {
		sound.connect(audioObj.analyser);
		audioObj.analyser.connect(audioObj.panner);
		audioObj.panner.connect(audioContext.destination);
		audioObj.inUse = true;
	} else {
		sound.connect(audioContext.destination);
	}
	return sound;
}

// play sound and enable / disable buttons
function playSound() {
	bells.sound = setupSoundToPlay(bells);
	piano.sound = setupSoundToPlay(piano);
	guitar.sound = setupSoundToPlay(guitar);
	bass.sound = setupSoundToPlay(bass);
	drums.sound = setupSoundToPlay(drums);

	bells.sound.start(0);
	piano.sound.start(0);
	guitar.sound.start(0);
	bass.sound.start(0);
	drums.sound.start(0);
	
	playing = true;
	bells.sound.onended = function () {
		bells.inUse = false;
	}
	piano.sound.onended = function () {
		piano.inUse = false;
	}
	guitar.sound.onended = function () {
		guitar.inUse = false;
	}
	bass.sound.onended = function () {
		bass.inUse = false;
	}
	drums.sound.onended = function () {
		drums.inUse = false;
	}
}

// stop sound and enable / disable buttons
function stopSound() {
	bells.sound.stop(0);
	piano.sound.stop(0);
	guitar.sound.stop(0);
	bass.sound.stop(0);
	drums.sound.stop(0);
	playing = false;
}


// change loopStart
function setLoopStart(start) {
	bells.sound.loopStart = start;
	piano.sound.loopStart = start;
	guitar.sound.loopStart = start;
	bass.sound.loopStart = start;
	drums.sound.loopStart = start;
}

// change loopEnd
function setLoopEnd(end) {
	bells.sound.loopEnd = end;
	piano.sound.loopEnd = end;
	guitar.sound.loopEnd = end;
	bass.sound.loopEnd = end;
	drums.sound.loopEnd = end;
}


// /* ios enable sound output */
// window.addEventListener("touchstart", function(){
// 	//create empty buffer
// 	var buffer = audioContext.createBuffer(1, 1, 22050);
// 	var source = audioContext.createBufferSource();
// 	source.buffer = buffer;
// 	source.connect(audioContext.destination);
// 	source.start(0);
// }, false);
