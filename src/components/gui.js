import { GUI } from "dat.gui";
export function setupGUI({
  audioManager,
}) {
  const gui = new GUI();



  let isPlaying = false;

  function playSoundtrack() {
    try {
      if (isPlaying) {
        audioManager.pauseSoundtrack();
      } else {
        audioManager.playSoundtrack();
      }
      isPlaying = !isPlaying;
    } catch (error) {
      console.warn("Error playing/pausing soundtrack:", error.message);
    }
  }

  const audioFolder = gui.addFolder("Audio");
  const playSoundtrackController = audioFolder
    .add({ playSoundtrack }, "playSoundtrack")
    .name("Sound");
  audioFolder.open();
  playSoundtrackController.onChange(playSoundtrack);

  // updateBloomParameters();
  // updateSpaceshipPosition();

  return gui;
}
