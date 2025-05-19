/**
 * Musical note pitch detection
 * Uses Web Audio API to capture microphone input and detect musical notes
 */

// Audio context and variables
let audioContext;
let analyser;
let microphone;
let javascriptNode;
let isRecording = false;

// DOM elements
const startButton = document.getElementById('start-button');
const noteDisplay = document.getElementById('note-display');
const frequencyDisplay = document.getElementById('frequency-display');

// Musical notes with their frequency ranges (in Hz)
const noteFrequencies = [
  { note: 'C', frequency: 261.63 },
  { note: 'C#', frequency: 277.18 },
  { note: 'D', frequency: 293.66 },
  { note: 'D#', frequency: 311.13 },
  { note: 'E', frequency: 329.63 },
  { note: 'F', frequency: 349.23 },
  { note: 'F#', frequency: 369.99 },
  { note: 'G', frequency: 392.00 },
  { note: 'G#', frequency: 415.30 },
  { note: 'A', frequency: 440.00 },
  { note: 'A#', frequency: 466.16 },
  { note: 'B', frequency: 493.88 }
];

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
  startButton.addEventListener('click', toggleRecording);
});

/**
 * Toggle between starting and stopping the recording
 */
function toggleRecording() {
  if (isRecording) {
    stopRecording();
  } else {
    startRecording();
  }
}

/**
 * Start the microphone recording and pitch detection
 */
async function startRecording() {
  try {
    // Create audio context
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    // Get microphone access
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    
    // Create analyser node
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048;
    
    // Connect microphone to analyser
    microphone = audioContext.createMediaStreamSource(stream);
    microphone.connect(analyser);
    
    // Create processor node for audio analysis
    javascriptNode = audioContext.createScriptProcessor(2048, 1, 1);
    analyser.connect(javascriptNode);
    javascriptNode.connect(audioContext.destination);
    
    // Process audio data
    javascriptNode.onaudioprocess = processAudio;
    
    // Update UI
    isRecording = true;
    startButton.textContent = 'Arrêter l\'enregistrement';
    startButton.classList.remove('bg-green-600', 'hover:bg-green-700');
    startButton.classList.add('bg-red-600', 'hover:bg-red-700');
    
    console.log('Recording started');
  } catch (error) {
    console.error('Error accessing microphone:', error);
    alert('Impossible d\'accéder au microphone. Vérifiez les permissions de votre navigateur.');
  }
}

/**
 * Stop the microphone recording
 */
function stopRecording() {
  if (javascriptNode) {
    javascriptNode.onaudioprocess = null;
    javascriptNode.disconnect();
    analyser.disconnect();
    microphone.disconnect();
    audioContext.close();
  }
  
  // Update UI
  isRecording = false;
  startButton.textContent = 'Commencer l\'enregistrement';
  startButton.classList.remove('bg-red-600', 'hover:bg-red-700');
  startButton.classList.add('bg-green-600', 'hover:bg-green-700');
  
  // Reset displays
  noteDisplay.textContent = '--';
  frequencyDisplay.textContent = 'Fréquence: -- Hz';
  
  console.log('Recording stopped');
}

/**
 * Process audio data from microphone
 * @param {AudioProcessingEvent} e - Audio processing event
 */
function processAudio(e) {
  const bufferLength = analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);
  
  analyser.getByteFrequencyData(dataArray);
  
  // Get the frequency with the highest amplitude
  let maxValue = 0;
  let maxIndex = 0;
  
  for (let i = 0; i < bufferLength; i++) {
    if (dataArray[i] > maxValue) {
      maxValue = dataArray[i];
      maxIndex = i;
    }
  }
  
  // Calculate frequency from the index
  const frequency = maxIndex * audioContext.sampleRate / analyser.fftSize;
  
  // Only process strong enough signals (above ambient noise)
  if (maxValue > 100 && frequency > 80) { // Adjust threshold as needed
    const note = getNote(frequency);
    
    // Update UI with detected note and frequency
    if (note !== noteDisplay.textContent) {
      noteDisplay.textContent = note;
      noteDisplay.classList.add('note-animation');
      setTimeout(() => noteDisplay.classList.remove('note-animation'), 300);
    }
    
    frequencyDisplay.textContent = `Fréquence: ${Math.round(frequency)} Hz`;
  }
}

/**
 * Get the musical note name from a frequency
 * @param {number} frequency - The frequency in Hz
 * @returns {string} The name of the musical note
 */
function getNote(frequency) {
  // Find the note octave (assuming A4 = 440Hz)
  const noteA4 = 440;
  const octaveBase = Math.log2(frequency / noteA4);
  const octave = Math.floor(octaveBase * 12) / 12;
  
  // Calculate octave number (A4's octave is 4)
  const octaveNumber = Math.floor(4 + octaveBase);
  
  // Calculate note index (0-11) in the chromatic scale
  const semitonesFromA = Math.round(octave * 12);
  const noteIndex = (semitonesFromA + 9) % 12; // A is 9 semitones from C
  
  // Get the note name from the index
  const noteName = noteFrequencies[noteIndex].note;
  
  return `${noteName}${octaveNumber}`;
}
