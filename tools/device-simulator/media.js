export function watchAudioTrackEnds(stream, onEnded) {
  for (const track of stream?.getAudioTracks?.() || []) {
    track.addEventListener?.("ended", onEnded, { once: true });
  }
}

export function closeMediaSession(session, audioElement) {
  if (!session) return;

  if (session.readyTimeout !== null && session.readyTimeout !== undefined) {
    clearTimeout(session.readyTimeout);
    session.readyTimeout = null;
  }

  session.requestController?.abort();
  session.requestController = null;

  for (const track of session.stream?.getTracks?.() || []) {
    track.enabled = false;
    track.stop();
  }

  if (!session.closed) {
    session.closed = true;
    session.dataChannel?.close();
    session.peerConnection?.close();
  }

  if (audioElement && audioElement.srcObject === session.remoteStream) {
    audioElement.srcObject = null;
  }
}
