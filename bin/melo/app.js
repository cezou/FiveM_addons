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
 * Detects browser name and version
 * @returns {Object} Object containing browser name and version
 */
function getBrowserInfo() {
  const userAgent = navigator.userAgent;
  let browserName = "Unknown";
  let browserVersion = "Unknown";
  let browserEngine = "Unknown";
  
  // Check for Chrome or Chromium-based browsers
  if (userAgent.match(/chrome|chromium|crios/i)) {
    browserName = "Chrome/Chromium";
    browserEngine = "Blink";
  } 
  // Check for Firefox
  else if (userAgent.match(/firefox|fxios/i)) {
    browserName = "Firefox";
    browserEngine = "Gecko";
  } 
  // Check for Safari
  else if (userAgent.match(/safari/i)) {
    browserName = "Safari";
    browserEngine = "WebKit";
  } 
  // Check for IE/Edge
  else if (userAgent.match(/msie|trident|edge/i)) {
    browserName = userAgent.indexOf("Edge") > -1 ? "Edge" : "Internet Explorer";
    browserEngine = "EdgeHTML/Trident";
  }
  
  // Extract version
  const match = userAgent.match(/(chrome|safari|firefox|msie|trident(?=\/))\/?\s*(\d+)/i) || [];
  if (match && match.length >= 3) {
    browserVersion = match[2];
  }
  
  return {
    name: browserName,
    version: browserVersion,
    engine: browserEngine,
    userAgent: userAgent,
    hasGetUserMedia: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
    hasWebAudio: !!(window.AudioContext || window.webkitAudioContext)
  };
}

/**
 * Start the microphone recording and pitch detection
 */
async function startRecording() {
  // Audio context initialization
  try {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  } catch (error) {
    const browserInfo = getBrowserInfo();
    console.error('Erreur lors de la création du contexte audio:', error);
    alert(`Votre navigateur ne supporte pas l'API Web Audio requise pour cette application.
    
Informations du navigateur:
- Nom: ${browserInfo.name}
- Version: ${browserInfo.version}
- Moteur: ${browserInfo.engine}
- Support Web Audio: ${browserInfo.hasWebAudio ? 'Oui' : 'Non'}
- Support getUserMedia: ${browserInfo.hasGetUserMedia ? 'Oui' : 'Non'}

User Agent: ${browserInfo.userAgent}`);
    return;
  }
  
  // Microphone access
  let stream;
  try {
    // attendre 1 seconde
    await new Promise(resolve => setTimeout(resolve, 1000));
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch (error) {
    const browserInfo = getBrowserInfo();
    console.error('Erreur d\'accès au microphone:', error);
    
    let errorMessage = `Erreur d'accès au microphone: ${error.name} - ${error.message}

Informations du navigateur:
- Nom: ${browserInfo.name}
- Version: ${browserInfo.version}
- Moteur: ${browserInfo.engine}
- Support Web Audio: ${browserInfo.hasWebAudio ? 'Oui' : 'Non'}
- Support getUserMedia: ${browserInfo.hasGetUserMedia ? 'Oui' : 'Non'}

User Agent: ${browserInfo.userAgent}`;

    // Handle specific permission errors
    if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
      errorMessage = `Vous avez refusé l'accès au microphone. Veuillez autoriser l'accès dans les paramètres de votre navigateur.

${errorMessage}`;
    } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
      errorMessage = `Aucun microphone détecté sur votre appareil.

${errorMessage}`;
    } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
      errorMessage = `Votre microphone est peut-être utilisé par une autre application.

${errorMessage}`;
    } else if (error.name === 'NotSupportedError') {
      errorMessage = `Votre navigateur ne prend pas en charge l'accès au microphone ou les contraintes demandées sont incompatibles.

${errorMessage}

Note FiveM: Le navigateur intégré à FiveM peut avoir des limitations concernant l'accès au microphone.`;
    }
    
    console.log(errorMessage);
    
    // Close audio context if it was created
    if (audioContext) {
      audioContext.close().catch(e => console.error('Erreur lors de la fermeture du contexte audio:', e));
    }
    return;
  }
  
  // Analyzer setup
  try {
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048;
  } catch (error) {
    console.error('Erreur lors de la création de l\'analyseur audio:', error);
    alert('Erreur lors de la configuration de l\'analyseur audio.');
    stream.getTracks().forEach(track => track.stop());
    audioContext.close().catch(e => console.error('Erreur lors de la fermeture du contexte audio:', e));
    return;
  }
  
  // Connect microphone to analyzer
  try {
    microphone = audioContext.createMediaStreamSource(stream);
    microphone.connect(analyser);
  } catch (error) {
    console.error('Erreur lors de la connexion du microphone:', error);
    alert('Impossible de connecter le microphone à l\'analyseur audio.');
    stream.getTracks().forEach(track => track.stop());
    audioContext.close().catch(e => console.error('Erreur lors de la fermeture du contexte audio:', e));
    return;
  }
  
  // JavaScript node setup
  try {
    javascriptNode = audioContext.createScriptProcessor(2048, 1, 1);
    analyser.connect(javascriptNode);
    javascriptNode.connect(audioContext.destination);
  } catch (error) {
    console.error('Erreur lors de la création du nœud de traitement audio:', error);
    alert('Impossible de configurer le processeur audio.');
    stream.getTracks().forEach(track => track.stop());
    microphone.disconnect();
    audioContext.close().catch(e => console.error('Erreur lors de la fermeture du contexte audio:', e));
    return;
  }
  
  // Set up audio processing
  try {
    javascriptNode.onaudioprocess = processAudio;
    
    // Update UI
    isRecording = true;
    startButton.textContent = 'Arrêter l\'enregistrement';
    startButton.classList.remove('bg-green-600', 'hover:bg-green-700');
    startButton.classList.add('bg-red-600', 'hover:bg-red-700');
    
    console.log('Recording started');
  } catch (error) {
    console.error('Erreur lors de la configuration du traitement audio:', error);
    alert('Une erreur est survenue lors du lancement de l\'enregistrement.');
    cleanupAudioResources(stream);
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

/**
 * Helper function to clean up audio resources
 * @param {MediaStream} stream - The media stream to clean up
 */
function cleanupAudioResources(stream) {
  if (stream && stream.getTracks) {
    stream.getTracks().forEach(track => track.stop());
  }
  
  if (javascriptNode) {
    javascriptNode.onaudioprocess = null;
    javascriptNode.disconnect();
  }
  
  if (analyser) {
    analyser.disconnect();
  }
  
  if (microphone) {
    microphone.disconnect();
  }
  
  if (audioContext) {
    audioContext.close().catch(e => console.error('Erreur lors de la fermeture du contexte audio:', e));
  }
}
