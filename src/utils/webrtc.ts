<<<<<<< HEAD
class WebRTCClient {
  constructor() {
    // constructor logic
  }

  async getRemoteStream() {
    // Placeholder for getRemoteStream logic
    console.log("getRemoteStream called");
    return null;
  }
}

export default WebRTCClient;


=======
// src/utils/webrtc.ts
import { Socket } from 'socket.io-client';

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun1.google.com:19302' },
    { urls: 'stun:stun2.google.com:19302' },
    // TURN server (production): Add your TURN credentials here
    // { urls: 'turn:your.turn.server:3478', username: 'user', credential: 'password' },
  ],
};

export interface SignalingPayload {
  to: string; // Make 'to' optional for incoming signals where 'from' is used
  from?: string; // Add 'from' for incoming signals
  answer?: RTCSessionDescriptionInit;
  offer?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
}

type StreamCallback = (stream: MediaStream) => void;
type CandidateCallback = (candidate: RTCIceCandidateInit) => void;

export class WebRTCManager {
  private socket: Socket;
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;

  constructor(socket: Socket) {
    this.socket = socket;
  }

  // ضع الدالة setLocalStream هنا (خارج الـ constructor)
  setLocalStream(stream: MediaStream) {
    this.localStream = stream;
  }

  // هذه الدالة صحيحة في مكانها
  getLocalStream() {
    return this.localStream;
  }
}
  getRemoteStream(): MediaStream | null {
    return this.remoteStream;
  }

  /**
   * Initializes local media stream (camera + mic)
   */
  async initLocalStream(): Promise<MediaStream> {
    this.localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    return this.localStream;
  }

  /**
   * Starts sending an offer to the remote peer
   */
  async sendOffer(
    to: string,
    onTrack: StreamCallback,
    onIceCandidate: CandidateCallback
  ): Promise<void> {
    this.peerConnection = this.createPeerConnection(onTrack, onIceCandidate);

    if (!this.localStream) {
      throw new Error('Local stream is not initialized.');
    }

    // Add all tracks from the local stream to the peer connection
    this.localStream.getTracks().forEach(track => {
      this.peerConnection!.addTrack(track, this.localStream!);
    });

    // Create and set the local offer
    const offer = await this.peerConnection.createOffer();
    await this.peerConnection.setLocalDescription(offer);

    // Emit the offer to the remote peer via socket
    this.socket.emit('offer', { to, offer });
  }

  /**
   * Handles incoming offer and sends back answer
   */
  async handleOffer(
    data: SignalingPayload, // Expects { from, offer }
    localStream: MediaStream, // Expects the local stream itself
    onTrack: StreamCallback,
    onIceCandidate: CandidateCallback
  ): Promise<void> {
    if (!data.offer || !data.from) throw new Error('Invalid offer payload.');

    // Ensure localStream is set for this connection context
    this.localStream = localStream; 
    this.peerConnection = this.createPeerConnection(onTrack, onIceCandidate);
       
    // Add local stream tracks to the peer connection
    this.localStream.getTracks().forEach(track => {
      this.peerConnection!.addTrack(track, this.localStream!);
    });

    await this.peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));
    await this.sendAnswer(data.from); // Use data.from as 'to' for the answer
  }

  /**
   * Creates and sends answer to peer
   */
  private async sendAnswer(to: string): Promise<void> {
    if (!this.peerConnection) throw new Error('Peer connection is not initialized.');

    const answer = await this.peerConnection.createAnswer();
    await this.peerConnection.setLocalDescription(answer);

    this.socket.emit('answer', { to, answer });
  }

  /**
   * Handles incoming answer from peer
   */
  async handleAnswer(data: SignalingPayload): Promise<void> {
    if (!this.peerConnection || !data.answer) throw new Error('Invalid answer.');

    await this.peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
  }

  /**
   * Sends ICE candidate to remote peer
   */
  sendCandidate(to: string, candidate: RTCIceCandidateInit): void {
    this.socket.emit('candidate', { to, candidate });
  }

  /**
   * Handles incoming ICE candidate
   */
  async handleCandidate(data: SignalingPayload): Promise<void> {
    if (!this.peerConnection || !data.candidate) return;

    try {
      await this.peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
    } catch (error) {
      console.error('Error adding ICE candidate:', error);
    }
  }

  /**
   * Creates a configured RTCPeerConnection
   */
  private createPeerConnection(
    onTrack: StreamCallback,
    onIceCandidate: CandidateCallback
  ): RTCPeerConnection {
    const pc = new RTCPeerConnection(ICE_SERVERS);

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        onIceCandidate(event.candidate.toJSON());
      }
    };

    pc.ontrack = (event) => {
      if (!this.remoteStream) {
        this.remoteStream = new MediaStream();
      }
      this.remoteStream.addTrack(event.track);
      onTrack(this.remoteStream);
    };

    pc.onconnectionstatechange = () => {
      console.log('[WebRTC] Connection state:', pc.connectionState);
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        this.closeConnection(); // Call the public method
      }
    };

    return pc;
  }

  /**
   * Closes the current connection and resets everything
   */
  closeConnection(): void {
    console.log('[WebRTC] Closing connection...');
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }

    if (this.remoteStream) {
      this.remoteStream.getTracks().forEach(track => track.stop());
      this.remoteStream = null;
    }

    this.socket.emit('leave');
  }
}

export default WebRTCManager;
>>>>>>> a2a2ef57a9f680569a8c694591083e6cd89a94b9
