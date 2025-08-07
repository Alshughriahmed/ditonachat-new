// src/utils/webrtc.ts
import type { SocketType } from './socket';
const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun1.google.com:19302' },
    { urls: 'stun:stun2.google.com:19302' },
    // TURN server: أضف بياناتك عند الإطلاق
    // { urls: 'turn:your.turn.server:3478', username: 'user', credential: 'pass' }
  ],
};

export interface SignalingPayload {
  to: string;
  from?: string;
  answer?: RTCSessionDescriptionInit;
  offer?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
}

type StreamCallback = (stream: MediaStream) => void;
type CandidateCallback = (candidate: RTCIceCandidateInit) => void;

export class WebRTCManager {
  private socket: SocketType;
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;

  constructor(socket: SocketType) {
    this.socket = socket;
  }

  setLocalStream(stream: MediaStream) {
    this.localStream = stream;
  }

  getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  getRemoteStream(): MediaStream | null {
    return this.remoteStream;
  }

  async initLocalStream(): Promise<MediaStream> {
    this.localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    return this.localStream;
  }

  async sendOffer(
    to: string,
    onTrack: StreamCallback,
    onIceCandidate: CandidateCallback
  ): Promise<void> {
    this.peerConnection = this.createPeerConnection(onTrack, onIceCandidate);

    if (!this.localStream) throw new Error('Local stream is not initialized.');
    this.localStream.getTracks().forEach(track => {
      this.peerConnection!.addTrack(track, this.localStream!);
    });

    const offer = await this.peerConnection.createOffer();
    await this.peerConnection.setLocalDescription(offer);

    this.socket.emit('offer', { to, offer });
  }

  async handleOffer(
    data: SignalingPayload,
    localStream: MediaStream,
    onTrack: StreamCallback,
    onIceCandidate: CandidateCallback
  ): Promise<void> {
    if (!data.offer || !data.from) throw new Error('Invalid offer payload.');

    this.localStream = localStream;
    this.peerConnection = this.createPeerConnection(onTrack, onIceCandidate);

    this.localStream.getTracks().forEach(track => {
      this.peerConnection!.addTrack(track, this.localStream!);
    });

    await this.peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));
    await this.sendAnswer(data.from);
  }

  private async sendAnswer(to: string): Promise<void> {
    if (!this.peerConnection) throw new Error('Peer connection not initialized.');

    const answer = await this.peerConnection.createAnswer();
    await this.peerConnection.setLocalDescription(answer);

    this.socket.emit('answer', { to, answer });
  }

  async handleAnswer(data: SignalingPayload): Promise<void> {
    if (!this.peerConnection || !data.answer) return;
    await this.peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
  }

  sendCandidate(to: string, candidate: RTCIceCandidateInit): void {
    this.socket.emit('candidate', { to, candidate });
  }

  async handleCandidate(data: SignalingPayload): Promise<void> {
    if (!this.peerConnection || !data.candidate) return;
    try {
      await this.peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
    } catch (error) {
      console.error('Error adding ICE candidate:', error);
    }
  }

  private createPeerConnection(
    onTrack: StreamCallback,
    onIceCandidate: CandidateCallback
  ): RTCPeerConnection {
    const pc = new RTCPeerConnection(ICE_SERVERS);

    pc.onicecandidate = (event) => {
      if (event.candidate) onIceCandidate(event.candidate.toJSON());
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
      if (['disconnected', 'failed', 'closed'].includes(pc.connectionState)) {
        this.closeConnection();
      }
    };

    return pc;
  }

  closeConnection(): void {
    console.log('[WebRTC] Closing connection...');
    this.peerConnection?.close();
    this.peerConnection = null;

    this.localStream?.getTracks().forEach(track => track.stop());
    this.localStream = null;

    this.remoteStream?.getTracks().forEach(track => track.stop());
    this.remoteStream = null;

    this.socket.emit('leave');
  }
}
